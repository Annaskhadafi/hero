export type Language = 'id' | 'en'

export const translations: Record<Language, Record<string, string>> = {
  id: {
    // Header & Navigation
    'app.name': 'HERO',
    'app.tagline': 'Hub for Employee Reporting & Operations',
    'desktop_workspace': 'Workspace Desktop',
    'operational_workspace': 'Workspace Operasional',
    'search.placeholder': 'Cari halaman, perintah, atau modul',
    'search.command_placeholder': 'Cari menu atau aksi...',
    'search.no_results': 'Tidak ada hasil ditemukan.',
    'ctrl_k': 'Ctrl K',
    
    // Auth & User
    'auth.logout': 'Keluar',
    'auth.logging_out': 'Keluar...',
    'auth.login': 'Masuk',
    'auth.profile': 'Profil',
    'auth.account': 'Akun',
    'auth.billing': 'Tagihan',
    
    // Notifications
    'notifications.title': 'Notifikasi',
    'notifications.signal_queue': 'Antrean Sinyal',
    'notifications.mark_read': 'Tandai dibaca',
    'notifications.clear': 'Hapus',
    'notifications.clear_all': 'Hapus Semua',
    'notifications.mark_all_read': 'Tandai Semua Dibaca',
    'notifications.empty': 'Belum ada notifikasi.',
    'notifications.view_all': 'Lihat semua notifikasi',
    'notifications.read': 'Dibaca',
    'notifications.unread': 'Belum Dibaca',
    
    // Theme & Language
    'theme.toggle': 'Ganti Tema',
    'theme.light': 'Terang',
    'theme.dark': 'Gelap',
    'theme.system': 'Sistem',
    'language.select': 'Pilih Bahasa',
    'language.id': 'Bahasa Indonesia',
    'language.en': 'English',
    'language.id_short': 'ID',
    'language.en_short': 'EN',
    
    // Desktop Sidebar & Document Navigation
    'sidebar.add_activity': 'Tambah Aktivitas',
    'sidebar.quick_action': 'Aksi Cepat',
    'sidebar.documents': 'Dokumen',
    'sidebar.more_documents': 'Dokumen lainnya',
    'sidebar.more': 'Lainnya',
    'sidebar.open': 'Buka',
    'sidebar.share': 'Bagikan',
    'sidebar.delete': 'Hapus',
    
    // Mobile Drawer & Bottom Navigation
    'nav.dashboard': 'Dashboard',
    'nav.activity': 'Aktivitas Harian',
    'nav.approval': 'Approval',
    'nav.profile': 'Profil',
    'nav.home': 'Beranda',
    'nav.productivity': 'Produktivitas',
    'nav.leave_roster': 'Izin & Roster',
    'nav.hse': 'Health & Safety (HSE)',
    'nav.others': 'Lainnya',
    'nav.hero_genius': 'Hero Genius AI',
    'nav.ho_info': 'Informasi HO',
    'nav.sick_late_permission': 'Izin Sakit & Terlambat',
    'nav.spl': 'SPL (Lembur)',
    'nav.roster': 'Roster',
    'nav.timesheet': 'Timesheet',
    'nav.hse_report': 'Laporan HSE',
    'nav.hse_checklist': 'Checklist HSE',
    'nav.tire_inspection': 'Inspeksi Ban di Site',
    'nav.jsa': 'JSA (Job Safety Analysis)',
    'nav.ptw': 'Izin Kerja PTW',
    'nav.face_attendance': 'Absensi Wajah',
    'nav.daily_report': 'Laporan Harian',
    'nav.service_form': 'Form Servis 360',
    'nav.lms': 'ChitraLearning LMS',
    'nav.training': 'Pelatihan',
    'nav.wellness': 'MCU & Wellness',
    'nav.leaderboard': 'Papan Peringkat',
    'nav.executive': 'Eksekutif Dashboard',
    'nav.cargo_manifest': 'Manifest Kargo',
    
    // Mobile Greetings & Status
    'greeting.morning': 'Selamat Pagi',
    'greeting.afternoon': 'Selamat Siang',
    'greeting.evening': 'Selamat Sore',
    'greeting.night': 'Selamat Malam',
    'command_center': 'Command Center',
    'morning_shift': 'Shift Pagi',
    'night_shift': 'Shift Malam',
    'rank': 'PERINGKAT',
    'level': 'Level',
    'pro_progress': 'Kemajuan Pro',
    'pts': 'PTS',
    
    // Common Actions
    'action.save': 'Simpan',
    'action.cancel': 'Batal',
    'action.delete': 'Hapus',
    'action.edit': 'Ubah',
    'action.back': 'Kembali',
    'action.confirm': 'Konfirmasi',
    'action.submit': 'Kirim',
    'action.close': 'Tutup',
    'action.filter': 'Filter',
    'action.export': 'Ekspor',
    'action.download': 'Unduh',
    'action.upload': 'Unggah',
    'action.refresh': 'Muat Ulang',
    'action.add': 'Tambah',
    'action.view': 'Lihat',
    'action.search': 'Cari',
    
    // Common Statuses
    'status.all': 'Semua',
    'status.pending': 'Menunggu',
    'status.approved': 'Disetujui',
    'status.rejected': 'Ditolak',
    'status.draft': 'Draf',
    'status.in_progress': 'Sedang Diproses',
    'status.completed': 'Selesai',
    'status.cancelled': 'Dibatalkan',
    
    // Access & Loading
    'access.denied_title': 'Anda tidak memiliki akses',
    'access.denied_desc': 'Halaman ini dibatasi untuk role tertentu. Hubungi admin untuk membuka akses.',
    'access.back_to_dashboard': 'Kembali ke Dashboard',
    'loading.page': 'Memuat halaman...',
    'loading.data': 'Memuat data...',
  },
  en: {
    // Header & Navigation
    'app.name': 'HERO',
    'app.tagline': 'Hub for Employee Reporting & Operations',
    'desktop_workspace': 'Desktop Workspace',
    'operational_workspace': 'Operational workspace',
    'search.placeholder': 'Search page, command, or module',
    'search.command_placeholder': 'Search menu or action...',
    'search.no_results': 'No results found.',
    'ctrl_k': 'Ctrl K',
    
    // Auth & User
    'auth.logout': 'Log out',
    'auth.logging_out': 'Logging out...',
    'auth.login': 'Sign In',
    'auth.profile': 'Profile',
    'auth.account': 'Account',
    'auth.billing': 'Billing',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.signal_queue': 'Signal Queue',
    'notifications.mark_read': 'Mark read',
    'notifications.clear': 'Clear',
    'notifications.clear_all': 'Clear All',
    'notifications.mark_all_read': 'Mark All Read',
    'notifications.empty': 'No notifications yet.',
    'notifications.view_all': 'View all notifications',
    'notifications.read': 'Read',
    'notifications.unread': 'Unread',
    
    // Theme & Language
    'theme.toggle': 'Toggle Theme',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    'language.select': 'Select Language',
    'language.id': 'Bahasa Indonesia',
    'language.en': 'English',
    'language.id_short': 'ID',
    'language.en_short': 'EN',
    
    // Desktop Sidebar & Document Navigation
    'sidebar.add_activity': 'Add Activity',
    'sidebar.quick_action': 'Quick action',
    'sidebar.documents': 'Documents',
    'sidebar.more_documents': 'More documents',
    'sidebar.more': 'More',
    'sidebar.open': 'Open',
    'sidebar.share': 'Share',
    'sidebar.delete': 'Delete',
    
    // Mobile Drawer & Bottom Navigation
    'nav.dashboard': 'Dashboard',
    'nav.activity': 'Daily Activity',
    'nav.approval': 'Approval',
    'nav.profile': 'Profile',
    'nav.home': 'HOME',
    'nav.productivity': 'Productivity',
    'nav.leave_roster': 'LEAVE & ROSTER',
    'nav.hse': 'Health & Safety (HSE)',
    'nav.others': 'OTHERS',
    'nav.hero_genius': 'Hero Genius AI',
    'nav.ho_info': 'HO Information',
    'nav.sick_late_permission': 'Sick & Late Permission',
    'nav.spl': 'Overtime (SPL)',
    'nav.roster': 'Roster',
    'nav.timesheet': 'Timesheet',
    'nav.hse_report': 'HSE Report',
    'nav.hse_checklist': 'HSE Checklist',
    'nav.tire_inspection': 'Tire Site Inspection',
    'nav.jsa': 'JSA (Job Safety Analysis)',
    'nav.ptw': 'Work Permit (PTW)',
    'nav.face_attendance': 'Face Attendance',
    'nav.daily_report': 'Daily Report',
    'nav.service_form': '360 Service Form',
    'nav.lms': 'ChitraLearning LMS',
    'nav.training': 'Training',
    'nav.wellness': 'MCU & Wellness',
    'nav.leaderboard': 'Leaderboard',
    'nav.executive': 'Executive Dashboard',
    'nav.cargo_manifest': 'Cargo Manifest',
    
    // Mobile Greetings & Status
    'greeting.morning': 'Good Morning',
    'greeting.afternoon': 'Good Afternoon',
    'greeting.evening': 'Good Evening',
    'greeting.night': 'Good Night',
    'command_center': 'Command Center',
    'morning_shift': 'Morning Shift',
    'night_shift': 'Night Shift',
    'rank': 'RANK',
    'level': 'Level',
    'pro_progress': 'Pro Progress',
    'pts': 'PTS',
    
    // Common Actions
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.back': 'Back',
    'action.confirm': 'Confirm',
    'action.submit': 'Submit',
    'action.close': 'Close',
    'action.filter': 'Filter',
    'action.export': 'Export',
    'action.download': 'Download',
    'action.upload': 'Upload',
    'action.refresh': 'Refresh',
    'action.add': 'Add',
    'action.view': 'View',
    'action.search': 'Search',
    
    // Common Statuses
    'status.all': 'All',
    'status.pending': 'Pending',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.draft': 'Draft',
    'status.in_progress': 'In Progress',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    
    // Access & Loading
    'access.denied_title': 'Access Denied',
    'access.denied_desc': 'This page is restricted to specific roles. Contact administrator for access.',
    'access.back_to_dashboard': 'Back to Dashboard',
    'loading.page': 'Loading page...',
    'loading.data': 'Loading data...',
  },
}

// Bidirectional mappings: [Indonesian, English]
const MENU_TITLE_PAIRS: [string, string][] = [
  // Common Navigation
  ['Portal Chitra', 'Chitra Portal'],
  ['Aktivitas Harian', 'Daily Activity'],
  ['Input Aktivitas Harian', 'Daily Activity Input'],
  ['Monitoring Tim & SPL', 'Team Monitoring & SPL'],
  ['Approval Workflow', 'Approval Workflow'],
  ['Kamus Aktivitas', 'Activity Dictionary'],
  ['Route Template Harian', 'Daily Route Template'],
  ['Rule Aktivitas Global', 'Global Activity Rules'],
  ['Pengajuan Lembur (Request)', 'Overtime Request'],
  ['Pengajuan Lembur', 'Overtime Request'],
  ['Timesheet Realisasi', 'Timesheet Realization'],
  ['Roster & Timesheet', 'Roster & Timesheet'],
  ['Roster & Jadwal', 'Roster & Schedule'],
  ['Ringkasan Roster', 'Overview Roster'],
  ['Ringkasan Roster', 'Roster Overview'],
  ['Konfigurasi Roster, OT dan Meals', 'Roster, OT & Meals Setup'],
  ['Jadwal V2', 'Schedule V2'],
  ['Jadwal v2', 'Schedule v2'],
  ['Jadwal Field Break', 'Field Break Schedule'],
  ['Timesheet Payroll', 'Payroll Timesheet'],
  ['Kehadiran', 'Attendance'],
  ['Live / Impor', 'Live / Import'],
  ['Peta Kehadiran Langsung', 'Live Map Attendance'],
  ['Catatan Kehadiran', 'Records'],
  ['Pengecualian', 'Exceptions'],
  ['Dashboard EWH', 'EWH Dashboard'],
  ['Utilitas Unit', 'Unit Utility'],
  ['Pusat Approval', 'Approval Inbox'],
  ['Pusat Permintaan', 'Request Center'],
  ['Pembangun Alur Persetujuan', 'Approval Workflow Builder'],
  ['Pusat Notifikasi', 'Notification Center'],
  ['Data Induk', 'Master Data'],
  ['Pembangun Formulir', 'Form Builder'],
  ['Manajemen Pelanggan', 'Customer Management'],
  ['Human Capital', 'Human Capital'],
  ['Konseling / Curhat', 'Counseling / Curhat'],
  ['Pengaduan', 'Counseling / Curhat'],
  ['Dashboard Pengaduan HR', 'HR Counseling Dashboard'],
  ['Ringkasan HC', 'HC Overview'],
  ['Data Karyawan', 'Employee Data'],
  ['ChitraLearning LMS', 'ChitraLearning LMS'],
  ['Katalog Pelatihan', 'Course Catalog'],
  ['Pembelajaran Saya', 'My Learning'],
  ['HSE', 'HSE (Health & Safety)'],
  ['Laporan HSE', 'HSE Report'],
  ['Checklist HSE', 'HSE Checklist'],
  ['Inspeksi Ban di Site', 'Tire Site Inspection'],
  ['Analisis Keselamatan Kerja (JSA)', 'JSA (Job Safety Analysis)'],
  ['Analisis Keselamatan Kerja', 'Job Safety Analysis'],
  ['Izin Kerja PTW', 'Work Permit (PTW)'],
  ['Absensi Wajah', 'Face Attendance'],
  ['Laporan Harian', 'Daily Report'],
  ['Form Servis 360', '360 Service Form'],
  ['Pelatihan', 'Training'],
  ['MCU & Wellness', 'MCU & Wellness'],
  ['MCU & Wellness', 'MCU Wellness'],
  ['Papan Peringkat', 'Leaderboard'],
  ['Dashboard Eksekutif', 'Executive Dashboard'],
  ['Eksekutif Dashboard', 'Executive Dashboard'],
  ['Manifest Kargo', 'Cargo Manifest'],
  ['Quality & CPI', 'Quality & CPI'],
  ['Layanan Pusat', 'Central Service'],
  ['GOBPI', 'GOBPI'],
  ['SOP/WIN', 'SOP/WIN'],
  ['Laporan', 'Reports'],
  ['Pengaturan', 'Settings'],
  ['Pengaturan Sistem', 'System Settings'],
  ['Manajemen Pengguna', 'User Management'],
  ['Manajemen Peran', 'Role Management'],
  ['Analisis', 'Analytics'],

  // Command Center & Hero Genius
  ['Pusat Komando', 'Command Center'],
  ['Peta Fitur & Blueprint', 'Feature Map & Blueprint'],
  ['Hero Genius', 'Hero Genius'],
  ['Generator Approval SOP/WIN', 'SOP/WIN Approval Generator'],

  // Marketing / Pemasaran
  ['Pemasaran', 'Marketing'],
  ['Kompetisi A2R', 'A2R Competition'],
  ['Barang Lambat Bergerak', 'Slow Moving'],
  ['EPR Integrasi', 'EPR Integration'],
  ['Database Penawaran Vendor', 'Database Quotation Vendor'],
  ['Pengadaan Next', 'Procurement Next'],
  ['Prediksi Stok ML', 'ML Stock Forecast'],
  ['Laporan Kompetitor', 'Competitor Report'],
  ['Pusat Laporan', 'Report Hub'],
  ['Penagihan', 'Billing'],

  // 360 Service / Layanan 360
  ['Pelanggan Utama', 'Master Customers'],
  ['Item Utama (Barang/Jasa)', 'Master Items (Goods/Services)'],
  ['Master Items (Barang/Service)', 'Master Items (Goods/Services)'],
  ['Penawaran Harga', 'Quotations'],
  ['Formulir Layanan', 'Service Form'],

  // Central Service & Assets
  ['Manajemen Aset', 'Asset Management'],
  ['Inventaris Aset', 'Inventory Asset'],
  ['Laporan Kondisi Site', 'Site Condition Report'],
  ['Prakiraan CS', 'CS Forecast'],
  ['Permintaan Barang', 'Request Barang'],

  // LMS & Learning
  ['Pembangun Kursus', 'Course Builder'],
  ['Manajemen Seksi', 'Section Management'],
  ['Kampanye', 'Campaigns'],
  ['Ruang Belajar', 'Learning Workspace'],

  // Quality & Repair
  ['Dashboard WIP V2', 'WIP Dashboard V2'],
  ['Dashboard WIP', 'WIP Dashboard'],
  ['Perancang Pola', 'Pattern Designer'],
  ['Master Barang Repair', 'Master Barang Repair'],
  ['Stok Material SAP', 'Stock Material SAP'],
  ['Audit 5R', '5R Audit'],

  // Warehouse & Logistic
  ['Barang Keluar', 'Outbound Goods'],
  ['Barang Masuk', 'Inbound Goods'],
  ['Data Barang', 'Item Data'],
  ['Jenis Barang', 'Item Types'],
  ['Satuan', 'Units'],
  ['Laporan Stok', 'Stock Report'],
  ['Laporan Barang Masuk', 'Inbound Goods Report'],
  ['Laporan Barang Keluar', 'Outbound Goods Report'],

  // HC & HR
  ['Struktur Organisasi', 'Org Structure'],
  ['Struktur Organisasi V2', 'Org Structure V2'],
  ['Rekrutmen', 'Recruitment'],
  ['Permohonan Rekrutmen (RFR)', 'Request For Recruitment'],
  ['Permohonan Rekrutmen (RFR)', 'RFR (Recruitment Request)'],
  ['Permohonan Rekrutmen', 'Request For Recruitment'],
  ['Tes Online', 'Online Tests'],
  ['Catatan Pelatihan', 'Training Records'],
  ['Peningkatan Pelatihan', 'Training Enhancement'],
  ['Kinerja', 'Performance'],
  ['Kinerja Leader', 'Leader Performance'],
  ['Surat', 'Letters'],
  ['Tinjauan Kontrak', 'Contract Review'],
  ['Disiplin & Sanksi', 'Disciplinary'],
  ['Dashboard Poin', 'Point Dashboard'],
  ['Pengaduan', 'Counseling / Complaints'],
  ['Pengaduan', 'Curhat / Counseling'],
  ['Dashboard Pengaduan HR', 'HR Counseling Dashboard'],
  ['Technical Engineer', 'Technical Engineer'],
  ['Sertifikat', 'Certificate'],
  ['Surat Keterangan', 'Certificate of Employment'],

  // HSE & Safety
  ['Sertifikasi SIA/SIO & Alat', 'SIA/SIO & Tools Certification'],
  ['Dashboard Keselamatan', 'Safety Dashboard'],
  ['Manajemen Data Keselamatan', 'Safety Data Management'],
  ['Inspeksi Keselamatan', 'Safety Inspections'],
  ['Checklist HSE', 'HSE Checklists'],
  ['HIRADC', 'HIRADC'],
  ['Inventaris', 'Inventory'],
  ['Induksi Keselamatan', 'Safety Induction'],
  ['Laporan Insiden', 'Incident Report'],
  ['Analisis Kondisi Jalan', 'Road Condition Analysis'],

  // Settings
  ['Pengaturan Navbar', 'Navbar Setting'],
  ['Pengaturan Portal Chitra', 'Portal Chitra Settings'],
  ['Log Pengiriman Email', 'Email Delivery Log'],
  ['Ringkasan Keamanan', 'Security Overview'],
  ['Log Audit', 'Audit Log'],

  // Document & Others
  ['Dokumen', 'Documents'],
  ['Informasi HO', 'HO Information'],
  ['Izin Sakit & Terlambat', 'Sick & Late Permission'],
  ['Pelaporan & Operasional Karyawan', 'Employee Reporting & Operational'],
  ['Chitra Hub', 'Chitra Hub'],
  ['Hub Pelaporan & Operasional', 'Employee Reporting & Operational'],
  ['Scheduling & Timesheet', 'Scheduling & Timesheet'],
  ['Konfigurasi Roster', 'Roster Config'],
  ['MSA / Uang Makan', 'MSA / Meals'],
  ['Setup Lembur', 'Setup Overtime'],
  ['Simpan Konfigurasi TTD', 'Save Signature Config'],
  ['Simpan Setting', 'Save Settings'],
  ['Atur Konfigurasi TTD PDF', 'PDF Signature Config'],
]

const SECTION_TITLE_PAIRS: [string, string][] = [
  ['Portal Chitra', 'Chitra Portal'],
  ['Aktivitas Harian', 'Daily Activity'],
  ['Roster & Timesheet', 'Roster & Timesheet'],
  ['Approval', 'Approval'],
  ['Data Induk', 'Master Data'],
  ['Human Capital', 'Human Capital'],
  ['ChitraLearning LMS', 'ChitraLearning LMS'],
  ['Kehadiran', 'Attendance'],
  ['HSE', 'HSE'],
  ['Kualitas & CPI', 'Quality & CPI'],
  ['Layanan Pusat', 'Central Service'],
  ['Layanan 360', '360 Service'],
  ['GOBPI', 'GOBPI'],
  ['Hero Genius AI', 'Hero Genius AI'],
  ['Hero Genius AI', 'Genius AI'],
  ['Pemasaran', 'Marketing'],
  ['Laporan', 'Reports'],
  ['Laporan', 'Report'],
  ['Pengaturan', 'Settings'],
  ['Pengaturan', 'Setting'],
  ['Pusat Komando', 'Command Center'],
  ['Dokumen', 'Documents'],
]

const GROUP_LABEL_PAIRS: [string, string][] = [
  ['Section Head - Input Pekerjaan', 'Section Head - Work Input'],
  ['Setup Pekerjaan & Poin', 'Work & Points Setup'],
  ['Lembur & Timesheet', 'Overtime & Timesheet'],
  ['PJO / Atasan Review', 'PJO / Superior Review'],
  ['Setup Approval', 'Approval Setup'],
  ['Notifikasi & Pengingat', 'Notification & Reminder'],
  ['Karyawan', 'Employee'],
  ['Operasional HR', 'HR Operational'],
  ['Manajemen Rekrutmen', 'Recruitment Management'],
  ['Pusat Pelatihan', 'Training Center'],
  ['Kinerja & Pengembangan', 'Performance & Development'],
  ['Sistem Poin', 'Point System'],
  ['LMS Internal', 'Internal LMS'],
  ['LMS Internal Baru', 'Internal LMS Baru'],
  ['Teknis', 'Technical'],
  ['Aset', 'Assets'],
  ['Manajemen', 'Management'],
  ['Operasional', 'Operational'],
  ['Sistem', 'System'],
  ['Manajemen Keselamatan', 'Safety Management'],
  ['Peralatan & Kepatuhan Keselamatan', 'Safety Tools & Compliance'],
  ['Ringkasan', 'Summary'],
  ['Manajemen Insiden', 'Incident Management'],
  ['Kualitas & Perbaikan Berkelanjutan', 'Quality & Continuous Improvement'],
  ['Perbaikan & Vulkanisir', 'Repair & Retread'],
  ['Gudang Perbaikan', 'Warehouse Repair'],
  ['Logistik', 'Logistics'],
  ['Analisis Lapangan', 'Field Analysis'],
  ['Jam Kerja', 'Work Hours'],
]

export function translate(key: string, lang: Language = 'id', fallback?: string): string {
  const dict = translations[lang] || translations.id
  if (dict && key in dict) {
    return dict[key]
  }
  return fallback ?? key
}

export function translateMenuTitle(title: string, lang: Language = 'id'): string {
  if (!title) return title
  const trimmed = title.trim()
  for (const [idText, enText] of MENU_TITLE_PAIRS) {
    if (trimmed.toLowerCase() === idText.toLowerCase() || trimmed.toLowerCase() === enText.toLowerCase()) {
      return lang === 'id' ? idText : enText
    }
  }
  return title
}

export function translateSectionTitle(section: string, lang: Language = 'id'): string {
  if (!section) return section
  const trimmed = section.trim()
  for (const [idText, enText] of SECTION_TITLE_PAIRS) {
    if (trimmed.toLowerCase() === idText.toLowerCase() || trimmed.toLowerCase() === enText.toLowerCase()) {
      return lang === 'id' ? idText : enText
    }
  }
  return section
}

export function translateGroupLabel(label: string | null | undefined, lang: Language = 'id'): string | null | undefined {
  if (!label) return label
  const trimmed = label.trim()
  for (const [idText, enText] of GROUP_LABEL_PAIRS) {
    if (trimmed.toLowerCase() === idText.toLowerCase() || trimmed.toLowerCase() === enText.toLowerCase()) {
      return lang === 'id' ? idText : enText
    }
  }
  return label
}
