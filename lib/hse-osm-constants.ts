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

export type HseOsmClassificationAspect = "Keselamatan" | "Kesehatan" | "Lingkungan";

export interface HseOsmClassificationItem {
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  aspect: HseOsmClassificationAspect;
}

export const HSE_OSM_ASPECT_LABELS: Record<HseOsmClassificationAspect, string> = {
  Keselamatan: "Aspek Keselamatan (Safety)",
  Kesehatan: "Aspek Kesehatan (Health / Industrial Hygiene)",
  Lingkungan: "Aspek Lingkungan",
};

export const HSE_OSM_DEFAULT_CLASSIFICATIONS: readonly HseOsmClassificationItem[] = [
  // ── Aspek Keselamatan (Safety) ──
  {
    code: "SAFETY_APD",
    name: "Keselamatan - Alat Pelindung Diri (APD)",
    description: "Kepatuhan dan kelayakan penggunaan APD standar (Helm, Rompi, Kacamata, Sepatu, Sarung Tangan)",
    sortOrder: 1,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_BLIND_SPOT",
    name: "Keselamatan - Posisi Kerja / Blind Spot",
    description: "Posisi tubuh aman, penghindaran line of fire, pinch point, dan blind spot unit/alat berat",
    sortOrder: 2,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_WORKING_AT_HEIGHT",
    name: "Keselamatan - Bekerja di Ketinggian (Working at Height)",
    description: "Scaffolding, tangga platform, full body harness, & titik angkur aman",
    sortOrder: 3,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_LOTO",
    name: "Keselamatan - Isolasi Energi (LOTO)",
    description: "Penerapan Lockout / Tagout, pelepasan energi sisa, dan verifikasi zero energy state",
    sortOrder: 4,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_LIFTING_GEAR",
    name: "Keselamatan - Alat Angkat (Lifting Gear) & Aksesori",
    description: "Kelayakan crane, tyre handler, webbing sling, shackle, chain block, & sertifikasi lifting",
    sortOrder: 5,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_MACHINE_GUARDING",
    name: "Keselamatan - Pelindung Mesin (Machine Guarding)",
    description: "Pemasangan cover pelindung pada bagian mesin berputar dan transmisi bergerak",
    sortOrder: 6,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_ACCESS_EVACUATION",
    name: "Keselamatan - Jalur Akses & Evakuasi",
    description: "Akses jalan aman, tangga darurat, penanda jalur evakuasi, & muster point bebas hambatan",
    sortOrder: 7,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_TRAFFIC_SPEED",
    name: "Keselamatan - Rambu Lalu Lintas & Batas Kecepatan (Speed Limit)",
    description: "Kepatuhan rambu tambang/workshop, batas kecepatan sarana, & pemisahan jalur orang-alat",
    sortOrder: 8,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_PERMIT_TO_WORK",
    name: "Keselamatan - Izin Kerja (Permit to Work)",
    description: "Kelengkapan surat izin kerja aman (PTW) pekerjaan panas, ketinggian, atau ruang terbatas",
    sortOrder: 9,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_SOP_JSA",
    name: "Keselamatan - Prosedur Kerja & Instruksi Kerja (SOP/JSA)",
    description: "Ketersediaan, sosialisasi, dan kepatuhan langkah kerja aman SOP, WIN, & JSA",
    sortOrder: 10,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_FIRE_PREVENTION_APAR",
    name: "Keselamatan - Pencegahan Kebakaran & Alat Pemadam (APAR)",
    description: "Kesiapan dan kelayakan tabung APAR, hydrant, fire blanket, & deteksi dini bahaya kebakaran",
    sortOrder: 11,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_BARRICADE_RESTRICTED",
    name: "Keselamatan - Barikade & Pengamanan Area Terbatas",
    description: "Pemasangan barikade fisik, safety cone, tagging, & larangan masuk area berisiko tinggi",
    sortOrder: 12,
    aspect: "Keselamatan",
  },
  {
    code: "SAFETY_HAND_POWER_TOOLS",
    name: "Keselamatan - Kelayakan Perkakas Tangan & Power Tools",
    description: "Inspeksi fisik, tagging warna berkala, & kelaikan alat tangan manual maupun bertenaga",
    sortOrder: 13,
    aspect: "Keselamatan",
  },

  // ── Aspek Kesehatan (Health / Industrial Hygiene) ──
  {
    code: "HEALTH_ERGONOMICS",
    name: "Kesehatan - Ergonomi & Postur Kerja (Manual Handling)",
    description: "Teknik pengangkatan manual, batas beban angkat, penataan stasiun kerja, & peregangan",
    sortOrder: 14,
    aspect: "Kesehatan",
  },
  {
    code: "HEALTH_DUST_EXPOSURE",
    name: "Kesehatan - Paparan Debu & Partikulat",
    description: "Pengendalian debu respirabel/inhalabel dan penggunaan masker particulate standar",
    sortOrder: 15,
    aspect: "Kesehatan",
  },
  {
    code: "HEALTH_NOISE_LEVEL",
    name: "Kesehatan - Paparan Kebisingan (Noise Level)",
    description: "Zonasi kebisingan tinggi workshop/pit, peredam suara, & pemakaian earplug/earmuff",
    sortOrder: 16,
    aspect: "Kesehatan",
  },
  {
    code: "HEALTH_LIGHTING_ILLUMINATION",
    name: "Kesehatan - Pencahayaan Area Kerja (Iluminasi)",
    description: "Kecukupan kuat cahaya lux meter pada workshop, pit, & penerangan shift malam",
    sortOrder: 17,
    aspect: "Kesehatan",
  },
  {
    code: "HEALTH_VENTILATION_AIR",
    name: "Kesehatan - Ventilasi & Kualitas Udara",
    description: "Sirkulasi udara workshop, kelayakan exhaust fan, & pengukuran gas/uap kimia berbahaya",
    sortOrder: 18,
    aspect: "Kesehatan",
  },
  {
    code: "HEALTH_WELFARE_FACILITIES",
    name: "Kesehatan - Fasilitas Kesejahteraan (P3K, Air Minum, Toilet)",
    description: "Kelengkapan kotak P3K, ketersediaan air minum higienis, fasilitas istirahat, & toilet bersih",
    sortOrder: 19,
    aspect: "Kesehatan",
  },
  {
    code: "HEALTH_FATIGUE_MANAGEMENT",
    name: "Kesehatan - Manajemen Kelelahan Kerja (Fatigue Management)",
    description: "Pemeriksaan fit to work harian, jam tidur/istirahat cukup, & pencegahan microsleep",
    sortOrder: 20,
    aspect: "Kesehatan",
  },
  {
    code: "HEALTH_HYGIENE_SANITATION",
    name: "Kesehatan - Higiene Perorangan & Sanitasi Tempat Kerja",
    description: "Fasilitas cuci tangan, sabun, kebersihan kantin/mess, & pengendalian vektor hama penyakit",
    sortOrder: 21,
    aspect: "Kesehatan",
  },
  {
    code: "HEALTH_MSDS_CHEMICALS",
    name: "Kesehatan - Ketersediaan & Informasi Bahan Kimia (MSDS/LDKB)",
    description: "Penyediaan dokumen MSDS bahasa Indonesia, label bahaya GHS, & secondary container label",
    sortOrder: 22,
    aspect: "Kesehatan",
  },

  // ── Aspek Lingkungan ──
  {
    code: "ENV_B3_WASTE",
    name: "Lingkungan - Pengelolaan Limbah B3 (Oli Bekas, Grease, Filter, Majun)",
    description: "Pemisahan, pelabelan simbol B3, logbook neraca, & penyimpanan di TPS Limbah B3 berizin",
    sortOrder: 23,
    aspect: "Lingkungan",
  },
  {
    code: "ENV_NON_B3_SCRAP",
    name: "Lingkungan - Pengelolaan Limbah Non-B3 & Besi Tua (Scrap Metal/Parts)",
    description: "Pemisahan sampah domestik organik/anorganik dan penumpukan scrap besi/part bekas aman",
    sortOrder: 24,
    aspect: "Lingkungan",
  },
  {
    code: "ENV_SCRAP_OTR_TYRE",
    name: "Lingkungan - Pengelolaan Ban Bekas (Scrap OTR Tyre)",
    description: "Penataan tyre scrap yard rapi, pencegahan genangan air/sarang nyamuk, & stacking aman",
    sortOrder: 25,
    aspect: "Lingkungan",
  },
  {
    code: "ENV_SPILL_KIT_SAND",
    name: "Lingkungan - Penanganan Tumpahan B3 (Ketersediaan Spill Kit & Pasir)",
    description: "Kesiapan spill kit, absorbent pad, sawdust/pasir, sekop, & penanganan cepat tumpahan oli",
    sortOrder: 26,
    aspect: "Lingkungan",
  },
  {
    code: "ENV_DRAINAGE_OIL_TRAP",
    name: "Lingkungan - Kondisi Saluran Drainase & Oil Trap (Oil-Water Separator)",
    description: "Kebersihan saluran parit bengkel, fungsi oil trap, & pengerukan endapan lumpur berkala",
    sortOrder: 27,
    aspect: "Lingkungan",
  },
  {
    code: "ENV_SECONDARY_CONTAINMENT",
    name: "Lingkungan - Penyimpanan B3 & Penampungan Sekunder (Secondary Containment)",
    description: "Bunding/bundwall drum storage, kapasitas penampungan sekunder minimal 110%, bebas kebocoran",
    sortOrder: 28,
    aspect: "Lingkungan",
  },
  {
    code: "ENV_WASTEWATER_MANAGEMENT",
    name: "Lingkungan - Pengelolaan Air Limbah",
    description: "Penyaluran dan sedimentasi air cucian unit (washpad) sesuai baku mutu lingkungan",
    sortOrder: 29,
    aspect: "Lingkungan",
  },
  {
    code: "ENV_DUST_HOUSEKEEPING",
    name: "Lingkungan - Pengendalian Debu & Partikulat Area Bengkel (Housekeeping)",
    description: "Penyiraman jalan akses workshop, pembersihan lantai kerja berkala, serta budaya 5R/5S",
    sortOrder: 30,
    aspect: "Lingkungan",
  },
] as const;

export type HseOsmFindingStatus = "OPEN" | "PROCESSED" | "CLOSED" | "REJECTED";
export type HseOsmRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type HseOsmFindingCondition = "SUBSTANDARD" | "STANDARD";

export const HSE_OSM_FINDING_CONDITIONS: Array<{
  value: HseOsmFindingCondition;
  status: HseOsmFindingStatus;
  label: string;
  shortLabel: string;
  badgeClass: string;
  description: string;
}> = [
  {
    value: "SUBSTANDARD",
    status: "OPEN",
    label: "Substandard / Open",
    shortLabel: "Substandard",
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50",
    description: "Kondisi tidak aman / di bawah standar, butuh perbaikan di lapangan",
  },
  {
    value: "STANDARD",
    status: "CLOSED",
    label: "Standard / Close",
    shortLabel: "Standard",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
    description: "Kondisi baik & sesuai standar keselamatan (Good condition), langsung tuntas",
  },
];

export const HSE_OSM_STATUS_CONFIG: Record<
  HseOsmFindingStatus,
  { label: string; badgeClass: string; dotClass: string; description: string }
> = {
  OPEN: {
    label: "Substandard / Open",
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50",
    dotClass: "bg-red-500",
    description: "Temuan kondisi tidak standar, memerlukan perbaikan di lapangan",
  },
  PROCESSED: {
    label: "Processed",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
    dotClass: "bg-amber-500",
    description: "Tindakan perbaikan telah diserahkan, menunggu verifikasi HSE/Leader",
  },
  CLOSED: {
    label: "Standard / Close",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
    dotClass: "bg-emerald-500",
    description: "Kondisi sesuai standar atau telah tuntas diperbaiki",
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
