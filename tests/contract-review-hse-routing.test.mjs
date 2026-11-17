import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('contract review source code defines HSE routing helpers and special site detection', () => {
  const actionsSource = read('app/actions/contract-review.ts')

  assert.match(actionsSource, /function isHseSectionOrRole/)
  assert.match(actionsSource, /function isCkSiteName/)
  assert.match(actionsSource, /resolveHseLeaderForSite/)
  assert.match(actionsSource, /Saipudin/)
  assert.match(actionsSource, /Andi Safari/)
  assert.match(actionsSource, /saipudin@chitraparatama\.co\.id/)
  assert.match(actionsSource, /andi\.safari@chitraparatama\.co\.id/)
})

test('contract review resolveApproverForEmployee routes HSE employees directly to Saipudin/Andi Safari, bypassing PJO', () => {
  const actionsSource = read('app/actions/contract-review.ts')

  assert.match(actionsSource, /const isHse = isHseSectionOrRole\(emp\.sectionName, emp\.departmentName, emp\.jobTitle\)/)
  assert.match(actionsSource, /if \(isHse\) \{[\s\S]*?hseLeader = await resolveHseLeaderForSite\(siteName\)/)
  assert.match(actionsSource, /if \(isHse && hseLeader && hseLeader\.id !== emp\.id && hseLeader\.email\) \{[\s\S]*?primaryApprover = hseLeader/)
})

test('contract review buildContractReviewApprovals bypasses PJO site for HSE employees', () => {
  const actionsSource = read('app/actions/contract-review.ts')

  assert.match(actionsSource, /isHseSectionOrRole\(section, '', userEmployee\.jobTitle\)/)
  assert.match(actionsSource, /const hseLeader = await resolveHseLeaderForSite\(siteName\)/)
})

test('contract review exports interactive custom reminder server actions', () => {
  const actionsSource = read('app/actions/contract-review.ts')

  assert.match(actionsSource, /export async function getContractReviewReminderRecipients/)
  assert.match(actionsSource, /export async function sendCustomContractReminder/)
})

test('contract review client form auto-populates Saipudin for CK and Andi Safari for non-CK HSE employees', () => {
  const formSource = read('app/dashboard/hc/contract-review/form/client-form.tsx')

  assert.match(formSource, /isHse/)
  assert.match(formSource, /Saipudin/)
  assert.match(formSource, /Andi Safari/)
  assert.match(formSource, /isCk \? 'Saipudin' : 'Andi Safari'/)
})

test('contract review client page integrates ContractReviewReminderDialog and passes employees', () => {
  const clientPageSource = read('app/dashboard/hc/contract-review/client-page.tsx')

  assert.match(clientPageSource, /ContractReviewReminderDialog/)
  assert.match(clientPageSource, /isReminderDialogOpen/)
  assert.match(clientPageSource, /setIsReminderDialogOpen\(true\)/)
  assert.match(clientPageSource, /allEmployees=\{employees\}/)
})

test('ContractReviewReminderDialog component exists with recipient options and custom picker', () => {
  const dialogSource = read('components/hc/contract-review-reminder-dialog.tsx')

  assert.match(dialogSource, /export function ContractReviewReminderDialog/)
  assert.match(dialogSource, /getContractReviewReminderRecipients/)
  assert.match(dialogSource, /sendCustomContractReminder/)
  assert.match(dialogSource, /HeroSearchableSelect/)
})
