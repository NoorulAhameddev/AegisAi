// Test-specific setup for web app

// Mock Next.js cache and revalidation functions
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

// Mock the env module before any imports that use it
jest.mock("@/lib/env", () => ({
  env: {
    APP_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    JWT_ACCESS_SECRET: "test-access-secret-key-min-32-chars-long",
    JWT_REFRESH_SECRET: "test-refresh-secret-key-min-32-chars",
    OPENROUTER_API_KEY: "sk-test-api-key-for-testing-purposes",
    REDIS_URL: "redis://localhost:6379",
    ENCRYPTION_KEY_CIPHERTEXT:
      Buffer.from("test-ciphertext").toString("base64"),
    AWS_REGION: "us-east-1",
    S3_BUCKET: "aegis-ai-files",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    PORT: 3000,
    NODE_ENV: "test",
    WEBSOCKET_PORT: 3001,
    QUEUE_NAME: "chat-queue",
    SECRET_PROVIDER: "local",
    MAX_FILE_SIZE: 52428800,
    MAX_UPLOADS_PER_MINUTE: 20,
    ALLOWED_ORIGINS: "",
    AUDIT_LOG_RETENTION_DAYS: 90,
    SESSION_RETENTION_DAYS: 7,
    DATABASE_POOL_MIN: 2,
    DATABASE_POOL_MAX: 20,
    VECTOR_DB_PROVIDER: "lancedb",
    EMBEDDING_MODEL: "text-embedding-3-small",
    CROSS_ENCODER_MODEL: "ms-marco-MiniLM-L-12-v2",
    SEMANTIC_CACHE_TTL: 86400,
    ENABLE_SERVERLESS_FUNCTIONS: false,
    FRONTEND_URL: "http://localhost:3000",
    SITE_URL: "http://localhost:3000",
  },
}));

// Global test utilities
export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  tokenVersion: 1,
};

export const mockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    method: "GET",
    url: "http://localhost:3000",
    headers: new Headers({
      "content-type": "application/json",
      "x-user-id": mockUser.id,
      "x-request-id": "test-request-id",
    }),
    ...overrides,
  } as Request;
};

// Enhanced Response mock for better test compatibility
export const createMockResponse = (status: number, data: any) => {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(),
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    clone: jest.fn(),
  } as unknown as Response;
};
