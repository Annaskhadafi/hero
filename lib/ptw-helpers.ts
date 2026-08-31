/**
 * PTW (Permit To Work) Helper Functions, Presets & Checklist Constants
 * Standardized for centralized PTW workflow & approval matrix
 */

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface PermitTypeChecklist {
  title: string;
  subHeader: string;
  subTypes?: string[];
  items: ChecklistItem[];
}

export const PERMIT_TYPE_OPTIONS = [
  { value: "Hot Work Permit", label: "Hot Work Permit" },
  { value: "Confined Space Permit", label: "Confined Space Permit" },
  { value: "Digging Permit", label: "Digging Permit" },
  { value: "Cold Permit", label: "Cold Permit" },
  { value: "Electrical/Mechanical", label: "Electrical/Mechanical" },
];

export const EQUIPMENT_CHECKLIST_PER_TYPE: Record<string, PermitTypeChecklist> = {
  "Hot Work Permit": {
    title: "Hot Work Permit",
    subHeader: "Semua perlengkapan keselamatan kerja wajib diperiksa dan disiapkan sebelum pekerjaan panas dimulai.",
    subTypes: [
      "Pengelasan (Welding)",
      "Pemotongan (Cutting)",
      "Gerinda (Grinding)",
      "Pemanasan (Heating)",
    ],
    items: [
      { id: "hw-1", label: "Tersedia APAR" },
      { id: "hw-2", label: "Fire Blanket / Penutup Percikan Api" },
      { id: "hw-3", label: "Face Shield / Kacamata Las" },
      { id: "hw-4", label: "Hand glove" },
      { id: "hw-5", label: "Safety Shoes" },
      { id: "hw-6", label: "Helm Keselamatan" },
      { id: "hw-7", label: "Pembersihan Area Flammable (Radius 10m)" },
      { id: "hw-8", label: "Gas Detector / Uji Kandungan Gas" },
    ],
  },
  "Confined Space Permit": {
    title: "Confined Space Permit",
    subHeader: "Pengujian gas atmosfer dan kesiapan peralatan darurat wajib dipenuhi sebelum memasuki ruang terbatas.",
    subTypes: [
      "Tangki / Vessel",
      "Gorong-gorong / Saluran",
      "Galian Dalam (> 1.5m)",
      "Ruang Terbatas Lainnya",
    ],
    items: [
      { id: "cs-1", label: "Breathing Set diperlukan ?" },
      { id: "cs-2", label: "Gas Detector (O2, LEL, CO, H2S)" },
      { id: "cs-3", label: "Blower / Ventilasi Udara Kontinyu" },
      { id: "cs-4", label: "Full Body Harness & Safety Line" },
      { id: "cs-5", label: "Tripod & Winch Rescue" },
      { id: "cs-6", label: "Petugas Standby / Watchman" },
      { id: "cs-7", label: "Penerangan Portabel Explosion Proof" },
      { id: "cs-8", label: "Respirator" },
    ],
  },
  "Digging Permit": {
    title: "Digging Permit",
    subHeader: "Pastikan tidak ada utilitas bawah tanah (pipa/kabel) dan dinding galian aman dari longsor.",
    subTypes: [
      "Penggalian Manual",
      "Penggalian Alat Berat (Excavator)",
      "Pengeboran Tanah / Boring",
      "Trenching Jalur Utilitas",
    ],
    items: [
      { id: "dg-1", label: "Denah Utilitas Bawah Tanah Terverifikasi" },
      { id: "dg-2", label: "Barikade & Safety Line Keliling Galian" },
      { id: "dg-3", label: "Shoring / Penahan Dinding Galian" },
      { id: "dg-4", label: "Tangga Akses Keluar / Masuk Galian" },
      { id: "dg-5", label: "Pompa Air / Dewatering (Bila Berlumpur)" },
      { id: "dg-6", label: "Lampu Penerangan Malam & Rambu Peringatan" },
    ],
  },
  "Cold Permit": {
    title: "Cold Work Permit",
    subHeader: "Peralatan kerja dan APD standar wajib diperiksa sebelum pekerjaan umum dimulai.",
    subTypes: [
      "Perawatan Umum",
      "Pengecatan / Coating",
      "Pembersihan Mekanikal",
      "Pemasangan Scaffolding",
    ],
    items: [
      { id: "cp-1", label: "APD Standar Lengkap (Helm, Rompi, Sepatu)" },
      { id: "cp-2", label: "Peralatan Kerja dalam Kondisi Layak (Inspected)" },
      { id: "cp-3", label: "Barikade Area Kerja" },
      { id: "cp-4", label: "Safety Harness (Bila di Ketinggian)" },
      { id: "cp-5", label: "Kotak P3K di Lokasi" },
      { id: "cp-6", label: "Hand glove" },
    ],
  },
  "Electrical/Mechanical": {
    title: "Electrical / Mechanical Permit",
    subHeader: "Energi berbahaya wajib diisolasi (LOTO) dan diuji nol tegangan sebelum pekerjaan dimulai.",
    subTypes: [
      "Isolasi Energi (LOTO)",
      "Pekerjaan Panel Listrik",
      "Overhaul Mesin / Gearbox",
      "Pengujian Tegangan & Arus",
    ],
    items: [
      { id: "em-1", label: "Gembok & Tag LOTO Terpasang" },
      { id: "em-2", label: "Multimeter / Alat Tes Tegangan Terkalibrasi" },
      { id: "em-3", label: "Sarung Tangan Insulasi (Dielectric Gloves)" },
      { id: "em-4", label: "Grounding Rod / Pembumian Tambahan" },
      { id: "em-5", label: "Tools Terisolasi (Insulated Tools 1000V)" },
      { id: "em-6", label: "Barikade Bahaya Listrik / Rambu LOTO" },
    ],
  },
};

export const HIRADC_PRESETS = [
  {
    value: "welding_cutting",
    label: "Pengelasan & Pemotongan Logam (Hot Work)",
    permitType: "Hot Work Permit",
    hazard: "Percikan api, panas tinggi, radiasi sinar las",
    controls: "Tersedia APAR, fire blanket, safety glasses, sarung tangan las",
  },
  {
    value: "confined_tank_cleaning",
    label: "Pembersihan Tangki & Ruang Terbatas",
    permitType: "Confined Space Permit",
    hazard: "Asfiksia, gas beracun, terperangkap di ruang sempit",
    controls: "Uji gas multi-parameter, blower ventilasi, SCBA/Breathing Set, watchman standby",
  },
  {
    value: "excavation_trenching",
    label: "Penggalian Jalur Pipa / Utilitas",
    permitType: "Digging Permit",
    hazard: "Dinding galian runtuh/longsor, pipa gas/listrik tertabrak",
    controls: "Verifikasi peta utilitas bawah tanah, pasang shoring penahan, barikade keliling",
  },
  {
    value: "electrical_panel_maintenance",
    label: "Perawatan Panel Distribusi Utama (LOTO)",
    permitType: "Electrical/Mechanical",
    hazard: "Sengatan arus listrik tegangan menengah, arc flash",
    controls: "Prosedur LOTO terpasang, sarung tangan dielektrik, uji voltase nol",
  },
  {
    value: "general_cold_maintenance",
    label: "Pekerjaan Fabrikasi Dingin & Pengecatan",
    permitType: "Cold Permit",
    hazard: "Tergores material tajam, paparan uap thinner/cat",
    controls: "Sarung tangan pelindung, kacamata safety, masker respirator",
  },
  {
    value: "hot_work_confined_combined",
    label: "Pengelasan Dalam Tangki (Hot Work + Ruang Terbatas)",
    permitType: "Hot Work, Confined Space",
    hazard: "Akumulasi gas mudah menyala, percikan api, ruang tertutup",
    controls: "Uji gas berkelanjutan, blower hisap, APAR standby, izin ganda aktif",
  },
];

/**
 * Normalizes single permit type string to standardized canonical name
 */
export function normalizePermitType(typeStr: string | null | undefined): string {
  if (!typeStr) return "Hot Work Permit";
  const trimmed = typeStr.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower === "hot work" ||
    lower === "hot work permit" ||
    lower.startsWith("hw-") ||
    lower === "hw"
  ) {
    return "Hot Work Permit";
  }
  if (
    lower === "confined space" ||
    lower === "confined space permit" ||
    lower.startsWith("cs-") ||
    lower === "cs"
  ) {
    return "Confined Space Permit";
  }
  if (
    lower === "digging" ||
    lower === "digging permit" ||
    lower.startsWith("dg-") ||
    lower === "excavation"
  ) {
    return "Digging Permit";
  }
  if (
    lower === "cold" ||
    lower === "cold permit" ||
    lower === "cold work" ||
    lower === "cold work permit"
  ) {
    return "Cold Permit";
  }
  if (
    lower === "electrical/mechanical" ||
    lower === "electrical / mechanical" ||
    lower === "electrical / mechanical permit" ||
    lower === "electrical isolation" ||
    lower.startsWith("em-")
  ) {
    return "Electrical/Mechanical";
  }

  return trimmed;
}

/**
 * Normalizes comma-separated permit types string into canonical names
 */
export function normalizePermitTypes(permitTypesStr: string | null | undefined): string {
  if (!permitTypesStr) return "Hot Work Permit";
  const parts = permitTypesStr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "Hot Work Permit";
  return parts.map(normalizePermitType).join(", ");
}

/**
 * Parses permit type input into unique list of normalized canonical permit type keys
 */
export function getActivePermitTypeKeys(permitTypes: string | string[] | null | undefined): string[] {
  if (!permitTypes) return ["Hot Work Permit"];
  const rawList = Array.isArray(permitTypes)
    ? permitTypes
    : permitTypes.split(",").map((p) => p.trim());

  const normalized = rawList
    .map((p) => p.trim())
    .filter(Boolean)
    .map(normalizePermitType);

  return Array.from(new Set(normalized));
}

/**
 * Returns default equipment item labels for a given permit type
 */
export function getDefaultEquipmentItems(permitType: string): string[] {
  const key = normalizePermitType(permitType);
  const checklist = EQUIPMENT_CHECKLIST_PER_TYPE[key];
  if (!checklist) return [];
  return checklist.items.map((item) => item.label);
}

/**
 * Strips numbering prefix (e.g. "1. ", "2) ") and trims for robust comparison
 */
function cleanItemLabel(text: string): string {
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Checks whether an equipment item label is checked in the provided checked list
 */
export function isItemChecked(
  item: string,
  checkedEquipment: string[] | null | undefined
): boolean {
  if (!checkedEquipment || !Array.isArray(checkedEquipment) || checkedEquipment.length === 0) {
    return false;
  }
  const cleanTarget = cleanItemLabel(item);
  return checkedEquipment.some((checked) => cleanItemLabel(checked) === cleanTarget);
}
