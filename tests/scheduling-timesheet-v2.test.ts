import fs from 'fs'
import path from 'path'

import {
  applyScheduleV2Code,
  createEmptyScheduleV2,
  cycleScheduleV2Code,
  getScheduleV2DayCount,
  getScheduleV2Progress,
  isCompleteScheduleV2,
  mergeActiveSchedulePlans,
} from '@/lib/timesheet/schedule-v2'

describe('scheduling timesheet V2', () => {
  it.each([
    ['2024-02', 29],
    ['2025-02', 28],
    ['2026-04', 30],
    ['2026-07', 31],
  ])('creates an empty grid for %s', (period, dayCount) => {
    const rows = createEmptyScheduleV2([10, 11], period)
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
    let rows = createEmptyScheduleV2([10], '2026-07')
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

  it('reports progress and validates complete activation', () => {
    let rows = createEmptyScheduleV2([10], '2026-02')
    expect(getScheduleV2Progress(rows)).toEqual({ filled: 0, total: 28, complete: false })
    rows = [{ employeeId: 10, schedule: Array(28).fill('DS') }]
    expect(getScheduleV2Progress(rows).complete).toBe(true)
    expect(isCompleteScheduleV2(rows, [10], '2026-02')).toBe(true)
    expect(isCompleteScheduleV2(rows, [10, 11], '2026-02')).toBe(false)
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

  it('keeps holidays as visual markers and has no auto-generation control', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/scheduling-timesheet/schedule-v2-workspace.tsx'),
      'utf8'
    )
    expect(source).toContain('holidayByDay')
    expect(source).toContain('Holiday hanya penanda')
    expect(source).not.toContain('Generate Auto Scheduling')
  })
})
