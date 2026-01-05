import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_must_be_32_bytes_long!!';

// Ensure key is 32 bytes
const getKey = () => {
    // If not 32 bytes, pad or slice
    if (SECRET_KEY.length === 32) return SECRET_KEY;
    return crypto.createHash('sha256').update(SECRET_KEY).digest();
};

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string {
    const [ivHex, authTagHex, encryptedHex] = text.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) throw new Error('Invalid encrypted format');

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
