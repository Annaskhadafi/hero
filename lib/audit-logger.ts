import { db } from "@/db";
import { auditLogs, employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.banned"
  | "user.unbanned"
  | "user.role_changed"
  | "user.password_reset"
  | "user.email_changed"
  | "user.bulk_imported"
  | "user.invited"
  | "user.bulk_activated"
  | "user.bulk_deactivated"
  | "user.bulk_deleted"
  | "user.bulk_banned"
  | "user.bulk_unbanned"
  | "timesheet.config_saved"
  | "timesheet.schedule_saved"
  | "timesheet.field_break_saved"
  | "timesheet.attendance_saved"
  | "timesheet.import_previewed"
  | "timesheet.import_applied"
  | "timesheet.import_discarded"
  | "timesheet.period_finalized"
  | "timesheet.period_reopened";

export type AuditSeverity = "info" | "warning" | "critical";

export async function logAuditEvent(params: {
  actorEmail?: string;
  action: AuditAction;
  entityType: string;
  entityLabel: string;
  description: string;
  severity?: AuditSeverity;
}) {
  try {
    let actorEmployeeId: number | null = null;

    if (params.actorEmail) {
      const [actor] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.email, params.actorEmail.toLowerCase().trim()))
        .limit(1);

      actorEmployeeId = actor?.id ?? null;
    }

    await db.insert(auditLogs).values({
      actorEmployeeId,
      action: params.action,
      entityType: params.entityType,
      entityLabel: params.entityLabel,
      description: params.description,
      severity: params.severity ?? "info",
    });
  } catch (error) {
    console.error("[audit-logger] Failed to log audit event:", error);
  }
}

export async function getAuditLogsForEntity(params: {
  entityType: string;
  entityLabel: string;
  limit?: number;
}) {
  return db
    .select({
      id: auditLogs.id,
      actorEmployeeId: auditLogs.actorEmployeeId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityLabel: auditLogs.entityLabel,
      description: auditLogs.description,
      severity: auditLogs.severity,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      eq(auditLogs.entityType, params.entityType),
    )
    .orderBy(auditLogs.createdAt)
    .limit(params.limit ?? 100);
}
