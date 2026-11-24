import { sendWorkflowEmail } from '@/lib/workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { getPublicAppUrl } from '@/lib/auth-config'
import type { EmailAttachment } from '@/lib/email-delivery'
import { resolveAssetTestingEmail } from '@/lib/asset-testing-guard'

const ASSET_TESTING_RECIPIENT_OVERRIDE: string | null =
  process.env.NODE_ENV === 'production' ? null : 'gilang.suryo@chitraparatama.co.id'

async function resolveTargetRecipients(originalEmail: string): Promise<{ to: string; note: string }> {
  const result = await resolveAssetTestingEmail(originalEmail)
  if (result.isTesting) {
    return {
      to: result.to[0] || 'gilang.suryo@chitraparatama.co.id',
      note: result.note,
    }
  }
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
 * Reusable HTML Email Template Generator matching the CER Standard Design
 */
function renderAssetBorrowEmailHtml(params: {
  borrowNumber: string
  subjectTitle: string
  badgeText: string
  badgeBgColor?: string
  badgeTextColor?: string
  jobTitleInfo?: string
  borrowerName: string
  borrowerSn?: string | null
  borrowerJobTitle?: string | null
  assetName: string
  assetNumber?: string | null
  serialNumber?: string | null
  holderName: string
  holderJobTitle?: string | null
  borrowDate?: string
  expectedReturnDate?: string
  equipmentNotes?: string | null
  purpose?: string | null
  notesTitle?: string
  notesContent?: string | null
  ctaUrl: string
  ctaText?: string
}): string {
  const badgeBg = params.badgeBgColor || '#eff6ff'
  const badgeText = params.badgeTextColor || '#1d4ed8'

  return `
<div style="margin:0;padding:0;background:#e5e7eb;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e5e7eb;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.1);border:1px solid #cbd5e1">
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#020617 0%,#0f172a 60%,#1e3a8a 100%);padding:22px 28px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;color:#93c5fd;font-size:11px;letter-spacing:.25em;text-transform:uppercase;font-weight:700">PT CHITRA PARATAMA</p>
                    <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-.02em">Formulir Peminjaman Aset (Asset Borrow)</h1>
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
                <span style="display:inline-block;padding:3px 8px;border-radius:4px;background:${badgeBg};color:${badgeText};font-size:11px;font-weight:700;margin-bottom:6px">
                  ${params.borrowNumber} &bull; ${params.badgeText}
                </span>
                <h2 style="margin:0 0 6px;color:#0f172a;font-size:18px;line-height:1.35;font-weight:800">
                  ${params.subjectTitle}
                </h2>
                ${
                  params.jobTitleInfo
                    ? `<div style="font-size:12px;color:#64748b">
                        Tahap Persetujuan: <strong style="color:#2563eb">${params.jobTitleInfo}</strong>
                      </div>`
                    : ''
                }
              </div>

              <!-- Metadata Grid -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:12px;color:#334155;margin-bottom:20px;background:#f8fafc;border-radius:8px;padding:12px 16px;border:1px solid #e2e8f0">
                <tr>
                  <td style="padding:6px 0;width:150px;color:#64748b;font-weight:600">Peminjam</td>
                  <td style="padding:6px 0;font-weight:700;color:#0f172a">: ${params.borrowerName} ${params.borrowerSn ? `(${params.borrowerSn})` : ''} ${params.borrowerJobTitle ? `&bull; ${params.borrowerJobTitle}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Nama Aset</td>
                  <td style="padding:6px 0;font-weight:700;color:#0f172a">: ${params.assetName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">No. / Serial Number</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.assetNumber || '-'} ${params.serialNumber ? `/ SN: ${params.serialNumber}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Holder Asal (Pemilik)</td>
                  <td style="padding:6px 0;font-weight:700;color:#1e40af">: ${params.holderName} ${params.holderJobTitle ? `&bull; ${params.holderJobTitle}` : ''}</td>
                </tr>
                ${
                  params.borrowDate
                    ? `<tr>
                        <td style="padding:6px 0;color:#64748b;font-weight:600">Waktu Peminjaman</td>
                        <td style="padding:6px 0;color:#0f172a">: ${params.borrowDate} ${params.expectedReturnDate ? `s/d ${params.expectedReturnDate}` : ''}</td>
                      </tr>`
                    : ''
                }
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Kelengkapan Fisik</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.equipmentNotes || 'Standar unit'}</td>
                </tr>
              </table>

              <!-- Keperluan Peminjaman -->
              ${
                params.purpose
                  ? `<div style="margin-bottom:20px">
                      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:6px">Tujuan &amp; Keperluan Peminjaman:</div>
                      <div style="padding:10px 14px;background:#f1f5f9;border-left:3px solid #2563eb;border-radius:4px;font-size:12px;line-height:1.6;color:#1e293b">
                        ${params.purpose}
                      </div>
                    </div>`
                  : ''
              }

              <!-- Catatan Tambahan (Approval Note / Return Condition / Revert) -->
              ${
                params.notesContent
                  ? `<div style="margin-bottom:20px">
                      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:6px">${params.notesTitle || 'Catatan / Alasan'}:</div>
                      <div style="padding:10px 14px;background:#f8fafc;border-left:3px solid #059669;border-radius:4px;font-size:12px;line-height:1.6;color:#0f172a">
                        ${params.notesContent}
                      </div>
                    </div>`
                  : ''
              }

              <!-- Action Button & CTA -->
              <div style="text-align:center;margin:28px 0 16px">
                <a href="${params.ctaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;box-shadow:0 4px 10px rgba(37,99,235,0.25)">
                  ${params.ctaText || 'Buka Dokumen &amp; Review Peminjaman &rarr;'}
                </a>
              </div>
              <p style="text-align:center;margin:0 0 16px;font-size:11px;color:#64748b">
                Tautan langsung: <a href="${params.ctaUrl}" style="color:#2563eb;word-break:break-all">${params.ctaUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center">
              Email ini dikirim secara otomatis oleh Sistem HERO PT Chitra Paratama. Mohon tidak membalas langsung email ini.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`
}

/**
 * 1. Kirim Notifikasi Pengajuan Peminjaman Aset Baru ke Holder Aset
 */
export async function sendAssetBorrowSubmittedEmail(params: {
  holderEmail: string
  holderName: string
  holderJobTitle?: string | null
  borrowerName: string
  borrowerSn?: string | null
  borrowerJobTitle?: string | null
  borrowNumber: string
  assetName: string
  assetNumber?: string | null
  serialNumber?: string | null
  purpose: string
  borrowDate: string | Date
  expectedReturnDate?: string | Date | null
  equipmentNotes?: string | null
  borrowId: number
}) {
  const baseUrl = getPublicAppUrl()
  const detailLink = `${baseUrl}/dashboard/assets/borrow?id=${params.borrowId}`
  const target = await resolveTargetRecipients(params.holderEmail)

  const formattedBorrowDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(params.borrowDate))

  const formattedReturnDate = params.expectedReturnDate
    ? new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(params.expectedReturnDate))
    : '-'

  const html = renderAssetBorrowEmailHtml({
    borrowNumber: params.borrowNumber,
    subjectTitle: `Permohonan Peminjaman Aset Baru: ${params.assetName}`,
    badgeText: 'Menunggu Persetujuan Holder',
    badgeBgColor: '#fef3c7',
    badgeTextColor: '#92400e',
    jobTitleInfo: params.holderJobTitle || 'Pemegang Aset (Holder)',
    borrowerName: params.borrowerName,
    borrowerSn: params.borrowerSn,
    borrowerJobTitle: params.borrowerJobTitle,
    assetName: params.assetName,
    assetNumber: params.assetNumber,
    serialNumber: params.serialNumber,
    holderName: params.holderName,
    holderJobTitle: params.holderJobTitle,
    borrowDate: formattedBorrowDate,
    expectedReturnDate: formattedReturnDate,
    equipmentNotes: params.equipmentNotes,
    purpose: params.purpose,
    ctaUrl: detailLink,
    ctaText: 'Buka Dokumen &amp; Setujui Peminjaman &rarr;',
  })

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_borrow_submitted',
    templateName: 'Permohonan Peminjaman Aset Baru Memerlukan Persetujuan Holder',
    variables: {
      holderName: params.holderName,
      borrowerName: params.borrowerName,
      borrowNumber: params.borrowNumber,
      assetName: params.assetName,
      detailLink,
    },
    fallbackSubject: `${target.note}[Peminjaman Aset] ${params.borrowNumber} - ${params.assetName} (Menunggu Persetujuan Anda)`,
    fallbackHtml: html,
    fallbackText: `Yth. ${params.holderName},\n\nTerdapat permohonan peminjaman aset baru (${params.borrowNumber}) untuk ${params.assetName} oleh ${params.borrowerName}.\nKeperluan: ${params.purpose}\nWaktu Pinjam: ${formattedBorrowDate} s/d ${formattedReturnDate}\n\nSilakan tinjau dan lakukan persetujuan di: ${detailLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [target.to],
    eventType: 'asset.borrow_submitted',
    category: 'approval_requests',
    title: `Peminjaman Aset: ${params.borrowNumber}`,
    body: `${params.borrowerName} mengajukan peminjaman aset "${params.assetName}". Memerlukan persetujuan Anda sebagai Holder.`,
    url: detailLink,
  })
}

/**
 * 2. Kirim Notifikasi Peminjaman Disetujui ke Peminjam
 */
export async function sendAssetBorrowApprovedEmail(params: {
  borrowerEmail: string
  borrowerName: string
  holderName: string
  borrowNumber: string
  assetName: string
  assetNumber?: string | null
  approvalNote?: string | null
  pdfUrl?: string | null
  borrowId: number
}) {
  const baseUrl = getPublicAppUrl()
  const detailLink = `${baseUrl}/dashboard/assets/borrow?id=${params.borrowId}`
  const target = await resolveTargetRecipients(params.borrowerEmail)

  const html = renderAssetBorrowEmailHtml({
    borrowNumber: params.borrowNumber,
    subjectTitle: `Peminjaman Aset Telah Disetujui: ${params.assetName}`,
    badgeText: 'Disetujui Holder',
    badgeBgColor: '#dcfce7',
    badgeTextColor: '#166534',
    jobTitleInfo: 'Persetujuan Selesai',
    borrowerName: params.borrowerName,
    assetName: params.assetName,
    assetNumber: params.assetNumber,
    holderName: params.holderName,
    notesTitle: 'Catatan Persetujuan Holder',
    notesContent: params.approvalNote || 'Aset telah disetujui untuk dipinjamkan. Silakan ambil unit fisik.',
    ctaUrl: detailLink,
    ctaText: 'Buka Dokumen &amp; Unduh Berita Acara &rarr;',
  })

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_borrow_approved',
    templateName: 'Permohonan Peminjaman Aset Telah Disetujui',
    variables: {
      borrowerName: params.borrowerName,
      holderName: params.holderName,
      borrowNumber: params.borrowNumber,
      assetName: params.assetName,
      approvalNote: params.approvalNote || '-',
      detailLink,
    },
    fallbackSubject: `${target.note}[Disetujui] Peminjaman Aset ${params.borrowNumber} - ${params.assetName}`,
    fallbackHtml: html,
    fallbackText: `Yth. ${params.borrowerName},\n\nPermohonan peminjaman aset ${params.borrowNumber} (${params.assetName}) telah DISETUJUI oleh Holder Aset (${params.holderName}).\nCatatan: ${params.approvalNote || '-'}\n\nSilakan ambil fisik aset dan unduh bukti serah terima di: ${detailLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [target.to],
    eventType: 'asset.borrow_approved',
    category: 'approval_requests',
    title: `Peminjaman Disetujui: ${params.borrowNumber}`,
    body: `Peminjaman "${params.assetName}" telah disetujui oleh ${params.holderName}. Aset siap diambil.`,
    url: detailLink,
  })
}

/**
 * 3. Kirim Notifikasi Pengajuan Pengembalian Aset (Langkah 1) ke Holder Aset
 */
export async function sendAssetBorrowReturnRequestedEmail(params: {
  holderEmail: string
  holderName: string
  borrowerName: string
  borrowNumber: string
  assetName: string
  assetNumber?: string | null
  returnNotes?: string | null
  borrowId: number
}) {
  const baseUrl = getPublicAppUrl()
  const detailLink = `${baseUrl}/dashboard/assets/borrow?id=${params.borrowId}`
  const target = await resolveTargetRecipients(params.holderEmail)

  const html = renderAssetBorrowEmailHtml({
    borrowNumber: params.borrowNumber,
    subjectTitle: `Pengajuan Pengembalian Fisik Aset: ${params.assetName}`,
    badgeText: 'Menunggu Verifikasi Fisik Holder',
    badgeBgColor: '#f3e8ff',
    badgeTextColor: '#6b21a8',
    jobTitleInfo: 'Verifikasi Pengembalian Fisik',
    borrowerName: params.borrowerName,
    assetName: params.assetName,
    assetNumber: params.assetNumber,
    holderName: params.holderName,
    notesTitle: 'Catatan Kondisi dari Peminjam',
    notesContent: params.returnNotes || 'Peminjam telah mengajukan pengembalian fisik aset beserta lampiran foto.',
    ctaUrl: detailLink,
    ctaText: 'Verifikasi Fisik &amp; Konfirmasi Terima &rarr;',
  })

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_borrow_return_requested',
    templateName: 'Pengembalian Fisik Aset Diajukan oleh Peminjam',
    variables: {
      holderName: params.holderName,
      borrowerName: params.borrowerName,
      borrowNumber: params.borrowNumber,
      assetName: params.assetName,
      returnNotes: params.returnNotes || '-',
      detailLink,
    },
    fallbackSubject: `${target.note}[Pengembalian Aset] ${params.borrowNumber} - ${params.assetName} (Verifikasi Fisik Diperlukan)`,
    fallbackHtml: html,
    fallbackText: `Yth. ${params.holderName},\n\nPeminjam (${params.borrowerName}) telah mengajukan pengembalian fisik aset ${params.assetName} (${params.borrowNumber}) beserta foto kondisi fisik.\nCatatan: ${params.returnNotes || '-'}\n\nSilakan periksa fisik barang dan lakukan konfirmasi penerimaan di: ${detailLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [target.to],
    eventType: 'asset.borrow_return_requested',
    category: 'approval_requests',
    title: `Pengembalian Aset Diajukan: ${params.borrowNumber}`,
    body: `${params.borrowerName} telah menyerahkan kembali aset "${params.assetName}". Mohon periksa fisik dan konfirmasi penerimaan.`,
    url: detailLink,
  })
}

/**
 * 4. Kirim Notifikasi Pengembalian Selesai (Langkah 2) ke Peminjam
 */
export async function sendAssetBorrowReturnedEmail(params: {
  borrowerEmail: string
  borrowerName: string
  holderName: string
  borrowNumber: string
  assetName: string
  assetNumber?: string | null
  returnConditionNotes?: string | null
  borrowId: number
}) {
  const baseUrl = getPublicAppUrl()
  const detailLink = `${baseUrl}/dashboard/assets/borrow?id=${params.borrowId}`
  const target = await resolveTargetRecipients(params.borrowerEmail)

  const html = renderAssetBorrowEmailHtml({
    borrowNumber: params.borrowNumber,
    subjectTitle: `Pengembalian Aset Selesai: ${params.assetName}`,
    badgeText: 'Selesai Dikembalikan',
    badgeBgColor: '#dcfce7',
    badgeTextColor: '#166534',
    jobTitleInfo: 'Peminjaman Tuntas',
    borrowerName: params.borrowerName,
    assetName: params.assetName,
    assetNumber: params.assetNumber,
    holderName: params.holderName,
    notesTitle: 'Hasil Pemeriksaan Fisik Holder',
    notesContent: params.returnConditionNotes || 'Aset telah diperiksa dan diterima kembali oleh Holder dalam kondisi baik.',
    ctaUrl: detailLink,
    ctaText: 'Lihat Arsip Dokumen Peminjaman &rarr;',
  })

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_borrow_returned',
    templateName: 'Pengembalian Aset Telah Dikonfirmasi Selesai',
    variables: {
      borrowerName: params.borrowerName,
      holderName: params.holderName,
      borrowNumber: params.borrowNumber,
      assetName: params.assetName,
      returnConditionNotes: params.returnConditionNotes || '-',
      detailLink,
    },
    fallbackSubject: `${target.note}[Selesai] Pengembalian Aset ${params.borrowNumber} - ${params.assetName} Telah Diterima`,
    fallbackHtml: html,
    fallbackText: `Yth. ${params.borrowerName},\n\nPengembalian fisik aset ${params.assetName} (${params.borrowNumber}) telah DIKONFIRMASI DITERIMA oleh Holder (${params.holderName}).\nHasil Pemeriksaan: ${params.returnConditionNotes || '-'}\n\nProses peminjaman telah tuntas: ${detailLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [target.to],
    eventType: 'asset.borrow_returned',
    category: 'approval_requests',
    title: `Peminjaman Selesai: ${params.borrowNumber}`,
    body: `Aset "${params.assetName}" telah diterima kembali oleh ${params.holderName}. Proses peminjaman tuntas.`,
    url: detailLink,
  })
}

/**
 * 5. Kirim Notifikasi Revert (Permintaan Revisi) ke Pemohon / Pengaju Aset
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

  const html = renderAssetBorrowEmailHtml({
    borrowNumber: params.documentNumber,
    subjectTitle: `Pengajuan Memerlukan Perbaikan / Revisi: ${params.assetName}`,
    badgeText: 'Perlu Revisi',
    badgeBgColor: '#fef3c7',
    badgeTextColor: '#92400e',
    jobTitleInfo: `Diminta oleh: ${params.revertedByName}`,
    borrowerName: params.applicantName,
    assetName: params.assetName,
    holderName: params.revertedByName,
    notesTitle: 'Catatan Revisi dari Approver',
    notesContent: params.revertNote,
    ctaUrl: editLink,
    ctaText: 'Buka Dokumen &amp; Perbaiki Pengajuan &rarr;',
  })

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
    fallbackHtml: html,
    fallbackText: `Pengajuan ${moduleLabel} nomor ${params.documentNumber} (${params.assetName}) dikembalikan untuk revisi oleh ${params.revertedByName} dengan catatan: "${params.revertNote}". Silakan periksa dan perbarui formulir di: ${editLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [target.to],
    eventType: 'asset.revision_needed',
    category: 'approval_requests',
    title: `Revisi Diperlukan: ${params.documentNumber}`,
    body: `Pengajuan ${moduleLabel} (${params.assetName}) dikembalikan oleh ${params.revertedByName}: "${params.revertNote}".`,
    url: editLink,
  })
}

/**
 * 6. Kirim Notifikasi Resubmit (Telah Diperbaiki) ke Last Approver yang Me-Revert
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

  const html = renderAssetBorrowEmailHtml({
    borrowNumber: params.documentNumber,
    subjectTitle: `Pengajuan Telah Diperbaiki (Resubmitted): ${params.assetName}`,
    badgeText: 'Revisi Terkirim',
    badgeBgColor: '#e0e7ff',
    badgeTextColor: '#3730a3',
    jobTitleInfo: 'Review Ulang',
    borrowerName: params.applicantName,
    assetName: params.assetName,
    holderName: params.approverName,
    notesTitle: 'Informasi Pembaruan',
    notesContent: `${params.applicantName} telah memperbarui rincian formulir pengajuan dan mengirimkan kembali untuk ditinjau.`,
    ctaUrl: approvalLink,
    ctaText: 'Buka Dokumen &amp; Review Ulang &rarr;',
  })

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_resubmitted',
    templateName: `Pengajuan ${moduleLabel} Telah Diperbaiki (Resubmitted)`,
    variables: {
      documentNumber: params.documentNumber,
      assetName: params.assetName,
      applicantName: params.applicantName,
      approvalLink,
      moduleLabel,
    },
    fallbackSubject: `${target.note}[Revisi Terkirim] Pengajuan ${moduleLabel} ${params.documentNumber} Siap Ditinjau Ulang`,
    fallbackHtml: html,
    fallbackText: `Pengajuan ${moduleLabel} nomor ${params.documentNumber} (${params.assetName}) telah diperbaiki oleh ${params.applicantName} dan siap untuk ditinjau ulang di: ${approvalLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [target.to],
    eventType: 'asset.resubmitted',
    category: 'approval_requests',
    title: `Pengajuan Diperbaiki: ${params.documentNumber}`,
    body: `${params.applicantName} telah mengirim ulang perbaikan untuk "${params.assetName}".`,
    url: approvalLink,
  })
}

/**
 * 7. Kirim Notifikasi Pengajuan Perpanjangan Waktu Peminjaman ke Holder
 */
export async function sendAssetBorrowExtensionRequestedEmail(params: {
  holderEmail: string
  holderName: string
  borrowerName: string
  borrowNumber: string
  assetName: string
  newExpectedDate: string
  extensionReason: string
  borrowId: number
}) {
  const baseUrl = getPublicAppUrl()
  const detailLink = `${baseUrl}/dashboard/assets/borrow?id=${params.borrowId}`
  const target = await resolveTargetRecipients(params.holderEmail)

  const html = renderAssetBorrowEmailHtml({
    borrowNumber: params.borrowNumber,
    subjectTitle: `Permohonan Perpanjangan Waktu Peminjaman: ${params.assetName}`,
    badgeText: 'Perpanjangan Diminta',
    badgeBgColor: '#fef3c7',
    badgeTextColor: '#92400e',
    jobTitleInfo: 'Persetujuan Perpanjangan Waktu',
    borrowerName: params.borrowerName,
    assetName: params.assetName,
    holderName: params.holderName,
    notesTitle: 'Alasan Perpanjangan & Batas Waktu Baru',
    notesContent: `Batas Waktu Baru yang Diajukan: ${params.newExpectedDate}\nAlasan: ${params.extensionReason}`,
    ctaUrl: detailLink,
    ctaText: 'Buka Dokumen &amp; Tanggapi Perpanjangan &rarr;',
  })

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_borrow_extension_requested',
    templateName: 'Permohonan Perpanjangan Waktu Peminjaman Aset',
    variables: {
      borrowNumber: params.borrowNumber,
      assetName: params.assetName,
      borrowerName: params.borrowerName,
      newExpectedDate: params.newExpectedDate,
      extensionReason: params.extensionReason,
      detailLink,
    },
    fallbackSubject: `${target.note}[Perpanjangan] Peminjaman ${params.borrowNumber} - ${params.assetName} Meminta Tambahan Waktu`,
    fallbackHtml: html,
    fallbackText: `Yth. ${params.holderName},\n\nPeminjam (${params.borrowerName}) mengajukan perpanjangan batas pengembalian aset ${params.assetName} (${params.borrowNumber}) hingga ${params.newExpectedDate}.\nAlasan: ${params.extensionReason}\n\nSilakan tinjau di: ${detailLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [target.to],
    eventType: 'asset.extension_requested',
    category: 'approval_requests',
    title: `Perpanjangan Diminta: ${params.borrowNumber}`,
    body: `${params.borrowerName} meminta perpanjangan waktu pengembalian untuk aset "${params.assetName}".`,
    url: detailLink,
  })
}

/**
 * 8. Kirim Notifikasi Pengajuan Penghapusan Aset (Disposal) ke Approver Tahap Aktif
 */
export async function sendAssetDisposalSubmittedEmail(params: {
  approverEmail: string
  approverName: string
  approverJobTitle?: string | null
  applicantName: string
  disposalNumber: string
  assetName: string
  assetNumber?: string | null
  siteName: string
  departmentName: string
  notes?: string | null
  disposalId: number
  stepOrder: number
  totalSteps: number
}) {
  const baseUrl = getPublicAppUrl()
  const detailLink = `${baseUrl}/dashboard/assets/disposal?id=${params.disposalId}`
  const target = await resolveTargetRecipients(params.approverEmail)

  const html = renderAssetBorrowEmailHtml({
    borrowNumber: params.disposalNumber,
    subjectTitle: `Permohonan Penghapusan Aset (Disposal): ${params.assetName}`,
    badgeText: `Menunggu Persetujuan Tahap ${params.stepOrder} dari ${params.totalSteps}`,
    badgeBgColor: '#fee2e2',
    badgeTextColor: '#991b1b',
    jobTitleInfo: params.approverJobTitle || 'Pemeriksa Penghapusan Aset',
    borrowerName: params.applicantName,
    assetName: params.assetName,
    assetNumber: params.assetNumber,
    holderName: params.approverName,
    notesTitle: 'Alasan / Keterangan Penghapusan Unit',
    notesContent: params.notes || 'Penghapusan aset operasional / afkir / rusak',
    ctaUrl: detailLink,
    ctaText: 'Buka Dokumen &amp; Berikan Keputusan &rarr;',
  })

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_disposal_submitted',
    templateName: 'Permohonan Penghapusan Aset (Asset Disposal)',
    variables: {
      disposalNumber: params.disposalNumber,
      assetName: params.assetName,
      applicantName: params.applicantName,
      siteName: params.siteName,
      detailLink,
    },
    fallbackSubject: `${target.note}[Approval Disposal] Permohonan Penghapusan Aset ${params.disposalNumber} - ${params.assetName}`,
    fallbackHtml: html,
    fallbackText: `Yth. ${params.approverName},\n\nTerdapat permohonan penghapusan aset ${params.assetName} (${params.disposalNumber}) yang diajukan oleh ${params.applicantName}.\nLokasi: ${params.siteName} - ${params.departmentName}\n\nSilakan tinjau dan berikan persetujuan di: ${detailLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [target.to],
    eventType: 'asset.disposal_submitted',
    category: 'approval_requests',
    title: `Approval Disposal: ${params.disposalNumber}`,
    body: `${params.applicantName} mengajukan penghapusan aset "${params.assetName}" (${params.disposalNumber}).`,
    url: detailLink,
  })
}

/**
 * 9. Kirim Notifikasi Final Approved Penghapusan Aset (Disposal) ke Pemohon
 */
export async function sendAssetDisposalApprovedEmail(params: {
  applicantEmail: string
  applicantName: string
  disposalNumber: string
  assetName: string
  assetNumber?: string | null
  disposalId: number
  pdfUrl?: string | null
}) {
  const baseUrl = getPublicAppUrl()
  const detailLink = `${baseUrl}/dashboard/assets/disposal?id=${params.disposalId}`
  const target = await resolveTargetRecipients(params.applicantEmail)

  const html = renderAssetBorrowEmailHtml({
    borrowNumber: params.disposalNumber,
    subjectTitle: `Penghapusan Aset Disetujui Sepenuhnya: ${params.assetName}`,
    badgeText: 'Disetujui Sepenuhnya (Full Approved)',
    badgeBgColor: '#dcfce7',
    badgeTextColor: '#166534',
    jobTitleInfo: 'Pemberitahuan Hasil Persetujuan Direksi',
    borrowerName: params.applicantName,
    assetName: params.assetName,
    assetNumber: params.assetNumber,
    holderName: params.applicantName,
    notesTitle: 'Status Berkas & Pengarsipan',
    notesContent: 'Permohonan Asset Disposal telah disetujui hingga tahap Direktur. Dokumen Berita Acara resmi PDF telah diterbitkan.',
    ctaUrl: params.pdfUrl || detailLink,
    ctaText: params.pdfUrl ? 'Unduh Berita Acara PDF Resmi &rarr;' : 'Lihat Detail Penghapusan &rarr;',
  })

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'asset_disposal_approved',
    templateName: 'Persetujuan Final Penghapusan Aset (Asset Disposal)',
    variables: {
      disposalNumber: params.disposalNumber,
      assetName: params.assetName,
      detailLink,
    },
    fallbackSubject: `${target.note}[Disetujui] Penghapusan Aset ${params.disposalNumber} - ${params.assetName} Telah Disetujui`,
    fallbackHtml: html,
    fallbackText: `Yth. ${params.applicantName},\n\nPermohonan penghapusan aset ${params.assetName} (${params.disposalNumber}) telah disetujui sepenuhnya oleh Direktur.\n\nSilakan tinjau berkas resmi di: ${detailLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [target.to],
    eventType: 'asset.disposal_approved',
    category: 'approval_decisions',
    title: `Disposal Disetujui: ${params.disposalNumber}`,
    body: `Permohonan penghapusan aset "${params.assetName}" (${params.disposalNumber}) telah disetujui sepenuhnya.`,
    url: detailLink,
  })
}
