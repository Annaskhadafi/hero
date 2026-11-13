export function canEmployeeSeeSplChecklist(input: {
  employeeId: number
  requestedByEmployeeId: number
  sectionId: number | null
  positionId: number | null
  employeeSectionId: number | null
  employeePositionId: number | null
  participantEmployeeIds: number[]
  itemAssignedEmployeeIds: number[]
}) {
  if (input.itemAssignedEmployeeIds.length > 0) {
    return input.itemAssignedEmployeeIds.includes(input.employeeId)
  }
  if (input.participantEmployeeIds.length > 0) {
    return input.participantEmployeeIds.includes(input.employeeId)
  }
  if (input.sectionId != null || input.positionId != null) {
    return (
      (input.sectionId == null || input.sectionId === input.employeeSectionId) &&
      (input.positionId == null || input.positionId === input.employeePositionId)
    )
  }
  return input.employeeId === input.requestedByEmployeeId
}
