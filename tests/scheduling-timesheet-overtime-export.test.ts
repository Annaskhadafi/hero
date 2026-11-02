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
