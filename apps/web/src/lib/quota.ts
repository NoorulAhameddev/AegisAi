import { prisma } from "@/lib/prisma";

const DAILY_TOKEN_LIMIT = 50000;

export async function checkQuota(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const metrics = await prisma.usageMetric.findMany({
        where: {
            userId: userId,
            createdAt: {
                gte: startOfDay
            }
        },
        select: { tokens: true }
    });

    const used = metrics.reduce((acc, curr) => acc + curr.tokens, 0);

    if (used >= DAILY_TOKEN_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: DAILY_TOKEN_LIMIT - used };
}
