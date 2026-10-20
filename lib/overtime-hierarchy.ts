export type EmployeeHierarchyInfo = {
  id: number
  name: string
  employeeId?: string
  position?: string
  rank?: string
  department?: string | null
  section?: string | null
  email?: string | null
  directManagerId?: number | null
  sectionId?: number | null
  departmentId?: number | null
  siteId?: number | null
  sectionHeadId?: number | null
  deptHeadId?: number | null
  siteHeadId?: number | null
}

export function resolveEmployeeApproverHierarchy(
  employeeId: number | string | null | undefined,
  employees: EmployeeHierarchyInfo[],
  settings?: any
): {
  requester: EmployeeHierarchyInfo | null
  leader: EmployeeHierarchyInfo | null
  superior: EmployeeHierarchyInfo | null
  department: string
  section: string
} {
  if (!employeeId) {
    return { requester: null, leader: null, superior: null, department: '', section: '' }
  }

  const emp = employees.find((e) => String(e.id) === String(employeeId))
  if (!emp) {
    return { requester: null, leader: null, superior: null, department: '', section: '' }
  }

  // 1. Resolve Leader (Tahap 1 / Signatory 1: Leader / Supervisor / Atasan Langsung)
  let leader: EmployeeHierarchyInfo | null = null
  if (emp.directManagerId) {
    leader = employees.find((e) => e.id === emp.directManagerId) ?? null
  }
  if (!leader && emp.sectionHeadId && emp.sectionHeadId !== emp.id) {
    leader = employees.find((e) => e.id === emp.sectionHeadId) ?? null
  }
  if (!leader && emp.siteHeadId && emp.siteHeadId !== emp.id) {
    leader = employees.find((e) => e.id === emp.siteHeadId) ?? null
  }

  // 2. Resolve PJO / Site Lead (Tahap 2 / Signatory 2: PJO / Site Lead - sama seperti Daily Activity)
  let superior: EmployeeHierarchyInfo | null = null
  if (emp.siteHeadId && emp.siteHeadId !== emp.id) {
    superior = employees.find((e) => e.id === emp.siteHeadId) ?? null
  }

  // If superior is not found or is the same as leader, resolve site head from leader or settings
  if (!superior && leader?.siteHeadId && leader.siteHeadId !== leader.id && leader.siteHeadId !== emp.id) {
    superior = employees.find((e) => e.id === leader.siteHeadId) ?? null
  }

  // Match PJO from settings approvalMatrix if available
  if (!superior && (settings?.approvalMatrix?.pjoName || settings?.approvalMatrix?.leaderName)) {
    const pjoTarget = settings?.approvalMatrix?.pjoName || settings?.approvalMatrix?.leaderName
    superior = employees.find((e) => e.name?.toLowerCase().includes(pjoTarget.toLowerCase())) ?? null
  }

  // Fallback to department head or leader's manager if still empty
  if (!superior && leader?.directManagerId && leader.directManagerId !== leader.id && leader.directManagerId !== emp.id) {
    superior = employees.find((e) => e.id === leader.directManagerId) ?? null
  }

  if (!superior && emp.deptHeadId && emp.deptHeadId !== emp.id && emp.deptHeadId !== leader?.id) {
    superior = employees.find((e) => e.id === emp.deptHeadId) ?? null
  }

  // If still empty and leader exists, fallback to leader
  if (!superior) {
    superior = leader
  }

  return {
    requester: emp,
    leader,
    superior,
    department: emp.department || '',
    section: emp.section || '',
  }
}
