import { prisma } from '../lib/prisma';
import { env } from '../lib/env';

export async function startCleanupTask(): Promise<NodeJS.Timeout> {
    // Run immediately on start
    await runCleanup();

    // Loop every hour
    const cleanupInterval = setInterval(async () => {
        await runCleanup();
    }, 60 * 60 * 1000); // 1 Hour interval
    
    cleanupInterval.unref(); // Don't keep process alive in tests
    return cleanupInterval;
}

async function runCleanup() {
    try {
        console.log('[Worker] Running cleanup...');
        const now = new Date();

        // 1. Cleanup Expired Sessions
        const s = await prisma.session.deleteMany({
            where: { expiresAt: { lt: now } }
        });
        if (s.count > 0) console.log(`[Worker] Removed ${s.count} expired sessions.`);

        // 2. CRITICAL: Retention Policy - Use config from environment
        const retentionDays = env.AUDIT_LOG_RETENTION_DAYS || 90;
        const expiryDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
        const l = await prisma.auditLog.deleteMany({
            where: { createdAt: { lt: expiryDate } }
        });
        if (l.count > 0) console.log(`[Worker] Removed ${l.count} old audit logs (retention: ${retentionDays} days).`);

    } catch (e) {
        console.error("[Worker] Cleanup error:", e);
    }
}
