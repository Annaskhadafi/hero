/**
 * OT Record Excel Parser
 * Parses multi-sheet OT Record files from sites
 * Each sheet = 1 employee
 */

import * as XLSX from "xlsx";

export interface OTRecordRow {
  date: Date | null;
  day: string;
  shiftFrom: string;
  shiftTo: string;
  otFrom: string;
  otTo: string;
  totalOT: number | null;
  status: string | null; // OFF, FB, SICK, IZIN, ALPA, etc
  remark: string;
}

export interface OTRecordEmployee {
  name: string;
  sn: string;
  department: string;
  month: number;
  year: number;
  totalOTHours: number;
  dailyRecords: OTRecordRow[];
  sheetName: string;
}

export interface OTRecordParseResult {
  employees: OTRecordEmployee[];
  errors: Array<{
    sheet: string;
    row?: number;
    message: string;
  }>;
}

/**
 * Parse OT Record Excel file
 */
export function parseOTRecordExcel(buffer: Buffer): OTRecordParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const employees: OTRecordEmployee[] = [];
  const errors: Array<{ sheet: string; row?: number; message: string }> = [];

  for (const sheetName of workbook.SheetNames) {
    try {
      const sheet = workbook.Sheets[sheetName];
      const employee = parseOTRecordSheet(sheet, sheetName);
      
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
 * Parse single OT Record sheet (1 employee)
 */
function parseOTRecordSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string
): OTRecordEmployee | null {
  const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: null });

  // Find header info (usually in first 10 rows)
  let name = "";
  let sn = "";
  let department = "";
  let month = 0;
  let year = 0;
  let totalOTHours = 0;

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
          // Try to parse "April 2026" or similar
          const parsed = parseMonthYear(monthValue);
          if (parsed) {
            month = parsed.month;
            year = parsed.year;
          }
        }
      }
    }

    // Look for "Over time rate/hours : [VALUE]"
    const otTotalMatch = row.find((cell: any) =>
      typeof cell === "string" &&
      (cell.toLowerCase().includes("over time rate") ||
        cell.toLowerCase().includes("overtime rate"))
    );
    if (otTotalMatch) {
      const otIdx = row.indexOf(otTotalMatch);
      if (otIdx >= 0 && row[otIdx + 1]) {
        totalOTHours = parseFloat(String(row[otIdx + 1])) || 0;
      }
    }
  }

  // If no SN found, skip this sheet (might be summary or empty)
  if (!sn) {
    return null;
  }

  // Find data table header (look for "Date" column)
  let dataStartRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const hasDate = row.some(
      (cell: any) => typeof cell === "string" && cell.toLowerCase().includes("date")
    );
    const hasDay = row.some(
      (cell: any) => typeof cell === "string" && cell.toLowerCase().includes("day")
    );

    if (hasDate && hasDay) {
      dataStartRow = i + 1;
      break;
    }
  }

  if (dataStartRow === -1) {
    throw new Error("Could not find data table header");
  }

  // Parse daily records
  const dailyRecords: OTRecordRow[] = [];

  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Stop if we hit footer or empty rows
    const firstCell = row[0];
    if (
      !firstCell ||
      (typeof firstCell === "string" &&
        (firstCell.toLowerCase().includes("prepared") ||
          firstCell.toLowerCase().includes("total")))
    ) {
      break;
    }

    const record = parseOTRecordRow(row);
    if (record) {
      dailyRecords.push(record);
    }
  }

  return {
    name,
    sn,
    department,
    month,
    year,
    totalOTHours,
    dailyRecords,
    sheetName,
  };
}

/**
 * Parse single OT record row
 */
function parseOTRecordRow(row: any[]): OTRecordRow | null {
  // Expected columns (approximate):
  // [0] Date | [1] Day | [2-3] Shift | [4-5] OT | [6] Total OT | [7+] Multipliers | [last] Remarks

  const date = row[0] instanceof Date ? row[0] : null;
  const day = String(row[1] || "").trim();

  // Check if this is a status day (OFF, FB, SICK, etc)
  const statusKeywords = ["OFF", "FB", "SICK", "IZIN", "ALPA", "CUTI", "AL", "LIBUR", "MCU", "STANDBY", "TRAINING"];
  const dayUpper = day.toUpperCase();
  const isStatusDay = statusKeywords.some((kw) => dayUpper.includes(kw));

  let totalOT: number | null = null;
  let status: string | null = null;

  if (isStatusDay) {
    status = dayUpper;
  } else {
    // Try to find Total OT column (usually around index 6)
    for (let i = 4; i < Math.min(10, row.length); i++) {
      const cell = row[i];
      if (typeof cell === "number" && cell > 0) {
        totalOT = cell;
        break;
      }
    }
  }

  // If no date and no status, skip
  if (!date && !status) {
    return null;
  }

  return {
    date,
    day,
    shiftFrom: String(row[2] || "").trim(),
    shiftTo: String(row[3] || "").trim(),
    otFrom: String(row[4] || "").trim(),
    otTo: String(row[5] || "").trim(),
    totalOT,
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
