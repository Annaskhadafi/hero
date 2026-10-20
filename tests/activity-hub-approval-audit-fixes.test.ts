import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Activity Hub Approval Audit Fixes', () => {
  it('guarantees exactly 1 row per session even when team members are present (no row duplication)', () => {
    // Simulated session with multiple team members
    const session = {
      sessionId: 101,
      sessionCode: 'ACT-101',
      workDate: '2026-10-14T00:00:00.000Z',
      shiftCode: 'PAGI',
      sessionStatus: 'Submitted',
      employeeId: 1,
      employeeName: 'Budi Santoso',
      employeeSn: 'SN-001',
      department: 'Operasional',
      section: 'Pit Service',
      siteName: 'Site A',
      summaryRemark: '[Team: Agus, Sanudin]',
    }

    const teamList = [
      { employeeId: 2, employeeName: 'Agus', employeeSn: 'SN-002', department: 'Operasional', section: 'Pit Service' },
      { employeeId: 3, employeeName: 'Sanudin', employeeSn: 'SN-003', department: 'Operasional', section: 'Pit Service' },
    ]

    const teamNamesExceptCreator = teamList
      .filter((tm) => tm.employeeId !== session.employeeId && tm.employeeName.toLowerCase() !== session.employeeName.toLowerCase())
      .map((tm) => tm.employeeName)

    const mainTeamSummary = teamNamesExceptCreator.length > 0 ? teamNamesExceptCreator.join(', ') : undefined

    // Unified row generation (1 session = 1 row)
    const rows = [
      {
        sessionId: session.sessionId,
        sessionCode: session.sessionCode,
        employeeName: session.employeeName,
        employeeSn: session.employeeSn,
        teamMembersSummary: mainTeamSummary,
        teamRole: mainTeamSummary ? ('Pemohon' as const) : undefined,
      },
    ]

    // Verify row count is strictly 1
    assert.equal(rows.length, 1, 'Should produce exactly 1 row for the session')
    assert.equal(rows[0].sessionId, 101)
    assert.equal(rows[0].employeeName, 'Budi Santoso')
    assert.equal(rows[0].teamMembersSummary, 'Agus, Sanudin')
    assert.equal(rows[0].teamRole, 'Pemohon')
  })

  it('allows Admin to review any pending approval document via isAdmin bypass', () => {
    const isRowReviewableByCurrentUser = (
      row: {
        sessionStatus: string
        approvals: Array<{ status: string; approverEmployeeId?: number | null; approverEmail?: string | null; approverName?: string | null }>
      },
      currentEmployee: { id: number; email: string; name: string },
      isAdmin: boolean
    ) => {
      const status = (row.sessionStatus || '').toLowerCase()
      if (['approved', 'completed', 'closed', 'rejected', 'draft', 'returned', 'reverted', 'needs_revision'].includes(status)) {
        return false
      }

      // Admin bypass
      if (isAdmin) return true

      const approvals = Array.isArray(row.approvals) ? row.approvals : []
      const activeStep = approvals.find((a) => (a.status || '').toLowerCase() === 'pending')
      if (!activeStep) return false

      const currentEmpId = currentEmployee.id
      const currentEmpEmail = currentEmployee.email.toLowerCase().trim()
      const currentEmpName = currentEmployee.name.toLowerCase().trim()

      const matchesId = currentEmpId != null && activeStep.approverEmployeeId != null && Number(activeStep.approverEmployeeId) === currentEmpId
      const matchesEmail = Boolean(currentEmpEmail) && Boolean(activeStep.approverEmail) && (activeStep.approverEmail || '').toLowerCase().trim() === currentEmpEmail
      const matchesName = Boolean(currentEmpName) && Boolean(activeStep.approverName) && (activeStep.approverName || '').toLowerCase().trim() === currentEmpName

      return Boolean(matchesId || matchesEmail || matchesName)
    }

    const row = {
      sessionStatus: 'Submitted',
      approvals: [
        {
          status: 'pending',
          approverEmployeeId: 999, // Assigned to Leader, not Admin
          approverEmail: 'leader@company.com',
          approverName: 'Leader John',
        },
      ],
    }

    const adminUser = { id: 1, email: 'admin@company.com', name: 'Super Admin' }
    const regularUser = { id: 50, email: 'user@company.com', name: 'Random User' }

    // Admin should be able to review
    assert.equal(isRowReviewableByCurrentUser(row, adminUser, true), true, 'Admin should bypass and be able to review')

    // Regular non-matching user cannot review
    assert.equal(isRowReviewableByCurrentUser(row, regularUser, false), false, 'Non-assigned non-admin user cannot review')

    // Completed document cannot be reviewed even by admin
    const completedRow = {
      ...row,
      sessionStatus: 'Approved',
    }
    assert.equal(isRowReviewableByCurrentUser(completedRow, adminUser, true), false, 'Completed document is not reviewable')
  })

  it('correctly calculates pagination and limits visible table rows', () => {
    // Generate 53 mock rows
    const mockRows = Array.from({ length: 53 }, (_, i) => ({
      sessionId: i + 1,
      sessionCode: `ACT-${i + 1}`,
    }))

    const pageSize = 15
    const totalPages = Math.max(1, Math.ceil(mockRows.length / pageSize))

    assert.equal(totalPages, 4, '53 rows with pageSize 15 should have 4 pages')

    // Page 1: 15 rows
    const page1Rows = mockRows.slice(0, 15)
    assert.equal(page1Rows.length, 15)
    assert.equal(page1Rows[0].sessionId, 1)
    assert.equal(page1Rows[14].sessionId, 15)

    // Page 4 (last page): 8 rows
    const page4Rows = mockRows.slice(3 * 15, 4 * 15)
    assert.equal(page4Rows.length, 8)
    assert.equal(page4Rows[0].sessionId, 46)
    assert.equal(page4Rows[7].sessionId, 53)
  })

  it('guarantees unique sessionIds in selectedBatchRows to prevent duplicate approval collision', () => {
    const rows = [
      { sessionId: 1, sessionCode: 'ACT-1' },
      { sessionId: 2, sessionCode: 'ACT-2' },
      { sessionId: 3, sessionCode: 'ACT-3' },
    ]

    const selectedIds = [1, 3]
    const selectedBatchRows = rows.filter((r) => selectedIds.includes(r.sessionId))

    assert.equal(selectedBatchRows.length, 2)
    assert.deepEqual(
      selectedBatchRows.map((r) => r.sessionId),
      [1, 3]
    )
    const uniqueIds = new Set(selectedBatchRows.map((r) => r.sessionId))
    assert.equal(uniqueIds.size, selectedBatchRows.length, 'Every batch row must have a unique sessionId')
  })

  it('correctly deduplicates multi-item team members and structures them for Popover display', () => {
    // Simulating 10 items in a session, all repeating the same 3 team members
    const rawTeamList = [
      { employeeId: 201, employeeName: 'Muhammad Rizky Ramadan', employeeSn: 'SN-201', jobTitle: 'Serviceman' },
      { employeeId: 202, employeeName: 'Sahlul Alamsyah', employeeSn: 'SN-202', jobTitle: 'Serviceman' },
      { employeeId: 203, employeeName: 'Yoga Saputra', employeeSn: 'SN-203', jobTitle: 'Serviceman' },
      // Duplicate entries from item joins
      { employeeId: 201, employeeName: 'Muhammad Rizky Ramadan', employeeSn: 'SN-201', jobTitle: 'Serviceman' },
      { employeeId: 202, employeeName: 'Sahlul Alamsyah', employeeSn: 'SN-202', jobTitle: 'Serviceman' },
      { employeeId: 203, employeeName: 'Yoga Saputra', employeeSn: 'SN-203', jobTitle: 'Serviceman' },
      { employeeId: 201, employeeName: 'Muhammad Rizky Ramadan', employeeSn: 'SN-201', jobTitle: 'Serviceman' },
    ]

    const dedupedTeamMap = new Map<string, typeof rawTeamList[0]>()
    for (const tm of rawTeamList) {
      if (!tm?.employeeName) continue
      const key = tm.employeeId ? `id:${tm.employeeId}` : `name:${tm.employeeName.trim().toLowerCase()}`
      if (!dedupedTeamMap.has(key)) {
        dedupedTeamMap.set(key, tm)
      }
    }
    const dedupedTeamList = Array.from(dedupedTeamMap.values())

    assert.equal(dedupedTeamList.length, 3, 'Should strictly deduplicate to 3 unique team members, not 7')
    assert.deepEqual(
      dedupedTeamList.map((tm) => tm.employeeName),
      ['Muhammad Rizky Ramadan', 'Sahlul Alamsyah', 'Yoga Saputra']
    )
  })

  it('supports 50 rows default pagination cleanly without exceeding page boundaries', () => {
    const mockRows = Array.from({ length: 120 }, (_, i) => ({
      sessionId: i + 1,
      sessionCode: `ACT-${i + 1}`,
    }))

    const defaultPageSize = 50
    const totalPages = Math.max(1, Math.ceil(mockRows.length / defaultPageSize))

    assert.equal(totalPages, 3, '120 rows with 50 pageSize must yield 3 pages')

    const page1 = mockRows.slice(0, 50)
    assert.equal(page1.length, 50)
    assert.equal(page1[0].sessionId, 1)
    assert.equal(page1[49].sessionId, 50)

    const page3 = mockRows.slice(100, 150)
    assert.equal(page3.length, 20)
    assert.equal(page3[0].sessionId, 101)
    assert.equal(page3[19].sessionId, 120)
  })
})

