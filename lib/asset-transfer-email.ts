import { db } from '@/db'
import { cerWorkflowConfigs } from '@/db/schema/cer'
import { sendWorkflowEmail } from '@/lib/workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { getPublicAppUrl } from '@/lib/auth-config'
import type { EmailAttachment } from '@/lib/email-delivery'

import { resolveAssetTestingEmail } from '@/lib/asset-testing-guard'

// =========================================================================
// TESTING GUARDRAIL (Sesuai instruksi sistem & modul CER):
// Selama proses pengetesan, seluruh notifikasi email dialihkan ke:
// Gilang Suryo Wirawan (gilang.suryo@chitraparatama.co.id)
// =========================================================================
export const ASSET_TRANSFER_TESTING_RECIPIENT_OVERRIDE = 'gilang.suryo@chitraparatama.co.id'

async function resolveTargetRecipients(originalRecipients: string | string[] | undefined): Promise<{
  to: string[]
  note: string
}> {
  return await resolveAssetTestingEmail(originalRecipients)
}

export interface AssetTransferSubmittedEmailParams {
  approverEmail: string
  approverName: string
  approverJobTitle?: string | null
  transferNumber: string
  assetName: string
  assetNumber?: string | null
  serialNumber?: string | null
  currentHolderName: string
  currentHolderJobTitle?: string | null
  currentLocationName: string
  newHolderName: string
  newHolderJobTitle?: string | null
  targetLocationName: string
  equipmentText?: string | null
  notes?: string | null
  applicantName: string
  applicantSn?: string | null
  applicantJobTitle?: string | null
  approvalStepTitle: string
  approvalStepLevel: number
  approvalUrl?: string
  cc?: string | string[]
}

/**
 * Responsive HTML Template bergaya CER untuk Pengajuan & Setiap Tahap Approval Transfer Aset
 */
export function buildAssetTransferSubmittedEmailHtml(
  params: AssetTransferEmailParamsCompat,
  approvalLink: string
): string {
  const effectiveJobTitle = params.approverJobTitle || params.approvalStepTitle

  return `
<div style="margin:0;padding:0;background:#e5e7eb;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e5e7eb;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.1);border:1px solid #cbd5e1">
          <!-- Header Banner Bergaya CER -->
          <tr>
            <td style="background:linear-gradient(135deg,#020617 0%,#0f172a 60%,#1e3a8a 100%);padding:22px 28px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;color:#93c5fd;font-size:11px;letter-spacing:.25em;text-transform:uppercase;font-weight:700">PT CHITRA PARATAMA</p>
                    <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-.02em">Berita Acara Mutasi Aset (Transfer)</h1>
                  </td>
                  <td align="right" style="vertical-align:middle">
                    <span style="display:inline-block;border:1px solid rgba(255,255,255,.25);border-radius:6px;padding:6px 12px;color:#dbeafe;background:rgba(255,255,255,.1);font-size:11px;font-weight:700">Asset Management</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:24px 28px">
              <!-- Judul Form & Dokumen Info -->
              <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
                <span style="display:inline-block;padding:3px 8px;border-radius:4px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;margin-bottom:6px">
                  ${params.transferNumber}
                </span>
                <h2 style="margin:0 0 6px;color:#0f172a;font-size:18px;line-height:1.35;font-weight:800">
                  Permohonan Persetujuan Mutasi Aset: ${params.assetName}
                </h2>
                <div style="font-size:12px;color:#64748b">
                  Tahap Persetujuan: <strong style="color:#2563eb">${params.approvalStepTitle}</strong> &bull; Kepada: <strong style="color:#0f172a">${params.approverName}</strong> ${effectiveJobTitle ? `(${effectiveJobTitle})` : ''}
                </div>
              </div>

              <!-- Metadata Grid -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:12px;color:#334155;margin-bottom:20px;background:#f8fafc;border-radius:8px;padding:12px 16px;border:1px solid #e2e8f0">
                <tr>
                  <td style="padding:6px 0;width:150px;color:#64748b;font-weight:600">Pemohon (Applicant)</td>
                  <td style="padding:6px 0;font-weight:700;color:#0f172a">: ${params.applicantName} ${params.applicantSn ? `(${params.applicantSn})` : ''} ${params.applicantJobTitle ? `&bull; ${params.applicantJobTitle}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Nama &amp; Nomor Aset</td>
                  <td style="padding:6px 0;font-weight:700;color:#0f172a">: ${params.assetName} ${params.assetNumber ? `&bull; No: <span style="font-family:monospace;color:#1d4ed8">${params.assetNumber}</span>` : ''}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Nomor Seri (S/N)</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.serialNumber || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Kelengkapan Fisik</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.equipmentText || 'Unit Lengkap beserta kelengkapan standar'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Pemegang Lama (Asal)</td>
                  <td style="padding:6px 0;color:#0f172a">: <strong>${params.currentHolderName}</strong> (${params.currentLocationName}) ${params.currentHolderJobTitle ? `&bull; ${params.currentHolderJobTitle}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Pemegang Baru (Tujuan)</td>
                  <td style="padding:6px 0;color:#0f172a">: <strong>${params.newHolderName}</strong> (${params.targetLocationName}) ${params.newHolderJobTitle ? `&bull; ${params.newHolderJobTitle}` : ''}</td>
                </tr>
                ${
                  params.notes
                    ? `<tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Catatan Pemohon</td>
                  <td style="padding:6px 0;color:#0f172a;font-style:italic">: "${params.notes}"</td>
                </tr>`
                    : ''
                }
              </table>

              <!-- Call to Action Banner -->
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:24px;text-align:center">
                <p style="margin:0 0 12px;font-size:13px;color:#1e40af;font-weight:600">
                  Pengajuan ini memerlukan pemeriksaan &amp; persetujuan digital Anda di HERO Inbox Approval.
                </p>
                <a href="${approvalLink}" style="display:inline-block;padding:10px 24px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;border-radius:8px;box-shadow:0 2px 4px rgba(37,99,235,.2)">
                  Tinjau &amp; Setujui di Inbox Approval &rarr;
                </a>
              </div>

              <!-- Info Footer -->
              <div style="font-size:11px;color:#94a3b8;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:14px">
                Email ini dikirim otomatis oleh <strong>HERO Asset Management System</strong> PT Chitra Paratama. Anda dapat memproses dokumen ini langsung melalui portal HERO Desktop maupun Inbox Approval.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
`
}

export type AssetTransferEmailParamsCompat = AssetTransferSubmittedEmailParams

/**
 * 1. Kirim Email Notifikasi Permohonan / Tahap Approval Mutasi Aset
 */
export async function sendAssetTransferSubmittedEmail(params: AssetTransferSubmittedEmailParams) {
  const baseUrl = getPublicAppUrl()
  const approvalLink = params.approvalUrl || `${baseUrl}/dashboard/approval`
  const target = await resolveTargetRecipients(params.approverEmail)

  const emailHtml = buildAssetTransferSubmittedEmailHtml(params, approvalLink)

  await sendWorkflowEmail({
    to: target.to,
    cc: params.cc,
    templateCode: 'asset_transfer_submitted',
    templateName: 'Pengajuan / Tahap Approval Mutasi Aset',
    variables: {
      transferNumber: params.transferNumber,
      assetName: params.assetName,
      assetNumber: params.assetNumber || '-',
      currentHolderName: params.currentHolderName,
      newHolderName: params.newHolderName,
      approvalStepTitle: params.approvalStepTitle,
      approverName: params.approverName,
      approvalLink,
    },
    fallbackSubject: `${target.note}[Transfer Aset - Menunggu Persetujuan] ${params.transferNumber} - ${params.assetName}`,
    fallbackHtml: emailHtml,
    fallbackText: `Permohonan transfer aset ${params.transferNumber} (${params.assetName}) dari ${params.currentHolderName} ke ${params.newHolderName} menunggu persetujuan Anda pada tahap "${params.approvalStepTitle}". Tinjau di: ${approvalLink}`,
  })
}

/**
 * 2. Kirim Email Notifikasi Full Approved (Dokumen Resmi Terbit & Aset Resmi Berpindah)
 */
export async function sendAssetTransferFullApprovedEmail(params: {
  applicantEmail: string
  applicantName: string
  currentHolderEmail?: string | null
  currentHolderName: string
  newHolderEmail?: string | null
  newHolderName: string
  transferNumber: string
  assetName: string
  assetNumber?: string | null
  serialNumber?: string | null
  currentLocationName: string
  targetLocationName: string
  equipmentText?: string | null
  notes?: string | null
  pdfBuffer?: Buffer | Uint8Array
  pdfUrl?: string
  transferId: number
}) {
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/assets/transfer`

  const recipients = Array.from(
    new Set([params.applicantEmail, params.currentHolderEmail, params.newHolderEmail].filter(Boolean))
  ) as string[]

  const target = await resolveTargetRecipients(recipients)

  const attachments: EmailAttachment[] = []
  if (params.pdfBuffer) {
    attachments.push({
      filename: `BA_MUTASI_ASET_${params.transferNumber.replace(/\//g, '_')}_APPROVED.pdf`,
      content: Buffer.from(params.pdfBuffer),
      contentType: 'application/pdf',
    })
  }

  const emailHtml = `
<div style="margin:0;padding:0;background:#e5e7eb;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e5e7eb;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.1);border:1px solid #cbd5e1">
          <!-- Header Banner Bergaya CER Full Approved -->
          <tr>
            <td style="background:linear-gradient(135deg,#020617 0%,#0f172a 60%,#065f46 100%);padding:22px 28px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;color:#6ee7b7;font-size:11px;letter-spacing:.25em;text-transform:uppercase;font-weight:700">PT CHITRA PARATAMA</p>
                    <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-.02em">Berita Acara Mutasi Aset (Disetujui Penuh)</h1>
                  </td>
                  <td align="right" style="vertical-align:middle">
                    <span style="display:inline-block;border:1px solid rgba(110,231,183,.4);border-radius:6px;padding:6px 12px;color:#d1fae5;background:rgba(16,185,129,.2);font-size:11px;font-weight:700">Full Approved</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:24px 28px">
              <!-- Judul Form & Dokumen Info -->
              <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
                <span style="display:inline-block;padding:3px 8px;border-radius:4px;background:#ecfdf5;color:#047857;font-size:11px;font-weight:700;margin-bottom:6px">
                  ${params.transferNumber}
                </span>
                <h2 style="margin:0 0 6px;color:#0f172a;font-size:18px;line-height:1.35;font-weight:800">
                  Mutasi Aset Selesai: ${params.assetName} Resmi Berpindah Tangan
                </h2>
                <div style="font-size:12px;color:#047857;font-weight:600">
                  &bull; Seluruh 4 tahap persetujuan telah ditandatangani secara digital &bull; Dokumen Berita Acara A4 terlampir
                </div>
              </div>

              <!-- Metadata Grid -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:12px;color:#334155;margin-bottom:20px;background:#f8fafc;border-radius:8px;padding:12px 16px;border:1px solid #e2e8f0">
                <tr>
                  <td style="padding:6px 0;width:150px;color:#64748b;font-weight:600">Nama Aset</td>
                  <td style="padding:6px 0;font-weight:700;color:#0f172a">: ${params.assetName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Nomor Aset</td>
                  <td style="padding:6px 0;font-family:monospace;font-weight:700;color:#047857">: ${params.assetNumber || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Nomor Seri (S/N)</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.serialNumber || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Pemegang Baru (Kini)</td>
                  <td style="padding:6px 0;font-weight:700;color:#0f172a">: ${params.newHolderName} (${params.targetLocationName})</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Pemegang Sebelumnya</td>
                  <td style="padding:6px 0;color:#64748b">: ${params.currentHolderName} (${params.currentLocationName})</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Status Master Aset</td>
                  <td style="padding:6px 0;color:#047857;font-weight:700">: Berhasil Diperbarui Otomatis di Master Data Aset</td>
                </tr>
              </table>

              <!-- Call to Action Banner -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:24px;text-align:center">
                <p style="margin:0 0 12px;font-size:13px;color:#166534;font-weight:600">
                  Dokumen Berita Acara resmi format A4 Portrait telah terlampir dalam email ini dan dapat diunduh langsung dari portal HERO.
                </p>
                <a href="${viewLink}" style="display:inline-block;padding:10px 24px;background:#059669;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;border-radius:8px;box-shadow:0 2px 4px rgba(5,150,105,.2)">
                  Buka Halaman Transfer Aset &rarr;
                </a>
              </div>

              <!-- Info Footer -->
              <div style="font-size:11px;color:#94a3b8;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:14px">
                Email ini dikirim otomatis oleh <strong>HERO Asset Management System</strong> PT Chitra Paratama. Dokumen Berita Acara yang diterbitkan sah secara hukum internal perusahaan.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
`

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_transfer_full_approved',
    templateName: 'Mutasi Aset Disetujui Penuh (Berita Acara Terbit)',
    variables: {
      transferNumber: params.transferNumber,
      assetName: params.assetName,
      assetNumber: params.assetNumber || '-',
      newHolderName: params.newHolderName,
      targetLocationName: params.targetLocationName,
      viewLink,
    },
    fallbackSubject: `${target.note}[Transfer Aset Full Approved] ${params.transferNumber} - ${params.assetName} (Berita Acara Terbit)`,
    fallbackHtml: emailHtml,
    fallbackText: `Mutasi aset ${params.transferNumber} (${params.assetName}) telah disetujui penuh (Full Approved) dan aset resmi berpindah tangan ke ${params.newHolderName} (${params.targetLocationName}). Dokumen Berita Acara terlampir. Tautan: ${viewLink}`,
    attachments: attachments.length > 0 ? attachments : undefined,
  })
}

/**
 * 3. Kirim Email Notifikasi Penolakan Transfer Aset
 */
export async function sendAssetTransferRejectedEmail(params: {
  applicantEmail: string
  applicantName: string
  transferNumber: string
  assetName: string
  rejectedByName: string
  rejectionReason: string
}) {
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/assets/transfer`
  const target = await resolveTargetRecipients(params.applicantEmail)

  const emailHtml = `
<div style="margin:0;padding:0;background:#e5e7eb;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e5e7eb;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.1);border:1px solid #cbd5e1">
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#020617 0%,#0f172a 60%,#881337 100%);padding:22px 28px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;color:#fda4af;font-size:11px;letter-spacing:.25em;text-transform:uppercase;font-weight:700">PT CHITRA PARATAMA</p>
                    <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-.02em">Berita Acara Mutasi Aset (Ditolak)</h1>
                  </td>
                  <td align="right" style="vertical-align:middle">
                    <span style="display:inline-block;border:1px solid rgba(253,164,175,.35);border-radius:6px;padding:6px 12px;color:#ffe4e6;background:rgba(225,29,72,.2);font-size:11px;font-weight:700">Rejected</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:24px 28px">
              <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
                <span style="display:inline-block;padding:3px 8px;border-radius:4px;background:#ffe4e6;color:#9f1239;font-size:11px;font-weight:700;margin-bottom:6px">
                  ${params.transferNumber}
                </span>
                <h2 style="margin:0 0 6px;color:#0f172a;font-size:18px;line-height:1.35;font-weight:800">
                  Pengajuan Mutasi Aset Ditolak
                </h2>
                <div style="font-size:12px;color:#64748b">
                  Ditolak oleh: <strong style="color:#e11d48">${params.rejectedByName}</strong>
                </div>
              </div>

              <!-- Rejection Notice Box -->
              <div style="background:#fff1f2;border-left:4px solid #e11d48;padding:12px 16px;margin-bottom:20px;border-radius:0 6px 6px 0">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9f1239;text-transform:uppercase">Alasan Penolakan:</p>
                <p style="margin:0;font-size:13px;color:#881337;font-style:italic">"${params.rejectionReason}"</p>
              </div>

              <a href="${viewLink}" style="display:inline-block;padding:10px 24px;background:#e11d48;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;border-radius:8px">
                Lihat Daftar Transfer &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
`

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_transfer_rejected',
    templateName: 'Pengajuan Mutasi Aset Ditolak',
    variables: {
      transferNumber: params.transferNumber,
      assetName: params.assetName,
      rejectedByName: params.rejectedByName,
      rejectionReason: params.rejectionReason,
      viewLink,
    },
    fallbackSubject: `${target.note}[Transfer Aset Ditolak] ${params.transferNumber} - ${params.assetName}`,
    fallbackHtml: emailHtml,
    fallbackText: `Permohonan transfer aset ${params.transferNumber} (${params.assetName}) ditolak oleh ${params.rejectedByName} dengan alasan: "${params.rejectionReason}". Tinjau di: ${viewLink}`,
  })
}
