jest.mock("@/lib/secrets");

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  encrypt,
  decrypt,
  isEncrypted,
  needsKeyRotation,
  rotateKey,
} from "@/lib/encryption";
import * as secretsModule from "@/lib/secrets";

// Setup mock implementations
const mockGetEncryptionKey =
  secretsModule.getEncryptionKey as jest.MockedFunction<
    typeof secretsModule.getEncryptionKey
  >;

describe("Encryption Module", () => {
  const testMessage = "This is a sensitive message";
  let encryptedMessage: string;

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mock for each test - getEncryptionKey returns Buffer directly
    mockGetEncryptionKey.mockResolvedValue(Buffer.from("a".repeat(32))); // 32 byte key for AES-256
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("encrypt", () => {
    it("should encrypt a message", async () => {
      encryptedMessage = await encrypt(testMessage);
      expect(encryptedMessage).toBeDefined();
      expect(encryptedMessage).not.toBe(testMessage);
    });

    it("should throw on empty string", async () => {
      await expect(encrypt("")).rejects.toThrow("Cannot encrypt empty string");
    });

    it("should include version in encrypted output", async () => {
      const encrypted = await encrypt(testMessage);
      expect(encrypted).toMatch(/^v\d+:/);
    });

    it("should produce different output for same input (due to random IV)", async () => {
      const enc1 = await encrypt(testMessage);
      const enc2 = await encrypt(testMessage);
      expect(enc1).not.toBe(enc2);
    });
  });

  describe("decrypt", () => {
    beforeEach(async () => {
      encryptedMessage = await encrypt(testMessage);
    });

    it("should decrypt an encrypted message", async () => {
      const decrypted = await decrypt(encryptedMessage);
      expect(decrypted).toBe(testMessage);
    });

    it("should throw on invalid format", async () => {
      await expect(decrypt("invalid")).rejects.toThrow(
        "Invalid encrypted format",
      );
    });

    it("should throw on corrupted data", async () => {
      const parts = encryptedMessage.split(":");
      const corrupted = [parts[0], parts[1], parts[2], "corrupted"].join(":");
      await expect(decrypt(corrupted)).rejects.toThrow();
    });

    it("should handle both old and new formats", async () => {
      const newFormat = await encrypt(testMessage);
      expect(await decrypt(newFormat)).toBe(testMessage);
    });
  });

  describe("isEncrypted", () => {
    it("should identify encrypted strings", async () => {
      const encrypted = await encrypt(testMessage);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should reject plain text", () => {
      expect(isEncrypted(testMessage)).toBe(false);
    });

    it("should handle old format", () => {
      // Old format: 32-hex:32-hex:variable-hex
      const oldFormat =
        "a".repeat(32) + ":" + "b".repeat(32) + ":" + "c".repeat(32);
      expect(isEncrypted(oldFormat)).toBe(true);
    });
  });

  describe("needsKeyRotation", () => {
    it("should detect if key rotation is needed", async () => {
      const encrypted = await encrypt(testMessage);
      expect(needsKeyRotation(encrypted)).toBe(false);
    });

    it("should return false for non-encrypted strings", () => {
      expect(needsKeyRotation(testMessage)).toBe(false);
    });
  });

  describe("rotateKey", () => {
    it("should rotate encrypted data to new key", async () => {
      const original = await encrypt(testMessage);
      const rotated = await rotateKey(original);
      expect(rotated).not.toBe(original);
      expect(await decrypt(rotated)).toBe(testMessage);
    });

    it("should throw on invalid input", async () => {
      await expect(rotateKey("invalid")).rejects.toThrow();
    });
  });
});
