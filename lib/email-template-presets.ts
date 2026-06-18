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
  {
    name: 'HSE Observation Alert',
    templateCode: 'hse_observation_alert',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'hse',
    ccEmail: '',
    subject: 'Observasi HSE baru: {{title}}',
    htmlContent:
      '<p>Observasi HSE baru telah dibuat.</p><p>Site: {{siteName}}</p><p>Pelapor: {{reporterName}}</p><p>Kategori: {{category}}</p><p>Severity: {{severity}}</p><p>Lokasi: {{location}}</p><p>{{notes}}</p>',
    textContent:
      'Observasi HSE baru telah dibuat. Site: {{siteName}}. Pelapor: {{reporterName}}. Kategori: {{category}}. Severity: {{severity}}. Lokasi: {{location}}. {{notes}}',
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
      '<p>Status observasi HSE berubah.</p><p>Judul: {{title}}</p><p>Lokasi: {{location}}</p><p>Status: {{status}}</p>',
    textContent:
      'Status observasi HSE berubah. Judul: {{title}}. Lokasi: {{location}}. Status: {{status}}.',
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
      '<p>Incident HSE baru telah dibuat.</p><p>Tipe: {{type}}</p><p>Impact: {{impact}}</p><p>Unit: {{unitNumber}}</p><p>Status: {{status}}</p>',
    textContent:
      'Incident HSE baru telah dibuat. Tipe: {{type}}. Impact: {{impact}}. Unit: {{unitNumber}}. Status: {{status}}.',
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
      '<p>Status incident HSE berubah.</p><p>Judul: {{title}}</p><p>Unit: {{unitNumber}}</p><p>Status: {{status}}</p>',
    textContent:
      'Status incident HSE berubah. Judul: {{title}}. Unit: {{unitNumber}}. Status: {{status}}.',
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
      '<p>Incident report HSE baru dicatat.</p><p>Kategori: {{category}}</p><p>Severity: {{severity}}</p><p>PIC: {{picName}}</p><p>Status: {{investigationStatus}}</p>',
    textContent:
      'Incident report HSE baru dicatat. Kategori: {{category}}. Severity: {{severity}}. PIC: {{picName}}. Status: {{investigationStatus}}.',
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
      '<p>Status incident report berubah.</p><p>Judul: {{title}}</p><p>Severity: {{severity}}</p><p>Status lama: {{previousStatus}}</p><p>Status baru: {{investigationStatus}}</p><p>PIC: {{picName}}</p>',
    textContent:
      'Status incident report berubah. Judul: {{title}}. Severity: {{severity}}. Status lama: {{previousStatus}}. Status baru: {{investigationStatus}}. PIC: {{picName}}.',
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
      '<p>Safety inspection baru dibuat.</p><p>Tanggal: {{inspectionDate}}</p><p>Lokasi: {{location}}</p><p>Kategori: {{category}}</p><p>Status: {{status}}</p><p>PIC: {{picName}}</p>',
    textContent:
      'Safety inspection baru dibuat. Tanggal: {{inspectionDate}}. Lokasi: {{location}}. Kategori: {{category}}. Status: {{status}}. PIC: {{picName}}.',
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
      '<p>Status safety inspection berubah.</p><p>Judul: {{title}}</p><p>Lokasi: {{location}}</p><p>Status lama: {{previousStatus}}</p><p>Status baru: {{status}}</p><p>PIC: {{picName}}</p>',
    textContent:
      'Status safety inspection berubah. Judul: {{title}}. Lokasi: {{location}}. Status lama: {{previousStatus}}. Status baru: {{status}}. PIC: {{picName}}.',
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
      '<p>Form safety induction baru disubmit.</p><p>Nama: {{fullName}}</p><p>Instansi: {{companyOrigin}}</p><p>Telepon: {{phoneNumber}}</p><p>Tujuan: {{purpose}}</p>',
    textContent:
      'Form safety induction baru disubmit. Nama: {{fullName}}. Instansi: {{companyOrigin}}. Telepon: {{phoneNumber}}. Tujuan: {{purpose}}.',
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
      '<p>Aset HSE mendekati kedaluwarsa.</p><p>Nama: {{itemName}}</p><p>Kategori: {{category}}</p><p>Lokasi: {{location}}</p><p>Tanggal beli: {{purchaseDate}}</p><p>Masa berlaku: {{validityMonths}}</p><p>Tanggal expired: {{expirationDate}}</p><p>PIC: {{picName}}</p>',
    textContent:
      'Aset HSE mendekati kedaluwarsa. Nama: {{itemName}}. Kategori: {{category}}. Lokasi: {{location}}. Tanggal beli: {{purchaseDate}}. Masa berlaku: {{validityMonths}}. Tanggal expired: {{expirationDate}}. PIC: {{picName}}.',
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
]

export const EMAIL_TEMPLATE_PRESET_MAP = Object.fromEntries(
  EMAIL_TEMPLATE_PRESETS.map((preset) => [preset.templateCode, preset])
) satisfies Record<string, EmailTemplatePreset>
