import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Daily Activity to SPL auto-generation integration contract', () => {
  // 1. Check server action: createSplFromDailyActivityAction in app/dashboard/daily-activity/actions.ts
  const daActionsPath = path.join(process.cwd(), 'app/dashboard/daily-activity/actions.ts')
  assert.ok(fs.existsSync(daActionsPath), 'Daily activity actions file exists')
  const daActionsContent = fs.readFileSync(daActionsPath, 'utf8')

  assert.ok(
    daActionsContent.includes('export async function createSplFromDailyActivityAction'),
    'Exports createSplFromDailyActivityAction'
  )
  assert.ok(
    daActionsContent.includes('ensureOvertimeApprovalsExist'),
    'Integrates ensureOvertimeApprovalsExist for approval workflow'
  )
  assert.ok(
    daActionsContent.includes("origin: 'daily_activity'"),
    'Creates SPL with origin daily_activity'
  )
  assert.ok(
    daActionsContent.includes('overtimeCommandLetters'),
    'Inserts into overtimeCommandLetters table'
  )
  assert.ok(
    daActionsContent.includes('overtimeCommandLetterParticipants'),
    'Inserts into overtimeCommandLetterParticipants table'
  )
  assert.ok(
    daActionsContent.includes('overtimeCommandLetterItems'),
    'Inserts tasks as line items into overtimeCommandLetterItems table'
  )
  assert.ok(
    daActionsContent.includes('revalidatePath(\'/dashboard/overtime-requests\')'),
    'Revalidates overtime requests page'
  )
  assert.ok(
    daActionsContent.includes('revalidatePath(\'/dashboard/daily-activity\')'),
    'Revalidates daily activity page'
  )

  // 2. Check Overtime Requests exported approval helper
  const otActionsPath = path.join(process.cwd(), 'app/dashboard/overtime-requests/actions.ts')
  assert.ok(fs.existsSync(otActionsPath), 'Overtime actions file exists')
  const otActionsContent = fs.readFileSync(otActionsPath, 'utf8')
  assert.ok(
    otActionsContent.includes('export async function ensureOvertimeApprovalsExist'),
    'Exports ensureOvertimeApprovalsExist for cross-module integration'
  )

  // 3. Check Daily Activity to SPL Modal Component
  const modalPath = path.join(process.cwd(), 'components/daily-activity-create-spl-modal.tsx')
  assert.ok(fs.existsSync(modalPath), 'Daily activity create SPL modal component exists')
  const modalContent = fs.readFileSync(modalPath, 'utf8')

  assert.ok(
    modalContent.includes('export function DailyActivityCreateSplModal'),
    'Exports DailyActivityCreateSplModal'
  )
  assert.ok(
    modalContent.includes('createSplFromDailyActivityAction'),
    'Modal invokes createSplFromDailyActivityAction upon submission'
  )
  assert.ok(
    modalContent.includes('extractOvertimeInfo'),
    'Modal extracts and pre-fills overtime hours, dates, and tasks'
  )
  assert.ok(
    modalContent.includes('HeroInput'),
    'Modal uses standardized HERO Shadcn form template controls'
  )
  assert.ok(
    modalContent.includes('Buka di Modul SPL'),
    'Modal provides direct navigation link to SPL module after generation'
  )

  // 4. Check Daily Activity Client Dashboard integration
  const clientDashboardPath = path.join(process.cwd(), 'app/dashboard/daily-activity/client-dashboard.tsx')
  assert.ok(fs.existsSync(clientDashboardPath), 'Client dashboard exists')
  const clientDashboardContent = fs.readFileSync(clientDashboardPath, 'utf8')

  assert.ok(
    clientDashboardContent.includes('DailyActivityCreateSplModal'),
    'Client dashboard imports and renders DailyActivityCreateSplModal'
  )
  assert.ok(
    clientDashboardContent.includes('handleOpenCreateSpl'),
    'Client dashboard defines handleOpenCreateSpl trigger'
  )
  assert.ok(
    clientDashboardContent.includes('Surat Perintah Lembur Terbit:'),
    'Client dashboard displays prominent banner when SPL is linked'
  )
  assert.ok(
    clientDashboardContent.includes('Buat SPL Lembur'),
    'Client dashboard includes Buat SPL Lembur button'
  )

  // 5. Check Daily Activity Dashboard Data Provider
  const dashboardLibPath = path.join(process.cwd(), 'lib/daily-activity-dashboard.ts')
  assert.ok(fs.existsSync(dashboardLibPath), 'Daily activity dashboard lib exists')
  const dashboardLibContent = fs.readFileSync(dashboardLibPath, 'utf8')

  assert.ok(
    dashboardLibContent.includes('splNumber: overtimeCommandLetters.splNumber'),
    'Dashboard lib selects splNumber from overtimeCommandLetters'
  )
  assert.ok(
    dashboardLibContent.includes('splMetaByEmployeeAndDate'),
    'Dashboard lib maps SPL metadata to employee rows'
  )
  assert.ok(
    dashboardLibContent.includes('splNumber: splMeta?.splNumber'),
    'Dashboard lib attaches splNumber to EmployeeActivityRow'
  )

  // 6. Check Overtime Requests Page Search Params Integration
  const otPagePath = path.join(process.cwd(), 'app/dashboard/overtime-requests/page.tsx')
  assert.ok(fs.existsSync(otPagePath), 'Overtime requests page exists')
  const otPageContent = fs.readFileSync(otPagePath, 'utf8')

  assert.ok(
    otPageContent.includes('initialSearchQuery ='),
    'Overtime requests page resolves searchParams to initialSearchQuery'
  )
  assert.ok(
    otPageContent.includes('initialSearchQuery={initialSearchQuery}'),
    'Overtime requests page passes initialSearchQuery to OvertimeListingClient'
  )
})
