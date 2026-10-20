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
  'Sarung Tangan Dotting',
  'Safety Goggles',
  'Apron',
  'Face Shield Helmet',
  'Sunbrim Helmet',
];

export const APD_ITEM_COLUMNS = [...QTY_ONLY_COLUMNS, SAFETY_SHOES_COL];
export const APD_COLUMNS = APD_ITEM_COLUMNS;

export function buildDynamicApdColumns(masterItems?: Array<{ name: string; isQtyOnly?: boolean; hasSize?: boolean }>): {
  qtyOnlyCols: string[];
  allCols: string[];
} {
  if (!masterItems || masterItems.length === 0) {
    return {
      qtyOnlyCols: QTY_ONLY_COLUMNS,
      allCols: APD_ITEM_COLUMNS,
    };
  }

  const qtyOnlyCols = masterItems
    .filter((item) => item.name !== SAFETY_SHOES_COL && !item.hasSize)
    .map((item) => item.name);

  const sizedCols = masterItems
    .filter((item) => item.name === SAFETY_SHOES_COL || item.hasSize)
    .map((item) => item.name);

  const allCols = [...qtyOnlyCols, ...sizedCols];

  return { qtyOnlyCols, allCols };
}

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

/**
 * Default Cut-Off Summary APD:
 * Dari tanggal 6 sampai tanggal 6 berikutnya.
 * Jika hari ini >= 6 (misal 20 Okt), start = 6 Okt, end = 6 Nov.
 * Jika hari ini < 6 (misal 3 Okt), start = 6 Sep, end = 6 Okt.
 */
export function getDefaultApdSummaryDateRange(refDate: Date = new Date()): { startDate: string; endDate: string } {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const day = refDate.getDate();

  let startYear = year;
  let startMonth = month;
  let endYear = year;
  let endMonth = month;

  if (day >= 6) {
    startYear = year;
    startMonth = month;
    if (month === 11) {
      endYear = year + 1;
      endMonth = 0;
    } else {
      endYear = year;
      endMonth = month + 1;
    }
  } else {
    if (month === 0) {
      startYear = year - 1;
      startMonth = 11;
    } else {
      startYear = year;
      startMonth = month - 1;
    }
    endYear = year;
    endMonth = month;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatYMD = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

  return {
    startDate: formatYMD(startYear, startMonth, 6),
    endDate: formatYMD(endYear, endMonth, 6),
  };
}

/**
 * Periode sebelumnya (Tanggal 6 s/d 6 bulan lalu)
 */
export function getPreviousApdSummaryDateRange(refDate: Date = new Date()): { startDate: string; endDate: string } {
  const current = getDefaultApdSummaryDateRange(refDate);
  const parts = current.startDate.split('-').map(Number);
  const startRef = new Date(parts[0], parts[1] - 1, 1);
  startRef.setMonth(startRef.getMonth() - 1);
  return getDefaultApdSummaryDateRange(startRef);
}

/**
 * Periode 1 s/d Akhir Bulan Kalender Ini
 */
export function getCalendarMonthApdSummaryDateRange(refDate: Date = new Date()): { startDate: string; endDate: string } {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    startDate: `${year}-${pad(month + 1)}-01`,
    endDate: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}
