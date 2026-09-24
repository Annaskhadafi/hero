import { sendWorkflowEmail } from "@/lib/workflow-email"
import { getPublicAppUrl } from "@/lib/auth-config"

export function resolveApdCategoryBadge(requestType?: string): string {
  const upper = (requestType || "").trim().toUpperCase()
  if (upper === "MATERIAL" || upper.includes("MATERIAL")) return "MATERIAL"
  if (upper === "TOOLS" || upper.includes("TOOL")) return "TOOLS"
  return "APD"
}

export async function sendApdRequestSubmittedEmail(params: {
  employeeName: string
  requestNumber: string
  approverEmail: string
  approverName: string
  requestType: string
  ccEmails?: string[]
}) {
  const baseUrl = getPublicAppUrl()
  const approvalLink = `${baseUrl}/dashboard/approval`
  const categoryBadge = resolveApdCategoryBadge(params.requestType)

  return sendWorkflowEmail({
    to: params.approverEmail,
    cc: params.ccEmails,
    templateCode: "apd_request_submitted",
    variables: {
      employeeName: params.employeeName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
      categoryBadge,
      approvalLink,
      approvalUrl: approvalLink,
      actionUrl: approvalLink,
      viewLink: approvalLink,
    },
    fallbackSubject: `Permohonan ${params.requestType} Baru: ${params.requestNumber} - ${params.employeeName}`,
    fallbackHtml: `Yth. ${params.approverName},<br><br>Karyawan <b>${params.employeeName}</b> telah mengajukan permohonan <b>${params.requestType}</b> dengan nomor permohonan <b>${params.requestNumber}</b> yang memerlukan peninjauan dan persetujuan Anda.<br><br><b>Detail Permohonan:</b><br>No. Permohonan: ${params.requestNumber}<br>Kategori: ${params.requestType}<br>Pemohon: ${params.employeeName}<br><br>Silakan buka tautan berikut untuk melakukan review dan memberikan persetujuan:<br><div style="margin: 16px 0;"><a href="${approvalLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Buka Inbox Approval</a></div><br><small style="color: #64748b;">Atau salin tautan: <a href="${approvalLink}">${approvalLink}</a></small><br><br>Demikian pemberitahuan ini disampaikan. Terima kasih.`,
    fallbackText: `Yth. ${params.approverName},\n\nKaryawan ${params.employeeName} telah mengajukan permohonan ${params.requestType} dengan nomor permohonan ${params.requestNumber} yang memerlukan peninjauan dan persetujuan Anda.\n\nDetail Permohonan:\nNo. Permohonan: ${params.requestNumber}\nKategori: ${params.requestType}\nPemohon: ${params.employeeName}\n\nSilakan tinjau dan berikan persetujuan melalui tautan berikut:\n${approvalLink}\n\nDemikian pemberitahuan ini disampaikan. Terima kasih.`,
  })
}

export async function sendMaterialToolsRequestSubmittedEmail(params: {
  employeeName: string
  requestNumber: string
  approverEmail: string
  approverName: string
  requestType: string
  sectionName?: string
  ccEmails?: string[]
}) {
  const baseUrl = getPublicAppUrl()
  const approvalLink = `${baseUrl}/dashboard/approval`
  const cc = params.ccEmails ?? ['muhammad.akbar@chitraparatama.co.id']
  const categoryBadge = resolveApdCategoryBadge(params.requestType)

  return sendWorkflowEmail({
    to: params.approverEmail,
    cc,
    templateCode: "material_tools_request_submitted",
    variables: {
      employeeName: params.employeeName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
      categoryBadge,
      sectionName: params.sectionName ?? "-",
      approvalLink,
      approvalUrl: approvalLink,
      actionUrl: approvalLink,
      viewLink: approvalLink,
    },
    fallbackSubject: `[${params.requestType}] Permohonan Baru: ${params.requestNumber} - ${params.employeeName}`,
    fallbackHtml: `Yth. ${params.approverName},<br><br>Karyawan <b>${params.employeeName}</b> (Section: ${params.sectionName ?? "-"}) telah mengajukan permohonan <b>${params.requestType}</b> dengan nomor tiket <b>${params.requestNumber}</b> yang memerlukan persetujuan Anda sebagai Section Head.<br><br><b>Detail Permohonan:</b><br>No. Permohonan: ${params.requestNumber}<br>Kategori: ${params.requestType}<br>Pemohon: ${params.employeeName}<br>Section: ${params.sectionName ?? "-"}<br><br>Silakan buka tautan berikut untuk melakukan review dan memberikan persetujuan:<br><div style="margin: 16px 0;"><a href="${approvalLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Buka Inbox Approval</a></div><br><small style="color: #64748b;">Atau salin tautan: <a href="${approvalLink}">${approvalLink}</a></small><br><br>Demikian pemberitahuan ini disampaikan. Terima kasih.`,
    fallbackText: `Yth. ${params.approverName},\n\nKaryawan ${params.employeeName} (Section: ${params.sectionName ?? "-"}) telah mengajukan permohonan ${params.requestType} dengan nomor tiket ${params.requestNumber} yang memerlukan persetujuan Anda sebagai Section Head.\n\nDetail Permohonan:\nNo. Permohonan: ${params.requestNumber}\nKategori: ${params.requestType}\nPemohon: ${params.employeeName}\nSection: ${params.sectionName ?? "-"}\n\nSilakan review dan berikan persetujuan melalui tautan berikut:\n${approvalLink}\n\nDemikian pemberitahuan ini disampaikan. Terima kasih.`,
  })
}

export async function sendMaterialToolsApprovedEmail(params: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  approverName: string
  requestType: string
  sectionName?: string
  requestId?: number
  ccEmails?: string[]
}) {
  const baseUrl = getPublicAppUrl()
  const dashboardLink = `${baseUrl}/dashboard/apd`
  const cc = params.ccEmails ?? ["muhammad.akbar@chitraparatama.co.id"]
  const categoryBadge = resolveApdCategoryBadge(params.requestType)

  return sendWorkflowEmail({
    to: params.requesterEmail,
    cc,
    templateCode: "material_tools_request_approved",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
      categoryBadge,
      sectionName: params.sectionName ?? "-",
      dashboardLink,
      approvalLink: dashboardLink,
      viewLink: dashboardLink,
      actionUrl: dashboardLink,
    },
    fallbackSubject: `[${params.requestType}] Permohonan Disetujui: ${params.requestNumber}`,
    fallbackHtml: `Yth. ${params.requesterName},<br><br>Permohonan <b>${params.requestType}</b> Anda dengan nomor tiket <b>${params.requestNumber}</b> telah <b>DISETUJUI</b> oleh Section Head (${params.approverName}).<br><br><b>Detail Permohonan:</b><br>No. Permohonan: ${params.requestNumber}<br>Kategori: ${params.requestType}<br>Disetujui Oleh: ${params.approverName}<br>Status: DISETUJUI<br><br>Lihat status permohonan di dashboard:<br><div style="margin: 16px 0;"><a href="${dashboardLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Lihat Permohonan</a></div><br><small style="color: #64748b;">Atau salin tautan: <a href="${dashboardLink}">${dashboardLink}</a></small><br><br>Demikian pemberitahuan ini disampaikan. Terima kasih.`,
    fallbackText: `Yth. ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} telah DISETUJUI oleh Section Head (${params.approverName}).\n\nDetail Permohonan:\nNo. Permohonan: ${params.requestNumber}\nKategori: ${params.requestType}\nDisetujui Oleh: ${params.approverName}\nStatus: DISETUJUI\n\nLihat status permohonan:\n${dashboardLink}\n\nDemikian pemberitahuan ini disampaikan. Terima kasih.`,
  })
}

export async function sendApdLevelApprovedEmail(params: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  approverName: string
  requestType: string
  currentLevelLabel: string
  nextLevelLabel: string | null
  ccEmails?: string[]
  requestId?: number
}) {
  const baseUrl = getPublicAppUrl()
  const dashboardLink = `${baseUrl}/dashboard/apd`
  const approvalLink = `${baseUrl}/dashboard/approval`
  const isFinal = !params.nextLevelLabel
  const categoryBadge = resolveApdCategoryBadge(params.requestType)
  const statusText = isFinal
    ? `telah <b>DISETUJUI SEPENUHNYA</b> oleh ${params.approverName} pada tahap <b>${params.currentLevelLabel}</b>.`
    : `telah disetujui pada tahap <b>${params.currentLevelLabel}</b> oleh ${params.approverName} dan sedang menunggu persetujuan pada tahap <b>${params.nextLevelLabel}</b>.`

  return sendWorkflowEmail({
    to: params.requesterEmail,
    cc: params.ccEmails,
    templateCode: "apd_request_approved",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
      categoryBadge,
      currentLevelLabel: params.currentLevelLabel,
      nextLevelLabel: params.nextLevelLabel ?? '',
      isFinal: String(isFinal),
      dashboardLink,
      approvalLink: isFinal ? dashboardLink : approvalLink,
      viewLink: dashboardLink,
      actionUrl: dashboardLink,
    },
    fallbackSubject: `[${params.requestType}] Tahap ${params.currentLevelLabel} Disetujui: ${params.requestNumber}`,
    fallbackHtml: `Yth. ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor tiket <b>${params.requestNumber}</b> ${statusText}<br><br><div style="margin: 16px 0;"><a href="${dashboardLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Lihat Status Permohonan</a></div><br><small style="color: #64748b;">Atau salin tautan: <a href="${dashboardLink}">${dashboardLink}</a></small><br><br>Demikian pemberitahuan ini disampaikan. Terima kasih.`,
    fallbackText: `Yth. ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} ${statusText.replace(/<[^>]*>/g, '')}\n\nLihat status permohonan:\n${dashboardLink}\n\nDemikian pemberitahuan ini disampaikan. Terima kasih.`,
  })
}

export async function sendApdNextApproverEmail(params: {
  nextApproverEmail: string
  nextApproverName: string
  requesterName: string
  requestNumber: string
  requestType: string
  currentLevelLabel: string
  ccEmails?: string[]
}) {
  const baseUrl = getPublicAppUrl()
  const approvalLink = `${baseUrl}/dashboard/approval`
  const categoryBadge = resolveApdCategoryBadge(params.requestType)

  return sendWorkflowEmail({
    to: params.nextApproverEmail,
    cc: params.ccEmails,
    templateCode: "apd_request_submitted",
    variables: {
      nextApproverName: params.nextApproverName,
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      requestType: params.requestType,
      categoryBadge,
      currentLevelLabel: params.currentLevelLabel,
      approvalLink,
      approvalUrl: approvalLink,
      actionUrl: approvalLink,
      viewLink: approvalLink,
    },
    fallbackSubject: `[${params.requestType}] Review Diperlukan: ${params.requestNumber}`,
    fallbackHtml: `Yth. ${params.nextApproverName},<br><br>Permohonan <b>${params.requestType}</b> dari <b>${params.requesterName}</b> dengan nomor tiket <b>${params.requestNumber}</b> telah disetujui pada tahap sebelumnya dan memerlukan persetujuan Anda pada tahap <b>${params.currentLevelLabel}</b>.<br><br>Silakan buka tautan berikut untuk melakukan review dan persetujuan:<br><div style="margin: 16px 0;"><a href="${approvalLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Buka Inbox Approval</a></div><br><small style="color: #64748b;">Atau salin tautan: <a href="${approvalLink}">${approvalLink}</a></small><br><br>Demikian pemberitahuan ini disampaikan. Terima kasih.`,
    fallbackText: `Yth. ${params.nextApproverName},\n\nPermohonan ${params.requestType} dari ${params.requesterName} dengan nomor tiket ${params.requestNumber} telah disetujui pada tahap sebelumnya dan memerlukan persetujuan Anda pada tahap ${params.currentLevelLabel}.\n\nSilakan review dan setujui melalui tautan berikut:\n${approvalLink}\n\nDemikian pemberitahuan ini disampaikan. Terima kasih.`,
  })
}

export async function sendApdRequestApprovedEmail(params: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  approverName: string
  requestType: string
  ccEmails?: string[]
  requestId?: number
}) {
  const baseUrl = getPublicAppUrl()
  const dashboardLink = `${baseUrl}/dashboard/apd`
  const categoryBadge = resolveApdCategoryBadge(params.requestType)

  return sendWorkflowEmail({
    to: params.requesterEmail,
    cc: params.ccEmails,
    templateCode: "apd_request_approved",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
      categoryBadge,
      dashboardLink,
      approvalLink: dashboardLink,
      viewLink: dashboardLink,
      actionUrl: dashboardLink,
    },
    fallbackSubject: `Permohonan ${params.requestType} Disetujui: ${params.requestNumber}`,
    fallbackHtml: `Yth. ${params.requesterName},<br><br>Permohonan APD Anda dengan nomor permohonan <b>${params.requestNumber}</b> telah <b>DISETUJUI</b> oleh ${params.approverName}.<br><br><b>Detail Permohonan:</b><br>No. Permohonan: ${params.requestNumber}<br>Kategori: ${params.requestType}<br>Disetujui Oleh: ${params.approverName}<br>Status: DISETUJUI<br><br>Demikian pemberitahuan ini disampaikan. Terima kasih.`,
    fallbackText: `Yth. ${params.requesterName},\n\nPermohonan APD Anda dengan nomor permohonan ${params.requestNumber} telah DISETUJUI oleh ${params.approverName}.\n\nDetail Permohonan:\nNo. Permohonan: ${params.requestNumber}\nKategori: ${params.requestType}\nDisetujui Oleh: ${params.approverName}\nStatus: DISETUJUI\n\nDemikian pemberitahuan ini disampaikan. Terima kasih.`,
  })
}

export async function sendApdRequestRejectedEmail(params: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  approverName: string
  reason: string
  requestType: string
  ccEmails?: string[]
}) {
  const baseUrl = getPublicAppUrl()
  const dashboardLink = `${baseUrl}/dashboard/apd`
  const categoryBadge = resolveApdCategoryBadge(params.requestType)

  return sendWorkflowEmail({
    to: params.requesterEmail,
    cc: params.ccEmails,
    templateCode: "apd_request_rejected",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      reason: params.reason,
      requestType: params.requestType,
      categoryBadge,
      dashboardLink,
      approvalLink: dashboardLink,
      viewLink: dashboardLink,
      actionUrl: dashboardLink,
    },
    fallbackSubject: `Permohonan ${params.requestType} Ditolak: ${params.requestNumber}`,
    fallbackHtml: `Yth. ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor permohonan <b>${params.requestNumber}</b> telah <b>DITOLAK</b> oleh ${params.approverName} dengan alasan sebagai berikut:<br><blockquote style="border-left: 4px solid #ef4444; padding-left: 12px; margin: 12px 0; color: #991b1b; background-color: #fef2f2; padding: 8px 12px; border-radius: 4px;"><i>${params.reason}</i></blockquote><br><b>Detail Permohonan:</b><br>No. Permohonan: ${params.requestNumber}<br>Kategori: ${params.requestType}<br>Ditolak Oleh: ${params.approverName}<br>Status: DITOLAK<br><br>Demikian pemberitahuan ini disampaikan. Terima kasih.`,
    fallbackText: `Yth. ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor permohonan ${params.requestNumber} telah DITOLAK oleh ${params.approverName} dengan alasan:\n${params.reason}\n\nDetail Permohonan:\nNo. Permohonan: ${params.requestNumber}\nKategori: ${params.requestType}\nDitolak Oleh: ${params.approverName}\nStatus: DITOLAK\n\nDemikian pemberitahuan ini disampaikan. Terima kasih.`,
  })
}

export async function sendApdRequestRevertedEmail(params: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  approverName: string
  reason: string
  requestType: string
  ccEmails?: string[]
  requestId?: number
}) {
  const baseUrl = getPublicAppUrl()
  const revisionLink = params.requestId
    ? `${baseUrl}/dashboard/apd/new?edit=${params.requestId}&category=${params.requestType?.toLowerCase()}`
    : `${baseUrl}/dashboard/apd`
  const categoryBadge = resolveApdCategoryBadge(params.requestType)

  return sendWorkflowEmail({
    to: params.requesterEmail,
    cc: params.ccEmails,
    templateCode: "apd_request_reverted",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      reason: params.reason,
      requestType: params.requestType,
      categoryBadge,
      revisionLink,
      revisiLink: revisionLink,
      approvalLink: revisionLink,
      viewLink: revisionLink,
      actionUrl: revisionLink,
    },
    fallbackSubject: `[Perlu Revisi] Permohonan ${params.requestType}: ${params.requestNumber}`,
    fallbackHtml: `Yth. ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor permohonan <b>${params.requestNumber}</b> telah <b>DIKEMBALIKAN UNTUK REVISI (Reverted)</b> oleh ${params.approverName} dengan catatan sebagai berikut:<br><blockquote style="border-left: 4px solid #f59e0b; padding-left: 12px; margin: 12px 0; color: #b45309; background-color: #fffbeb; padding: 8px 12px; border-radius: 4px;"><i>${params.reason}</i></blockquote><br>Silakan perbaiki data permohonan melalui tautan di bawah ini:<br><div style="margin: 16px 0;"><a href="${revisionLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Revisi Permohonan Sekarang</a></div><br><small style="color: #64748b;">Atau salin tautan: <a href="${revisionLink}">${revisionLink}</a></small><br><br>Demikian pemberitahuan ini disampaikan. Terima kasih.`,
    fallbackText: `Yth. ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor permohonan ${params.requestNumber} telah DIKEMBALIKAN UNTUK REVISI (Reverted) oleh ${params.approverName} dengan catatan:\n${params.reason}\n\nSilakan perbaiki data permohonan melalui tautan berikut:\n${revisionLink}\n\nDemikian pemberitahuan ini disampaikan. Terima kasih.`,
  })
}

export async function sendApdReplacementReminderEmail(params: {
  adminEmail: string
  employeeName: string
  itemName: string
}) {
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/apd`

  return sendWorkflowEmail({
    to: params.adminEmail,
    templateCode: "apd_reminder_replacement",
    variables: {
      employeeName: params.employeeName,
      itemName: params.itemName,
      viewLink,
      approvalLink: viewLink,
      dashboardLink: viewLink,
    },
    fallbackSubject: `Pengingat Pergantian APD: ${params.itemName} (${params.employeeName})`,
    fallbackHtml: `Yth. Bapak/Ibu Tim HSE & PIC APD,<br><br>Diberitahukan bahwa jadwal pergantian berkala APD untuk karyawan <b>${params.employeeName}</b> (Item: <b>${params.itemName}</b>) telah memasuki batas waktu penggantian (Siklus 8 Bulan).<br><br>Mohon untuk segera memproses pergantian dan pengadaan APD terkait.<br><br>Demikian pemberitahuan ini disampaikan. Terima kasih.`,
    fallbackText: `Yth. Bapak/Ibu Tim HSE & PIC APD,\n\nDiberitahukan bahwa jadwal pergantian berkala APD untuk karyawan ${params.employeeName} (Item: ${params.itemName}) telah memasuki batas waktu penggantian (Siklus 8 Bulan).\n\nMohon untuk segera memproses pergantian dan pengadaan APD terkait.\n\nDemikian pemberitahuan ini disampaikan. Terima kasih.`,
  })
}
