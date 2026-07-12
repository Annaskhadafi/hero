import { and, eq, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  employees,
  navbarMenuItems,
  roleMenuPermissions,
  securityRoles,
} from '@/db/schema/hero'
import {
  getAppUrl,
  getTemplateRecipientScopeEmails,
  sendWorkflowEmail,
} from '@/lib/workflow-email'

export const LMS_SECTION_MANAGEMENT_RESOURCE = 'chitralearning_lms_management'
export const LMS_ENROLLMENT_REQUEST_TEMPLATE = 'chitralearning_enrollment_request'

export async function getSectionTrainerCenterEmails() {
  const [roleRecipients, configuredRecipients] = await Promise.all([
    db
      .selectDistinct({ email: employees.email })
      .from(employees)
      .innerJoin(securityRoles, eq(employees.accessRole, securityRoles.name))
      .innerJoin(roleMenuPermissions, eq(roleMenuPermissions.roleId, securityRoles.id))
      .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
      .where(
        and(
          eq(employees.isActive, true),
          sql`${employees.email} <> ''`,
          eq(navbarMenuItems.resource, LMS_SECTION_MANAGEMENT_RESOURCE),
          or(eq(roleMenuPermissions.canView, true), eq(roleMenuPermissions.canEdit, true))
        )
      ),
    getTemplateRecipientScopeEmails(LMS_ENROLLMENT_REQUEST_TEMPLATE),
  ])

  return Array.from(
    new Set([...roleRecipients.map((row) => row.email), ...configuredRecipients].map((email) => email.trim().toLowerCase()).filter(Boolean))
  )
}

export async function sendLmsEnrollmentRequestNotification(input: {
  employeeName: string
  employeeSn: string
  employeeSection: string
  courseTitle: string
  actorEmail?: string | null
}) {
  const recipients = await getSectionTrainerCenterEmails()
  if (recipients.length === 0) {
    return { status: 'skipped' as const, reason: 'Recipient Section Trainer Center kosong.' }
  }

  const approvalUrl = getAppUrl('/dashboard/chitralearning-lms/management')
  return sendWorkflowEmail({
    to: recipients,
    actorEmail: input.actorEmail,
    templateCode: LMS_ENROLLMENT_REQUEST_TEMPLATE,
    templateName: 'ChitraLearning Enrollment Request',
    variables: { ...input, approvalUrl },
    fallbackSubject: `Request enrollment: ${input.employeeName} - ${input.courseTitle}`,
    fallbackText: `${input.employeeName} (${input.employeeSn}) dari section ${input.employeeSection} meminta enrollment ke course ${input.courseTitle}. Review: ${approvalUrl}`,
  })
}
