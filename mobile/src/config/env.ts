/**
 * Environment Configuration
 * Centralized environment variable management with type safety and validation
 */

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value!;
};

const getEnvBool = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid number for ${key}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
};

export const ENV = {
  // Environment
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  IS_DEV: getEnvVar('NODE_ENV', 'development') === 'development',
  IS_PROD: getEnvVar('NODE_ENV', 'development') === 'production',

  // API Configuration
  API_URL: getEnvVar('EXPO_PUBLIC_API_URL', 'http://192.168.1.5:3000/api'),
  API_TIMEOUT: getEnvNumber('EXPO_PUBLIC_API_TIMEOUT', 30000),
  MAX_RETRIES: getEnvNumber('EXPO_PUBLIC_MAX_RETRIES', 3),

  // Security
  ENABLE_SSL_PINNING: getEnvBool('EXPO_PUBLIC_ENABLE_SSL_PINNING', false),
  REQUIRE_BIOMETRIC: getEnvBool('EXPO_PUBLIC_REQUIRE_BIOMETRIC', false),

  // Features
  ENABLE_ANALYTICS: getEnvBool('EXPO_PUBLIC_ENABLE_ANALYTICS', false),
  ENABLE_CRASH_REPORTING: getEnvBool('EXPO_PUBLIC_ENABLE_CRASH_REPORTING', false),
  OFFLINE_MODE: getEnvBool('EXPO_PUBLIC_OFFLINE_MODE', true),

  // Performance
  IMAGE_CACHE_SIZE: getEnvNumber('EXPO_PUBLIC_IMAGE_CACHE_SIZE', 100),
  MAX_CONCURRENT_REQUESTS: getEnvNumber('EXPO_PUBLIC_MAX_CONCURRENT_REQUESTS', 5),

  // Debug
  ENABLE_DEBUG_LOGS: getEnvBool('EXPO_PUBLIC_ENABLE_DEBUG_LOGS', true),
  LOG_LEVEL: getEnvVar('EXPO_PUBLIC_LOG_LEVEL', 'debug') as 'debug' | 'info' | 'warn' | 'error',
} as const;

// Validate critical configuration on startup
if (ENV.IS_PROD) {
  if (!ENV.API_URL.startsWith('https://')) {
    console.error('⚠️ Production mode requires HTTPS API URL');
  }
  if (ENV.ENABLE_DEBUG_LOGS) {
    console.warn('⚠️ Debug logs should be disabled in production');
  }
}

// Log configuration in development
if (ENV.IS_DEV) {
  console.log('📱 Environment Configuration:', {
    NODE_ENV: ENV.NODE_ENV,
    API_URL: ENV.API_URL,
    OFFLINE_MODE: ENV.OFFLINE_MODE,
  });
}
