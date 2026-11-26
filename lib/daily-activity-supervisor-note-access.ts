type NoteAccessInput = {
  employeeId: number
  employeeSiteId: number | null
  ownerId: number
  activitySiteId: number | null
  dashboardPermission: { canView: boolean; canEdit: boolean; dataScope: string } | null
  myDayCanView: boolean
  position: { isActive: boolean | null; levelName: string | null; isManagerial: boolean | null } | null
}

export function resolveSupervisorNoteAccess(input: NoteAccessInput) {
  const { dashboardPermission: permission, position } = input
  const owner = input.employeeId === input.ownerId
  const scope = permission?.dataScope
  const inScope = scope === 'global' || (scope === 'own' && owner) ||
    (scope === 'site' && input.employeeSiteId != null && input.activitySiteId === input.employeeSiteId)
  const level = position?.levelName?.trim().toLowerCase()
  const eligible = position?.isActive === true &&
    (level === 'supervisor' || level === 'manager' || (Boolean(level) && position.isManagerial === true))
  const dashboardRead = permission?.canView === true && inScope
  const canWrite = dashboardRead && permission.canEdit === true && eligible
  const canRead = canWrite || (owner && (input.myDayCanView || dashboardRead))
  return { canRead, canWrite }
}
