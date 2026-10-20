import { db } from '@/db'
import { cerNotificationConfigs } from '@/db/schema/cer'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { sendWorkflowEmail } from '@/lib/workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { getPublicAppUrl } from '@/lib/auth-config'
import type { EmailAttachment } from '@/lib/email-delivery'

export interface CerNotificationConfigData {
  procurementEmail: string
  procurementSiteOverrides: Record<string, string>
  evoDwiEmail: string
  gaAdilaEmail: string
  gaBagasEmail: string
  itBimaEmail: string
  budgetValidatorEmail: string
  isActive: boolean
}

export async function getCerNotificationConfig(): Promise<CerNotificationConfigData> {
  try {
    const [cfg] = await db.select().from(cerNotificationConfigs).limit(1)
    if (cfg) {
      return {
        procurementEmail: cfg.procurementEmail || 'procurement@chitraparatama.com',
        procurementSiteOverrides: cfg.procurementSiteOverrides || {},
        evoDwiEmail: cfg.evoDwiEmail || 'evo.dwi@chitraparatama.com',
        gaAdilaEmail: cfg.gaAdilaEmail || 'adila@chitraparatama.com',
        gaBagasEmail: cfg.gaBagasEmail || 'bagas@chitraparatama.com',
        itBimaEmail: cfg.itBimaEmail || 'bima@chitraparatama.com',
        budgetValidatorEmail: cfg.budgetValidatorEmail || 'budget.controller@chitraparatama.com',
        isActive: cfg.isActive ?? true,
      }
    }
  } catch (err) {
    console.error('[cer-email] Failed to get CER notification config:', err)
  }

  return {
    procurementEmail: 'procurement@chitraparatama.com',
    procurementSiteOverrides: {},
    evoDwiEmail: 'evo.dwi@chitraparatama.com',
    gaAdilaEmail: 'adila@chitraparatama.com',
    gaBagasEmail: 'bagas@chitraparatama.com',
    itBimaEmail: 'bima@chitraparatama.com',
    budgetValidatorEmail: 'budget.controller@chitraparatama.com',
    isActive: true,
  }
}

export function formatRupiah(amount: number | string | null | undefined): string {
  if (amount == null) return '0'
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('id-ID').format(num)
}

/**
 * 1. Notifikasi Permohonan CER Baru Membutuhkan Approval
 */
export async function sendCerSubmittedEmail(params: {
  approverEmail: string
  approverName: string
  cerNumber: string
  subject: string
  applicantName: string
  siteName: string
  departmentName: string
  totalEstimatedPrice: number | string
  approvalStep: string
  approvalUrl?: string
}) {
  const baseUrl = getPublicAppUrl()
  const approvalLink = params.approvalUrl || `${baseUrl}/dashboard/approval`

  // Send Workflow Email
  await sendWorkflowEmail({
    to: params.approverEmail,
    templateCode: 'cer_request_submitted',
    templateName: 'Pengajuan CER Baru Membutuhkan Approval',
    variables: {
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      siteName: params.siteName,
      departmentName: params.departmentName,
      totalEstimatedPrice: formatRupiah(params.totalEstimatedPrice),
      approvalStep: params.approvalStep,
      approvalLink,
    },
    fallbackSubject: `[CER Approval] Permohonan Baru ${params.cerNumber} - ${params.subject} (${params.applicantName})`,
    fallbackText: `Permohonan CER ${params.cerNumber} (${params.subject}) oleh ${params.applicantName} membutuhkan approval Anda pada tahap ${params.approvalStep}. Buka link: ${approvalLink}`,
  })

  // Bell Notification
  await notifyWorkflowBellRecipients({
    recipientEmails: [params.approverEmail],
    eventType: 'cer.approval_needed',
    category: 'approval_requests',
    title: `Persetujuan CER: ${params.cerNumber}`,
    body: `Permohonan CER "${params.subject}" dari ${params.applicantName} memerlukan persetujuan Anda (${params.approvalStep}).`,
    url: approvalLink,
  })
}

/**
 * 2. Notifikasi Pengajuan CER Perlu Revisi (Reverted) ke Pemohon
 */
export async function sendCerRevisionRequestedEmail(params: {
  applicantEmail: string
  applicantName: string
  cerNumber: string
  subject: string
  revertedByName: string
  revertNote: string
  cerId: number
}) {
  const baseUrl = getPublicAppUrl()
  const editLink = `${baseUrl}/dashboard/assets/cer?id=${params.cerId}&action=edit`

  await sendWorkflowEmail({
    to: params.applicantEmail,
    templateCode: 'cer_revision_requested',
    templateName: 'Pengajuan CER Perlu Revisi',
    variables: {
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      revertedByName: params.revertedByName,
      revertNote: params.revertNote,
      editLink,
    },
    fallbackSubject: `[CER Revisi] Permohonan ${params.cerNumber} Memerlukan Perbaikan - ${params.subject}`,
    fallbackText: `Permohonan CER ${params.cerNumber} dikembalikan untuk revisi oleh ${params.revertedByName} dengan catatan: "${params.revertNote}". Silakan perbarui: ${editLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [params.applicantEmail],
    eventType: 'cer.revision_needed',
    category: 'approval_requests',
    title: `Revisi CER: ${params.cerNumber}`,
    body: `Permohonan CER "${params.subject}" dikembalikan oleh ${params.revertedByName}: "${params.revertNote}".`,
    url: editLink,
  })
}

/**
 * 3. Notifikasi Pengajuan CER Telah Diperbaiki (Resubmitted) ke Approver Peminta Revisi
 */
export async function sendCerResubmittedEmail(params: {
  approverEmail: string
  approverName: string
  cerNumber: string
  subject: string
  applicantName: string
  approvalUrl?: string
}) {
  const baseUrl = getPublicAppUrl()
  const approvalLink = params.approvalUrl || `${baseUrl}/dashboard/approval`

  await sendWorkflowEmail({
    to: params.approverEmail,
    templateCode: 'cer_resubmitted',
    templateName: 'Pengajuan CER Telah Diperbaiki (Resubmitted)',
    variables: {
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      approvalLink,
    },
    fallbackSubject: `[CER Resubmitted] Permohonan ${params.cerNumber} Telah Diperbaiki - ${params.subject}`,
    fallbackText: `Pemohon ${params.applicantName} telah memperbaiki dan mengirimkan kembali permohonan CER ${params.cerNumber}. Silakan periksa di: ${approvalLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [params.approverEmail],
    eventType: 'cer.resubmitted',
    category: 'approval_requests',
    title: `CER Diperbaiki: ${params.cerNumber}`,
    body: `Pemohon ${params.applicantName} telah memperbarui form CER "${params.subject}". Siap ditinjau kembali.`,
    url: approvalLink,
  })
}

/**
 * 4. Notifikasi Pengajuan CER Full Approved (Dokumen Resmi Terbit)
 * Kirim ke Procurement & Pemohon, CC Evo Dwi
 */
export async function sendCerFullApprovedEmail(params: {
  applicantEmail: string
  applicantName: string
  cerNumber: string
  subject: string
  siteId?: number | null
  siteName: string
  totalEstimatedPrice: number | string
  vendorName: string
  pdfBuffer?: Buffer | Uint8Array
  pdfUrl?: string
  cerId: number
}) {
  const baseUrl = getPublicAppUrl()
  const config = await getCerNotificationConfig()
  const viewLink = `${baseUrl}/dashboard/assets/cer?id=${params.cerId}`

  // Determine Procurement email (site override or default)
  let procurementTarget = config.procurementEmail
  if (params.siteId && config.procurementSiteOverrides[String(params.siteId)]) {
    procurementTarget = config.procurementSiteOverrides[String(params.siteId)]
  }

  const recipients = Array.from(new Set([procurementTarget, params.applicantEmail].filter(Boolean)))
  const ccEmails = [config.evoDwiEmail].filter(Boolean)

  const attachments: EmailAttachment[] = []
  if (params.pdfBuffer) {
    attachments.push({
      filename: `${params.cerNumber.replace(/\//g, '_')}_APPROVED.pdf`,
      content: Buffer.from(params.pdfBuffer),
      contentType: 'application/pdf',
    })
  }

  await sendWorkflowEmail({
    to: recipients,
    cc: ccEmails,
    templateCode: 'cer_full_approved',
    templateName: 'Pengajuan CER Full Approved (Dokumen Resmi Terbit)',
    variables: {
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      siteName: params.siteName,
      totalEstimatedPrice: formatRupiah(params.totalEstimatedPrice),
      vendorName: params.vendorName || '-',
      pdfDownloadUrl: params.pdfUrl || viewLink,
      viewLink,
    },
    fallbackSubject: `[CER Full Approved] ${params.cerNumber} - ${params.subject} (Dokumen Terbit)`,
    fallbackText: `Permohonan CER ${params.cerNumber} (${params.subject}) telah disetujui penuh (Full Approved). Dokumen terlampir. Tautan: ${viewLink}`,
    attachments: attachments.length > 0 ? attachments : undefined,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: recipients.concat(ccEmails),
    eventType: 'cer.full_approved',
    category: 'approval_requests',
    title: `CER Full Approved: ${params.cerNumber}`,
    body: `Permohonan CER "${params.subject}" telah disetujui penuh oleh Direksi. Dokumen resmi telah terbit.`,
    url: viewLink,
  })
}

/**
 * 5. Notifikasi Konfirmasi Penerimaan Fisik Aset CER
 * Kirim ke Procurement & CC Evo Dwi
 */
export async function sendCerAssetReceivedEmail(params: {
  applicantName: string
  cerNumber: string
  subject: string
  siteId?: number | null
  siteName: string
  receivedDate: string
  receiverNotes?: string
  cerId: number
}) {
  const baseUrl = getPublicAppUrl()
  const config = await getCerNotificationConfig()
  const viewLink = `${baseUrl}/dashboard/assets/cer?id=${params.cerId}`

  let procurementTarget = config.procurementEmail
  if (params.siteId && config.procurementSiteOverrides[String(params.siteId)]) {
    procurementTarget = config.procurementSiteOverrides[String(params.siteId)]
  }

  const recipients = [procurementTarget].filter(Boolean)
  const ccEmails = [config.evoDwiEmail].filter(Boolean)

  await sendWorkflowEmail({
    to: recipients,
    cc: ccEmails,
    templateCode: 'cer_asset_received',
    templateName: 'Konfirmasi Penerimaan Fisik Aset CER',
    variables: {
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      siteName: params.siteName,
      receivedDate: params.receivedDate,
      receiverNotes: params.receiverNotes || 'Barang diterima lengkap dan sesuai spesifikasi.',
      viewLink,
    },
    fallbackSubject: `[Aset Diterima] Konfirmasi Fisik ${params.cerNumber} - ${params.subject} di ${params.siteName}`,
    fallbackText: `Pemohon ${params.applicantName} telah mengonfirmasi penerimaan fisik barang untuk CER ${params.cerNumber} di ${params.siteName}. Detail: ${viewLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: recipients.concat(ccEmails),
    eventType: 'cer.asset_received',
    category: 'info',
    title: `Aset Diterima: ${params.cerNumber}`,
    body: `Pemohon ${params.applicantName} telah menerima fisik aset untuk CER "${params.subject}".`,
    url: viewLink,
  })
}

/**
 * 6. Notifikasi BAST Serah Terima Selesai Diterbitkan
 * Kirim ke Pemohon, CC GA (Adila & Bagas)
 */
export async function sendCerBastCompletedEmail(params: {
  applicantEmail: string
  applicantName: string
  bastNumber: string
  cerNumber: string
  subject: string
  gaName: string
  handoverDate: string
  pdfBuffer?: Buffer | Uint8Array
  pdfUrl?: string
  cerId: number
}) {
  const baseUrl = getPublicAppUrl()
  const config = await getCerNotificationConfig()
  const viewLink = `${baseUrl}/dashboard/assets/cer?id=${params.cerId}`

  const recipients = [params.applicantEmail].filter(Boolean)
  const ccEmails = [config.gaAdilaEmail, config.gaBagasEmail].filter(Boolean)

  const attachments: EmailAttachment[] = []
  if (params.pdfBuffer) {
    attachments.push({
      filename: `${params.bastNumber.replace(/\//g, '_')}.pdf`,
      content: Buffer.from(params.pdfBuffer),
      contentType: 'application/pdf',
    })
  }

  await sendWorkflowEmail({
    to: recipients,
    cc: ccEmails,
    templateCode: 'cer_bast_completed',
    templateName: 'BAST Serah Terima Aset Selesai Diterbitkan',
    variables: {
      bastNumber: params.bastNumber,
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      gaName: params.gaName,
      handoverDate: params.handoverDate,
      pdfDownloadUrl: params.pdfUrl || viewLink,
      viewLink,
    },
    fallbackSubject: `[BAST Aset] Berita Acara Serah Terima ${params.bastNumber} - ${params.cerNumber}`,
    fallbackText: `Dokumen BAST ${params.bastNumber} untuk CER ${params.cerNumber} telah ditandatangani dan diterbitkan. Detail: ${viewLink}`,
    attachments: attachments.length > 0 ? attachments : undefined,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: recipients.concat(ccEmails),
    eventType: 'cer.bast_completed',
    category: 'info',
    title: `BAST Diterbitkan: ${params.bastNumber}`,
    body: `Berita Acara Serah Terima Aset "${params.subject}" telah selesai diterbitkan.`,
    url: viewLink,
  })
}
