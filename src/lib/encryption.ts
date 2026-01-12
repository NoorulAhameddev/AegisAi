import crypto from 'crypto';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const CURRENT_KEY_VERSION = 'v1';

// STRICT: Fail if encryption key is not set
if (!process.env.ENCRYPTION_KEY) {
    throw new Error('FATAL: ENCRYPTION_KEY environment variable is required');
}

if (process.env.ENCRYPTION_KEY.length !== 32) {
    throw new Error('FATAL: ENCRYPTION_KEY must be exactly 32 characters');
}

const SECRET_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8');

// Support for key rotation - can add new keys as needed
const KEY_VERSIONS: Record<string, Buffer> = {
    'v1': SECRET_KEY,
    // 'v2': Buffer.from(process.env.ENCRYPTION_KEY_V2 || '', 'utf-8'), // Add future keys here
};

export function encrypt(text: string): string {
    if (!text) throw new Error('Cannot encrypt empty string');

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: version:iv:authTag:encrypted
    // Version allows us to decrypt old messages even if key changes
    return `${CURRENT_KEY_VERSION}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string {
    if (!text) throw new Error('Cannot decrypt empty string');

    const parts = text.split(':');
    
    // Support both old format (3 parts: iv:authTag:encrypted) and new format (4 parts: version:iv:authTag:encrypted)
    let version = CURRENT_KEY_VERSION;
    let ivHex: string;
    let authTagHex: string;
    let encryptedHex: string;

    if (parts.length === 4) {
        // New format with version
        [version, ivHex, authTagHex, encryptedHex] = parts;
    } else if (parts.length === 3) {
        // Old format without version (assume v1)
        [ivHex, authTagHex, encryptedHex] = parts;
        version = 'v1';
    } else {
        throw new Error('Invalid encrypted format - expected 3 or 4 parts separated by colons');
    }

    try {
        const key = KEY_VERSIONS[version];
        if (!key) {
            throw new Error(`Unknown key version: ${version}`);
        }

        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            key,
            Buffer.from(ivHex, 'hex')
        );
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            logger.debug('[Encryption] Decryption failed', { 
                error: (error as Error).message,
                version 
            });
        }
        throw new Error('Decryption failed - data may be corrupted or key is incorrect');
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
export function rotateKey(encryptedText: string): string {
    try {
        const plaintext = decrypt(encryptedText);
        return encrypt(plaintext);
    } catch (error) {
        logger.error('[Encryption] Key rotation failed', error as Error);
        throw error;
    }
}
