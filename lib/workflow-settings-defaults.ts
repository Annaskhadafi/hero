export type WorkflowApprovalMatrix = {
  sectionHeads?: Array<{ section: string; name: string; email: string }>
  safetyOfficerName?: string
  safetyOfficerEmail?: string
  fieldPicName?: string
  fieldPicEmail?: string
  authorizedByName?: string
  authorizedByEmail?: string
  managerName?: string
  managerEmail?: string
  hrName?: string
  hrEmail?: string
  hoSites?: string[]
}

export type EmailTemplateConfig = {
  subject: string
  body: string
}

export type DailyActivityWorkflowSettings = {
  approvalMatrix: WorkflowApprovalMatrix
  reminderDaysBefore: number[]
  emailTemplates: Record<string, EmailTemplateConfig>
}

export type OvertimeWorkflowSettings = {
  approvalMatrix: WorkflowApprovalMatrix
  reminderDaysBefore: number[]
  emailTemplates: Record<string, EmailTemplateConfig>
}

export type PtwWorkflowSettings = {
  approvalMatrix: WorkflowApprovalMatrix
  reminderDaysBefore: number[]
  emailTemplates: Record<string, EmailTemplateConfig>
}

export const DEFAULT_DAILY_ACTIVITY_SETTINGS: DailyActivityWorkflowSettings = {
  approvalMatrix: {
    sectionHeads: [
      { section: 'Technical Support', name: 'Alfi', email: 'alfi@chitraparatama.co.id' },
      { section: 'Workshop', name: 'Bagus', email: 'bagus@chitraparatama.co.id' },
      { section: 'Training Support', name: 'Adit', email: 'adit@chitraparatama.co.id' },
      { section: 'SHE Support', name: 'Suhartono', email: 'suhartono@chitraparatama.co.id' },
      { section: 'Supply Chain Management', name: 'Aris', email: 'aris@chitraparatama.co.id' },
    ],
    managerName: 'Romy Hidayat',
    managerEmail: 'romy.hidayat@chitraparatama.co.id',
    hrName: 'Kesuma Bagaskara',
    hrEmail: 'kesuma.bagaskara@chitraparatama.co.id',
    hoSites: ['HO', 'Head Office', 'Balikpapan HO'],
  },
  reminderDaysBefore: [1, 2, 3],
  emailTemplates: {
    approvalStep: {
      subject: '[Daily Activity] Menunggu Persetujuan Anda: {{sessionCode}} - {{employeeName}} ({{approvalStep}})',
      body: 'Halo {{approverName}},\n\nLaporan aktivitas harian {{sessionCode}} atas nama {{employeeName}} menunggu tanda tangan Anda pada tahap {{approvalStep}}.\n\nSilakan review:\n{{approvalLink}}\n\nHormat kami,\nPT Chitra Paratama',
    },
    approvalCompleted: {
      subject: '[Daily Activity] Laporan Aktivitas Selesai Disetujui: {{sessionCode}} - {{employeeName}}',
      body: 'Halo {{employeeName}},\n\nLaporan aktivitas harian Anda ({{sessionCode}}) telah selesai disetujui oleh seluruh pihak.\n\nDetail:\n{{approvalLink}}\n\nHormat kami,\nPT Chitra Paratama',
    },
    reminder: {
      subject: '[REMINDER] Menunggu Persetujuan Daily Activity: {{sessionCode}} - {{employeeName}}',
      body: 'Halo {{approverName}},\n\nPengingat bahwa Laporan Aktivitas Harian {{sessionCode}} atas nama {{employeeName}} masih menunggu persetujuan Anda.\n\nSilakan buka:\n{{approvalLink}}\n\nTerima kasih,\nPT Chitra Paratama',
    },
  },
}

export const DEFAULT_OVERTIME_SETTINGS: OvertimeWorkflowSettings = {
  approvalMatrix: {
    sectionHeads: [
      { section: 'Technical Support', name: 'Alfi', email: 'alfi@chitraparatama.co.id' },
      { section: 'Workshop', name: 'Bagus', email: 'bagus@chitraparatama.co.id' },
      { section: 'Training Support', name: 'Adit', email: 'adit@chitraparatama.co.id' },
      { section: 'SHE Support', name: 'Suhartono', email: 'suhartono@chitraparatama.co.id' },
      { section: 'Supply Chain Management', name: 'Aris', email: 'aris@chitraparatama.co.id' },
    ],
    managerName: 'Romy Hidayat',
    managerEmail: 'romy.hidayat@chitraparatama.co.id',
    hrName: 'Kesuma Bagaskara',
    hrEmail: 'kesuma.bagaskara@chitraparatama.co.id',
    hoSites: ['HO', 'Head Office', 'Balikpapan HO'],
  },
  reminderDaysBefore: [1, 2, 3],
  emailTemplates: {
    approvalStep: {
      subject: '[Overtime SPL] Menunggu Persetujuan: {{splNumber}} - {{title}} ({{approvalStep}})',
      body: 'Halo {{approverName}},\n\nSurat Perintah Lembur ({{splNumber}}) atas nama {{employeeName}} menunggu tanda tangan Anda pada tahap {{approvalStep}}.\n\nSilakan review:\n{{approvalLink}}\n\nHormat kami,\nPT Chitra Paratama',
    },
    approvalCompleted: {
      subject: '[Overtime SPL] SPL Selesai Disetujui: {{splNumber}} - {{title}}',
      body: 'Halo {{employeeName}},\n\nPengajuan Surat Perintah Lembur (SPL) {{splNumber}} telah selesai disetujui.\n\nDetail:\n{{approvalLink}}\n\nHormat kami,\nPT Chitra Paratama',
    },
    reminder: {
      subject: '[REMINDER] Menunggu Persetujuan Overtime SPL: {{splNumber}} - {{title}}',
      body: 'Halo {{approverName}},\n\nPengingat bahwa Surat Perintah Lembur {{splNumber}} masih menunggu persetujuan Anda.\n\nSilakan buka:\n{{approvalLink}}\n\nTerima kasih,\nPT Chitra Paratama',
    },
  },
}

export const DEFAULT_PTW_SETTINGS: PtwWorkflowSettings = {
  approvalMatrix: {
    safetyOfficerName: 'Pemberi Kerja',
    safetyOfficerEmail: 'hse.safety@chitraparatama.co.id',
    fieldPicName: 'Safety Dept',
    fieldPicEmail: 'hse.safety@chitraparatama.co.id',
    authorizedByName: 'Authorized Official',
    authorizedByEmail: 'hse.safety@chitraparatama.co.id',
    managerName: 'HSE Manager',
    managerEmail: 'hse.manager@chitraparatama.co.id',
    hoSites: ['HO', 'Head Office', 'Balikpapan HO'],
  },
  reminderDaysBefore: [1, 2, 3],
  emailTemplates: {
    approvalStep: {
      subject: '[Izin Kerja PTW] Menunggu Persetujuan: {{permitNumber}} - {{projectName}} ({{approvalStep}})',
      body: 'Halo {{approverName}},\n\nDokumen Izin Kerja Aman (PTW) {{permitNumber}} untuk proyek {{projectName}} menunggu tanda tangan Anda pada tahap {{approvalStep}}.\n\nSilakan review:\n{{approvalLink}}\n\nHormat kami,\nPT Chitra Paratama',
    },
    approvalCompleted: {
      subject: '[Izin Kerja PTW] PTW Terbit & Disetujui: {{permitNumber}} - {{projectName}}',
      body: 'Halo {{applicantName}},\n\nIzin Kerja Aman (PTW) {{permitNumber}} telah selesai disetujui dan dinyatakan sah untuk pekerjaan di lapangan.\n\nDetail:\n{{approvalLink}}\n\nHormat kami,\nPT Chitra Paratama',
    },
    reminder: {
      subject: '[REMINDER] Menunggu Persetujuan Izin Kerja PTW: {{permitNumber}}',
      body: 'Halo {{approverName}},\n\nPengingat bahwa dokumen Izin Kerja Aman {{permitNumber}} masih menunggu persetujuan Anda.\n\nSilakan buka:\n{{approvalLink}}\n\nTerima kasih,\nPT Chitra Paratama',
    },
  },
}
