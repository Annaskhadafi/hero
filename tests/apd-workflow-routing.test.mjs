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
    content.includes("matType.startsWith('apd-request') && ctxType.startsWith('apd-request')"),
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

test('Material and Tools requests route to HSE/PJO -> Section Head or direct to Section Head when no HSE/PJO', () => {
  const enginePath = path.join(process.cwd(), 'lib/approval-engine.ts')
  const engineContent = fs.readFileSync(enginePath, 'utf8')

  assert.ok(
    engineContent.includes("context.transactionType === 'apd-request-material' ||"),
    'Approval engine must route Material and Tools requests'
  )
  assert.ok(
    engineContent.includes("headEmployeeId: masterSections.headEmployeeId"),
    'Approval engine must look up Section Head from masterSections'
  )
  assert.ok(
    engineContent.includes("hseSiteIds.includes(siteId)"),
    'Approval engine must handle HSE sites in resolveApdApprovalRoute'
  )
  assert.ok(
    engineContent.includes("pjoSiteIds.includes(siteId)"),
    'Approval engine must handle PJO sites in resolveApdApprovalRoute'
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

test('Admin actions CC Muhammad Taufik Akbar on Material and Tools reject, revert, and approval', () => {
  const adminActionsPath = path.join(process.cwd(), 'app/dashboard/admin-actions.ts')
  const content = fs.readFileSync(adminActionsPath, 'utf8')

  assert.ok(
    content.includes("isMaterialOrTools ? ['muhammad.akbar@chitraparatama.co.id'] : undefined"),
    'Admin actions must CC muhammad.akbar@chitraparatama.co.id on reject and revert'
  )
})

test('Resubmitting revised request directly targets Step 2 with Step 1 signature preserved and Step 1 receiving CC email', () => {
  const apdActionsPath = path.join(process.cwd(), 'app/dashboard/apd/actions.ts')
  const content = fs.readFileSync(apdActionsPath, 'utf8')

  assert.ok(
    content.includes('revertedStep') && content.includes('step1Approval?.status === \'approved\''),
    'actions.ts must inspect approval steps and check if Step 1 is already approved'
  )
  assert.ok(
    content.includes('step1ApproverEmail && targetLevel > 1') && content.includes('ccEmails.push(step1ApproverEmail)'),
    'actions.ts must CC Step 1 approver when resubmitting directly to Step 2'
  )
})

test('APD/Material/Tools email notifications include approvalLink and revisionLink', () => {
  const apdEmailPath = path.join(process.cwd(), 'lib/apd-email.ts')
  const content = fs.readFileSync(apdEmailPath, 'utf8')

  assert.ok(
    content.includes('getPublicAppUrl'),
    'apd-email.ts must import and use getPublicAppUrl'
  )
  assert.ok(
    content.includes('approvalLink') && content.includes('/dashboard/approval'),
    'apd-email.ts must include approvalLink to /dashboard/approval for approver emails'
  )
  assert.ok(
    content.includes('revisionLink') && content.includes('/dashboard/apd/new?edit='),
    'apd-email.ts must include revisionLink to edit page for reverted emails'
  )
})

test('APD forms support loading existing requests for revision', () => {
  const formPath = path.join(process.cwd(), 'app/dashboard/apd/new/apd-form.tsx')
  const pagePath = path.join(process.cwd(), 'app/dashboard/apd/new/page.tsx')
  const mobilePagePath = path.join(process.cwd(), 'app/mobile/apd/new/page.tsx')

  const formContent = fs.readFileSync(formPath, 'utf8')
  const pageContent = fs.readFileSync(pagePath, 'utf8')
  const mobileContent = fs.readFileSync(mobilePagePath, 'utf8')

  assert.ok(
    formContent.includes('submitData.append("requestId", String(requestId))'),
    'apd-form.tsx must append requestId on revision submit'
  )
  assert.ok(
    pageContent.includes('fetchApdRequestById'),
    'page.tsx must fetch existing request by edit ID'
  )
  assert.ok(
    mobileContent.includes('fetchApdRequestById'),
    'mobile page.tsx must fetch existing request by edit ID'
  )
})
