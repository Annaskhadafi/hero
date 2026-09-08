import { sendWorkflowEmail } from "@/lib/workflow-email"
import { getPublicAppUrl } from "@/lib/auth-config"

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

  return sendWorkflowEmail({
    to: params.approverEmail,
    cc: params.ccEmails,
    templateCode: "apd_request_submitted",
    variables: {
      employeeName: params.employeeName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
      approvalLink,
    },
    fallbackSubject: `Permohonan ${params.requestType} Baru: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.approverName},<br><br>Karyawan <b>${params.employeeName}</b> telah mengajukan permohonan ${params.requestType} dengan nomor tiket <b>${params.requestNumber}</b>.<br><br>Silakan buka tautan berikut untuk melakukan review dan persetujuan:<br><div style="margin: 16px 0;"><a href="${approvalLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Buka Inbox Approval</a></div><br><small style="color: #64748b;">Atau salin tautan: <a href="${approvalLink}">${approvalLink}</a></small><br><br>Terima kasih.`,
    fallbackText: `Halo ${params.approverName},\n\nKaryawan ${params.employeeName} telah mengajukan permohonan ${params.requestType} dengan nomor tiket ${params.requestNumber}.\n\nSilakan review dan setujui melalui tautan berikut:\n${approvalLink}\n\nTerima kasih.`,
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
  const cc = Array.from(new Set(['muhammad.akbar@chitraparatama.co.id', ...(params.ccEmails ?? [])]))

  return sendWorkflowEmail({
    to: params.approverEmail,
    cc,
    templateCode: "material_tools_request_submitted",
    variables: {
      employeeName: params.employeeName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
      sectionName: params.sectionName ?? "-",
      approvalLink,
    },
    fallbackSubject: `[${params.requestType}] Permohonan Baru: ${params.requestNumber} - ${params.employeeName}`,
    fallbackHtml: `Halo ${params.approverName},<br><br>Karyawan <b>${params.employeeName}</b> telah mengajukan permohonan <b>${params.requestType}</b> (${params.requestNumber}) yang memerlukan persetujuan Anda sebagai Section Head.<br><br>Silakan buka tautan berikut untuk melakukan review dan persetujuan:<br><div style="margin: 16px 0;"><a href="${approvalLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Buka Inbox Approval</a></div><br><small style="color: #64748b;">Atau salin tautan: <a href="${approvalLink}">${approvalLink}</a></small><br><br>CC: Muhammad Taufik Akbar<br>Terima kasih.`,
    fallbackText: `Halo ${params.approverName},\n\nKaryawan ${params.employeeName} telah mengajukan permohonan ${params.requestType} (${params.requestNumber}) yang memerlukan persetujuan Anda sebagai Section Head.\n\nSilakan review dan setujui melalui tautan berikut:\n${approvalLink}\n\nCC: Muhammad Taufik Akbar\nTerima kasih.`,
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
}) {
  const baseUrl = getPublicAppUrl()
  const dashboardLink = `${baseUrl}/dashboard/apd`

  return sendWorkflowEmail({
    to: params.requesterEmail,
    cc: ["muhammad.akbar@chitraparatama.co.id"],
    templateCode: "material_tools_request_approved",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
      sectionName: params.sectionName ?? "-",
      dashboardLink,
    },
    fallbackSubject: `[${params.requestType}] Permohonan Disetujui: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan <b>${params.requestType}</b> Anda dengan nomor tiket <b>${params.requestNumber}</b> telah <b>DISETUJUI</b> oleh Section Head (${params.approverName}).<br><br>Lihat status permohonan di dashboard:<br><div style="margin: 16px 0;"><a href="${dashboardLink}" style="background-color: #16a34a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Lihat Permohonan</a></div><br>Notifikasi ini juga telah diteruskan ke Muhammad Taufik Akbar.<br><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} telah DISETUJUI oleh Section Head (${params.approverName}).\n\nLihat status permohonan:\n${dashboardLink}\n\nNotifikasi ini juga telah diteruskan ke Muhammad Taufik Akbar.\n\nTerima kasih.`,
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
  const isFinal = !params.nextLevelLabel
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
      currentLevelLabel: params.currentLevelLabel,
      nextLevelLabel: params.nextLevelLabel ?? '',
      isFinal: String(isFinal),
      dashboardLink,
    },
    fallbackSubject: `[${params.requestType}] Tahap ${params.currentLevelLabel} Disetujui: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor tiket <b>${params.requestNumber}</b> ${statusText}<br><br><div style="margin: 16px 0;"><a href="${dashboardLink}" style="background-color: #16a34a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Lihat Status Permohonan</a></div><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} ${statusText.replace(/<[^>]*>/g, '')}\n\nLihat status permohonan:\n${dashboardLink}\n\nTerima kasih.`,
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

  return sendWorkflowEmail({
    to: params.nextApproverEmail,
    cc: params.ccEmails,
    templateCode: "apd_request_submitted",
    variables: {
      nextApproverName: params.nextApproverName,
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      requestType: params.requestType,
      currentLevelLabel: params.currentLevelLabel,
      approvalLink,
    },
    fallbackSubject: `[${params.requestType}] Review Diperlukan: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.nextApproverName},<br><br>Permohonan ${params.requestType} dari <b>${params.requesterName}</b> dengan nomor tiket <b>${params.requestNumber}</b> telah disetujui pada tahap sebelumnya dan memerlukan persetujuan Anda pada tahap <b>${params.currentLevelLabel}</b>.<br><br>Silakan buka tautan berikut untuk melakukan review:<br><div style="margin: 16px 0;"><a href="${approvalLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Buka Inbox Approval</a></div><br><small style="color: #64748b;">Atau salin tautan: <a href="${approvalLink}">${approvalLink}</a></small><br><br>Terima kasih.`,
    fallbackText: `Halo ${params.nextApproverName},\n\nPermohonan ${params.requestType} dari ${params.requesterName} dengan nomor tiket ${params.requestNumber} telah disetujui pada tahap sebelumnya dan memerlukan persetujuan Anda pada tahap ${params.currentLevelLabel}.\n\nSilakan review melalui tautan berikut:\n${approvalLink}\n\nTerima kasih.`,
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

  return sendWorkflowEmail({
    to: params.requesterEmail,
    cc: params.ccEmails,
    templateCode: "apd_request_approved",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
      dashboardLink,
    },
    fallbackSubject: `Permohonan ${params.requestType} Disetujui: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor tiket <b>${params.requestNumber}</b> telah <b>DISETUJUI</b> oleh ${params.approverName}.<br><br><div style="margin: 16px 0;"><a href="${dashboardLink}" style="background-color: #16a34a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Lihat Permohonan</a></div><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} telah DISETUJUI oleh ${params.approverName}.\n\nLihat permohonan:\n${dashboardLink}\n\nTerima kasih.`,
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
      dashboardLink,
    },
    fallbackSubject: `Permohonan ${params.requestType} Ditolak: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor tiket <b>${params.requestNumber}</b> telah <b>DITOLAK</b> oleh ${params.approverName} dengan alasan:<br><blockquote style="border-left: 4px solid #ef4444; padding-left: 12px; margin: 12px 0; color: #991b1b; background-color: #fef2f2; padding: 8px 12px; border-radius: 4px;"><i>${params.reason}</i></blockquote><br><div style="margin: 16px 0;"><a href="${dashboardLink}" style="background-color: #6b7280; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Buka Dashboard APD</a></div><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} telah DITOLAK oleh ${params.approverName} dengan alasan:\n${params.reason}\n\nLihat status:\n${dashboardLink}\n\nTerima kasih.`,
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
      revisionLink,
    },
    fallbackSubject: `[Perlu Revisi] Permohonan ${params.requestType}: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor tiket <b>${params.requestNumber}</b> telah <b>DIKEMBALIKAN UNTUK REVISI (Reverted)</b> oleh ${params.approverName} dengan catatan:<br><blockquote style="border-left: 4px solid #f59e0b; padding-left: 12px; margin: 12px 0; color: #b45309; background-color: #fffbeb; padding: 8px 12px; border-radius: 4px;"><i>${params.reason}</i></blockquote><br>Silakan perbaiki data permohonan melalui tautan di bawah ini:<br><div style="margin: 16px 0;"><a href="${revisionLink}" style="background-color: #d97706; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Revisi Permohonan Sekarang</a></div><br><small style="color: #64748b;">Atau salin tautan: <a href="${revisionLink}">${revisionLink}</a></small><br><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} telah DIKEMBALIKAN UNTUK REVISI (Reverted) oleh ${params.approverName} dengan catatan:\n${params.reason}\n\nSilakan perbaiki melalui tautan berikut:\n${revisionLink}\n\nTerima kasih.`,
  })
}

export async function sendApdReplacementReminderEmail(params: {
  adminEmail: string
  employeeName: string
  itemName: string
}) {
  return sendWorkflowEmail({
    to: params.adminEmail,
    templateCode: "apd_reminder_replacement",
    variables: {
      employeeName: params.employeeName,
      itemName: params.itemName,
    },
    fallbackSubject: `Pengingat Pergantian APD: ${params.itemName} (${params.employeeName})`,
    fallbackHtml: `Waktu pergantian ${params.itemName} untuk karyawan <b>${params.employeeName}</b> sudah dekat (Jadwal 8 Bulan). Silakan proses pergantian APD.`,
    fallbackText: `Waktu pergantian ${params.itemName} untuk karyawan ${params.employeeName} sudah dekat (Jadwal 8 Bulan). Silakan proses pergantian APD.`,
  })
}
