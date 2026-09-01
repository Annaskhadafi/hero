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

  // 1. Resolve Leader (Tahap 1 / Signatory 1: Leader / PJO / Atasan Langsung)
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

  // 2. Resolve Superior / Section Head (Tahap 2 / Signatory 2: Section Head / Dept Head / PJO)
  let superior: EmployeeHierarchyInfo | null = null
  if (emp.sectionHeadId && emp.sectionHeadId !== emp.id) {
    superior = employees.find((e) => e.id === emp.sectionHeadId) ?? null
  }

  // If section head is the same as leader (or employee is the section head), elevate to Dept Head or Manager's manager or Site Head
  if (!superior || superior.id === leader?.id || superior.id === emp.id) {
    if (leader?.directManagerId && leader.directManagerId !== leader.id && leader.directManagerId !== emp.id) {
      superior = employees.find((e) => e.id === leader.directManagerId) ?? null
    } else if (emp.deptHeadId && emp.deptHeadId !== emp.id && emp.deptHeadId !== leader?.id) {
      superior = employees.find((e) => e.id === emp.deptHeadId) ?? null
    } else if (emp.siteHeadId && emp.siteHeadId !== emp.id && emp.siteHeadId !== leader?.id) {
      superior = employees.find((e) => e.id === emp.siteHeadId) ?? null
    }
  }

  // If still not found and settings has sectionHeads matrix:
  if (!superior && emp.section && settings?.approvalMatrix?.sectionHeads) {
    const secList = Array.isArray(settings.approvalMatrix.sectionHeads)
      ? settings.approvalMatrix.sectionHeads
      : Object.values(settings.approvalMatrix.sectionHeads)
    const matched: any = secList.find((sh: any) =>
      sh.section && emp.section?.toLowerCase().includes(sh.section.toLowerCase())
    )
    if (matched?.email) {
      superior = employees.find((e) => e.email?.toLowerCase() === matched.email.toLowerCase()) ?? null
    }
  }

  // If superior still empty, fallback to leader or site head
  if (!superior && emp.siteHeadId) {
    superior = employees.find((e) => e.id === emp.siteHeadId) ?? null
  }

  return {
    requester: emp,
    leader,
    superior,
    department: emp.department || '',
    section: emp.section || '',
  }
}
