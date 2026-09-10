import { getPublicAppUrl } from '@/lib/auth-config'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { sendWorkflowEmail } from '@/lib/workflow-email'
import { db } from '@/db'
import { hcContractReviewSettings, employees } from '@/db/schema/hero'
import { user } from '@/db/schema/auth'
import { eq, sql } from 'drizzle-orm'

export type StepNotificationParams = {
  sessionId?: number
  documentId?: number
  sessionCode?: string
  splNumber?: string
  title?: string
  workDate?: string | Date | null
  siteName?: string | null
  employeeName: string
  requesterName?: string
  approverName: string
  approverEmail: string
  approvalStep: string
  approvalToken: string
  remarks?: string | null
  revertReason?: string | null
}

function getTargetRecipients(email?: string | null) {
  return email && email.trim() ? [email.trim()] : []
}

function getSplTargetRecipients(email?: string | null) {
  return ['raihanaraya36@gmail.com']
}

export async function publishInAppApprovalNotification(params: {
  recipientEmail?: string | null
  title: string
  body: string
  url: string
  eventType: string
}) {
  try {
    const recipients = [params.recipientEmail].filter((e): e is string => Boolean(e && e.includes('@')))
    if (recipients.length === 0) return
    await notifyWorkflowBellRecipients({
      recipientEmails: recipients,
      eventType: params.eventType,
      category: 'approval_requests',
      title: params.title,
      body: params.body,
      url: params.url,
      tagPrefix: params.eventType,
    })
  } catch (error) {
    console.error('[publishInAppApprovalNotification] Failed to publish in-app notification:', error)
  }
}

export async function sendDailyActivityStepApprovalEmail(params: StepNotificationParams) {
  const recipients = getTargetRecipients(params.approverEmail)

  const baseUrl = getPublicAppUrl()
  const docIdentifier = params.sessionCode || (params.sessionId ? String(params.sessionId) : '')
  const approvalLink = `${baseUrl}/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`
  const workDateStr = params.workDate
    ? new Date(params.workDate).toLocaleDateString('id-ID', { dateStyle: 'full' })
    : '-'

  await publishInAppApprovalNotification({
    recipientEmail: params.approverEmail,
    title: `Approval: Daily Activity ${params.sessionCode || 'Laporan'}`,
    body: `Laporan aktivitas ${params.employeeName} menunggu persetujuan Anda (${params.approvalStep}).`,
    url: `/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`,
    eventType: 'daily_activity_approval_needed',
  })

  const [settingRow] = await db
    .select({ settingValue: hcContractReviewSettings.settingValue })
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, 'daily_activity_workflow'))
    .limit(1)
    .catch(() => [])

  const customTpl = (settingRow?.settingValue as any)?.emailTemplates?.approvalStep

  const fallbackSubject = customTpl?.subject || `[Daily Activity] Menunggu Persetujuan Anda: ${params.sessionCode || 'Laporan'} - ${params.employeeName} (${params.approvalStep})`
  const fallbackText = customTpl?.body || `Yth. ${params.approverName},\n\nLaporan aktivitas harian berikut membutuhkan persetujuan Anda pada tahap ${params.approvalStep}:\n\nKode Aktivitas: ${params.sessionCode || '-'}\nNama Karyawan: ${params.employeeName}\nTanggal Kerja: ${workDateStr}\nLokasi: ${params.siteName || '-'}\n\nSilakan buka tautan berikut untuk menandatangani secara digital:\n${approvalLink}\n\nHormat kami,\nPT Chitra Paratama`

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'daily_activity_approval_notification',
    templateName: 'Daily Activity Approval Notification',
    fallbackSubject,
    fallbackText,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#0f172a,#0d9488);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#ccfbf1;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Daily Activity Hub • Sequential Approval</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>${params.approverName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Laporan aktivitas harian berikut membutuhkan persetujuan dan tanda tangan digital Anda pada tahap <strong>${params.approvalStep}</strong>:
    </p>
    <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #0d9488">
      <table cellpadding="4" cellspacing="0" width="100%" style="font-size:13px;color:#334155">
        <tr><td width="140" style="color:#64748b">Kode Aktivitas:</td><td style="font-weight:600;color:#0f172a">${params.sessionCode || '-'}</td></tr>
        <tr><td style="color:#64748b">Nama Karyawan:</td><td><strong>${params.employeeName}</strong></td></tr>
        <tr><td style="color:#64748b">Tanggal Kerja:</td><td>${workDateStr}</td></tr>
        <tr><td style="color:#64748b">Lokasi / Site:</td><td>${params.siteName || '-'}</td></tr>
        <tr><td style="color:#64748b">Tahap Approval:</td><td style="color:#0f766e;font-weight:bold">${params.approvalStep}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${approvalLink}" style="background:#0d9488;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Tinjau & Tanda Tangani Laporan</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:16px">
      Email ini dikirim secara otomatis oleh Sistem HERO PT Chitra Paratama.
    </p>
  </div>
</div>
    `,
    variables: {
      approverName: params.approverName,
      employeeName: params.employeeName,
      sessionCode: params.sessionCode || '-',
      workDate: workDateStr,
      siteName: params.siteName || '-',
      approvalStep: params.approvalStep,
      approvalLink,
    },
  })
}

export async function sendDailyActivityCompletedEmail(params: {
  sessionId: number
  sessionCode: string
  employeeName: string
  employeeEmail: string
  workDate: string | Date | null
}) {
  const recipients = getTargetRecipients(params.employeeEmail)
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/activity-hub/document/${params.sessionId}`

  await publishInAppApprovalNotification({
    recipientEmail: params.employeeEmail,
    title: 'Daily Activity Disetujui Penuh',
    body: `Laporan aktivitas ${params.sessionCode} telah disetujui seluruh atasan.`,
    url: `/dashboard/activity-hub/document/${params.sessionId}`,
    eventType: 'daily_activity_completed',
  })

  const [settingRow] = await db
    .select({ settingValue: hcContractReviewSettings.settingValue })
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, 'daily_activity_workflow'))
    .limit(1)
    .catch(() => [])

  const customTpl = (settingRow?.settingValue as any)?.emailTemplates?.approvalCompleted

  const fallbackSubject = customTpl?.subject || `[Daily Activity Disetujui] ${params.sessionCode} - Laporan Aktivitas Harian Anda Telah Selesai Disetujui`
  const fallbackText = customTpl?.body || `Halo ${params.employeeName},\n\nLaporan aktivitas harian Anda (${params.sessionCode}) telah disetujui penuh oleh seluruh atasan.\n\nLihat dokumen: ${viewLink}\n\nHormat kami,\nPT Chitra Paratama`

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'daily_activity_completed_notification',
    templateName: 'Daily Activity Approved Notification',
    fallbackSubject,
    fallbackText,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#059669,#10b981);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#d1fae5;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Daily Activity Hub • Disetujui Penuh</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Halo <strong>${params.employeeName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Laporan aktivitas harian Anda dengan kode <strong>${params.sessionCode}</strong> telah selesai diverifikasi dan disetujui penuh oleh seluruh atasan hingga Department Head / Manager.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${viewLink}" style="background:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Lihat Dokumen & Cetak PDF</a>
    </div>
  </div>
</div>
    `,
    variables: {
      employeeName: params.employeeName,
      sessionCode: params.sessionCode,
      viewLink,
    },
  })
}

export async function sendDailyActivityRejectedEmail(params: {
  sessionId: number
  sessionCode: string
  employeeName: string
  employeeEmail: string
  approverName: string
  remarks?: string | null
}) {
  const recipients = getTargetRecipients(params.employeeEmail)
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/activity-hub/document/${params.sessionId}`

  await publishInAppApprovalNotification({
    recipientEmail: params.employeeEmail,
    title: 'Daily Activity Ditolak',
    body: `Laporan ${params.sessionCode} ditolak oleh ${params.approverName}: ${params.remarks || '-'}`,
    url: `/dashboard/activity-hub/document/${params.sessionId}`,
    eventType: 'daily_activity_rejected',
  })

  const [settingRow] = await db
    .select({ settingValue: hcContractReviewSettings.settingValue })
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, 'daily_activity_workflow'))
    .limit(1)
    .catch(() => [])

  const customTpl = (settingRow?.settingValue as any)?.emailTemplates?.rejected

  const fallbackSubject = customTpl?.subject || `[Daily Activity Ditolak] ${params.sessionCode} - Laporan Ditolak oleh ${params.approverName}`
  const fallbackText = customTpl?.body || `Halo ${params.employeeName},\n\nLaporan aktivitas harian Anda (${params.sessionCode}) telah ditolak oleh ${params.approverName}.\nAlasan Penolakan: ${params.remarks || '-'}\n\nPemberitahuan: Dokumen yang telah ditolak mutlak tidak dapat direvisi atau diedit kembali. Silakan ajukan laporan/sesi baru jika aktivitas ini masih perlu dicatat.\n\nRincian: ${viewLink}`

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'daily_activity_rejected_notification',
    templateName: 'Daily Activity Rejected Notification',
    fallbackSubject,
    fallbackText,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#e11d48,#be123c);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#ffe4e6;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Daily Activity Hub • Ditolak</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Halo <strong>${params.employeeName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Laporan aktivitas harian Anda (<strong>${params.sessionCode}</strong>) telah ditolak oleh <strong>${params.approverName}</strong>.
    </p>
    ${
      params.remarks
        ? `<div style="background:#fff1f2;padding:14px;border-radius:6px;border-left:4px solid #e11d48;font-size:13px;color:#9f1239;margin-bottom:20px"><strong>Alasan Penolakan:</strong> ${params.remarks}</div>`
        : ''
    }
    <div style="background:#f1f5f9;border-left:4px solid #64748b;padding:12px 14px;border-radius:4px;font-size:12px;color:#475569;margin-bottom:20px">
      <strong>Pemberitahuan:</strong> Dokumen yang telah ditolak mutlak tidak dapat direvisi atau diedit kembali. Silakan ajukan laporan/sesi baru jika aktivitas ini masih perlu dicatat.
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${viewLink}" style="background:#e11d48;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Lihat Rincian Laporan</a>
    </div>
  </div>
</div>
    `,
    variables: {
      employeeName: params.employeeName,
      sessionCode: params.sessionCode,
      approverName: params.approverName,
      remarks: params.remarks || '-',
      viewLink,
      approvalLink: viewLink,
    },
  })
}

export async function sendDailyActivityRevertedEmail(params: {
  sessionId: number
  sessionCode: string
  targetApproverName: string
  targetApproverEmail: string
  managerName: string
  revertReason?: string | null
}) {
  const recipients = getTargetRecipients(params.targetApproverEmail)
  const baseUrl = getPublicAppUrl()
  const docIdentifier = params.sessionCode || String(params.sessionId)
  const approvalLink = `${baseUrl}/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`

  await publishInAppApprovalNotification({
    recipientEmail: params.targetApproverEmail,
    title: 'Daily Activity Dikembalikan untuk Revisi',
    body: `Laporan ${params.sessionCode} dikembalikan oleh ${params.managerName}: ${params.revertReason || '-'}`,
    url: `/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`,
    eventType: 'daily_activity_reverted',
  })

  const [settingRow] = await db
    .select({ settingValue: hcContractReviewSettings.settingValue })
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, 'daily_activity_workflow'))
    .limit(1)
    .catch(() => [])

  const customTpl = (settingRow?.settingValue as any)?.emailTemplates?.reverted

  const fallbackSubject = customTpl?.subject || `[Daily Activity Dikembalikan] ${params.sessionCode} - Dokumen Dikembalikan oleh ${params.managerName} untuk Revisi`
  const fallbackText = customTpl?.body || `Yth. ${params.targetApproverName},\n\nLaporan aktivitas harian (${params.sessionCode}) telah dikembalikan oleh ${params.managerName} untuk revisi.\nCatatan Revisi: ${params.revertReason || '-'}\n\nTinjau ulang: ${approvalLink}`

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'daily_activity_reverted_notification',
    templateName: 'Daily Activity Reverted Notification',
    fallbackSubject,
    fallbackText,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#fef3c7;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Daily Activity Hub • Dikembalikan (Revert)</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>${params.targetApproverName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Laporan aktivitas harian <strong>${params.sessionCode}</strong> telah dikembalikan (revert) oleh Department Head <strong>${params.managerName}</strong> untuk peninjauan / perbaikan ulang.
    </p>
    ${
      params.revertReason
        ? `<div style="background:#fffbeb;padding:14px;border-radius:6px;border-left:4px solid #f59e0b;font-size:13px;color:#92400e;margin-bottom:20px"><strong>Catatan Revisi:</strong> ${params.revertReason}</div>`
        : ''
    }
    <div style="text-align:center;margin:28px 0">
      <a href="${approvalLink}" style="background:#d97706;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Tinjau Ulang Laporan</a>
    </div>
  </div>
</div>
    `,
    variables: {
      targetApproverName: params.targetApproverName,
      employeeName: params.targetApproverName,
      sessionCode: params.sessionCode,
      managerName: params.managerName,
      approverName: params.managerName,
      revertReason: params.revertReason || '-',
      remarks: params.revertReason || '-',
      approvalLink,
      viewLink: approvalLink,
    },
  })
}

// ─── Overtime Request (SPL) Email Helpers ─────────────────────────────────────

export async function sendOvertimeStepApprovalEmail(params: StepNotificationParams) {
  const recipients = getSplTargetRecipients(params.approverEmail)

  const baseUrl = getPublicAppUrl()
  const docIdentifier = params.splNumber || (params.documentId ? String(params.documentId) : '')
  const approvalLink = `${baseUrl}/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`
  const workDateStr = params.workDate
    ? new Date(params.workDate).toLocaleDateString('id-ID', { dateStyle: 'full' })
    : '-'

  await publishInAppApprovalNotification({
    recipientEmail: params.approverEmail,
    title: `Approval: SPL ${params.splNumber || 'Surat Lembur'}`,
    body: `Pengajuan lembur ${params.splNumber || ''} (${params.requesterName || params.employeeName}) menunggu persetujuan Anda (${params.approvalStep}).`,
    url: `/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`,
    eventType: 'overtime_approval_needed',
  })

  const [settingRow] = await db
    .select({ settingValue: hcContractReviewSettings.settingValue })
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, 'overtime_spl_workflow'))
    .limit(1)
    .catch(() => [])

  const customTpl = (settingRow?.settingValue as any)?.emailTemplates?.approvalStep

  const fallbackSubject = customTpl?.subject || `[SPL Lembur] Menunggu Persetujuan Anda: ${params.splNumber || 'SPL'} - ${params.title || 'Surat Perintah Lembur'} (${params.approvalStep})`
  const fallbackText = customTpl?.body || `Yth. ${params.approverName},\n\nPengajuan SPL berikut membutuhkan persetujuan Anda pada tahap ${params.approvalStep}:\n\nNo. SPL: ${params.splNumber || '-'}\nPekerjaan: ${params.title || '-'}\nPemohon: ${params.requesterName || params.employeeName}\nTanggal Lembur: ${workDateStr}\n\nTanda tangani SPL di:\n${approvalLink}\n\nHormat kami,\nPT Chitra Paratama`

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'overtime_approval_notification',
    templateName: 'Overtime Request (SPL) Approval Notification',
    fallbackSubject,
    fallbackText,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#0f172a,#2563eb);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#93c5fd;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Surat Perintah Lembur (SPL) • Sequential Approval</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>${params.approverName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Pengajuan Surat Perintah Lembur (SPL) berikut membutuhkan persetujuan dan tanda tangan digital Anda pada tahap <strong>${params.approvalStep}</strong>:
    </p>
    <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #2563eb">
      <table cellpadding="4" cellspacing="0" width="100%" style="font-size:13px;color:#334155">
        <tr><td width="140" style="color:#64748b">No. SPL:</td><td style="font-weight:600;color:#0f172a">${params.splNumber || '-'}</td></tr>
        <tr><td style="color:#64748b">Pekerjaan:</td><td><strong>${params.title || '-'}</strong></td></tr>
        <tr><td style="color:#64748b">Pemohon:</td><td>${params.requesterName || params.employeeName}</td></tr>
        <tr><td style="color:#64748b">Tanggal Lembur:</td><td>${workDateStr}</td></tr>
        <tr><td style="color:#64748b">Tahap Approval:</td><td style="color:#1d4ed8;font-weight:bold">${params.approvalStep}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${approvalLink}" style="background:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Tinjau & Tanda Tangani SPL</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:16px">
      Email ini dikirim secara otomatis oleh Sistem HERO PT Chitra Paratama.
    </p>
  </div>
</div>
    `,
    variables: {
      approverName: params.approverName,
      employeeName: params.requesterName || params.employeeName,
      splNumber: params.splNumber || '-',
      title: params.title || '-',
      requesterName: params.requesterName || params.employeeName,
      workDate: workDateStr,
      approvalStep: params.approvalStep,
      approvalLink,
    },
  })
}

export async function sendOvertimeCompletedEmail(params: {
  documentId: number
  splNumber: string
  title: string
  requesterEmail: string
  requesterName: string
}) {
  const recipients = getSplTargetRecipients(params.requesterEmail)
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/overtime-requests/${params.documentId}/approval`

  await publishInAppApprovalNotification({
    recipientEmail: params.requesterEmail,
    title: 'Surat Lembur (SPL) Disetujui Penuh',
    body: `SPL ${params.splNumber} (${params.title}) telah disetujui seluruh atasan.`,
    url: `/dashboard/overtime-requests/${params.documentId}/approval`,
    eventType: 'overtime_approved',
  })

  const [settingRow] = await db
    .select({ settingValue: hcContractReviewSettings.settingValue })
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, 'overtime_spl_workflow'))
    .limit(1)
    .catch(() => [])

  const customTpl = (settingRow?.settingValue as any)?.emailTemplates?.approvalCompleted

  const fallbackSubject = customTpl?.subject || `[SPL Lembur Disetujui] ${params.splNumber} - ${params.title} Telah Selesai Disetujui`
  const fallbackText = customTpl?.body || `Halo ${params.requesterName},\n\nPengajuan Surat Perintah Lembur (SPL) ${params.splNumber} (${params.title}) telah selesai disetujui.\n\nDetail:\n${viewLink}\n\nHormat kami,\nPT Chitra Paratama`

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'overtime_completed_notification',
    templateName: 'Overtime Request Approved Notification',
    fallbackSubject: `[SPL Lembur Disetujui] ${params.splNumber} - ${params.title} Telah Selesai Disetujui`,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#059669,#10b981);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#d1fae5;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Surat Perintah Lembur (SPL) • Disetujui Penuh</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Halo <strong>${params.requesterName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Pengajuan Surat Perintah Lembur (SPL) dengan nomor <strong>${params.splNumber}</strong> (${params.title}) telah disetujui penuh oleh seluruh atasan hingga Department Head / Manager.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${viewLink}" style="background:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Lihat & Unduh PDF SPL</a>
    </div>
  </div>
</div>
    `,
    fallbackText: `Halo ${params.requesterName},

SPL nomor ${params.splNumber} (${params.title}) telah selesai disetujui penuh.
Lihat PDF SPL: ${viewLink}

Hormat kami,
PT Chitra Paratama`,
    variables: {
      requesterName: params.requesterName,
      splNumber: params.splNumber,
      title: params.title,
      viewLink,
    },
  })
}

export async function sendOvertimeRejectedEmail(params: {
  documentId: number
  splNumber: string
  title: string
  requesterEmail: string
  requesterName: string
  approverName: string
  remarks?: string | null
}) {
  const recipients = getSplTargetRecipients(params.requesterEmail)
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/overtime-requests/${params.documentId}/approval`

  await publishInAppApprovalNotification({
    recipientEmail: params.requesterEmail,
    title: 'Surat Lembur (SPL) Ditolak',
    body: `SPL ${params.splNumber} ditolak oleh ${params.approverName}: ${params.remarks || '-'}`,
    url: `/dashboard/overtime-requests/${params.documentId}/approval`,
    eventType: 'overtime_rejected',
  })

  const [settingRow] = await db
    .select({ settingValue: hcContractReviewSettings.settingValue })
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, 'overtime_spl_workflow'))
    .limit(1)
    .catch(() => [])

  const customTpl = (settingRow?.settingValue as any)?.emailTemplates?.rejected

  const fallbackSubject = customTpl?.subject || `[SPL Lembur Ditolak] ${params.splNumber} - Pengajuan Lembur Ditolak oleh ${params.approverName}`
  const fallbackText = customTpl?.body || `Halo ${params.requesterName},\n\nSPL nomor ${params.splNumber} (${params.title}) telah ditolak oleh ${params.approverName}.\nAlasan Penolakan: ${params.remarks || '-'}\n\nPemberitahuan: Dokumen SPL yang telah ditolak mutlak tidak dapat direvisi atau diedit kembali. Silakan ajukan permohonan SPL baru jika lembur ini masih diperlukan.\n\nRincian: ${viewLink}`

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'overtime_rejected_notification',
    templateName: 'Overtime Request Rejected Notification',
    fallbackSubject,
    fallbackText,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#e11d48,#be123c);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#ffe4e6;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Surat Perintah Lembur (SPL) • Ditolak</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Halo <strong>${params.requesterName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Pengajuan Surat Perintah Lembur (SPL) nomor <strong>${params.splNumber}</strong> (${params.title}) telah ditolak oleh <strong>${params.approverName}</strong>.
    </p>
    ${
      params.remarks
        ? `<div style="background:#fff1f2;padding:14px;border-radius:6px;border-left:4px solid #e11d48;font-size:13px;color:#9f1239;margin-bottom:20px"><strong>Alasan Penolakan:</strong> ${params.remarks}</div>`
        : ''
    }
    <div style="background:#f1f5f9;border-left:4px solid #64748b;padding:12px 14px;border-radius:4px;font-size:12px;color:#475569;margin-bottom:20px">
      <strong>Pemberitahuan:</strong> Dokumen SPL yang telah ditolak mutlak tidak dapat direvisi atau diedit kembali. Silakan ajukan permohonan SPL baru jika lembur ini masih diperlukan.
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${viewLink}" style="background:#e11d48;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Lihat Dokumen SPL</a>
    </div>
  </div>
</div>
    `,
    variables: {
      requesterName: params.requesterName,
      employeeName: params.requesterName,
      splNumber: params.splNumber,
      title: params.title,
      approverName: params.approverName,
      remarks: params.remarks || '-',
      viewLink,
      approvalLink: viewLink,
    },
  })
}

export async function sendOvertimeRevertedEmail(params: {
  documentId: number
  splNumber: string
  title: string
  targetApproverName: string
  targetApproverEmail: string
  managerName: string
  revertReason?: string | null
}) {
  const recipients = getSplTargetRecipients(params.targetApproverEmail)
  const baseUrl = getPublicAppUrl()
  const docIdentifier = params.splNumber || String(params.documentId)
  const approvalLink = `${baseUrl}/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`

  await publishInAppApprovalNotification({
    recipientEmail: params.targetApproverEmail,
    title: 'Surat Lembur (SPL) Dikembalikan untuk Revisi',
    body: `SPL ${params.splNumber} dikembalikan oleh ${params.managerName}: ${params.revertReason || '-'}`,
    url: `/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`,
    eventType: 'overtime_reverted',
  })

  const [settingRow] = await db
    .select({ settingValue: hcContractReviewSettings.settingValue })
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, 'overtime_spl_workflow'))
    .limit(1)
    .catch(() => [])

  const customTpl = (settingRow?.settingValue as any)?.emailTemplates?.reverted

  const fallbackSubject = customTpl?.subject || `[SPL Lembur Dikembalikan] ${params.splNumber} - Dokumen Dikembalikan oleh ${params.managerName} untuk Revisi`
  const fallbackText = customTpl?.body || `Yth. ${params.targetApproverName},\n\nSPL nomor ${params.splNumber} telah dikembalikan oleh ${params.managerName} untuk revisi.\nCatatan Revisi: ${params.revertReason || '-'}\n\nTinjau ulang: ${approvalLink}`

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'overtime_reverted_notification',
    templateName: 'Overtime Request Reverted Notification',
    fallbackSubject,
    fallbackText,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#fef3c7;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Surat Perintah Lembur (SPL) • Dikembalikan (Revert)</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>${params.targetApproverName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Pengajuan Surat Perintah Lembur (SPL) <strong>${params.splNumber}</strong> telah dikembalikan (revert) oleh Department Head <strong>${params.managerName}</strong> untuk revisi/penyesuaian data.
    </p>
    ${
      params.revertReason
        ? `<div style="background:#fffbeb;padding:14px;border-radius:6px;border-left:4px solid #f59e0b;font-size:13px;color:#92400e;margin-bottom:20px"><strong>Catatan Revisi:</strong> ${params.revertReason}</div>`
        : ''
    }
    <div style="text-align:center;margin:28px 0">
      <a href="${approvalLink}" style="background:#d97706;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Tinjau Ulang SPL</a>
    </div>
  </div>
</div>
    `,
    variables: {
      targetApproverName: params.targetApproverName,
      employeeName: params.targetApproverName,
      requesterName: params.targetApproverName,
      splNumber: params.splNumber,
      title: params.title,
      managerName: params.managerName,
      approverName: params.managerName,
      revertReason: params.revertReason || '-',
      remarks: params.revertReason || '-',
      approvalLink,
      viewLink: approvalLink,
    },
  })
}

// ─── Permit to Work (PTW) Email Helpers ─────────────────────────────────────

export async function sendPtwStepApprovalEmail(params: {
  permitId?: number
  permitNumber?: string
  projectName?: string
  location?: string | null
  permitType?: string | null
  applicantName: string
  approverName: string
  approverEmail: string
  approvalStep: string
  approvalToken: string
}) {
  const recipients = getTargetRecipients(params.approverEmail)
  const baseUrl = getPublicAppUrl()
  const docIdentifier = params.permitNumber || (params.permitId ? String(params.permitId) : '')

  // Determine if approver is an internal CP employee / has a Hero account
  let isInternalHeroUser = false
  if (params.approverEmail) {
    const normalizedEmail = params.approverEmail.trim().toLowerCase()
    const [empUser] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
      .limit(1)
      .catch(() => [])

    if (empUser) {
      isInternalHeroUser = true
    } else {
      const [appUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(sql`lower(${user.email}) = ${normalizedEmail}`)
        .limit(1)
        .catch(() => [])
      if (appUser) {
        isInternalHeroUser = true
      }
    }
  }

  const publicLink = params.approvalToken ? `${baseUrl}/review/ptw/${params.approvalToken}` : ''
  const dashboardLink = `${baseUrl}/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`
  const approvalLink = isInternalHeroUser ? dashboardLink : (publicLink || dashboardLink)
  const notificationUrl = isInternalHeroUser
    ? `/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`
    : (publicLink || `/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`)

  await publishInAppApprovalNotification({
    recipientEmail: params.approverEmail,
    title: `Approval: PTW ${params.permitNumber || 'Izin Kerja'}`,
    body: `Dokumen izin kerja ${params.permitNumber || ''} (${params.projectName}) menunggu persetujuan Anda (${params.approvalStep}).`,
    url: notificationUrl,
    eventType: 'ptw_approval_needed',
  })

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'ptw_approval_notification',
    templateName: 'Permit to Work (PTW) Approval Notification',
    fallbackSubject: `[Izin Kerja PTW] Menunggu Persetujuan Anda: ${params.permitNumber || 'PTW'} - ${params.projectName} (${params.approvalStep})`,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#0f172a,#0891b2);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#cffafe;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Permit to Work (PTW) • Sequential Approval</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>${params.approverName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Dokumen Izin Kerja Aman (PTW) berikut membutuhkan persetujuan dan tanda tangan digital Anda pada tahap <strong>${params.approvalStep}</strong>:
    </p>
    <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #0891b2">
      <table cellpadding="4" cellspacing="0" width="100%" style="font-size:13px;color:#334155">
        <tr><td width="140" style="color:#64748b">No. PTW:</td><td style="font-weight:600;color:#0f172a">${params.permitNumber || '-'}</td></tr>
        <tr><td style="color:#64748b">Pekerjaan:</td><td><strong>${params.projectName || '-'}</strong></td></tr>
        <tr><td style="color:#64748b">Tipe Izin:</td><td>${params.permitType || '-'}</td></tr>
        <tr><td style="color:#64748b">Lokasi:</td><td>${params.location || '-'}</td></tr>
        <tr><td style="color:#64748b">Pemohon:</td><td>${params.applicantName}</td></tr>
        <tr><td style="color:#64748b">Tahap Approval:</td><td style="color:#0e7490;font-weight:bold">${params.approvalStep}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${approvalLink}" style="background:#0891b2;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Tinjau & Tanda Tangani PTW</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:16px">
      Email ini dikirim secara otomatis oleh Sistem HERO PT Chitra Paratama.
    </p>
  </div>
</div>
    `,
    fallbackText: `Yth. ${params.approverName},

Dokumen PTW berikut membutuhkan persetujuan Anda pada tahap ${params.approvalStep}:

No. PTW: ${params.permitNumber || '-'}
Pekerjaan: ${params.projectName || '-'}
Tipe: ${params.permitType || '-'}
Lokasi: ${params.location || '-'}
Pemohon: ${params.applicantName}

Tanda tangani PTW di:
${approvalLink}

Hormat kami,
PT Chitra Paratama`,
    variables: {
      approverName: params.approverName,
      permitNumber: params.permitNumber || '-',
      projectName: params.projectName || '-',
      permitType: params.permitType || '-',
      location: params.location || '-',
      applicantName: params.applicantName,
      approvalStep: params.approvalStep,
      approvalLink,
    },
  })
}

export async function sendPtwCompletedEmail(params: {
  permitId: number
  permitNumber: string
  projectName: string
  applicantEmail: string
  applicantName: string
}) {
  const recipients = getTargetRecipients(params.applicantEmail)
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/hse/izin-kerja-ptw/${params.permitId}/approval`

  await publishInAppApprovalNotification({
    recipientEmail: params.applicantEmail,
    title: 'Izin Kerja Aman (PTW) Disetujui Penuh',
    body: `PTW ${params.permitNumber} (${params.projectName}) telah disetujui pihak berwenang.`,
    url: `/dashboard/hse/izin-kerja-ptw/${params.permitId}/approval`,
    eventType: 'ptw_approved',
  })

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'ptw_completed_notification',
    templateName: 'Permit to Work Approved Notification',
    fallbackSubject: `[PTW Disetujui] ${params.permitNumber} - Izin Kerja ${params.projectName} Telah Disetujui Penuh`,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#059669,#10b981);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#d1fae5;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Permit to Work (PTW) • Disetujui Penuh</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Halo <strong>${params.applicantName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Izin Kerja Aman (PTW) dengan nomor <strong>${params.permitNumber}</strong> (${params.projectName}) telah disetujui penuh oleh seluruh pihak yang berwenang.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${viewLink}" style="background:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Lihat & Unduh PDF PTW</a>
    </div>
  </div>
</div>
    `,
    fallbackText: `Halo ${params.applicantName},

PTW nomor ${params.permitNumber} (${params.projectName}) telah disetujui penuh.
Lihat PDF PTW: ${viewLink}

Hormat kami,
PT Chitra Paratama`,
    variables: {
      applicantName: params.applicantName,
      permitNumber: params.permitNumber,
      projectName: params.projectName,
      viewLink,
    },
  })
}

export async function sendPtwRejectedEmail(params: {
  permitId: number
  permitNumber: string
  projectName: string
  applicantEmail: string
  applicantName: string
  approverName: string
  remarks?: string | null
}) {
  const recipients = getTargetRecipients(params.applicantEmail)
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/hse/izin-kerja-ptw/${params.permitId}/approval`

  await publishInAppApprovalNotification({
    recipientEmail: params.applicantEmail,
    title: 'Izin Kerja Aman (PTW) Ditolak',
    body: `PTW ${params.permitNumber} ditolak oleh ${params.approverName}: ${params.remarks || '-'}`,
    url: `/dashboard/hse/izin-kerja-ptw/${params.permitId}/approval`,
    eventType: 'ptw_rejected',
  })

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'ptw_rejected_notification',
    templateName: 'Permit to Work Rejected Notification',
    fallbackSubject: `[PTW Ditolak] ${params.permitNumber} - Permohonan Izin Kerja Ditolak oleh ${params.approverName}`,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#e11d48,#be123c);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#ffe4e6;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Permit to Work (PTW) • Ditolak</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Halo <strong>${params.applicantName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Permohonan Izin Kerja Aman (PTW) nomor <strong>${params.permitNumber}</strong> (${params.projectName}) telah ditolak oleh <strong>${params.approverName}</strong>.
    </p>
    ${
      params.remarks
        ? `<div style="background:#fff1f2;padding:14px;border-radius:6px;border-left:4px solid #e11d48;font-size:13px;color:#9f1239;margin-bottom:20px"><strong>Alasan:</strong> ${params.remarks}</div>`
        : ''
    }
    <div style="text-align:center;margin:28px 0">
      <a href="${viewLink}" style="background:#e11d48;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Lihat Rincian PTW</a>
    </div>
  </div>
</div>
    `,
    fallbackText: `Halo ${params.applicantName},

PTW nomor ${params.permitNumber} telah ditolak oleh ${params.approverName}.
Alasan: ${params.remarks || '-'}

Rincian: ${viewLink}`,
    variables: {
      applicantName: params.applicantName,
      permitNumber: params.permitNumber,
      projectName: params.projectName,
      approverName: params.approverName,
      remarks: params.remarks || '-',
      viewLink,
    },
  })
}

export async function sendPtwRevertedEmail(params: {
  permitId: number
  permitNumber: string
  projectName: string
  targetApproverName: string
  targetApproverEmail: string
  managerName: string
  revertReason?: string | null
}) {
  const recipients = getTargetRecipients(params.targetApproverEmail)
  const baseUrl = getPublicAppUrl()
  const docIdentifier = params.permitNumber || String(params.permitId)
  const approvalLink = `${baseUrl}/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`

  await publishInAppApprovalNotification({
    recipientEmail: params.targetApproverEmail,
    title: 'Izin Kerja Aman (PTW) Dikembalikan untuk Revisi',
    body: `PTW ${params.permitNumber} dikembalikan oleh ${params.managerName}: ${params.revertReason || '-'}`,
    url: `/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`,
    eventType: 'ptw_reverted',
  })

  return sendWorkflowEmail({
    to: recipients,
    templateCode: 'ptw_reverted_notification',
    templateName: 'Permit to Work Reverted Notification',
    fallbackSubject: `[PTW Dikembalikan] ${params.permitNumber} - Dokumen Dikembalikan oleh ${params.managerName} untuk Revisi`,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#fef3c7;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Permit to Work (PTW) • Dikembalikan (Revert)</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>${params.targetApproverName}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Dokumen Izin Kerja Aman (PTW) <strong>${params.permitNumber}</strong> telah dikembalikan (revert) oleh <strong>${params.managerName}</strong> untuk perbaikan / kelengkapan data.
    </p>
    ${
      params.revertReason
        ? `<div style="background:#fffbeb;padding:14px;border-radius:6px;border-left:4px solid #f59e0b;font-size:13px;color:#92400e;margin-bottom:20px"><strong>Catatan Revisi:</strong> ${params.revertReason}</div>`
        : ''
    }
    <div style="text-align:center;margin:28px 0">
      <a href="${approvalLink}" style="background:#d97706;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Tinjau Ulang Dokumen PTW</a>
    </div>
  </div>
</div>
    `,
    fallbackText: `Yth. ${params.targetApproverName},

PTW nomor ${params.permitNumber} telah dikembalikan oleh ${params.managerName} untuk revisi.
Catatan Revisi: ${params.revertReason || '-'}

Tinjau ulang: ${approvalLink}`,
    variables: {
      targetApproverName: params.targetApproverName,
      permitNumber: params.permitNumber,
      managerName: params.managerName,
      revertReason: params.revertReason || '-',
      approvalLink,
    },
  })
}

// ── Re-export Workflow Settings Types & Defaults ───────────────────────────
export * from '@/lib/workflow-settings-defaults'

