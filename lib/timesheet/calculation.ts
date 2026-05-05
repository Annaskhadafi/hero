/**
 * Timesheet Calculation Logic
 * Handles daily status determination, allowance rules, and OT calculations
 */

export interface DailyStatus {
  // OT display
  otDisplay: string | number | null; // "OFF", "FB", "SICK", 4, 12.5, etc
  otHours: number | null; // Actual hours for calculation
  
  // Allowance eligibility
  msaEligible: boolean;
  mealsEligible: boolean;
  tlkEligible: boolean;
  
  // Status code
  statusCode: string | null; // OFF, FB, SICK, IZIN, ALPA, LIBUR, etc
}

/**
 * Status code definitions
 * Based on TIMESHEET_SYSTEM_DESIGN.md section 11.4
 */
export const STATUS_CODES = {
  FB: { label: "Fly Back", allowance: false, otDisplay: "FB" },
  OFF: { label: "Hari Libur", allowance: false, otDisplay: "OFF" },
  SICK: { label: "Sakit", allowance: true, otDisplay: "SICK" },
  IZIN: { label: "Izin", allowance: true, otDisplay: "IZIN" },
  ALPA: { label: "Tidak Hadir", allowance: false, otDisplay: "ALPA" },
  CUTI: { label: "Cuti", allowance: false, otDisplay: "" },
  AL: { label: "Annual Leave", allowance: false, otDisplay: "" },
  LIBUR: { label: "Libur Nasional", allowance: true, otDisplay: "Libur" },
  MCU: { label: "Medical Check-Up", allowance: true, otDisplay: "" },
  STANDBY: { label: "Standby", allowance: true, otDisplay: "0" },
  TRAINING: { label: "Training", allowance: true, otDisplay: "Training" },
} as const;

export type StatusCodeKey = keyof typeof STATUS_CODES;

/**
 * Determine daily status from OT and SPL data
 */
export function determineDailyStatus(
  otHours: number | null,
  otStatus: string | null,
  allowanceStatus: string | null,
  transferredToSite: string | null
): DailyStatus {
  // If transferred to another site, no OT/allowance
  if (transferredToSite) {
    return {
      otDisplay: transferredToSite,
      otHours: null,
      msaEligible: false,
      mealsEligible: false,
      tlkEligible: false,
      statusCode: null,
    };
  }

  // Check if OT status matches known status codes
  const normalizedOtStatus = otStatus?.toUpperCase().trim();
  const statusCodeKey = normalizedOtStatus
    ? (Object.keys(STATUS_CODES).find((key) =>
        normalizedOtStatus.includes(key)
      ) as StatusCodeKey | undefined)
    : undefined;

  if (statusCodeKey) {
    const statusDef = STATUS_CODES[statusCodeKey];
    return {
      otDisplay: statusDef.otDisplay,
      otHours: null,
      msaEligible: statusDef.allowance,
      mealsEligible: statusDef.allowance,
      tlkEligible: statusDef.allowance,
      statusCode: statusCodeKey,
    };
  }

  // Check allowance status
  const normalizedAllowanceStatus = allowanceStatus?.toUpperCase().trim();
  const allowanceStatusKey = normalizedAllowanceStatus
    ? (Object.keys(STATUS_CODES).find((key) =>
        normalizedAllowanceStatus.includes(key)
      ) as StatusCodeKey | undefined)
    : undefined;

  if (allowanceStatusKey) {
    const statusDef = STATUS_CODES[allowanceStatusKey];
    return {
      otDisplay: statusDef.otDisplay,
      otHours: null,
      msaEligible: statusDef.allowance,
      mealsEligible: statusDef.allowance,
      tlkEligible: statusDef.allowance,
      statusCode: allowanceStatusKey,
    };
  }

  // Normal working day with OT
  if (otHours !== null && otHours > 0) {
    return {
      otDisplay: otHours,
      otHours,
      msaEligible: true,
      mealsEligible: true,
      tlkEligible: true,
      statusCode: null,
    };
  }

  // No OT, no status (empty day or no data)
  return {
    otDisplay: null,
    otHours: null,
    msaEligible: false,
    mealsEligible: false,
    tlkEligible: false,
    statusCode: null,
  };
}

/**
 * Calculate allowance amount based on status and site config
 */
export function calculateAllowanceAmount(
  eligible: boolean,
  rate: number,
  status: string | null
): number | null {
  if (!eligible) {
    return null;
  }

  // If status is present and not eligible for allowance, return null
  if (status) {
    const normalizedStatus = status.toUpperCase().trim();
    const statusKey = Object.keys(STATUS_CODES).find((key) =>
      normalizedStatus.includes(key)
    ) as StatusCodeKey | undefined;

    if (statusKey && !STATUS_CODES[statusKey].allowance) {
      return null;
    }
  }

  return rate;
}

/**
 * Detect if a cell value indicates site transfer
 * e.g., "VALE", "BIB", "MIFA" in OT column
 */
export function detectSiteTransfer(cellValue: any): string | null {
  if (typeof cellValue !== "string") {
    return null;
  }

  const siteKeywords = [
    "VALE",
    "BIB",
    "MIFA",
    "IPT",
    "BALIKPAPAN",
    "KIM",
    "MHU",
    "DMP",
    "BMB",
    "BHJ",
    "GRESIK",
    "AMM",
    "PPA",
    "CK",
  ];

  const normalized = cellValue.toUpperCase().trim();

  for (const keyword of siteKeywords) {
    if (normalized === keyword || normalized.includes(keyword)) {
      return normalized;
    }
  }

  return null;
}

/**
 * Validate total OT hours match sum of daily records
 */
export function validateOTTotal(
  declaredTotal: number,
  dailyRecords: Array<{ otHours: number | null }>
): { valid: boolean; calculatedTotal: number; difference: number } {
  const calculatedTotal = dailyRecords.reduce(
    (sum, record) => sum + (record.otHours || 0),
    0
  );

  const difference = Math.abs(declaredTotal - calculatedTotal);
  const valid = difference < 0.1; // Allow 0.1 hour tolerance for rounding

  return {
    valid,
    calculatedTotal,
    difference,
  };
}

/**
 * Format OT hours for display (integer vs decimal based on site config)
 */
export function formatOTHours(
  hours: number | null,
  decimalMode: boolean
): string | number | null {
  if (hours === null) {
    return null;
  }

  if (decimalMode) {
    // VALE mode: show decimals (4.5, 12.5)
    return parseFloat(hours.toFixed(1));
  } else {
    // Other sites: round to integer
    return Math.round(hours);
  }
}

/**
 * Merge OT and SPL data for a single employee
 */
export interface MergedDailyRecord {
  date: Date;
  dayOfMonth: number;
  otHours: number | null;
  otStatus: string | null;
  msaAmount: number | null;
  mealsAmount: number | null;
  tlkAmount: number | null;
  allowanceStatus: string | null;
  transferredToSite: string | null;
  status: DailyStatus;
}

export function mergeOTAndSPLRecords(
  otRecords: Array<{
    date: Date | null;
    totalOT: number | null;
    status: string | null;
  }>,
  splRecords: Array<{
    date: Date | null;
    dayOfMonth: number;
    tlkAmount: number | null;
    msaAmount: number | null;
    mealsAmount: number | null;
    status: string | null;
  }>,
  month: number,
  year: number
): MergedDailyRecord[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const merged: MergedDailyRecord[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);

    // Find OT record for this day
    const otRecord = otRecords.find(
      (r) => r.date && r.date.getDate() === day
    );

    // Find SPL record for this day
    const splRecord = splRecords.find((r) => r.dayOfMonth === day);

    // Detect site transfer
    const transferredToSite = detectSiteTransfer(otRecord?.status);

    // Determine daily status
    const status = determineDailyStatus(
      otRecord?.totalOT || null,
      otRecord?.status || null,
      splRecord?.status || null,
      transferredToSite
    );

    merged.push({
      date,
      dayOfMonth: day,
      otHours: otRecord?.totalOT || null,
      otStatus: otRecord?.status || null,
      msaAmount: splRecord?.msaAmount || null,
      mealsAmount: splRecord?.mealsAmount || null,
      tlkAmount: splRecord?.tlkAmount || null,
      allowanceStatus: splRecord?.status || null,
      transferredToSite,
      status,
    });
  }

  return merged;
}
