import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let cachedKey: Buffer | null = null;
let keyCachedAt: number | null = null;
const KEY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours - rotate daily in production
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if cached key needs rotation
 */
function isKeyExpired(): boolean {
  if (!cachedKey || !keyCachedAt) return true;
  return Date.now() - keyCachedAt > KEY_TTL_MS;
}

/**
 * Force key rotation (call when key is compromised or on schedule)
 */
export async function rotateEncryptionKey(): Promise<void> {
  logger.info("[Secrets] Forcing encryption key rotation");
  cachedKey = null;
  keyCachedAt = null;
}

/**
 * Initialize secrets provider
 */
export async function initSecrets(): Promise<void> {
  if (env.SECRET_PROVIDER === "local") {
    logger.info("[Secrets] Secret provider configured: local");
    return;
  }
  logger.info("[Secrets] Secret provider configured: aws-kms");
  await getEncryptionKey();
}

/**
 * Retrieve a secret value by name
 */
export async function getSecret(secretName: string): Promise<string> {
  if (env.SECRET_PROVIDER === "local") {
    const val = process.env[secretName];
    if (!val) {
      throw new Error(`Secret '${secretName}' not found in local environment`);
    }
    return val;
  }

  const val = process.env[secretName];
  if (!val) {
    throw new Error(`Secret '${secretName}' not found in environment`);
  }
  return val;
}

export async function getEncryptionKey(): Promise<Buffer> {
  // Check if cached key is valid
  if (cachedKey && !isKeyExpired()) {
    return cachedKey;
  }

  // Handle local secret provider without instantiating KMSClient
  if (env.SECRET_PROVIDER === "local") {
    const rawKey = process.env.ENCRYPTION_KEY || env.ENCRYPTION_KEY;
    if (!rawKey) {
      if (env.NODE_ENV !== "production") {
        cachedKey = Buffer.from("0".repeat(64), "hex");
        keyCachedAt = Date.now();
        return cachedKey;
      }
      throw new Error("FATAL: ENCRYPTION_KEY is required when SECRET_PROVIDER=local");
    }

    cachedKey =
      rawKey.length === 64
        ? Buffer.from(rawKey, "hex")
        : Buffer.from(rawKey, "utf-8");
    keyCachedAt = Date.now();
    return cachedKey;
  }

  // AWS KMS Provider
  const kms = new KMSClient({ region: env.AWS_REGION });
  let lastError: Error | null = null;

  // Exponential backoff retry logic
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await kms.send(
        new DecryptCommand({
          CiphertextBlob: Buffer.from(
            env.ENCRYPTION_KEY_CIPHERTEXT ?? "",
            "base64",
          ),
        }),
      );

      if (!result.Plaintext) {
        throw new Error("FATAL: KMS decrypt returned no plaintext");
      }

      cachedKey = Buffer.from(result.Plaintext);
      keyCachedAt = Date.now();
      logger.info("Encryption key successfully decrypted from KMS", {
        cachedAt: new Date(keyCachedAt).toISOString(),
        ttl: KEY_TTL_MS / 1000 / 60 / 60 + "h",
      });
      return cachedKey;
    } catch (error) {
      lastError = error as Error;
      logger.warn(
        `Encryption key fetch failed (attempt ${attempt + 1}/${MAX_RETRIES})`,
        {
          error: (error as Error).message,
          attempt: attempt + 1,
        },
      );

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < MAX_RETRIES - 1) {
        const backoffMs = INITIAL_DELAY * Math.pow(2, attempt);
        await delay(backoffMs);
      }
    }
  }

  // All retries exhausted
  logger.error(
    "FATAL: Failed to fetch encryption key after retries",
    lastError || new Error("Unknown error"),
  );
  throw new Error(
    "FATAL: Unable to decrypt encryption key from KMS after " +
      MAX_RETRIES +
      " attempts. Service unavailable.",
  );
}
