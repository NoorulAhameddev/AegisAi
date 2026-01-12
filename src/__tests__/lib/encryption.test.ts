import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { encrypt, decrypt, isEncrypted, needsKeyRotation, rotateKey } from '@/lib/encryption';

describe('Encryption Module', () => {
  const testMessage = 'This is a sensitive message';
  let encryptedMessage: string;

  describe('encrypt', () => {
    it('should encrypt a message', () => {
      encryptedMessage = encrypt(testMessage);
      expect(encryptedMessage).toBeDefined();
      expect(encryptedMessage).not.toBe(testMessage);
    });

    it('should throw on empty string', () => {
      expect(() => encrypt('')).toThrow('Cannot encrypt empty string');
    });

    it('should include version in encrypted output', () => {
      const encrypted = encrypt(testMessage);
      expect(encrypted).toMatch(/^v\d+:/);
    });

    it('should produce different output for same input (due to random IV)', () => {
      const enc1 = encrypt(testMessage);
      const enc2 = encrypt(testMessage);
      expect(enc1).not.toBe(enc2);
    });
  });

  describe('decrypt', () => {
    beforeEach(() => {
      encryptedMessage = encrypt(testMessage);
    });

    it('should decrypt an encrypted message', () => {
      const decrypted = decrypt(encryptedMessage);
      expect(decrypted).toBe(testMessage);
    });

    it('should throw on invalid format', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted format');
    });

    it('should throw on corrupted data', () => {
      const parts = encryptedMessage.split(':');
      const corrupted = [parts[0], parts[1], parts[2], 'corrupted'].join(':');
      expect(() => decrypt(corrupted)).toThrow();
    });

    it('should handle both old and new formats', () => {
      // New format: v1:iv:authTag:encrypted
      const newFormat = encrypt(testMessage);
      expect(decrypt(newFormat)).toBe(testMessage);

      // Old format would be: iv:authTag:encrypted
      // (We can't easily test this without modifying the encrypt function)
    });
  });

  describe('isEncrypted', () => {
    it('should identify encrypted strings', () => {
      const encrypted = encrypt(testMessage);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should reject plain text', () => {
      expect(isEncrypted(testMessage)).toBe(false);
    });

    it('should handle old format', () => {
      // Old format: 32-hex:32-hex:variable-hex
      const oldFormat = 'a'.repeat(32) + ':' + 'b'.repeat(32) + ':' + 'c'.repeat(32);
      expect(isEncrypted(oldFormat)).toBe(true);
    });
  });

  describe('needsKeyRotation', () => {
    it('should detect if key rotation is needed', () => {
      const encrypted = encrypt(testMessage);
      // Current version is v1, so should not need rotation
      expect(needsKeyRotation(encrypted)).toBe(false);
    });

    it('should return false for non-encrypted strings', () => {
      expect(needsKeyRotation(testMessage)).toBe(false);
    });
  });

  describe('rotateKey', () => {
    it('should rotate encrypted data to new key', () => {
      const original = encrypt(testMessage);
      const rotated = rotateKey(original);
      expect(rotated).not.toBe(original);
      expect(decrypt(rotated)).toBe(testMessage);
    });

    it('should throw on invalid input', () => {
      expect(() => rotateKey('invalid')).toThrow();
    });
  });
});
