import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('lib/apd-data.ts exports fetchApproverOptions with single-source-of-truth hero_employees', () => {
  const apdDataPath = path.join(process.cwd(), 'lib/apd-data.ts')
  const content = fs.readFileSync(apdDataPath, 'utf8')

  assert.ok(
    content.includes('export async function fetchApproverOptions(): Promise<ApproverOption[]>'),
    'lib/apd-data.ts must export fetchApproverOptions helper'
  )
  assert.ok(
    content.includes('masterDepartments') && content.includes('masterSections'),
    'fetchApproverOptions must join masterDepartments and masterSections'
  )
})

test('ApdRequestForm renders 2 Approver dropdowns for Tools and Material with validation', () => {
  const formPath = path.join(process.cwd(), 'app/dashboard/apd/new/apd-form.tsx')
  const content = fs.readFileSync(formPath, 'utf8')

  assert.ok(
    content.includes('approverOptions?: ApproverOption[]'),
    'ApdRequestFormProps must accept approverOptions'
  )
  assert.ok(
    content.includes('approver1Id') && content.includes('approver2Id'),
    'ApdRequestForm must maintain state for approver1Id and approver2Id'
  )
  assert.ok(
    content.includes('requestMode === "tools" || requestMode === "material"'),
    'Approver selection must be rendered for Tools and Material'
  )
  assert.ok(
    content.includes('Approver 1 (Atasan Langsung / Pemeriksa)') &&
    content.includes('Approver 2 (Section Head / Penyetuju Final)'),
    'Approver dropdowns must have clear 2-level labels'
  )
  assert.ok(
    content.includes('approver1Id === approver2Id'),
    'Validation must reject when Approver 1 and Approver 2 are the same employee'
  )
})

test('app/dashboard/apd/actions.ts correctly processes 2-level Approvers and notifies Approver 1', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/apd/actions.ts')
  const content = fs.readFileSync(actionsPath, 'utf8')

  assert.ok(
    content.includes("formData.get('approver1Id')") && content.includes("formData.get('approver2Id')"),
    'submitApdRequest must read approver1Id and approver2Id from FormData'
  )
  assert.ok(
    content.includes("label: 'Atasan Langsung / Pemeriksa'") &&
    content.includes("label: 'Section Head / Penyetuju'"),
    'submitApdRequest must build sequential steps for Approver 1 and Approver 2'
  )
  assert.ok(
    content.includes('sendMaterialToolsRequestSubmittedEmail'),
    'submitApdRequest must dispatch Material/Tools submission email to Approver 1'
  )
  assert.ok(
    content.includes("muhammad.akbar@chitraparatama.co.id"),
    'submitApdRequest must include PIC central in notification bell'
  )
})

test('app/dashboard/apd/new/page.tsx passes approverOptions to ApdRequestForm', () => {
  const pagePath = path.join(process.cwd(), 'app/dashboard/apd/new/page.tsx')
  const content = fs.readFileSync(pagePath, 'utf8')

  assert.ok(
    content.includes('fetchApproverOptions()'),
    'app/dashboard/apd/new/page.tsx must fetch approver options'
  )
  assert.ok(
    content.includes('approverOptions={approverOptions}'),
    'app/dashboard/apd/new/page.tsx must pass approverOptions to ApdRequestForm'
  )
})

test('Mobile request pages pass approverOptions to ApdRequestForm', () => {
  const toolsMobilePath = path.join(process.cwd(), 'app/mobile/tools/new/page.tsx')
  const materialMobilePath = path.join(process.cwd(), 'app/mobile/material/new/page.tsx')
  const apdMobilePath = path.join(process.cwd(), 'app/mobile/apd/new/page.tsx')

  const toolsContent = fs.readFileSync(toolsMobilePath, 'utf8')
  const materialContent = fs.readFileSync(materialMobilePath, 'utf8')
  const apdContent = fs.readFileSync(apdMobilePath, 'utf8')

  assert.ok(toolsContent.includes('approverOptions={approverOptions}'), 'Mobile tools page must pass approverOptions')
  assert.ok(materialContent.includes('approverOptions={approverOptions}'), 'Mobile material page must pass approverOptions')
  assert.ok(apdContent.includes('approverOptions={approverOptions}'), 'Mobile apd page must pass approverOptions')
})
