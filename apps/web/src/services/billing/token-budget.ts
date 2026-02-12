import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getMonthlyTokenLimit, getRateLimit, PricingTier } from "@/lib/pricing";
import type { PricingTier as DbPricingTier } from "@prisma/client";

/**
 * Token Budget Manager - Tier-aware token budget enforcement
 * CRITICAL: Enforces per-tier limits to prevent token budget fraud
 * 
 * Budget Hierarchy:
 * - Monthly: Main limit (resets 1st of month)
 * - Daily: Soft limit (can burst over if monthly available)
 * - Per-Request: Hard limit (absolute maximum per call)
 */
export interface TokenLimits {
    perRequest: number;  // Max tokens per single request (hard limit)
    hourly: number;      // Max tokens per hour (soft limit)
    daily: number;       // Max tokens per day (soft limit)
    monthly: number;     // Max tokens per month (main limit)
}

export const DEFAULT_TOKEN_LIMITS: TokenLimits = {
    perRequest: 10_000,   // 10K tokens per request max
    hourly: 50_000,       // 50K tokens per hour max
    daily: 500_000,       // 500K tokens per day max
    monthly: 10_000,      // 10K tokens per month (FREE tier default)
};

export class TokenBudgetManager {
    private limits: TokenLimits;

    constructor(limits: TokenLimits = DEFAULT_TOKEN_LIMITS) {
        this.limits = limits;
    }

    /**
     * Get effective limits for a user based on their tier
     */
    async getUserLimits(userId: string): Promise<TokenLimits> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { plan: true }
            });

            if (!user) {
                return this.limits;
            }

            const monthlyLimit = getMonthlyTokenLimit(user.plan);
            const rateLimit = getRateLimit(user.plan);

            // Adjust per-request and hourly limits based on monthly limit
            const perRequestLimit = Math.min(monthlyLimit / 10, 100_000); // At least 1/10th of monthly
            const hourlyLimit = Math.min(monthlyLimit / 4, 500_000); // At most 1/4 of monthly per hour

            return {
                perRequest: Math.max(perRequestLimit, 5_000), // Minimum 5K
                hourly: Math.max(hourlyLimit, 10_000), // Minimum 10K
                daily: Math.max(monthlyLimit / 30, 50_000), // Minimum 50K
                monthly: monthlyLimit
            };
        } catch (error) {
            logger.error('Failed to get user tier limits', error as Error, { userId });
            return this.limits;
        }
    }

    /**
     * Check if user has budget remaining for a request (tier-aware)
     */
    async checkBudget(userId: string, estimatedTokens: number): Promise<{ approved: boolean; reason?: string; tierInfo?: string }> {
        const userLimits = await this.getUserLimits(userId);

        // 1. Hard limit: Per-request
        if (estimatedTokens > userLimits.perRequest) {
            return {
                approved: false,
                reason: `Request exceeds per-request limit (${estimatedTokens}/${userLimits.perRequest} tokens)`,
                tierInfo: `Your tier allows max ${userLimits.perRequest} tokens per request`
            };
        }

        const usage = await this.getUsage(userId);

        // 2. Monthly limit (main enforcement)
        const monthlyRemaining = userLimits.monthly - usage.thisMonth;
        if (usage.thisMonth + estimatedTokens > userLimits.monthly) {
            return {
                approved: false,
                reason: `Monthly budget exceeded. Usage: ${usage.thisMonth}/${userLimits.monthly} tokens`,
                tierInfo: `${monthlyRemaining} tokens remaining this month. Upgrade your tier for more.`
            };
        }

        // 3. Daily limit (warning only, but still checked)
        if (usage.today + estimatedTokens > userLimits.daily) {
            return {
                approved: false,
                reason: `Daily budget exceeded. Usage: ${usage.today}/${userLimits.daily} tokens`,
                tierInfo: `Try again tomorrow or upgrade your tier`
            };
        }

        // 4. Hourly limit (warning only)
        if (usage.thisHour + estimatedTokens > userLimits.hourly) {
            return {
                approved: false,
                reason: `Hourly budget exceeded. Usage: ${usage.thisHour}/${userLimits.hourly} tokens`,
                tierInfo: `Wait a bit before making another request`
            };
        }

        return { approved: true };
    }

    /**
     * Record token usage after a request
     */
    async recordUsage(userId: string, tokensUsed: number, metadata?: { model?: string; chatId?: string }): Promise<void> {
        await prisma.usageMetric.create({
            data: {
                userId,
                tokens: tokensUsed,
                model: metadata?.model || "gpt-4o-mini",
                metadata: metadata ? JSON.stringify(metadata) : undefined,
            }
        });

        logger.info("Token usage recorded", { userId, tokens: tokensUsed, ...metadata });
    }

    /**
     * Get current usage stats for a user
     */
    private async getUsage(userId: string) {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [hourlyMetrics, dailyMetrics, monthlyMetrics] = await Promise.all([
            prisma.usageMetric.aggregate({
                where: {
                    userId,
                    createdAt: { gte: oneHourAgo }
                },
                _sum: { tokens: true }
            }),
            prisma.usageMetric.aggregate({
                where: {
                    userId,
                    createdAt: { gte: todayStart }
                },
                _sum: { tokens: true }
            }),
            prisma.usageMetric.aggregate({
                where: {
                    userId,
                    createdAt: { gte: monthStart }
                },
                _sum: { tokens: true }
            })
        ]);

        return {
            thisHour: hourlyMetrics._sum.tokens || 0,
            today: dailyMetrics._sum.tokens || 0,
            thisMonth: monthlyMetrics._sum.tokens || 0,
        };
    }

    /**
     * Get remaining budget for user (tier-aware)
     */
    async getRemainingBudget(userId: string): Promise<{
        hourly: { used: number; remaining: number; limit: number };
        daily: { used: number; remaining: number; limit: number };
        monthly: { used: number; remaining: number; limit: number };
    }> {
        const usage = await this.getUsage(userId);
        const userLimits = await this.getUserLimits(userId);

        return {
            hourly: {
                used: usage.thisHour,
                remaining: Math.max(0, userLimits.hourly - usage.thisHour),
                limit: userLimits.hourly
            },
            daily: {
                used: usage.today,
                remaining: Math.max(0, userLimits.daily - usage.today),
                limit: userLimits.daily
            },
            monthly: {
                used: usage.thisMonth,
                remaining: Math.max(0, userLimits.monthly - usage.thisMonth),
                limit: userLimits.monthly
            }
        };
    }

    /**
     * Reset monthly limits (called on subscription renewal)
     */
    async resetMonthlyUsage(userId: string): Promise<void> {
        // Note: We don't delete old records (audit trail)
        // Just track new month's usage separately via date logic
        logger.info("Monthly token usage limit reset", { userId });
    }

    /**
     * Get usage stats for display/analytics
     */
    async getUsageStats(userId: string) {
        const usage = await this.getUsage(userId);
        const budget = await this.getRemainingBudget(userId);

        return {
            usage,
            budget,
            percentUsed: {
                monthly: (usage.thisMonth / budget.monthly.limit) * 100,
                daily: (usage.today / budget.daily.limit) * 100,
            }
        };
    }
}

export const tokenBudgetManager = new TokenBudgetManager();

