import { classifyOvertimeDay, isThirteenOneOffDay } from '@/lib/timesheet-scheduling'
import { generateFieldBreakYearPlans } from '@/lib/timesheet/field-break-generator'

describe('13:1 roster', () => {
  it('works for 13 days then takes one OFF day', () => {
    expect(isThirteenOneOffDay('2026-01', 13)).toBe(false)
    expect(isThirteenOneOffDay('2026-01', 14)).toBe(true)
    expect(isThirteenOneOffDay('2026-01', 15)).toBe(false)
    expect(isThirteenOneOffDay('2026-01', 28)).toBe(true)
    expect(isThirteenOneOffDay('2026-04', 14, '2026-04-01')).toBe(true)
    expect(classifyOvertimeDay(['DS', 'DS', 'DS', 'DS'], '2026-04', 3, '13:1')).toBe('work')
    expect(classifyOvertimeDay(['OFF'], '2026-04', 0, '13:1')).toBe('off')
  })

  it('uses weeks for the related field break cycle', () => {
    const { plans } = generateFieldBreakYearPlans({
      employees: [
        {
          employeeId: 1,
          employeeName: 'Roster 13:1',
          sectionName: 'Service Operation',
          rosterSection: 'Service Operation',
        },
      ],
      startPeriod: '2026-01',
      workWeeks: 12,
      breakWeeks: 2,
      existingPlans: [{ employeeId: 1, period: '2026-01', onSiteDate: '2026-01-01' }],
    })
    const plan = plans.find((item) => item.period === '2026-01')

    expect(plan?.fieldBreakDate).toBe('2026-03-26')
    expect(plan?.fieldBreakEndDate).toBe('2026-04-08')
  })
})
