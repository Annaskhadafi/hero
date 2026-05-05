/**
 * SPL (Form Tunjangan) Excel Parser
 * Parses multi-sheet SPL files from sites
 * Each sheet = 1 employee with daily allowances (MSA, Meals, TLK)
 */

import * as XLSX from "xlsx";

export interface SPLRecordRow {
  date: Date | null;
  day: string;
  dayOfMonth: number;
  tlkAmount: number | null;
  msaAmount: number | null;
  mealsAmount: number | null;
  status: string | null; // FB, SICK, IZIN, ALPA if no allowance
  remark: string;
}

export interface SPLRecordEmployee {
  name: string;
  sn: string;
  department: string;
  month: number;
  year: number;
  totalTLK: number;
  totalMSA: number;
  totalMeals: number;
  dailyRecords: SPLRecordRow[];
  sheetName: string;
}

export interface SPLRecordParseResult {
  employees: SPLRecordEmployee[];
  errors: Array<{
    sheet: string;
    row?: number;
    message: string;
  }>;
}

/**
 * Parse SPL Record Excel file
 */
export function parseSPLRecordExcel(buffer: Buffer): SPLRecordParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const employees: SPLRecordEmployee[] = [];
  const errors: Array<{ sheet: string; row?: number; message: string }> = [];

  for (const sheetName of workbook.SheetNames) {
    try {
      const sheet = workbook.Sheets[sheetName];
      const employee = parseSPLRecordSheet(sheet, sheetName);
      
      if (employee) {
        employees.push(employee);
      }
    } catch (error) {
      errors.push({
        sheet: sheetName,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { employees, errors };
}

/**
 * Parse single SPL Record sheet (1 employee)
 */
function parseSPLRecordSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string
): SPLRecordEmployee | null {
  const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: null });

  // Find header info
  let name = "";
  let sn = "";
  let department = "";
  let month = 0;
  let year = 0;

  // Search for metadata in header rows
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;

    // Look for "Name : [VALUE]"
    const nameMatch = row.find((cell: any) =>
      typeof cell === "string" && cell.toLowerCase().includes("name")
    );
    if (nameMatch) {
      const nameIdx = row.indexOf(nameMatch);
      if (nameIdx >= 0 && row[nameIdx + 1]) {
        name = String(row[nameIdx + 1]).trim();
      }
    }

    // Look for "SN : [VALUE]"
    const snMatch = row.find((cell: any) =>
      typeof cell === "string" && cell.toLowerCase().includes("sn")
    );
    if (snMatch) {
      const snIdx = row.indexOf(snMatch);
      if (snIdx >= 0 && row[snIdx + 1]) {
        sn = String(row[snIdx + 1]).trim();
      }
    }

    // Look for "Department : [VALUE]"
    const deptMatch = row.find((cell: any) =>
      typeof cell === "string" && cell.toLowerCase().includes("department")
    );
    if (deptMatch) {
      const deptIdx = row.indexOf(deptMatch);
      if (deptIdx >= 0 && row[deptIdx + 1]) {
        department = String(row[deptIdx + 1]).trim();
      }
    }

    // Look for "MONTH : [VALUE]"
    const monthMatch = row.find((cell: any) =>
      typeof cell === "string" && cell.toLowerCase().includes("month")
    );
    if (monthMatch) {
      const monthIdx = row.indexOf(monthMatch);
      if (monthIdx >= 0 && row[monthIdx + 1]) {
        const monthValue = row[monthIdx + 1];
        if (monthValue instanceof Date) {
          month = monthValue.getMonth() + 1;
          year = monthValue.getFullYear();
        } else if (typeof monthValue === "string") {
          const parsed = parseMonthYear(monthValue);
          if (parsed) {
            month = parsed.month;
            year = parsed.year;
          }
        }
      }
    }
  }

  // If no SN found, skip this sheet
  if (!sn) {
    return null;
  }

  // Find data table header (look for "Date" or "TLK" or "MSA" columns)
  let dataStartRow = -1;
  let tlkColIdx = -1;
  let msaColIdx = -1;
  let mealsColIdx = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toLowerCase();
      if (cell.includes("tlk") || cell.includes("tunjangan lokasi")) {
        tlkColIdx = j;
      }
      if (cell.includes("msa") || cell.includes("mine site")) {
        msaColIdx = j;
      }
      if (cell.includes("meal") || cell.includes("makan")) {
        mealsColIdx = j;
      }
    }

    const hasDate = row.some(
      (cell: any) => typeof cell === "string" && cell.toLowerCase().includes("date")
    );

    if (hasDate && (tlkColIdx >= 0 || msaColIdx >= 0 || mealsColIdx >= 0)) {
      dataStartRow = i + 1;
      break;
    }
  }

  if (dataStartRow === -1) {
    throw new Error("Could not find data table header");
  }

  // Parse daily records
  const dailyRecords: SPLRecordRow[] = [];
  let totalTLK = 0;
  let totalMSA = 0;
  let totalMeals = 0;

  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Stop if we hit footer or TOTAL row
    const firstCell = row[0];
    if (
      !firstCell ||
      (typeof firstCell === "string" &&
        (firstCell.toLowerCase().includes("prepared") ||
          firstCell.toLowerCase().includes("total")))
    ) {
      // Try to extract totals from this row
      if (typeof firstCell === "string" && firstCell.toLowerCase().includes("total")) {
        if (tlkColIdx >= 0 && typeof row[tlkColIdx] === "number") {
          totalTLK = row[tlkColIdx];
        }
        if (msaColIdx >= 0 && typeof row[msaColIdx] === "number") {
          totalMSA = row[msaColIdx];
        }
        if (mealsColIdx >= 0 && typeof row[mealsColIdx] === "number") {
          totalMeals = row[mealsColIdx];
        }
      }
      break;
    }

    const record = parseSPLRecordRow(row, tlkColIdx, msaColIdx, mealsColIdx);
    if (record) {
      dailyRecords.push(record);
      if (record.tlkAmount) totalTLK += record.tlkAmount;
      if (record.msaAmount) totalMSA += record.msaAmount;
      if (record.mealsAmount) totalMeals += record.mealsAmount;
    }
  }

  return {
    name,
    sn,
    department,
    month,
    year,
    totalTLK,
    totalMSA,
    totalMeals,
    dailyRecords,
    sheetName,
  };
}

/**
 * Parse single SPL record row
 */
function parseSPLRecordRow(
  row: any[],
  tlkColIdx: number,
  msaColIdx: number,
  mealsColIdx: number
): SPLRecordRow | null {
  // Expected columns (approximate):
  // [0] Date | [1] Day | [2+] TLK/MSA/Meals columns

  const date = row[0] instanceof Date ? row[0] : null;
  const day = String(row[1] || "").trim();
  const dayOfMonth = date ? date.getDate() : 0;

  // Check if this is a status day (FB, SICK, etc)
  const statusKeywords = ["FB", "SICK", "IZIN", "ALPA"];
  let status: string | null = null;

  // Check TLK column for status
  if (tlkColIdx >= 0) {
    const tlkCell = row[tlkColIdx];
    if (typeof tlkCell === "string") {
      const tlkUpper = tlkCell.toUpperCase();
      if (statusKeywords.some((kw) => tlkUpper.includes(kw))) {
        status = tlkUpper;
      }
    }
  }

  // Check MSA column for status
  if (!status && msaColIdx >= 0) {
    const msaCell = row[msaColIdx];
    if (typeof msaCell === "string") {
      const msaUpper = msaCell.toUpperCase();
      if (statusKeywords.some((kw) => msaUpper.includes(kw))) {
        status = msaUpper;
      }
    }
  }

  // Extract amounts
  const tlkAmount =
    tlkColIdx >= 0 && typeof row[tlkColIdx] === "number" ? row[tlkColIdx] : null;
  const msaAmount =
    msaColIdx >= 0 && typeof row[msaColIdx] === "number" ? row[msaColIdx] : null;
  const mealsAmount =
    mealsColIdx >= 0 && typeof row[mealsColIdx] === "number" ? row[mealsColIdx] : null;

  // If no date and no amounts and no status, skip
  if (!date && !tlkAmount && !msaAmount && !mealsAmount && !status) {
    return null;
  }

  return {
    date,
    day,
    dayOfMonth,
    tlkAmount,
    msaAmount,
    mealsAmount,
    status,
    remark: String(row[row.length - 1] || "").trim(),
  };
}

/**
 * Parse month/year from string like "April 2026" or "Maret 2026"
 */
function parseMonthYear(str: string): { month: number; year: number } | null {
  const monthNames: Record<string, number> = {
    january: 1, januari: 1, jan: 1,
    february: 2, februari: 2, feb: 2,
    march: 3, maret: 3, mar: 3,
    april: 4, apr: 4,
    may: 5, mei: 5,
    june: 6, juni: 6, jun: 6,
    july: 7, juli: 7, jul: 7,
    august: 8, agustus: 8, aug: 8, agu: 8,
    september: 9, sep: 9,
    october: 10, oktober: 10, oct: 10, okt: 10,
    november: 11, nov: 11,
    december: 12, desember: 12, dec: 12, des: 12,
  };

  const parts = str.toLowerCase().split(/\s+/);
  let month = 0;
  let year = 0;

  for (const part of parts) {
    if (monthNames[part]) {
      month = monthNames[part];
    }
    const yearMatch = part.match(/\d{4}/);
    if (yearMatch) {
      year = parseInt(yearMatch[0], 10);
    }
  }

  return month > 0 && year > 0 ? { month, year } : null;
}
