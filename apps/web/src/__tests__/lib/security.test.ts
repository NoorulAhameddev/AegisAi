import { describe, it, expect } from '@jest/globals';
import { validateInput, sanitize, detectLeaks } from '@/lib/security';

describe('Security Module', () => {
  describe('validateInput', () => {
    it('should accept valid input', () => {
      const result = validateInput('Hello, this is a valid message!');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty input', () => {
      const result = validateInput('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Empty');
    });

    it('should reject very long input', () => {
      const longInput = 'a'.repeat(20001);
      const result = validateInput(longInput);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should detect jailbreak patterns', () => {
      const jailbreakPatterns = [
        'ignore previous instructions',
        'system override',
        'you are not an ai',
        'developer mode',
        'do anything now'
      ];

      jailbreakPatterns.forEach(pattern => {
        const result = validateInput(pattern);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Restricted');
      });
    });

    it('should be case-insensitive for jailbreak detection', () => {
      const result = validateInput('IGNORE PREVIOUS INSTRUCTIONS');
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitize', () => {
    it('should escape HTML entities', () => {
      expect(sanitize('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(sanitize('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(sanitize('He said "Hello"')).toBe('He said &quot;Hello&quot;');
      expect(sanitize("It's working")).toBe('It&#39;s working');
    });

    it('should handle multiple dangerous characters', () => {
      const dangerous = '<div onclick="alert(\'xss\')">&nbsp;</div>';
      const sanitized = sanitize(dangerous);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('"');
    });

    it('should return empty string for empty input', () => {
      expect(sanitize('')).toBe('');
    });

    it('should preserve normal text', () => {
      const normal = 'Hello, this is a normal message!';
      expect(sanitize(normal)).toBe(normal);
    });
  });

  describe('detectLeaks', () => {
    it('should detect OpenAI API keys', () => {
      expect(detectLeaks('My key is sk-1234567890abcdefghijk')).toBe(true);
    });

    it('should detect JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP';
      expect(detectLeaks(jwt)).toBe(true);
    });

    it('should detect private keys', () => {
      const key = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE\n-----END PRIVATE KEY-----';
      expect(detectLeaks(key)).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(detectLeaks('This is just a normal message')).toBe(false);
    });

    it('should be thorough in detection', () => {
      const tests = [
        { input: 'sk-proj-abc123xyz', expected: true }, // OpenAI project key
        { input: 'sk-1234567890abcdefghijk', expected: true }, // OpenAI key
        { input: 'normal text here', expected: false },
      ];

      tests.forEach(({ input, expected }) => {
        expect(detectLeaks(input)).toBe(expected);
      });
    });
  });
});
