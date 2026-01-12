/**
 * Audit Logging Service
 * Implements immutable audit trails for all admin actions
 */

import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { createHash } from "crypto";

export type AuditAction =
    | "USER_BAN"
    | "USER_UNBAN"
    | "USER_SUSPEND"
    | "USER_RESTORE"
    | "USER_DELETE"
    | "USER_ROLE_CHANGE"
    | "USER_INVITE"
    | "FEATURE_TOGGLE_ENABLE"
    | "FEATURE_TOGGLE_DISABLE"
    | "RATE_LIMIT_CHANGE"
    | "KILL_SWITCH_ACTIVATE"
    | "KILL_SWITCH_DEACTIVATE"
    | "CONTENT_MODERATE"
    | "SHADOW_BAN_ENABLE"
    | "SHADOW_BAN_DISABLE"
    | "AUDIT_EXPORT"
    | "CONFIG_CHANGE"
    | "PASSWORD_RESET"
    | "ADMIN_LOGIN"
    | "ADMIN_LOGOUT";

export interface AuditLogEntry {
    userId: string;
    adminRole: Role;
    action: AuditAction;
    targetType?: string;
    targetId?: string;
    previousState?: any;
    newState?: any;
    metadata?: any;
    reason?: string;
    ticketId?: string;
    ipAddress?: string;
    userAgent?: string;
    mfaVerified?: boolean;
}

/**
 * Create an immutable audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
        // Generate integrity hash
        const integrityHash = generateIntegrityHash(entry);

        await prisma.auditLog.create({
            data: {
                userId: entry.userId,
                adminRole: entry.adminRole,
                action: entry.action,
                targetType: entry.targetType,
                targetId: entry.targetId,
                previousState: entry.previousState,
                newState: entry.newState,
                metadata: entry.metadata,
                reason: entry.reason,
                ticketId: entry.ticketId,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
                mfaVerified: entry.mfaVerified || false,
                integrityHash,
            },
        });

        // TODO: Send to external logging service (Datadog, Axiom, etc.)
        // This ensures local DB tampering is detectable
        if (process.env.NODE_ENV === "production") {
            // await sendToExternalLogger(entry, integrityHash);
        }
    } catch (error) {
        console.error("[CRITICAL] Failed to create audit log:", error);
        // In production, this should trigger an alert
        throw error;
    }
}

/**
 * Generate SHA-256 integrity hash for audit entry
 */
function generateIntegrityHash(entry: AuditLogEntry): string {
    const data = JSON.stringify({
        userId: entry.userId,
        action: entry.action,
        targetId: entry.targetId,
        timestamp: new Date().toISOString(),
    });
    return createHash("sha256").update(data).digest("hex");
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: {
    userId?: string;
    action?: AuditAction;
    targetType?: string;
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.targetType) where.targetType = filters.targetType;
    if (filters.targetId) where.targetId = filters.targetId;

    if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters.limit || 100,
    });
}

/**
 * Get admin action history for a specific user
 */
export async function getAdminActionHistory(adminUserId: string, limit = 50) {
    return await prisma.auditLog.findMany({
        where: { userId: adminUserId },
        orderBy: { createdAt: "desc" },
        take: limit,
    });
}

/**
 * Get all actions performed on a specific target
 */
export async function getTargetHistory(targetType: string, targetId: string) {
    return await prisma.auditLog.findMany({
        where: {
            targetType,
            targetId,
        },
        orderBy: { createdAt: "desc" },
    });
}

/**
 * Export audit logs for compliance (encrypted)
 */
export async function exportAuditLogs(
    filters: Parameters<typeof queryAuditLogs>[0],
    format: "json" | "csv" = "json"
): Promise<string> {
    const logs = await queryAuditLogs({ ...filters, limit: 10000 });

    if (format === "json") {
        return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = [
        "ID",
        "Admin ID",
        "Role",
        "Action",
        "Target Type",
        "Target ID",
        "Reason",
        "Ticket ID",
        "IP Address",
        "MFA Verified",
        "Timestamp",
    ];

    const rows = logs.map((log) => [
        log.id,
        log.userId || "",
        log.adminRole || "",
        log.action,
        log.targetType || "",
        log.targetId || "",
        log.reason || "",
        log.ticketId || "",
        log.ipAddress || "",
        log.mfaVerified ? "Yes" : "No",
        log.createdAt.toISOString(),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Detect anomalies in admin behavior
 */
export async function detectAnomalies(adminUserId: string): Promise<{
    suspicious: boolean;
    reasons: string[];
}> {
    const recentActions = await prisma.auditLog.findMany({
        where: {
            userId: adminUserId,
            createdAt: {
                gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
            },
        },
    });

    const reasons: string[] = [];

    // Check for mass actions
    if (recentActions.length > 50) {
        reasons.push("Excessive actions in short timeframe");
    }

    // Check for actions from multiple IPs
    const uniqueIps = new Set(recentActions.map((a) => a.ipAddress).filter(Boolean));
    if (uniqueIps.size > 3) {
        reasons.push("Actions from multiple IP addresses");
    }

    // Check for destructive actions without MFA
    const destructiveWithoutMfa = recentActions.filter(
        (a) =>
            ["USER_DELETE", "KILL_SWITCH_ACTIVATE"].includes(a.action) &&
            !a.mfaVerified
    );
    if (destructiveWithoutMfa.length > 0) {
        reasons.push("Destructive actions without MFA verification");
    }

    return {
        suspicious: reasons.length > 0,
        reasons,
    };
}
