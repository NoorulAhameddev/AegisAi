/**
 * Environment Variable Validation
 * Ensures all required configuration is present and valid
 */

interface EnvConfig {
    // Authentication
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;

    // Database
    DATABASE_URL: string;

    // Security
    ENCRYPTION_KEY: string;

    // AI
    OPENAI_API_KEY: string;

    // Cache/Queue
    REDIS_URL?: string;

    // Environment
    NODE_ENV: 'development' | 'production' | 'test';
}

function validateEnvironment(): EnvConfig {
    const errors: string[] = [];

    // Authentication
    if (!process.env.JWT_ACCESS_SECRET) {
        errors.push('JWT_ACCESS_SECRET is required');
    } else if (process.env.JWT_ACCESS_SECRET.length < 32) {
        errors.push('JWT_ACCESS_SECRET must be at least 32 characters');
    }

    if (!process.env.JWT_REFRESH_SECRET) {
        errors.push('JWT_REFRESH_SECRET is required');
    } else if (process.env.JWT_REFRESH_SECRET.length < 32) {
        errors.push('JWT_REFRESH_SECRET must be at least 32 characters');
    }

    // Database
    if (!process.env.DATABASE_URL) {
        errors.push('DATABASE_URL is required');
    } else if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
        errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
    }

    // Security
    if (!process.env.ENCRYPTION_KEY) {
        errors.push('ENCRYPTION_KEY is required');
    } else if (process.env.ENCRYPTION_KEY.length !== 32) {
        errors.push('ENCRYPTION_KEY must be exactly 32 characters');
    }

    // AI
    if (!process.env.OPENAI_API_KEY) {
        errors.push('OPENAI_API_KEY is required');
    } else if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
        errors.push('OPENAI_API_KEY appears invalid (should start with sk-)');
    }

    // Cache/Queue (optional but recommended for production)
    if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
        errors.push('REDIS_URL is required for production deployments');
    }

    // If in production, fail on any error
    if (errors.length > 0) {
        const isProduction = process.env.NODE_ENV === 'production';
        const message = `Environment Validation Errors:\n${errors.map(e => `  - ${e}`).join('\n')}`;

        if (isProduction) {
            throw new Error(`FATAL: ${message}`);
        } else {
            console.warn(`WARNING: ${message}`);
        }
    }

    return {
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
        DATABASE_URL: process.env.DATABASE_URL!,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
        REDIS_URL: process.env.REDIS_URL,
        NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    };
}

// Validate on module load
let config: EnvConfig | null = null;

export function getEnv(): EnvConfig {
    if (!config) {
        config = validateEnvironment();
    }
    return config;
}

// Export for use in other modules
export const env = getEnv();
