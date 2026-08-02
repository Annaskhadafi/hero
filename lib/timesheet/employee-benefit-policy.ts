export type SpecialAllowancePeriod = 'daily' | 'monthly'

export type EmployeeBenefitRule = {
  msa: boolean
  meals: boolean
  specialAllowance: boolean
  specialAllowancePeriod: SpecialAllowancePeriod
  specialAllowanceAmount: number
}

export type EmployeeBenefitConfig = {
  local: EmployeeBenefitRule
  nonLocal: EmployeeBenefitRule
}

export type EmployeeBenefitIdentity = {
  manpower?: string | null
  pointOfHire?: string | null
  workLocations?: readonly (string | null | undefined)[]
}

export const DEFAULT_EMPLOYEE_BENEFIT_CONFIG: EmployeeBenefitConfig = {
  local: {
    msa: false,
    meals: false,
    specialAllowance: false,
    specialAllowancePeriod: 'daily',
    specialAllowanceAmount: 0,
  },
  nonLocal: {
    msa: true,
    meals: true,
    specialAllowance: false,
    specialAllowancePeriod: 'daily',
    specialAllowanceAmount: 0,
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeAmount(value: unknown, fallback: number) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : fallback
}

function normalizeRule(value: unknown, fallback: EmployeeBenefitRule): EmployeeBenefitRule {
  if (!isRecord(value)) return { ...fallback }
  return {
    msa: typeof value.msa === 'boolean' ? value.msa : fallback.msa,
    meals: typeof value.meals === 'boolean' ? value.meals : fallback.meals,
    specialAllowance:
      typeof value.specialAllowance === 'boolean'
        ? value.specialAllowance
        : fallback.specialAllowance,
    specialAllowancePeriod: value.specialAllowancePeriod === 'monthly' ? 'monthly' : 'daily',
    specialAllowanceAmount: normalizeAmount(
      value.specialAllowanceAmount,
      fallback.specialAllowanceAmount
    ),
  }
}

export function normalizeEmployeeBenefitConfig(
  value: unknown,
  legacy?: { enabled?: unknown; rate?: unknown }
): EmployeeBenefitConfig {
  const legacyEnabled = Boolean(legacy?.enabled)
  const legacyAmount = normalizeAmount(legacy?.rate, 0)
  const legacySpecial = {
    specialAllowance: legacyEnabled,
    specialAllowanceAmount: legacyAmount,
  }
  const fallback = {
    local: { ...DEFAULT_EMPLOYEE_BENEFIT_CONFIG.local, ...legacySpecial },
    nonLocal: { ...DEFAULT_EMPLOYEE_BENEFIT_CONFIG.nonLocal, ...legacySpecial },
  }
  const source = isRecord(value) ? value : {}
  return {
    local: normalizeRule(source.local, fallback.local),
    nonLocal: normalizeRule(source.nonLocal, fallback.nonLocal),
  }
}

export function isLocalEmployee(manpower: string | null | undefined) {
  return !String(manpower ?? 'Lokal')
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .startsWith('non ')
}

function normalizeLocation(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isSameLocation(left: string, right: string) {
  const paddedLeft = ` ${left} `
  const paddedRight = ` ${right} `
  return left === right || paddedLeft.includes(paddedRight) || paddedRight.includes(paddedLeft)
}

export function isNonLocalEmployee(identity: EmployeeBenefitIdentity) {
  const pointOfHire = normalizeLocation(identity.pointOfHire)
  const workLocations = (identity.workLocations ?? []).map(normalizeLocation).filter(Boolean)

  if (pointOfHire && workLocations.length > 0) {
    return !workLocations.some((location) => isSameLocation(pointOfHire, location))
  }

  return !isLocalEmployee(identity.manpower)
}

export function isMsaEligibleDay(
  scheduleCode: string | null | undefined,
  isFieldBreakPeriod = false
) {
  if (isFieldBreakPeriod) return false
  const code = String(scheduleCode ?? '').trim().toUpperCase()
  return Boolean(code) && code !== '-' && code !== 'FB'
}

export function isMealsEligibleScheduleCode(
  scheduleCode: string | null | undefined,
  isFieldBreakPeriod = false
) {
  if (isFieldBreakPeriod) return false
  const code = String(scheduleCode ?? '').trim().toUpperCase()
  if (!code || code === '-' || code === 'FB' || code === 'OFF') return false
  return code === 'IN' || code === 'DS' || code === 'NS' || code === 'ST'
}

export function isMealsEligibleDay(input: {
  isPresent: boolean
  isHoliday: boolean
  isWorkDay: boolean
  isFieldBreakPeriod: boolean
}) {
  return input.isPresent && input.isWorkDay && !input.isHoliday && !input.isFieldBreakPeriod
}

export function getEmployeeBenefitRule(
  config: EmployeeBenefitConfig,
  identity: EmployeeBenefitIdentity | string | null | undefined
) {
  const nonLocal =
    typeof identity === 'object' && identity !== null
      ? isNonLocalEmployee(identity)
      : !isLocalEmployee(identity)
  return nonLocal ? config.nonLocal : config.local
}

export function getSpecialAllowanceAmount(
  rule: EmployeeBenefitRule,
  eligible: boolean,
  firstEligibleDay: boolean
) {
  if (!rule.specialAllowance || !eligible) return 0
  if (rule.specialAllowancePeriod === 'monthly' && !firstEligibleDay) return 0
  return rule.specialAllowanceAmount
}
