import { Role } from "@prisma/client";

export type Permission =
    | "chat:create"
    | "chat:read"
    | "chat:delete"
    | "user:read"
    | "user:ban"
    | "user:promote"
    | "model:configure"
    | "settings:manage"
    | "logs:read"
    | "system:configure"
    | "security:manage"
    | "analytics:view"
    | "content:moderate";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    USER: [
        "chat:create",
        "chat:read",
        "chat:delete"
    ],
    MODERATOR: [
        "chat:read",
        "user:read",
        "user:ban",
        "logs:read",
        "content:moderate"
    ],
    ANALYST: [
        "chat:read",
        "user:read",
        "logs:read",
        "analytics:view"
    ],
    ADMIN: [
        "chat:create",
        "chat:read",
        "chat:delete",
        "user:read",
        "user:ban",
        "user:promote",
        "model:configure",
        "settings:manage",
        "logs:read",
        "analytics:view",
        "content:moderate"
    ],
    SUPER_ADMIN: [
        // All permissions
        "chat:create",
        "chat:read",
        "chat:delete",
        "user:read",
        "user:ban",
        "user:promote",
        "model:configure",
        "settings:manage",
        "logs:read",
        "system:configure",
        "security:manage",
        "analytics:view",
        "content:moderate"
    ]
};

export function hasPermission(role: Role, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions?.includes(permission) || false;
}

export function requirePermission(role: Role, permission: Permission) {
    if (!hasPermission(role, permission)) {
        throw new Error(`Access Denied: Missing permission ${permission}`);
    }
}

export function getRoleDescription(role: Role): string {
    const descriptions: Record<Role, string> = {
        USER: "Regular user with basic chat access",
        MODERATOR: "Can moderate content and ban users",
        ANALYST: "Can view analytics and user data",
        ADMIN: "Full administrative access except system config",
        SUPER_ADMIN: "Complete system access"
    };
    return descriptions[role] || "Unknown role";
}
