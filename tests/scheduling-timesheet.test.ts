import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import { buildAttendanceImportPreview } from '@/lib/timesheet/attendance-import'
import { parseAttendanceWorkbook } from '@/lib/timesheet/attendance-template-parser'
import {
  applyHolidayPolicy,
  canSwapOff,
  classifyOvertimeDay,
  swapScheduleCodes,
  type ScheduleCode,
} from '@/lib/timesheet-scheduling'
import { normalizeApiHariLiburResponse, normalizeOpenHolidayResponse } from '@/lib/openholiday'

describe('scheduling timesheet workflow', () => {
  it('does not use localStorage scheduling persistence', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    expect(source).not.toMatch(/localStorage\.(getItem|setItem|removeItem)/)
    expect(source).not.toContain('hero-scheduling')
  })

  it('validates attendance import matching duplicates unmatched cross-site and conflicts', () => {
    const preview = buildAttendanceImportPreview({
      siteId: 1,
      employees: [
        { id: 10, name: 'Ani Wijaya', employeeSn: 'SN-10', siteId: 1 },
        { id: 11, name: 'Budi Santoso', employeeSn: '', siteId: 2 },
      ],
      fixedSchedule: [{ employeeId: 10, schedule: ['OFF', 'DS'] }],
      rows: [
        {
          employeeSn: 'SN-10',
          employeeName: 'Wrong Name',
          siteName: '',
          day: 1,
          status: 'present',
          clockIn: '08:00',
          clockOut: '17:00',
          note: '',
        },
        {
          employeeSn: '',
          employeeName: 'Ani Wijaya',
          siteName: '',
          day: 1,
          status: 'present',
          clockIn: '08:00',
          clockOut: '17:00',
          note: '',
        },
        {
          employeeSn: '',
          employeeName: 'Missing',
          siteName: '',
          day: 2,
          status: 'present',
          clockIn: '08:00',
          clockOut: '17:00',
          note: '',
        },
        {
          employeeSn: '',
          employeeName: 'Budi Santoso',
          siteName: '',
          day: 2,
          status: 'present',
          clockIn: '08:00',
          clockOut: '17:00',
          note: '',
        },
      ],
    })

    expect(preview.previewRows[0].employeeId).toBe(10)
    expect(preview.previewRows[1].duplicate).toBe(true)
    expect(preview.previewRows[2].unmatched).toBe(true)
    expect(preview.previewRows[3].crossSite).toBe(true)
    expect(preview.conflicts).toHaveLength(2)
  })

  it('parses flexible row attendance templates', () => {
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Emp No.', 'No. ID', 'Nama', 'Tanggal', 'Scan Masuk', 'Scan Pulang', 'Normal'],
      ['54', '51097', 'ARI ANGGARA', '7/1/2024', '08:01', '17:10', '1'],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')

    const result = parseAttendanceWorkbook({
      workbook,
      period: '2024-07',
      employees: [{ id: 1, name: 'ARI ANGGARA', employeeSn: '51097' }],
    })

    expect(result.detection.kind).toBe('row-log')
    expect(result.rows[0]).toMatchObject({
      employeeSn: '51097',
      employeeName: 'ARI ANGGARA',
      day: 1,
      clockIn: '08:01',
      clockOut: '17:10',
    })
  })

  it('parses the generated HERO attendance template with D, Masuk, and Pulang columns', () => {
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      [
        'Nama',
        'SN',
        'Jabatan',
        'Site',
        'D1',
        'Masuk 1',
        'Pulang 1',
        'D2',
        'Masuk 2',
        'Pulang 2',
        'D3',
        'Masuk 3',
        'Pulang 3',
        'D4',
        'Masuk 4',
        'Pulang 4',
        'D5',
        'Masuk 5',
        'Pulang 5',
      ],
      [
        'Ari Anggara',
        '51097',
        'Serviceman',
        'CK MHU',
        'Masuk',
        '06:00',
        '18:00',
        'OFF',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'Attendance Real')

    const result = parseAttendanceWorkbook({
      workbook,
      period: '2026-07',
      employees: [{ id: 1, name: 'Ari Anggara', employeeSn: '51097' }],
    })

    expect(result.detection.kind).toBe('hero-template')
    expect(result.rows).toEqual([
      expect.objectContaining({
        employeeSn: '51097',
        employeeName: 'Ari Anggara',
        siteName: 'CK MHU',
        day: 1,
        status: 'present',
        clockIn: '06:00',
        clockOut: '18:00',
      }),
      expect.objectContaining({
        day: 2,
        status: 'empty',
        note: 'OFF',
      }),
    ])
  })

  it('parses fingerprint detail templates with compressed scan times', () => {
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Lap. Detail Absensi', '', '', '', ''],
      ['', '', '', '', ''],
      ['Waktu Absen', '', '2024-07-01 ~ 2024-07-31'],
      ['1', '2', '3', '4', '5'],
      ['ID:', '', '51097', '', '', '', '', '', 'Nama:', '', 'ARI ANGGARA'],
      ['07:3817:33', '', '08:0118:05', '', ''],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'Lap. Log Absen')

    const result = parseAttendanceWorkbook({
      workbook,
      period: '2024-07',
      employees: [{ id: 1, name: 'Ari Anggara', employeeSn: '51097' }],
    })

    expect(result.detection.kind).toBe('fingerprint-detail')
    expect(result.rows).toEqual([
      expect.objectContaining({
        employeeSn: '51097',
        employeeName: 'Ari Anggara',
        day: 1,
        clockIn: '07:38',
        clockOut: '17:33',
      }),
      expect.objectContaining({
        employeeSn: '51097',
        employeeName: 'Ari Anggara',
        day: 3,
        clockIn: '08:01',
        clockOut: '18:05',
      }),
    ])
  })

  it('parses real attendance samples from attandance site', () => {
    const samples = [
      { file: 'absensi april 26.xlsx', period: '2026-04', kind: 'matrix' },
      { file: 'Absensi Finger Juli 2024.xls', period: '2024-07', kind: 'fingerprint-detail' },
      { file: 'Absensi Wajah Juli 2024.xls', period: '2024-07', kind: 'row-log' },
    ] as const

    for (const sample of samples) {
      const workbook = XLSX.readFile(path.join(process.cwd(), 'attandance site', sample.file))
      const result = parseAttendanceWorkbook({
        workbook,
        period: sample.period,
        employees: [
          { id: 1, name: 'ARI ANGGARA', employeeSn: '51097' },
          { id: 2, name: 'ASMUNI', employeeSn: '01' },
          { id: 3, name: 'Adila Tri Arizona', employeeSn: '60848' },
        ],
      })

      expect(result.detection.kind).toBe(sample.kind)
      expect(result.rows.length).toBeGreaterThan(0)
    }
  })

  it('uses No. ID before Emp No. and scan columns for face attendance identity', () => {
    const workbook = XLSX.readFile(
      path.join(process.cwd(), 'attandance site', 'Absensi Wajah Juli 2024.xls')
    )
    const result = parseAttendanceWorkbook({
      workbook,
      period: '2024-07',
      employees: [{ id: 1, name: 'ASMUNI', employeeSn: '01' }],
    })

    expect(result.rows[0]).toMatchObject({
      employeeSn: '01',
      employeeName: 'ASMUNI',
      day: 1,
      status: 'absent',
      clockIn: '',
      clockOut: '',
    })
    expect(result.rows[0].employeeSn).not.toBe('54')
    expect(result.rows[0].clockIn).not.toBe('08:00')
    expect(result.rows[0].clockOut).not.toBe('17:00')
  })

  it('parses repeated fingerprint scans using first and last time', () => {
    const workbook = XLSX.readFile(
      path.join(process.cwd(), 'attandance site', 'Absensi Finger Juli 2024.xls')
    )
    const result = parseAttendanceWorkbook({
      workbook,
      period: '2024-07',
      employees: [{ id: 1, name: 'Khofifah Indar P', employeeSn: '72164' }],
    })

    expect(
      result.rows.some((row) => row.clockIn && row.clockOut && row.clockIn !== row.clockOut)
    ).toBe(true)
  })

  it('matches attendance import with saved aliases', () => {
    const preview = buildAttendanceImportPreview({
      siteId: 1,
      employees: [{ id: 10, name: 'Adila Tri Arizona', employeeSn: '60848', siteId: 1 }],
      aliases: [{ employeeId: 10, aliasName: 'Adila Site B', aliasSn: 'A-01' }],
      fixedSchedule: [],
      rows: [
        {
          employeeSn: 'A-01',
          employeeName: '',
          siteName: '',
          day: 1,
          status: 'present',
          clockIn: '08:00',
          clockOut: '17:00',
          note: '',
        },
      ],
    })

    expect(preview.previewRows[0]).toMatchObject({ employeeId: 10, matchMethod: 'alias' })
    expect(preview.validationSummary.matched).toBe(1)
  })

  it('flags attendance import scan validation issues', () => {
    const preview = buildAttendanceImportPreview({
      siteId: 1,
      employees: [{ id: 10, name: 'Adila Tri Arizona', employeeSn: '60848', siteId: 1 }],
      fixedSchedule: [],
      rows: [
        {
          employeeSn: '60848',
          employeeName: '',
          siteName: '',
          day: 1,
          status: 'present',
          clockIn: '',
          clockOut: '17:00',
          note: '',
        },
        {
          employeeSn: '60848',
          employeeName: '',
          siteName: '',
          day: 2,
          status: 'present',
          clockIn: '09:00',
          clockOut: '10:00',
          note: '',
        },
      ],
    })

    expect(preview.previewRows[0].validationFlags).toContain('missing-clock-in')
    expect(preview.previewRows[1].validationFlags).toContain('late')
    expect(preview.validationSummary.missingClockIn).toBe(1)
  })

  it('matches attendance import with Fuse when names are slightly different', () => {
    const preview = buildAttendanceImportPreview({
      siteId: 1,
      employees: [{ id: 10, name: 'Adila Tri Arizona', employeeSn: '60848', siteId: 1 }],
      fixedSchedule: [],
      rows: [
        {
          employeeSn: '',
          employeeName: 'Adila Tri Arizon',
          siteName: '',
          day: 1,
          status: 'present',
          clockIn: '08:00',
          clockOut: '17:00',
          note: '',
        },
      ],
    })

    expect(preview.previewRows[0]).toMatchObject({ employeeId: 10, matchMethod: 'fuse' })
    expect(preview.unmatchedCount).toBe(0)
  })

  it('matches attendance import SN from User Management across casing and separators', () => {
    const preview = buildAttendanceImportPreview({
      siteId: 1,
      employees: [{ id: 10, name: 'Ani Wijaya', employeeSn: 'SN-0010', siteId: 1 }],
      fixedSchedule: [],
      rows: [
        {
          employeeSn: 'sn 0010',
          employeeName: '',
          siteName: '',
          day: 1,
          status: 'present',
          clockIn: '08:00',
          clockOut: '17:00',
          note: '',
        },
      ],
    })

    expect(preview.previewRows[0].employeeId).toBe(10)
    expect(preview.unmatchedCount).toBe(0)
  })

  it('uses flexible attendance template parser and delete action in scheduling import', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    const actionSource = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/admin-actions.ts'),
      'utf8'
    )
    expect(source).toContain('parseAttendanceWorkbook')
    expect(source).toContain('parsed.rows')
    expect(source).toContain('Delete Excel Import')
    expect(source).toContain('Import History')
    expect(source).toContain('Rollback')
    expect(source).toContain('clearAttendanceRealOverridesAction')
    expect(source).toContain('rollbackAttendanceImportPreviewAction')
    expect(source).toContain('attendanceFileInputRef.current?.click()')
    expect(source).toContain('ref={attendanceFileInputRef}')
    expect(source).toContain('removeWorkspace: !target.recreate')
    expect(actionSource).toContain('clearAttendanceRealOverridesAction')
    expect(actionSource).toContain('getAttendanceImportHistoryAction')
    expect(actionSource).toContain('updateAttendanceImportPreviewMatchAction')
    expect(actionSource).toContain('removeWorkspace: z.boolean().default(false)')
    expect(actionSource).toContain('timesheetSchedulingStatuses)')
  })

  it('allows attendance workspace creation before a Schedule V2 plan exists', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    const actionSource = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/admin-actions.ts'),
      'utf8'
    )
    expect(source).toContain("selectedAttendancePlan || siteId !== 'all'")
    expect(source).toContain('Attendance bisa dibuat tanpa Schedule V2')
    expect(source).toContain('overrides: [],')
    expect(actionSource).toContain("attendanceStatus: 'draft'")
    expect(actionSource).toContain('Created empty attendance workspace before Schedule V2 exists.')
  })

  it('does not use native prompts in scheduling workspace', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    expect(source).not.toContain('window.prompt')
  })

  it('exposes same-section OFF swap UI without native prompts', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    expect(source).toContain('swapSelectedScheduleCell')
    expect(source).toContain('Tukar OFF satu section')
    expect(source).toContain('rosterSection !== selectedRow.rosterSection')
    expect(source).not.toContain('window.prompt')
  })

  it('keeps import preview close separate from discard', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/timesheet/attendance-import-preview-dialog.tsx'),
      'utf8'
    )
    expect(source).toContain('onRequestClose')
    expect(source).toContain('onOpenChange={(next) => !next && onRequestClose()}')
  })

  it('splits scheduling timesheet into routed lightweight pages', () => {
    const root = process.cwd()
    const workspace = fs.readFileSync(
      path.join(root, 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    const adminSource = fs.readFileSync(path.join(root, 'lib/hero-admin.ts'), 'utf8')
    const sidebarSource = fs.readFileSync(path.join(root, 'components/app-sidebar.tsx'), 'utf8')
    const routes = [
      [
        'app/dashboard/scheduling-timesheet/page.tsx',
        'getSchedulingTimesheetOverviewOptions',
      ],
      [
        'app/dashboard/scheduling-timesheet/setup/page.tsx',
        'getSchedulingTimesheetSetupOptions',
      ],
      [
        'app/dashboard/scheduling-timesheet/schedule-v2/page.tsx',
        'getSchedulingTimesheetScheduleV2Options',
      ],
      [
        'app/dashboard/scheduling-timesheet/attendance/page.tsx',
        'getSchedulingTimesheetAttendanceOptions',
      ],
      [
        'app/dashboard/scheduling-timesheet/field-break/page.tsx',
        'getSchedulingTimesheetFieldBreakOptions',
      ],
      [
        'app/dashboard/scheduling-timesheet/payroll/page.tsx',
        'getSchedulingTimesheetPayrollOptions',
      ],
    ] as const

    expect(fs.existsSync(path.join(root, 'app/dashboard/scheduling-timesheet/layout.tsx'))).toBe(
      true
    )
    expect(workspace).not.toContain('TabsTrigger')
    expect(adminSource).toContain("section: 'Roster & Timesheet'")
    expect(adminSource).toContain("resource: 'scheduling_timesheet_attendance'")
    for (const [file, helper] of routes) {
      const source = fs.readFileSync(path.join(root, file), 'utf8')
      expect(source).toContain(helper)
    }
  })

  it('shows every active Overtime section from Approval Engine in site setup', () => {
    const workspaceSource = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    const optionsSource = fs.readFileSync(path.join(process.cwd(), 'lib/hero-admin.ts'), 'utf8')
    const actionSource = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/admin-actions.ts'),
      'utf8'
    )

    expect(optionsSource).toContain('employee.sectionId == null')
    expect(optionsSource).toContain('const activeSectionSites = new Map')
    expect(optionsSource).toContain('.where(eq(masterSections.isActive, true))')
    expect(optionsSource).toContain('sectionHeadEmployeeId: masterSections.headEmployeeId')
    expect(optionsSource).toContain('departmentHeadEmployeeId: masterDepartments.headEmployeeId')
    expect(optionsSource).toContain('const siteHeads = new Map')
    expect(optionsSource).toContain('approvalEmployees: employeeRows')
    expect(optionsSource).toContain("eq(approvalMatrices.transactionType, 'overtime_request')")
    expect(optionsSource).toContain('isNotNull(approvalMatrices.sectionId)')
    expect(optionsSource).toContain("matrix?.id ?? 'none'")
    expect(workspaceSource).toContain('siteApprovalSections.map((row)')
    expect(workspaceSource).toContain("row.matrixName || 'Belum sync'")
    expect(workspaceSource).toContain(
      'Approval Daily Activity, Overtime/SPL &amp; Request Barang/APD'
    )
    expect(workspaceSource).toContain('<span>PJO Leader</span>')
    expect(workspaceSource).toContain('<span>Section Head</span>')
    expect(workspaceSource).toContain('<span>Dept Head</span>')
    expect(workspaceSource).toContain('<SearchableSelect')
    expect(workspaceSource).toContain('approvalEmployeeOptions(')
    expect(workspaceSource).toContain('approvalEmployeeChoices')
    expect(workspaceSource).toContain('if (!result.ok) throw new Error(result.error')
    expect(workspaceSource).toContain('approvalSections: siteApprovalSections.map')
    expect(actionSource).toContain("scopeType: 'site'")
    expect(actionSource).toContain("transactionType: 'overtime_request'")
    expect(actionSource).toContain("transactionType: 'activity'")
    expect(actionSource).toContain("transactionType: 'apd-request'")
    expect(actionSource).toContain('Request Barang / APD - ${site.name} - ${sectionName}')
    expect(actionSource).toContain("activityType: 'overtime_command_letter'")
    expect(actionSource).toContain('for (const config of matrixConfigs)')
    expect(actionSource).toContain('Section approval tidak memiliki anggota aktif pada site ini.')
    expect(actionSource).toContain('Approver harus berasal dari karyawan aktif di User Management.')
  })

  it('revalidates scheduling timesheet after face attendance submission', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/actions/attendance.ts'), 'utf8')
    expect(source).toContain("revalidatePath('/dashboard/scheduling-timesheet')")
  })

  it('uses user management SN in scheduling views and exports', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    const optionsSource = fs.readFileSync(path.join(process.cwd(), 'lib/hero-admin.ts'), 'utf8')
    expect(optionsSource).toContain('employeeSn: employees.employeeSn')
    expect(source).toContain('employeeSnLabel')
    expect(source).toContain('SN: employeeSnLabel(employee)')
    expect(source).not.toContain('SN: employee.id')
  })

  it('keeps field break schedule blank until manual input', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    expect(source).not.toContain('index * 7')
    expect(source).not.toContain('addDays(`${period}-01`, 90)')
    expect(source).not.toContain('day >= 18 && day <= 28')
    expect(source).toContain("onSiteDate: row?.onSiteDate ?? ''")
    expect(source).toContain("fieldBreakDate: row?.fieldBreakDate ?? ''")
  })

  it('keeps field break dialog from scanning all plan history per cell', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    expect(source).toContain('const fieldBreakPlansByEmployee = useMemo')
    expect(source).toContain('fieldBreakPlansByEmployee.get(employee.id)')
    expect(source).toContain("mode === 'attendance'")
    expect(source).toContain("mode === 'payroll'")
    expect(source).not.toContain('const fieldBreakPlan = fieldBreakPlans.find')
  })

  it('allows nullable field break DB dates', () => {
    const schemaSource = fs.readFileSync(path.join(process.cwd(), 'db/schema/timesheet.ts'), 'utf8')
    const infrastructureSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/timesheet/scheduling-infrastructure.ts'),
      'utf8'
    )
    const migrationSource = fs.readFileSync(
      path.join(process.cwd(), 'drizzle/0023_field_break_nullable_dates.sql'),
      'utf8'
    )
    expect(schemaSource).toContain("onSiteDate: date('on_site_date')")
    expect(schemaSource).toContain("fieldBreakDate: date('field_break_date')")
    expect(infrastructureSource).toContain('alter column on_site_date drop not null')
    expect(infrastructureSource).toContain('alter column field_break_date drop not null')
    expect(migrationSource).toContain('ALTER COLUMN "field_break_date" DROP NOT NULL')
  })

  it('labels CSV export accurately', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    expect(source).toContain('Export CSV')
  })

  it('sets attendance import enhancement DB schema', () => {
    const schemaSource = fs.readFileSync(path.join(process.cwd(), 'db/schema/timesheet.ts'), 'utf8')
    const migrationSource = fs.readFileSync(
      path.join(process.cwd(), 'drizzle/0025_attendance_import_enhancements.sql'),
      'utf8'
    )
    const infrastructureSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/timesheet/scheduling-infrastructure.ts'),
      'utf8'
    )
    for (const expected of [
      'timesheetAttendanceEmployeeAliases',
      'importPreviewId',
      'validationFlags',
      'workMinutes',
      'rolledBackAt',
      'validationSummary',
    ]) {
      expect(schemaSource).toContain(expected)
    }
    expect(migrationSource).toContain('hero_timesheet_attendance_employee_aliases')
    expect(migrationSource).toContain('import_preview_id')
    expect(infrastructureSource).toContain('hero_timesheet_attendance_employee_aliases')
  })

  it('keeps DB status serialization keys stable', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'lib/hero-admin.ts'), 'utf8')
    for (const key of [
      'scheduleStatus',
      'attendanceStatus',
      'importStatus',
      'conflictCount',
      'finalizedAt',
      'metadata',
    ]) {
      expect(source).toContain(key)
    }
  })

  it('swaps only schedules where one side is OFF', () => {
    expect(canSwapOff('OFF', 'DS')).toBe(true)
    expect(swapScheduleCodes('OFF', 'DS')).toEqual(['DS', 'OFF'])
    expect(canSwapOff('DS', 'NS')).toBe(false)
    expect(swapScheduleCodes('DS', 'NS')).toBeNull()
  })

  it('shows holiday labels in schedule and attendance views', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    expect(source).toContain('holidaysByDay')
    expect(source).toContain('attendance-${holiday.date}')
    expect(source).toContain('bg-amber-100/70')
  })

  it('applies holiday policy for office and 5:2 but preserves 6:1 code', () => {
    expect(
      applyHolidayPolicy('IN', { scheduleType: 'office', rosterType: '5:2', isHoliday: true })
    ).toBe('Libur')
    expect(
      applyHolidayPolicy('DS', { scheduleType: 'shift', rosterType: '5:2', isHoliday: true })
    ).toBe('Libur')
    expect(
      applyHolidayPolicy('DS', { scheduleType: 'shift', rosterType: '6:1', isHoliday: true })
    ).toBe('DS')
  })

  it('classifies 6:1 holidays and sixth workday as off overtime day', () => {
    const schedule: ScheduleCode[] = ['OFF', 'DS', 'DS', 'DS', 'DS', 'DS', 'DS']
    expect(classifyOvertimeDay(['DS'], '2026-05', 0, '6:1', [{ date: '2026-05-01', day: 1 }])).toBe(
      'off'
    )
    expect(classifyOvertimeDay(schedule, '2026-05', 6, '6:1', [])).toBe('off')
  })

  it('normalizes OpenHoliday multi-day ranges', () => {
    const holidays = normalizeOpenHolidayResponse([
      {
        id: 'x',
        startDate: '2026-05-01',
        endDate: '2026-05-03',
        name: [{ language: 'ID', text: 'Libur Nasional' }],
        nationwide: true,
      },
    ])
    expect(holidays.map((holiday) => holiday.date)).toEqual([
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
    ])
  })

  it('normalizes api-hari-libur response', () => {
    const holidays = normalizeApiHariLiburResponse({
      data: [
        { date: '2026-05-01', description: ' Hari Buruh Internasional ' },
        { date: '2026-05-02', description: 'Cuti Melahirkan Nasional' },
        { date: '2026-05-15', description: 'Cuti Bersama Hari Raya Idul Adha 1447H' },
      ],
    })
    expect(holidays).toHaveLength(2)
    expect(holidays.map((holiday) => holiday.localName)).toEqual([
      'Hari Buruh Internasional',
      'Cuti Melahirkan Nasional',
    ])
    expect(holidays[0]).toMatchObject({
      date: '2026-05-01',
      localName: 'Hari Buruh Internasional',
      sourceId: '2026-05-01',
      nationwide: true,
    })
  })

  it('uses api-hari-libur source for scheduling holidays', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/admin-actions.ts'),
      'utf8'
    )
    expect(source).toContain("source: 'api-hari-libur'")
    expect(source).toContain("eq(indonesiaHolidays.source, 'api-hari-libur')")
  })

  it('marks every holiday schedule and attendance cell with holiday color classes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet-workspace.tsx'),
      'utf8'
    )
    expect(source).toContain('scheduleHolidayCellClass')
    expect(source).toContain('attendanceHolidayCellClass')
    expect(source).toContain("!name.toLowerCase().includes('cuti bersama')")
  })

  it('exposes scoped live attendance map with GPS activity controls', () => {
    const actionSource = fs.readFileSync(
      path.join(process.cwd(), 'app/actions/attendance.ts'),
      'utf8'
    )
    const mapSource = fs.readFileSync(
      path.join(process.cwd(), 'components/attendance/live-attendance-map.tsx'),
      'utf8'
    )
    const leafletSource = fs.readFileSync(
      path.join(process.cwd(), 'components/attendance/live-attendance-leaflet.tsx'),
      'utf8'
    )
    const menuSource = fs.readFileSync(path.join(process.cwd(), 'lib/hero-admin.ts'), 'utf8')
    expect(actionSource).toContain("getCurrentMenuPermission('attendance_live_map')")
    expect(actionSource).toContain('hasGlobalDataAccess(access)')
    expect(leafletSource).toContain('tile.openstreetmap.org')
    expect(mapSource).toContain('30000')
    expect(menuSource).toContain("url: '/dashboard/attendance/live-map'")
  })

  it('refreshes GPS before face attendance and persists accuracy for map markers', () => {
    const clientSource = fs.readFileSync(
      path.join(process.cwd(), 'app/mobile/attendance/face/face-attendance-client.tsx'),
      'utf8'
    )
    const verificationSource = fs.readFileSync(
      path.join(process.cwd(), 'app/api/mobile/face-verification/route.ts'),
      'utf8'
    )
    const fallbackSource = fs.readFileSync(
      path.join(process.cwd(), 'components/mobile/photo-fallback.tsx'),
      'utf8'
    )
    expect(clientSource).toContain('const gps = await readCurrentGps()')
    expect(clientSource).toContain('accuracy: gps.accuracy')
    expect(verificationSource).toContain('GPS ${Math.round(accuracyMeters)}m accuracy')
    expect(fallbackSource).toContain("formData.append('accuracy', accuracy.toString())")
  })

  it('maps Night Shift checkout on next day to check-in day and keeps next day OFF', () => {
    const preview = buildAttendanceImportPreview({
      siteId: 1,
      employees: [{ id: 10, name: 'Budi Night', employeeSn: 'SN-NIGHT', siteId: 1 }],
      fixedSchedule: [{ employeeId: 10, schedule: ['NS', 'OFF'] }],
      rows: [
        {
          employeeSn: 'SN-NIGHT',
          employeeName: 'Budi Night',
          siteName: '',
          day: 1,
          status: 'present',
          clockIn: '20:00',
          clockOut: '',
          note: '',
        },
        {
          employeeSn: 'SN-NIGHT',
          employeeName: 'Budi Night',
          siteName: '',
          day: 2,
          status: 'present',
          clockIn: '',
          clockOut: '04:00',
          note: '',
        },
      ],
    })

    // Day 1 (Night Shift check-in day) should receive the 04:00 checkout from Day 2
    expect(preview.previewRows[0].clockIn).toBe('20:00')
    expect(preview.previewRows[0].clockOut).toBe('04:00')

    // Day 2 (OFF day) should be cleared and NOT cause a conflict
    expect(preview.previewRows[1].clockIn).toBe('')
    expect(preview.previewRows[1].clockOut).toBe('')
    expect(preview.previewRows[1].status).toBe('off')
    expect(preview.conflicts).toHaveLength(0)
  })
})
