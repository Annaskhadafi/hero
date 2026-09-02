import { db } from '@/db'
import {
  approvalMatrices,
  approvalMatrixSteps,
  approvals,
  emailTemplates,
  employees,
  fiveRApprovalLogs,
  fiveRReports,
  notificationDeliveries,
  notificationEvents,
  orgChartNodes,
  sites,
} from '@/db/schema/hero'
import { fiveRMasterAreas } from '@/db/schema/five-r'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { getAppUrl, sendWorkflowEmail } from '@/lib/workflow-email'

export type FiveRApprovalStep = {
  level: number
  roleLabel: string
  approverEmployeeId: number | null
  approverName: string
  approverEmail: string | null
}

export type FiveRApprovalRoute = {
  steps: FiveRApprovalStep[]
}

/**
 * Resolves 3-Step Approval Route for 5R Report:
 * Step 1: Quality Management Verifier -> Ria Annisa Putri (ID: 1181)
 * Step 2: PJO / Atasan Langsung Site -> Site Head / Direct Manager
 * Step 3: Head of CPI Approval -> Bardinia Susi Ekawaty (ID: 944)
 */
export async function resolveFiveRApprovalRoute(params: {
  auditorId?: number | null
  siteId?: number | null
  areaId?: number | null
  picEmployeeId?: number | null
}): Promise<FiveRApprovalRoute> {
  // 1. Query Dynamic Approval Matrix from Database (configured via Workflow Studio)
  try {
    let areaName = ''
    let effectiveSiteId = params.siteId ?? null

    if (params.areaId) {
      const [area] = await db
        .select({
          name: fiveRMasterAreas.name,
          siteId: fiveRMasterAreas.siteId,
        })
        .from(fiveRMasterAreas)
        .where(eq(fiveRMasterAreas.id, params.areaId))
        .limit(1)

      if (area) {
        areaName = area.name
        if (!effectiveSiteId && area.siteId) {
          effectiveSiteId = area.siteId
        }
      }
    }

    const matrixRows = await db
      .select({
        matrixId: approvalMatrices.id,
        matrixName: approvalMatrices.name,
        matrixDesc: approvalMatrices.description,
        siteId: approvalMatrices.siteId,
        stepId: approvalMatrixSteps.id,
        stepOrder: approvalMatrixSteps.stepOrder,
        stepLabel: approvalMatrixSteps.label,
        nodeEmployeeId: orgChartNodes.employeeId,
        empId: employees.id,
        empName: employees.name,
        empEmail: employees.email,
      })
      .from(approvalMatrices)
      .innerJoin(approvalMatrixSteps, eq(approvalMatrices.id, approvalMatrixSteps.matrixId))
      .leftJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
      .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
      .where(
        and(
          sql`${approvalMatrices.transactionType} IN ('five_r_report', 'five-r-report', 'quality-report-5r')`,
          eq(approvalMatrices.isActive, true)
        )
      )
      .orderBy(
        sql`CASE 
          WHEN ${params.areaId ? sql`${approvalMatrices.description} ILIKE ${'%Area ID: ' + params.areaId + ')'} OR ${approvalMatrices.description} ILIKE ${'%Area ID: ' + params.areaId + ' %'} OR ${approvalMatrices.name} = ${'Laporan Audit 5R - ' + areaName}` : sql`FALSE`} THEN 0
          WHEN ${effectiveSiteId ? sql`${approvalMatrices.siteId} = ${effectiveSiteId}` : sql`FALSE`} THEN 1
          ELSE 2 
        END`,
        approvalMatrixSteps.stepOrder
      )

    // Filter to first matching matrix
    if (matrixRows.length > 0) {
      const targetMatrixId = matrixRows[0].matrixId
      const matchedSteps = matrixRows.filter((r) => r.matrixId === targetMatrixId)

      if (matchedSteps.length >= 1 && matchedSteps.some((s) => s.empId)) {
        const steps: FiveRApprovalStep[] = matchedSteps.map((r, idx) => ({
          level: idx + 1,
          roleLabel: r.stepLabel || `Approval Step ${idx + 1}`,
          approverEmployeeId: r.empId ?? null,
          approverName: r.empName || `Approver ${idx + 1}`,
          approverEmail: r.empEmail ?? null,
        }))
        return { steps }
      }
    }
  } catch (err) {
    console.error('Error resolving 5R approval matrix from DB:', err)
  }

  // 2. Fallback if DB matrix is not yet initialized
  const [ria] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
    })
    .from(employees)
    .where(eq(employees.id, 1181))
    .limit(1)

  let step2ApproverId: number | null = null
  let step2ApproverName = 'PJO Site / Atasan Langsung'
  let step2ApproverEmail: string | null = null

  // 2a. Tentukan Site ID dari params atau master area
  let effectiveSiteId = params.siteId ?? null
  let targetPicEmployeeId = params.picEmployeeId ?? null

  if (params.areaId && (!effectiveSiteId || !targetPicEmployeeId)) {
    const [areaRow] = await db
      .select({
        siteId: fiveRMasterAreas.siteId,
        picEmployeeId: fiveRMasterAreas.picEmployeeId,
      })
      .from(fiveRMasterAreas)
      .where(eq(fiveRMasterAreas.id, params.areaId))
      .limit(1)

    if (areaRow) {
      if (!effectiveSiteId && areaRow.siteId) {
        effectiveSiteId = areaRow.siteId
      }
      if (!targetPicEmployeeId && areaRow.picEmployeeId) {
        targetPicEmployeeId = areaRow.picEmployeeId
      }
    }
  }

  // 2b. PRIORITAS 1: PJO Site / Head Site dari hero_sites.head_employee_id
  if (effectiveSiteId) {
    const [siteRow] = await db
      .select({
        headEmployeeId: sites.headEmployeeId,
      })
      .from(sites)
      .where(eq(sites.id, effectiveSiteId))
      .limit(1)

    if (siteRow?.headEmployeeId) {
      const [headEmp] = await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.id, siteRow.headEmployeeId))
        .limit(1)

      if (headEmp) {
        step2ApproverId = headEmp.id
        step2ApproverName = headEmp.name
        step2ApproverEmail = headEmp.email
      }
    }
  }

  // 2c. PRIORITAS 2 (Fallback jika Site tidak ada PJO): Cari Atasan Langsung PIC dari Struktur Organisasi
  if (!step2ApproverId && targetPicEmployeeId) {
    try {
      const [picOrgNode] = await db
        .select({
          id: orgChartNodes.id,
          parentNodeId: orgChartNodes.parentNodeId,
        })
        .from(orgChartNodes)
        .where(eq(orgChartNodes.employeeId, targetPicEmployeeId))
        .limit(1)

      if (picOrgNode?.parentNodeId) {
        const [parentOrgNode] = await db
          .select({
            employeeId: orgChartNodes.employeeId,
          })
          .from(orgChartNodes)
          .where(eq(orgChartNodes.id, picOrgNode.parentNodeId))
          .limit(1)

        if (parentOrgNode?.employeeId) {
          const [parentEmp] = await db
            .select({
              id: employees.id,
              name: employees.name,
              email: employees.email,
            })
            .from(employees)
            .where(eq(employees.id, parentOrgNode.employeeId))
            .limit(1)

          if (parentEmp) {
            step2ApproverId = parentEmp.id
            step2ApproverName = parentEmp.name
            step2ApproverEmail = parentEmp.email
          }
        }
      }
    } catch (err) {
      console.error('Error resolving PIC direct manager from orgChartNodes:', err)
    }

    // 2d. Fallback Atasan Langsung dari employees.directManagerId
    if (!step2ApproverId) {
      const [picEmp] = await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
          directManagerId: employees.directManagerId,
        })
        .from(employees)
        .where(eq(employees.id, targetPicEmployeeId))
        .limit(1)

      if (picEmp?.directManagerId) {
        const [managerEmp] = await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, picEmp.directManagerId))
          .limit(1)

        if (managerEmp) {
          step2ApproverId = managerEmp.id
          step2ApproverName = managerEmp.name
          step2ApproverEmail = managerEmp.email
        }
      }
    }
  }

  // 2e. Fallback ke directManagerId auditor atau Head of Service (Apriyanto)
  if (!step2ApproverId && params.auditorId) {
    const [auditor] = await db
      .select({
        directManagerId: employees.directManagerId,
      })
      .from(employees)
      .where(eq(employees.id, params.auditorId))
      .limit(1)

    if (auditor?.directManagerId) {
      const [manager] = await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.id, auditor.directManagerId))
        .limit(1)

      if (manager) {
        step2ApproverId = manager.id
        step2ApproverName = manager.name
        step2ApproverEmail = manager.email
      }
    }
  }

  // 2f. Final Fallback ke Apriyanto (Head of Service MVC - ID 955)
  if (!step2ApproverId) {
    const [apriyanto] = await db
      .select({ id: employees.id, name: employees.name, email: employees.email })
      .from(employees)
      .where(eq(employees.id, 955))
      .limit(1)
    if (apriyanto) {
      step2ApproverId = apriyanto.id
      step2ApproverName = apriyanto.name
      step2ApproverEmail = apriyanto.email
    }
  }

  const [bardinia] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
    })
    .from(employees)
    .where(eq(employees.id, 944))
    .limit(1)

  const steps: FiveRApprovalStep[] = [
    {
      level: 1,
      roleLabel: 'PJO Site / Atasan Langsung',
      approverEmployeeId: step2ApproverId,
      approverName: step2ApproverName,
      approverEmail: step2ApproverEmail,
    },
    {
      level: 2,
      roleLabel: 'Head of CPI Approval',
      approverEmployeeId: bardinia?.id ?? 944,
      approverName: bardinia?.name ?? 'Bardinia Susi Ekawaty',
      approverEmail: bardinia?.email ?? 'bardynia.susi@chitraparatama.co.id',
    },
  ]

  return { steps }
}

/**
 * Initialize approval records in hero_approvals table and trigger Level 1 email
 */
export async function initializeFiveRApprovals(report: typeof fiveRReports.$inferSelect) {
  const route = await resolveFiveRApprovalRoute({
    auditorId: report.auditorId,
    siteId: report.siteId,
    areaId: report.masterAreaId,
  })

  // Insert approval records for each step in hero_approvals
  for (const step of route.steps) {
    await db.insert(approvals).values({
      fiveRReportId: report.id,
      level: step.level,
      approverName: step.approverName,
      approverEmployeeId: step.approverEmployeeId,
      status: step.level === 1 ? 'pending' : 'waiting',
      submittedAt: new Date(),
      resolutionSource: 'matrix',
      routeSnapshot: JSON.stringify({
        level: step.level,
        roleLabel: step.roleLabel,
        approverName: step.approverName,
        reportNumber: report.reportNumber,
      }),
    })
  }

  // Send Email & in-app notification to Step 1 Approver (Ria Annisa Putri)
  const step1 = route.steps[0]
  if (step1 && step1.approverEmail) {
    const appUrl = getAppUrl()
    const approvalLink = `${appUrl}/dashboard/approval`

    await sendFiveREmailNotification({
      templateCode: 'five_r_approval_request',
      recipientEmail: step1.approverEmail,
      variables: {
        approverName: step1.approverName,
        approvalLevel: `Level 1: ${step1.roleLabel}`,
        reportNumber: report.reportNumber,
        picAreaName: report.picAreaName,
        auditorName: report.auditorName,
        auditPeriod: report.auditPeriod,
        auditDate: String(report.auditDate),
        reportType:
          report.reportType === 'ada_temuan'
            ? 'Ada Temuan'
            : report.reportType === 'after_temuan_sebelumnya'
            ? 'After (Temuan Sebelumnya)'
            : 'Tidak Ada Temuan',
        totalScore: String(report.totalScore),
        approvalLink,
      },
    })
  }
}

/**
 * Helper to send 5R email notification with centralized template override & delivery logging
 */
export async function sendFiveREmailNotification(params: {
  templateCode: string
  recipientEmail: string
  variables: Record<string, string>
}) {
  try {
    if (!params.recipientEmail || !params.recipientEmail.includes('@')) {
      console.warn('[5R] Recipient email is invalid or empty:', params.recipientEmail)
      return { success: false, error: 'Recipient email kosong atau tidak valid' }
    }

    const templateAliases = [
      params.templateCode,
      params.templateCode === 'five_r_approval_request' ? 'workflow_five_r_report_submitted' : null,
      params.templateCode === 'workflow_five_r_report_approved' ? 'five_r_status_update' : null,
      params.templateCode === 'workflow_five_r_report_returned_rejected' ? 'five_r_status_update' : null,
      params.templateCode === 'five_r_status_update' ? 'workflow_five_r_report_approved' : null,
      `workflow_${params.templateCode}`,
    ].filter((t): t is string => !!t)

    const [tpl] = await db
      .select()
      .from(emailTemplates)
      .where(and(inArray(emailTemplates.templateCode, templateAliases), eq(emailTemplates.isActive, true)))
      .orderBy(sql`CASE WHEN ${emailTemplates.templateCode} = ${params.templateCode} THEN 0 ELSE 1 END`)
      .limit(1)

    const unifiedVars: Record<string, string> = {
      ...params.variables,
      requestNumber: params.variables.reportNumber || params.variables.requestNumber || '',
      reportNumber: params.variables.reportNumber || params.variables.requestNumber || '',
      recipientName: params.variables.approverName || params.variables.recipientName || '',
      approverName: params.variables.approverName || params.variables.recipientName || '',
      requesterName: params.variables.auditorName || params.variables.requesterName || '',
      auditorName: params.variables.auditorName || params.variables.requesterName || '',
      stepName: params.variables.approvalLevel || params.variables.stepName || '',
      approvalLevel: params.variables.approvalLevel || params.variables.stepName || '',
      actionUrl: params.variables.approvalLink || params.variables.actionUrl || '',
      approvalLink: params.variables.approvalLink || params.variables.actionUrl || '',
    }

    let subject = `[HERO 5R] Pemberitahuan Laporan 5R: ${unifiedVars.reportNumber || ''}`
    let htmlContent = `<p>Pemberitahuan Laporan 5R ${unifiedVars.reportNumber || ''}</p>`
    let textContent = `Pemberitahuan Laporan 5R ${unifiedVars.reportNumber || ''}`

    if (tpl) {
      subject = tpl.subject
      htmlContent = tpl.htmlContent
      textContent = tpl.textContent

      // Interpolate placeholders {{key}}
      for (const [k, v] of Object.entries(unifiedVars)) {
        const regex = new RegExp(`{{\\s*${k}\\s*}}`, 'g')
        subject = subject.replace(regex, v || '')
        htmlContent = htmlContent.replace(regex, v || '')
        textContent = textContent.replace(regex, v || '')
      }
    }

    // 1. Insert Notification Event for central Email Delivery Log
    const [eventRow] = await db
      .insert(notificationEvents)
      .values({
        channel: 'email',
        eventType: params.templateCode,
        recipient: params.recipientEmail,
        payloadSnapshot: JSON.stringify({
          subject,
          variables: unifiedVars,
        }),
        deliveryStatus: 'pending',
        deliveredAt: new Date(),
      })
      .returning()

    // 2. Send email through central workflow email helper with await to ensure delivery completes
    const emailResult = await sendWorkflowEmail({
      to: params.recipientEmail,
      templateCode: tpl?.templateCode ?? params.templateCode,
      templateName: tpl?.name ?? 'Notifikasi Persetujuan Laporan 5R',
      variables: unifiedVars,
      fallbackSubject: subject,
      fallbackHtml: htmlContent,
      fallbackText: textContent,
    })

    const isDelivered = emailResult.status === 'sent'

    // 3. Record in notificationDeliveries & update notificationEvents
    if (eventRow?.id) {
      await db.insert(notificationDeliveries).values({
        notificationEventId: eventRow.id,
        deliveryChannel: 'email',
        recipient: params.recipientEmail,
        status: isDelivered ? 'delivered' : 'failed',
        errorMessage: isDelivered ? null : (emailResult as any).reason || 'Gagal mengirim email via SMTP',
        sentAt: isDelivered ? new Date() : null,
      })

      await db
        .update(notificationEvents)
        .set({
          deliveryStatus: isDelivered ? 'delivered' : 'failed',
          deliveredAt: isDelivered ? new Date() : null,
        })
        .where(eq(notificationEvents.id, eventRow.id))
    }

    // 4. Insert in_app notification event for header notification bell
    await db.insert(notificationEvents).values({
      channel: 'in_app',
      eventType: params.templateCode,
      recipient: params.recipientEmail,
      payloadSnapshot: JSON.stringify({
        category: 'approval_requests',
        title: subject,
        body: `Laporan 5R ${unifiedVars.reportNumber} (${unifiedVars.picAreaName || ''}) memerlukan tindakan Anda (${unifiedVars.approvalLevel || ''}).`,
        url: '/dashboard/approval',
      }),
      deliveryStatus: 'delivered',
      deliveredAt: new Date(),
    })

    return { success: isDelivered }
  } catch (error: any) {
    console.error('[5R] Failed to send email notification:', error)
    return { success: false, error: error?.message }
  }
}
