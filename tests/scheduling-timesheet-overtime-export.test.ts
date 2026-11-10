import ExcelJS from 'exceljs'
import { buildTimesheetWorksheet } from '@/lib/timesheet/export-attendance-excel'

const shared = {
  siteName: 'Test Site',
  period: '2026-10',
  days: [1],
  weekdayLabel: () => 'Thu',
  rows: [{
    employee: { id: 7, name: 'Employee Test' },
    daysData: [{ day: 1, displayVal: 4, numericVal: 4, cellType: 'ot' as const }],
    overtimeTotal: 4,
    overtimeSplitSummary: { mandatoryHours: 4, splHours: 2, payrollEquivalentHours: 11.5 },
    payrollOvertimeSummary: {
      totalOvertimeCalculated: 11.5,
      mandatoryHours: 4,
      splHours: 2,
      workDaysPresent: 1,
      offDaysPresent: 0,
    },
  }],
}

function employeeValues(tab: 'ovt' | 'payroll_ovt') {
  const workbook = new ExcelJS.Workbook()
  const sheet = buildTimesheetWorksheet(workbook, { ...shared, tab })
  const row = sheet.getRows(1, sheet.rowCount)?.find((candidate) => candidate.getCell(2).value === 'Employee Test')
  return row?.values as (string | number | null)[]
}

test('overtime exports show separate wajib and SPL hours plus their payroll total', () => {
  const regular = employeeValues('ovt')
  expect(regular.slice(-3)).toEqual([4, 2, 11.5])

  const payroll = employeeValues('payroll_ovt')
  expect(payroll.slice(-5)).toEqual([4, 2, 11.5, 1, 0])
})

test('overtime export honors manual overtime override (Benni Day 18 11h override)', () => {
  const workbook = new ExcelJS.Workbook()
  const sheet = buildTimesheetWorksheet(workbook, {
    siteName: 'CK MIFA',
    period: '2026-10',
    days: [17, 18, 19],
    weekdayLabel: (p, d) => (d === 17 ? 'Sat' : d === 18 ? 'Sun' : 'Mon'),
    tab: 'ovt',
    rows: [{
      employee: { id: 62317, name: 'Benni Sianipar', manpower: 'Non Lokal', section: 'Service Operation MVC', department: 'Central Services' },
      daysData: [
        { day: 17, displayVal: 6, numericVal: 6, cellType: 'ot' },
        { day: 18, displayVal: 11, numericVal: 11, cellType: 'ot' },
        { day: 19, displayVal: 4, numericVal: 4, cellType: 'ot' },
      ],
      overtimeTotal: 21,
      overtimeSplitSummary: { mandatoryHours: 21, splHours: 0, payrollEquivalentHours: 35.5 },
    }],
  })

  const row = sheet.getRows(1, sheet.rowCount)?.find((candidate) => candidate.getCell(2).value === 'Benni Sianipar')
  expect(row).toBeDefined()
  // Col 1: No (1), Col 2: Name (Benni Sianipar), Col 3: Manpower, Col 4: Section, Col 5: Dept
  // Col 6: Tgl 17 (6), Col 7: Tgl 18 (11), Col 8: Tgl 19 (4)
  expect(row?.getCell(6).value).toBe(6)
  expect(row?.getCell(7).value).toBe(11)
  expect(row?.getCell(8).value).toBe(4)
})
