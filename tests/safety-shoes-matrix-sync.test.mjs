import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('fetchSafetyShoesMatrix queries from hero_employees as single source of truth', () => {
  const dataPath = path.join(process.cwd(), 'lib/apd-inventory-data.ts')
  const content = fs.readFileSync(dataPath, 'utf8')

  assert.ok(
    content.includes('.from(employees)') && content.includes('eq(employees.isActive, true)'),
    'fetchSafetyShoesMatrix must query active employees from employees table'
  )

  assert.ok(
    content.includes('.leftJoin(sites, eq(employees.siteId, sites.id))'),
    'fetchSafetyShoesMatrix must join sites on employees.siteId'
  )

  assert.ok(
    content.includes('.leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))'),
    'fetchSafetyShoesMatrix must join masterDepartments on employees.departmentId'
  )

  assert.ok(
    content.includes('.leftJoin(masterSections, eq(employees.sectionId, masterSections.id))'),
    'fetchSafetyShoesMatrix must join masterSections on employees.sectionId'
  )

  assert.ok(
    content.includes('.from(employeeAssets)') && content.includes("ilike(employeeAssets.itemName, \"%sepatu safety%\")"),
    'fetchSafetyShoesMatrix must query safety shoes assets and map to employee rows'
  )
})

test('Safety shoes actions support employee-level updates and revalidates HC and APD paths', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/apd/inventory/safety-shoes/actions.ts')
  const content = fs.readFileSync(actionsPath, 'utf8')

  assert.ok(
    content.includes('revalidatePath("/dashboard/apd/inventory/safety-shoes")'),
    'safety-shoes actions must revalidate safety-shoes path'
  )

  assert.ok(
    content.includes('revalidatePath("/dashboard/hc/employee")'),
    'fast employee actions must also revalidate hc/employee path'
  )

  assert.ok(
    content.includes('updateAssetSize') && content.includes('employeeId'),
    'updateAssetSize must handle employeeId when assetId is not yet present'
  )

  assert.ok(
    content.includes('updateSafetyShoesDate') && content.includes('deleteSafetyShoesRecord'),
    'actions.ts must define updateSafetyShoesDate and deleteSafetyShoesRecord for editing wrong dates'
  )
})

test('HC employee actions trigger revalidation for safety shoes inventory matrix', () => {
  const hcActionsPath = path.join(process.cwd(), 'app/actions/employee.ts')
  const content = fs.readFileSync(hcActionsPath, 'utf8')

  assert.ok(
    content.includes('revalidatePath("/dashboard/apd/inventory/safety-shoes")'),
    'app/actions/employee.ts must revalidate safety-shoes matrix when employee is modified'
  )
})

test('lib/summary-engine.ts syncApprovedApdRequestToSummary verifies status is proses_order or approved before syncing', () => {
  const summaryEnginePath = path.join(process.cwd(), 'lib/summary-engine.ts')
  const content = fs.readFileSync(summaryEnginePath, 'utf8')

  assert.ok(
    content.includes('export async function syncApprovedApdRequestToSummary'),
    'Must export syncApprovedApdRequestToSummary'
  )
  assert.ok(
    content.includes('status: apdRequests.status'),
    'syncApprovedApdRequestToSummary must fetch request status'
  )
  assert.ok(
    content.includes("proses_order"),
    'Must ensure request status is in proses_order before syncing'
  )
  assert.ok(
    content.includes('TOOLS') && content.includes('MATERIAL'),
    'Must exclude TOOLS and MATERIAL from APD Summary'
  )
  assert.ok(
    content.includes('apdSummaryItems'),
    'Must insert summary items into hero_apd_summary_items'
  )
})

test('app/dashboard/apd/actions.ts auto-syncs to summary on proses_order and idempotently populates safety shoes inventory on complete', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/apd/actions.ts')
  const content = fs.readFileSync(actionsPath, 'utf8')

  assert.ok(
    content.includes('syncApprovedApdRequestToSummary'),
    'Must call syncApprovedApdRequestToSummary when status is proses_order'
  )
  assert.ok(
    content.includes("status === 'proses_order'"),
    'Must check status === proses_order'
  )
  assert.ok(
    content.includes("status === 'complete'"),
    'Must check status === complete'
  )
  assert.ok(
    content.includes('isSafetyShoes'),
    'Must distinguish safety shoes from non-safety shoes items'
  )
  assert.ok(
    content.includes('existingForThisRequest'),
    'Must verify idempotency to prevent duplicate entry on retries'
  );
  assert.ok(
    content.includes('revalidatePath(') && content.includes('safety-shoes'),
    'Must revalidate safety-shoes inventory page'
  )
})

test('app/dashboard/admin-actions.ts triggers summary sync when final approval transitions to proses_order', () => {
  const adminActionsPath = path.join(process.cwd(), 'app/dashboard/admin-actions.ts')
  const content = fs.readFileSync(adminActionsPath, 'utf8')

  assert.ok(
    content.includes('requestStatus = isRejected'),
    'Must compute requestStatus'
  )
  assert.ok(
    content.includes('syncApprovedApdRequestToSummary'),
    'Must sync APD request to summary on final approval'
  )
})

test('lib/approval-workspace.ts maps apdSummary generatedByEmployeeId to requester and prevents falling back to approverName', () => {
  const wsPath = path.join(process.cwd(), 'lib/approval-workspace.ts')
  const content = fs.readFileSync(wsPath, 'utf8')

  assert.ok(
    content.includes('(row.apdSummaryId == null ? null : summaryMap.get(row.apdSummaryId)?.generatedByEmployeeId)'),
    'requesterIds must map row.apdSummaryId to summary.generatedByEmployeeId'
  )
  assert.ok(
    content.includes("resolvedRequesterName = 'Pemohon Summary APD'"),
    'resolvedRequesterName must not fall back to row.approverName when apdSummaryId is present'
  )
})

test('lib/apd-reminder.ts separates APD reminder recipients dynamically by stream config', () => {
  const reminderPath = path.join(process.cwd(), 'lib/apd-reminder.ts')
  const content = fs.readFileSync(reminderPath, 'utf8')

  assert.ok(
    content.includes('serviceReminderEmail') && content.includes('repairReminderEmail') && content.includes('teReminderEmail'),
    'Must route APD reminders to stream-specific configs (service, repair, te)'
  )
  assert.ok(
    !content.includes('otoleeh123@gmail.com') && !content.includes('zahiriarjun@gmail.com') && !content.includes('abian.husain@chitraparatama.co.id'),
    'Must not contain hardcoded default email addresses in reminder engine'
  )
})



