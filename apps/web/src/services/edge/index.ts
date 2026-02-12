/**
 * Edge Function Deployment System
 * Deploy and manage edge functions across regions
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { encrypt, decrypt } from '@/lib/encryption';
import path from 'path';
import fs from 'fs/promises';

export type EdgeRegion =
  | 'us-east'
  | 'us-west'
  | 'eu-west'
  | 'eu-central'
  | 'asia-pacific'
  | 'global';

export interface EdgeFunction {
  id: string;
  userId: string;
  name: string;
  slug: string;
  code: string;
  regions: EdgeRegion[];
  environmentVariables?: Record<string, string>;
  routes?: string[];
  cacheControl?: string;
  status: 'draft' | 'deployed' | 'archived';
  deployments?: EdgeDeployment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EdgeDeployment {
  id: string;
  functionId: string;
  region: EdgeRegion;
  version: number;
  url: string;
  status: 'deploying' | 'deployed' | 'failed';
  deployedAt: Date;
}

/**
 * Create edge function
 */
export async function createEdgeFunction(
  userId: string,
  name: string,
  code: string,
  slug: string,
  options?: {
    regions?: EdgeRegion[];
    environmentVariables?: Record<string, string>;
    routes?: string[];
    cacheControl?: string;
  }
): Promise<EdgeFunction> {
  try {
    // Validate code
    await validateEdgeFunctionCode(code);

    // Generate slug if not provided
    const finalSlug = slug || generateSlug(name);

    // Check slug uniqueness
    const existing = await prisma.edgeFunction.findFirst({
      where: { userId, slug: finalSlug },
    });

    if (existing) {
      throw new Error('Function slug already exists');
    }

    const encryptedCode = await encrypt(code);
    const encryptedEnv =
      options?.environmentVariables && Object.keys(options.environmentVariables).length > 0
        ? await encrypt(JSON.stringify(options.environmentVariables))
        : undefined;

    const func = await prisma.edgeFunction.create({
      data: {
        userId,
        name,
        slug: finalSlug,
        code: encryptedCode,
        regions: options?.regions || ['global'],
        environmentVariables: encryptedEnv,
        routes: options?.routes || ['/api/function'],
        cacheControl: options?.cacheControl || 'public, max-age=300',
        status: 'draft',
      },
    });

    logger.worker('edge-function:create', 'success', {
      userId,
      funcId: func.id,
      slug: finalSlug,
    });

    return func as EdgeFunction;
  } catch (error) {
    logger.error('Failed to create edge function', error as Error, { userId });
    throw error;
  }
}

/**
 * Deploy edge function
 */
export async function deployEdgeFunction(
  functionId: string,
  userId: string,
  regions?: EdgeRegion[]
): Promise<EdgeDeployment[]> {
  try {
    // Get function
    const func = await prisma.edgeFunction.findUnique({
      where: { id: functionId },
    });

    if (!func || func.userId !== userId) {
      throw new Error('Function not found or access denied');
    }

    // Determine regions to deploy to
    const deployRegions = regions || func.regions || ['global'];

    // Decrypt code
    const decryptedCode = await decrypt(func.code);

    // Deploy to each region
    const deployments: EdgeDeployment[] = [];

    for (const region of deployRegions) {
      try {
        const deployment = await deployToRegion(
          functionId,
          decryptedCode,
          region,
          func.slug,
          func.environmentVariables
        );

        deployments.push(deployment);

        // Update function status
        await prisma.edgeFunction.update({
          where: { id: functionId },
          data: { status: 'deployed' },
        });
      } catch (regionError) {
        logger.error(`Failed to deploy to ${region}`, regionError as Error);
        // Continue with other regions
      }
    }

    logger.worker('edge-function:deploy', 'success', {
      userId,
      funcId: functionId,
      regions: deployRegions,
      deployments: deployments.length,
    });

    return deployments;
  } catch (error) {
    logger.error('Failed to deploy edge function', error as Error, { functionId });
    throw error;
  }
}

/**
 * Deploy function to specific region
 */
async function deployToRegion(
  functionId: string,
  code: string,
  region: EdgeRegion,
  slug: string,
  encryptedEnv?: string
): Promise<EdgeDeployment> {
  try {
    // Generate deployment package
    const packagePath = await generateDeploymentPackage(code, slug, encryptedEnv);

    // Determine region endpoint
    const regionEndpoints: Record<EdgeRegion, string> = {
      'us-east': 'https://us-east.edge.aegisai.dev',
      'us-west': 'https://us-west.edge.aegisai.dev',
      'eu-west': 'https://eu-west.edge.aegisai.dev',
      'eu-central': 'https://eu-central.edge.aegisai.dev',
      'asia-pacific': 'https://asia-pacific.edge.aegisai.dev',
      'global': 'https://edge.aegisai.dev',
    };

    const regionUrl = regionEndpoints[region];

    // Upload to region
    // In production, this would call actual edge provider APIs
    // (Vercel Edge Functions, Cloudflare Workers, etc.)

    const functionUrl = `${regionUrl}/${slug}`;

    // Record deployment
    const deployment = await prisma.edgeDeployment.create({
      data: {
        functionId,
        region,
        version: 1,
        url: functionUrl,
        status: 'deployed',
      },
    });

    logger.worker('edge-deploy:region', 'success', {
      functionId,
      region,
      url: functionUrl,
    });

    return deployment as EdgeDeployment;
  } catch (error) {
    logger.error(`Region deployment failed for ${region}`, error as Error);

    // Create failed deployment record
    const deployment = await prisma.edgeDeployment.create({
      data: {
        functionId,
        region,
        version: 1,
        url: '',
        status: 'failed',
      },
    });

    throw error;
  }
}

/**
 * Generate deployment package
 */
async function generateDeploymentPackage(
  code: string,
  slug: string,
  encryptedEnv?: string
): Promise<string> {
  try {
    const DEPLOYMENTS_DIR = path.join(process.cwd(), 'dist', 'edge-functions');
    await fs.mkdir(DEPLOYMENTS_DIR, { recursive: true });

    const packagePath = path.join(DEPLOYMENTS_DIR, `${slug}_${Date.now()}.js`);

    // Wrap code with edge function handler
    const wrappedCode = `
export default async function handler(request) {
  const response = new Response();
  
  try {
    ${code}
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  return response;
}
    `;

    await fs.writeFile(packagePath, wrappedCode);

    return packagePath;
  } catch (error) {
    logger.error('Failed to generate deployment package', error as Error);
    throw error;
  }
}

/**
 * Validate edge function code
 */
async function validateEdgeFunctionCode(code: string) {
  try {
    // Check for dangerous patterns
    const forbiddenPatterns = [
      /require\(/g, // Node.js require
      /import\s+.*\s+from\s+/g, // Direct imports
      /child_process/g, // Process execution
      /fs\./g, // File system access
      /eval\(/g, // eval()
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        throw new Error('Code contains forbidden operations for edge functions');
      }
    }

    // Validate JavaScript syntax
    new Function(code);
  } catch (error) {
    throw new Error(`Code validation failed: ${(error as Error).message}`);
  }
}

/**
 * Get edge function
 */
export async function getEdgeFunction(
  functionId: string,
  userId: string
): Promise<EdgeFunction> {
  try {
    const func = await prisma.edgeFunction.findUnique({
      where: { id: functionId },
      include: { deployments: true },
    });

    if (!func || func.userId !== userId) {
      throw new Error('Function not found or access denied');
    }

    // Decrypt code
    const decryptedCode = await decrypt(func.code);

    return {
      ...func,
      code: decryptedCode,
    } as EdgeFunction;
  } catch (error) {
    logger.error('Failed to fetch edge function', error as Error);
    throw error;
  }
}

/**
 * List user's edge functions
 */
export async function listEdgeFunctions(userId: string) {
  try {
    const functions = await prisma.edgeFunction.findMany({
      where: { userId },
      include: { deployments: true },
      orderBy: { createdAt: 'desc' },
    });

    return functions;
  } catch (error) {
    logger.error('Failed to list edge functions', error as Error);
    return [];
  }
}

/**
 * Update edge function
 */
export async function updateEdgeFunction(
  functionId: string,
  userId: string,
  updates: {
    name?: string;
    code?: string;
    regions?: EdgeRegion[];
    routes?: string[];
    cacheControl?: string;
  }
) {
  try {
    // Verify ownership
    const func = await prisma.edgeFunction.findUnique({
      where: { id: functionId },
    });

    if (!func || func.userId !== userId) {
      throw new Error('Function not found or access denied');
    }

    // Validate code if provided
    if (updates.code) {
      await validateEdgeFunctionCode(updates.code);
      updates.code = await encrypt(updates.code);
    }

    const updated = await prisma.edgeFunction.update({
      where: { id: functionId },
      data: updates,
    });

    logger.worker('edge-function:update', 'success', { userId, funcId: functionId });

    return updated;
  } catch (error) {
    logger.error('Failed to update edge function', error as Error);
    throw error;
  }
}

/**
 * Delete edge function
 */
export async function deleteEdgeFunction(functionId: string, userId: string) {
  try {
    const func = await prisma.edgeFunction.findUnique({
      where: { id: functionId },
    });

    if (!func || func.userId !== userId) {
      throw new Error('Function not found or access denied');
    }

    // Delete deployments
    await prisma.edgeDeployment.deleteMany({
      where: { functionId },
    });

    // Delete function
    await prisma.edgeFunction.delete({
      where: { id: functionId },
    });

    logger.worker('edge-function:delete', 'success', { userId, funcId: functionId });
  } catch (error) {
    logger.error('Failed to delete edge function', error as Error);
    throw error;
  }
}

/**
 * Generate URL-safe slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .substring(0, 50);
}

/**
 * Rollback deployment to previous version
 */
export async function rollbackEdgeDeployment(
  deploymentId: string,
  userId: string
) {
  try {
    const deployment = await prisma.edgeDeployment.findUnique({
      where: { id: deploymentId },
      include: { function: true },
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const func = deployment.function as any;
    if (func.userId !== userId) {
      throw new Error('Access denied');
    }

    // In production, would rollback to previous version
    logger.worker('edge-deploy:rollback', 'success', { deploymentId });
  } catch (error) {
    logger.error('Failed to rollback deployment', error as Error);
    throw error;
  }
}
