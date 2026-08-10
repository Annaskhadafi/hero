import { sendWorkflowEmail } from "@/lib/workflow-email"

export async function sendApdRequestSubmittedEmail(params: {
  employeeName: string
  requestNumber: string
  approverEmail: string
  approverName: string
}) {
  return sendWorkflowEmail({
    to: params.approverEmail,
    templateCode: "apd_request_submitted",
    variables: {
      employeeName: params.employeeName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
    },
    fallbackSubject: `Permohonan APD Baru: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.approverName},<br><br>Karyawan <b>${params.employeeName}</b> telah mengajukan permohonan APD dengan nomor tiket <b>${params.requestNumber}</b>. Silakan login ke dashboard untuk melakukan persetujuan.<br><br>Terima kasih.`,
    fallbackText: `Halo ${params.approverName},\n\nKaryawan ${params.employeeName} telah mengajukan permohonan APD dengan nomor tiket ${params.requestNumber}. Silakan login ke dashboard untuk melakukan persetujuan.\n\nTerima kasih.`,
  })
}

export async function sendApdRequestApprovedEmail(params: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  approverName: string
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
    },
    fallbackSubject: `Permohonan APD Disetujui: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan APD Anda dengan nomor tiket <b>${params.requestNumber}</b> telah <b>DISETUJUI</b> oleh ${params.approverName}.<br><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan APD Anda dengan nomor tiket ${params.requestNumber} telah DISETUJUI oleh ${params.approverName}.\n\nTerima kasih.`,
  })
}

export async function sendApdRequestRejectedEmail(params: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  approverName: string
  reason: string
}) {
  return sendWorkflowEmail({
    to: params.requesterEmail,
    templateCode: "apd_request_rejected",
    variables: {
      employeeName: params.requesterName,
      requestNumber: params.requestNumber,
      approverName: params.approverName,
      reason: params.reason,
    },
    fallbackSubject: `Permohonan APD Ditolak: ${params.requestNumber}`,
    fallbackHtml: `Halo ${params.requesterName},<br><br>Permohonan APD Anda dengan nomor tiket <b>${params.requestNumber}</b> telah <b>DITOLAK</b> oleh ${params.approverName} dengan alasan:<br><i>${params.reason}</i><br><br>Terima kasih.`,
    fallbackText: `Halo ${params.requesterName},\n\nPermohonan APD Anda dengan nomor tiket ${params.requestNumber} telah DITOLAK oleh ${params.approverName} dengan alasan:\n${params.reason}\n\nTerima kasih.`,
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
