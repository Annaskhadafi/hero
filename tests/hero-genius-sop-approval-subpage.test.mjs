import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Hero Genius SOP/WIN Approval Subpage files and routes exist with complete contract parity', () => {
  const root = process.cwd()

  const heroGeniusPage = path.join(root, 'app/dashboard/hero-genius/page.tsx')
  const sopApprovalActions = path.join(root, 'app/dashboard/hero-genius/sop-approval-actions.ts')
  const sopApprovalWorkspace = path.join(root, 'components/hero-genius/genius-sop-win-approval-workspace.tsx')
  const heroGeniusSchema = path.join(root, 'db/schema/hero-genius.ts')

  assert.ok(fs.existsSync(heroGeniusPage), 'Hero Genius main page.tsx must exist')
  assert.ok(fs.existsSync(sopApprovalActions), 'SOP Approval Actions file must exist')
  assert.ok(fs.existsSync(sopApprovalWorkspace), 'GeniusSopWinApprovalWorkspace component must exist')
  assert.ok(fs.existsSync(heroGeniusSchema), 'Hero Genius DB schema must exist')

  // Check Page wiring
  const pageContent = fs.readFileSync(heroGeniusPage, 'utf8')
  assert.ok(pageContent.includes('GeniusSopWinApprovalWorkspace'), 'page.tsx must import GeniusSopWinApprovalWorkspace')
  assert.ok(pageContent.includes('value="sop-approval"'), 'page.tsx must include sop-approval tab trigger')
  assert.ok(pageContent.includes('Generator Approval SOP/WIN'), 'page.tsx tab title must state Generator Approval SOP/WIN')

  // Check Actions wiring
  const actionsContent = fs.readFileSync(sopApprovalActions, 'utf8')
  assert.ok(actionsContent.includes('export async function generateSopWinApprovalAction'), 'Must export generateSopWinApprovalAction')
  assert.ok(actionsContent.includes('export async function publishSopWinApprovalToWorkflowStudioAction'), 'Must export publishSopWinApprovalToWorkflowStudioAction')
  assert.ok(actionsContent.includes('export async function getAvailableSopWinDocumentsAction'), 'Must export getAvailableSopWinDocumentsAction')
  assert.ok(actionsContent.includes('export async function getSavedSopApprovalSystemsAction'), 'Must export getSavedSopApprovalSystemsAction')
  assert.ok(actionsContent.includes('export async function deleteSopApprovalSystemAction'), 'Must export deleteSopApprovalSystemAction')
  assert.ok(actionsContent.includes('STANDARD_SOP_PRESETS'), 'Must export STANDARD_SOP_PRESETS')

  // Check Standard Presets Content
  assert.ok(actionsContent.includes('ptw_safety'), 'Must include PTW safety preset')
  assert.ok(actionsContent.includes('overtime_spl'), 'Must include Overtime SPL preset')
  assert.ok(actionsContent.includes('purchase_pr'), 'Must include Purchase PR preset')
  assert.ok(actionsContent.includes('daily_activity'), 'Must include Daily Activity preset')

  // Check UI Workspace component
  const workspaceContent = fs.readFileSync(sopApprovalWorkspace, 'utf8')
  assert.ok(workspaceContent.includes('SOP & WIN Approval System Generator'), 'Workspace must have main header')
  assert.ok(workspaceContent.includes('Templat Standar HERO'), 'Workspace must have HERO preset option')
  assert.ok(workspaceContent.includes('Library Dokumen SOP/WIN'), 'Workspace must have Library document option')
  assert.ok(workspaceContent.includes('Input Teks SOP Manual'), 'Workspace must have Manual SOP input option')
  assert.ok(workspaceContent.includes('Publikasikan ke Workflow Studio'), 'Workspace must have publish button')
  assert.ok(workspaceContent.includes('Riwayat Sistem Approval SOP'), 'Workspace must have history table')

  // Check Schema Table
  const schemaContent = fs.readFileSync(heroGeniusSchema, 'utf8')
  assert.ok(schemaContent.includes('hero_genius_sop_approval_systems'), 'Schema must define hero_genius_sop_approval_systems table')
})
