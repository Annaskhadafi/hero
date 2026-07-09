import { strict as assert } from 'node:assert'
import {
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

assert.equal(getFieldBreakCapacity(11), 1)
assert.equal(getFieldBreakCapacity(12), 2)

const eleven = generateFieldBreakYearPlans({
  employees: employees(11),
  startPeriod: '2026-01',
})
assert.equal(eleven.capacity, 1)
assert.equal(validateFieldBreakCapacity(eleven.plans.filter((plan) => plan.period === '2026-04')).length, 0)

const twelve = generateFieldBreakYearPlans({
  employees: employees(12),
  startPeriod: '2026-01',
})
assert.equal(twelve.capacity, 2)
assert.equal(validateFieldBreakCapacity(twelve.plans.filter((plan) => plan.period === '2026-04')).length, 0)

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
assert.equal(lockedRow?.fieldBreakDate, '2026-04-10')
assert.equal(lockedRow?.fieldBreakEndDate, '2026-04-23')
assert.equal(lockedRow?.isLocked, true)

const first = eleven.plans.find((plan) => plan.employeeId === 1 && plan.period === '2026-04')
assert.equal(first?.onSiteDate, '2026-01-01')
assert.equal(first?.fieldBreakDate, '2026-04-01')
assert.equal(first?.fieldBreakEndDate, '2026-04-14')

console.log('field-break-generator tests passed')
process.exit(0)
