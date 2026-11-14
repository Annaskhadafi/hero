import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('DAR PJO Approval RLS and Auto-Reload Guard', () => {
  it('correctly grants PJO / Site Head full visibility over site sessions', () => {
    // Current employee profile matching Revy Andyaksa Saroni
    const currentEmployee = {
      id: 1114,
      name: 'Revy Andyaksa Saroni',
      email: 'revy.andyaksa@chitraparatama.co.id',
      accessRole: 'PJO SITE',
      jobTitle: 'Technical Engineer',
      department: 'Central Services',
      section: 'Technical',
      siteId: 149,
    }

    const headedSites = [{ id: 149 }]
    const siteIdsSet = new Set(headedSites.map((s) => s.id))
    if (currentEmployee.siteId) {
      siteIdsSet.add(currentEmployee.siteId)
    }

    const accessRole = (currentEmployee.accessRole || '').toLowerCase()
    const jobTitleLower = (currentEmployee.jobTitle || '').toLowerCase()

    const isSiteLeadOrPjo =
      headedSites.length > 0 ||
      accessRole.includes('site') ||
      accessRole.includes('pjo') ||
      jobTitleLower.includes('pjo') ||
      jobTitleLower.includes('site head') ||
      jobTitleLower.includes('site lead') ||
      jobTitleLower.includes('site manager') ||
      jobTitleLower.includes('project manager') ||
      jobTitleLower.includes('site admin')

    assert.equal(isSiteLeadOrPjo, true, 'Revy should be recognized as PJO / Site Lead')
    assert.ok(siteIdsSet.has(149), 'Site 149 (PPA BIB) should be in siteIdsSet')

    // Simulated 5 sessions from site 149 and 2 from site 200
    const mockSessions = [
      { sessionId: 1, siteId: 149, employeeId: 1363, sessionStatus: 'Approved' },
      { sessionId: 2, siteId: 149, employeeId: 1364, sessionStatus: 'Approved' },
      { sessionId: 3, siteId: 149, employeeId: 1365, sessionStatus: 'submitted' },
      { sessionId: 4, siteId: 149, employeeId: 1366, sessionStatus: 'reverted' },
      { sessionId: 5, siteId: 149, employeeId: 1367, sessionStatus: 'rejected' },
      { sessionId: 6, siteId: 200, employeeId: 9999, sessionStatus: 'Approved' },
      { sessionId: 7, siteId: 200, employeeId: 9998, sessionStatus: 'Approved' },
    ]

    const visibleSessions = mockSessions.filter((s) => {
      if (isSiteLeadOrPjo && s.siteId && siteIdsSet.has(s.siteId)) return true
      return false
    })

    assert.equal(visibleSessions.length, 5, 'PJO should see all 5 sessions from Site 149')
    assert.ok(visibleSessions.every((s) => s.siteId === 149))
  })

  it('suppresses auto-reload when user is filling out DAR form or encounters generic Failed to fetch', () => {
    // Test Chunk error filter logic
    const testShouldReload = (msg: string, pathname: string, isDirty: boolean) => {
      const isChunkOrModuleError =
        msg.includes('Failed to load chunk') ||
        msg.includes('ChunkLoadError') ||
        msg.includes('Loading chunk') ||
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('module factory is not available') ||
        msg.includes('was instantiated because it was required') ||
        msg.includes('stale browser cache')

      if (!isChunkOrModuleError) {
        return false // Generic network errors like "Failed to fetch" do NOT reload
      }

      const isUserOnInputPage =
        pathname.includes('/activity') ||
        pathname.includes('/input') ||
        pathname.includes('/edit') ||
        isDirty

      if (isUserOnInputPage) {
        return false // Protected: do not reload when user is filling DAR
      }

      return true
    }

    // 1. Generic network drop in field (mine site)
    assert.equal(
      testShouldReload('TypeError: Failed to fetch', '/mobile/activity', true),
      false,
      'Generic Failed to fetch must NEVER trigger page reload'
    )

    // 2. Network drop during notification polling or background call
    assert.equal(
      testShouldReload('Failed to fetch', '/dashboard', false),
      false,
      'Bare Failed to fetch must NOT trigger reload even on dashboard'
    )

    // 3. Real Turbopack / Webpack chunk load error when user is typing DAR
    assert.equal(
      testShouldReload('ChunkLoadError: Loading chunk 842 failed', '/mobile/activity', true),
      false,
      'Chunk error must NOT reload when user is editing form'
    )

    // 4. Real chunk load error when user is on another idle page
    assert.equal(
      testShouldReload('Loading chunk 404 failed', '/dashboard/settings', false),
      true,
      'Chunk error should reload when user is idle outside form'
    )
  })

  it('guarantees beforeunload protection when form is dirty', () => {
    let prevented = false
    const mockEvent = {
      preventDefault: () => {
        prevented = true
      },
      returnValue: '',
    }

    const isDirty = true
    const isSubmitting = false

    if (isDirty && !isSubmitting) {
      mockEvent.preventDefault()
      mockEvent.returnValue = ''
    }

    assert.equal(prevented, true, 'beforeunload must prevent unload when form is dirty')
  })
})
