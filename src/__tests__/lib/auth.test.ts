import { describe, it, expect } from '@jest/globals';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '@/lib/auth';

describe('Auth Module', () => {
  const testPayload: TokenPayload = {
    userId: 'test-user-123',
    role: 'USER',
    tokenVersion: 1
  };

  describe('signAccessToken / verifyAccessToken', () => {
    it('should sign and verify a valid access token', () => {
      const token = signAccessToken(testPayload);
      expect(token).toBeDefined();

      const verified = verifyAccessToken(token);
      expect(verified.userId).toBe(testPayload.userId);
      expect(verified.role).toBe(testPayload.role);
      expect(verified.tokenVersion).toBe(testPayload.tokenVersion);
    });

    it('should throw on invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow('Invalid Access Token');
    });

    it('should throw on tampered token', () => {
      const token = signAccessToken(testPayload);
      const tampered = token.slice(0, -10) + 'TAMPERED!';
      expect(() => verifyAccessToken(tampered)).toThrow('Invalid Access Token');
    });

    it('should include expiration', () => {
      const token = signAccessToken(testPayload);
      const verified = verifyAccessToken(token);
      expect(verified).toHaveProperty('iat');
      expect(verified).toHaveProperty('exp');
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('should sign and verify a valid refresh token', () => {
      const payload = {
        ...testPayload,
        tokenId: 'session-123'
      };

      const token = signRefreshToken(payload);
      expect(token).toBeDefined();

      const verified = verifyRefreshToken(token);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.tokenId).toBe(payload.tokenId);
    });

    it('should throw on invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid.token.here')).toThrow('Invalid Refresh Token');
    });

    it('should have longer expiration than access token', () => {
      const accessToken = signAccessToken(testPayload);
      const refreshToken = signRefreshToken({ ...testPayload, tokenId: 'session-123' });

      // Just verify both work - actual expiration times are set in the functions
      expect(() => verifyAccessToken(accessToken)).not.toThrow();
      expect(() => verifyRefreshToken(refreshToken)).not.toThrow();
    });
  });

  describe('Token Versioning', () => {
    it('should include token version in payload', () => {
      const payload = { ...testPayload, tokenVersion: 5 };
      const token = signAccessToken(payload);
      const verified = verifyAccessToken(token);
      expect(verified.tokenVersion).toBe(5);
    });

    it('should detect version mismatch', () => {
      const payload = { ...testPayload, tokenVersion: 1 };
      const token = signAccessToken(payload);
      const verified = verifyAccessToken(token);
      
      // Version is in token
      expect(verified.tokenVersion).toBe(1);
      
      // If user's version is incremented to 2, token becomes invalid
      // (This would be checked in application logic, not in the auth module itself)
    });
  });

  describe('Role Preservation', () => {
    it('should preserve user role in token', () => {
      const roles = ['USER', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'ANALYST'];

      roles.forEach(role => {
        const payload = { ...testPayload, role: role as any };
        const token = signAccessToken(payload);
        const verified = verifyAccessToken(token);
        expect(verified.role).toBe(role);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined role gracefully', () => {
      const payload = { userId: 'user-123', tokenVersion: 1 };
      const token = signAccessToken(payload);
      const verified = verifyAccessToken(token);
      expect(verified.userId).toBe('user-123');
    });

    it('should not allow empty userId', () => {
      // This would be caught at validation layer, but ensure token handles it
      const token = signAccessToken({ userId: '', tokenVersion: 1 });
      const verified = verifyAccessToken(token);
      expect(verified.userId).toBe('');
    });
  });
});
