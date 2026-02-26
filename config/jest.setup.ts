// Environment setup for tests - MUST run before jest-dom
import * as dotenv from "dotenv";
import * as path from "path";

// Load test environment variables from .env.test
const testEnvPath = path.resolve(__dirname, "../apps/web/.env.test");
dotenv.config({ path: testEnvPath });

// Ensure critical environment variables are set for tests
if (!process.env.APP_ENV) process.env.APP_ENV = "test";
if (!process.env.DATABASE_URL)
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/aegis_test";
if (!process.env.JWT_ACCESS_SECRET)
  process.env.JWT_ACCESS_SECRET =
    "test-access-secret-key-minimum-32-characters-long-for-security";
if (!process.env.JWT_REFRESH_SECRET)
  process.env.JWT_REFRESH_SECRET =
    "test-refresh-secret-key-minimum-32-characters-long-for-security";
if (!process.env.OPENROUTER_API_KEY)
  process.env.OPENROUTER_API_KEY = "sk-or-test-key-for-testing";
if (!process.env.REDIS_URL) process.env.REDIS_URL = "redis://localhost:6379";
if (!process.env.ENCRYPTION_KEY)
  process.env.ENCRYPTION_KEY = "test-encryption-key-32-chars!!";
if (!process.env.NEXT_PUBLIC_APP_URL)
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Now import jest-dom AFTER environment is set up
import "@testing-library/jest-dom";
// Ensure global fetch APIs exist in Node test environment
if (typeof (global as any).fetch === "undefined") {
  try {
    // Prefer undici (bundled with Next) to avoid extra deps
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const undici = require("undici");
    (global as any).fetch = undici.fetch;
    (global as any).Headers = undici.Headers;
    (global as any).Request = undici.Request;
    (global as any).Response = undici.Response;
  } catch {
    // If undici isn't available, attempt cross-fetch
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("cross-fetch/polyfill");
    } catch (e) {
      // As a fallback, provide a minimal fetch via axios for tests
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const axios = require("axios");
      (global as any).fetch = async (url: string, options: any = {}) => {
        const method = options.method || "GET";
        const headers = options.headers || {};
        let data = options.body;
        // If object body, stringify as JSON unless it's FormData/URLSearchParams/Buffer
        const isFormData =
          typeof FormData !== "undefined" && data instanceof FormData;
        const isURLSearchParams =
          typeof URLSearchParams !== "undefined" &&
          data instanceof URLSearchParams;
        const isBuffer = typeof Buffer !== "undefined" && Buffer.isBuffer(data);
        if (
          data &&
          !isFormData &&
          !isURLSearchParams &&
          !isBuffer &&
          typeof data !== "string"
        ) {
          try {
            data = JSON.stringify(data);
          } catch {}
        }
        const resp = await axios({
          url,
          method,
          headers,
          data,
          validateStatus: () => true,
          responseType: "text",
        });
        return {
          ok: resp.status >= 200 && resp.status < 300,
          status: resp.status,
          statusText: resp.statusText,
          headers: {
            get: (name: string) =>
              resp.headers?.[String(name).toLowerCase()] ?? null,
          },
          text: async () =>
            typeof resp.data === "string"
              ? resp.data
              : JSON.stringify(resp.data),
          json: async () => {
            if (typeof resp.data === "string") {
              try {
                return JSON.parse(resp.data);
              } catch {
                return resp.data;
              }
            }
            return resp.data;
          },
        };
      };
    }
  }
}

// Polyfill TextEncoder/TextDecoder for libraries that expect Node globals
import { TextDecoder, TextEncoder } from "util";

if (!(global as any).TextDecoder) {
  (global as any).TextDecoder = TextDecoder;
}

if (!(global as any).TextEncoder) {
  (global as any).TextEncoder = TextEncoder;
}

// Mock AWS SDK clients used in tests to avoid real network calls.
jest.mock("@aws-sdk/client-kms", () => {
  class DecryptCommand {
    input: any;
    constructor(input: any) {
      this.input = input;
    }
  }

  class KMSClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async send(command: any) {
      if (command instanceof DecryptCommand) {
        return { Plaintext: Buffer.from("a".repeat(32)) };
      }
      return {};
    }
  }

  return { KMSClient, DecryptCommand };
});

jest.mock("@aws-sdk/client-s3", () => {
  const { Readable } = require("stream");

  class PutObjectCommand {
    input: any;
    constructor(input: any) {
      this.input = input;
    }
  }
  class GetObjectCommand {
    input: any;
    constructor(input: any) {
      this.input = input;
    }
  }
  class DeleteObjectCommand {
    input: any;
    constructor(input: any) {
      this.input = input;
    }
  }
  class HeadObjectCommand {
    input: any;
    constructor(input: any) {
      this.input = input;
    }
  }
  class ListObjectsV2Command {
    input: any;
    constructor(input: any) {
      this.input = input;
    }
  }

  class S3Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async send(command: any) {
      if (command instanceof GetObjectCommand) {
        return {
          Body: Readable.from(Buffer.from("test")),
          ContentLength: 4,
          ContentType: "application/octet-stream",
        };
      }
      if (command instanceof ListObjectsV2Command) {
        return { Contents: [] };
      }
      return {};
    }
  }

  return {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
  };
});

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: async () => "https://signed-url.local/test",
}));

jest.mock("@/lib/vector-db-provider", () => {
  const validateUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const provider = {
    addDocument: jest.fn(async () => "doc-id"),
    ingestDocument: jest.fn(async () => []),
    batchIngestDocuments: jest.fn(async () => []),
    searchSimilar: jest.fn(async (_query: string, userId: string) => {
      if (!validateUUID(userId)) {
        throw new Error("Invalid userId format");
      }
      return [];
    }),
    deleteDocumentsBySource: jest.fn(async () => 0),
    getDocumentStats: jest.fn(async () => ({
      totalDocuments: 0,
      uniqueSources: 0,
    })),
    exists: jest.fn(async () => false),
    initialize: jest.fn(async () => undefined),
  };

  return {
    createVectorDBProvider: () => provider,
    getVectorDBProvider: () => provider,
  };
});
