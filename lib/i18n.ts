export type Language = 'id' | 'en'

export const translations: Record<Language, Record<string, string>> = {
  id: {
    // Header & Navigation
    'app.name': 'HERO',
    'app.tagline': 'Hub for Employee Reporting & Operations',
    'desktop_workspace': 'Workspace Desktop',
    'search.placeholder': 'Cari halaman, perintah, atau modul',
    'search.command_placeholder': 'Cari menu atau aksi...',
    'search.no_results': 'Tidak ada hasil ditemukan.',
    'ctrl_k': 'Ctrl K',
    
    // Auth & User
    'auth.logout': 'Keluar',
    'auth.login': 'Masuk',
    'auth.profile': 'Profil',
    
    // Notifications
    'notifications.title': 'Notifikasi',
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
    'search.placeholder': 'Search page, command, or module',
    'search.command_placeholder': 'Search menu or action...',
    'search.no_results': 'No results found.',
    'ctrl_k': 'Ctrl K',
    
    // Auth & User
    'auth.logout': 'Logout',
    'auth.login': 'Sign In',
    'auth.profile': 'Profile',
    
    // Notifications
    'notifications.title': 'Notifications',
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

export function translate(key: string, lang: Language = 'id', fallback?: string): string {
  const dict = translations[lang] || translations.id
  if (dict && key in dict) {
    return dict[key]
  }
  return fallback ?? key
}
