/**
 * Summary Lemburan Excel Generator
 * Generates multi-sheet Excel output matching the template format
 */

import * as XLSX from "xlsx";

export interface SummaryEmployeeData {
  no: number;
  name: string;
  sn: string;
  loc: string;
  dailyValues: Array<string | number | null>; // 31 days
  total: number;
  remark: string;
}

export interface SummarySiteSheet {
  siteCode: string;
  siteName: string;
  month: number;
  year: number;
  
  // OT Summary table
  otSummary: SummaryEmployeeData[];
  
  // MSA Summary table
  msaSummary: SummaryEmployeeData[];
  
  // Meals Summary table (optional)
  mealsSummary?: SummaryEmployeeData[];
  
  // TLK Summary table (optional, VALE only)
  tlkSummary?: SummaryEmployeeData[];
  
  // Footer approval
  preparedBy?: string;
  acknowledgedBy?: string;
  approvedBy?: string;
  checkedBy?: string;
}

export interface SummaryOutputData {
  sheets: SummarySiteSheet[];
}

/**
 * Generate Summary Lemburan Excel workbook
 */
export function generateSummaryExcel(data: SummaryOutputData): Buffer {
  const workbook = XLSX.utils.book_new();

  for (const sheetData of data.sheets) {
    const worksheet = createSiteSheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetData.siteCode);
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

/**
 * Create single site sheet with multiple tables
 */
function createSiteSheet(data: SummarySiteSheet): XLSX.WorkSheet {
  const rows: any[][] = [];
  let currentRow = 0;

  // Add OT Summary table
  currentRow = addSummaryTable(
    rows,
    currentRow,
    "OVERTIME SUMMARY",
    data.month,
    data.year,
    data.siteName,
    data.otSummary
  );

  // Add spacing
  rows.push([]);
  currentRow++;

  // Add MSA Summary table
  currentRow = addSummaryTable(
    rows,
    currentRow,
    "MSA SUMMARY",
    data.month,
    data.year,
    data.siteName,
    data.msaSummary
  );

  // Add Meals Summary if present
  if (data.mealsSummary && data.mealsSummary.length > 0) {
    rows.push([]);
    currentRow++;
    currentRow = addSummaryTable(
      rows,
      currentRow,
      "MEALS SUMMARY",
      data.month,
      data.year,
      data.siteName,
      data.mealsSummary
    );
  }

  // Add TLK Summary if present
  if (data.tlkSummary && data.tlkSummary.length > 0) {
    rows.push([]);
    currentRow++;
    currentRow = addSummaryTable(
      rows,
      currentRow,
      "TUNJANGAN LOKASI KHUSUS SUMMARY",
      data.month,
      data.year,
      data.siteName,
      data.tlkSummary
    );
  }

  // Add footer
  rows.push([]);
  rows.push([]);
  const footerRow = [
    `Prepared: ${data.preparedBy || ""}`,
    "",
    `Acknowledged: ${data.acknowledgedBy || ""}`,
    "",
    `Approved: ${data.approvedBy || ""}`,
    "",
    `Checked: ${data.checkedBy || ""}`,
  ];
  rows.push(footerRow);

  // Convert to worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 5 },  // No
    { wch: 25 }, // Name
    { wch: 10 }, // SN
    { wch: 8 },  // LOC
    ...Array(31).fill({ wch: 6 }), // Days 1-31
    { wch: 10 }, // Total
    { wch: 15 }, // Remark
  ];

  return worksheet;
}

/**
 * Add a summary table (OT/MSA/Meals/TLK) to the rows array
 */
function addSummaryTable(
  rows: any[][],
  startRow: number,
  tableTitle: string,
  month: number,
  year: number,
  siteName: string,
  employees: SummaryEmployeeData[]
): number {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[month - 1];

  // Title row
  rows.push([`${tableTitle} ${monthName}  ${year}`]);

  // Header row 1: No | Name | SN | LOC | Date | ... | Total | Remark
  const header1 = ["No", "Name", "SN", "LOC", "Date", ...Array(30).fill(null), "Total", "Remark"];
  rows.push(header1);

  // Header row 2: day numbers 1-31
  const header2 = [null, null, null, null, ...Array(31).fill(null).map((_, i) => i + 1), null, null];
  rows.push(header2);

  // Site name row
  rows.push([siteName]);

  // Employee data rows
  for (const emp of employees) {
    const row = [
      emp.no,
      emp.name,
      emp.sn,
      emp.loc,
      ...emp.dailyValues,
      emp.total,
      emp.remark,
    ];
    rows.push(row);
  }

  return startRow + 4 + employees.length;
}

/**
 * Get month name in English
 */
export function getMonthName(month: number): string {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return monthNames[month - 1] || "";
}

/**
 * Format daily value for display in summary grid
 */
export function formatDailyValue(
  value: string | number | null,
  isAllowance: boolean
): string | number | null {
  if (value === null || value === undefined) {
    return null;
  }

  // If it\'s a status string, return as-is
  if (typeof value === "string") {
    return value;
  }

  // If it\'s a number
  if (typeof value === "number") {
    if (isAllowance) {
      // Allowance: format as integer (no decimals)
      return Math.round(value);
    } else {
      // OT: keep decimals if present
      return value;
    }
  }

  return null;
}

/**
 * Calculate total from daily values (sum numeric values only)
 */
export function calculateTotal(
  dailyValues: Array<string | number | null>
): number {
  return dailyValues.reduce<number>((sum, val) => {
    if (typeof val === "number") {
      return sum + val;
    }
    return sum;
  }, 0);
}
