import { sendWorkflowEmail } from "@/lib/workflow-email"

export async function sendApdRequestSubmittedEmail(params: {
  employeeName: string
  requestNumber: string
  approverEmail: string
  approverName: string
  requestType: string
}) {
  return sendWorkflowEmail({
    to: params.approverEmail,
    templateCode: "apd_request_submitted",
    variables: {
      employeeName: params.employeeName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
    },
    fallbackSubject: `Permohonan ${params.requestType} Baru: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.approverName},<br><br>Karyawan <b>${params.employeeName}</b> telah mengajukan permohonan ${params.requestType} dengan nomor tiket <b>${params.requestNumber}</b>. Silakan login ke dashboard untuk melakukan persetujuan.<br><br>Terima kasih.`,
    fallbackText: `Halo ${params.approverName},\n\nKaryawan ${params.employeeName} telah mengajukan permohonan ${params.requestType} dengan nomor tiket ${params.requestNumber}. Silakan login ke dashboard untuk melakukan persetujuan.\n\nTerima kasih.`,
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
}) {
  const isFinal = !params.nextLevelLabel
  const statusText = isFinal
    ? `telah <b>DISETUJUI SEPENUHNYA</b> oleh ${params.approverName} pada tahap <b>${params.currentLevelLabel}</b>.`
    : `telah disetujui pada tahap <b>${params.currentLevelLabel}</b> oleh ${params.approverName} dan sedang menunggu persetujuan pada tahap <b>${params.nextLevelLabel}</b>.`

  return sendWorkflowEmail({
    to: params.requesterEmail,
    templateCode: "apd_request_approved",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
      currentLevelLabel: params.currentLevelLabel,
      nextLevelLabel: params.nextLevelLabel ?? '',
      isFinal: String(isFinal),
    },
    fallbackSubject: `[${params.requestType}] Tahap ${params.currentLevelLabel} Disetujui: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor tiket <b>${params.requestNumber}</b> ${statusText}<br><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} ${statusText.replace(/<[^>]*>/g, '')}\n\nTerima kasih.`,
  })
}

export async function sendApdNextApproverEmail(params: {
  nextApproverEmail: string
  nextApproverName: string
  requesterName: string
  requestNumber: string
  requestType: string
  currentLevelLabel: string
}) {
  return sendWorkflowEmail({
    to: params.nextApproverEmail,
    templateCode: "apd_request_submitted",
    variables: {
      nextApproverName: params.nextApproverName,
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      requestType: params.requestType,
      currentLevelLabel: params.currentLevelLabel,
    },
    fallbackSubject: `[${params.requestType}] Review Diperlukan: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.nextApproverName},<br><br>Permohonan ${params.requestType} dari <b>${params.requesterName}</b> dengan nomor tiket <b>${params.requestNumber}</b> telah disetujui pada tahap sebelumnya dan memerlukan persetujuan Anda pada tahap <b>${params.currentLevelLabel}</b>.<br><br>Silakan login ke dashboard untuk melakukan review.<br><br>Terima kasih.`,
    fallbackText: `Halo ${params.nextApproverName},\n\nPermohonan ${params.requestType} dari ${params.requesterName} dengan nomor tiket ${params.requestNumber} telah disetujui pada tahap sebelumnya dan memerlukan persetujuan Anda pada tahap ${params.currentLevelLabel}.\n\nSilakan login ke dashboard untuk melakukan review.\n\nTerima kasih.`,
  })
}

export async function sendApdRequestApprovedEmail(params: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  approverName: string
  requestType: string
  ccEmails?: string[]
}) {
  return sendWorkflowEmail({
    to: params.requesterEmail,
    cc: params.ccEmails,
    templateCode: "apd_request_approved",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      requestType: params.requestType,
    },
    fallbackSubject: `Permohonan ${params.requestType} Disetujui: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor tiket <b>${params.requestNumber}</b> telah <b>DISETUJUI</b> oleh ${params.approverName}.<br><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} telah DISETUJUI oleh ${params.approverName}.\n\nTerima kasih.`,
  })
}

export async function sendApdRequestRejectedEmail(params: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  approverName: string
  reason: string
  requestType: string
}) {
  return sendWorkflowEmail({
    to: params.requesterEmail,
    templateCode: "apd_request_rejected",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      reason: params.reason,
      requestType: params.requestType,
    },
    fallbackSubject: `Permohonan ${params.requestType} Ditolak: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor tiket <b>${params.requestNumber}</b> telah <b>DITOLAK</b> oleh ${params.approverName} dengan alasan:<br><i>${params.reason}</i><br><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} telah DITOLAK oleh ${params.approverName} dengan alasan:\n${params.reason}\n\nTerima kasih.`,
  })
}

export async function sendApdRequestRevertedEmail(params: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  approverName: string
  reason: string
  requestType: string
}) {
  return sendWorkflowEmail({
    to: params.requesterEmail,
    templateCode: "apd_request_reverted",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      reason: params.reason,
      requestType: params.requestType,
    },
    fallbackSubject: `[Perlu Revisi] Permohonan ${params.requestType}: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan ${params.requestType} Anda dengan nomor tiket <b>${params.requestNumber}</b> telah <b>DIKEMBALIKAN UNTUK REVISI (Reverted)</b> oleh ${params.approverName} dengan catatan:<br><i>${params.reason}</i><br><br>Silakan perbaiki data permohonan melalui sistem HERO.<br><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan ${params.requestType} Anda dengan nomor tiket ${params.requestNumber} telah DIKEMBALIKAN UNTUK REVISI (Reverted) oleh ${params.approverName} dengan catatan:\n${params.reason}\n\nSilakan perbaiki data permohonan melalui sistem HERO.\n\nTerima kasih.`,
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
