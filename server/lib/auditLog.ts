import prisma from './prisma';
import { AuditAction, Prisma } from '@prisma/client';

interface AuditLogParams {
    userId?: string | null;
    action: AuditAction;
    ipAddress?: string | null;
    userAgent?: string | null;
    details?: Record<string, unknown>;
}

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId ?? null,
                action: params.action,
                ipAddress: params.ipAddress ?? null,
                userAgent: params.userAgent ?? null,
                details: (params.details as Prisma.InputJsonValue) ?? undefined,
            },
        });
    } catch (error) {
        // Audit log 寫入失敗不應阻斷主要流程
        console.error('[AuditLog] Failed to write:', error);
    }
}
