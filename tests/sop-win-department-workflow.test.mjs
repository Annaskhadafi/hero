import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('SOP & WIN Dynamic Department Approval Matrix - Schema, Actions & UI Parity', () => {
  const schemaPath = path.join(process.cwd(), 'db/schema/hero.ts')
  const actionsPath = path.join(process.cwd(), 'app/dashboard/sop-win/actions.ts')
  const panelPath = path.join(process.cwd(), 'components/sop-win/sop-win-approval-matrix-panel.tsx')
  const pagePath = path.join(process.cwd(), 'app/dashboard/sop-win/page.tsx')

  assert.ok(fs.existsSync(schemaPath), 'schema file must exist')
  assert.ok(fs.existsSync(actionsPath), 'actions file must exist')
  assert.ok(fs.existsSync(panelPath), 'approval matrix panel file must exist')
  assert.ok(fs.existsSync(pagePath), 'sop-win page file must exist')

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
    /Ria Annisa/,
    'PRESET_DEPARTMENT_WORKFLOWS must include Ria Annisa'
  )
  assert.match(
    actionsContent,
    /Management Representative HSE/,
    'HSE workflow must include Management Representative HSE'
  )
  assert.match(
    actionsContent,
    /Central Service Manager/,
    'Technical workflow must include Central Service Manager'
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

  const pageContent = fs.readFileSync(pagePath, 'utf8')
  assert.match(
    pageContent,
    /Konfigurasi Approval Matrix/,
    'page must include Konfigurasi Approval Matrix tab'
  )
  assert.match(
    pageContent,
    /SopWinApprovalMatrixPanel/,
    'page must render SopWinApprovalMatrixPanel'
  )
})
