import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * Read Replica Configuration for Prisma
 * 
 * Production Architecture:
 * - Primary: Handles all writes + critical reads (authentication, transactions)
 * - Replica 1: Read-only queries (chat history, audit logs, user lookups)
 * - Replica 2: Read-only queries (round-robin load balancing)
 * 
 * Connection URLs:
 * - DATABASE_URL: Primary instance (writes + critical reads)
 * - DATABASE_REPLICA_1_URL: First read replica (optional)
 * - DATABASE_REPLICA_2_URL: Second read replica (optional)
 * 
 * If replica URLs are not configured, all queries route to primary (graceful degradation).
 * 
 * Usage:
 * ```typescript
 * import { readPrisma } from '@/lib/read-replicas';
 * 
 * // Read from replica (non-critical reads)
 * const chatHistory = await readPrisma.message.findMany({ where: { chatId } });
 * 
 * // Write to primary (all writes)
 * const newMessage = await prisma.message.create({ data: { ... } });
 * ```
 * 
 * Routing Strategy:
 * - Writes (create, update, delete, upsert): Always primary
 * - Critical reads (auth, billing, locks): Always primary
 * - Non-critical reads (chat history, audit logs, analytics): Replicas with round-robin
 * - Transactions: Always primary (replicas are read-only)
 * 
 * Replica Lag Monitoring:
 * - CloudWatch alarm triggers if lag >5 seconds
 * - Health check includes replica lag status
 * - Automatic fallback to primary if replica unavailable
 */

const globalForReplicas = globalThis as unknown as {
  prismaReplica1: PrismaClient | undefined;
  prismaReplica2: PrismaClient | undefined;
  replicaRoundRobinIndex: number;
};

// Track replica availability (health checks)
let replica1Available = true;
let replica2Available = true;
let lastHealthCheck = Date.now();
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Create read replica client instance
 */
function createReplicaClient(replicaUrl: string, replicaName: string): PrismaClient {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error'] : ['error'], // Less verbose for replicas
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: replicaUrl,
      },
    },
  });
}

/**
 * Initialize read replica instances
 * Creates separate Prisma clients for each replica (if URLs configured)
 */
function initializeReplicas() {
  const replica1Url = env.DATABASE_REPLICA_1_URL;
  const replica2Url = env.DATABASE_REPLICA_2_URL;
  
  if (replica1Url && !globalForReplicas.prismaReplica1) {
    globalForReplicas.prismaReplica1 = createReplicaClient(replica1Url, 'replica-1');
    logger.info('Read replica 1 initialized', { url: replica1Url.split('@')[1] }); // Don't log credentials
  }
  
  if (replica2Url && !globalForReplicas.prismaReplica2) {
    globalForReplicas.prismaReplica2 = createReplicaClient(replica2Url, 'replica-2');
    logger.info('Read replica 2 initialized', { url: replica2Url.split('@')[1] });
  }
  
  if (!replica1Url && !replica2Url) {
    logger.warn('No read replicas configured - all queries routing to primary', {
      hint: 'Set DATABASE_REPLICA_1_URL and DATABASE_REPLICA_2_URL for read scaling'
    });
  }
  
  // Initialize round-robin counter
  if (!globalForReplicas.replicaRoundRobinIndex) {
    globalForReplicas.replicaRoundRobinIndex = 0;
  }
}

// Initialize replicas on module load
initializeReplicas();

/**
 * Health check for replica availability
 * Pings replica with simple query, marks unavailable on failure
 */
async function checkReplicaHealth(client: PrismaClient | undefined, replicaName: string): Promise<boolean> {
  if (!client) return false;
  
  try {
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error(`Read replica ${replicaName} health check failed`, error as Error);
    return false;
  }
}

/**
 * Periodic health check for both replicas
 * Runs every 30 seconds to track availability
 */
async function runHealthChecks() {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return; // Skip if checked recently
  }
  
  lastHealthCheck = now;
  
  if (globalForReplicas.prismaReplica1) {
    replica1Available = await checkReplicaHealth(globalForReplicas.prismaReplica1, 'replica-1');
  }
  
  if (globalForReplicas.prismaReplica2) {
    replica2Available = await checkReplicaHealth(globalForReplicas.prismaReplica2, 'replica-2');
  }
  
  logger.info('Read replica health check', {
    replica1Available,
    replica2Available,
    activeReplicas: [replica1Available, replica2Available].filter(Boolean).length
  });
}

/**
 * Get next available read replica (round-robin load balancing)
 * Falls back to primary if no replicas available
 * 
 * @returns Prisma client (replica or primary)
 */
export function getReadReplica(): PrismaClient {
  // Run periodic health checks (non-blocking)
  runHealthChecks().catch(err => logger.error('Health check failed', err));
  
  const replica1 = globalForReplicas.prismaReplica1;
  const replica2 = globalForReplicas.prismaReplica2;
  
  // No replicas configured - use primary
  if (!replica1 && !replica2) {
    return prisma;
  }
  
  // Only one replica configured
  if (replica1 && !replica2) {
    return replica1Available ? replica1 : prisma;
  }
  
  if (!replica1 && replica2) {
    return replica2Available ? replica2 : prisma;
  }
  
  // Both replicas configured - round-robin with health checks
  const availableReplicas: PrismaClient[] = [];
  if (replica1 && replica1Available) availableReplicas.push(replica1);
  if (replica2 && replica2Available) availableReplicas.push(replica2);
  
  // No healthy replicas - fallback to primary
  if (availableReplicas.length === 0) {
    logger.warn('All read replicas unavailable, falling back to primary');
    return prisma;
  }
  
  // Round-robin among available replicas
  const index = globalForReplicas.replicaRoundRobinIndex % availableReplicas.length;
  globalForReplicas.replicaRoundRobinIndex = (globalForReplicas.replicaRoundRobinIndex + 1) % 1000; // Reset after 1000 to prevent overflow
  
  return availableReplicas[index];
}

/**
 * Read-only Prisma client (automatically routes to available replica)
 * Use for non-critical read operations that can tolerate replica lag (<5 seconds)
 * 
 * Examples of good use cases:
 * - Chat history retrieval (message.findMany)
 * - Audit log queries (auditLog.findMany)
 * - User profile lookups (user.findUnique) - non-critical paths
 * - Analytics queries (aggregate, count)
 * - File metadata (file.findMany)
 * 
 * DO NOT use for:
 * - Authentication lookups (use primary for consistency)
 * - Token verification (use primary)
 * - Billing/quota checks (use primary for accuracy)
 * - Transaction-critical reads (use primary)
 * - Writes (create, update, delete - always primary)
 */
export const readPrisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string) {
    const client = getReadReplica();
    return (client as any)[prop];
  }
});

/**
 * Helper: Execute query with automatic replica routing
 * Wraps queries with error handling and fallback to primary on failure
 * 
 * @param queryFn - Function that executes Prisma query
 * @param context - Context for logging (operation name, userId, etc.)
 * @returns Query result
 * 
 * @example
 * const messages = await withReplicaFallback(
 *   (client) => client.message.findMany({ where: { chatId } }),
 *   { operation: 'get-chat-history', chatId }
 * );
 */
export async function withReplicaFallback<T>(
  queryFn: (client: PrismaClient) => Promise<T>,
  context: Record<string, any> = {}
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await queryFn(getReadReplica());
    const duration = Date.now() - startTime;
    
    logger.db('Replica query', 'read-replica', duration, context);
    
    return result;
  } catch (error) {
    logger.error('Replica query failed, retrying with primary', error as Error, context);
    
    // Retry with primary client
    try {
      const result = await queryFn(prisma);
      
      logger.warn('Replica query succeeded on primary after failure', {
        ...context,
        duration: Date.now() - startTime
      });
      
      return result;
    } catch (primaryError) {
      logger.error('Query failed on both replica and primary', primaryError as Error, context);
      throw primaryError;
    }
  }
}

/**
 * Get replica lag in seconds (requires pg_stat_replication view)
 * Returns null if not using RDS or replicas not configured
 * 
 * @returns Replica lag in seconds (or null if unavailable)
 */
export async function getReplicaLag(): Promise<{ replica1Lag: number | null; replica2Lag: number | null }> {
  try {
    // Query replication status from primary (requires superuser or replication role)
    const replicationStatus = await prisma.$queryRaw<Array<{ 
      client_addr: string; 
      replay_lag_seconds: number 
    }>>`
      SELECT 
        client_addr,
        EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()))::int AS replay_lag_seconds
      FROM pg_stat_replication
      WHERE application_name LIKE '%replica%'
    `;
    
    const replica1Lag = replicationStatus.find(r => r.client_addr.includes('replica-1'))?.replay_lag_seconds || null;
    const replica2Lag = replicationStatus.find(r => r.client_addr.includes('replica-2'))?.replay_lag_seconds || null;
    
    return { replica1Lag, replica2Lag };
  } catch (error) {
    // Likely permissions issue or not using RDS
    logger.error('Failed to query replica lag', error as Error);
    return { replica1Lag: null, replica2Lag: null };
  }
}

/**
 * Graceful shutdown - disconnect all replica clients
 */
process.on('beforeExit', async () => {
  logger.info('Disconnecting read replicas...');
  
  if (globalForReplicas.prismaReplica1) {
    await globalForReplicas.prismaReplica1.$disconnect();
  }
  
  if (globalForReplicas.prismaReplica2) {
    await globalForReplicas.prismaReplica2.$disconnect();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', async () => {
  if (globalForReplicas.prismaReplica1) {
    await globalForReplicas.prismaReplica1.$disconnect();
  }
  
  if (globalForReplicas.prismaReplica2) {
    await globalForReplicas.prismaReplica2.$disconnect();
  }
});

export default readPrisma;
