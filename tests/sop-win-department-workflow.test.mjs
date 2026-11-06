import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('SOP & WIN Dynamic Department Approval Matrix - Schema, Actions & UI Parity', () => {
  const schemaPath = path.join(process.cwd(), 'db/schema/hero.ts')
  const actionsPath = path.join(process.cwd(), 'app/dashboard/sop-win/actions.ts')
  const panelPath = path.join(process.cwd(), 'components/sop-win/sop-win-approval-matrix-panel.tsx')
  const pagePath = path.join(process.cwd(), 'app/dashboard/sop-win/page.tsx')
  const workspacePath = path.join(process.cwd(), 'components/sop-win/sop-win-approval-workspace.tsx')

  assert.ok(fs.existsSync(schemaPath), 'schema file must exist')
  assert.ok(fs.existsSync(actionsPath), 'actions file must exist')
  assert.ok(fs.existsSync(panelPath), 'approval matrix panel file must exist')
  assert.ok(fs.existsSync(pagePath), 'sop-win page file must exist')
  assert.ok(fs.existsSync(workspacePath), 'workspace file must exist')

  const schemaContent = fs.readFileSync(schemaPath, 'utf8')
  assert.match(
    schemaContent,
    /export const sopWinDepartmentWorkflows = pgTable\('hero_sop_win_department_workflows'/,
    'schema must define hero_sop_win_department_workflows table'
  )

  const actionsContent = fs.readFileSync(actionsPath, 'utf8')
  assert.match(
    actionsContent,
    /PRESET_DEPARTMENT_WORKFLOWS/,
    'actions must define PRESET_DEPARTMENT_WORKFLOWS'
  )
  assert.match(
    actionsContent,
    /export async function getSopWinDepartmentWorkflowsAction/,
    'actions must export getSopWinDepartmentWorkflowsAction'
  )
  assert.match(
    actionsContent,
    /export async function upsertSopWinDepartmentWorkflowAction/,
    'actions must export upsertSopWinDepartmentWorkflowAction'
  )
  assert.match(
    actionsContent,
    /export async function seedDefaultSopWinDepartmentWorkflowsAction/,
    'actions must export seedDefaultSopWinDepartmentWorkflowsAction'
  )
  assert.match(
    actionsContent,
    /export async function getSopWinApproverCandidatesAction/,
    'actions must export getSopWinApproverCandidatesAction'
  )
  assert.match(
    actionsContent,
    /export async function syncSopWinRequestWorkflowAction/,
    'actions must export syncSopWinRequestWorkflowAction'
  )

  const panelContent = fs.readFileSync(panelPath, 'utf8')
  assert.match(
    panelContent,
    /Konfigurasi Approval Matrix SOP & WIN/,
    'panel header must exist'
  )
  assert.match(
    panelContent,
    /getSopWinDepartmentWorkflowsAction/,
    'panel must call getSopWinDepartmentWorkflowsAction'
  )
  assert.match(
    panelContent,
    /HeroSearchableSelect/,
    'panel must use HeroSearchableSelect for approver name'
  )
  assert.match(
    panelContent,
    /handleApproverSelect/,
    'panel must implement handleApproverSelect for auto-filling email and name'
  )

  const workspaceContent = fs.readFileSync(workspacePath, 'utf8')
  assert.match(
    workspaceContent,
    /syncSopWinRequestWorkflowAction/,
    'workspace must import syncSopWinRequestWorkflowAction'
  )
  assert.match(
    workspaceContent,
    /handleSyncWorkflow/,
    'workspace must define handleSyncWorkflow'
  )
  assert.match(
    workspaceContent,
    /Sinkronkan Matrix/,
    'workspace must have Sinkronkan Matrix button'
  )
})
