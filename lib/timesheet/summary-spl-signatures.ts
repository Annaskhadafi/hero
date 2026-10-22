export type SummarySplSignatoryInfo = {
  isPjo: boolean
  preparedByName: string
  pjoName: string
  leaderName: string
}

export function isEmployeePjo(emp?: {
  id?: number | string | null
  name?: string | null
  position?: string | null
  jobTitle?: string | null
  rank?: string | null
  role?: string | null
  siteHeadId?: number | null
} | null): boolean {
  if (!emp) return false
  const title = (emp.position || emp.jobTitle || '').toLowerCase()
  const role = (emp.rank || emp.role || '').toLowerCase()
  const name = (emp.name || '').toLowerCase()
  if (title.includes('pjo') || role.includes('pjo')) return true
  if (emp.id && emp.siteHeadId && Number(emp.id) === Number(emp.siteHeadId)) return true
  if (name.includes('irwan adit') || name.includes('irwan aditya')) return true
  return false
}

export function resolvePjoLeader(
  pjoEmp: any,
  allEmployees: any[]
): { id: number | null; name: string; title: string } {
  if (!pjoEmp) {
    return { id: null, name: 'Supervisor / Leader', title: 'Leader' }
  }

  const pjoId = Number(pjoEmp.id)
  const pjoName = (pjoEmp.name || '').trim().toLowerCase()

  // 1. Check directManagerId of the PJO
  if (pjoEmp.directManagerId && Number(pjoEmp.directManagerId) !== pjoId) {
    const dm = allEmployees.find(
      (e) => Number(e.id) === Number(pjoEmp.directManagerId)
    )
    if (dm && (dm.name || '').trim().toLowerCase() !== pjoName) {
      return {
        id: Number(dm.id),
        name: dm.name,
        title: dm.position || dm.jobTitle || dm.rank || 'Leader / Supervisor',
      }
    }
  }

  // 2. Check deptHeadId or sectionHeadId
  const candidateHeadIds = [
    pjoEmp.deptHeadId,
    pjoEmp.sectionHeadId,
  ].filter((id): id is number => Boolean(id) && Number(id) !== pjoId)

  for (const headId of candidateHeadIds) {
    const head = allEmployees.find((e) => Number(e.id) === Number(headId))
    if (head && (head.name || '').trim().toLowerCase() !== pjoName) {
      return {
        id: Number(head.id),
        name: head.name,
        title: head.position || head.jobTitle || 'Department Head / Leader',
      }
    }
  }

  // 3. Look for Central Services Manager or Service Operation SPV
  const fallbackManager = allEmployees.find(
    (e) =>
      Number(e.id) !== pjoId &&
      (e.name || '').trim().toLowerCase() !== pjoName &&
      ((e.position || e.jobTitle || '').toLowerCase().includes('central services manager') ||
       (e.position || e.jobTitle || '').toLowerCase().includes('service operation mvc supervisor') ||
       (e.position || e.jobTitle || '').toLowerCase().includes('operation manager'))
  )
  if (fallbackManager) {
    return {
      id: Number(fallbackManager.id),
      name: fallbackManager.name,
      title: fallbackManager.position || fallbackManager.jobTitle || 'Manager / Leader',
    }
  }

  return { id: null, name: 'Apriyanto', title: 'Service Operation Supervisor' }
}

export function resolveSummarySplSignatories(params: {
  selectedEmployee?: any
  allEmployees?: any[]
  firstRowApprovals?: any[]
  fallbackEmployeeName?: string
}): SummarySplSignatoryInfo {
  const { selectedEmployee, allEmployees = [], firstRowApprovals = [], fallbackEmployeeName = 'Karyawan' } = params

  const employeeName = selectedEmployee?.name || fallbackEmployeeName
  const isPjo = isEmployeePjo(selectedEmployee)

  if (isPjo) {
    // If applicant is PJO: 2 signatures (1. Pengaju [PJO], 2. Leader [PJO Leader])
    const pjoLeader = resolvePjoLeader(selectedEmployee, allEmployees)
    return {
      isPjo: true,
      preparedByName: employeeName,
      pjoName: '', // omitted
      leaderName: pjoLeader.name || 'Apriyanto',
    }
  }

  // If applicant is regular employee: 3 signatures (1. Pengaju, 2. PJO, 3. Leader)
  // Find PJO for this site
  const siteId = selectedEmployee?.siteId
  let sitePjo = allEmployees.find(
    (e) =>
      Number(e.id) !== Number(selectedEmployee?.id) &&
      (
        (siteId && e.siteId && Number(e.siteId) === Number(siteId) && isEmployeePjo(e)) ||
        (selectedEmployee?.siteHeadId && Number(e.id) === Number(selectedEmployee.siteHeadId))
      )
  )

  let pjoName = sitePjo?.name || ''
  if (!pjoName) {
    const pjoRow = firstRowApprovals.find(
      (a) =>
        (a.stepLabel || '').toLowerCase().includes('pjo') ||
        (a.approverRole || '').toLowerCase().includes('pjo')
    )
    if (pjoRow?.approverName && pjoRow.approverName.trim().toLowerCase() !== employeeName.trim().toLowerCase()) {
      pjoName = pjoRow.approverName
    }
  }
  if (!pjoName) {
    pjoName = 'PJO Site'
  }

  // Find Leader
  let leaderName = ''
  if (sitePjo) {
    const resolvedLeader = resolvePjoLeader(sitePjo, allEmployees)
    if (resolvedLeader.name && resolvedLeader.name.trim().toLowerCase() !== pjoName.trim().toLowerCase()) {
      leaderName = resolvedLeader.name
    }
  }

  if (!leaderName && selectedEmployee?.directManagerId) {
    const dm = allEmployees.find((e) => Number(e.id) === Number(selectedEmployee.directManagerId))
    if (dm && dm.name && dm.name.trim().toLowerCase() !== pjoName.trim().toLowerCase() && dm.name.trim().toLowerCase() !== employeeName.trim().toLowerCase()) {
      leaderName = dm.name
    }
  }

  if (!leaderName) {
    const fallbackMgr = allEmployees.find(
      (e) =>
        Number(e.id) !== Number(selectedEmployee?.id) &&
        (e.name || '').trim().toLowerCase() !== pjoName.trim().toLowerCase() &&
        (e.name || '').trim().toLowerCase() !== employeeName.trim().toLowerCase() &&
        ((e.position || e.jobTitle || '').toLowerCase().includes('central services manager') ||
         (e.position || e.jobTitle || '').toLowerCase().includes('service operation mvc supervisor'))
    )
    leaderName = fallbackMgr?.name || 'Apriyanto'
  }

  return {
    isPjo: false,
    preparedByName: employeeName,
    pjoName,
    leaderName,
  }
}
