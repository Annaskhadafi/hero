import type { TireRepairInspection, TireRepairPhoto } from '@/db/schema/tire-repair';

export type DurationTag = 'R1' | 'R2' | 'R3' | 'R4';

export const DURATION_CONFIG: Record<DurationTag, { maxDays: number; label: string }> = {
  R1: { maxDays: 4, label: 'R1 (Max 4 Hari)' },
  R2: { maxDays: 8, label: 'R2 (Max 8 Hari)' },
  R3: { maxDays: 12, label: 'R3 (Max 12 Hari)' },
  R4: { maxDays: 18, label: 'R4 (Max 18 Hari)' },
};

export const STANDARD_TIRE_SIZES = [
  '27.00R49',
  '33.00R51',
  '40.00R57',
  '46/90R57',
  '50/80R57',
  '53/80R63',
  '59/80R63',
  '24.00R35',
  '21.00R35',
  '18.00R33',
  '14.00R24',
  '12.00R24',
  '11.00R20',
  '10.00R20',
];

export const STANDARD_TIRE_BRANDS = [
  'MICHELIN',
  'BRIDGESTONE',
  'GOODYEAR',
  'BELSHINA',
  'MAXAM',
  'TECHKING',
  'YOKOHAMA',
  'AEOLUS',
  'ADVANCE',
  'GALAXY',
  'GITI',
  'HILO',
  'LUAN',
  'TRIANGLE',
  'SWALLOW',
];

export const DEFAULT_CUSTOMERS = [
  'PT Kaltim Prima Coal',
  'PT Adaro Indonesia',
  'PT Bukit Makmur Mandiri Utama (BUMA)',
  'PT Pamapersada Nusantara (PAMA)',
  'PT Berau Coal',
  'PT Vale Indonesia',
  'PT Borneo Indobara (BIB)',
  'PT Bina Multicom Mandiri (BMB)',
  'PT Mandiri Intiperkasa (MIP)',
  'PT Saptaindra Sejati (SIS)',
  'PT Darma Henwa',
  'OTHER CUSTOMER',
];

export const DEFAULT_CUSTOMER_SITES = [
  'Sangatta KPC',
  'Sangatta',
  'Balikpapan',
  'Tanjung',
  'Berau',
  'BMB',
  'BIB',
  'KIM',
  'Palu',
  'Malinau',
  'DMP',
  'SBS',
  'BSI Banyuwangi',
  'Sorowako Vale',
  'Bengkulu CDE',
  'MHU',
];

export const REPAIR_LOCATIONS = [
  'Workshop Sangatta',
  'Workshop Balikpapan',
  'Workshop Tanjung',
  'Workshop Berau',
  'Workshop BMB',
  'Workshop BIB',
  'Workshop KIM',
  'Workshop Palu',
  'Workshop Malinau',
  'CP DMP',
  'CP SBS',
  'CP BSI Banyuwangi',
  'CP Sorowako Vale',
  'CP Bengkulu CDE',
  'CP MHU',
];

export const PHOTO_AREAS = [
  'Crown / Tread',
  'Sidewall',
  'Bead Area',
  'Shoulder',
  'Inner Liner',
  'Overall / Full Tire',
  'Serial Number Close-up',
  'Defect Close-up',
];

export const DEFAULT_CHITRA_INSPECTORS = [
  'Ary Maulana',
  'Reza Iskandar',
  'Aris Susanto',
  'Dedi Irawan',
  'Renaldo',
  'Romy Hidayat',
  'Apriyanto',
  'Catur Keswanto',
  'Junaidi',
  'Rendi Asmari',
  'M. Abian',
  'Febrial Hariri',
  'Tommy Indra Aldiny R.',
  'Rendra Rachman',
  'Muhammad Iqbal',
  'Andi Safari',
  'Saipudin',
  'Danny Hangga I.',
  'Herlambang Wijaya K.',
  'Irfan Rifai R.',
  'M. Wahyu I.',
  'Ade Fazri',
  'Fathurrahman Sufi',
  'Ade Saharu',
  'Hidayat Rahman',
  'Person Sihaloho',
  'Febrian Dani',
  'Mochamad Annas Khadafi',
];

export const CONSTRUCTION_TYPES = ['RADIAL', 'BIAS'];

export const TIRE_SIZES = STANDARD_TIRE_SIZES;
export const TIRE_BRANDS = STANDARD_TIRE_BRANDS;
export type RTag = DurationTag;


export interface CreateTireRepairInspectionPayload {
  serialNumber: string;
  tireSize: string;
  isCustomTireSize?: boolean;
  brand?: string;
  typeConstruction?: string;
  pattern?: string;
  dateReceived?: string;
  customer: string;
  customerSite?: string;
  status: 'Repair' | 'Retread' | 'Reject' | string;
  inspectLocation: string;
  dateInspect?: string;
  reportBy?: string;
  repairDuration?: DurationTag | string;
  cargoManifestNo?: string;
  rtd1?: string;
  rtd2?: string;
  remarks?: string;
  removalReason?: string;
  scrapReason?: string;
  deffectexRepair?: string;
  vehicle?: string;
  wheelPosition?: string;
  hours?: string;
  hoursSinceLastRepair?: string;
  pitLocation?: string;
  marking?: string;
  photos?: Array<{
    photoArea: string;
    photoUrl: string;
  }>;
}

export interface TireRepairInspectionRecord extends TireRepairInspection {
  photos?: TireRepairPhoto[];
}

export interface InspectionFilterParams {
  searchSN?: string;
  customer?: string;
  status?: string;
  tireSize?: string;
  repairLocation?: string;
  month?: number;
  year?: number;
}
