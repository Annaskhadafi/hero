import {
  calculatePayrollOvertimeValue,
  classifyPayrollAttendanceDay,
  type OvertimeVariable,
} from '@/lib/timesheet-scheduling'

describe('Payroll Overtime Calculation', () => {
  const sampleOvertimeVariables: OvertimeVariable[] = [
    { roster: '5:2', dayType: 'work', totalHours: 1, overtimeHours: 1.5 },
    { roster: '5:2', dayType: 'work', totalHours: 2, overtimeHours: 3.5 },
    { roster: '5:2', dayType: 'work', totalHours: 3, overtimeHours: 5.5 },
    { roster: '5:2', dayType: 'work', totalHours: 4, overtimeHours: 7.5 },
    { roster: '5:2', dayType: 'off', totalHours: 1, overtimeHours: 2.0 },
    { roster: '5:2', dayType: 'off', totalHours: 2, overtimeHours: 4.0 },
    { roster: '5:2', dayType: 'off', totalHours: 8, overtimeHours: 16.0 },
  ]

  it('matches exact setup configuration for work days', () => {
    // 4 hours OT on work day -> 7.5
    expect(calculatePayrollOvertimeValue('5:2', 'work', 4, sampleOvertimeVariables)).toBe(7.5)
    // 1 hour OT on work day -> 1.5
    expect(calculatePayrollOvertimeValue('5:2', 'work', 1, sampleOvertimeVariables)).toBe(1.5)
  })

  it('matches exact setup configuration for off days', () => {
    // 1 hour OT on off day -> 2.0
    expect(calculatePayrollOvertimeValue('5:2', 'off', 1, sampleOvertimeVariables)).toBe(2.0)
    // 8 hours OT on off day -> 16.0
    expect(calculatePayrollOvertimeValue('5:2', 'off', 8, sampleOvertimeVariables)).toBe(16.0)
  })

  it('interpolates decimal overtime hours linearly', () => {
    // 2.5 hours on work day (midpoint between 2 hrs = 3.5 and 3 hrs = 5.5) -> 4.5
    expect(calculatePayrollOvertimeValue('5:2', 'work', 2.5, sampleOvertimeVariables)).toBe(4.5)
  })

  it('returns 0 for 0 or negative hours', () => {
    expect(calculatePayrollOvertimeValue('5:2', 'work', 0, sampleOvertimeVariables)).toBe(0)
    expect(calculatePayrollOvertimeValue('5:2', 'work', -1, sampleOvertimeVariables)).toBe(0)
  })

  it('uses standard government overtime formula as fallback when table is empty', () => {
    // Work day PP 35/2021: 1.5x for 1st hour, 2x for remaining
    expect(calculatePayrollOvertimeValue('5:2', 'work', 1, [])).toBe(1.5)
    expect(calculatePayrollOvertimeValue('5:2', 'work', 4, [])).toBe(7.5)
    // Off day: 2x
    expect(calculatePayrollOvertimeValue('5:2', 'off', 4, [])).toBe(8.0)
  })
})

describe('classifyPayrollAttendanceDay', () => {
  const period = '2026-10' // 2026-10-01 was Thursday
  const schedule = ['DS', 'DS', 'OFF', 'DS', 'DS', 'DS', 'DS']
  const holidays = [{ date: '2026-10-04' }] // Day 4 is holiday

  it('classifies normal work shift as work (HK)', () => {
    expect(classifyPayrollAttendanceDay(schedule, period, 0, '5:2', holidays)).toBe('work')
  })

  it('classifies scheduled OFF as off (HL)', () => {
    expect(classifyPayrollAttendanceDay(schedule, period, 2, '5:2', holidays)).toBe('off')
  })

  it('classifies public holiday as off (HL)', () => {
    expect(classifyPayrollAttendanceDay(schedule, period, 3, '5:2', holidays)).toBe('off')
  })

  it('classifies 7th consecutive working day on 13:1 roster as off (HL)', () => {
    const sched13_1 = ['DS', 'DS', 'DS', 'DS', 'DS', 'DS', 'DS', 'DS']
    // 6th day (index 5) -> work
    expect(classifyPayrollAttendanceDay(sched13_1, period, 5, '13:1', [])).toBe('work')
    // 7th day (index 6) -> off (HL)
    expect(classifyPayrollAttendanceDay(sched13_1, period, 6, '13:1', [])).toBe('off')
  })
})
