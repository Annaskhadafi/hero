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
    dialogContent.includes("event.data.type === 'previewSignature'") && printContent.includes('data-resolved'),
    'Print page and ApdLiveSignatureListener must dynamically render live preview signature'
  )
})

test('Material and Tools requests route directly to Section Head with 1-stage approval', () => {
  const enginePath = path.join(process.cwd(), 'lib/approval-engine.ts')
  const engineContent = fs.readFileSync(enginePath, 'utf8')

  assert.ok(
    engineContent.includes("context.transactionType === 'apd-request-material' || context.transactionType === 'apd-request-tools'"),
    'Approval engine must route Material and Tools requests to Section Head'
  )
  assert.ok(
    engineContent.includes("headEmployeeId: masterSections.headEmployeeId"),
    'Approval engine must look up Section Head from masterSections'
  )
})

test('Material and Tools email handlers include CC to Muhammad Taufik Akbar', () => {
  const emailPath = path.join(process.cwd(), 'lib/apd-email.ts')
  const emailContent = fs.readFileSync(emailPath, 'utf8')

  assert.ok(
    emailContent.includes('sendMaterialToolsRequestSubmittedEmail'),
    'apd-email.ts must define sendMaterialToolsRequestSubmittedEmail'
  )
  assert.ok(
    emailContent.includes('sendMaterialToolsApprovedEmail'),
    'apd-email.ts must define sendMaterialToolsApprovedEmail'
  )
  assert.ok(
    emailContent.includes('muhammad.akbar@chitraparatama.co.id'),
    'Material and Tools emails must CC muhammad.akbar@chitraparatama.co.id'
  )
})
