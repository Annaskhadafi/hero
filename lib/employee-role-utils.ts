/**
 * Employee Role & Operation Classification Helper
 * Single Source of Truth for categorizing employees into:
 * 1. Serviceman (Service Operation) -> Responsible for filling Daily Activity & EWH target
 * 2. Technical (Technical Engineer, PJO, Technical Leader) -> Technical reporting & approvals, does NOT fill daily activity
 * 3. Repair (Repairman, Retread, Workshop Repair) -> WIP Jobcards & inspections, does NOT fill daily activity
 */

export interface EmployeeRoleInput {
  jobTitle?: string | null
  section?: string | null
  department?: string | null
  role?: string | null
  position?: string | null
}

/**
 * Checks if an employee is a field Serviceman (who fills Daily Activity and contributes to EWH & Daily Activity Utilities)
 */
export function isServicemanEmployee(emp: EmployeeRoleInput): boolean {
  const section = (emp.section || '').toLowerCase().trim()
  const jobTitle = (emp.jobTitle || '').toLowerCase().trim()
  const role = (emp.role || '').toLowerCase().trim()
  const department = (emp.department || '').toLowerCase().trim()

  // 1. Explicit Exclusions: Technical, PJO, Repair, Retread, Management, Admin, IT, Finance, HR
  if (
    isTechnicalOrPjoEmployee(emp) ||
    isRepairEmployee(emp) ||
    jobTitle.includes('technical') ||
    jobTitle.includes('pjo') ||
    jobTitle.includes('planing') ||
    jobTitle.includes('planning') ||
    jobTitle.includes('planner') ||
    jobTitle.includes('data analyst') ||
    jobTitle.includes('repair') ||
    jobTitle.includes('retread') ||
    jobTitle.includes('manager') ||
    jobTitle.includes('supervisor') ||
    jobTitle.includes('coordinator') ||
    jobTitle.includes('director') ||
    jobTitle.includes('admin') ||
    jobTitle.includes('sales') ||
    jobTitle.includes('it support') ||
    jobTitle.includes('treasury') ||
    jobTitle.includes('hse')
  ) {
    return false
  }

  // 2. Sections dedicated to Technical / Repair / Non-service
  if (
    section.includes('technical') ||
    section.includes('repair') ||
    section.includes('retread') ||
    section.includes('workshop') ||
    section.includes('billing') ||
    section.includes('management') ||
    section.includes('procurement') ||
    section.includes('inventory') ||
    section.includes('warehouse') ||
    section.includes('facility') ||
    section.includes('hse') ||
    section.includes('hr-ga') ||
    section.includes('finance') ||
    section.includes('legal') ||
    section.includes('marketing')
  ) {
    return false
  }

  // 3. Positive match for Service Operation sections
  if (
    section.includes('service operation') ||
    section.includes('service operation mvc') ||
    section.includes('service operation others') ||
    section.includes('service')
  ) {
    return true
  }

  // 4. Positive match for Serviceman / Technician jobTitle / role
  if (
    jobTitle.includes('serviceman') ||
    jobTitle.includes('tyre serviceman') ||
    jobTitle.includes('tire serviceman') ||
    jobTitle.includes('service') ||
    jobTitle.includes('mekanik') ||
    jobTitle.includes('mechanic') ||
    jobTitle.includes('operator') ||
    jobTitle.includes('helper') ||
    role.includes('serviceman')
  ) {
    return true
  }

  // 5. If department is Central Services and no conflicting role, default to true if role is serviceman
  if (department.includes('central service') && (jobTitle.includes('serviceman') || role.includes('serviceman'))) {
    return true
  }

  return false
}

/**
 * Checks if an employee is in Technical / PJO
 */
export function isTechnicalOrPjoEmployee(emp: EmployeeRoleInput): boolean {
  const section = (emp.section || '').toLowerCase().trim()
  const jobTitle = (emp.jobTitle || '').toLowerCase().trim()
  const role = (emp.role || '').toLowerCase().trim()

  return (
    section.includes('technical') ||
    jobTitle.includes('technical') ||
    jobTitle.includes('pjo') ||
    role.includes('technical') ||
    role.includes('pjo')
  )
}

/**
 * Checks if an employee is in Repair / Retread Operation
 */
export function isRepairEmployee(emp: EmployeeRoleInput): boolean {
  const section = (emp.section || '').toLowerCase().trim()
  const jobTitle = (emp.jobTitle || '').toLowerCase().trim()
  const role = (emp.role || '').toLowerCase().trim()

  return (
    section.includes('repair') ||
    section.includes('retread') ||
    jobTitle.includes('repair') ||
    jobTitle.includes('retread') ||
    role.includes('repair')
  )
}
