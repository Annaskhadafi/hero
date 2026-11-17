import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Bulk Edit Attendance Real & Multi-Cell Operations', () => {
  it('verifies AttendanceRealBulkToolbar contains bulk edit modal trigger and weekend selector', () => {
    const toolbarPath = path.resolve('components/timesheet/attendance-real-tab.tsx')
    const toolbarCode = fs.readFileSync(toolbarPath, 'utf8')

    assert(toolbarCode.includes('onOpenBulkEditModal'), 'Toolbar must support onOpenBulkEditModal')
    assert(toolbarCode.includes('onSelectAllWeekends'), 'Toolbar must support onSelectAllWeekends')
    assert(toolbarCode.includes('onSetOff'), 'Toolbar must support onSetOff')
    assert(toolbarCode.includes('Edit'), 'Toolbar must display Edit Sel Terpilih button')
  })

  it('verifies workspace contains Bulk Edit dialog matching user specification', () => {
    const workspacePath = path.resolve('components/scheduling-timesheet-workspace.tsx')
    const workspaceCode = fs.readFileSync(workspacePath, 'utf8')

    assert(workspaceCode.includes('isBulkEditAttendanceOpen'), 'Workspace must declare isBulkEditAttendanceOpen state')
    assert(workspaceCode.includes('onSaveBulkAttendance'), 'Workspace must declare onSaveBulkAttendance')
    assert(workspaceCode.includes('selectAllWeekends'), 'Workspace must declare selectAllWeekends helper')
    assert(workspaceCode.includes('Edit Attendance Real — Bulk'), 'Workspace must render Bulk Edit Dialog with title')
    assert(workspaceCode.includes('bulkRosterEditCode'), 'Workspace must support bulk roster code edit')
    assert(workspaceCode.includes('bulkAttendanceStatus'), 'Workspace must support bulk attendance status')
  })

  it('verifies admin-actions exports updateSchedulingTimesheetPlanV2BatchCellsAction and optimized saveAttendanceRealOverridesAction', () => {
    const actionsPath = path.resolve('app/dashboard/admin-actions.ts')
    const actionsCode = fs.readFileSync(actionsPath, 'utf8')

    assert(
      actionsCode.includes('updateSchedulingTimesheetPlanV2BatchCellsAction'),
      'admin-actions must export updateSchedulingTimesheetPlanV2BatchCellsAction'
    )
    assert(
      actionsCode.includes('// Synchronize attendance overtime to existing SPLs for matching employees & dates (optimized batch)'),
      'saveAttendanceRealOverridesAction must use optimized batch synchronization'
    )
  })
})
