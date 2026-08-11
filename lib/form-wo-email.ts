import { sendWorkflowEmail } from "@/lib/workflow-email"
import { getFormWoNotificationConfigData } from "@/lib/hero-admin"

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
  tier?: 1 | 2 | 3
}) {
  let targetTo = params.approverEmail || ""
  let targetCc: string[] = []
  const currentTier = params.tier || 1

  try {
    const config = await getFormWoNotificationConfigData()
    if (config && config.isActive) {
      if (currentTier === 1 && config.tier1ApproverEmails) {
        targetTo = config.tier1ApproverEmails
      } else if (currentTier === 2 && config.tier2ApproverEmails) {
        targetTo = config.tier2ApproverEmails
      } else if (currentTier === 3 && config.tier3ApproverEmails) {
        targetTo = config.tier3ApproverEmails
      }
      if (config.ccEmails) {
        targetCc = config.ccEmails.split(",").map((e) => e.trim()).filter(Boolean)
      }
    }
  } catch (e) {
    console.error("Failed to load Form WO notification config:", e)
  }

  const finalTo = targetTo || params.approverEmail || process.env.WO_APPROVER_EMAIL || "approver@chitraparatama.com"
  const tierName = currentTier === 1 ? "Foreman / Supervisor Site" : currentTier === 2 ? "PJO / Project Manager" : "Head Office Manager"
  const finalApproverName = params.approverName || tierName

  return sendWorkflowEmail({
    to: finalTo,
    cc: targetCc.length > 0 ? targetCc : undefined,
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
      approvalLink: params.approvalLink ?? "https://hero.chitraparatama.co.id/dashboard/repair-retread/form-wo",
    },
    fallbackSubject: `[Form WO Tier ${currentTier}] Pengajuan Work Order Baru: ${params.noPengajuan}`,
    fallbackHtml: `Halo ${finalApproverName},<br><br><b>${params.pemohon}</b> telah mengajukan Form WO dengan nomor <b>${params.noPengajuan}</b> untuk customer <b>${params.customer ?? '-'}</b> (Tahap Approval: Tier ${currentTier} - ${tierName}). Silakan login ke sistem HERO untuk memproses approval.<br><br>Terima kasih.`,
    fallbackText: `Halo ${finalApproverName},\n\n${params.pemohon} telah mengajukan Form WO nomor ${params.noPengajuan} untuk customer ${params.customer ?? '-'} (Tahap Approval: Tier ${currentTier} - ${tierName}). Silakan login ke sistem HERO untuk memproses approval.\n\nTerima kasih.`,
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
  let targetCc = params.ccEmails || []
  try {
    const config = await getFormWoNotificationConfigData()
    if (config && config.isActive && config.ccEmails) {
      const dbCc = config.ccEmails.split(",").map((e) => e.trim()).filter(Boolean)
      targetCc = Array.from(new Set([...targetCc, ...dbCc]))
    }
  } catch (e) {
    // fallback
  }

  return sendWorkflowEmail({
    to: params.requesterEmail,
    cc: targetCc.length > 0 ? targetCc : undefined,
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
  return sendWorkflowEmail({
    to: params.requesterEmail,
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
