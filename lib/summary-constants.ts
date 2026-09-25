export const SAFETY_SHOES_COL = 'Safety Shoes';

export const QTY_ONLY_COLUMNS = [
  'Safety Glasses',
  'Masker',
  'Ear Plug',
  'Sarung Tangan Ansel',
  'Safety Boot Petrova',
  'Helmet Kuning',
  'Helmet Putih',
  'Padlock Merah',
  'Padlock Kuning',
  'Sisor',
  'Tali Kacamata',
  'Chin Strap',
  'Dalaman Helm',
  'Kaos Tangan Dotting',
  'Safety Goggles',
  'Apron',
  'Face Shield Helmet',
  'Sunbrim Helmet',
];

export const APD_ITEM_COLUMNS = [...QTY_ONLY_COLUMNS, SAFETY_SHOES_COL];
export const APD_COLUMNS = APD_ITEM_COLUMNS;

export type PendingSummaryRequestItem = {
  id: number;
  itemType: string;
  canonicalName: string;
  requestType: string;
  quantity: number;
  notes: string;
};

export type ManualSummaryItem = {
  itemType: string;
  canonicalName: string;
  quantity: number;
  requestType: string;
  notes?: string;
};

export type ManualSummaryEntry = {
  tempId: string;
  employeeId: number;
  employeeName: string;
  employeeSn: string;
  siteId: number;
  siteName: string;
  departmentName?: string | null;
  items: ManualSummaryItem[];
  safetyShoesSize?: string;
  remarks?: string;
};

export type PendingSummaryRequest = {
  requestId: number;
  tempId?: string;
  isManual?: boolean;
  requestNumber: string;
  requestDate: Date;
  employeeId: number;
  employeeName: string;
  employeeSn: string;
  siteId: number;
  siteName: string;
  departmentName: string | null;
  items: PendingSummaryRequestItem[];
  safetyShoesSize: string;
  suggestedRemarks: string;
};

