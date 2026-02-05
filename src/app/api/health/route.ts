import { prisma } from "@/lib/prisma";
import Redis from "ioredis";
import { env } from "@/lib/env";
import { successResponse } from "@/lib/response";

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
    if (env.REDIS_URL) {
        try {
            const redis = new Redis(env.REDIS_URL, {
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
    if (env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.startsWith('sk-')) {
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
        'OPENROUTER_API_KEY',
        'ENCRYPTION_KEY_CIPHERTEXT',
        'AWS_REGION',
        'SECRET_PROVIDER'
    ];

    const missingVars = requiredEnvVars.filter(v => !(env as any)[v]);

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
    if (env.ENCRYPTION_KEY_CIPHERTEXT && env.AWS_REGION) {
        checks.checks.encryption = {
            status: "ok",
            message: "Encryption configured"
        };
    } else {
        allHealthy = false;
        checks.checks.encryption = {
            status: "error",
            message: "Missing encryption configuration"
        };
    }

    // 6. Vector Store (LanceDB) Check
    try {
        const { getDb } = await import("@/ai/rag/vector-store");
        const db = await getDb();
        // Try to list tables as a simple connectivity test
        const tables = await db.tableNames();
        checks.checks.vectorStore = {
            status: "ok",
            message: `LanceDB connected (${tables.length} tables)`
        };
    } catch (error: any) {
        allHealthy = false;
        checks.checks.vectorStore = {
            status: "error",
            message: error.message || "Vector store not accessible"
        };
    }
            message: "KMS encryption configured"
        };
    } else {
        allHealthy = false;
        checks.checks.encryption = {
            status: "error",
            message: "KMS encryption not configured"
        };
    }

    checks.status = allHealthy ? "healthy" : "unhealthy";

    return successResponse(checks, { status: allHealthy ? 200 : 503 });
}
