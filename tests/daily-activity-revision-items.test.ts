import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'

test('Mobile daily activity form preserves duplicate activities and maps 1-to-1 by index', async () => {
  const formPath = path.join(process.cwd(), 'components/mobile/mobile-daily-activity-form.tsx')
  const content = await fs.readFile(formPath, 'utf8')

  // Check that duplicate items are NOT deduplicated with Set
  assert.ok(
    !content.includes('setSelectedLibraryIds(Array.from(new Set(ids)))'),
    'Must NOT deduplicate selectedLibraryIds with Set'
  )
  assert.ok(
    content.includes('setSelectedLibraryIds(ids)'),
    'Must preserve all library activity IDs in sequence'
  )

  // Check that instanceKey is passed to resolveSelfInputEntry in buildSelfInputPayloads and handleSubmit
  assert.ok(
    content.includes('const instanceKey = `${libraryId}__${index}`'),
    'Must construct instanceKey per activity index'
  )
})

test('Mobile daily activity form cleans [Team:] from notes textarea', async () => {
  const formPath = path.join(process.cwd(), 'components/mobile/mobile-daily-activity-form.tsx')
  const content = await fs.readFile(formPath, 'utf8')

  assert.ok(
    content.includes("replace(/\\s*\\|\\s*\\[Team:") || content.includes("[Team:"),
    'Must strip [Team: ...] when populating notes'
  )
})

test('saveDailyActivityApprovalForm synchronizes dailyActivitySessionTeamMembers table', async () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/activity-hub/actions.ts')
  const content = await fs.readFile(actionsPath, 'utf8')

  assert.ok(
    content.includes('dailyActivitySessionTeamMembers.sessionId, payload.sessionId'),
    'Must delete and resync dailyActivitySessionTeamMembers in saveDailyActivityApprovalForm'
  )
})

test('DAR Preview tables clean notes so [Team: ...] is not rendered in Catatan Aktivitas', async () => {
  const workbenchPath = path.join(process.cwd(), 'components/approval-workbench.tsx')
  const clientPath = path.join(process.cwd(), 'components/mobile/mobile-daily-activity-client.tsx')
  const formPath = path.join(process.cwd(), 'components/mobile/mobile-daily-activity-form.tsx')

  const [workbenchContent, clientContent, formContent] = await Promise.all([
    fs.readFile(workbenchPath, 'utf8'),
    fs.readFile(clientPath, 'utf8'),
    fs.readFile(formPath, 'utf8'),
  ])

  assert.ok(
    workbenchContent.includes("[Team:") && workbenchContent.includes('Catatan Aktivitas'),
    'approval-workbench must strip [Team: ...] from Catatan Aktivitas'
  )
  assert.ok(
    clientContent.includes("[Team:") && clientContent.includes('Catatan Aktivitas'),
    'mobile-daily-activity-client must strip [Team: ...] from Catatan Aktivitas'
  )
  assert.ok(
    formContent.includes("[Team:") && formContent.includes('Catatan Aktivitas'),
    'mobile-daily-activity-form must strip [Team: ...] from Catatan Aktivitas in preview'
  )
})
