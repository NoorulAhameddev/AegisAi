import crypto from "crypto";
import { logger } from "./logger";
import { getEncryptionKey } from "./secrets";

const ALGORITHM = "aes-256-gcm";
const CURRENT_KEY_VERSION = "v1";

let cachedKeyVersions: Record<string, Buffer> | null = null;

async function getKeyVersions(): Promise<Record<string, Buffer>> {
    if (cachedKeyVersions) return cachedKeyVersions;

    const v1 = await getEncryptionKey();
    cachedKeyVersions = {
        v1,
        // Future versions can be loaded here (v2, v3...) with separate ciphertext envs
    };

    return cachedKeyVersions;
}

export async function encrypt(text: string): Promise<string> {
    if (!text) throw new Error("Cannot encrypt empty string");

    const keys = await getKeyVersions();
    const key = keys[CURRENT_KEY_VERSION];
    if (!key) throw new Error(`Unknown key version: ${CURRENT_KEY_VERSION}`);

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    return `${CURRENT_KEY_VERSION}:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export async function decrypt(text: string): Promise<string> {
    if (!text) throw new Error("Cannot decrypt empty string");

    const parts = text.split(":");

    let version = CURRENT_KEY_VERSION;
    let ivHex: string;
    let authTagHex: string;
    let encryptedHex: string;

    if (parts.length === 4) {
        [version, ivHex, authTagHex, encryptedHex] = parts;
    } else if (parts.length === 3) {
        [ivHex, authTagHex, encryptedHex] = parts;
        version = "v1";
    } else {
        throw new Error("Invalid encrypted format - expected 3 or 4 parts separated by colons");
    }

    try {
        const keyVersions = await getKeyVersions();
        const key = keyVersions[version];
        if (!key) {
            throw new Error(`Unknown key version: ${version}`);
        }

        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            key,
            Buffer.from(ivHex, "hex")
        );
        decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

        let decrypted = decipher.update(encryptedHex, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (error) {
        logger.debug("[Encryption] Decryption failed", {
            error: (error as Error).message,
            version,
        });
        throw new Error("Decryption failed - data may be corrupted or key is incorrect");
    }
}

// Helper to check if a string is encrypted (supports both formats)
export function isEncrypted(text: string): boolean {
    // Old format: 32-char hex : 32-char hex : variable hex
    // New format: v\d+:32-char hex : 32-char hex : variable hex
    return /^(v\d+:)?[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/.test(text);
}

/**
 * Check if encrypted data needs to be rotated to new key version
 * Returns true if data was encrypted with old key version
 */
export function needsKeyRotation(encryptedText: string): boolean {
    if (!encryptedText || !isEncrypted(encryptedText)) {
        return false;
    }

    const version = encryptedText.split(':')[0];
    return version !== CURRENT_KEY_VERSION;
}

/**
 * Rotate encrypted data from old key version to new key version
 */
export async function rotateKey(encryptedText: string): Promise<string> {
    try {
        const plaintext = await decrypt(encryptedText);
        return encrypt(plaintext);
    } catch (error) {
        logger.error("[Encryption] Key rotation failed", error as Error);
        throw error;
    }
}
