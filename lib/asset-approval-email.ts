import { sendWorkflowEmail } from '@/lib/workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { getPublicAppUrl } from '@/lib/auth-config'
import type { EmailAttachment } from '@/lib/email-delivery'

const ASSET_TESTING_RECIPIENT_OVERRIDE: string | null =
  process.env.NODE_ENV === 'production' ? null : 'said.sultan@chitraparatama.com'

async function resolveTargetRecipients(originalEmail: string): Promise<{ to: string; note: string }> {
  if (ASSET_TESTING_RECIPIENT_OVERRIDE) {
    return {
      to: ASSET_TESTING_RECIPIENT_OVERRIDE,
      note: `[TESTING: Original Recipient -> ${originalEmail}] `,
    }
  }
  return { to: originalEmail, note: '' }
}

export type AssetModuleType = 'ASSET_BORROW' | 'ASSET_TRANSFER' | 'ASSET_DISPOSAL'

const MODULE_LABELS: Record<AssetModuleType, string> = {
  ASSET_BORROW: 'Peminjaman Aset (Asset Borrow)',
  ASSET_TRANSFER: 'Mutasi Aset (Asset Transfer)',
  ASSET_DISPOSAL: 'Penghapusan Aset (Asset Disposal)',
}

const MODULE_URLS: Record<AssetModuleType, string> = {
  ASSET_BORROW: '/dashboard/assets/borrow',
  ASSET_TRANSFER: '/dashboard/assets/transfer',
  ASSET_DISPOSAL: '/dashboard/assets/disposal',
}

/**
 * Kirim Notifikasi Revert (Permintaan Revisi) ke Pemohon / Pengaju Aset
 */
export async function sendAssetRevisionRequestedEmail(params: {
  module: AssetModuleType
  applicantEmail: string
  applicantName: string
  documentNumber: string
  assetName: string
  revertedByName: string
  revertNote: string
  targetId: number
}) {
  const baseUrl = getPublicAppUrl()
  const moduleLabel = MODULE_LABELS[params.module]
  const editLink = `${baseUrl}${MODULE_URLS[params.module]}?id=${params.targetId}&action=edit`
  const target = await resolveTargetRecipients(params.applicantEmail)

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_revision_requested',
    templateName: `Pengajuan ${moduleLabel} Perlu Revisi`,
    variables: {
      documentNumber: params.documentNumber,
      assetName: params.assetName,
      applicantName: params.applicantName,
      revertedByName: params.revertedByName,
      revertNote: params.revertNote,
      moduleLabel,
      editLink,
    },
    fallbackSubject: `${target.note}[Revisi ${moduleLabel}] Dokumen ${params.documentNumber} Memerlukan Perbaikan`,
    fallbackText: `Pengajuan ${moduleLabel} nomor ${params.documentNumber} (${params.assetName}) dikembalikan untuk revisi oleh ${params.revertedByName} dengan catatan: "${params.revertNote}". Silakan periksa dan perbarui formulir di: ${editLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [ASSET_TESTING_RECIPIENT_OVERRIDE || params.applicantEmail],
    eventType: 'asset.revision_needed',
    category: 'approval_requests',
    title: `Revisi Diperlukan: ${params.documentNumber}`,
    body: `Pengajuan ${moduleLabel} (${params.assetName}) dikembalikan oleh ${params.revertedByName}: "${params.revertNote}".`,
    url: editLink,
  })
}

/**
 * Kirim Notifikasi Resubmit (Telah Diperbaiki) ke Last Approver yang Me-Revert
 */
export async function sendAssetResubmittedEmail(params: {
  module: AssetModuleType
  approverEmail: string
  approverName: string
  documentNumber: string
  assetName: string
  applicantName: string
  approvalUrl?: string
}) {
  const baseUrl = getPublicAppUrl()
  const moduleLabel = MODULE_LABELS[params.module]
  const approvalLink = params.approvalUrl || `${baseUrl}/dashboard/approval`
  const target = await resolveTargetRecipients(params.approverEmail)

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_resubmitted',
    templateName: `Pengajuan ${moduleLabel} Telah Diperbaiki (Resubmitted)`,
    variables: {
      documentNumber: params.documentNumber,
      assetName: params.assetName,
      applicantName: params.applicantName,
      moduleLabel,
      approvalLink,
    },
    fallbackSubject: `${target.note}[Resubmitted ${moduleLabel}] Dokumen ${params.documentNumber} Siap Ditinjau Kembali`,
    fallbackText: `Pemohon ${params.applicantName} telah memperbaiki dan mengirimkan kembali permohonan ${moduleLabel} nomor ${params.documentNumber} (${params.assetName}). Silakan periksa di Approval Inbox: ${approvalLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [ASSET_TESTING_RECIPIENT_OVERRIDE || params.approverEmail],
    eventType: 'asset.resubmitted',
    category: 'approval_requests',
    title: `Revisi Selesai: ${params.documentNumber}`,
    body: `Pengajuan ${moduleLabel} (${params.assetName}) telah diperbaiki oleh ${params.applicantName} dan siap Anda review kembali.`,
    url: approvalLink,
  })
}
