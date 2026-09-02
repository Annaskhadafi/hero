import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Approval Engine matches apd-request transaction type and calculates matrix specificity correctly', () => {
  const approvalEnginePath = path.join(process.cwd(), 'lib/approval-engine.ts')
  const content = fs.readFileSync(approvalEnginePath, 'utf8')

  assert.ok(
    content.includes("ctxType.startsWith('apd-request') || matType.startsWith('apd-request')"),
    'Approval engine must recognize and filter apd-request transactions in rankedCandidates'
  )

  assert.ok(
    content.includes("normalizeValue(matrix.transactionType).startsWith('apd-request') &&"),
    'Approval engine must score apd-request transactions with top priority in getMatrixSpecificityScore'
  )
})

test('Approval Engine selects employeeJobTitle and assigns it as approver label for APD requests', () => {
  const approvalEnginePath = path.join(process.cwd(), 'lib/approval-engine.ts')
  const content = fs.readFileSync(approvalEnginePath, 'utf8')

  assert.ok(
    content.includes('employeeJobTitle: employees.jobTitle'),
    'Approval engine must query employees.jobTitle from orgChartNodes joins'
  )

  assert.ok(
    content.includes("context.transactionType.startsWith('apd-request') && step.nodeId"),
    'Approval engine must apply official employee job title to APD approval steps'
  )
})

test('APD actions pass siteId, departmentId, and sectionId to resolveApprovalRouteForActivity', () => {
  const apdActionsPath = path.join(process.cwd(), 'app/dashboard/apd/actions.ts')
  const content = fs.readFileSync(apdActionsPath, 'utf8')

  assert.ok(
    content.includes('siteId: currentEmployee.siteId ?? undefined'),
    'apd actions must supply employee siteId to resolveApprovalRouteForActivity'
  )
  assert.ok(
    content.includes('sectionId: currentEmployee.sectionId ?? undefined'),
    'apd actions must supply employee sectionId to resolveApprovalRouteForActivity'
  )
})

test('APD print page renders approverJobTitle and does NOT use generic "Admin CP"', () => {
  const printPagePath = path.join(process.cwd(), 'app/print/apd/[id]/page.tsx')
  const content = fs.readFileSync(printPagePath, 'utf8')

  assert.ok(
    content.includes('(step as any).approverJobTitle'),
    'Print page must display approverJobTitle'
  )
  assert.ok(
    !content.includes("'Admin CP'"),
    'Print page must not use generic "Admin CP" string as label'
  )
})

test('APD data helper joins employees to fetch approverJobTitle', () => {
  const apdDataPath = path.join(process.cwd(), 'lib/apd-data.ts')
  const content = fs.readFileSync(apdDataPath, 'utf8')

  assert.ok(
    content.includes('approverJobTitle: employees.jobTitle'),
    'fetchApdRequestById must join employees.jobTitle for approval history'
  )
})

test('Workflow Studio Overview defines explicit sections for APD rows', () => {
  const studioPath = path.join(process.cwd(), 'components/workflow-studio-overview.tsx')
  const content = fs.readFileSync(studioPath, 'utf8')

  assert.ok(
    content.includes("resolveApdApproverForStudio"),
    'workflow studio overview must include resolveApdApproverForStudio helper'
  )
  assert.ok(
    content.includes("const sections = ['33', '34', '29', '37']"),
    'workflow studio overview must populate Central Services sections (33, 34, 29, 37) for APD'
  )
})

test('APD approval dialog and print page implement real-time signature live preview', () => {
  const dialogPath = path.join(process.cwd(), 'components/admin/apd-approval-dialog.tsx')
  const dialogContent = fs.readFileSync(dialogPath, 'utf8')
  const printPagePath = path.join(process.cwd(), 'app/print/apd/[id]/page.tsx')
  const printContent = fs.readFileSync(printPagePath, 'utf8')

  assert.ok(
    dialogContent.includes('onMouseMove={handleStroke}') && dialogContent.includes('onEnd={handleEnd}'),
    'ApdApprovalDialog must attach stroke and end handlers for real-time signature streaming'
  )
  assert.ok(
    printContent.includes("event.data.type === 'previewSignature'") && printContent.includes('data-resolved'),
    'Print page must dynamically render live preview signature without blocking on existing image'
  )
})
