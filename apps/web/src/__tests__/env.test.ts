jest.unmock("@/lib/env");

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { validateEnv } from "@/lib/env";
import * as secretsModule from "@/lib/secrets";

describe("Production Environment Configuration Hardening (M4 / R3)", () => {
  const originalEnv = process.env;

  const validProdBaseEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    APP_ENV: "production",
    DATABASE_URL: "postgresql://postgres:securepass@db.production.internal:5432/aegis_prod",
    JWT_ACCESS_SECRET: "a".repeat(64),
    JWT_REFRESH_SECRET: "b".repeat(64),
    AUDIT_SIGNING_KEY: "c".repeat(64),
    ALLOWED_ORIGINS: "https://app.aegis.ai,https://admin.aegis.ai",
    SECRET_PROVIDER: "local",
    ENCRYPTION_KEY: "f".repeat(64),
    OPENROUTER_API_KEY: "sk-or-live-key",
    REDIS_URL: "redis://redis.production.internal:6379",
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SKIP_PROD_VALIDATION;
    delete process.env.NEXT_PHASE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // AC-01: Rejection of SKIP_PROD_VALIDATION=1 in production runtime
  describe("AC-01: rejects SKIP_PROD_VALIDATION in production runtime", () => {
    it("rejects SKIP_PROD_VALIDATION in production with APP_ENV=production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          SKIP_PROD_VALIDATION: "1",
        });
      }).toThrow(/CRITICAL SECURITY VIOLATION: SKIP_PROD_VALIDATION=1 is strictly prohibited in production runtime!/);
    });

    it("rejects SKIP_PROD_VALIDATION in production with NODE_ENV=production and unset APP_ENV", () => {
      const testEnv = { ...validProdBaseEnv, SKIP_PROD_VALIDATION: "1" };
      delete testEnv.APP_ENV;

      expect(() => {
        validateEnv(testEnv);
      }).toThrow(/CRITICAL SECURITY VIOLATION: SKIP_PROD_VALIDATION=1 is strictly prohibited in production runtime!/);
    });

    it("rejects SKIP_PROD_VALIDATION in production when loading module via top-level require", () => {
      process.env = {
        ...validProdBaseEnv,
        SKIP_PROD_VALIDATION: "1",
      };

      expect(() => {
        jest.isolateModules(() => {
          require("@/lib/env");
        });
      }).toThrow(/CRITICAL SECURITY VIOLATION: SKIP_PROD_VALIDATION=1 is strictly prohibited in production runtime!/);
    });

    it("permits SKIP_PROD_VALIDATION=1 in test/development environments", () => {
      const result = validateEnv({
        NODE_ENV: "test",
        APP_ENV: "test",
        DATABASE_URL: "postgresql://test:test@localhost:5432/test",
        SKIP_PROD_VALIDATION: "1",
      });

      expect(result.APP_ENV).toBe("test");
      expect(result.NODE_ENV).toBe("test");
    });
  });

  // AC-02: Rejection of missing, dev default, or short secrets in production
  describe("AC-02: validates secret entropy and rejects insecure dev secret defaults", () => {
    it("validates secret entropy and rejects default JWT_ACCESS_SECRET in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          JWT_ACCESS_SECRET: "dev-access-secret-min-32-chars-long!",
        });
      }).toThrow(/JWT_ACCESS_SECRET must be at least 64 random characters in production!/);
    });

    it("rejects short (<64 chars) JWT_ACCESS_SECRET in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          JWT_ACCESS_SECRET: "a".repeat(32), // 32 chars is insufficient for production
        });
      }).toThrow(/JWT_ACCESS_SECRET must be at least 64 random characters in production!/);
    });

    it("rejects default JWT_REFRESH_SECRET in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          JWT_REFRESH_SECRET: "dev-refresh-secret-min-32-chars-long!",
        });
      }).toThrow(/JWT_REFRESH_SECRET must be at least 64 random characters in production!/);
    });

    it("rejects short (<64 chars) JWT_REFRESH_SECRET in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          JWT_REFRESH_SECRET: "b".repeat(48),
        });
      }).toThrow(/JWT_REFRESH_SECRET must be at least 64 random characters in production!/);
    });

    it("rejects default AUDIT_SIGNING_KEY in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          AUDIT_SIGNING_KEY: "dev-only-insecure-key-replace-in-production-32chars",
        });
      }).toThrow(/AUDIT_SIGNING_KEY must be at least 64 random characters in production!/);
    });

    it("rejects short (<64 chars) AUDIT_SIGNING_KEY in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          AUDIT_SIGNING_KEY: "c".repeat(32),
        });
      }).toThrow(/AUDIT_SIGNING_KEY must be at least 64 random characters in production!/);
    });

    it("accepts valid 64-character high-entropy secrets in production", () => {
      const result = validateEnv(validProdBaseEnv);
      expect(result.JWT_ACCESS_SECRET).toHaveLength(64);
      expect(result.JWT_REFRESH_SECRET).toHaveLength(64);
      expect(result.AUDIT_SIGNING_KEY).toHaveLength(64);
    });
  });

  // AC-03: Rejection of invalid CORS origins and wildcards with credentials in production
  describe("AC-03: rejects invalid CORS origins and wildcards with credentials in production", () => {
    it("rejects wildcard '*' origin in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          ALLOWED_ORIGINS: "*",
        });
      }).toThrow(/Wildcard CORS origin '\*' is disallowed in production when credentials are enabled/);
    });

    it("rejects HTTP origin in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          ALLOWED_ORIGINS: "http://insecure.aegis.ai",
        });
      }).toThrow(/Insecure CORS origin 'http:\/\/insecure\.aegis\.ai' is disallowed in production/);
    });

    it("rejects localhost in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          ALLOWED_ORIGINS: "https://localhost:3000",
        });
      }).toThrow(/Insecure CORS origin 'https:\/\/localhost:3000' is disallowed in production/);
    });

    it("rejects 127.0.0.1 in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          ALLOWED_ORIGINS: "https://127.0.0.1:8080",
        });
      }).toThrow(/Insecure CORS origin 'https:\/\/127\.0\.0\.1:8080' is disallowed in production/);
    });

    it("rejects trailing slash in CORS origin", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          ALLOWED_ORIGINS: "https://app.aegis.ai/",
        });
      }).toThrow(/CORS origin 'https:\/\/app\.aegis\.ai\/' must not have a trailing slash in production/);
    });

    it("rejects malformed origin URL", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          ALLOWED_ORIGINS: "not-a-valid-url",
        });
      }).toThrow(/Insecure CORS origin 'not-a-valid-url' is disallowed in production/);
    });

    it("accepts multiple valid HTTPS origins without trailing slashes", () => {
      const result = validateEnv({
        ...validProdBaseEnv,
        ALLOWED_ORIGINS: "https://app.aegis.ai, https://console.aegis.ai, https://api.aegis.ai",
      });
      expect(result.ALLOWED_ORIGINS).toContain("https://app.aegis.ai");
    });
  });

  // AC-04: Rejection of contradictory APP_ENV and NODE_ENV configurations
  describe("AC-04: rejects contradictory APP_ENV and NODE_ENV configurations", () => {
    it("rejects NODE_ENV=production with APP_ENV=development", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          NODE_ENV: "production",
          APP_ENV: "development",
        });
      }).toThrow(/Contradictory environment configuration: NODE_ENV cannot be 'production' while APP_ENV is 'development'/);
    });

    it("rejects APP_ENV=production with NODE_ENV=development", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          NODE_ENV: "development",
          APP_ENV: "production",
        });
      }).toThrow(/Contradictory environment configuration: APP_ENV cannot be 'production' while NODE_ENV is 'development'/);
    });

    it("harmonizes unset APP_ENV to production when NODE_ENV=production", () => {
      const envWithoutAppEnv = { ...validProdBaseEnv };
      delete envWithoutAppEnv.APP_ENV;

      const result = validateEnv(envWithoutAppEnv);
      expect(result.APP_ENV).toBe("production");
      expect(result.NODE_ENV).toBe("production");
    });

    it("allows consistent NODE_ENV=development and APP_ENV=development", () => {
      const result = validateEnv({
        NODE_ENV: "development",
        APP_ENV: "development",
        DATABASE_URL: "postgresql://dev:dev@localhost:5432/aegis_dev",
      });
      expect(result.APP_ENV).toBe("development");
      expect(result.NODE_ENV).toBe("development");
    });
  });

  // AC-05: Successful build-phase compilation with dummy fallback credentials
  describe("AC-05: successful build-phase compilation with dummy fallback credentials", () => {
    it("succeeds during phase-production-build with omitted DATABASE_URL using dummy fallback", () => {
      const buildEnv: NodeJS.ProcessEnv = {
        NEXT_PHASE: "phase-production-build",
        NODE_ENV: "production",
        APP_ENV: "development",
      };

      const result = validateEnv(buildEnv);
      expect(result.DATABASE_URL).toBe("postgresql://build:dummy@localhost:5432/build_dummy");
      expect(result.JWT_ACCESS_SECRET).toBe("dev-access-secret-min-32-chars-long!");
    });

    it("does not throw contradictory error during phase-production-build when NODE_ENV=production and APP_ENV=development", () => {
      const buildEnv: NodeJS.ProcessEnv = {
        NEXT_PHASE: "phase-production-build",
        NODE_ENV: "production",
        APP_ENV: "development",
      };

      expect(() => validateEnv(buildEnv)).not.toThrow();
    });

    it("does not enforce 64-character secret entropy during phase-production-build", () => {
      const buildEnv: NodeJS.ProcessEnv = {
        NEXT_PHASE: "phase-production-build",
        NODE_ENV: "production",
        APP_ENV: "production",
      };

      const result = validateEnv(buildEnv);
      expect(result.JWT_ACCESS_SECRET).toBe("dev-access-secret-min-32-chars-long!");
    });
  });

  // Additional Security & Secret Provider Validation
  describe("Secret Provider & Security Hardening", () => {
    it("requires ENCRYPTION_KEY (>= 64 chars) when SECRET_PROVIDER=local in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          SECRET_PROVIDER: "local",
          ENCRYPTION_KEY: "short-key",
        });
      }).toThrow(/ENCRYPTION_KEY \(minimum 64 hex characters\) is required when SECRET_PROVIDER=local/);
    });

    it("requires AWS_REGION and ENCRYPTION_KEY_CIPHERTEXT when SECRET_PROVIDER=aws-kms in production", () => {
      expect(() => {
        validateEnv({
          ...validProdBaseEnv,
          SECRET_PROVIDER: "aws-kms",
          AWS_REGION: undefined,
          ENCRYPTION_KEY_CIPHERTEXT: undefined,
        });
      }).toThrow(/AWS_REGION and ENCRYPTION_KEY_CIPHERTEXT are required when SECRET_PROVIDER=aws-kms/);
    });

    it("accepts valid aws-kms configuration in production", () => {
      const result = validateEnv({
        ...validProdBaseEnv,
        SECRET_PROVIDER: "aws-kms",
        AWS_REGION: "us-east-1",
        ENCRYPTION_KEY_CIPHERTEXT: Buffer.from("dummy-ciphertext").toString("base64"),
      });
      expect(result.SECRET_PROVIDER).toBe("aws-kms");
      expect(result.AWS_REGION).toBe("us-east-1");
    });
  });

  // Secrets module integration
  describe("secrets.ts local provider handling", () => {
    it("getEncryptionKey uses local key without instantiating KMSClient when SECRET_PROVIDER=local", async () => {
      await secretsModule.rotateEncryptionKey();
      process.env.ENCRYPTION_KEY = "ab".repeat(32); // 64 hex chars = 32 bytes
      const key = await secretsModule.getEncryptionKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it("initSecrets succeeds in local mode without AWS credentials", async () => {
      await expect(secretsModule.initSecrets()).resolves.toBeUndefined();
    });

    it("getSecret retrieves environment variable in local mode", async () => {
      process.env.TEST_SECRET_VAR = "super-secret-value";
      const val = await secretsModule.getSecret("TEST_SECRET_VAR");
      expect(val).toBe("super-secret-value");
    });
  });
});
