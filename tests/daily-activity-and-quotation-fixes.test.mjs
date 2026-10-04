import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('Daily Activity (DAR) - Batch Overlap Check & Parallel Validation Queries', () => {
  const actionsSource = read('app/dashboard/activity-hub/actions.ts')

  // 1. Batch overlap query replaces N+1 serial for-loop
  assert.match(
    actionsSource,
    /inArray\(activities\.employeeId,\s*allTargetEmployees\.map\(\(e\)\s*=>\s*e\.id\)\)/,
    'Overlap check must batch all employee IDs in one inArray query'
  )

  // 2. Parallel department, section, position validation
  assert.match(
    actionsSource,
    /Promise\.all\(\[\s*emp\.departmentId[\s\S]*?emp\.sectionId[\s\S]*?emp\.positionId[\s\S]*?\]\)/,
    'Department, section, and position validation must run concurrently via Promise.all'
  )

  // 3. Approval step lookups parallelized
  assert.match(
    actionsSource,
    /const\s*\[\[approvalRow\],\s*\[session\]\]\s*=\s*await\s*Promise\.all\(\[/,
    'Approval step and session query must run concurrently via Promise.all'
  )
})

test('Daily Activity (DAR) - Non-blocking Post-submission and Notification Batching', () => {
  const actionsSource = read('app/dashboard/activity-hub/actions.ts')

  // Post-submit side effects running in parallel across members
  assert.match(
    actionsSource,
    /await\s*Promise\.allSettled\(\s*memberActivityInfos\.map\(async\s*\(info\)\s*=>\s*\{/,
    'Member post-submit side effects must run concurrently via Promise.allSettled'
  )

  // Approver emails batch-fetched in one query
  assert.match(
    actionsSource,
    /db\.select\(\{\s*email:\s*employees\.email\s*\}\)\.from\(employees\)\.where\(inArray\(employees\.id,\s*approverEmpIds\)\)/,
    'Approver employee emails must be fetched in a single inArray query'
  )

  // In-app notifications in createDailyActivitySessionAction fired in parallel
  assert.match(
    actionsSource,
    /(?:await|void)\s*Promise\.allSettled\(notificationJobs\)/,
    'In-app notification jobs must be dispatched concurrently via Promise.allSettled'
  )
})

test('Daily Activity (DAR) - Server-Side Draft Actions & Mobile Dual-Autosave', () => {
  const actionsSource = read('app/dashboard/activity-hub/actions.ts')
  const mobileFormSource = read('components/mobile/mobile-daily-activity-form.tsx')

  // Server draft action exported
  assert.match(
    actionsSource,
    /export async function saveActivityDraftToServerAction/,
    'Must export saveActivityDraftToServerAction'
  )
  assert.match(
    actionsSource,
    /export async function loadActivityServerDraftAction/,
    'Must export loadActivityServerDraftAction'
  )
  assert.match(
    actionsSource,
    /status:\s*'draft'/,
    'Draft sessions must be stored with status draft'
  )

  // Mobile form imports and uses server draft action
  assert.match(
    mobileFormSource,
    /saveActivityDraftToServerAction/,
    'Mobile form must import and call saveActivityDraftToServerAction'
  )
  assert.match(
    mobileFormSource,
    /serverAutosaveTimerRef/,
    'Mobile form must have server debounced autosave timer'
  )
  assert.match(
    mobileFormSource,
    /Draft tersimpan aman di server/,
    'Save Draft button must give clear feedback when server draft is persisted'
  )
})

test('Quotation (360-Service) - Auto Collision Resolution on Quotation Number', () => {
  const actionSource = read('app/actions/service360.ts')

  // Ensure collision guard exists in createQuotation
  assert.match(
    actionSource,
    /where\(eq\(service360Quotations\.quotationNumber,\s*finalQuotationNumber\)\)/,
    'createQuotation must check if quotationNumber is already taken'
  )
  assert.match(
    actionSource,
    /finalQuotationNumber\s*=\s*await\s*generateNextQuotationNumber\(\)/,
    'createQuotation must auto-generate next sequence if collision occurs'
  )
})

test('Quotation (360-Service) - Local Storage Auto-Save, Restore Banner, and Save Draft Button', () => {
  const formSource = read('app/dashboard/360-service/quotations/create/quotation-form.tsx')

  // 1. LocalStorage draft key used
  assert.match(
    formSource,
    /service360_quotation_create_draft/,
    'Must use service360_quotation_create_draft in localStorage'
  )

  // 2. Draft detection on mount and restoration banner
  assert.match(
    formSource,
    /Ditemukan draft Quotation dari sesi sebelumnya/,
    'Must display draft restoration banner when previous draft exists'
  )
  assert.match(
    formSource,
    /Pulihkan Draft/,
    'Must provide Pulihkan Draft button'
  )

  // 3. Save Draft button immediately preserves state
  assert.match(
    formSource,
    /Draft berhasil diamankan di browser!/,
    'Save Draft button must confirm local protection'
  )

  // 4. Draft cleanup upon successful submit
  assert.match(
    formSource,
    /localStorage\.removeItem\("service360_quotation_create_draft"\)/,
    'Must remove draft on successful submit'
  )
})
