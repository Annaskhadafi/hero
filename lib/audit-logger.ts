import { db } from '@/db'
import { auditLogs, employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.banned'
  | 'user.unbanned'
  | 'user.role_changed'
  | 'user.password_reset'
  | 'user.email_changed'
  | 'user.bulk_imported'
  | 'user.invited'
  | 'user.bulk_updated'
  | 'user.bulk_activated'
  | 'user.bulk_deactivated'
  | 'user.bulk_deleted'
  | 'user.bulk_banned'
  | 'user.bulk_unbanned'
  | 'user.bulk_auth_provisioned'
  | 'user.invitation_resent'
  | 'checklist_template.created'
  | 'checklist_template.updated'
  | 'checklist_template.deleted'
  | 'checklist.created'
  | 'checklist.updated'
  | 'checklist.deleted'
  | 'checklist.completed'
  | 'checklist.viewed'
  | 'checklist.pdf_downloaded'
  | 'checklist.printed'
  | 'timesheet.config_saved'
  | 'timesheet.schedule_saved'
  | 'timesheet.schedule_deleted'
  | 'timesheet.schedule_v2_created'
  | 'timesheet.schedule_v2_opened'
  | 'timesheet.schedule_v2_draft_saved'
  | 'timesheet.schedule_v2_activated'
  | 'timesheet.schedule_v2_deleted'
  | 'timesheet.field_break_saved'
  | 'timesheet.payroll_snapshot_saved'
  | 'timesheet.attendance_saved'
  | 'timesheet.attendance_cleared'
  | 'timesheet.import_previewed'
  | 'timesheet.import_applied'
  | 'timesheet.import_discarded'
  | 'timesheet.period_finalized'
  | 'timesheet.period_reopened'
  | 'timesheet.period_submitted'
  | 'spl.status_changed'
  | 'daily_activity.submitted'

export type AuditSeverity = 'info' | 'warning' | 'critical'

export async function logAuditEvent(params: {
  actorEmail?: string
  action: AuditAction
  entityType: string
  entityLabel: string
  description: string
  severity?: AuditSeverity
}) {
  try {
    let actorEmployeeId: number | null = null

    if (params.actorEmail) {
      const [actor] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.email, params.actorEmail.toLowerCase().trim()))
        .limit(1)

      actorEmployeeId = actor?.id ?? null
    }

    await db.insert(auditLogs).values({
      actorEmployeeId,
      action: params.action,
      entityType: params.entityType,
      entityLabel: params.entityLabel,
      description: params.description,
      severity: params.severity ?? 'info',
    })
  } catch (error) {
    console.error('[audit-logger] Failed to log audit event:', error)
  }
}

export async function getAuditLogsForEntity(params: {
  entityType: string
  entityLabel: string
  limit?: number
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
    .where(eq(auditLogs.entityType, params.entityType))
    .orderBy(auditLogs.createdAt)
    .limit(params.limit ?? 100)
}
