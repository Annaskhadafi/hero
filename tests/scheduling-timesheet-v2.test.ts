import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'

import {
  applyScheduleV2Code,
  applyFieldBreakPlansToSchedule,
  getFieldBreakScheduleRanges,
  replaceFieldBreakPlansInSchedule,
  createEmptyScheduleV2,
  cycleScheduleV2Code,
  getScheduleV2DayCount,
  getScheduleV2Progress,
  isCompleteScheduleV2,
  mergeActiveSchedulePlans,
} from '@/lib/timesheet/schedule-v2'
import { mergeScheduleV2Import, parseScheduleV2Import } from '@/lib/timesheet/schedule-v2-import'
import { addDaysIso } from '@/lib/timesheet/field-break-generator'

describe('scheduling timesheet V2', () => {
  it.each([
    ['2024-02', 29],
    ['2025-02', 28],
    ['2026-04', 30],
    ['2026-07', 31],
  ])('creates an empty grid for %s', (period, dayCount) => {
    const rows = createEmptyScheduleV2([{ id: 10, section: 'Service Operation' }, { id: 11, section: 'Repair Retread' }], period)
    expect(getScheduleV2DayCount(period)).toBe(dayCount)
    expect(rows).toHaveLength(2)
    expect(rows[0].schedule).toEqual(Array(dayCount).fill(''))
  })

  it('cycles blank, OFF, DS, NS, FB, and blank', () => {
    expect(cycleScheduleV2Code('')).toBe('OFF')
    expect(cycleScheduleV2Code('OFF')).toBe('DS')
    expect(cycleScheduleV2Code('DS')).toBe('NS')
    expect(cycleScheduleV2Code('NS')).toBe('FB')
    expect(cycleScheduleV2Code('FB')).toBe('')
  })

  it('repeats OFF weekly from the selected date and allows custom override', () => {
    let rows = createEmptyScheduleV2([{ id: 10, section: 'Service Operation' }], '2026-07')
    rows = applyScheduleV2Code(rows, 10, 8, 'OFF')
    expect([8, 15, 22, 29].map((day) => rows[0].schedule[day - 1])).toEqual([
      'OFF',
      'OFF',
      'OFF',
      'OFF',
    ])
    rows = applyScheduleV2Code(rows, 10, 22, 'DS', false)
    expect(rows[0].schedule[21]).toBe('DS')
    rows = applyScheduleV2Code(rows, 10, 29, '', false)
    expect(rows[0].schedule[28]).toBe('')
  })

  it('fills field break dates when a new schedule is created', () => {
    const rows = applyFieldBreakPlansToSchedule(
      [{ employeeId: 10, schedule: Array(31).fill('DS') }],
      [{ employeeId: 10, fieldBreakDate: '2026-07-10', fieldBreakEndDate: '2026-07-23' }],
      '2026-07'
    )
    expect(rows[0].schedule.slice(9, 23)).toEqual(Array(14).fill('FB'))
    expect(rows[0].schedule[23]).toBe('DS')
  })

  it('keeps the Field Break plan and Schedule V2 grid in sync', () => {
    const rows = replaceFieldBreakPlansInSchedule(
      [{ employeeId: 10, schedule: Array(31).fill('DS') }],
      [{ employeeId: 10, fieldBreakDate: '2026-07-10', fieldBreakEndDate: '2026-07-23' }],
      '2026-07'
    )
    expect(getFieldBreakScheduleRanges(rows, '2026-07')).toEqual([
      { employeeId: 10, fieldBreakDate: '2026-07-10', fieldBreakEndDate: '2026-07-23' },
    ])
  })

  it('rejects stale backward Field Break dates and revalidates the Field Break page', () => {
    const fieldBreakWorkspace = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    const actions = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/admin-actions.ts'), 'utf8')
    expect(fieldBreakWorkspace).toContain('hasValidSavedNextFieldBreak')
    expect(fieldBreakWorkspace).toContain('next.fieldBreakDate < addDays(row.lastFieldBreakDate, 90)')
    expect(actions).toContain("revalidatePath('/dashboard/scheduling-timesheet/field-break')")
    expect(actions).toContain('Jeda Next Field Break minimal 90 hari dari Last Field Break.')
  })

  it('keeps a 90-day Field Break gap across time zones', () => {
    expect(addDaysIso('2026-07-31', 90)).toBe('2026-10-29')
  })

  it('uses horizontal Field Break filters with previous and next month controls', () => {
    const fieldBreakWorkspace = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    expect(fieldBreakWorkspace).toContain('aria-label="Bulan sebelumnya"')
    expect(fieldBreakWorkspace).toContain('aria-label="Bulan berikutnya"')
    expect(fieldBreakWorkspace).toContain('flex shrink-0 flex-nowrap gap-2')
  })

  it('refreshes Field Break after Schedule V2 updates in another tab', () => {
    const fieldBreakWorkspace = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    const scheduleWorkspace = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet/schedule-v2-workspace.tsx'),
      'utf8'
    )
    expect(fieldBreakWorkspace).toContain("new BroadcastChannel('hero-field-break-sync')")
    expect(fieldBreakWorkspace).toContain('window.setInterval(() => refreshIfCurrentPeriod(), 10000)')
    expect(scheduleWorkspace).toContain('announceFieldBreakSync(editorPlan.siteId, editorPlan.period)')
  })

  it('reports progress and validates complete activation', () => {
    let rows = createEmptyScheduleV2([{ id: 10, section: 'Service Operation' }], '2026-02')
    expect(getScheduleV2Progress(rows)).toEqual({ filled: 0, total: 28, complete: false })
    rows = [{ employeeId: 10, schedule: Array(28).fill('DS') }]
    expect(getScheduleV2Progress(rows).complete).toBe(true)
    expect(isCompleteScheduleV2(rows, [10], '2026-02')).toBe(true)
    expect(isCompleteScheduleV2(rows, [10, 11], '2026-02')).toBe(false)
  })

  it('allows incomplete rows to be saved and activated', () => {
    const actions = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/admin-actions.ts'), 'utf8')
    const workspace = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet/schedule-v2-workspace.tsx'),
      'utf8'
    )
    expect(actions).toContain('normalizeScheduleV2DraftRows')
    expect(actions).toContain('const draftRows = await normalizeScheduleV2DraftRows')
    expect(actions).toContain('section: existing?.section')
    expect(actions).toContain('positionOnSite: z.string().trim().max(120).optional()')
    expect(actions).not.toContain('Schedule belum lengkap. Isi semua cell sebelum aktivasi.')
    expect(workspace).toContain('title="Aktifkan roster Schedule V2. Draft boleh belum lengkap."')
    expect(workspace).toContain('disabled={pending}')
  })

  it('syncs grid profile site changes and supports adding users to a roster', () => {
    const actions = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/admin-actions.ts'), 'utf8')
    const workspace = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet/schedule-v2-workspace.tsx'),
      'utf8'
    )
    expect(actions).toContain('syncScheduleV2EmployeeAssignmentAction')
    expect(actions).toContain("timesheet.schedule_v2_employee_site_synced")
    expect(actions).toContain('workLocation: targetSite.location || targetSite.name')
    expect(actions).toContain('syncScheduleV2EmployeeSiteAcrossPlans')
    expect(actions).toContain("'/dashboard/scheduling-timesheet/schedule-v2'")
    expect(workspace).toContain('Pilih user untuk ditambahkan ke site')
    expect(workspace).toContain('addEmployeeToSite')
    expect(workspace).toContain('Lokasi Site')
    expect(workspace).toContain('User Management dan roster periode ini')
  })

  it('uses active V2 over V1 while draft V2 leaves V1 active', () => {
    const v1 = [{ siteId: 1, period: '2026-07', value: 'v1' }]
    const draft = [{ siteId: 1, period: '2026-07', status: 'draft', activeSchedule: [] }]
    expect(mergeActiveSchedulePlans(v1, draft, () => ({ ...v1[0], value: 'v2' }))).toEqual(v1)
    const active = [
      {
        siteId: 1,
        period: '2026-07',
        status: 'active',
        activeSchedule: [{ employeeId: 10, schedule: ['DS' as const] }],
      },
    ]
    expect(mergeActiveSchedulePlans(v1, active, () => ({ ...v1[0], value: 'v2' }))).toEqual([
      { siteId: 1, period: '2026-07', value: 'v2' },
    ])
  })

  it('detects and imports the supplied roster by normalized employee name', () => {
    const workbook = XLSX.readFile(path.join(process.cwd(), 'public/PPA BIB roster juli.xlsx'), {
      cellDates: true,
    })
    const result = parseScheduleV2Import(
      workbook.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
          header: 1,
          raw: true,
          defval: '',
          blankrows: true,
        }) as unknown[][],
      })),
      [
        { id: 10, name: 'FADILLAH SYAWAL' },
        { id: 11, name: 'MUHAMMAD FATIH FARHAN' },
        { id: 12, name: 'RIZKY AJI SETIAWAN' },
        { id: 13, name: 'MUHAMMAD IRPAN' },
        { id: 14, name: 'AHYAR RIFANI' },
        { id: 15, name: 'MUHAMMAD RIZKY RAMADAN' },
        { id: 16, name: 'MUHAMMAD ZAKARIA' },
        { id: 17, name: 'DEDY DARMAWAN' },
        { id: 18, name: 'SAHLUL ALAMSYAH' },
        { id: 19, name: 'AHMAD MAGFIRAH' },
        { id: 20, name: 'MOH DANIF PRATAMA' },
        { id: 21, name: 'FERRY SAPUTRA' },
      ],
      '2026-07'
    )

    expect(result.detectedPeriod).toBe('2026-05')
    expect(result.period).toBe('2026-07')
    expect(result.matchedNames).toHaveLength(12)
    expect(result.rows.find((row) => row.employeeId === 10)?.schedule.slice(0, 7)).toEqual([
      'DS',
      'DS',
      'DS',
      'DS',
      'DS',
      'OFF',
      'NS',
    ])
    expect(result.rows.find((row) => row.employeeId === 11)?.schedule.slice(0, 7)).toEqual([
      'FB',
      'FB',
      'FB',
      'FB',
      'FB',
      'DS',
      'NS',
    ])
  })

  it('supports flat Nama/Tanggal/Shift files without erasing existing defaults', () => {
    const result = parseScheduleV2Import(
      [
        {
          name: 'Data',
          rows: [
            ['Nama', 'Tanggal', 'Shift'],
            ['Ahmad Magfirah', 1, 'DG'],
            ['AHMAD-MAGFIRAH', 2, 'NG'],
          ],
        },
      ],
      [{ id: 20, name: 'AHMAD MAGFIRAH' }],
      '2026-07'
    )
    const merged = mergeScheduleV2Import(
      [{ employeeId: 20, schedule: Array(31).fill('OFF') }],
      result.rows
    )

    expect(merged[0].schedule.slice(0, 3)).toEqual(['DS', 'NS', 'OFF'])
  })

  it('keeps holidays as visual markers and has no auto-generation control', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet/schedule-v2-workspace.tsx'),
      'utf8'
    )
    expect(source).toContain('holidayByDay')
    expect(source).toContain('Holiday hanya penanda')
    expect(source).not.toContain('Generate Auto Scheduling')
  })

  it('wires site-scoped HR review through centralized approval', () => {
    const actions = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/admin-actions.ts'),
      'utf8'
    )
    const approval = fs.readFileSync(
      path.join(process.cwd(), 'lib/legacy-approval-engine.ts'),
      'utf8'
    )
    const workspace = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )

    expect(actions).toContain('return activeEmployees.map((employee) => employee.id)')
    expect(actions).toContain('assertSchedulingSiteScope')
    expect(actions).toContain('submitSchedulingPeriodForReviewAction')
    expect(actions).toContain("templateKey: 'timesheet-period-review'")
    expect(actions).toContain("scheduleStatus: 'submitted_to_hr'")
    expect(actions).toContain("issues.push('Payroll snapshot belum dibuat.')")
    expect(actions).toContain('exception payroll belum diselesaikan')
    expect(actions).toContain("params.templateKey === 'timesheet-period-review'")
    expect(approval).toContain('"timesheet-period-review"')
    expect(workspace).toContain('Submit ke HR')
    expect(workspace).toContain('Menunggu HR')
    const loader = fs.readFileSync(path.join(process.cwd(), 'lib/hero-admin.ts'), 'utf8')
    expect(loader).toContain('canSeeSchedulingSite')
    expect(loader).toContain('hasGlobalSchedulingScope')
  })

  it('shows payroll as an attendance-backed list before opening its detail', () => {
    const workspace = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )

    expect(workspace).toContain("mode === 'payroll' && !payrollWorkspaceOpen")
    expect(workspace).toContain('attendanceHistoryRows.map')
    expect(workspace).toContain('openPayrollWorkspace(plan.siteId, plan.period)')
    expect(workspace).toContain('Schedule V2 + Attendance')
    expect(workspace).toContain("payrollDetailTab === 'allowance'")
    expect(workspace).toContain("payrollDetailTab === 'overtime'")
    expect(workspace).toContain('excelInsteadOfCsv')
    expect(workspace).toContain('payrollHistorySiteRows.map')
    expect(workspace).toContain('data-table-filter-key="year"')
    expect(workspace).toContain('data-table-filter-key="month"')
    expect(workspace).toContain('data-table-detail-row="true"')
    expect(workspace).toContain("return 'Serviceman Crew'")
    expect(workspace).toContain("return 'Repairman Crew'")
    expect(workspace).toContain("return 'Office Crew'")
    expect(workspace).toContain('sections={groupedPayrollRows.map')
    expect(workspace).toContain('sections={groupedAttendanceOvertimeRows.map')
    expect(workspace).toContain("'Section',\n                  'Employee'")
    expect(workspace).toContain('payrollSectionLabel(row.rosterSection),\n                  row.employee.name')
    expect(workspace).toContain("const eligibleMsa = isWorkDay && !holiday && cell.status === 'present'")
    expect(workspace).toContain("siteConfig.mealsType === 'field-break' && isFieldBreakDay")
    expect(workspace).toContain('calculatePayrollOvertime')
    expect(workspace).not.toContain('Rooster Kerja 5 : 2')
  })
})
