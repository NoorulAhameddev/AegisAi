/**
 * Admin Permissions & Governance System
 * Implements the 4-tier RBAC model from ADMIN_GUIDE.md
 */

import { Role } from "@prisma/client";

export type AdminPermission =
    // Identity Management
    | "IDENTITY_INVITE"
    | "IDENTITY_SUSPEND"
    | "IDENTITY_BAN"
    | "IDENTITY_RESTORE"
    | "IDENTITY_DELETE"
    | "IDENTITY_ROLE_CHANGE"
    
    // System Configuration
    | "CONFIG_TOGGLE"
    | "CONFIG_LIMITS"
    | "CONFIG_ENVIRONMENT"
    | "KILL_SWITCH_ACT"
    
    // Moderation
    | "MOD_READ_CONTENT"
    | "MOD_OVERRIDE"
    | "MOD_SHADOW_BAN"
    | "MOD_FLAG_REVIEW"
    
    // Audit & Analytics
    | "AUDIT_VIEW_MAP"
    | "AUDIT_EXPORT"
    | "ANALYTICS_VIEW"
    | "ANALYTICS_EXPORT"
    
    // Support
    | "SUPPORT_RESET_PASSWORD"
    | "SUPPORT_VIEW_PROFILE"
    | "SUPPORT_TICKET_MANAGE";

/**
 * Permission Matrix - Maps roles to their allowed permissions
 * Based on the governance playbook specification
 */
export const ADMIN_PERMISSION_MATRIX: Record<Role, AdminPermission[]> = {
    USER: [],
    ADMIN: [
        // Legacy admin role - full permissions for backward compatibility
        "IDENTITY_SUSPEND",
        "IDENTITY_BAN",
        "IDENTITY_RESTORE",
        "IDENTITY_ROLE_CHANGE",
        "CONFIG_TOGGLE",
        "MOD_READ_CONTENT",
        "MOD_OVERRIDE",
        "AUDIT_VIEW_MAP",
        "ANALYTICS_VIEW",
    ],
    SUPER_ADMIN: [
        // Full system access
        "IDENTITY_INVITE",
        "IDENTITY_SUSPEND",
        "IDENTITY_BAN",
        "IDENTITY_RESTORE",
        "IDENTITY_DELETE",
        "IDENTITY_ROLE_CHANGE",
        "CONFIG_TOGGLE",
        "CONFIG_LIMITS",
        "CONFIG_ENVIRONMENT",
        "KILL_SWITCH_ACT",
        "MOD_READ_CONTENT",
        "MOD_OVERRIDE",
        "MOD_SHADOW_BAN",
        "MOD_FLAG_REVIEW",
        "AUDIT_VIEW_MAP",
        "AUDIT_EXPORT",
        "ANALYTICS_VIEW",
        "ANALYTICS_EXPORT",
        "SUPPORT_RESET_PASSWORD",
        "SUPPORT_VIEW_PROFILE",
        "SUPPORT_TICKET_MANAGE",
    ],
    MODERATOR: [
        // Content governance and user behavior oversight
        "IDENTITY_SUSPEND",
        "IDENTITY_BAN",
        "IDENTITY_RESTORE",
        "MOD_READ_CONTENT",
        "MOD_OVERRIDE",
        "MOD_SHADOW_BAN",
        "MOD_FLAG_REVIEW",
        "AUDIT_VIEW_MAP",
        "ANALYTICS_VIEW",
    ],
    ANALYST: [
        // Read-only analytics and monitoring
        "MOD_READ_CONTENT",
        "AUDIT_VIEW_MAP",
        "AUDIT_EXPORT",
        "ANALYTICS_VIEW",
        "ANALYTICS_EXPORT",
    ],
    SUPPORT: [
        // User account assistance
        "IDENTITY_SUSPEND",
        "SUPPORT_RESET_PASSWORD",
        "SUPPORT_VIEW_PROFILE",
        "SUPPORT_TICKET_MANAGE",
        "AUDIT_VIEW_MAP",
    ],
};

/**
 * Check if a role has a specific permission
 */
export function hasAdminPermission(role: Role, permission: AdminPermission): boolean {
    const permissions = ADMIN_PERMISSION_MATRIX[role];
    return permissions?.includes(permission) || false;
}

/**
 * Require a specific permission or throw an error
 */
export function requireAdminPermission(role: Role, permission: AdminPermission): void {
    if (!hasAdminPermission(role, permission)) {
        throw new Error(`Access Denied: Missing admin permission ${permission}`);
    }
}

/**
 * Check if an action is destructive and requires 4-eyes approval
 */
export function isDestructiveAction(permission: AdminPermission): boolean {
    const destructiveActions: AdminPermission[] = [
        "IDENTITY_DELETE",
        "KILL_SWITCH_ACT",
        "CONFIG_ENVIRONMENT",
    ];
    return destructiveActions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): AdminPermission[] {
    return ADMIN_PERMISSION_MATRIX[role] || [];
}

/**
 * Check if a role can perform admin actions
 */
export function isAdminRole(role: Role): boolean {
    return role !== "USER";
}

/**
 * Get the hierarchy level of a role (higher = more privileged)
 */
export function getRoleLevel(role: Role): number {
    const hierarchy: Record<Role, number> = {
        USER: 0,
        SUPPORT: 1,
        ANALYST: 2,
        MODERATOR: 3,
        ADMIN: 4,
        SUPER_ADMIN: 5,
    };
    return hierarchy[role] || 0;
}

/**
 * Check if one role can modify another role
 * Prevents lower-level admins from modifying higher-level admins
 */
export function canModifyRole(actorRole: Role, targetRole: Role): boolean {
    return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}
