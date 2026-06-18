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

export const EMAIL_TEMPLATE_PRESETS: EmailTemplatePreset[] = [
  {
    name: 'Approval Assignment',
    templateCode: 'approval_assignment',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'approver',
    ccEmail: '',
    subject: 'Tugas approval baru #{{requestId}}',
    htmlContent: '<p>Request #{{requestId}} menunggu approval Anda.</p>',
    textContent: 'Request #{{requestId}} menunggu approval Anda.',
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
    htmlContent: '<p>SLA request #{{requestId}} hampir jatuh tempo.</p>',
    textContent: 'SLA request #{{requestId}} hampir jatuh tempo.',
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
      '<p>Izin {{permissionType}} atas nama {{employeeName}} tanggal {{requestDate}} menunggu approval HR.</p>',
    textContent:
      'Izin {{permissionType}} atas nama {{employeeName}} tanggal {{requestDate}} menunggu approval HR.',
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
      '<p>Halo {{employeeName}},</p><p>Pengajuan {{permissionType}} Anda telah {{decisionLabel}}.</p><p>Tanggal: {{requestDate}}</p><p>{{approverNote}}</p>',
    textContent:
      'Halo {{employeeName}}, pengajuan {{permissionType}} Anda telah {{decisionLabel}}. Tanggal: {{requestDate}}. {{approverNote}}',
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
    htmlContent: '<p>Daily report {{siteName}} tanggal {{reportDate}} siap dikirim.</p>',
    textContent: 'Daily report {{siteName}} tanggal {{reportDate}} siap dikirim.',
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
      '<p>Halo {{userName}},</p><p>Akun HERO Anda sudah dibuat.</p><p>Terima undangan: <a href="{{invitationLink}}">{{invitationLink}}</a></p><p>Verifikasi email: <a href="{{verificationLink}}">{{verificationLink}}</a></p>',
    textContent:
      'Halo {{userName}}, akun HERO Anda sudah dibuat. Terima undangan: {{invitationLink}}. Verifikasi email: {{verificationLink}}',
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
      '<p>Halo {{candidateName}},</p><p>Silakan lengkapi onboarding Anda melalui link berikut:</p><p><a href="{{onboardingLink}}">{{onboardingLink}}</a></p>',
    textContent:
      'Halo {{candidateName}}, silakan lengkapi onboarding Anda melalui link berikut: {{onboardingLink}}',
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
      '<p>{{employeeName}} mengirim pengajuan cuti {{leaveTypeName}} untuk {{startDate}} sampai {{endDate}} ({{totalDays}} hari).</p><p>{{reason}}</p>',
    textContent:
      '{{employeeName}} mengirim pengajuan cuti {{leaveTypeName}} untuk {{startDate}} sampai {{endDate}} ({{totalDays}} hari). {{reason}}',
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
      '<p>Halo {{employeeName}},</p><p>Pengajuan cuti {{leaveTypeName}} Anda telah {{decisionLabel}}.</p><p>{{startDate}} sampai {{endDate}}</p><p>{{approverName}}</p><p>{{rejectionReason}}</p>',
    textContent:
      'Halo {{employeeName}}, pengajuan cuti {{leaveTypeName}} Anda telah {{decisionLabel}}. {{startDate}} sampai {{endDate}}. {{approverName}} {{rejectionReason}}',
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
      '<p>{{title}} dijadwalkan untuk {{workDate}}.</p><p>Nomor SPL: {{splNumber}}</p><p>Jam mulai: {{plannedStart}}</p><p>Jam selesai: {{plannedEnd}}</p>',
    textContent:
      '{{title}} dijadwalkan untuk {{workDate}}. Nomor SPL: {{splNumber}}. Jam mulai: {{plannedStart}}. Jam selesai: {{plannedEnd}}.',
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
      '<p>{{employeeName}} mengirim daily activity baru.</p><p>Aktivitas: {{activityTitle}}</p><p>Kategori: {{activityType}}</p><p>Waktu: {{submissionTime}}</p><p>{{notes}}</p>',
    textContent:
      '{{employeeName}} mengirim daily activity baru. Aktivitas: {{activityTitle}}. Kategori: {{activityType}}. Waktu: {{submissionTime}}. {{notes}}',
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
      '<p>Halo {{employeeName}},</p><p>{{intro}}</p><p>Status: {{status}}</p><p>{{detailsSummary}}</p>',
    textContent: 'Halo {{employeeName}}, {{intro}} Status: {{status}}. {{detailsSummary}}',
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
]

export const EMAIL_TEMPLATE_PRESET_MAP = Object.fromEntries(
  EMAIL_TEMPLATE_PRESETS.map((preset) => [preset.templateCode, preset])
) satisfies Record<string, EmailTemplatePreset>
