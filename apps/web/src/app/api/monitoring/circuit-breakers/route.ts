/**
 * Circuit Breaker Monitoring Endpoint
 * 
 * Returns detailed stats for all circuit breakers
 * Used for debugging, dashboards, and operational visibility
 */

import { NextRequest } from "next/server";
import { successResponse, unauthorizedResponse } from "@/lib/response";
import { verifyAuth } from "@/services/auth/auth";
import {
    openaiCircuitBreaker,
    moderationCircuitBreaker,
    ragCircuitBreaker,
    getCircuitStats,
} from "@/lib/circuit-breaker";

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        
        // Require authentication (admin can add role check later)
        if (!user) {
            return unauthorizedResponse({ 
                requestId: req.headers.get('x-request-id') || undefined 
            });
        }

        const stats = {
            timestamp: new Date().toISOString(),
            circuitBreakers: {
                openai: getCircuitStats(openaiCircuitBreaker),
                moderation: getCircuitStats(moderationCircuitBreaker),
                rag: getCircuitStats(ragCircuitBreaker),
            },
            summary: {
                totalFires: 0,
                totalSuccesses: 0,
                totalFailures: 0,
                totalRejects: 0,
                openCircuits: 0,
            }
        };

        // Calculate summary
        Object.values(stats.circuitBreakers).forEach((breaker) => {
            stats.summary.totalFires += breaker.fires;
            stats.summary.totalSuccesses += breaker.successes;
            stats.summary.totalFailures += breaker.failures;
            stats.summary.totalRejects += breaker.rejects;
            if (breaker.state === 'OPEN') {
                stats.summary.openCircuits++;
            }
        });

        return successResponse(stats, {
            requestId: req.headers.get('x-request-id') || undefined,
        });
    } catch (error) {
        return successResponse(
            { error: 'Failed to fetch circuit breaker stats' },
            { status: 500 }
        );
    }
}
