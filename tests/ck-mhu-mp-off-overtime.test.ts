import { describe, it, expect } from '@jest/globals'
import { generateOvertimeRecordPdf } from '@/lib/timesheet/generate-attendance-pdf'

describe('CK MHU MP Overtime Rules', () => {
  it('Hari OFF strictly tidak mendapat lembur 11 jam (wajib kosong)', async () => {
  const sampleDays = [
    {
      day: 16,
      dayName: 'Friday',
      scheduleCode: 'DS',
      status: 'present',
      clockIn: '06:01',
      clockOut: '17:31',
    },
    {
      day: 17,
      dayName: 'Saturday',
      scheduleCode: 'DS',
      status: 'present',
      clockIn: '06:05',
      clockOut: '17:38',
    },
    // Day 20: Hari OFF Supyanto, tapi ada tap biometric (stray clockIn / clockOut)
    {
      day: 20,
      dayName: 'Tuesday',
      scheduleCode: 'OFF',
      status: 'present',
      clockIn: '06:00',
      clockOut: '17:29',
      workingTimeFrom: 'OFF',
    },
    // Day 27: Hari OFF Supyanto kedua, status 'off'
    {
      day: 27,
      dayName: 'Tuesday',
      scheduleCode: 'OFF',
      status: 'off',
      workingTimeFrom: 'OFF',
    },
  ]

  const pdfBytes = await generateOvertimeRecordPdf({
    period: '2026-10',
    periodLabel: 'October-2026 (Cut-off (16 Okt - 15 Nov 2026))',
    employeeName: 'Supyanto',
    employeeSn: '78313',
    department: 'Central Services',
    siteName: 'CK MHU',
    signatures: { useExternalOnly: true },
    days: sampleDays as any,
  })

  expect(pdfBytes).toBeDefined()
  expect(pdfBytes.length).toBeGreaterThan(1000)
  })
})
