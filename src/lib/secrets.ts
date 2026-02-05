import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { env } from "@/lib/env";

let cachedKey: Buffer | null = null;

export async function getEncryptionKey(): Promise<Buffer> {
    if (cachedKey) return cachedKey;

    const kms = new KMSClient({ region: env.AWS_REGION });
    const result = await kms.send(
        new DecryptCommand({
            CiphertextBlob: Buffer.from(env.ENCRYPTION_KEY_CIPHERTEXT, "base64"),
        })
    );

    if (!result.Plaintext) {
        throw new Error("FATAL: KMS decrypt returned no plaintext");
    }

    cachedKey = Buffer.from(result.Plaintext);
    return cachedKey;
}
