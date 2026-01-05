import { prisma } from '../lib/prisma';

export async function startCleanupTask() {
    // Run immediately on start
    await runCleanup();

    // Loop every hour
    setInterval(async () => {
        await runCleanup();
    }, 60 * 60 * 1000); // 1 Hour interval
}

async function runCleanup() {
    try {
        console.log('[Worker] Running cleanup...');
        const now = new Date();

        // 1. Cleanup Expired Sessions
        // @ts-ignore - Client generation pending
        const s = await prisma.session.deleteMany({
            where: { expiresAt: { lt: now } }
        });
        if (s.count > 0) console.log(`[Worker] Removed ${s.count} expired sessions.`);

        // 2. Retention Policy: Delete logs older than 30 days
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const l = await prisma.auditLog.deleteMany({
            where: { createdAt: { lt: thirtyDaysAgo } }
        });
        if (l.count > 0) console.log(`[Worker] Removed ${l.count} old audit logs.`);

    } catch (e) {
        console.error("[Worker] Cleanup error:", e);
    }
}
