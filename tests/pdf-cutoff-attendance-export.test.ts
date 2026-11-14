import {
  generateOvertimeRecordPdf,
  generateSummaryTablePdf,
  buildAttendanceDayData,
} from '@/lib/timesheet/generate-attendance-pdf'
import {
  buildCkCutoffDateRange,
  buildCustomDateRange,
  formatCkCutoffLabel,
  formatCustomDateRangeLabel,
} from '@/lib/timesheet/cutoff-utils'

describe('PDF Export with Custom Cut-Off & Date Range', () => {
  it('generates Overtime Record PDF with CK Cut-off (16 Sept - 15 Oct)', async () => {
    const period = '2026-10'
    const dateRange = buildCkCutoffDateRange(period)
    expect(dateRange.length).toBe(30) // Sept 16..30 (15) + Oct 1..15 (15) = 30 days

    const dayData = buildAttendanceDayData({
      period,
      dayCount: dateRange.length,
      dateItems: dateRange,
      getCell: (day, targetPeriod) => ({
        status: 'present',
        clockIn: '06.14',
        clockOut: '17.16',
        overtimeHours: 11,
      }),
      getScheduleCode: () => 'DS',
      holidays: [],
      getOvertime: () => ({
        totalHours: 11,
        intervals: [],
        totalMinutes: 660,
        autoMinutes: 660,
        splMinutes: 0,
        unauthorizedMinutes: 0,
        source: 'Legacy',
        splNumbers: ['SPL-001'],
        workingIntervals: [],
      }),
    })

    const cutoffLabel = formatCkCutoffLabel(period)
    const pdfBytes = await generateOvertimeRecordPdf({
      documentTitle: 'OVERTIME RECORD',
      period,
      periodLabelOverride: `October-2026 (${cutoffLabel})`,
      cutoffLabel,
      employeeName: 'Wahyudi',
      employeeSn: '51105',
      department: 'Central Services',
      section: 'Service Operation MVC',
      siteName: 'CK MHU',
      signatures: {
        preparedBy: 'Admin',
        pjoLeader: 'Site Leader',
        approvedBy: 'Project Manager',
        hrName: 'HC Admin',
      },
      days: dayData,
      isNonStaff: true,
      showTotalOvertime: true,
    })

    expect(pdfBytes).toBeDefined()
    expect(pdfBytes.byteLength).toBeGreaterThan(1000)
    // Check PDF magic bytes %PDF-
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('ascii')
    expect(header).toBe('%PDF-')
  })

  it('generates Summary Table PDF with custom date range (17 Sept - 16 Nov)', async () => {
    const customRange = buildCustomDateRange('2026-09-17', '2026-11-16')
    expect(customRange.length).toBe(61) // 14 days in Sept + 31 days in Oct + 16 days in Nov = 61 days

    const cutoffLabel = formatCustomDateRangeLabel('2026-09-17', '2026-11-16')

    const pdfBytes = await generateSummaryTablePdf({
      view: 'ot',
      period: '2026-10',
      periodLabelOverride: `Custom Period (${cutoffLabel})`,
      cutoffLabel,
      siteName: 'CK MHU',
      project: 'Project Standard',
      dayCount: customRange.length,
      customDateHeaders: customRange,
      rows: [
        {
          no: 1,
          name: 'Wahyudi (Driver)',
          sn: '51105',
          loc: 'CK MHU',
          department: 'Central Services',
          section: 'Service Operation MVC',
          dailyValues: customRange.map(() => '11'),
          total: '671',
          remark: 'NORMAL',
        },
      ],
      signatures: [
        { label: 'Dibuat Oleh', name: 'Admin Site', title: 'Site Admin' },
        { label: 'Diperiksa Oleh', name: 'Project Lead', title: 'Project Lead' },
        { label: 'Disetujui Oleh', name: 'Project Manager', title: 'PJO' },
      ],
      holidays: [],
    })

    expect(pdfBytes).toBeDefined()
    expect(pdfBytes.byteLength).toBeGreaterThan(1000)
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('ascii')
    expect(header).toBe('%PDF-')
  })
})
