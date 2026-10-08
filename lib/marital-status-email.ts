import { sendWorkflowEmail, splitEmails } from '@/lib/workflow-email';
import { getPublicAppUrl } from '@/lib/auth-config';
import { getMaritalStatusNotificationConfigData } from '@/lib/hero-admin';

async function getMaritalStatusCcEmails(): Promise<string[]> {
  try {
    const config = await getMaritalStatusNotificationConfigData();
    if (!config.isActive) return [];
    const cc = splitEmails(config.ccEmails);
    const recipients = splitEmails(config.recipientEmails);
    return Array.from(new Set([...cc, ...recipients]));
  } catch {
    return [];
  }
}

export interface MaritalStatusEmailVariables {
  requestNumber: string;
  employeeName: string;
  employeeSn: string;
  jobTitle?: string | null;
  departmentName?: string | null;
  sectionName?: string | null;
  siteName?: string | null;
  currentMaritalStatus: string;
  targetMaritalStatus: string;
  reason: string;
  approverName?: string | null;
  approvalLevel?: number;
  rejectionReason?: string;
  revertReason?: string;
}

export async function sendMaritalStatusApprovalRequestedEmail(
  toEmail: string,
  vars: MaritalStatusEmailVariables
) {
  const baseUrl = getPublicAppUrl();
  const approvalLink = `${baseUrl}/dashboard/approval`;

  const fallbackSubject = `[HERO] Permohonan Perubahan Status Pernikahan: ${vars.requestNumber} - ${vars.employeeName}`;
  const fallbackHtml = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:20px">
      <div style="background:linear-gradient(135deg,#047857,#059669);padding:24px;border-radius:10px 10px 0 0">
        <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
        <p style="color:#a7f3d0;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Central Service – Permohonan Status Pernikahan</p>
      </div>
      <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
        <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>${vars.approverName || 'Bapak/Ibu Approver'}</strong>,</p>
        <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
          Permohonan perubahan status pernikahan berikut memerlukan peninjauan dan persetujuan Anda pada <strong>Tahap ${vars.approvalLevel || 1}</strong>:
        </p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #059669">
          <table cellpadding="4" cellspacing="0" width="100%" style="font-size:13px;color:#334155">
            <tr><td width="160" style="color:#64748b">No. Permohonan:</td><td style="font-weight:600;color:#0f172a">${vars.requestNumber}</td></tr>
            <tr><td style="color:#64748b">Nama Karyawan:</td><td style="font-weight:600;color:#0f172a">${vars.employeeName} (${vars.employeeSn})</td></tr>
            <tr><td style="color:#64748b">Jabatan & Location:</td><td>${vars.jobTitle || '-'} / ${vars.siteName || '-'}</td></tr>
            <tr><td style="color:#64748b">Dept / Section:</td><td>${vars.departmentName || '-'} / ${vars.sectionName || '-'}</td></tr>
            <tr><td style="color:#64748b">Status Awal ➔ Tujuan:</td><td><strong style="color:#0f172a">${vars.currentMaritalStatus}</strong> ➔ <strong style="color:#059669">${vars.targetMaritalStatus}</strong></td></tr>
            <tr><td style="color:#64748b">Alasan Perubahan:</td><td style="font-style:italic;color:#334155">"${vars.reason}"</td></tr>
          </table>
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${approvalLink}" style="background:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Buka Approval Inbox HERO</a>
        </div>
        <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:16px">
          Email ini dikirim secara otomatis oleh Sistem HERO Central Service PT Chitra Paratama.
        </p>
      </div>
    </div>
  `;

  return sendWorkflowEmail({
    to: toEmail,
    templateCode: 'marital_status_approval_requested',
    variables: {
      requestNumber: vars.requestNumber,
      employeeName: vars.employeeName,
      employeeSn: vars.employeeSn,
      jobTitle: vars.jobTitle || '-',
      departmentName: vars.departmentName || '-',
      sectionName: vars.sectionName || '-',
      siteName: vars.siteName || '-',
      currentMaritalStatus: vars.currentMaritalStatus,
      targetMaritalStatus: vars.targetMaritalStatus,
      reason: vars.reason,
      approverName: vars.approverName || 'Approver',
      approvalLevel: vars.approvalLevel || 1,
      approvalLink,
    },
    fallbackSubject,
    fallbackHtml,
    fallbackText: `Yth. ${vars.approverName || 'Approver'}, Permohonan perubahan status pernikahan ${vars.requestNumber} dari ${vars.employeeName} (${vars.currentMaritalStatus} -> ${vars.targetMaritalStatus}) memerlukan persetujuan Anda. Akses: ${approvalLink}`,
  });
}

export async function sendMaritalStatusApprovedEmail(
  toEmail: string,
  vars: MaritalStatusEmailVariables
) {
  const baseUrl = getPublicAppUrl();
  const detailLink = `${baseUrl}/dashboard/central-service/marital-status`;

  const fallbackSubject = `[HERO] Permohonan Perubahan Status Pernikahan ${vars.requestNumber} Disetujui`;
  const fallbackHtml = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:20px">
      <div style="background:linear-gradient(135deg,#047857,#059669);padding:24px;border-radius:10px 10px 0 0">
        <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
        <p style="color:#a7f3d0;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Permohonan Disetujui</p>
      </div>
      <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
        <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>${vars.employeeName}</strong>,</p>
        <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
          Permohonan perubahan status pernikahan Anda (No: <strong>${vars.requestNumber}</strong>) telah <strong>DISETUJUI SEPENUHNYA</strong>.
        </p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #059669">
          <p style="margin:0;font-size:13px;color:#166534">
            Data status pernikahan Anda di profil karyawan HERO telah disinkronkan menjadi: <strong style="font-size:14px;text-decoration:underline;">${vars.targetMaritalStatus}</strong>.
          </p>
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${detailLink}" style="background:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Lihat Status Di HERO</a>
        </div>
      </div>
    </div>
  `;

  const ccEmails = await getMaritalStatusCcEmails();

  return sendWorkflowEmail({
    to: toEmail,
    cc: ccEmails.length > 0 ? ccEmails : undefined,
    templateCode: 'marital_status_request_approved',
    variables: {
      requestNumber: vars.requestNumber,
      employeeName: vars.employeeName,
      targetMaritalStatus: vars.targetMaritalStatus,
      detailLink,
    },
    fallbackSubject,
    fallbackHtml,
    fallbackText: `Yth. ${vars.employeeName}, Permohonan perubahan status pernikahan Anda ${vars.requestNumber} telah disetujui. Status pernikahan diperbarui menjadi ${vars.targetMaritalStatus}.`,
  });
}

export async function sendMaritalStatusRejectedEmail(
  toEmail: string,
  vars: MaritalStatusEmailVariables
) {
  const baseUrl = getPublicAppUrl();
  const detailLink = `${baseUrl}/dashboard/central-service/marital-status`;

  const fallbackSubject = `[HERO] Permohonan Perubahan Status Pernikahan ${vars.requestNumber} Ditolak`;
  const fallbackHtml = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:20px">
      <div style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:24px;border-radius:10px 10px 0 0">
        <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
        <p style="color:#fecaca;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Permohonan Tidak Disetujui</p>
      </div>
      <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
        <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>${vars.employeeName}</strong>,</p>
        <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
          Permohonan perubahan status pernikahan Anda (No: <strong>${vars.requestNumber}</strong>) tidak disetujui oleh tim pemeriksa/atasan.
        </p>
        <div style="background:#fef2f2;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #dc2626">
          <p style="margin:0;font-size:13px;color:#991b1b">
            <strong>Catatan Penolakan:</strong> "${vars.rejectionReason || 'Tidak ada catatan penolakan.'}"
          </p>
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${detailLink}" style="background:#dc2626;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Lihat Detail Di HERO</a>
        </div>
      </div>
    </div>
  `;

  return sendWorkflowEmail({
    to: toEmail,
    templateCode: 'marital_status_request_rejected',
    variables: {
      requestNumber: vars.requestNumber,
      employeeName: vars.employeeName,
      rejectionReason: vars.rejectionReason || '-',
      detailLink,
    },
    fallbackSubject,
    fallbackHtml,
    fallbackText: `Yth. ${vars.employeeName}, Permohonan perubahan status pernikahan ${vars.requestNumber} tidak disetujui. Catatan: ${vars.rejectionReason || '-'}`,
  });
}

export async function sendMaritalStatusRevertedEmail(
  toEmail: string,
  vars: MaritalStatusEmailVariables
) {
  const baseUrl = getPublicAppUrl();
  const detailLink = `${baseUrl}/dashboard/central-service/marital-status`;

  const fallbackSubject = `[HERO] Permohonan Perubahan Status Pernikahan ${vars.requestNumber} Dikembalikan untuk Revisi`;
  const fallbackHtml = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:20px">
      <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:24px;border-radius:10px 10px 0 0">
        <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
        <p style="color:#fef3c7;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Dikembalikan untuk Revisi</p>
      </div>
      <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
        <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>${vars.employeeName}</strong>,</p>
        <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
          Permohonan perubahan status pernikahan Anda (No: <strong>${vars.requestNumber}</strong>) dikembalikan oleh approver untuk dilakukan revisi.
        </p>
        <div style="background:#fffbeb;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #d97706">
          <p style="margin:0;font-size:13px;color:#92400e">
            <strong>Catatan Revisi:</strong> "${vars.revertReason || vars.rejectionReason || 'Mohon perbaiki data permohonan.'}"
          </p>
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${detailLink}" style="background:#d97706;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Revisi Permohonan Di HERO</a>
        </div>
      </div>
    </div>
  `;

  return sendWorkflowEmail({
    to: toEmail,
    templateCode: 'marital_status_request_reverted',
    variables: {
      requestNumber: vars.requestNumber,
      employeeName: vars.employeeName,
      revertReason: vars.revertReason || vars.rejectionReason || '-',
      detailLink,
    },
    fallbackSubject,
    fallbackHtml,
    fallbackText: `Yth. ${vars.employeeName}, Permohonan perubahan status pernikahan ${vars.requestNumber} dikembalikan untuk revisi. Catatan: ${vars.revertReason || vars.rejectionReason || '-'}`,
  });
}
