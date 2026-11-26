/**
 * HERO 3D Icon Catalog & Resolver
 * Provides 20 high-fidelity 3D isometric icons (Polos & Tile variants)
 * for Mobile and Desktop navigation, services, shortcuts, and quick actions.
 */

export type Hero3dIconKey =
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
  iroster: {
    key: 'iroster',
    title: 'IRoster & Timesheet',
    fileName: '01_IRoster.png',
    polosUrl: '/icons/hero-3d/polos/01_IRoster.png',
    tileUrl: '/icons/hero-3d/tile/01_IRoster.png',
    keywords: ['roster', 'iroster', 'timesheet', 'jadwal kerja', 'shift', 'kalender shift', 'scheduling'],
    matchUrls: ['/mobile/timesheet', '/dashboard/scheduling-timesheet'],
  },
  'summary-apd': {
    key: 'summary-apd',
    title: 'Summary APD',
    fileName: '02_Summary_APD.png',
    polosUrl: '/icons/hero-3d/polos/02_Summary_APD.png',
    tileUrl: '/icons/hero-3d/tile/02_Summary_APD.png',
    keywords: ['summary apd', 'rekap apd', 'request apd', 'apd', 'pengajuan apd', 'alat pelindung diri'],
    matchUrls: ['/mobile/summary', '/mobile/apd', '/dashboard/apd'],
  },
  atk: {
    key: 'atk',
    title: 'ATK (Alat Tulis Kantor)',
    fileName: '03_ATK.png',
    polosUrl: '/icons/hero-3d/polos/03_ATK.png',
    tileUrl: '/icons/hero-3d/tile/03_ATK.png',
    keywords: ['atk', 'alat tulis', 'pengajuan atk', 'stationery', 'request atk', 'office supplies', 'request barang'],
    matchUrls: ['/mobile/atk'],
  },
  'sia-sio': {
    key: 'sia-sio',
    title: 'SIA-SIO & Tools Certification',
    fileName: '04_SIA-SIO_dan_Tools_Certification.png',
    polosUrl: '/icons/hero-3d/polos/04_SIA-SIO_dan_Tools_Certification.png',
    tileUrl: '/icons/hero-3d/tile/04_SIA-SIO_dan_Tools_Certification.png',
    keywords: ['sia-sio', 'sia', 'sio', 'tools certification', 'sertifikasi tools', 'sertifikasi'],
    matchUrls: ['/mobile/tools', '/dashboard/training-records?tab=sio'],
  },
  'status-pernikahan': {
    key: 'status-pernikahan',
    title: 'Status Pernikahan',
    fileName: '05_Status_Pernikahan.png',
    polosUrl: '/icons/hero-3d/polos/05_Status_Pernikahan.png',
    tileUrl: '/icons/hero-3d/tile/05_Status_Pernikahan.png',
    keywords: ['status pernikahan', 'pernikahan', 'marital status', 'keluarga'],
    matchUrls: ['/mobile/central-service/marital-status', '/dashboard/central-service/marital-status'],
  },
  wellness: {
    key: 'wellness',
    title: 'Wellness',
    fileName: '06_Wellness.png',
    polosUrl: '/icons/hero-3d/polos/06_Wellness.png',
    tileUrl: '/icons/hero-3d/tile/06_Wellness.png',
    keywords: ['wellness', 'mcu', 'fit to work', 'medical check up', 'kesehatan'],
    matchUrls: ['/mobile/wellness', '/dashboard/hc/wellness'],
  },
  'training-enhancement': {
    key: 'training-enhancement',
    title: 'Training Enhancement & LMS',
    fileName: '07_Training_Enhancement.png',
    polosUrl: '/icons/hero-3d/polos/07_Training_Enhancement.png',
    tileUrl: '/icons/hero-3d/tile/07_Training_Enhancement.png',
    keywords: [
      'training enhancement',
      'chitra learning',
      'chitralearning',
      'lms',
      'learning management system',
      'pelatihan',
      'modul pembelajaran',
      'chitra lms',
    ],
    matchUrls: ['/mobile/chitralearning', '/dashboard/chitralearning-lms', '/dashboard/training-records'],
  },
  'pengajuan-training': {
    key: 'pengajuan-training',
    title: 'Pengajuan Training',
    fileName: '08_Pengajuan_Training.png',
    polosUrl: '/icons/hero-3d/polos/08_Pengajuan_Training.png',
    tileUrl: '/icons/hero-3d/tile/08_Pengajuan_Training.png',
    keywords: ['pengajuan training', 'request training', 'permohonan training'],
    matchUrls: ['/mobile/training/pengajuan', '/dashboard/training/pengajuan'],
  },
  'forecasting-inventory': {
    key: 'forecasting-inventory',
    title: 'Forecasting Inventory',
    fileName: '09_Forecasting_Inventory.png',
    polosUrl: '/icons/hero-3d/polos/09_Forecasting_Inventory.png',
    tileUrl: '/icons/hero-3d/tile/09_Forecasting_Inventory.png',
    keywords: ['cs forecast', 'forecasting inventory', 'forecasting', 'forecast', 'prediksi kebutuhan'],
    matchUrls: ['/mobile/central-service/forecast', '/dashboard/central-service/forecast'],
  },
  'document-management': {
    key: 'document-management',
    title: 'Document Management (SOP & WIN)',
    fileName: '10_Document_Management.png',
    polosUrl: '/icons/hero-3d/polos/10_Document_Management.png',
    tileUrl: '/icons/hero-3d/tile/10_Document_Management.png',
    keywords: [
      'document management',
      'sop & win',
      'sop win',
      'sop/win',
      'dokumentasi',
      'blueprint',
      'instruksi kerja',
      'standar mutu',
    ],
    matchUrls: ['/mobile/sop-win', '/dashboard/sop-win', '/dashboard/documentation'],
  },
  premises: {
    key: 'premises',
    title: 'Premises & GA',
    fileName: '11_Premises.png',
    polosUrl: '/icons/hero-3d/polos/11_Premises.png',
    tileUrl: '/icons/hero-3d/tile/11_Premises.png',
    keywords: ['premises', 'armada ga', 'fasilitas', 'kendaraan ga', 'ga vehicles', 'site condition'],
    matchUrls: ['/mobile/ga/vehicles', '/dashboard/ga/vehicles', '/mobile/reports/road-condition'],
  },
  'customer-search': {
    key: 'customer-search',
    title: 'Customer Search',
    fileName: '12_Customer_Search.png',
    polosUrl: '/icons/hero-3d/polos/12_Customer_Search.png',
    tileUrl: '/icons/hero-3d/tile/12_Customer_Search.png',
    keywords: ['customer search', 'master customers', 'customer', 'pelanggan', 'cari customer', 'maestro'],
    matchUrls: ['/dashboard/360-service/customers', '/dashboard/settings/maestro'],
  },
  'team-directory': {
    key: 'team-directory',
    title: 'Team Directory',
    fileName: '13_Team_Directory.png',
    polosUrl: '/icons/hero-3d/polos/13_Team_Directory.png',
    tileUrl: '/icons/hero-3d/tile/13_Team_Directory.png',
    keywords: ['team directory', 'direktori tim', 'monitoring tim', 'user management', 'tim & spl', 'karyawan'],
    matchUrls: ['/dashboard/activity-hub/team-board', '/dashboard/settings/maestro/users'],
  },
  disetujui: {
    key: 'disetujui',
    title: 'Disetujui / Approval',
    fileName: '14_Disetujui.png',
    polosUrl: '/icons/hero-3d/polos/14_Disetujui.png',
    tileUrl: '/icons/hero-3d/tile/14_Disetujui.png',
    keywords: ['disetujui', 'approval', 'persetujuan', 'approval workflow', 'approval center'],
    matchUrls: ['/mobile/approvals', '/dashboard/activity-hub/approval', '/dashboard/approval'],
  },
  'laporan-keuangan': {
    key: 'laporan-keuangan',
    title: 'Laporan Keuangan',
    fileName: '15_Laporan_Keuangan.png',
    polosUrl: '/icons/hero-3d/polos/15_Laporan_Keuangan.png',
    tileUrl: '/icons/hero-3d/tile/15_Laporan_Keuangan.png',
    keywords: ['laporan keuangan', 'budget controller', 'keuangan', 'financial report', 'budget'],
    matchUrls: ['/dashboard/assets/budget-controller'],
  },
  'permohonan-cuti': {
    key: 'permohonan-cuti',
    title: 'Permohonan Cuti & Izin',
    fileName: '16_Permohonan_Cuti.png',
    polosUrl: '/icons/hero-3d/polos/16_Permohonan_Cuti.png',
    tileUrl: '/icons/hero-3d/tile/16_Permohonan_Cuti.png',
    keywords: ['permohonan cuti', 'cuti', 'izin & terlambat', 'izin sakit', 'izin', 'pengajuan spl', 'lembur mandiri', 'pengajuan lembur'],
    matchUrls: ['/mobile/attendance/permission', '/mobile/overtime?tab=apply', '/dashboard/attendance'],
  },
  'faktur-dan-invoice': {
    key: 'faktur-dan-invoice',
    title: 'Faktur & Invoice',
    fileName: '17_Faktur_dan_Invoice.png',
    polosUrl: '/icons/hero-3d/polos/17_Faktur_dan_Invoice.png',
    tileUrl: '/icons/hero-3d/tile/17_Faktur_dan_Invoice.png',
    keywords: ['faktur dan invoice', 'quotations', 'quotation', 'invoice', 'faktur', 'tagihan'],
    matchUrls: ['/dashboard/360-service/quotations', '/mobile/360-service/quotations'],
  },
  'kontrak-karyawan': {
    key: 'kontrak-karyawan',
    title: 'Kontrak Karyawan',
    fileName: '18_Kontrak_Karyawan.png',
    polosUrl: '/icons/hero-3d/polos/18_Kontrak_Karyawan.png',
    tileUrl: '/icons/hero-3d/tile/18_Kontrak_Karyawan.png',
    keywords: ['kontrak karyawan', 'contract review', 'review masa kontrak', 'kontrak kerja', 'perjanjian kerja'],
    matchUrls: ['/mobile/hc/contract-review', '/dashboard/hc/contract-review'],
  },
  'file-manager': {
    key: 'file-manager',
    title: 'File Manager & Assets',
    fileName: '19_File_Manager.png',
    polosUrl: '/icons/hero-3d/polos/19_File_Manager.png',
    tileUrl: '/icons/hero-3d/tile/19_File_Manager.png',
    keywords: ['file manager', 'cs assets', 'asset management', 'sap asset inventory', 'manajemen aset', 'berkas'],
    matchUrls: ['/mobile/central-service/assets', '/dashboard/central-service/assets', '/dashboard/central-service/sap-assets'],
  },
  'cabang-terdekat': {
    key: 'cabang-terdekat',
    title: 'Cabang Terdekat & Check-In',
    fileName: '20_Cabang_Terdekat.png',
    polosUrl: '/icons/hero-3d/polos/20_Cabang_Terdekat.png',
    tileUrl: '/icons/hero-3d/tile/20_Cabang_Terdekat.png',
    keywords: ['cabang terdekat', 'check-in', 'check in', 'presensi lokasi', 'lokasi cabang', 'kantor cabang', 'site'],
    matchUrls: ['/mobile/attendance', '/dashboard/attendance'],
  },
}

const ALL_ICONS = Object.values(HERO_3D_ICONS)

/**
 * Normalizes string for fuzzy/robust matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
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

  // 2. URL Match
  if (identifier.url) {
    const cleanUrl = identifier.url.split('?')[0].toLowerCase()
    const foundByUrl = ALL_ICONS.find((item) =>
      item.matchUrls.some((u) => u.toLowerCase().startsWith(cleanUrl) || cleanUrl.startsWith(u.toLowerCase()))
    )
    if (foundByUrl) return foundByUrl
  }

  // 3. Title / Keyword Match
  if (identifier.title) {
    const normalized = normalizeText(identifier.title)
    if (!normalized) return null

    // Exact title match
    const exact = ALL_ICONS.find((item) => normalizeText(item.title) === normalized)
    if (exact) return exact

    // Match by keywords (longest keyword match wins)
    let bestMatch: Hero3dIconInfo | null = null
    let longestKeywordLen = 0

    for (const icon of ALL_ICONS) {
      for (const kw of icon.keywords) {
        const normKw = normalizeText(kw)
        if (normKw && (normalized.includes(normKw) || normKw.includes(normalized))) {
          if (normKw.length > longestKeywordLen) {
            longestKeywordLen = normKw.length
            bestMatch = icon
          }
        }
      }
    }

    if (bestMatch) return bestMatch
  }

  return null
}
