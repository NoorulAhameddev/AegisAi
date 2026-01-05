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
    | "logs:read";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    USER: [
        "chat:create",
        "chat:read",
        "chat:delete"
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
        "logs:read"
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
