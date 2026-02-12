import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let cachedKey: Buffer | null = null;
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getEncryptionKey(): Promise<Buffer> {
    if (cachedKey) return cachedKey;

    const kms = new KMSClient({ region: env.AWS_REGION });
    let lastError: Error | null = null;

    // CRITICAL FIX: Add exponential backoff retry logic
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const result = await kms.send(
                new DecryptCommand({
                    CiphertextBlob: Buffer.from(env.ENCRYPTION_KEY_CIPHERTEXT, "base64"),
                })
            );

            if (!result.Plaintext) {
                throw new Error("FATAL: KMS decrypt returned no plaintext");
            }

            cachedKey = Buffer.from(result.Plaintext);
            logger.info('Encryption key successfully decrypted from KMS');
            return cachedKey;
        } catch (error) {
            lastError = error as Error;
            logger.warn(`Encryption key fetch failed (attempt ${attempt + 1}/${MAX_RETRIES})`, {
                error: (error as Error).message,
                attempt: attempt + 1
            });

            // Exponential backoff: 1s, 2s, 4s
            if (attempt < MAX_RETRIES - 1) {
                const backoffMs = INITIAL_DELAY * Math.pow(2, attempt);
                await delay(backoffMs);
            }
        }
    }

    // All retries exhausted
    logger.error('FATAL: Failed to fetch encryption key after retries', lastError || new Error('Unknown error'));
    throw new Error("FATAL: Unable to decrypt encryption key from KMS after " + MAX_RETRIES + " attempts. Service unavailable.");
}
