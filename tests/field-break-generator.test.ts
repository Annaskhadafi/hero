import {
  addDaysIso,
  generateFieldBreakYearPlans,
  getFieldBreakCapacity,
  validateFieldBreakCapacity,
} from '../lib/timesheet/field-break-generator'

function employees(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    employeeId: index + 1,
    employeeName: `Employee ${String(index + 1).padStart(2, '0')}`,
    sectionName: 'Service Operation',
    rosterSection: 'Service Operation',
  }))
}

describe('field break generator', () => {
  it('calculates field break capacity and dates correctly', () => {
    expect(getFieldBreakCapacity(11)).toBe(1)
    expect(getFieldBreakCapacity(12)).toBe(2)
    expect(addDaysIso('2026-07-10', 1)).toBe('2026-07-11')
  })

  it('generates year plans within capacity', () => {
    const eleven = generateFieldBreakYearPlans({
      employees: employees(11),
      startPeriod: '2026-01',
    })
    expect(eleven.capacity).toBe(1)
    expect(
      validateFieldBreakCapacity(eleven.plans.filter((plan) => plan.period === '2026-04')).length
    ).toBe(0)

    const twelve = generateFieldBreakYearPlans({
      employees: employees(12),
      startPeriod: '2026-01',
    })
    expect(twelve.capacity).toBe(2)
    expect(
      validateFieldBreakCapacity(twelve.plans.filter((plan) => plan.period === '2026-04')).length
    ).toBe(0)
  })

  it('preserves existing locked plans', () => {
    const locked = generateFieldBreakYearPlans({
      employees: employees(2),
      startPeriod: '2026-01',
      existingPlans: [
        {
          employeeId: 1,
          period: '2026-04',
          onSiteDate: '2026-01-10',
          fieldBreakDate: '2026-04-10',
          fieldBreakEndDate: '2026-04-23',
          source: 'manual',
          isLocked: true,
          notes: 'customer fixed',
        },
      ],
    })
    const lockedRow = locked.plans.find((plan) => plan.employeeId === 1 && plan.period === '2026-04')
    expect(lockedRow?.fieldBreakDate).toBe('2026-04-10')
    expect(lockedRow?.fieldBreakEndDate).toBe('2026-04-23')
    expect(lockedRow?.isLocked).toBe(true)
  })
})
