import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Redis from "ioredis";

export async function GET() {
    const checks: any = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: {}
    };

    let allHealthy = true;

    // 1. Database Check
    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.checks.database = {
            status: "ok",
            message: "PostgreSQL connected"
        };
    } catch (error: any) {
        allHealthy = false;
        checks.checks.database = {
            status: "error",
            message: error.message
        };
    }

    // 2. Redis Check
    if (process.env.REDIS_URL) {
        try {
            const redis = new Redis(process.env.REDIS_URL, {
                maxRetriesPerRequest: 1,
                connectTimeout: 5000
            });
            await redis.ping();
            await redis.quit();
            checks.checks.redis = {
                status: "ok",
                message: "Redis connected"
            };
        } catch (error: any) {
            allHealthy = false;
            checks.checks.redis = {
                status: "error",
                message: error.message
            };
        }
    } else {
        checks.checks.redis = {
            status: "warning",
            message: "Redis not configured"
        };
    }

    // 3. OpenAI API Key Check
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
        checks.checks.openai = {
            status: "ok",
            message: "API key configured"
        };
    } else {
        allHealthy = false;
        checks.checks.openai = {
            status: "error",
            message: "Invalid or missing API key"
        };
    }

    // 4. Environment Variables Check
    const requiredEnvVars = [
        'DATABASE_URL',
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'ENCRYPTION_KEY',
        'OPENAI_API_KEY'
    ];

    const missingVars = requiredEnvVars.filter(v => !process.env[v]);

    if (missingVars.length === 0) {
        checks.checks.environment = {
            status: "ok",
            message: "All required variables set"
        };
    } else {
        allHealthy = false;
        checks.checks.environment = {
            status: "error",
            message: `Missing: ${missingVars.join(', ')}`
        };
    }

    // 5. Encryption Key Length Check
    if (process.env.ENCRYPTION_KEY?.length === 32) {
        checks.checks.encryption = {
            status: "ok",
            message: "Encryption key valid"
        };
    } else {
        allHealthy = false;
        checks.checks.encryption = {
            status: "error",
            message: "Encryption key must be exactly 32 characters"
        };
    }

    checks.status = allHealthy ? "healthy" : "unhealthy";

    return NextResponse.json(checks, {
        status: allHealthy ? 200 : 503
    });
}
