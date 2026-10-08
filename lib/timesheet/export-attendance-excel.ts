import ExcelJS from 'exceljs'

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface AttendanceExportEmployee {
  id: number
  name: string
  employeeSn?: string | null
  role?: string | null
  section?: string | null
  department?: string | null
}

export interface AttendanceExportCell {
  status: string
  clockIn?: string | null
  clockOut?: string | null
  overtimeMinutes?: number
  note?: string | null
}

export interface AttendanceExportRow {
  employee: AttendanceExportEmployee
  getAttendanceCell: (day: number) => AttendanceExportCell
  statusCounts?: {
    present?: number
    off?: number
    sick?: number
    leave?: number
    absent?: number
  }
  totalHours?: number
  totalOvertimeHours?: number
}

export interface ExportAttendanceExcelOptions {
  siteName: string
  period: string
  days: number[]
  mode: 'attendance' | 'checkin-checkout' | 'work-hours'
  rows: AttendanceExportRow[]
  weekdayLabel: (period: string, day: number) => string
  attendanceStatusLabel?: (status: any) => string
  holidaysByDay?: Map<number, { name?: string; localName?: string }>
}

// Standalone Input Format
export interface SimpleEmployeeAttendance {
  id?: number | string
  name: string
  employeeSn?: string
  section?: string
  department?: string
  role?: string
  dailyAttendance: Record<number, string | { status: string; clockIn?: string; clockOut?: string }>
  summary?: {
    totalMasuk?: number
    totalSakit?: number
    totalIzin?: number
    totalOff?: number
    totalHours?: number
    totalOvertime?: number
  }
}

export interface StandaloneAttendanceExportOptions {
  title?: string
  siteName?: string
  period?: string // "YYYY-MM"
  daysInMonth?: number
  employees: SimpleEmployeeAttendance[]
  fileName?: string
}

// ============================================================
// COLOR PALETTE FOR CELL STYLING (ARGB for ExcelJS)
// ============================================================

const PALETTE = {
  headerBg: 'FF003461',       // Deep Navy
  headerText: 'FFFFFFFF',     // Pure White
  subHeaderBg: 'FFF8FAFC',    // Slate 50
  subHeaderText: 'FF475569',  // Slate 600
  weekendBg: 'FFFEE2E2',      // Light Red/Rose
  weekendText: 'FF991B1B',    // Dark Rose
  
  // Section / Dept Groups
  sectionBg: 'FFE2E8F0',      // Slate 200
  sectionText: 'FF0F172A',    // Slate 900
  deptBg: 'FFF1F5F9',         // Slate 100
  deptText: 'FF334155',       // Slate 700

  // Status Colors (Matching UI Pills)
  presentBg: 'FFD1FAE5',      // Light Green (Emerald 100)
  presentText: 'FF065F46',    // Emerald 800
  sickBg: 'FFFCE7F3',         // Light Pink/Purple (Pink 100)
  sickText: 'FF831843',       // Pink 800
  leaveBg: 'FFE0E7FF',        // Light Indigo (Indigo 100)
  leaveText: 'FF3730A3',      // Indigo 800
  offBg: 'FFF1F5F9',          // Slate 100
  offText: 'FF64748B',        // Slate 500
  absentBg: 'FFFEE2E2',       // Light Red (Red 100)
  absentText: 'FF991B1B',     // Red 800

  // Summary Column Colors
  sumPresentBg: 'FFE6F4EA',
  sumSickBg: 'FFFDF2F8',
  sumLeaveBg: 'FFEFF6FF',
  sumOffBg: 'FFF8FAFC',
  sumHoursBg: 'FFF0FDF4',
  sumOtBg: 'FFFFFBEB',

  // Grid Borders
  borderLight: 'FFE2E8F0',
  borderMedium: 'FFCBD5E1',
  borderDark: 'FF94A3B8',
}

function getStatusStyle(rawCode: string): { bg: string; text: string; code: string } {
  const code = (rawCode || '').toUpperCase().trim()

  if (
    code === 'M' ||
    code === 'DS' ||
    code === 'NS' ||
    code === 'PRESENT' ||
    code === 'HADIR' ||
    code === 'H' ||
    code === 'D' ||
    code === 'N'
  ) {
    return { bg: PALETTE.presentBg, text: PALETTE.presentText, code: code === 'PRESENT' || code === 'HADIR' ? 'M' : code }
  }

  if (code === 'S' || code === 'SD' || code === 'SAKIT' || code === 'SICK') {
    return { bg: PALETTE.sickBg, text: PALETTE.sickText, code: code === 'SAKIT' || code === 'SICK' ? 'S' : code }
  }

  if (
    code === 'I' ||
    code === 'AL' ||
    code === 'LEAVE' ||
    code === 'CUTI' ||
    code === 'IZIN' ||
    code === 'C' ||
    code === 'DL'
  ) {
    return { bg: PALETTE.leaveBg, text: PALETTE.leaveText, code: code === 'CUTI' || code === 'LEAVE' ? 'C' : code === 'IZIN' ? 'I' : code }
  }

  if (code === 'OFF' || code === 'LIBUR' || code === 'O' || code === 'L') {
    return { bg: PALETTE.offBg, text: PALETTE.offText, code: 'OFF' }
  }

  if (code === 'A' || code === 'ALPA' || code === 'ABSENT') {
    return { bg: PALETTE.absentBg, text: PALETTE.absentText, code: 'A' }
  }

  return { bg: 'FFFFFFFF', text: 'FF334155', code: code || '-' }
}

function formatPeriodIndonesian(period: string): string {
  const [year, month] = period.split('-')
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const monthIdx = Number(month) - 1
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${monthNames[monthIdx]} ${year}`
  }
  return period
}

// ============================================================
// MAIN EXCELJS EXPORT FUNCTION
// ============================================================

export async function exportAttendanceGridToExcel({
  siteName,
  period,
  days,
  mode,
  rows,
  weekdayLabel,
  attendanceStatusLabel = (s) => s,
  holidaysByDay = new Map(),
}: ExportAttendanceExcelOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'HERO Timesheet System'
  workbook.created = new Date()

  const periodLabel = formatPeriodIndonesian(period)
  const modeTitle = {
    attendance: 'STATUS KEHADIRAN (ROSTER & ATTENDANCE)',
    'checkin-checkout': 'CHECK-IN & CHECK-OUT (JAM MASUK & PULANG)',
    'work-hours': 'DURASI JAM KERJA AKTIF',
  }[mode]

  const sheet = workbook.addWorksheet('Rekap Kehadiran', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: 'frozen', xSplit: 6, ySplit: 6 }],
  })

  // ── ROW 1-4: TITLE & BANNER ──
  const titleRow1 = sheet.addRow(['PT CHITRA PARATAMA — HERO SYSTEM'])
  titleRow1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF003461' } }

  const titleRow2 = sheet.addRow([`LAPORAN REKAPITULASI KEHADIRAN KARYAWAN (${modeTitle})`])
  titleRow2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } }

  const titleRow3 = sheet.addRow([
    `Site / Proyek: ${siteName.toUpperCase()} | Periode: ${periodLabel} (${period}) | Total Karyawan: ${rows.length} Orang`,
  ])
  titleRow3.font = { name: 'Calibri', size: 10, bold: false, color: { argb: 'FF475569' } }

  const titleRow4 = sheet.addRow([
    `Dicetak pada: ${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}`,
  ])
  titleRow4.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } }

  // Empty row for spacing
  sheet.addRow([])

  // ── TABLE HEADERS (ROWS 6 & 7) ──
  const topHeaderRow = [
    'No',
    'SN',
    'Nama Karyawan',
    'Section / Bagian',
    'Departemen',
    'Role / Jabatan',
  ]

  days.forEach((day) => {
    topHeaderRow.push(`Tgl ${day}`)
  })

  topHeaderRow.push('Hadir (Hari)', 'Off (Hari)', 'Izin/Cuti', 'Sakit', 'Total Jam', 'Overtime (Jam)')

  const header1 = sheet.addRow(topHeaderRow)
  header1.height = 24

  const subHeaderRow = ['', '', '', '', '', '']
  days.forEach((day) => {
    const wday = weekdayLabel(period, day)
    const isHoliday = holidaysByDay.has(day)
    subHeaderRow.push(isHoliday ? `${wday}*` : wday)
  })
  subHeaderRow.push('M / DS / NS', 'OFF', 'I / C / AL', 'S / SD', 'Jam Kerja', 'SPL Jam')

  const header2 = sheet.addRow(subHeaderRow)
  header2.height = 20

  const totalCols = 6 + days.length + 6

  // Merge metadata header cells vertically (Rows 6 & 7)
  for (let col = 1; col <= 6; col++) {
    sheet.mergeCells(6, col, 7, col)
  }

  // Style Header 1
  for (let col = 1; col <= totalCols; col++) {
    const cell1 = header1.getCell(col)
    cell1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: PALETTE.headerBg },
    }
    cell1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.headerText } }
    cell1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell1.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }

    const cell2 = header2.getCell(col)
    cell2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    }
    cell2.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } }
    cell2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell2.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF003461' } },
    }

    // Highlight Weekend / Holiday subheader columns
    if (col > 6 && col <= 6 + days.length) {
      const dayNum = days[col - 7]
      const wday = weekdayLabel(period, dayNum).toLowerCase()
      const isWeekend = wday.includes('sab') || wday.includes('min') || wday.includes('sat') || wday.includes('sun')
      const isHoliday = holidaysByDay.has(dayNum)

      if (isWeekend || isHoliday) {
        cell2.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: PALETTE.weekendBg },
        }
        cell2.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.weekendText } }
      }
    }
  }

  // ── GROUP & POPULATE DATA ROWS ──
  const grouped = new Map<string, Map<string, AttendanceExportRow[]>>()

  for (const row of rows) {
    const section = row.employee.section || row.employee.role || 'General'
    const dept = row.employee.department || 'Tanpa Departemen'
    if (!grouped.has(section)) grouped.set(section, new Map())
    const secMap = grouped.get(section)!
    if (!secMap.has(dept)) secMap.set(dept, [])
    secMap.get(dept)!.push(row)
  }

  let rowNumber = 1
  const dailyPresentTotals = new Array(days.length).fill(0)
  let grandTotalPresent = 0
  let grandTotalOff = 0
  let grandTotalLeave = 0
  let grandTotalSick = 0
  let grandTotalHours = 0
  let grandTotalOtHours = 0

  Array.from(grouped.entries()).forEach(([section, depts]) => {
    // Section Group Banner
    const sectionRow = sheet.addRow([`SECTION: ${section.toUpperCase()}`])
    sheet.mergeCells(sectionRow.number, 1, sectionRow.number, totalCols)
    sectionRow.height = 20
    const secCell = sectionRow.getCell(1)
    secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.sectionBg } }
    secCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.sectionText } }
    secCell.alignment = { vertical: 'middle', indent: 1 }

    Array.from(depts.entries()).forEach(([dept, deptRows]) => {
      // Dept Sub-group Banner
      const deptRow = sheet.addRow([`  DEPARTEMEN: ${dept.toUpperCase()} (${deptRows.length} Orang)`])
      sheet.mergeCells(deptRow.number, 1, deptRow.number, totalCols)
      deptRow.height = 18
      const dCell = deptRow.getCell(1)
      dCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.deptBg } }
      dCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.deptText } }
      dCell.alignment = { vertical: 'middle', indent: 2 }

      const sortedRows = deptRows.slice().sort((a, b) => {
        const snA = a.employee.employeeSn || ''
        const snB = b.employee.employeeSn || ''
        if (snA && snB) return snA.localeCompare(snB, undefined, { numeric: true })
        return a.employee.name.localeCompare(b.employee.name)
      })

      sortedRows.forEach((row) => {
        const emp = row.employee
        const rowData: any[] = [
          rowNumber++,
          emp.employeeSn || '-',
          emp.name,
          emp.section || '-',
          emp.department || '-',
          emp.role || '-',
        ]

        let empPresent = 0
        let empOff = 0
        let empLeave = 0
        let empSick = 0
        let empTotalHours = 0
        let empTotalOtMinutes = 0

        const cellStyles: { colIndex: number; bg: string; text: string }[] = []

        days.forEach((day, dayIndex) => {
          const cell = row.getAttendanceCell(day)
          const rawStatus = (cell.status || '').toUpperCase()
          const clockIn = cell.clockIn || ''
          const clockOut = cell.clockOut || ''
          const otMinutes = cell.overtimeMinutes || 0

          empTotalOtMinutes += otMinutes

          if (
            rawStatus === 'DS' ||
            rawStatus === 'NS' ||
            rawStatus === 'PRESENT' ||
            rawStatus === 'HADIR' ||
            rawStatus === 'M' ||
            rawStatus === 'D' ||
            rawStatus === 'N'
          ) {
            empPresent++
            dailyPresentTotals[dayIndex]++
          } else if (rawStatus === 'OFF' || rawStatus === 'LIBUR' || rawStatus === 'O') {
            empOff++
          } else if (
            rawStatus === 'AL' ||
            rawStatus === 'LEAVE' ||
            rawStatus === 'CUTI' ||
            rawStatus === 'I' ||
            rawStatus === 'IZIN' ||
            rawStatus === 'C' ||
            rawStatus === 'DL'
          ) {
            empLeave++
          } else if (rawStatus === 'S' || rawStatus === 'SICK' || rawStatus === 'SAKIT' || rawStatus === 'SD') {
            empSick++
          }

          // Calculate work hours
          let cellHours = 0
          if (clockIn && clockOut) {
            const [inH, inM] = clockIn.split(':').map(Number)
            const [outH, outM] = clockOut.split(':').map(Number)
            if (!isNaN(inH) && !isNaN(outH)) {
              let diff = outH * 60 + (outM || 0) - (inH * 60 + (inM || 0))
              if (diff < 0) diff += 1440
              cellHours = Math.round((diff / 60) * 10) / 10
            }
          } else if (rawStatus === 'DS' || rawStatus === 'NS' || rawStatus === 'PRESENT' || rawStatus === 'HADIR' || rawStatus === 'M') {
            cellHours = 8.0
          }
          empTotalHours += cellHours

          let displayVal = rawStatus || '-'
          if (mode === 'checkin-checkout') {
            displayVal = clockIn && clockOut ? `${clockIn}-${clockOut}` : clockIn || rawStatus || '-'
          } else if (mode === 'work-hours') {
            displayVal = cellHours > 0 ? `${cellHours.toFixed(1)}h` : rawStatus || '-'
          } else {
            const parsed = getStatusStyle(rawStatus)
            displayVal = parsed.code
          }

          rowData.push(displayVal)

          const style = getStatusStyle(rawStatus)
          cellStyles.push({
            colIndex: 6 + dayIndex + 1,
            bg: style.bg,
            text: style.text,
          })
        })

        const empOtHours = Math.round((empTotalOtMinutes / 60) * 10) / 10
        grandTotalPresent += empPresent
        grandTotalOff += empOff
        grandTotalLeave += empLeave
        grandTotalSick += empSick
        grandTotalHours += empTotalHours
        grandTotalOtHours += empOtHours

        rowData.push(empPresent, empOff, empLeave, empSick, empTotalHours.toFixed(1), empOtHours.toFixed(1))

        const addedRow = sheet.addRow(rowData)
        addedRow.height = 19

        // Style the row cells
        for (let c = 1; c <= totalCols; c++) {
          const currentCell = addedRow.getCell(c)
          currentCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF1E293B' } }
          currentCell.border = {
            top: { style: 'thin', color: { argb: PALETTE.borderLight } },
            left: { style: 'thin', color: { argb: PALETTE.borderLight } },
            right: { style: 'thin', color: { argb: PALETTE.borderLight } },
            bottom: { style: 'thin', color: { argb: PALETTE.borderLight } },
          }

          // Metadata alignment
          if (c === 1) {
            currentCell.alignment = { vertical: 'middle', horizontal: 'center' }
          } else if (c === 2) {
            currentCell.alignment = { vertical: 'middle', horizontal: 'center' }
          } else if (c === 3) {
            currentCell.alignment = { vertical: 'middle', horizontal: 'left' }
            currentCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } }
          } else if (c <= 6) {
            currentCell.alignment = { vertical: 'middle', horizontal: 'left' }
          } else if (c <= 6 + days.length) {
            currentCell.alignment = { vertical: 'middle', horizontal: 'center' }
          } else {
            currentCell.alignment = { vertical: 'middle', horizontal: 'center' }
            currentCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } }
          }
        }

        // Apply specific pill background colors
        cellStyles.forEach((st) => {
          const c = addedRow.getCell(st.colIndex)
          if (st.bg !== 'FFFFFFFF') {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.bg } }
            c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: st.text } }
          }
        })
      })
    })
  })

  // ── GRAND TOTAL SUMMARY ROW AT BOTTOM ──
  const summaryRowData: any[] = ['TOTAL', '', '', '', '', '']
  days.forEach((_, idx) => {
    summaryRowData.push(dailyPresentTotals[idx])
  })
  summaryRowData.push(
    grandTotalPresent,
    grandTotalOff,
    grandTotalLeave,
    grandTotalSick,
    grandTotalHours.toFixed(1),
    grandTotalOtHours.toFixed(1)
  )

  const summaryRow = sheet.addRow(summaryRowData)
  sheet.mergeCells(summaryRow.number, 1, summaryRow.number, 6)
  summaryRow.height = 24

  for (let c = 1; c <= totalCols; c++) {
    const cell = summaryRow.getCell(c)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'right' : 'center' }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF003461' } },
      bottom: { style: 'double', color: { argb: 'FF003461' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  }

  // ── AUTO-FIT COLUMN WIDTHS ──
  sheet.columns.forEach((col, idx) => {
    const colNumber = idx + 1
    if (colNumber === 1) {
      col.width = 6 // No
    } else if (colNumber === 2) {
      col.width = 13 // SN
    } else if (colNumber === 3) {
      col.width = 28 // Nama Karyawan
    } else if (colNumber === 4) {
      col.width = 20 // Section
    } else if (colNumber === 5) {
      col.width = 20 // Departemen
    } else if (colNumber === 6) {
      col.width = 18 // Role
    } else if (colNumber <= 6 + days.length) {
      col.width = mode === 'checkin-checkout' ? 14 : 7.5 // Uniform date columns
    } else {
      col.width = 13 // Summary columns
    }
  })

  // ── GENERATE BUFFER & TRIGGER BROWSER DOWNLOAD ──
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `Rekap_Attendance_Grid_${siteName.replace(/\s+/g, '_')}_${period}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}

// ============================================================
// STANDALONE EXCEL EXPORTER (FOR DIRECT COMPONENT CALLS)
// ============================================================

export async function exportAttendanceGridVisualXlsx({
  title = 'Laporan Kehadiran Karyawan',
  siteName = 'Semua Site',
  period = new Date().toISOString().slice(0, 7),
  daysInMonth = 31,
  employees,
  fileName,
}: StandaloneAttendanceExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'HERO Timesheet System'
  const sheet = workbook.addWorksheet('Attendance Grid', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }],
  })

  // Title block
  const t1 = sheet.addRow([title.toUpperCase()])
  t1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } }
  sheet.addRow([`Site: ${siteName} | Periode: ${period} | Total Karyawan: ${employees.length}`])
  sheet.addRow([])

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const headerRow = ['No', 'Nama Karyawan', ...days.map((d) => `Tgl ${d}`), 'Total Masuk', 'Total Sakit', 'Total Izin', 'Total Off']
  
  const hRow = sheet.addRow(headerRow)
  hRow.height = 24

  headerRow.forEach((_, idx) => {
    const c = hRow.getCell(idx + 1)
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } }
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.headerText } }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  employees.forEach((emp, index) => {
    let mCount = 0
    let sCount = 0
    let iCount = 0
    let oCount = 0

    const rowData: any[] = [index + 1, emp.name]

    days.forEach((d) => {
      const cellVal = emp.dailyAttendance[d]
      const rawStatus = typeof cellVal === 'string' ? cellVal : cellVal?.status || '-'
      const parsed = getStatusStyle(rawStatus)
      rowData.push(parsed.code)

      if (parsed.code === 'M' || parsed.code === 'DS' || parsed.code === 'NS') mCount++
      else if (parsed.code === 'S' || parsed.code === 'SD') sCount++
      else if (parsed.code === 'I' || parsed.code === 'C' || parsed.code === 'AL') iCount++
      else if (parsed.code === 'OFF') oCount++
    })

    const totM = emp.summary?.totalMasuk ?? mCount
    const totS = emp.summary?.totalSakit ?? sCount
    const totI = emp.summary?.totalIzin ?? iCount
    const totO = emp.summary?.totalOff ?? oCount

    rowData.push(totM, totS, totI, totO)

    const r = sheet.addRow(rowData)
    r.height = 19

    // Formatting
    days.forEach((d, dIdx) => {
      const cellVal = emp.dailyAttendance[d]
      const rawStatus = typeof cellVal === 'string' ? cellVal : cellVal?.status || '-'
      const style = getStatusStyle(rawStatus)
      const c = r.getCell(2 + dIdx + 1)
      if (style.bg !== 'FFFFFFFF') {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } }
        c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: style.text } }
      }
      c.alignment = { vertical: 'middle', horizontal: 'center' }
    })
  })

  // Auto-fit widths
  sheet.getColumn(1).width = 6
  sheet.getColumn(2).width = 28
  days.forEach((_, i) => {
    sheet.getColumn(3 + i).width = 7.5
  })
  sheet.getColumn(3 + days.length).width = 13
  sheet.getColumn(4 + days.length).width = 13
  sheet.getColumn(5 + days.length).width = 13
  sheet.getColumn(6 + days.length).width = 13

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || `Attendance_Grid_${period}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

// ============================================================
// ATTENDANCE EVENT LOGS EXPORTER (FOR /dashboard/attendance/records)
// ============================================================

export interface AttendanceLogExportItem {
  id: number
  employeeName: string
  employeeEmail?: string | null
  siteName?: string | null
  workLocation?: string | null
  eventTime: Date | string
  eventType: string
  operationalDetails?: string | string[] | null
  locationName?: string | null
  coordinates?: string | null
  hasPhoto?: boolean
}

export async function exportAttendanceLogsToExcel(
  logs: AttendanceLogExportItem[],
  siteName = 'Site'
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'HERO Timesheet System'
  const sheet = workbook.addWorksheet('Log Kehadiran', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5 }],
  })

  // Title Banner
  const t1 = sheet.addRow(['PT CHITRA PARATAMA — LOG KEHADIRAN HARIAN'])
  t1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } }
  sheet.addRow([`Site: ${siteName.toUpperCase()} | Total Log: ${logs.length} Data`])
  sheet.addRow([`Diekspor pada: ${new Date().toLocaleString('id-ID')}`])
  sheet.addRow([])

  const headers = [
    'No',
    'ID Log',
    'Nama Karyawan',
    'Email Karyawan',
    'Site',
    'Lokasi Kerja',
    'Waktu Event',
    'Tipe Event',
    'Detail Operasional',
    'Nama Lokasi',
    'Koordinat GPS',
    'Ada Foto',
  ]

  const hRow = sheet.addRow(headers)
  hRow.height = 24
  headers.forEach((_, idx) => {
    const c = hRow.getCell(idx + 1)
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } }
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.headerText } }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
    c.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF003461' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  })

  logs.forEach((log, index) => {
    const timeStr =
      typeof log.eventTime === 'string'
        ? log.eventTime
        : new Date(log.eventTime).toLocaleString('id-ID')

    const opDetails = Array.isArray(log.operationalDetails)
      ? log.operationalDetails.join(', ')
      : log.operationalDetails || '-'

    const r = sheet.addRow([
      index + 1,
      log.id,
      log.employeeName,
      log.employeeEmail || '-',
      log.siteName || siteName,
      log.workLocation || '-',
      timeStr,
      log.eventType,
      opDetails,
      log.locationName || '-',
      log.coordinates || '-',
      log.hasPhoto ? 'Ya' : 'Tidak',
    ])
    r.height = 19

    for (let col = 1; col <= headers.length; col++) {
      const c = r.getCell(col)
      c.font = { name: 'Calibri', size: 9, color: { argb: 'FF1E293B' } }
      c.border = {
        top: { style: 'thin', color: { argb: PALETTE.borderLight } },
        bottom: { style: 'thin', color: { argb: PALETTE.borderLight } },
        left: { style: 'thin', color: { argb: PALETTE.borderLight } },
        right: { style: 'thin', color: { argb: PALETTE.borderLight } },
      }
      if (col === 1 || col === 2 || col === 8 || col === 12) {
        c.alignment = { vertical: 'middle', horizontal: 'center' }
      } else {
        c.alignment = { vertical: 'middle', horizontal: 'left' }
      }
    }
  })

  sheet.columns = [
    { width: 6 },
    { width: 10 },
    { width: 25 },
    { width: 25 },
    { width: 18 },
    { width: 18 },
    { width: 22 },
    { width: 15 },
    { width: 25 },
    { width: 25 },
    { width: 25 },
    { width: 10 },
  ]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Log_Attendance_${siteName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

