export type EmailTemplatePreset = {
  name: string
  templateCode: string
  templateType: string
  deliveryChannel: string
  recipientScope: string
  ccEmail: string
  subject: string
  htmlContent: string
  textContent: string
  description: string
  variables: string[]
  sampleValues: Record<string, string>
}

const RAW_EMAIL_TEMPLATE_PRESETS: EmailTemplatePreset[] = [
  {
    name: 'Approval Assignment',
    templateCode: 'approval_assignment',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'approver',
    ccEmail: '',
    subject: 'Tugas approval baru #{{requestId}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah permohonan baru memerlukan persetujuan Anda.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Permohonan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor Request</td><td style="padding:4px 0;color:#1f2937;font-size:13px">#{{requestId}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan masuk ke dashboard approval untuk meninjau dan mengambil tindakan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Sebuah permohonan baru memerlukan persetujuan Anda.

Nomor Request: #{{requestId}}

Silakan masuk ke dashboard approval untuk meninjau dan mengambil tindakan.`,
    description: 'Notifikasi saat request masuk ke approver.',
    variables: ['requestId'],
    sampleValues: {
      requestId: 'APR-2026-0142',
    },
  },
  {
    name: 'Approval SLA Reminder',
    templateCode: 'approval_sla_reminder',
    templateType: 'Reminder',
    deliveryChannel: 'email,bell,pwa_push',
    recipientScope: 'approver',
    ccEmail: '',
    subject: 'Reminder SLA untuk request #{{requestId}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Permohonan berikut mendekati batas waktu SLA dan memerlukan tindakan segera.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Permohonan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor Request</td><td style="padding:4px 0;color:#1f2937;font-size:13px">#{{requestId}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Harap segera melakukan review sebelum batas waktu berakhir.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Permohonan berikut mendekati batas waktu SLA dan memerlukan tindakan segera.

Nomor Request: #{{requestId}}

Harap segera melakukan review sebelum batas waktu berakhir.`,
    description: 'Reminder otomatis untuk approval yang mendekati SLA.',
    variables: ['requestId'],
    sampleValues: {
      requestId: 'APR-2026-0142',
    },
  },
  {
    name: 'Attendance Permission Reminder',
    templateCode: 'attendance_permission_reminder',
    templateType: 'Reminder',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,approver',
    ccEmail: '',
    subject: 'Reminder approval izin {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Terdapat pengajuan izin yang menunggu persetujuan HR.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Pengajuan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jenis Izin</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{permissionType}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{requestDate}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard untuk menyetujui atau menolak pengajuan ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Terdapat pengajuan izin yang menunggu persetujuan HR.

Detail Pengajuan:
Nama Karyawan: {{employeeName}}
Jenis Izin: {{permissionType}}
Tanggal: {{requestDate}}

Silakan login ke dashboard untuk menyetujui atau menolak pengajuan ini.`,
    description: 'Reminder pengajuan izin attendance ke HR dan approver terkait.',
    variables: ['employeeName', 'permissionType', 'requestDate'],
    sampleValues: {
      employeeName: 'Budi Santoso',
      permissionType: 'Izin Terlambat',
      requestDate: '18 Juni 2026',
    },
  },
  {
    name: 'Attendance Permission Decision',
    templateCode: 'attendance_permission_decision',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'employee',
    ccEmail: '',
    subject: 'Pengajuan {{permissionType}} Anda {{decisionLabel}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Pengajuan {{permissionType}} Anda telah <strong>{{decisionLabel}}</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Pengajuan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jenis Izin</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{permissionType}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{requestDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Catatan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{approverNote}}</td></tr></table><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{employeeName}},

Pengajuan {{permissionType}} Anda telah {{decisionLabel}}.

Detail Pengajuan:
Jenis Izin: {{permissionType}}
Tanggal: {{requestDate}}
Catatan: {{approverNote}}

Salam,
Tim Human Capital`,
    description: 'Hasil approve atau reject untuk izin attendance.',
    variables: ['employeeName', 'permissionType', 'decisionLabel', 'requestDate', 'approverNote'],
    sampleValues: {
      employeeName: 'Budi Santoso',
      permissionType: 'Izin Sakit',
      decisionLabel: 'disetujui',
      requestDate: '18 Juni 2026',
      approverNote: 'Catatan approver: lampiran sudah lengkap.',
    },
  },
  {
    name: 'Daily Report Delivery',
    templateCode: 'daily_report_delivery',
    templateType: 'Report',
    deliveryChannel: 'email',
    recipientScope: 'admin,pjo',
    ccEmail: '',
    subject: 'Daily Report {{siteName}} - {{reportDate}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Laporan harian berikut telah siap untuk dikirim.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Laporan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Site</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{siteName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reportDate}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan review laporan sebelum didistribusikan ke pihak terkait.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Laporan harian berikut telah siap untuk dikirim.

Informasi Laporan:
Site: {{siteName}}
Tanggal: {{reportDate}}

Silakan review laporan sebelum didistribusikan ke pihak terkait.`,
    description: 'Notifikasi report harian untuk pihak operasional.',
    variables: ['siteName', 'reportDate'],
    sampleValues: {
      siteName: 'Site ABN',
      reportDate: '2026-06-18',
    },
  },
  {
    name: 'User Invitation',
    templateCode: 'user_invitation',
    templateType: 'Invitation',
    deliveryChannel: 'email',
    recipientScope: 'employee',
    ccEmail: '',
    subject: 'Undangan akun HERO untuk {{userName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{userName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Akun HERO Anda telah berhasil dibuat. Silakan selesaikan proses aktivasi melalui tautan di bawah ini.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Aktivasi Akun</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{invitationLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Terima Undangan</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Setelah menerima undangan, verifikasi alamat email Anda melalui tautan berikut:</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{verificationLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Verifikasi Email</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Tautan undangan ini bersifat sementara. Segera selesaikan proses aktivasi Anda.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{userName}},

Akun HERO Anda telah berhasil dibuat. Silakan selesaikan proses aktivasi melalui tautan di bawah ini.

Aktivasi Akun:
Terima undangan: {{invitationLink}}
Verifikasi email: {{verificationLink}}

Tautan undangan ini bersifat sementara. Segera selesaikan proses aktivasi Anda.

Salam,
Tim Human Capital`,
    description: 'Email aktivasi akun baru untuk user management.',
    variables: ['userName', 'invitationLink', 'verificationLink'],
    sampleValues: {
      userName: 'Siti Rahma',
      invitationLink: 'https://hero.example.com/auth/accept-invitation?token=sample-invite',
      verificationLink: 'https://hero.example.com/auth/verify-email?token=sample-verify',
    },
  },
  {
    name: 'Onboarding Link',
    templateCode: 'onboarding_link',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate',
    ccEmail: '',
    subject: 'Link onboarding HERO untuk {{candidateName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Selamat! Data Anda telah terdaftar di sistem HERO. Silakan lengkapi proses onboarding melalui tautan berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Onboarding Karyawan</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{onboardingLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Buka Form Onboarding</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Pastikan dokumen identitas dan data rekening sudah siap sebelum mengisi formulir.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{candidateName}},

Selamat! Data Anda telah terdaftar di sistem HERO. Silakan lengkapi proses onboarding melalui tautan berikut:

{{onboardingLink}}

Pastikan dokumen identitas dan data rekening sudah siap sebelum mengisi formulir.

Salam,
Tim Human Capital`,
    description: 'Link onboarding kandidat setelah token dibuat.',
    variables: ['candidateName', 'onboardingLink'],
    sampleValues: {
      candidateName: 'Rina Amelia',
      onboardingLink: 'https://hero.example.com/onboarding/sample-token',
    },
  },
  {
    name: 'Leave Request Submitted',
    templateCode: 'leave_request_submitted',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc',
    ccEmail: '',
    subject: 'Pengajuan cuti {{leaveTypeName}} dari {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Seorang karyawan telah mengirimkan pengajuan cuti baru.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Pengajuan Cuti</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jenis Cuti</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{leaveTypeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Mulai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{startDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Selesai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{endDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Total Hari</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{totalDays}} hari</td></tr></table><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Alasan</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">{{reason}}</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard untuk memproses pengajuan ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Seorang karyawan telah mengirimkan pengajuan cuti baru.

Detail Pengajuan Cuti:
Nama Karyawan: {{employeeName}}
Jenis Cuti: {{leaveTypeName}}
Tanggal Mulai: {{startDate}}
Tanggal Selesai: {{endDate}}
Total Hari: {{totalDays}} hari

Alasan:
{{reason}}

Silakan login ke dashboard untuk memproses pengajuan ini.`,
    description: 'Notifikasi submit cuti baru ke HC.',
    variables: ['employeeName', 'leaveTypeName', 'startDate', 'endDate', 'totalDays', 'reason'],
    sampleValues: {
      employeeName: 'Andi Saputra',
      leaveTypeName: 'Tahunan',
      startDate: '2026-06-21',
      endDate: '2026-06-23',
      totalDays: '3',
      reason: 'Alasan: keperluan keluarga.',
    },
  },
  {
    name: 'Leave Request Decision',
    templateCode: 'leave_request_decision',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'employee',
    ccEmail: '',
    subject: 'Pengajuan cuti Anda {{decisionLabel}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Pengajuan cuti {{leaveTypeName}} Anda telah <strong>{{decisionLabel}}</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Pengajuan Cuti</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jenis Cuti</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{leaveTypeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Mulai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{startDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Selesai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{endDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Diproses Oleh</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{approverName}}</td></tr></table><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{employeeName}},

Pengajuan cuti {{leaveTypeName}} Anda telah {{decisionLabel}}.

Detail Pengajuan Cuti:
Jenis Cuti: {{leaveTypeName}}
Tanggal Mulai: {{startDate}}
Tanggal Selesai: {{endDate}}
Diproses Oleh: {{approverName}}

Salam,
Tim Human Capital`,
    description: 'Hasil approval pengajuan cuti ke karyawan.',
    variables: [
      'employeeName',
      'leaveTypeName',
      'decisionLabel',
      'startDate',
      'endDate',
      'approverName',
      'rejectionReason',
    ],
    sampleValues: {
      employeeName: 'Andi Saputra',
      leaveTypeName: 'Tahunan',
      decisionLabel: 'disetujui',
      startDate: '2026-06-21',
      endDate: '2026-06-23',
      approverName: 'Diproses oleh: HC Manager',
      rejectionReason: '',
    },
  },
  {
    name: 'Overtime Assignment',
    templateCode: 'overtime_assignment',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'employee',
    ccEmail: '',
    subject: '{{splNumber}} siap dikerjakan',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Anda mendapatkan penugasan lembur (overtime) sebagai berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Penugasan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor SPL</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{splNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{workDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jam Mulai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{plannedStart}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jam Selesai</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{plannedEnd}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Harap hadir tepat waktu sesuai jadwal yang telah ditentukan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{employeeName}},

Anda mendapatkan penugasan lembur (overtime) sebagai berikut.

Detail Penugasan:
Judul: {{title}}
Nomor SPL: {{splNumber}}
Tanggal: {{workDate}}
Jam Mulai: {{plannedStart}}
Jam Selesai: {{plannedEnd}}

Harap hadir tepat waktu sesuai jadwal yang telah ditentukan.`,
    description: 'Email penugasan SPL/overtime ke karyawan penerima.',
    variables: ['splNumber', 'title', 'workDate', 'plannedStart', 'plannedEnd'],
    sampleValues: {
      splNumber: 'SPL-0626-008',
      title: 'Overtime Shutdown Conveyor',
      workDate: '18 Juni 2026',
      plannedStart: '19:00',
      plannedEnd: '22:00',
    },
  },
  {
    name: 'Daily Activity Pending Approval',
    templateCode: 'daily_activity_pending_approval',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'approver',
    ccEmail: '',
    subject: 'Daily Activity menunggu approval',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Seorang anggota tim telah mengirimkan laporan aktivitas harian yang menunggu review Anda.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Aktivitas</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Aktivitas</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{activityTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{activityType}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Waktu Submit</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{submissionTime}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard untuk mereview dan menyetujui aktivitas ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Seorang anggota tim telah mengirimkan laporan aktivitas harian yang menunggu review Anda.

Detail Aktivitas:
Karyawan: {{employeeName}}
Aktivitas: {{activityTitle}}
Kategori: {{activityType}}
Waktu Submit: {{submissionTime}}

Silakan login ke dashboard untuk mereview dan menyetujui aktivitas ini.`,
    description: 'Notifikasi approver saat daily activity perlu review.',
    variables: ['employeeName', 'activityTitle', 'activityType', 'submissionTime', 'notes'],
    sampleValues: {
      employeeName: 'Rudi Hidayat',
      activityTitle: 'Pemeriksaan panel listrik',
      activityType: 'Inspection',
      submissionTime: '18 Juni 2026, 14:35',
      notes: 'Catatan: ditemukan kabel longgar di area panel 3.',
    },
  },
  {
    name: 'Offboarding Update',
    templateCode: 'offboarding_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'employee,hc',
    ccEmail: '',
    subject: '{{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">{{intro}}</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Status Offboarding</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Ringkasan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{detailsSummary}}</td></tr></table><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{employeeName}},

{{intro}}

Status Offboarding:
Status: {{status}}
Ringkasan: {{detailsSummary}}

Salam,
Tim Human Capital`,
    description: 'Update status offboarding ke karyawan dan HC.',
    variables: ['employeeName', 'title', 'intro', 'status', 'detailsSummary'],
    sampleValues: {
      employeeName: 'Maya Putri',
      title: 'Offboarding disetujui',
      intro: 'Request offboarding Anda sudah diproses dan checklist clearance berjalan.',
      status: 'approved',
      detailsSummary: 'Tanggal terakhir kerja: 30 Juni 2026 | Clearance: IT, GA, Finance',
    },
  },
  {
    name: 'HC Application Received',
    templateCode: 'application_received',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: 'Lamaran diterima untuk {{jobTitle}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Terima kasih atas ketertarikan Anda untuk bergabung dengan PT Chitra Paratama. Lamaran Anda untuk posisi <strong>{{jobTitle}}</strong> telah kami terima dengan baik.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Lamaran</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Sumber</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{source}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Waktu Submit</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{submittedAt}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Tim Human Capital akan meninjau lamaran Anda dan akan menghubungi Anda jika memenuhi kualifikasi yang dibutuhkan.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{candidateName}},

Terima kasih atas ketertarikan Anda untuk bergabung dengan PT Chitra Paratama. Lamaran Anda untuk posisi {{jobTitle}} telah kami terima dengan baik.

Informasi Lamaran:
Posisi: {{jobTitle}}
Sumber: {{source}}
Waktu Submit: {{submittedAt}}

Tim Human Capital akan meninjau lamaran Anda dan akan menghubungi Anda jika memenuhi kualifikasi yang dibutuhkan.

Salam,
Tim Human Capital`,
    description: 'Konfirmasi bahwa aplikasi kandidat sudah diterima tim HC.',
    variables: ['candidateName', 'jobTitle', 'source', 'submittedAt'],
    sampleValues: {
      candidateName: 'Dina Pertiwi',
      jobTitle: 'Operator Plant',
      source: 'Careers Page',
      submittedAt: '18 Jun 2026, 09.15',
    },
  },
  {
    name: 'HC Interview Invitation',
    templateCode: 'interview_invitation',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: '[HERO] Undangan Interview - {{jobTitle}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Berdasarkan hasil seleksi berkas, Anda memenuhi kualifikasi untuk mengikuti tahap interview.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Interview</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{date}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Waktu</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{time}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tipe</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{interviewType}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi / Link</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pewawancara</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{interviewer}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Durasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{duration}} menit</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Harap konfirmasi kehadiran Anda sebelum jadwal interview dimulai.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{candidateName}},

Berdasarkan hasil seleksi berkas, Anda memenuhi kualifikasi untuk mengikuti tahap interview.

Detail Interview:
Posisi: {{jobTitle}}
Tanggal: {{date}}
Waktu: {{time}}
Tipe: {{interviewType}}
Lokasi/Link: {{location}}
Pewawancara: {{interviewer}}
Durasi: {{duration}} menit

Harap konfirmasi kehadiran Anda sebelum jadwal interview dimulai.

Salam,
Tim Human Capital`,
    description: 'Override pusat untuk undangan interview kandidat.',
    variables: ['candidateName', 'jobTitle', 'date', 'time', 'interviewType', 'location', 'interviewer', 'duration'],
    sampleValues: {
      candidateName: 'Dina Pertiwi',
      jobTitle: 'Operator Plant',
      date: '25 Juni 2026',
      time: '09:00 WITA',
      interviewType: 'Offline',
      location: 'Office Meeting Room',
      interviewer: 'HC Supervisor',
      duration: '60',
    },
  },
  {
    name: 'HC Test Assigned',
    templateCode: 'test_assigned',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: '[HERO] Undangan Tes Online - {{jobTitle}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Anda diundang untuk mengikuti tes online sebagai bagian dari proses seleksi untuk posisi <strong>{{jobTitle}}</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail Tes Online</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Jadwal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{date}} {{time}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Keterangan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Masa Aktif</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{duration}} hari</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Akses tes online melalui tautan berikut:</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{testLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Mulai Tes Online</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Pastikan koneksi internet Anda stabil sebelum memulai tes.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{candidateName}},

Anda diundang untuk mengikuti tes online sebagai bagian dari proses seleksi untuk posisi {{jobTitle}}.

Detail Tes Online:
Posisi: {{jobTitle}}
Jadwal: {{date}} {{time}}
Keterangan: {{location}}
Masa Aktif: {{duration}} hari

Akses tes: {{testLink}}

Pastikan koneksi internet Anda stabil sebelum memulai tes.

Salam,
Tim Human Capital`,
    description: 'Override pusat untuk email assignment online test kandidat.',
    variables: ['candidateName', 'jobTitle', 'date', 'time', 'location', 'duration', 'testLink'],
    sampleValues: {
      candidateName: 'Dina Pertiwi',
      jobTitle: 'Operator Plant',
      date: '25 Juni 2026',
      time: '13:00 WITA',
      location: 'Online - dapat diakses mulai 25 Juni 2026 13:00 WITA',
      duration: '7',
      testLink: 'https://hero.example.com/test/sample-key',
    },
  },
  {
    name: 'HC Onboarding Link',
    templateCode: 'hc_onboarding_link',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: 'Link onboarding HERO',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Data onboarding Anda telah siap. Silakan lengkapi data diri melalui tautan berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Onboarding Karyawan</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{onboardingLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Lengkapi Data Onboarding</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Pastikan seluruh dokumen yang diperlukan telah disiapkan sebelum mengisi formulir.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{candidateName}},

Data onboarding Anda telah siap. Silakan lengkapi data diri melalui tautan berikut:

{{onboardingLink}}

Pastikan seluruh dokumen yang diperlukan telah disiapkan sebelum mengisi formulir.

Salam,
Tim Human Capital`,
    description: 'Link onboarding kandidat yang bisa dioverride dari Email Settings pusat.',
    variables: ['candidateName', 'onboardingLink'],
    sampleValues: {
      candidateName: 'Dina Pertiwi',
      onboardingLink: 'https://hero.example.com/onboarding/sample-token',
    },
  },
  {
    name: 'HC Offering Letter',
    templateCode: 'offering_letter',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: '[HERO] Surat Penawaran Kerja - {{jobTitle}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Kepada Yth. {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dengan ini kami sampaikan <strong>Surat Penawaran Kerja (Offering Letter)</strong> untuk posisi <strong>{{jobTitle}}</strong> di {{companyName}}.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Penawaran</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Perusahaan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{companyName}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dokumen surat penawaran kerja terlampir pada email ini. Silakan ditinjau dan ditandatangani sebelum batas waktu yang tertera.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Kepada Yth. {{candidateName}},

Dengan ini kami sampaikan Surat Penawaran Kerja (Offering Letter) untuk posisi {{jobTitle}} di {{companyName}}.

Informasi Penawaran:
Posisi: {{jobTitle}}
Perusahaan: {{companyName}}

Dokumen surat penawaran kerja terlampir pada email ini. Silakan ditinjau dan ditandatangani sebelum batas waktu yang tertera.

Salam,
Tim Human Capital`,
    description: 'Email surat penawaran kerja kandidat dengan lampiran PDF offering.',
    variables: ['candidateName', 'jobTitle', 'companyName'],
    sampleValues: {
      candidateName: 'Dina Pertiwi',
      jobTitle: 'Operator Plant',
      companyName: 'PT Chitra Paratama',
    },
  },
  {
    name: 'HSE JSA Created',
    templateCode: 'hse_jsa_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'JSA baru: {{jsaNumber}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah dokumen Job Safety Analysis (JSA) baru telah dibuat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi JSA</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor JSA</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jsaNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pekerjaan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobDescription}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Risk Level</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{riskLevel}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tim</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{teamMembers}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk meninjau dan memproses dokumen JSA.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Sebuah dokumen Job Safety Analysis (JSA) baru telah dibuat.

Informasi JSA:
Nomor JSA: {{jsaNumber}}
Pekerjaan: {{jobDescription}}
Risk Level: {{riskLevel}}
Tim: {{teamMembers}}

Silakan login ke dashboard HSE untuk meninjau dan memproses dokumen JSA.`,
    description: 'Notifikasi saat register JSA baru dibuat.',
    variables: ['jsaNumber', 'jobDescription', 'riskLevel', 'teamMembers'],
    sampleValues: {
      jsaNumber: 'JSA/20260618/0012',
      jobDescription: 'Overhaul pompa slurry',
      riskLevel: 'High',
      teamMembers: 'Supervisor, Mechanic, Helper',
    },
  },
  {
    name: 'HSE JSA Updated',
    templateCode: 'hse_jsa_updated',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update JSA: {{jsaNumber}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dokumen Job Safety Analysis (JSA) berikut telah diperbarui.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi JSA</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor JSA</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jsaNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pekerjaan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobDescription}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Risk Level</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{riskLevel}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk melihat perubahan terbaru.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Dokumen Job Safety Analysis (JSA) berikut telah diperbarui.

Informasi JSA:
Nomor JSA: {{jsaNumber}}
Pekerjaan: {{jobDescription}}
Risk Level: {{riskLevel}}

Silakan login ke dashboard HSE untuk melihat perubahan terbaru.`,
    description: 'Notifikasi saat dokumen JSA diperbarui.',
    variables: ['jsaNumber', 'jobDescription', 'riskLevel'],
    sampleValues: {
      jsaNumber: 'JSA/20260618/0012',
      jobDescription: 'Overhaul pompa slurry',
      riskLevel: 'Medium',
    },
  },
  {
    name: 'HSE HIRADC Register Created',
    templateCode: 'hse_hiradc_register_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'HIRADC register baru: {{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah register HIRADC baru telah dibuat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi HIRADC</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Departemen</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{department}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk meninjau register HIRADC.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Sebuah register HIRADC baru telah dibuat.

Informasi HIRADC:
Judul: {{title}}
Departemen: {{department}}
Lokasi: {{location}}
Status: {{status}}

Silakan login ke dashboard HSE untuk meninjau register HIRADC.`,
    description: 'Notifikasi saat register HIRADC baru dibuat.',
    variables: ['title', 'department', 'location', 'status'],
    sampleValues: {
      title: 'HIRADC Workshop Tyre',
      department: 'Maintenance',
      location: 'Workshop',
      status: 'draft',
    },
  },
  {
    name: 'HSE HIRADC Register Updated',
    templateCode: 'hse_hiradc_register_updated',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update HIRADC register: {{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Register HIRADC berikut telah diperbarui.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi HIRADC</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Departemen</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{department}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk melihat perubahan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Register HIRADC berikut telah diperbarui.

Informasi HIRADC:
Judul: {{title}}
Departemen: {{department}}
Lokasi: {{location}}
Status: {{status}}

Silakan login ke dashboard HSE untuk melihat perubahan.`,
    description: 'Notifikasi saat register HIRADC diperbarui.',
    variables: ['title', 'department', 'location', 'status'],
    sampleValues: {
      title: 'HIRADC Workshop Tyre',
      department: 'Maintenance',
      location: 'Workshop',
      status: 'review',
    },
  },
  {
    name: 'HSE PTW Created',
    templateCode: 'hse_ptw_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'PTW baru: {{permitNumber}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah dokumen Permit To Work (PTW) baru telah dibuat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi PTW</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor PTW</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{permitNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pekerjaan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{projectName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tipe</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{permitType}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Risk Level</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{riskLevel}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk meninjau dokumen PTW.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Sebuah dokumen Permit To Work (PTW) baru telah dibuat.

Informasi PTW:
Nomor PTW: {{permitNumber}}
Pekerjaan: {{projectName}}
Tipe: {{permitType}}
Lokasi: {{location}}
Risk Level: {{riskLevel}}

Silakan login ke dashboard HSE untuk meninjau dokumen PTW.`,
    description: 'Notifikasi saat PTW baru dibuat.',
    variables: ['permitNumber', 'projectName', 'permitType', 'location', 'riskLevel'],
    sampleValues: {
      permitNumber: 'PTW-20260618-0007',
      projectName: 'Hot work di workshop',
      permitType: 'Hot Work',
      location: 'Workshop Bay 2',
      riskLevel: 'High',
    },
  },
  {
    name: 'HSE PTW Updated',
    templateCode: 'hse_ptw_updated',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update PTW: {{permitNumber}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dokumen Permit To Work (PTW) berikut telah diperbarui.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi PTW</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nomor PTW</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{permitNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pekerjaan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{projectName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Risk Level</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{riskLevel}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk melihat perubahan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Dokumen Permit To Work (PTW) berikut telah diperbarui.

Informasi PTW:
Nomor PTW: {{permitNumber}}
Pekerjaan: {{projectName}}
Status: {{status}}
Risk Level: {{riskLevel}}

Silakan login ke dashboard HSE untuk melihat perubahan.`,
    description: 'Notifikasi saat PTW diperbarui.',
    variables: ['permitNumber', 'projectName', 'status', 'riskLevel'],
    sampleValues: {
      permitNumber: 'PTW-20260618-0007',
      projectName: 'Hot work di workshop',
      status: 'Approved',
      riskLevel: 'High',
    },
  },
  {
    name: 'HSE Observation Alert',
    templateCode: 'hse_observation_alert',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Observasi HSE baru: {{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah observasi HSE baru telah dilaporkan.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Observasi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Site</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{siteName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Pelapor</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reporterName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{category}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Severity</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{severity}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk menindaklanjuti observasi ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Sebuah observasi HSE baru telah dilaporkan.

Informasi Observasi:
Judul: {{title}}
Site: {{siteName}}
Pelapor: {{reporterName}}
Kategori: {{category}}
Severity: {{severity}}
Lokasi: {{location}}

Silakan login ke dashboard HSE untuk menindaklanjuti observasi ini.`,
    description: 'Notifikasi saat observasi HSE baru dibuat.',
    variables: ['siteName', 'reporterName', 'title', 'category', 'severity', 'location', 'notes'],
    sampleValues: {
      siteName: 'Site ABN',
      reporterName: 'Budi Santoso',
      title: 'Unsafe action di workshop',
      category: 'Unsafe Action',
      severity: 'High',
      location: 'Workshop Line 2',
      notes: 'Catatan: operator tidak menggunakan APD lengkap.',
    },
  },
  {
    name: 'HSE Observation Status Update',
    templateCode: 'hse_observation_status_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update observasi HSE: {{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Status observasi HSE berikut telah berubah.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Observasi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Status observasi HSE berikut telah berubah.

Informasi Observasi:
Judul: {{title}}
Lokasi: {{location}}
Status: {{status}}

Silakan login ke dashboard HSE untuk detail lebih lanjut.`,
    description: 'Update status observasi HSE.',
    variables: ['title', 'location', 'status'],
    sampleValues: {
      title: 'Unsafe action di workshop',
      location: 'Workshop Line 2',
      status: 'closed',
    },
  },
  {
    name: 'HSE Incident Alert',
    templateCode: 'hse_incident_alert',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Incident HSE baru: {{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah insiden HSE baru telah dilaporkan.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Insiden</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tipe</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{type}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Impact</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{impact}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Unit</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{unitNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk menindaklanjuti insiden ini.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Sebuah insiden HSE baru telah dilaporkan.

Informasi Insiden:
Judul: {{title}}
Tipe: {{type}}
Impact: {{impact}}
Unit: {{unitNumber}}
Status: {{status}}

Silakan login ke dashboard HSE untuk menindaklanjuti insiden ini.`,
    description: 'Alert incident HSE baru.',
    variables: ['title', 'type', 'impact', 'unitNumber', 'status'],
    sampleValues: {
      title: 'Near miss forklift',
      type: 'Near Miss',
      impact: 'Medium',
      unitNumber: 'FLT-02',
      status: 'open',
    },
  },
  {
    name: 'HSE Incident Status Update',
    templateCode: 'hse_incident_status_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update incident HSE: {{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Status insiden HSE berikut telah berubah.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Insiden</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Unit</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{unitNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Status insiden HSE berikut telah berubah.

Informasi Insiden:
Judul: {{title}}
Unit: {{unitNumber}}
Status: {{status}}

Silakan login ke dashboard HSE untuk detail lebih lanjut.`,
    description: 'Update status incident HSE.',
    variables: ['title', 'unitNumber', 'status'],
    sampleValues: {
      title: 'Near miss forklift',
      unitNumber: 'FLT-02',
      status: 'closed',
    },
  },
  {
    name: 'HSE Incident Record Created',
    templateCode: 'hse_incident_record_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Incident report baru: {{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah laporan insiden HSE baru telah dicatat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Laporan Insiden</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{category}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Severity</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{severity}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">PIC</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{picName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Investigasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{investigationStatus}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk meninjau laporan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Sebuah laporan insiden HSE baru telah dicatat.

Informasi Laporan Insiden:
Judul: {{title}}
Kategori: {{category}}
Severity: {{severity}}
PIC: {{picName}}
Status Investigasi: {{investigationStatus}}

Silakan login ke dashboard HSE untuk meninjau laporan.`,
    description: 'Notifikasi incident report baru.',
    variables: ['title', 'category', 'severity', 'picName', 'investigationStatus'],
    sampleValues: {
      title: 'Slip trip fall area loading',
      category: 'Accident',
      severity: 'Major',
      picName: 'Supervisor Warehouse',
      investigationStatus: 'open',
    },
  },
  {
    name: 'HSE Incident Record Status Update',
    templateCode: 'hse_incident_record_status_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update incident report: {{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Status laporan insiden HSE berikut telah berubah.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Laporan Insiden</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Severity</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{severity}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Sebelumnya</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{previousStatus}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Baru</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{investigationStatus}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">PIC</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{picName}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Status laporan insiden HSE berikut telah berubah.

Informasi Laporan Insiden:
Judul: {{title}}
Severity: {{severity}}
Status Sebelumnya: {{previousStatus}}
Status Baru: {{investigationStatus}}
PIC: {{picName}}

Silakan login ke dashboard HSE untuk detail lebih lanjut.`,
    description: 'Update status incident report HSE.',
    variables: ['title', 'severity', 'previousStatus', 'investigationStatus', 'picName'],
    sampleValues: {
      title: 'Slip trip fall area loading',
      severity: 'Major',
      previousStatus: 'open',
      investigationStatus: 'closed',
      picName: 'Supervisor Warehouse',
    },
  },
  {
    name: 'HSE Safety Inspection Created',
    templateCode: 'hse_safety_inspection_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Safety inspection baru: {{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah safety inspection baru telah dibuat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Inspeksi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{inspectionDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{category}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">PIC</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{picName}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk meninjau inspeksi.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Sebuah safety inspection baru telah dibuat.

Informasi Inspeksi:
Judul: {{title}}
Tanggal: {{inspectionDate}}
Lokasi: {{location}}
Kategori: {{category}}
Status: {{status}}
PIC: {{picName}}

Silakan login ke dashboard HSE untuk meninjau inspeksi.`,
    description: 'Notifikasi inspection baru.',
    variables: ['title', 'inspectionDate', 'location', 'category', 'status', 'picName'],
    sampleValues: {
      title: 'Inspeksi APAR bulanan',
      inspectionDate: '18 Juni 2026',
      location: 'Gudang Timur',
      category: 'APAR',
      status: 'Pending',
      picName: 'HSE Officer',
    },
  },
  {
    name: 'HSE Safety Inspection Status Update',
    templateCode: 'hse_safety_inspection_status_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Update safety inspection: {{title}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Status safety inspection berikut telah berubah.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Inspeksi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Judul</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{title}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Sebelumnya</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{previousStatus}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Baru</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">PIC</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{picName}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Status safety inspection berikut telah berubah.

Informasi Inspeksi:
Judul: {{title}}
Lokasi: {{location}}
Status Sebelumnya: {{previousStatus}}
Status Baru: {{status}}
PIC: {{picName}}

Silakan login ke dashboard HSE untuk detail lebih lanjut.`,
    description: 'Update status inspection.',
    variables: ['title', 'location', 'previousStatus', 'status', 'picName'],
    sampleValues: {
      title: 'Inspeksi APAR bulanan',
      location: 'Gudang Timur',
      previousStatus: 'Pending',
      status: 'Completed',
      picName: 'HSE Officer',
    },
  },
  {
    name: 'HSE Safety Induction Submitted',
    templateCode: 'hse_safety_induction_submitted',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Safety induction baru: {{fullName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah formulir safety induction baru telah disubmit.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Induction</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{fullName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Instansi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{companyOrigin}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Telepon</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{phoneNumber}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tujuan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{purpose}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HSE untuk memproses induction.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Sebuah formulir safety induction baru telah disubmit.

Informasi Induction:
Nama: {{fullName}}
Instansi: {{companyOrigin}}
Telepon: {{phoneNumber}}
Tujuan: {{purpose}}

Silakan login ke dashboard HSE untuk memproses induction.`,
    description: 'Notifikasi form induction baru.',
    variables: ['fullName', 'companyOrigin', 'phoneNumber', 'purpose'],
    sampleValues: {
      fullName: 'Rina Amelia',
      companyOrigin: 'PT Vendor Safety',
      phoneNumber: '081234567890',
      purpose: 'Meeting safety briefing',
    },
  },
  {
    name: 'HSE Inventory Reminder',
    templateCode: 'hse_inventory_reminder',
    templateType: 'Reminder',
    deliveryChannel: 'email',
    recipientScope: 'hse',
    ccEmail: '',
    subject: '[HERO HSE] Pengingat Kedaluwarsa Aset: {{itemName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">HSE</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Aset HSE berikut mendekati masa kedaluwarsa dan memerlukan perhatian segera.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Aset</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Aset</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{itemName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{category}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Lokasi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{location}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Beli</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{purchaseDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Masa Berlaku</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{validityMonths}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Expired</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{expirationDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">PIC</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{picName}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Segera lakukan tindakan perpanjangan atau penggantian aset sebelum masa berlaku habis.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Aset HSE berikut mendekati masa kedaluwarsa dan memerlukan perhatian segera.

Informasi Aset:
Nama Aset: {{itemName}}
Kategori: {{category}}
Lokasi: {{location}}
Tanggal Beli: {{purchaseDate}}
Masa Berlaku: {{validityMonths}}
Tanggal Expired: {{expirationDate}}
PIC: {{picName}}

Segera lakukan tindakan perpanjangan atau penggantian aset sebelum masa berlaku habis.`,
    description: 'Reminder aset HSE mendekati expiry.',
    variables: [
      'itemName',
      'category',
      'location',
      'purchaseDate',
      'validityMonths',
      'expirationDate',
      'picName',
    ],
    sampleValues: {
      itemName: 'APAR Dry Chemical',
      category: 'Fire Safety',
      location: 'Gudang Timur',
      purchaseDate: '2025-06-18',
      validityMonths: '12 bulan',
      expirationDate: '2026-06-18',
      picName: 'HSE Warehouse',
    },
  },
  {
    name: 'HC Employee Created',
    templateCode: 'hc_employee_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc',
    ccEmail: '',
    subject: 'Data employee baru: {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Seorang karyawan baru telah berhasil didaftarkan ke dalam sistem HERO.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Karyawan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Employee ID</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeId}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Email</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeEmail}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Akun</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{accountStatus}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk memverifikasi data.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Seorang karyawan baru telah berhasil didaftarkan ke dalam sistem HERO.

Informasi Karyawan:
Nama: {{employeeName}}
Employee ID: {{employeeId}}
Email: {{employeeEmail}}
Status Akun: {{accountStatus}}

Silakan login ke dashboard HC untuk memverifikasi data.`,
    description: 'Notifikasi data employee baru.',
    variables: ['employeeName', 'employeeId', 'employeeEmail', 'accountStatus'],
    sampleValues: {
      employeeName: 'Ayu Wulandari',
      employeeId: 'EMP-00921',
      employeeEmail: 'ayu.wulandari@company.com',
      accountStatus: 'active',
    },
  },
  {
    name: 'HC Employee Updated',
    templateCode: 'hc_employee_updated',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc',
    ccEmail: '',
    subject: 'Update employee: {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Data karyawan berikut telah diperbarui di dalam sistem HERO.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Karyawan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Employee ID</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeId}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Email</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeEmail}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status Akun</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{accountStatus}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk melihat perubahan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Data karyawan berikut telah diperbarui di dalam sistem HERO.

Informasi Karyawan:
Nama: {{employeeName}}
Employee ID: {{employeeId}}
Email: {{employeeEmail}}
Status Akun: {{accountStatus}}

Silakan login ke dashboard HC untuk melihat perubahan.`,
    description: 'Notifikasi update employee.',
    variables: ['employeeName', 'employeeId', 'employeeEmail', 'accountStatus'],
    sampleValues: {
      employeeName: 'Ayu Wulandari',
      employeeId: 'EMP-00921',
      employeeEmail: 'ayu.wulandari@company.com',
      accountStatus: 'inactive',
    },
  },
  {
    name: 'HC Disciplinary Created',
    templateCode: 'hc_disciplinary_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee',
    ccEmail: '',
    subject: 'Tindakan disipliner baru: {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah tindakan disipliner baru telah dicatat untuk karyawan berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Disipliner</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{categoryName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Severity</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{severity}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Level SP</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{spLevel}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">No. Surat</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{letterNumber}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Sebuah tindakan disipliner baru telah dicatat untuk karyawan berikut.

Informasi Disipliner:
Karyawan: {{employeeName}}
Kategori: {{categoryName}}
Severity: {{severity}}
Level SP: {{spLevel}}
Status: {{status}}
No. Surat: {{letterNumber}}

Silakan login ke dashboard HC untuk detail lebih lanjut.`,
    description: 'Notifikasi tindakan disipliner baru.',
    variables: ['employeeName', 'categoryName', 'severity', 'spLevel', 'status', 'letterNumber'],
    sampleValues: {
      employeeName: 'Rudi Setiawan',
      categoryName: 'Pelanggaran APD',
      severity: 'High',
      spLevel: 'SP1',
      status: 'active',
      letterNumber: 'SP/HC/2026/019',
    },
  },
  {
    name: 'HC Disciplinary Status Update',
    templateCode: 'hc_disciplinary_status_update',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee',
    ccEmail: '',
    subject: 'Update disipliner: {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Status tindakan disipliner untuk karyawan berikut telah berubah.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Disipliner</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{categoryName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Level SP</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{spLevel}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Status tindakan disipliner untuk karyawan berikut telah berubah.

Informasi Disipliner:
Karyawan: {{employeeName}}
Kategori: {{categoryName}}
Level SP: {{spLevel}}
Status: {{status}}

Silakan login ke dashboard HC untuk detail lebih lanjut.`,
    description: 'Update status tindakan disipliner.',
    variables: ['employeeName', 'categoryName', 'spLevel', 'status'],
    sampleValues: {
      employeeName: 'Rudi Setiawan',
      categoryName: 'Pelanggaran APD',
      spLevel: 'SP1',
      status: 'expired',
    },
  },
  {
    name: 'HC Performance Review Created',
    templateCode: 'hc_performance_review_created',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee,reviewer',
    ccEmail: '',
    subject: 'Performance review baru: {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Sebuah performance review baru telah dibuat untuk karyawan berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Performance Review</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Reviewer</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reviewerName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Periode</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{cycleName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk mengisi review.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Sebuah performance review baru telah dibuat untuk karyawan berikut.

Informasi Performance Review:
Karyawan: {{employeeName}}
Reviewer: {{reviewerName}}
Periode: {{cycleName}}
Status: {{status}}

Silakan login ke dashboard HC untuk mengisi review.`,
    description: 'Notifikasi review kinerja baru.',
    variables: ['employeeName', 'reviewerName', 'cycleName', 'status'],
    sampleValues: {
      employeeName: 'Maya Sari',
      reviewerName: 'Supervisor Plant',
      cycleName: 'Annual Review 2026',
      status: 'draft',
    },
  },
  {
    name: 'HC Performance Review Submitted',
    templateCode: 'hc_performance_review_submitted',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee,reviewer',
    ccEmail: '',
    subject: 'Performance review disubmit: {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Performance review untuk karyawan berikut telah disubmit oleh reviewer.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Performance Review</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Reviewer</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reviewerName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Periode</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{cycleName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk meninjau hasil review.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Performance review untuk karyawan berikut telah disubmit oleh reviewer.

Informasi Performance Review:
Karyawan: {{employeeName}}
Reviewer: {{reviewerName}}
Periode: {{cycleName}}
Status: {{status}}

Silakan login ke dashboard HC untuk meninjau hasil review.`,
    description: 'Notifikasi submit review kinerja.',
    variables: ['employeeName', 'reviewerName', 'cycleName', 'status'],
    sampleValues: {
      employeeName: 'Maya Sari',
      reviewerName: 'Supervisor Plant',
      cycleName: 'Annual Review 2026',
      status: 'submitted',
    },
  },
  {
    name: 'HC Performance Review Acknowledged',
    templateCode: 'hc_performance_review_acknowledged',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee,reviewer',
    ccEmail: '',
    subject: 'Performance review diacknowledge: {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Performance review untuk karyawan berikut telah di-acknowledge oleh karyawan terkait.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Performance Review</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Reviewer</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reviewerName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Periode</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{cycleName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{status}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Rating</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{overallRating}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk melihat hasil akhir.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Performance review untuk karyawan berikut telah di-acknowledge oleh karyawan terkait.

Informasi Performance Review:
Karyawan: {{employeeName}}
Reviewer: {{reviewerName}}
Periode: {{cycleName}}
Status: {{status}}
Rating: {{overallRating}}

Silakan login ke dashboard HC untuk melihat hasil akhir.`,
    description: 'Notifikasi acknowledgement review kinerja.',
    variables: ['employeeName', 'reviewerName', 'cycleName', 'status', 'overallRating'],
    sampleValues: {
      employeeName: 'Maya Sari',
      reviewerName: 'Supervisor Plant',
      cycleName: 'Annual Review 2026',
      status: 'acknowledged',
      overallRating: 'A',
    },
  },
  {
    name: 'HC Recruitment Hired Email',
    templateCode: 'hired_email',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: 'Selamat! Anda diterima di PT Chitra Paratama',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Selamat! Anda dinyatakan <strong>lulus seleksi</strong> dan diterima untuk bergabung sebagai <strong>{{jobTitle}}</strong> di PT Chitra Paratama.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Penerimaan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Mulai Kerja</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{startDate}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan lengkapi proses onboarding melalui tautan berikut:</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{onboardingUrl}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Lengkapi Onboarding</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Kami tunggu kontribusi terbaik Anda di PT Chitra Paratama!</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{candidateName}},

Selamat! Anda dinyatakan lulus seleksi dan diterima untuk bergabung sebagai {{jobTitle}} di PT Chitra Paratama.

Informasi Penerimaan:
Posisi: {{jobTitle}}
Tanggal Mulai Kerja: {{startDate}}

Silakan lengkapi proses onboarding melalui tautan berikut:
{{onboardingUrl}}

Kami tunggu kontribusi terbaik Anda di PT Chitra Paratama!

Salam,
Tim Human Capital`,
    description: 'Override pusat untuk email kandidat yang sudah masuk tahap hired.',
    variables: ['candidateName', 'jobTitle', 'startDate', 'onboardingUrl'],
    sampleValues: {
      candidateName: 'Dina Pertiwi',
      jobTitle: 'Operator Plant',
      startDate: '24 Juni 2026',
      onboardingUrl: 'https://hero.example.com/onboarding/sample-token',
    },
  },
  {
    name: 'HC Recruitment Start Date Email',
    templateCode: 'start_date_email',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: 'Informasi mulai kerja {{candidateName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Selamat datang di PT Chitra Paratama! Kami sangat senang menyambut Anda sebagai bagian dari keluarga besar perusahaan kami.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Mulai Kerja</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal Mulai Kerja</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{startDate}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan lengkapi administrasi onboarding melalui tautan berikut:</p><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{onboardingUrl}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Lengkapi Administrasi</a></td></tr></table><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{candidateName}},

Selamat datang di PT Chitra Paratama! Kami sangat senang menyambut Anda sebagai bagian dari keluarga besar perusahaan kami.

Informasi Mulai Kerja:
Posisi: {{jobTitle}}
Tanggal Mulai Kerja: {{startDate}}

Silakan lengkapi administrasi onboarding melalui tautan berikut:
{{onboardingUrl}}

Salam,
Tim Human Capital`,
    description: 'Override pusat untuk email penetapan tanggal mulai kerja kandidat.',
    variables: ['candidateName', 'jobTitle', 'startDate', 'onboardingUrl'],
    sampleValues: {
      candidateName: 'Dina Pertiwi',
      jobTitle: 'Operator Plant',
      startDate: '24 Juni 2026',
      onboardingUrl: 'https://hero.example.com/onboarding/sample-token',
    },
  },
  {
    name: 'HC Recruitment Custom Bulk Email',
    templateCode: 'custom_bulk',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: 'Pesan dari Tim Human Capital',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">{{messageBodyHtml}}</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{candidateName}},

{{messageBody}}

Salam,
Tim Human Capital`,
    description: 'Wrapper pusat untuk email massal kustom ke kandidat.',
    variables: ['candidateName', 'messageBody', 'messageBodyHtml'],
    sampleValues: {
      candidateName: 'Dina Pertiwi',
      messageBody: 'Jadwal seleksi Anda dipindah ke Jumat pukul 09:00.',
      messageBodyHtml: 'Jadwal seleksi Anda dipindah ke Jumat pukul 09:00.',
    },
  },
  {
    name: 'HC MCU Referral To Clinic',
    templateCode: 'mcu_pengantar',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'clinic,hc',
    ccEmail: '',
    subject: '[HERO] Surat Pengantar Medical Check Up - {{candidateName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Kepada Yth. Admin {{clinicName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Mohon bantuannya untuk melaksanakan Medical Check Up (MCU) bagi calon karyawan berikut.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Data Calon Karyawan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{candidateName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal MCU</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{date}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Paket MCU</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{paket}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Biaya MCU akan ditagihkan ke PT Chitra Paratama sesuai dengan perjanjian kerja sama yang telah disepakati.</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Atas perhatian dan bantuannya, kami ucapkan terima kasih.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Kepada Yth. Admin {{clinicName}},

Mohon bantuannya untuk melaksanakan Medical Check Up (MCU) bagi calon karyawan berikut.

Data Calon Karyawan:
Nama: {{candidateName}}
Tanggal MCU: {{date}}
Paket MCU: {{paket}}

Biaya MCU akan ditagihkan ke PT Chitra Paratama.

Atas perhatian dan bantuannya, kami ucapkan terima kasih.`,
    description: 'Override pusat untuk surat pengantar MCU ke klinik.',
    variables: ['candidateName', 'clinicName', 'date', 'paket'],
    sampleValues: {
      candidateName: 'Dina Pertiwi',
      clinicName: 'Klinik Sehat Sentosa',
      date: '25 Juni 2026',
      paket: 'MCU Basic',
    },
  },
  {
    name: 'HC MCU Invitation',
    templateCode: 'mcu_invitation',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'candidate,hc',
    ccEmail: '',
    subject: '[HERO] Undangan Medical Check Up - {{jobTitle}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{candidateName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Anda dijadwalkan untuk mengikuti Medical Check Up (MCU) sebagai bagian dari proses seleksi untuk posisi <strong>{{jobTitle}}</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Jadwal MCU</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Posisi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{jobTitle}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Klinik</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{clinicName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tanggal</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{date}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Paket</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{paket}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Harap datang tepat waktu dan membawa identitas diri yang berlaku.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{candidateName}},

Anda dijadwalkan untuk mengikuti Medical Check Up (MCU) sebagai bagian dari proses seleksi untuk posisi {{jobTitle}}.

Jadwal MCU:
Posisi: {{jobTitle}}
Klinik: {{clinicName}}
Tanggal: {{date}}
Paket: {{paket}}

Harap datang tepat waktu dan membawa identitas diri yang berlaku.

Salam,
Tim Human Capital`,
    description: 'Override pusat untuk undangan MCU ke kandidat.',
    variables: ['candidateName', 'jobTitle', 'clinicName', 'date', 'paket'],
    sampleValues: {
      candidateName: 'Dina Pertiwi',
      jobTitle: 'Operator Plant',
      clinicName: 'Klinik Sehat Sentosa',
      date: '25 Juni 2026',
      paket: 'MCU Basic',
    },
  },
  {
    name: 'HC Contract Review Reminder',
    templateCode: 'contract_review_reminder',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'approver,hc',
    ccEmail: '',
    subject: '[Contract Review] Reminder: {{employeeName}} ({{employeeSn}}) berakhir {{contractEndDate}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Yth. {{recipientName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Berikut adalah pengingat untuk dokumen Contract Review yang masih perlu ditindaklanjuti.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Contract Review</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">SN</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSn}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Section</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSection}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Site</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSite}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Kontrak Berakhir</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{contractEndDate}}</td></tr></table><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{reviewLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Buka Review</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Segera lakukan review sebelum masa kontrak berakhir.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Yth. {{recipientName}},

Berikut adalah pengingat untuk dokumen Contract Review yang masih perlu ditindaklanjuti.

Informasi Contract Review:
Nama Karyawan: {{employeeName}}
SN: {{employeeSn}}
Section: {{employeeSection}}
Site: {{employeeSite}}
Kontrak Berakhir: {{contractEndDate}}

Buka review: {{reviewLink}}

Segera lakukan review sebelum masa kontrak berakhir.`,
    description: 'Pengingat H-60/H-30/H-14/H-7/H-1 untuk workflow contract review.',
    variables: ['recipientName', 'employeeName', 'employeeSn', 'employeeSection', 'employeeSite', 'contractEndDate', 'reviewLink'],
    sampleValues: {
      recipientName: 'Ary Maulana',
      employeeName: 'Budi Santoso',
      employeeSn: 'EMP-00128',
      employeeSection: 'Service',
      employeeSite: 'Balikpapan',
      contractEndDate: '31 Juli 2026',
      reviewLink: 'https://hero.example.com/dashboard/hc/contract-review/form/15',
    },
  },
  {
    name: 'HC Contract Review Approval Notification',
    templateCode: 'contract_review_approval_notification',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'approver,hc',
    ccEmail: '',
    subject: '[Contract Review] Menunggu Persetujuan Anda - {{employeeName}} ({{employeeSn}})',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Yth. {{approverName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dokumen Contract Review berikut membutuhkan persetujuan Anda.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Contract Review</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">SN</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSn}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Section</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSection}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Site</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSite}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Tahap</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{approvalStep}}</td></tr></table><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{approvalLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Buka Approval</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Harap segera memberikan keputusan persetujuan Anda.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Yth. {{approverName}},

Dokumen Contract Review berikut membutuhkan persetujuan Anda.

Informasi Contract Review:
Nama Karyawan: {{employeeName}}
SN: {{employeeSn}}
Section: {{employeeSection}}
Site: {{employeeSite}}
Tahap: {{approvalStep}}

Buka approval: {{approvalLink}}

Harap segera memberikan keputusan persetujuan Anda.`,
    description: 'Override pusat untuk email approver contract review.',
    variables: [
      'approverName',
      'employeeName',
      'employeeSn',
      'employeeSection',
      'employeeSite',
      'approvalStep',
      'approvalLink',
    ],
    sampleValues: {
      approverName: 'Romy Hidayat',
      employeeName: 'Budi Santoso',
      employeeSn: 'EMP-00128',
      employeeSection: 'Service',
      employeeSite: 'Balikpapan',
      approvalStep: 'Step 3',
      approvalLink: 'https://hero.example.com/review/sample-token',
    },
  },
  {
    name: 'HC Contract Review Test Notification',
    templateCode: 'contract_review_test_notification',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'approver,hc',
    ccEmail: '',
    subject: '[TEST] Contract Review - {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Dokumen Contract Review untuk uji coba telah berhasil dibuat.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Tes</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Nama Karyawan</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">SN</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSn}}</td></tr></table><table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:#2563eb;border-radius:6px;padding:10px 20px"><a href="{{reviewLink}}" style="color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block">Buka Form Review</a></td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Email ini adalah notifikasi uji coba (test) untuk memvalidasi workflow Contract Review.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Dokumen Contract Review untuk uji coba telah berhasil dibuat.

Informasi Tes:
Nama Karyawan: {{employeeName}}
SN: {{employeeSn}}

Buka form review: {{reviewLink}}

Email ini adalah notifikasi uji coba (test) untuk memvalidasi workflow Contract Review.`,
    description: 'Notifikasi uji coba contract review workflow.',
    variables: ['employeeName', 'employeeSn', 'reviewLink'],
    sampleValues: {
      employeeName: 'Budi Santoso',
      employeeSn: 'EMP-00128',
      reviewLink: 'https://hero.example.com/dashboard/hc/contract-review/form/15',
    },
  },
  {
    name: 'HR Counseling New Session',
    templateCode: 'hr_counseling_new_session',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'specific',
    ccEmail: '',
    subject: 'Sesi Konsultasi Baru: {{category}}',
    htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0">
<p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{hrName}},</p>
<p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Karyawan <strong>{{employeeName}}</strong> telah memulai sesi konsultasi curhat baru dengan Anda.</p>
<p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Kategori Masalah</p>
<table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#1f2937;font-size:13px">{{category}}</td></tr></table>
<p style="color:#1f2937;font-size:14px;line-height:1.6;margin:16px 0 8px">Silakan masuk ke dashboard untuk membalas pesan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
</td>
</tr></table>
</div>
</div>`,
    textContent: `Halo {{hrName}},

Karyawan {{employeeName}} telah memulai sesi konsultasi curhat baru dengan Anda.

Kategori Masalah: {{category}}

Silakan masuk ke dashboard untuk membalas pesan.`,
    description: 'Notifikasi email ke HR ketika sesi konsultasi baru dibuat oleh karyawan.',
    variables: ['hrName', 'employeeName', 'category', 'sessionId'],
    sampleValues: {
      hrName: 'Budi Santoso',
      employeeName: 'Andi Kusuma',
      category: 'Kesehatan Mental',
      sessionId: '12',
    },
  },
  {
    name: 'HC Leader Performance Submitted',
    templateCode: 'hc_leader_performance_submitted',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee,reviewer',
    ccEmail: '',
    subject: 'Evaluasi Leader Performance disubmit: {{leaderName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#0f172a,#334155);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#cbd5e1;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#94a3b8;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Evaluasi Leader Performance untuk pimpinan berikut telah disubmit.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Evaluasi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Leader</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{leaderName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Reviewer</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reviewerName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Periode</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{period}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Skor Rata-rata</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{overallScore}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk meninjau hasil lengkap evaluasi pimpinan.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Evaluasi Leader Performance untuk pimpinan berikut telah disubmit.
      
Informasi Evaluasi:
Leader: {{leaderName}}
Reviewer: {{reviewerName}}
Periode: {{period}}
Skor Rata-rata: {{overallScore}}

Silakan login ke dashboard HC untuk meninjau hasil lengkap evaluasi pimpinan.`,
    description: 'Notifikasi evaluasi leader performance baru disubmit.',
    variables: ['leaderName', 'reviewerName', 'period', 'overallScore'],
    sampleValues: {
      leaderName: 'Anas Khadafi',
      reviewerName: 'Supervisor Central Service',
      period: '2026 Q1',
      overallScore: '4.33',
    },
  },
  {
    name: 'HC Leader Performance Reviewed',
    templateCode: 'hc_leader_performance_reviewed',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hc,employee,reviewer',
    ccEmail: '',
    subject: 'Evaluasi Leader Performance selesai ditinjau: {{leaderName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#0f172a,#334155);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#cbd5e1;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital</p></td>
<td align="right"><span style="color:#94a3b8;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Evaluasi Leader Performance untuk pimpinan berikut telah selesai ditinjau oleh HC / Admin.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Informasi Evaluasi</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Leader</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{leaderName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Reviewer</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{reviewerName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Periode</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{period}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top">Status</td><td style="padding:4px 0;color:#1f2937;font-size:13px">Reviewed</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Silakan login ke dashboard HC untuk detail lebih lanjut.</p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Evaluasi Leader Performance untuk pimpinan berikut telah selesai ditinjau oleh HC / Admin.
      
Informasi Evaluasi:
Leader: {{leaderName}}
Reviewer: {{reviewerName}}
Periode: {{period}}
Status: Reviewed

Silakan login ke dashboard HC untuk detail lebih lanjut.`,
    description: 'Notifikasi evaluasi leader performance selesai ditinjau.',
    variables: ['leaderName', 'reviewerName', 'period'],
    sampleValues: {
      leaderName: 'Anas Khadafi',
      reviewerName: 'Supervisor Central Service',
      period: '2026 Q1',
    },
  },
  {
    name: 'HC MCU Annual Reminder',
    templateCode: 'mcu_annual_reminder',
    templateType: 'Reminder',
    deliveryChannel: 'email',
    recipientScope: 'employee,hc',
    ccEmail: '',
    subject: '[HERO] Pengingat Medical Check Up Tahunan - {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#93c5fd;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Human Capital · Wellness</p></td>
<td align="right"><span style="color:#60a5fa;font-size:22px">&#9670;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Ini adalah pengingat bahwa Medical Check Up (MCU) tahunan Anda akan jatuh tempo pada <strong>{{dueDate}}</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Detail MCU</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">SN</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeSn}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">Departemen</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{departmentName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">Jatuh Tempo</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{dueDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">Hari Lagi</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{daysUntilDue}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:12px 0 0">Mohon segera koordinasi dengan HC untuk penjadwalan MCU tahunan Anda.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{employeeName}},

Ini pengingat bahwa Medical Check Up (MCU) tahunan Anda akan jatuh tempo pada {{dueDate}}.

Detail MCU:
Nama: {{employeeName}}
SN: {{employeeSn}}
Departemen: {{departmentName}}
Jatuh Tempo: {{dueDate}}
Hari Lagi: {{daysUntilDue}}

Mohon segera koordinasi dengan HC untuk penjadwalan MCU tahunan Anda.

Salam,
Tim Human Capital`,
    description: 'Pengingat MCU tahunan untuk karyawan aktif (setahun sekali).',
    variables: ['employeeName', 'employeeSn', 'departmentName', 'dueDate', 'daysUntilDue'],
    sampleValues: {
      employeeName: 'Dina Pertiwi',
      employeeSn: 'CP-2024-001',
      departmentName: 'Service',
      dueDate: '25 Juli 2026',
      daysUntilDue: '30',
    },
  },
  {
    name: 'HC MCU Result Fit',
    templateCode: 'mcu_result_fit',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'employee,hc',
    ccEmail: '',
    subject: '[HERO] Hasil MCU Fit - {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#065f46,#10b981);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#a7f3d0;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Hasil MCU · Fit</p></td>
<td align="right"><span style="color:#6ee7b7;font-size:22px">&#10003;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Hasil Medical Check Up Anda telah diterima dan dikategorikan <strong style="color:#059669">Fit</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Ringkasan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">Tanggal MCU</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{mcuDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#059669;font-size:13px;font-weight:600">Fit</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:12px 0 0"><strong>Kesimpulan:</strong> {{kesimpulan}}</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:8px 0 0"><strong>Saran:</strong> {{saran}}</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{employeeName}},

Hasil Medical Check Up Anda telah diterima dan dikategorikan Fit.

Ringkasan:
Nama: {{employeeName}}
Tanggal MCU: {{mcuDate}}
Kategori: Fit

Kesimpulan: {{kesimpulan}}
Saran: {{saran}}

Salam,
Tim Human Capital`,
    description: 'Notifikasi hasil MCU Fit ke karyawan + HC.',
    variables: ['employeeName', 'mcuDate', 'kesimpulan', 'saran'],
    sampleValues: {
      employeeName: 'Dina Pertiwi',
      mcuDate: '25 Juni 2026',
      kesimpulan: 'Hasil MCU dalam batas normal.',
      saran: 'Pertahankan pola hidup sehat dan rutin kontrol tahunan.',
    },
  },
  {
    name: 'HC MCU Result Unfit',
    templateCode: 'mcu_result_unfit',
    templateType: 'Notification',
    deliveryChannel: 'email',
    recipientScope: 'employee,hc',
    ccEmail: '',
    subject: '[HERO] Hasil MCU Perlu Tindak Lanjut - {{employeeName}}',
    htmlContent:
      `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:20px">
<div style="background:linear-gradient(135deg,#991b1b,#ef4444);padding:18px 24px;border-radius:8px 8px 0 0">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:1px">HERO</h1>
<p style="color:#fecaca;font-size:11px;margin:2px 0 0;text-transform:uppercase;letter-spacing:2px">Hasil MCU · Perlu Tindak Lanjut</p></td>
<td align="right"><span style="color:#fca5a5;font-size:22px">&#9888;</span></td>
</tr></table>
</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:0"><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Halo {{employeeName}},</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 8px">Hasil Medical Check Up Anda telah diterima dan dikategorikan <strong style="color:#dc2626">{{kategori}}</strong>.</p><p style="color:#374151;font-size:13px;font-weight:600;margin:16px 0 4px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">Ringkasan</p><table cellpadding="0" cellspacing="0"><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">Nama</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{employeeName}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">Tanggal MCU</td><td style="padding:4px 0;color:#1f2937;font-size:13px">{{mcuDate}}</td></tr><tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">Kategori</td><td style="padding:4px 0;color:#dc2626;font-size:13px;font-weight:600">{{kategori}}</td></tr></table><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:12px 0 0"><strong>Kesimpulan:</strong> {{kesimpulan}}</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:8px 0 0"><strong>Saran:</strong> {{saran}}</p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:12px 0 0">Mohon segera koordinasi dengan HC untuk tindak lanjut sesuai saran medis.</p><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0">Salam,<br><strong style="color:#374151">Tim Human Capital</strong></p>
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="padding-top:20px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5">© 2026 PT Chitra Paratama</p>
<p style="color:#9ca3af;font-size:10px;margin:4px 0 0">Email ini dikirim secara otomatis. Harap tidak membalas langsung.</p>
</td>
</tr></table>
</div>
</div>`,
    textContent:
      `Halo {{employeeName}},

Hasil Medical Check Up Anda telah diterima dan dikategorikan {{kategori}}.

Ringkasan:
Nama: {{employeeName}}
Tanggal MCU: {{mcuDate}}
Kategori: {{kategori}}

Kesimpulan: {{kesimpulan}}
Saran: {{saran}}

Mohon segera koordinasi dengan HC untuk tindak lanjut sesuai saran medis.

Salam,
Tim Human Capital`,
    description: 'Notifikasi hasil MCU Unfit/Perlu Review ke karyawan + HC.',
    variables: ['employeeName', 'mcuDate', 'kategori', 'kesimpulan', 'saran'],
    sampleValues: {
      employeeName: 'Dina Pertiwi',
      mcuDate: '25 Juni 2026',
      kategori: 'Unfit',
      kesimpulan: 'Ditemukan indikasi hipertensi dan kolesterol tinggi.',
      saran: 'Konsultasi dokter spesialis dalam 2 minggu dan kontrol tekanan darah secara berkala.',
    },
  },
]
function escapeEmailHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatEmailBody(value: string) {
  return escapeEmailHtml(value.trim())
    .replace(/\n{3,}/g, '\n\n')
    .split('\n\n')
    .map((paragraph) => {
      const lines = paragraph.split('\n').filter(Boolean)
      return `<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.75">${lines.join('<br />')}</p>`
    })
    .join('')
}

function inferTemplateFeature(templateCode: string) {
  const prefixes: [string, string][] = [
    ['hc_leader_performance_', 'HC Management'],
    ['approval_', 'Approval'],
    ['attendance_permission_', 'Attendance / Permission'],
    ['daily_report_', 'Daily Report'],
    ['leave_request_', 'Leave'],
    ['overtime_', 'Overtime'],
    ['daily_activity_', 'Daily Activity'],
    ['offboarding_', 'Offboarding'],
    ['hse_', 'HSE Safety'],
    ['hc_employee_', 'HC Management'],
    ['hc_disciplinary_', 'HC Management'],
    ['hc_performance_review_', 'HC Management'],
    ['contract_review_', 'Contract Review'],
    ['user_invitation', 'User Management'],
    ['onboarding_link', 'Onboarding'],
    ['hc_onboarding_', 'HC Recruitment'],
    ['application_received', 'HC Recruitment'],
    ['interview_invitation', 'HC Recruitment'],
    ['test_assigned', 'HC Recruitment'],
    ['offering_letter', 'HC Recruitment'],
    ['hired_email', 'HC Recruitment'],
    ['start_date_email', 'HC Recruitment'],
    ['custom_bulk', 'HC Recruitment'],
    ['mcu_', 'HC Recruitment'],
    ['hr_counseling_', 'HR Counseling'],
  ]
  return prefixes.find(([prefix]) => templateCode.startsWith(prefix))?.[1] ?? 'Custom'
}
function buildUnifiedEmailHtml(preset: EmailTemplatePreset) {
  const feature = inferTemplateFeature(preset.templateCode)
  const body = formatEmailBody(preset.textContent || preset.description || preset.subject)
  return `<div style="margin:0;padding:0;background:#e5e7eb;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e5e7eb;padding:28px 12px">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 22px 70px rgba(15,23,42,.16);border:1px solid #cbd5e1">
<tr><td style="background:#0f172a;padding:0">
<div style="padding:26px 28px;background:linear-gradient(135deg,#020617 0%,#0f172a 52%,#1e3a8a 100%)">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="vertical-align:top">
<p style="margin:0;color:#93c5fd;font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:700">PT Chitra Paratama</p>
<h1 style="margin:7px 0 0;color:#ffffff;font-size:28px;line-height:1.12;font-weight:800;letter-spacing:-.03em">HERO Notification</h1>
<p style="margin:8px 0 0;color:#cbd5e1;font-size:13px;line-height:1.5">Hub for Employee Reporting & Operations</p>
</td>
<td align="right" style="vertical-align:top">
<div style="display:inline-block;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:8px 12px;color:#dbeafe;background:rgba(255,255,255,.08);font-size:12px;font-weight:700">${escapeEmailHtml(preset.templateType)}</div>
</td>
</tr></table>
</div>
</td></tr>
<tr><td style="padding:28px 28px 10px">
<div style="display:inline-block;margin-bottom:14px;border-radius:999px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:6px 10px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">${escapeEmailHtml(feature)}</div>
<h2 style="margin:0 0 10px;color:#0f172a;font-size:22px;line-height:1.28;font-weight:800;letter-spacing:-.02em">${escapeEmailHtml(preset.subject)}</h2>
<p style="margin:0 0 20px;color:#64748b;font-size:13px;line-height:1.6">${escapeEmailHtml(preset.description)}</p>
<div style="height:1px;background:linear-gradient(90deg,#1d4ed8,#e2e8f0);margin:0 0 22px"></div>
${body}
</td></tr>
<tr><td style="padding:8px 28px 30px">
<div style="border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;padding:16px 18px">
<p style="margin:0;color:#0f172a;font-size:13px;font-weight:800">PT Chitra Paratama</p>
<p style="margin:5px 0 0;color:#64748b;font-size:12px;line-height:1.6">Email ini dikirim otomatis oleh sistem HERO. Mohon tidak membalas langsung email ini.</p>
<p style="margin:10px 0 0;color:#94a3b8;font-size:11px;line-height:1.5">© 2026 PT Chitra Paratama. All rights reserved.</p>
</div>
</td></tr>
</table>
</td></tr>
</table>
</div>`
}

function buildUnifiedEmailText(preset: EmailTemplatePreset) {
  return `PT Chitra Paratama — HERO Notification\n${preset.subject}\n\n${preset.textContent.trim()}\n\nEmail ini dikirim otomatis oleh sistem HERO PT Chitra Paratama. Mohon tidak membalas langsung email ini.`
}

function applyUnifiedEmailDesign(preset: EmailTemplatePreset): EmailTemplatePreset {
  return {
    ...preset,
    htmlContent: buildUnifiedEmailHtml(preset),
    textContent: buildUnifiedEmailText(preset),
  }
}

export const EMAIL_TEMPLATE_PRESETS: EmailTemplatePreset[] = RAW_EMAIL_TEMPLATE_PRESETS.map(applyUnifiedEmailDesign)


export const EMAIL_TEMPLATE_PRESET_MAP = Object.fromEntries(
  EMAIL_TEMPLATE_PRESETS.map((preset) => [preset.templateCode, preset])
) satisfies Record<string, EmailTemplatePreset>

const TEMPLATE_FEATURE_PREFIXES: [string, string][] = [
  ["hc_leader_performance_", "HC Management"],
  ["approval_", "Approval"],
  ["attendance_permission_", "Attendance / Permission"],
  ["daily_report_", "Daily Report"],
  ["leave_request_", "Leave"],
  ["overtime_", "Overtime"],
  ["daily_activity_", "Daily Activity"],
  ["offboarding_", "Offboarding"],
  ["hse_", "HSE Safety"],
  ["hc_employee_", "HC Management"],
  ["hc_disciplinary_", "HC Management"],
  ["hc_performance_review_", "HC Management"],
  ["contract_review_", "Contract Review"],
  ["user_invitation", "User Management"],
  ["onboarding_link", "Onboarding"],
  ["hc_onboarding_", "HC Recruitment"],
  ["application_received", "HC Recruitment"],
  ["interview_invitation", "HC Recruitment"],
  ["test_assigned", "HC Recruitment"],
  ["offering_letter", "HC Recruitment"],
  ["hired_email", "HC Recruitment"],
  ["start_date_email", "HC Recruitment"],
  ["custom_bulk", "HC Recruitment"],
  ["mcu_", "HC Recruitment"],
  ["hr_counseling_", "HR Counseling"],
];

export function getTemplateFeature(templateCode: string): string {
  for (const [prefix, feature] of TEMPLATE_FEATURE_PREFIXES) {
    if (templateCode.startsWith(prefix)) return feature;
  }
  return "Custom";
}
