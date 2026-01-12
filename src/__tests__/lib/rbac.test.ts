import { describe, it, expect } from '@jest/globals';
import { hasPermission, requirePermission, getRoleDescription } from '@/lib/rbac';
import { Role } from '@prisma/client';

describe('RBAC Module', () => {
  describe('hasPermission', () => {
    it('should grant USER basic permissions', () => {
      expect(hasPermission('USER' as Role, 'chat:create')).toBe(true);
      expect(hasPermission('USER' as Role, 'chat:read')).toBe(true);
      expect(hasPermission('USER' as Role, 'chat:delete')).toBe(true);
    });

    it('should deny USER admin permissions', () => {
      expect(hasPermission('USER' as Role, 'user:ban')).toBe(false);
      expect(hasPermission('USER' as Role, 'settings:manage')).toBe(false);
      expect(hasPermission('USER' as Role, 'system:configure')).toBe(false);
    });

    it('should grant ADMIN most permissions', () => {
      expect(hasPermission('ADMIN' as Role, 'chat:create')).toBe(true);
      expect(hasPermission('ADMIN' as Role, 'user:ban')).toBe(true);
      expect(hasPermission('ADMIN' as Role, 'settings:manage')).toBe(true);
    });

    it('should deny ADMIN system config', () => {
      expect(hasPermission('ADMIN' as Role, 'system:configure')).toBe(false);
      expect(hasPermission('ADMIN' as Role, 'security:manage')).toBe(false);
    });

    it('should grant SUPER_ADMIN all permissions', () => {
      const permissions = [
        'chat:create', 'chat:read', 'chat:delete',
        'user:read', 'user:ban', 'user:promote',
        'model:configure', 'settings:manage', 'logs:read',
        'system:configure', 'security:manage', 'analytics:view'
      ];

      permissions.forEach(permission => {
        expect(hasPermission('SUPER_ADMIN' as Role, permission as any)).toBe(true);
      });
    });

    it('should grant MODERATOR moderation permissions', () => {
      expect(hasPermission('MODERATOR' as Role, 'user:ban')).toBe(true);
      expect(hasPermission('MODERATOR' as Role, 'content:moderate')).toBe(true);
      expect(hasPermission('MODERATOR' as Role, 'logs:read')).toBe(true);
    });

    it('should deny MODERATOR admin permissions', () => {
      expect(hasPermission('MODERATOR' as Role, 'user:promote')).toBe(false);
      expect(hasPermission('MODERATOR' as Role, 'settings:manage')).toBe(false);
    });

    it('should grant ANALYST read-only permissions', () => {
      expect(hasPermission('ANALYST' as Role, 'chat:read')).toBe(true);
      expect(hasPermission('ANALYST' as Role, 'analytics:view')).toBe(true);
      expect(hasPermission('ANALYST' as Role, 'logs:read')).toBe(true);
    });

    it('should deny ANALYST write permissions', () => {
      expect(hasPermission('ANALYST' as Role, 'chat:create')).toBe(false);
      expect(hasPermission('ANALYST' as Role, 'user:ban')).toBe(false);
    });

    it('should handle invalid permissions', () => {
      expect(hasPermission('USER' as Role, 'invalid:permission' as any)).toBe(false);
    });
  });

  describe('requirePermission', () => {
    it('should not throw when permission exists', () => {
      expect(() => requirePermission('ADMIN' as Role, 'user:ban')).not.toThrow();
    });

    it('should throw when permission missing', () => {
      expect(() => requirePermission('USER' as Role, 'user:ban')).toThrow('Access Denied');
    });

    it('should include permission in error message', () => {
      try {
        requirePermission('USER' as Role, 'system:configure');
        fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('system:configure');
      }
    });
  });

  describe('getRoleDescription', () => {
    it('should return description for USER', () => {
      const desc = getRoleDescription('USER' as Role);
      expect(desc).toContain('user');
      expect(desc).toBeTruthy();
    });

    it('should return description for each role', () => {
      const roles: Role[] = ['USER', 'MODERATOR', 'ANALYST', 'ADMIN', 'SUPER_ADMIN'];
      
      roles.forEach(role => {
        const desc = getRoleDescription(role);
        expect(desc).toBeTruthy();
        expect(desc.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Role Hierarchy', () => {
    it('should enforce hierarchy: SUPER_ADMIN > ADMIN > MODERATOR > ANALYST > USER', () => {
      // SUPER_ADMIN has all permissions that lower roles have
      expect(hasPermission('SUPER_ADMIN' as Role, 'chat:create')).toBe(true);
      
      // ADMIN has permissions lower roles have
      expect(hasPermission('ADMIN' as Role, 'chat:create')).toBe(true);
      
      // MODERATOR doesn't have all ADMIN permissions
      expect(hasPermission('MODERATOR' as Role, 'user:promote')).toBe(false);
      expect(hasPermission('MODERATOR' as Role, 'chat:create')).toBe(false);
    });
  });

  describe('Permission Matrix', () => {
    const permissionMatrix = {
      'chat:create': ['USER', 'ADMIN', 'SUPER_ADMIN'],
      'user:ban': ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
      'system:configure': ['SUPER_ADMIN'],
      'analytics:view': ['ANALYST', 'ADMIN', 'SUPER_ADMIN'],
    };

    it('should match expected permission matrix', () => {
      Object.entries(permissionMatrix).forEach(([permission, roles]) => {
        const allRoles: Role[] = ['USER', 'MODERATOR', 'ANALYST', 'ADMIN', 'SUPER_ADMIN'];
        
        allRoles.forEach(role => {
          const shouldHave = roles.includes(role);
          const hasIt = hasPermission(role, permission as any);
          expect(hasIt).toBe(shouldHave);
        });
      });
    });
  });
});
