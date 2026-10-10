export const HSE_OSM_DEFAULT_FOCUS_ITEMS = [
  {
    code: "FATALITY_PREVENTION",
    name: "Fatality Prevention",
    description: "Pengawasan dan eliminasi bahaya kritis berpotensi fatalitas di area kerja",
    sortOrder: 1,
  },
  {
    code: "ENVIRONMENTAL_MANAGEMENT",
    name: "Environmental Management",
    description: "Pengelolaan limbah B3, penanganan ceceran hidrokarbon, & perlindungan lingkungan",
    sortOrder: 2,
  },
  {
    code: "FINGER_INJURY_PREVENTION",
    name: "Finger Injury Prevention",
    description: "Pencegahan cedera tangan, pinch point, & penggunaan sarung tangan standar",
    sortOrder: 3,
  },
  {
    code: "RISK_MANAGEMENT",
    name: "Risk Management",
    description: "Identifikasi bahaya dinamis, JSA, & kepatuhan prosedur kerja aman",
    sortOrder: 4,
  },
  {
    code: "INCIDENT_MANAGEMENT",
    name: "Incident Management",
    description: "Penanganan tanggap darurat, pelaporan near-miss, & tindak lanjut insiden",
    sortOrder: 5,
  },
] as const;

export const HSE_OSM_DEFAULT_CLASSIFICATIONS = [
  {
    code: "VEHICLE_PNEUMATIC_TOOLS",
    name: "Vehicle & Mobile Equipment Pneumatic & Hand Tools",
    description: "Kelaikan unit sarana/mobile equipment, perkakas pneumatik, dan hand tools",
    sortOrder: 1,
  },
  {
    code: "TYRE_INFLATION_LIFTING",
    name: "Lifting & Support Equipment Tyre Inflation & Deflation",
    description: "Peralatan pengangkat, jack, stand, inflasi/deflasi ban bertekanan tinggi",
    sortOrder: 2,
  },
  {
    code: "ELECTRICAL_SAFETY",
    name: "Wheel, Rim & Component Electrical Safety",
    description: "Inspeksi velg, lock ring, komponen roda, dan keselamatan instalasi elektrikal",
    sortOrder: 3,
  },
  {
    code: "HOT_WORK_SAFETY",
    name: "Hot Work Safety (Pekerjaan Panas)",
    description: "Pengelasan, pemotongan las, fire blanket, APAR siaga, & izin kerja panas",
    sortOrder: 4,
  },
  {
    code: "HAZMAT_HOUSEKEEPING",
    name: "Housekeeping & Storage: HAZMAT & Spill Control",
    description: "Kerapian workshop, drum storage, secondary containment, & spill kit",
    sortOrder: 5,
  },
  {
    code: "FIRE_EMERGENCY_LOTO",
    name: "Fire & Emergency Response: LOTO & Work Permit",
    description: "Sistem isolasi energi (LOTO), jalur evakuasi, APAR, & surat izin kerja aman (PTW)",
    sortOrder: 6,
  },
  {
    code: "TRAFFIC_BARRICATION",
    name: "Traffic & Barrication",
    description: "Rambu tambang, barikade area kerja, parkir aman, & pemisahan manusia-alat",
    sortOrder: 7,
  },
  {
    code: "WORKING_AT_HEIGHT",
    name: "Working at Height (Bekerja di Ketinggian)",
    description: "Scaffolding, full body harness, tangga kerja, & titik angkur terinspeksi",
    sortOrder: 8,
  },
  {
    code: "ERGONOMICS_MANUAL_HANDLING",
    name: "Ergonomics & Manual Handling Environmental & Waste",
    description: "Postur pengangkatan manual, batas beban kerja, serta pemilahan sampah operasional",
    sortOrder: 9,
  },
  {
    code: "PPE_APD",
    name: "PPE / APD",
    description: "Kepatuhan dan kelaikan alat pelindung diri standar (Helm, Sepatu, Kacamata, Rompi)",
    sortOrder: 10,
  },
] as const;

export type HseOsmFindingStatus = "OPEN" | "PROCESSED" | "CLOSED" | "REJECTED";
export type HseOsmRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const HSE_OSM_STATUS_CONFIG: Record<
  HseOsmFindingStatus,
  { label: string; badgeClass: string; dotClass: string; description: string }
> = {
  OPEN: {
    label: "Open",
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50",
    dotClass: "bg-red-500",
    description: "Temuan baru tercatat, menunggu perbaikan di lapangan",
  },
  PROCESSED: {
    label: "Processed",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
    dotClass: "bg-amber-500",
    description: "Tindakan perbaikan telah diserahkan, menunggu verifikasi HSE/Leader",
  },
  CLOSED: {
    label: "Closed",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
    dotClass: "bg-emerald-500",
    description: "Temuan telah tuntas diperbaiki dan diverifikasi",
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-500",
    description: "Perbaikan ditolak atau membutuhkan tindakan tambahan",
  },
};

export const HSE_OSM_RISK_CONFIG: Record<
  HseOsmRiskLevel,
  { label: string; badgeClass: string }
> = {
  LOW: {
    label: "Low Risk",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  MEDIUM: {
    label: "Medium Risk",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  HIGH: {
    label: "High Risk",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  },
  CRITICAL: {
    label: "Critical Risk",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
};

export const HSE_OSM_OFFLINE_STORAGE_KEY = "hero:hse-osm:offline-queue";
export const HSE_OSM_LAST_SYNC_KEY = "hero:hse-osm:last-sync";
