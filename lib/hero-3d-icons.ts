/**
 * HERO 3D Icon Catalog & Resolver
 * Provides 24 high-fidelity 3D isometric icons (WebP & PNG variants)
 * optimized for Mobile performance (<10KB each) and high-DPI displays.
 */

export type Hero3dIconKey =
  | 'check-in'
  | 'aktivitas-harian'
  | 'troubleshoot-tiket'
  | 'input-progress'
  | 'pengajuan-spl'
  | 'request-barang'
  | 'hse-report'
  | 'izin-terlambat'
  | 'tire-repair-form'
  | 'sop-win'
  | 'audit-5r'
  | 'armada-ga'
  | 'chitra-learning'
  | 'pengaduan-hr'
  | 'cs-assets'
  | 'hero-genius'
  | 'road-hazard-live-ai'
  | 'informasi-ho'
  | 'instagram-generator'
  | 'scan-kartu-nama'
  | 'registrasi-wajah'
  | 'safety-dashboard'
  | 'hse-checklists'
  | 'lainnya'
  | 'iroster'
  | 'summary-apd'
  | 'atk'
  | 'sia-sio'
  | 'status-pernikahan'
  | 'wellness'
  | 'training-enhancement'
  | 'pengajuan-training'
  | 'forecasting-inventory'
  | 'document-management'
  | 'premises'
  | 'customer-search'
  | 'team-directory'
  | 'disetujui'
  | 'laporan-keuangan'
  | 'permohonan-cuti'
  | 'faktur-dan-invoice'
  | 'kontrak-karyawan'
  | 'file-manager'
  | 'cabang-terdekat'

export interface Hero3dIconInfo {
  key: Hero3dIconKey
  title: string
  fileName: string
  polosUrl: string
  tileUrl: string
  keywords: string[]
  matchUrls: string[]
}

export const HERO_3D_ICONS: Record<Hero3dIconKey, Hero3dIconInfo> = {
  // --- 24 PRIMARY HERO MOBILE SERVICES (OPTIMIZED WEBP <10KB) ---
  'check-in': {
    key: 'check-in',
    title: 'Check-In',
    fileName: '01_check-in.webp',
    polosUrl: '/icons/hero-24/webp/01_check-in.webp',
    tileUrl: '/icons/hero-24/webp/01_check-in.webp',
    keywords: ['check-in', 'check in', 'presensi', 'kehadiran', 'absen', 'presensi check-in'],
    matchUrls: ['/mobile/attendance/check-in', '/mobile/attendance'],
  },
  'aktivitas-harian': {
    key: 'aktivitas-harian',
    title: 'Aktivitas Harian',
    fileName: '02_aktivitas-harian.webp',
    polosUrl: '/icons/hero-24/webp/02_aktivitas-harian.webp',
    tileUrl: '/icons/hero-24/webp/02_aktivitas-harian.webp',
    keywords: ['aktivitas harian', 'daily activity', 'aktivitas', 'dar', 'laporan aktivitas', 'activity', 'daily'],
    matchUrls: ['/mobile/daily-activity', '/mobile/activity', '/dashboard/activity'],
  },
  'troubleshoot-tiket': {
    key: 'troubleshoot-tiket',
    title: 'Troubleshoot & Tiket',
    fileName: '03_troubleshoot-tiket.webp',
    polosUrl: '/icons/hero-24/webp/03_troubleshoot-tiket.webp',
    tileUrl: '/icons/hero-24/webp/03_troubleshoot-tiket.webp',
    keywords: ['troubleshoot & tiket', 'troubleshoot', 'tiket', 'ticketing', 'helpdesk', 'support', 'keluhan'],
    matchUrls: ['/mobile/troubleshoot', '/mobile/tickets', '/mobile/ticketing', '/dashboard/ticketing'],
  },
  'input-progress': {
    key: 'input-progress',
    title: 'Input Progress',
    fileName: '04_input-progress.webp',
    polosUrl: '/icons/hero-24/webp/04_input-progress.webp',
    tileUrl: '/icons/hero-24/webp/04_input-progress.webp',
    keywords: ['input progress', 'progress harian', 'progress', 'laporan progress', 'task progress'],
    matchUrls: ['/mobile/input-progress', '/mobile/progress', '/dashboard/progress'],
  },
  'pengajuan-spl': {
    key: 'pengajuan-spl',
    title: 'Pengajuan SPL',
    fileName: '05_pengajuan-spl.webp',
    polosUrl: '/icons/hero-24/webp/05_pengajuan-spl.webp',
    tileUrl: '/icons/hero-24/webp/05_pengajuan-spl.webp',
    keywords: ['pengajuan spl', 'spl', 'lembur', 'surat perintah lembur', 'overtime'],
    matchUrls: ['/mobile/spl', '/mobile/overtime', '/mobile/pengajuan-spl', '/dashboard/overtime'],
  },
  'request-barang': {
    key: 'request-barang',
    title: 'Request Barang',
    fileName: '06_request-barang.webp',
    polosUrl: '/icons/hero-24/webp/06_request-barang.webp',
    tileUrl: '/icons/hero-24/webp/06_request-barang.webp',
    keywords: ['request barang', 'pengajuan barang', 'permintaan barang', 'request atk', 'atk', 'stationery'],
    matchUrls: ['/mobile/request-barang', '/mobile/request-item', '/mobile/atk', '/dashboard/atk'],
  },
  'hse-report': {
    key: 'hse-report',
    title: 'HSE Report',
    fileName: '07_hse-report.webp',
    polosUrl: '/icons/hero-24/webp/07_hse-report.webp',
    tileUrl: '/icons/hero-24/webp/07_hse-report.webp',
    keywords: ['hse report', 'laporan hse', 'insiden hse', 'safety report', 'pelaporan bahaya', 'k3'],
    matchUrls: ['/mobile/hse-report', '/mobile/hse', '/dashboard/hse'],
  },
  'izin-terlambat': {
    key: 'izin-terlambat',
    title: 'Izin & Terlambat',
    fileName: '08_izin-terlambat.webp',
    polosUrl: '/icons/hero-24/webp/08_izin-terlambat.webp',
    tileUrl: '/icons/hero-24/webp/08_izin-terlambat.webp',
    keywords: ['izin & terlambat', 'izin', 'terlambat', 'permohonan izin', 'izin sakit', 'cuti', 'dispensasi'],
    matchUrls: ['/mobile/attendance/permission', '/mobile/izin', '/dashboard/attendance-permission'],
  },
  'tire-repair-form': {
    key: 'tire-repair-form',
    title: 'Tire Repair Form',
    fileName: '09_tire-repair-form.webp',
    polosUrl: '/icons/hero-24/webp/09_tire-repair-form.webp',
    tileUrl: '/icons/hero-24/webp/09_tire-repair-form.webp',
    keywords: ['tire repair form', 'tire repair', 'repair form', 'perbaikan ban', 'tambal ban', 'tyre repair'],
    matchUrls: ['/mobile/tire-repair', '/mobile/tire-form', '/dashboard/warehouse-repair'],
  },
  'sop-win': {
    key: 'sop-win',
    title: 'SOP & WIN',
    fileName: '10_sop-win.webp',
    polosUrl: '/icons/hero-24/webp/10_sop-win.webp',
    tileUrl: '/icons/hero-24/webp/10_sop-win.webp',
    keywords: ['sop & win', 'sop', 'win', 'work instruction', 'standar operasional', 'dokumen sop'],
    matchUrls: ['/mobile/sop-win', '/dashboard/sop-win'],
  },
  'audit-5r': {
    key: 'audit-5r',
    title: 'Audit 5R',
    fileName: '11_audit-5r.webp',
    polosUrl: '/icons/hero-24/webp/11_audit-5r.webp',
    tileUrl: '/icons/hero-24/webp/11_audit-5r.webp',
    keywords: ['audit 5r', '5r', 'inspeksi 5r', 'kebersihan', 'ringkas rapi'],
    matchUrls: ['/mobile/audit-5r', '/mobile/5r', '/dashboard/audit-5r'],
  },
  'armada-ga': {
    key: 'armada-ga',
    title: 'Armada GA',
    fileName: '12_tools.webp',
    polosUrl: '/icons/hero-24/webp/12_tools.webp',
    tileUrl: '/icons/hero-24/webp/12_tools.webp',
    keywords: ['armada ga', 'armada', 'kendaraan', 'ga vehicle', 'tools', 'peralatan'],
    matchUrls: ['/mobile/armada-ga', '/mobile/tools', '/dashboard/ga-vehicle'],
  },
  'chitra-learning': {
    key: 'chitra-learning',
    title: 'Chitra Learning',
    fileName: '13_chitra-learning.webp',
    polosUrl: '/icons/hero-24/webp/13_chitra-learning.webp',
    tileUrl: '/icons/hero-24/webp/13_chitra-learning.webp',
    keywords: ['chitra learning', 'chitralearning', 'lms', 'learning', 'pelatihan', 'training internal'],
    matchUrls: ['/mobile/chitralearning', '/dashboard/chitralearning-lms'],
  },
  'pengaduan-hr': {
    key: 'pengaduan-hr',
    title: 'Pengaduan HR',
    fileName: '14_pengaduan-hr.webp',
    polosUrl: '/icons/hero-24/webp/14_pengaduan-hr.webp',
    tileUrl: '/icons/hero-24/webp/14_pengaduan-hr.webp',
    keywords: ['pengaduan hr', 'curhat hr', 'pengaduan', 'curhat', 'keluhan', 'whistleblowing'],
    matchUrls: ['/mobile/curhat', '/mobile/pengaduan-hr', '/dashboard/curhat'],
  },
  'cs-assets': {
    key: 'cs-assets',
    title: 'CS Assets',
    fileName: '15_cs-assets.webp',
    polosUrl: '/icons/hero-24/webp/15_cs-assets.webp',
    tileUrl: '/icons/hero-24/webp/15_cs-assets.webp',
    keywords: ['cs assets', 'central service assets', 'aset', 'asset management', 'inventaris'],
    matchUrls: ['/mobile/cs-assets', '/mobile/assets', '/dashboard/assets'],
  },
  'hero-genius': {
    key: 'hero-genius',
    title: 'Hero Genius',
    fileName: '16_hero-genius.webp',
    polosUrl: '/icons/hero-24/webp/16_hero-genius.webp',
    tileUrl: '/icons/hero-24/webp/16_hero-genius.webp',
    keywords: ['hero genius', 'ai', 'genius', 'asisten cerdas', 'chat ai'],
    matchUrls: ['/mobile/hero-genius', '/mobile/chat'],
  },
  'road-hazard-live-ai': {
    key: 'road-hazard-live-ai',
    title: 'Road Hazard Live AI',
    fileName: '17_road-hazard-live-ai.webp',
    polosUrl: '/icons/hero-24/webp/17_road-hazard-live-ai.webp',
    tileUrl: '/icons/hero-24/webp/17_road-hazard-live-ai.webp',
    keywords: ['road hazard live ai', 'road hazard', 'hazard ai', 'live ai', 'deteksi jalan'],
    matchUrls: ['/mobile/road-hazard', '/mobile/hazard'],
  },
  'informasi-ho': {
    key: 'informasi-ho',
    title: 'Informasi HO',
    fileName: '18_warning.webp',
    polosUrl: '/icons/hero-24/webp/18_warning.webp',
    tileUrl: '/icons/hero-24/webp/18_warning.webp',
    keywords: ['informasi ho', 'informasi head office', 'info ho', 'pengumuman', 'pemberitahuan', 'warning'],
    matchUrls: ['/mobile/informasi-ho', '/mobile/ho-info'],
  },
  'instagram-generator': {
    key: 'instagram-generator',
    title: 'Instagram Generator',
    fileName: '19_instagram-generator.webp',
    polosUrl: '/icons/hero-24/webp/19_instagram-generator.webp',
    tileUrl: '/icons/hero-24/webp/19_instagram-generator.webp',
    keywords: ['instagram generator', 'instagram', 'generator ig', 'ig poster', 'sosial media'],
    matchUrls: ['/mobile/instagram-generator', '/mobile/instagram'],
  },
  'scan-kartu-nama': {
    key: 'scan-kartu-nama',
    title: 'Scan Kartu Nama',
    fileName: '20_scan-kartu-nama.webp',
    polosUrl: '/icons/hero-24/webp/20_scan-kartu-nama.webp',
    tileUrl: '/icons/hero-24/webp/20_scan-kartu-nama.webp',
    keywords: ['scan kartu nama', 'kartu nama', 'business card', 'scanner kartu', 'scan kartu'],
    matchUrls: ['/mobile/business-card', '/mobile/scan-kartu-nama'],
  },
  'registrasi-wajah': {
    key: 'registrasi-wajah',
    title: 'Registrasi Wajah / Kamera',
    fileName: '21_camera.webp',
    polosUrl: '/icons/hero-24/webp/21_camera.webp',
    tileUrl: '/icons/hero-24/webp/21_camera.webp',
    keywords: ['registrasi wajah', 'face registration', 'kamera', 'biometrik wajah', 'camera'],
    matchUrls: ['/mobile/face-attendance', '/mobile/camera'],
  },
  'safety-dashboard': {
    key: 'safety-dashboard',
    title: 'Safety Dashboard',
    fileName: '22_safety-dashboard.webp',
    polosUrl: '/icons/hero-24/webp/22_safety-dashboard.webp',
    tileUrl: '/icons/hero-24/webp/22_safety-dashboard.webp',
    keywords: ['safety dashboard', 'dashboard k3', 'k3', 'hse dashboard', 'safety'],
    matchUrls: ['/mobile/safety-dashboard', '/mobile/safety'],
  },
  'hse-checklists': {
    key: 'hse-checklists',
    title: 'HSE Checklists & ON SPOT MONITORING',
    fileName: '23_safety-check.webp',
    polosUrl: '/icons/hero-24/webp/23_safety-check.webp',
    tileUrl: '/icons/hero-24/webp/23_safety-check.webp',
    keywords: ['hse checklists', 'hse checklist', 'on spot monitoring', 'spot monitoring', 'checklist k3', 'inspeksi safety'],
    matchUrls: ['/mobile/hse-checklists', '/mobile/on-spot-monitoring'],
  },
  lainnya: {
    key: 'lainnya',
    title: 'Lainnya',
    fileName: '24_lainnya.webp',
    polosUrl: '/icons/hero-24/webp/24_lainnya.webp',
    tileUrl: '/icons/hero-24/webp/24_lainnya.webp',
    keywords: ['lainnya', 'katalog lengkap', 'semua layanan', 'katalog', 'more'],
    matchUrls: ['/mobile/katalog', '/mobile/services'],
  },

  // --- ADDITIONAL SPECIALIZED CATALOG ICONS ---
  iroster: {
    key: 'iroster',
    title: 'IRoster & Timesheet',
    fileName: '01_IRoster.webp',
    polosUrl: '/icons/hero-3d/polos_webp/01_IRoster.webp',
    tileUrl: '/icons/hero-3d/tile_webp/01_IRoster.webp',
    keywords: ['roster', 'iroster', 'timesheet', 'jadwal kerja', 'shift', 'kalender shift', 'scheduling'],
    matchUrls: ['/mobile/timesheet', '/dashboard/scheduling-timesheet'],
  },
  'summary-apd': {
    key: 'summary-apd',
    title: 'Summary APD',
    fileName: '02_Summary_APD.webp',
    polosUrl: '/icons/hero-3d/polos_webp/02_Summary_APD.webp',
    tileUrl: '/icons/hero-3d/tile_webp/02_Summary_APD.webp',
    keywords: ['summary apd', 'rekap apd', 'request apd', 'apd', 'pengajuan apd', 'alat pelindung diri'],
    matchUrls: ['/mobile/summary', '/mobile/apd', '/dashboard/apd'],
  },
  atk: {
    key: 'atk',
    title: 'ATK (Alat Tulis Kantor)',
    fileName: '03_ATK.webp',
    polosUrl: '/icons/hero-3d/polos_webp/03_ATK.webp',
    tileUrl: '/icons/hero-3d/tile_webp/03_ATK.webp',
    keywords: ['alat tulis', 'stationery', 'office supplies'],
    matchUrls: [],
  },
  'sia-sio': {
    key: 'sia-sio',
    title: 'SIA-SIO & Tools Certification',
    fileName: '04_SIA-SIO_dan_Tools_Certification.webp',
    polosUrl: '/icons/hero-3d/polos_webp/04_SIA-SIO_dan_Tools_Certification.webp',
    tileUrl: '/icons/hero-3d/tile_webp/04_SIA-SIO_dan_Tools_Certification.webp',
    keywords: ['sia-sio', 'sio', 'sia', 'sertifikasi alat', 'tools certification', 'alat berat', 'simper'],
    matchUrls: ['/mobile/sia-sio', '/dashboard/sia-sio'],
  },
  'status-pernikahan': {
    key: 'status-pernikahan',
    title: 'Status Pernikahan & Keluarga',
    fileName: '05_Status_Pernikahan.webp',
    polosUrl: '/icons/hero-3d/polos_webp/05_Status_Pernikahan.webp',
    tileUrl: '/icons/hero-3d/tile_webp/05_Status_Pernikahan.webp',
    keywords: ['status pernikahan', 'keluarga', 'tanggungan', 'update data keluarga', 'marital status'],
    matchUrls: ['/mobile/marriage-status', '/dashboard/profile/family'],
  },
  wellness: {
    key: 'wellness',
    title: 'Wellness & Kesehatan',
    fileName: '06_Wellness.webp',
    polosUrl: '/icons/hero-3d/polos_webp/06_Wellness.webp',
    tileUrl: '/icons/hero-3d/tile_webp/06_Wellness.webp',
    keywords: ['wellness', 'kesehatan', 'mcu', 'medical check up', 'konsultasi dokter', 'kebugaran'],
    matchUrls: ['/mobile/wellness', '/dashboard/wellness'],
  },
  'training-enhancement': {
    key: 'training-enhancement',
    title: 'Training Enhancement',
    fileName: '07_Training_Enhancement.webp',
    polosUrl: '/icons/hero-3d/polos_webp/07_Training_Enhancement.webp',
    tileUrl: '/icons/hero-3d/tile_webp/07_Training_Enhancement.webp',
    keywords: ['training enhancement', 'peningkatan kompetensi', 'sertifikasi profesi', 'skill upgrade'],
    matchUrls: ['/mobile/training-enhancement', '/dashboard/training'],
  },
  'pengajuan-training': {
    key: 'pengajuan-training',
    title: 'Pengajuan Training',
    fileName: '08_Pengajuan_Training.webp',
    polosUrl: '/icons/hero-3d/polos_webp/08_Pengajuan_Training.webp',
    tileUrl: '/icons/hero-3d/tile_webp/08_Pengajuan_Training.webp',
    keywords: ['pengajuan training', 'request training', 'permohonan pelatihan', 'kursus'],
    matchUrls: ['/mobile/training-request'],
  },
  'forecasting-inventory': {
    key: 'forecasting-inventory',
    title: 'Forecasting Inventory & Ban',
    fileName: '09_Forecasting_Inventory.webp',
    polosUrl: '/icons/hero-3d/polos_webp/09_Forecasting_Inventory.webp',
    tileUrl: '/icons/hero-3d/tile_webp/09_Forecasting_Inventory.webp',
    keywords: ['forecasting inventory', 'prediksi stok', 'forecast ban', 'tyre forecast', 'stok opname'],
    matchUrls: ['/mobile/forecast', '/dashboard/forecast'],
  },
  'document-management': {
    key: 'document-management',
    title: 'Manajemen Dokumen',
    fileName: '10_Document_Management.webp',
    polosUrl: '/icons/hero-3d/polos_webp/10_Document_Management.webp',
    tileUrl: '/icons/hero-3d/tile_webp/10_Document_Management.webp',
    keywords: ['manajemen dokumen', 'arsip', 'e-dokumen', 'berkas'],
    matchUrls: ['/dashboard/documents'],
  },
  premises: {
    key: 'premises',
    title: 'Premises & Fasilitas',
    fileName: '11_Premises.webp',
    polosUrl: '/icons/hero-3d/polos_webp/11_Premises.webp',
    tileUrl: '/icons/hero-3d/tile_webp/11_Premises.webp',
    keywords: ['premises', 'fasilitas kantor', 'gedung', 'mess', 'akomodasi', 'fasilitas kerja'],
    matchUrls: ['/mobile/premises', '/dashboard/premises'],
  },
  'customer-search': {
    key: 'customer-search',
    title: 'Pencarian Pelanggan & Site',
    fileName: '12_Customer_Search.webp',
    polosUrl: '/icons/hero-3d/polos_webp/12_Customer_Search.webp',
    tileUrl: '/icons/hero-3d/tile_webp/12_Customer_Search.webp',
    keywords: ['customer search', 'cari pelanggan', 'daftar site', 'database customer', 'klien'],
    matchUrls: ['/mobile/customers', '/dashboard/customers'],
  },
  'team-directory': {
    key: 'team-directory',
    title: 'Direktori Karyawan & Tim',
    fileName: '13_Team_Directory.webp',
    polosUrl: '/icons/hero-3d/polos_webp/13_Team_Directory.webp',
    tileUrl: '/icons/hero-3d/tile_webp/13_Team_Directory.webp',
    keywords: ['team directory', 'direktori tim', 'kontak karyawan', 'struktur tim', 'buku telepon'],
    matchUrls: ['/mobile/directory', '/dashboard/team'],
  },
  disetujui: {
    key: 'disetujui',
    title: 'Persetujuan & Approval',
    fileName: '14_Disetujui.webp',
    polosUrl: '/icons/hero-3d/polos_webp/14_Disetujui.webp',
    tileUrl: '/icons/hero-3d/tile_webp/14_Disetujui.webp',
    keywords: ['disetujui', 'approval', 'persetujuan', 'inbox approval', 'acc'],
    matchUrls: ['/mobile/approval', '/dashboard/approval'],
  },
  'laporan-keuangan': {
    key: 'laporan-keuangan',
    title: 'Laporan Keuangan & Klaim',
    fileName: '15_Laporan_Keuangan.webp',
    polosUrl: '/icons/hero-3d/polos_webp/15_Laporan_Keuangan.webp',
    tileUrl: '/icons/hero-3d/tile_webp/15_Laporan_Keuangan.webp',
    keywords: ['laporan keuangan', 'reimbursement', 'klaim', 'cash advance', 'pertanggungjawaban'],
    matchUrls: ['/mobile/finance', '/dashboard/finance'],
  },
  'permohonan-cuti': {
    key: 'permohonan-cuti',
    title: 'Permohonan Cuti',
    fileName: '16_Permohonan_Cuti.webp',
    polosUrl: '/icons/hero-3d/polos_webp/16_Permohonan_Cuti.webp',
    tileUrl: '/icons/hero-3d/tile_webp/16_Permohonan_Cuti.webp',
    keywords: ['permohonan cuti', 'cuti tahunan', 'cuti melahirkan', 'cuti besar'],
    matchUrls: ['/mobile/leave', '/dashboard/leave'],
  },
  'faktur-dan-invoice': {
    key: 'faktur-dan-invoice',
    title: 'Faktur & Invoice',
    fileName: '17_Faktur_dan_Invoice.webp',
    polosUrl: '/icons/hero-3d/polos_webp/17_Faktur_dan_Invoice.webp',
    tileUrl: '/icons/hero-3d/tile_webp/17_Faktur_dan_Invoice.webp',
    keywords: ['faktur dan invoice', 'invoice', 'faktur pajak', 'penagihan', 'billing'],
    matchUrls: ['/dashboard/billing', '/dashboard/invoice'],
  },
  'kontrak-karyawan': {
    key: 'kontrak-karyawan',
    title: 'Kontrak Karyawan',
    fileName: '18_Kontrak_Karyawan.webp',
    polosUrl: '/icons/hero-3d/polos_webp/18_Kontrak_Karyawan.webp',
    tileUrl: '/icons/hero-3d/tile_webp/18_Kontrak_Karyawan.webp',
    keywords: ['kontrak karyawan', 'pkwt', 'perjanjian kerja', 'masa kontrak', 'adendum'],
    matchUrls: ['/dashboard/contracts', '/mobile/contracts'],
  },
  'file-manager': {
    key: 'file-manager',
    title: 'File Manager & Media',
    fileName: '19_File_Manager.webp',
    polosUrl: '/icons/hero-3d/polos_webp/19_File_Manager.webp',
    tileUrl: '/icons/hero-3d/tile_webp/19_File_Manager.webp',
    keywords: ['file manager', 'media storage', 'unggah berkas', 'lampiran'],
    matchUrls: ['/dashboard/files'],
  },
  'cabang-terdekat': {
    key: 'cabang-terdekat',
    title: 'Lokasi Cabang & Site Terdekat',
    fileName: '20_Cabang_Terdekat.webp',
    polosUrl: '/icons/hero-3d/polos_webp/20_Cabang_Terdekat.webp',
    tileUrl: '/icons/hero-3d/tile_webp/20_Cabang_Terdekat.webp',
    keywords: ['cabang terdekat', 'site terdekat', 'lokasi kantor', 'radius gps', 'geofencing'],
    matchUrls: ['/mobile/locations', '/dashboard/locations'],
  },
}

const ALL_ICONS = Object.values(HERO_3D_ICONS)

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Finds a matching 3D icon by title, url, or key
 */
export function findHero3dIcon(identifier?: {
  title?: string | null
  url?: string | null
  key?: string | null
}): Hero3dIconInfo | null {
  if (!identifier) return null

  // 1. Direct key match
  if (identifier.key && identifier.key in HERO_3D_ICONS) {
    return HERO_3D_ICONS[identifier.key as Hero3dIconKey]
  }

  // 2. Exact Title Match First
  if (identifier.title) {
    const normalized = normalizeText(identifier.title)
    if (normalized) {
      const exact = ALL_ICONS.find((item) => normalizeText(item.title) === normalized)
      if (exact) return exact

      // Match by keywords (longest keyword match wins)
      let bestMatch: Hero3dIconInfo | null = null
      let longestKeywordLen = 0

      for (const icon of ALL_ICONS) {
        for (const kw of icon.keywords) {
          const normKw = normalizeText(kw)
          if (normKw && (normalized === normKw || normalized.includes(normKw) || normKw.includes(normalized))) {
            if (normKw.length > longestKeywordLen) {
              longestKeywordLen = normKw.length
              bestMatch = icon
            }
          }
        }
      }

      if (bestMatch) return bestMatch
    }
  }

  // 3. URL Match
  if (identifier.url) {
    const cleanUrl = identifier.url.split('?')[0].toLowerCase()
    const foundByUrl = ALL_ICONS.find((item) =>
      item.matchUrls.some((u) => u.toLowerCase().startsWith(cleanUrl) || cleanUrl.startsWith(u.toLowerCase()))
    )
    if (foundByUrl) return foundByUrl
  }

  return null
}
