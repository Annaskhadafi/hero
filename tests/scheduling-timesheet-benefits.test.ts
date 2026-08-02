import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EMPLOYEE_BENEFIT_CONFIG,
  getEmployeeBenefitRule,
  getSpecialAllowanceAmount,
  isLocalEmployee,
  isMealsEligibleDay,
  isMealsEligibleScheduleCode,
  isMsaEligibleDay,
  isNonLocalEmployee,
  normalizeEmployeeBenefitConfig,
} from '../lib/timesheet/employee-benefit-policy'

describe('scheduling timesheet employee benefit policy', () => {
  it('uses employee manpower and pays monthly allowance only once', () => {
    expect(isLocalEmployee('Lokal')).toBe(true)
    expect(isLocalEmployee('Non Lokal')).toBe(false)
    expect(getEmployeeBenefitRule(DEFAULT_EMPLOYEE_BENEFIT_CONFIG, 'Lokal').msa).toBe(false)
    expect(getEmployeeBenefitRule(DEFAULT_EMPLOYEE_BENEFIT_CONFIG, 'Non Lokal').meals).toBe(true)

    const config = normalizeEmployeeBenefitConfig({
      local: {
        msa: true,
        meals: false,
        specialAllowance: true,
        specialAllowancePeriod: 'monthly',
        specialAllowanceAmount: 750000,
      },
    })
    expect(getSpecialAllowanceAmount(config.local, true, true)).toBe(750000)
    expect(getSpecialAllowanceAmount(config.local, true, false)).toBe(0)
  })

  it('classifies POH outside the work location as non-local and pays MSA except field break, empty, and dash', () => {
    const nonLocal = {
      manpower: 'Lokal',
      pointOfHire: 'Balikpapan',
      workLocations: ['CK MIFA', 'Meureubo, Aceh'],
    }
    const local = {
      manpower: 'Lokal',
      pointOfHire: 'Sorowako',
      workLocations: ['Vale - Sorowako'],
    }

    expect(isNonLocalEmployee(nonLocal)).toBe(true)
    expect(isNonLocalEmployee(local)).toBe(false)
    expect(getEmployeeBenefitRule(DEFAULT_EMPLOYEE_BENEFIT_CONFIG, nonLocal).msa).toBe(true)
    expect(isMsaEligibleDay('OFF')).toBe(true)
    expect(isMsaEligibleDay('Libur')).toBe(true)
    expect(isMsaEligibleDay('IN')).toBe(true)
    expect(isMsaEligibleDay('FB')).toBe(false)
    expect(isMsaEligibleDay('OFF', true)).toBe(false)
    expect(isMsaEligibleDay('-')).toBe(false)
    expect(isMsaEligibleDay('')).toBe(false)
    expect(isMsaEligibleDay(null)).toBe(false)
    expect(isMsaEligibleDay(undefined)).toBe(false)
  })

  it('verifies schedule code meals eligibility for working shifts vs OFF, FB, empty, and dash', () => {
    expect(isMealsEligibleScheduleCode('IN')).toBe(true)
    expect(isMealsEligibleScheduleCode('DS')).toBe(true)
    expect(isMealsEligibleScheduleCode('NS')).toBe(true)
    expect(isMealsEligibleScheduleCode('ST')).toBe(true)
    expect(isMealsEligibleScheduleCode('OFF')).toBe(false)
    expect(isMealsEligibleScheduleCode('FB')).toBe(false)
    expect(isMealsEligibleScheduleCode('-')).toBe(false)
    expect(isMealsEligibleScheduleCode('')).toBe(false)
  })

  it('pays meals from an enabled category only on attended workdays', () => {
    expect(
      isMealsEligibleDay({
        isPresent: true,
        isHoliday: false,
        isWorkDay: true,
        isFieldBreakPeriod: false,
      })
    ).toBe(true)
    expect(
      isMealsEligibleDay({
        isPresent: true,
        isHoliday: false,
        isWorkDay: true,
        isFieldBreakPeriod: true,
      })
    ).toBe(false)
    expect(
      isMealsEligibleDay({
        isPresent: false,
        isHoliday: false,
        isWorkDay: true,
        isFieldBreakPeriod: false,
      })
    ).toBe(false)
  })
})
