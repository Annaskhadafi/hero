import ExcelJS from 'exceljs'
import {
  buildTimesheetWorksheet,
  exportAttendanceGridToExcel,
  type TimesheetEmployeeExportRow,
  type AttendanceExportRow,
} from '../lib/timesheet/export-attendance-excel'
import { buildCkCutoffDateRange, formatCkCutoffLabel } from '../lib/timesheet/cutoff-utils'

describe('Attendance Excel Export with CK Cut-off (16 - 15)', () => {
  const period = '2026-10'
  const dateHeaders = buildCkCutoffDateRange(period)

  test('buildTimesheetWorksheet generates 30 day columns for 16 Sept - 15 Oct 2026 with proper headers', () => {
    const workbook = new ExcelJS.Workbook()
    const mockRow: TimesheetEmployeeExportRow = {
      employee: {
        id: 101,
        name: 'Test Karyawan CK',
        employeeSn: '71001',
        role: 'Tyre Technician',
        section: 'Service Operation',
        department: 'Central Services',
        manpower: 'Lokal',
      },
      daysData: dateHeaders.map((dh) => ({
        day: dh.day,
        displayVal: dh.isWeekend ? 'OFF' : 'DS',
        status: dh.isWeekend ? 'off' : 'present',
        cellType: dh.isWeekend ? 'off' : 'present',
      })),
    }

    const sheet = buildTimesheetWorksheet(workbook, {
      tab: 'attendance',
      siteName: 'Balikpapan CK',
      period,
      days: dateHeaders.map((dh) => dh.day),
      dateHeaders,
      rows: [mockRow],
      weekdayLabel: () => 'Min',
      info: {
        cutoffLabel: formatCkCutoffLabel(period),
      },
    })

    expect(sheet).toBeDefined()

    // Title Row 2 includes CK Cut-off note
    const row2Text = sheet.getRow(2).getCell(1).value as string
    expect(row2Text).toContain('CUT-OFF TAGIHAN CK')

    // Title Row 3 includes cutoff label
    const row3Text = sheet.getRow(3).getCell(1).value as string
    expect(row3Text).toContain('Cut-off Tagihan CK (16 Sep - 15 Okt 2026)')

    // Row 6 (Top Header): Col 1 to 6 are base headers (No, Nama Karyawan, SN, Manpower, Section / Role, Departemen), Col 7 is first date column (16 Sep)
    const headerRow = sheet.getRow(6)
    expect(headerRow.getCell(1).value).toBe('No')
    expect(headerRow.getCell(2).value).toBe('Nama Karyawan')
    expect(headerRow.getCell(3).value).toBe('SN')
    expect(headerRow.getCell(4).value).toBe('Manpower')
    expect(headerRow.getCell(5).value).toBe('Section / Role')
    expect(headerRow.getCell(6).value).toBe('Departemen')
    expect(headerRow.getCell(7).value).toBe('16 Sep')
    expect(headerRow.getCell(21).value).toBe('30 Sep')
    expect(headerRow.getCell(22).value).toBe('01 Okt')
    expect(headerRow.getCell(36).value).toBe('15 Okt')

    // Verify employee data row has SN in column 3
    const foundEmpRow = sheet.getRows(1, sheet.rowCount)?.find((r) => r.getCell(2).value === 'Test Karyawan CK')
    expect(foundEmpRow).toBeDefined()
    expect(foundEmpRow?.getCell(1).value).toBe(1)
    expect(foundEmpRow?.getCell(2).value).toBe('Test Karyawan CK')
    expect(foundEmpRow?.getCell(3).value).toBe('71001')
    expect(foundEmpRow?.getCell(4).value).toBe('Lokal')
    expect(foundEmpRow?.getCell(5).value).toBe('Service Operation')
    expect(foundEmpRow?.getCell(6).value).toBe('Central Services')
  })

  test('exportAttendanceGridToExcel properly formats dateHeaders for checkin-checkout and attendance modes', async () => {
    const mockRow: AttendanceExportRow = {
      employee: {
        id: 202,
        name: 'Karyawan Operasional CK',
        employeeSn: '71002',
        role: 'Field Supervisor',
        section: 'Operation',
        department: 'Central Services',
      },
      getAttendanceCell: (day: number, dh?: any) => {
        const isWknd = dh?.isWeekend
        return {
          status: isWknd ? 'off' : 'present',
          clockIn: isWknd ? null : '07:00',
          clockOut: isWknd ? null : '16:00',
        }
      },
    }

    // Call with browser document mock
    const originalCreateObjectURL = global.URL.createObjectURL
    const originalRevokeObjectURL = global.URL.revokeObjectURL

    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = jest.fn()

    let createdDownload = ''
    let clicked = false
    const origCreateElement = document.createElement.bind(document)
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName)
      if (tagName === 'a') {
        el.click = () => {
          clicked = true
          createdDownload = el.download
        }
      }
      return el
    })

    try {
      await exportAttendanceGridToExcel({
        siteName: 'Site CK Tanjung Bara',
        period,
        days: dateHeaders.map((dh) => dh.day),
        dateHeaders,
        cutoffLabel: formatCkCutoffLabel(period),
        mode: 'attendance',
        rows: [mockRow],
        weekdayLabel: () => 'Min',
      })

      expect(createdDownload).toContain('CK_Cutoff_16-15')
      expect(createdDownload).toContain('Site_CK_Tanjung_Bara')
      expect(clicked).toBe(true)
    } finally {
      global.URL.createObjectURL = originalCreateObjectURL
      global.URL.revokeObjectURL = originalRevokeObjectURL
      jest.restoreAllMocks()
    }
  })
})
