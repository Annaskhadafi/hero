import { sendWorkflowEmail } from "@/lib/workflow-email"
import { getFormWoNotificationConfigData } from "@/lib/hero-admin"
import { generateFormWoPdf, type FormWoPdfData } from "@/lib/form-wo-pdf"

// Testing safeguard email
const TESTING_EMAIL_OVERRIDE = null

export async function sendFormWoApprovalRequestEmail(params: {
  approverEmail?: string
  approverName?: string
  pemohon: string
  noPengajuan: string
  customer?: string
  site?: string
  jobType?: string
  tireSn?: string
  brand?: string
  size?: string
  totalAmount?: string
  catatanPengajuan?: string
  approvalLink?: string
  tier?: 1 | 2 | 3 | 4 | 5
  ccEmails?: string[]
}) {
  const currentTier = params.tier || 1
  const tierName =
    currentTier === 1
      ? "Foreman / Supervisor Site"
      : currentTier === 2
        ? "PJO / Project Manager"
        : "Head Office Manager"
  const cfg = await getFormWoNotificationConfigData().catch(() => null)
  const tierConfigEmails =
    currentTier === 1
      ? cfg?.tier1ApproverEmails
      : currentTier === 2
        ? cfg?.tier2ApproverEmails
        : cfg?.tier3ApproverEmails

  const finalApproverName = params.approverName || "Approver"
  const targetApprovalLink =
    params.approvalLink ||
    "https://hero.chitraparatama.co.id/dashboard/approval"

  const recipients = Array.from(
    new Set(
      [
        params.approverEmail,
        tierConfigEmails && tierConfigEmails.length > 0 ? tierConfigEmails[0] : null,
      ].filter(Boolean) as string[]
    )
  )

  if (recipients.length === 0) {
    return { success: false, message: 'No valid recipient email configured for Form WO approval.' }
  }

  const validCcEmails = params.ccEmails && params.ccEmails.length > 0
    ? Array.from(new Set(params.ccEmails.filter(Boolean)))
    : undefined

  return sendWorkflowEmail({
    to: recipients,
    cc: validCcEmails,
    templateCode: "form_wo_approval_request",
    variables: {
      approverName: finalApproverName,
      noPengajuan: params.noPengajuan,
      pemohon: params.pemohon,
      customer: params.customer ?? "-",
      site: params.site ?? "-",
      jobType: params.jobType ?? "-",
      tireSn: params.tireSn ?? "-",
      brand: params.brand ?? "-",
      size: params.size ?? "-",
      totalAmount: params.totalAmount ?? "-",
      catatanPengajuan: params.catatanPengajuan ?? "-",
      approvalLink: targetApprovalLink,
    },
    fallbackSubject: `[Form WO Tier ${currentTier}] Pengajuan Work Order Baru: ${params.noPengajuan}`,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
  <div style="background:#2563eb;padding:16px 20px;border-radius:8px 8px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;">HERO &bull; Form Work Order</h2>
    <p style="color:#bfdbfe;margin:4px 0 0;font-size:12px;">Persetujuan Dokumen Form WO (Tier ${currentTier} - ${tierName})</p>
  </div>
  <div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;">
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">
      Yth. <b>${finalApproverName}</b>,<br>
      <b>${params.pemohon}</b> telah mengajukan Form Work Order baru yang membutuhkan persetujuan Anda:
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155;margin-bottom:20px;">
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-weight:600;width:130px;color:#64748b;">No. Pengajuan</td>
        <td style="padding:8px 0;font-weight:700;color:#0f172a;">${params.noPengajuan}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-weight:600;color:#64748b;">Pemohon</td>
        <td style="padding:8px 0;">${params.pemohon}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-weight:600;color:#64748b;">Customer / Site</td>
        <td style="padding:8px 0;">${params.customer ?? '-'} / ${params.site ?? '-'}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-weight:600;color:#64748b;">Jenis Pekerjaan</td>
        <td style="padding:8px 0;">${params.jobType ?? '-'}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-weight:600;color:#64748b;">Serial Number</td>
        <td style="padding:8px 0;">${params.tireSn ?? '-'} (${params.brand ?? '-'} ${params.size ?? '-'})</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-weight:600;color:#64748b;">Total Biaya</td>
        <td style="padding:8px 0;font-weight:700;color:#059669;">${params.totalAmount ?? '-'}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:600;color:#64748b;vertical-align:top;">Catatan</td>
        <td style="padding:8px 0;">${params.catatanPengajuan ?? '-'}</td>
      </tr>
    </table>
    <div style="text-align:center;margin:28px 0 16px 0;">
      <a href="${targetApprovalLink}" style="background-color:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 2px 4px rgba(37,99,235,0.25);">
        Buka Inbox Approval &amp; Review Dokumen &rarr;
      </a>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;">
      Jika tombol di atas tidak dapat diklik, buka tautan berikut:<br>
      <a href="${targetApprovalLink}" style="color:#2563eb;">${targetApprovalLink}</a>
    </p>
  </div>
</div>`,
    fallbackText: `Halo ${finalApproverName},\n\n${params.pemohon} telah mengajukan Form WO nomor ${params.noPengajuan} untuk customer ${params.customer ?? '-'} (Tahap Approval: Tier ${currentTier} - ${tierName}).\n\nBuka Inbox Approval untuk memproses persetujuan:\n${targetApprovalLink}\n\nTerima kasih.`,
  })
}

export async function sendFormWoStatusApprovedEmail(params: {
  requesterEmail: string
  pemohon: string
  noPengajuan: string
  noWoTerbit?: string
  customer?: string
  site?: string
  jobType?: string
  totalAmount?: string
  ccEmails?: string[]
}) {
  const recipients = Array.from(
    new Set([params.requesterEmail].filter(Boolean) as string[])
  )

  if (recipients.length === 0) return { success: false, message: 'No recipient email' }

  return sendWorkflowEmail({
    to: recipients,
    templateCode: "form_wo_status_approved",
    variables: {
      pemohon: params.pemohon,
      noPengajuan: params.noPengajuan,
      noWoTerbit: params.noWoTerbit ?? "-",
      customer: params.customer ?? "-",
      site: params.site ?? "-",
      jobType: params.jobType ?? "-",
      totalAmount: params.totalAmount ?? "-",
    },
    fallbackSubject: `[Form WO Disetujui] Pengajuan WO ${params.noPengajuan} Disetujui`,
    fallbackHtml: `Halo ${params.pemohon},<br><br>Pengajuan Form WO Anda dengan nomor tiket <b>${params.noPengajuan}</b> telah <b>DISETUJUI</b> (WO Terbit: <b>${params.noWoTerbit ?? '-'}</b>).<br><br>Terima kasih.`,
    fallbackText: `Halo ${params.pemohon},\n\nPengajuan Form WO Anda nomor ${params.noPengajuan} telah DISETUJUI (WO Terbit: ${params.noWoTerbit ?? '-'}).\n\nTerima kasih.`,
  })
}

export async function sendFormWoStatusRejectedEmail(params: {
  requesterEmail: string
  pemohon: string
  noPengajuan: string
  catatanPengajuan?: string
}) {
  const recipients = Array.from(
    new Set([params.requesterEmail].filter(Boolean) as string[])
  )

  if (recipients.length === 0) return { success: false, message: 'No recipient email' }

  return sendWorkflowEmail({
    to: recipients,
    templateCode: "form_wo_status_rejected",
    variables: {
      pemohon: params.pemohon,
      noPengajuan: params.noPengajuan,
      catatanPengajuan: params.catatanPengajuan ?? "-",
    },
    fallbackSubject: `[Form WO Ditolak] Pengajuan WO ${params.noPengajuan} Ditolak`,
    fallbackHtml: `Halo ${params.pemohon},<br><br>Pengajuan Form WO Anda dengan nomor <b>${params.noPengajuan}</b> telah <b>DITOLAK</b> dengan alasan:<br><i>${params.catatanPengajuan ?? '-'}</i><br><br>Terima kasih.`,
    fallbackText: `Halo ${params.pemohon},\n\nPengajuan Form WO Anda nomor ${params.noPengajuan} telah DITOLAK dengan alasan:\n${params.catatanPengajuan ?? '-'}\n\nTerima kasih.`,
  })
}

export async function sendFormWoStatusRevertedEmail(params: {
  requesterEmail: string
  pemohon: string
  noPengajuan: string
  catatanRevisi?: string
  revisiLink?: string
  ccEmails?: string[]
}) {
  const recipients = Array.from(
    new Set([params.requesterEmail].filter(Boolean) as string[])
  )

  if (recipients.length === 0) return { success: false, message: 'No recipient email' }

  const validCcEmails = params.ccEmails && params.ccEmails.length > 0
    ? Array.from(new Set(params.ccEmails.filter(Boolean)))
    : undefined

  return sendWorkflowEmail({
    to: recipients,
    cc: validCcEmails,
    templateCode: "form_wo_status_reverted",
    variables: {
      pemohon: params.pemohon,
      noPengajuan: params.noPengajuan,
      catatanRevisi: params.catatanRevisi ?? "-",
      revisiLink:
        params.revisiLink ??
        "https://hero.chitraparatama.co.id/dashboard/repair-retread/form-wo",
    },
    fallbackSubject: `[Form WO Perlu Revisi / Revert] Pengajuan WO ${params.noPengajuan} Perlu Diperbaiki`,
    fallbackHtml: `Halo ${params.pemohon},<br><br>Pengajuan Form WO Anda dengan nomor <b>${params.noPengajuan}</b> telah dikembalikan oleh approver untuk dilakukan <b>REVISI (Revert)</b>.<br><br><b>Catatan Revisi dari Approver:</b><br><i>${params.catatanRevisi ?? '-'}</i><br><br>Silakan buka sistem HERO pada menu <b>Form WO</b> untuk mengedit dan merevisi data form tanpa perlu mengajukan dari awal.<br><br>Terima kasih.`,
    fallbackText: `Halo ${params.pemohon},\n\nPengajuan Form WO Anda nomor ${params.noPengajuan} telah dikembalikan oleh approver untuk dilakukan REVISI (Revert).\n\nCatatan Revisi dari Approver:\n${params.catatanRevisi ?? '-'}\n\nSilakan buka sistem HERO pada menu Form WO untuk mengedit dan merevisi data form tanpa perlu mengajukan dari awal.\n\nTerima kasih.`,
  })
}

export async function sendFormWoBillingApprovedEmail(params: {
  requesterEmail: string
  pemohon: string
  noPengajuan: string
  customer?: string
  site?: string
  jobType?: string
  totalAmount?: string
}) {
  const recipients = Array.from(
    new Set([params.requesterEmail].filter(Boolean) as string[])
  )

  if (recipients.length === 0) return { success: false, message: 'No recipient email' }

  return sendWorkflowEmail({
    to: recipients,
    templateCode: "form_wo_billing_approved",
    variables: {
      pemohon: params.pemohon,
      noPengajuan: params.noPengajuan,
      customer: params.customer ?? "-",
      site: params.site ?? "-",
      jobType: params.jobType ?? "-",
      totalAmount: params.totalAmount ?? "-",
    },
    fallbackSubject: `[Form WO Billing Disetujui] Pengajuan WO ${params.noPengajuan} Telah Disetujui Team Billing (Step 4)`,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
  <div style="background:#0284c7;padding:16px 20px;border-radius:8px 8px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;">HERO &bull; Form Work Order</h2>
    <p style="color:#e0f2fe;margin:4px 0 0;font-size:12px;">Team Billing Approval Selesai (Step 4)</p>
  </div>
  <div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;">
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">
      Halo <b>${params.pemohon}</b>,<br>
      Pengajuan Form Work Order Anda dengan nomor <b>${params.noPengajuan}</b> telah <b>disetujui oleh Team Billing (Step 4)</b>.
    </p>
    <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0 0 16px;">
      Saat ini pengajuan telah diteruskan ke tahap persetujuan akhir oleh <b>Inventory &amp; Warehouse Management SPV (Step 5)</b>. Anda akan menerima notifikasi kembali saat proses approval final selesai dan nomor WO telah diterbitkan.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155;margin-bottom:16px;">
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:6px 0;font-weight:600;width:130px;color:#64748b;">Customer / Site</td>
        <td style="padding:6px 0;">${params.customer ?? '-'} / ${params.site ?? '-'}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:6px 0;font-weight:600;color:#64748b;">Pekerjaan</td>
        <td style="padding:6px 0;">${params.jobType ?? '-'}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-weight:600;color:#64748b;">Total Amount</td>
        <td style="padding:6px 0;font-weight:700;color:#059669;">${params.totalAmount ?? '-'}</td>
      </tr>
    </table>
    <p style="font-size:12px;color:#94a3b8;margin:20px 0 0;border-top:1px solid #e2e8f0;padding-top:12px;">
      Status terkini dapat dilihat pada sistem HERO di menu Form WO.
    </p>
  </div>
</div>`,
    fallbackText: `Halo ${params.pemohon},\n\nPengajuan Form WO nomor ${params.noPengajuan} telah DISETUJUI oleh Team Billing (Step 4).\nSaat ini pengajuan diteruskan ke tahap persetujuan akhir oleh Inventory & Warehouse Management SPV (Step 5).\n\nTerima kasih.`,
  })
}

export async function sendFormWoReadyForWoNumberEmail(params: {
  billingEmail?: string
  noPengajuan: string
  pemohon: string
  customer?: string
  site?: string
  jobType?: string
  totalAmount?: string
  inputWoLink?: string
}) {
  const targetLink =
    params.inputWoLink ||
    "https://hero.chitraparatama.co.id/dashboard/repair-retread/form-wo"

  const recipients = Array.from(
    new Set([params.billingEmail].filter(Boolean) as string[])
  )

  if (recipients.length === 0) return { success: false, message: 'No recipient email' }

  return sendWorkflowEmail({
    to: recipients,
    templateCode: "form_wo_ready_for_wo_number",
    variables: {
      noPengajuan: params.noPengajuan,
      pemohon: params.pemohon,
      customer: params.customer ?? "-",
      site: params.site ?? "-",
      jobType: params.jobType ?? "-",
      totalAmount: params.totalAmount ?? "-",
      inputWoLink: targetLink,
    },
    fallbackSubject: `[Form WO Siap Terbit] Silakan Terbitkan Nomor WO untuk: ${params.noPengajuan}`,
    fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
  <div style="background:#059669;padding:16px 20px;border-radius:8px 8px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;">HERO &bull; Form Work Order</h2>
    <p style="color:#d1fae5;margin:4px 0 0;font-size:12px;">Persetujuan Final Selesai &bull; Siap Terbit Nomor WO</p>
  </div>
  <div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;">
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">
      Halo <b>Team Billing</b>,<br>
      Form Work Order nomor <b>${params.noPengajuan}</b> telah <b>disetujui lengkap oleh Inventory &amp; Warehouse Management SPV (Step 5)</b>.
    </p>
    <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0 0 16px;">
      Silakan klik tombol di bawah ini untuk menerbitkan dan mengisi <b>Nomor WO Resmi</b> pada sistem HERO:
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155;margin-bottom:20px;">
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:6px 0;font-weight:600;width:130px;color:#64748b;">No. Pengajuan</td>
        <td style="padding:6px 0;font-weight:700;color:#0f172a;">${params.noPengajuan}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:6px 0;font-weight:600;color:#64748b;">Pemohon</td>
        <td style="padding:6px 0;">${params.pemohon}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:6px 0;font-weight:600;color:#64748b;">Customer / Site</td>
        <td style="padding:6px 0;">${params.customer ?? '-'} / ${params.site ?? '-'}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:6px 0;font-weight:600;color:#64748b;">Jenis Pekerjaan</td>
        <td style="padding:6px 0;">${params.jobType ?? '-'}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-weight:600;color:#64748b;">Total Amount</td>
        <td style="padding:6px 0;font-weight:700;color:#059669;">${params.totalAmount ?? '-'}</td>
      </tr>
    </table>
    <div style="text-align:center;margin:28px 0 16px 0;">
      <a href="${targetLink}" style="background-color:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 2px 4px rgba(5,150,105,0.25);">
        Isi Nomor WO Resmi Sekarang &rarr;
      </a>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;">
      Atau buka menu Form WO: <a href="${targetLink}" style="color:#059669;">${targetLink}</a>
    </p>
  </div>
</div>`,
    fallbackText: `Halo Team Billing,\n\nForm WO nomor ${params.noPengajuan} untuk ${params.customer ?? '-'} telah disetujui lengkap oleh Inventory & Warehouse Management SPV (Step 5).\n\nSilakan isi Nomor WO pada sistem:\n${targetLink}\n\nTerima kasih.`,
  })
}

export async function sendFormWoCompletedWithPdfEmail(params: {
  recipients?: Array<{ email: string; roleName: string }>
  adminCpSiteEmail?: string
  qcLeaderEmail?: string
  pemohon: string
  noPengajuan: string
  noWoTerbit: string
  noPo?: string
  customer?: string
  site?: string
  jobType?: string
  totalAmount?: string
  pdfData: FormWoPdfData
}) {
  const pdfBuffer = await generateFormWoPdf(params.pdfData).catch((err) => {
    console.error('Failed to generate Form WO PDF for email:', err)
    return null
  })

  const attachments = pdfBuffer
    ? [
        {
          filename: `Form_WO_${params.noPengajuan.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ]
    : undefined

  const sendForRecipient = async (recipientEmail: string, roleName: string) => {
    return sendWorkflowEmail({
      to: recipientEmail,
      templateCode: 'form_wo_final_completed_pdf',
      variables: {
        recipientRole: roleName,
        pemohon: params.pemohon,
        noPengajuan: params.noPengajuan,
        noWoTerbit: params.noWoTerbit,
        noPo: params.noPo ?? '-',
        customer: params.customer ?? '-',
        site: params.site ?? '-',
        jobType: params.jobType ?? '-',
        totalAmount: params.totalAmount ?? '-',
      },
      fallbackSubject: `[Form WO Resmi Terbit] ${params.noPengajuan} - WO CP: ${params.noWoTerbit} (${roleName})`,
      fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
  <div style="background:#0f766e;padding:16px 20px;border-radius:8px 8px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;">HERO &bull; Form Work Order</h2>
    <p style="color:#ccfbf1;margin:4px 0 0;font-size:12px;">Dokumen Resmi Form WO Lengkap Diterbitkan</p>
  </div>
  <div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;">
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">
      Yth. <b>${roleName}</b>,<br>
      Nomor WO Resmi untuk pengajuan <b>${params.noPengajuan}</b> telah diisi dan diterbitkan oleh Team Billing:
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155;margin-bottom:20px;">
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-weight:600;width:130px;color:#64748b;">No. Pengajuan</td>
        <td style="padding:8px 0;font-weight:700;color:#0f172a;">${params.noPengajuan}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;background:#f0fdf4;">
        <td style="padding:8px 6px;font-weight:700;color:#15803d;">Nomor WO CP</td>
        <td style="padding:8px 6px;font-weight:800;color:#15803d;font-size:14px;">${params.noWoTerbit}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;background:#eff6ff;">
        <td style="padding:8px 6px;font-weight:700;color:#1d4ed8;">Nomor PO</td>
        <td style="padding:8px 6px;font-weight:700;color:#1d4ed8;">${params.noPo ?? '-'}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-weight:600;color:#64748b;">Pemohon</td>
        <td style="padding:8px 0;">${params.pemohon}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-weight:600;color:#64748b;">Customer / Site</td>
        <td style="padding:8px 0;">${params.customer ?? '-'} / ${params.site ?? '-'}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-weight:600;color:#64748b;">Jenis Pekerjaan</td>
        <td style="padding:8px 0;">${params.jobType ?? '-'}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:600;color:#64748b;">Total Biaya</td>
        <td style="padding:8px 0;font-weight:700;color:#059669;">${params.totalAmount ?? '-'}</td>
      </tr>
    </table>
    <div style="background:#f1f5f9;padding:12px 16px;border-radius:6px;font-size:12px;color:#475569;margin-bottom:16px;">
      📎 <b>Lampiran Dokumen:</b> File PDF Form WO lengkap beserta nomor PO, nomor WO, dan seluruh tanda tangan digital telah dilampirkan pada email ini.
    </div>
    <div style="text-align:center;margin:20px 0 10px 0;">
      <a href="https://hero.chitraparatama.co.id/dashboard/repair-retread/form-wo" style="background-color:#0f766e;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 2px 4px rgba(15,118,110,0.25);">
        Buka Dashboard Form WO &rarr;
      </a>
    </div>
  </div>
</div>`,
      fallbackText: `Halo ${roleName},\n\nNomor WO resmi untuk pengajuan Form WO ${params.noPengajuan} telah diterbitkan oleh Team Billing.\n\nNo. WO CP: ${params.noWoTerbit}\nNo. PO: ${params.noPo ?? '-'}\nCustomer: ${params.customer ?? '-'}\nSite: ${params.site ?? '-'}\nTotal Amount: ${params.totalAmount ?? '-'}\n\nDokumen PDF Form WO lengkap telah dilampirkan.\n\nTerima kasih.`,
      attachments,
    })
  }

  const targetRecipients: Array<{ email: string; roleName: string }> = []
  if (params.recipients && params.recipients.length > 0) {
    targetRecipients.push(...params.recipients)
  }
  if (params.adminCpSiteEmail && params.adminCpSiteEmail.trim()) {
    targetRecipients.push({ email: params.adminCpSiteEmail.trim(), roleName: 'Pemohon' })
  }
  if (params.qcLeaderEmail && params.qcLeaderEmail.trim()) {
    targetRecipients.push({ email: params.qcLeaderEmail.trim(), roleName: 'QC / Leader' })
  }

  const seenEmails = new Set<string>()
  const uniqueRecipients = targetRecipients.filter((r) => {
    if (!r.email || seenEmails.has(r.email.toLowerCase())) return false
    seenEmails.add(r.email.toLowerCase())
    return true
  })

  const promises = uniqueRecipients.map((r) => sendForRecipient(r.email, r.roleName))
  const results = await Promise.all(promises)
  return results[0] ?? { success: true }
}

