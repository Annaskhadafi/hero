import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8")
}

test("email template preset registry covers Form WO approval and status templates", () => {
  const source = read("lib/email-template-presets.ts")

  assert.match(source, /templateCode: 'form_wo_approval_request'/)
  assert.match(source, /templateCode: 'form_wo_status_approved'/)
  assert.match(source, /templateCode: 'form_wo_status_rejected'/)
  assert.match(source, /templateCode: 'form_wo_status_reverted'/)
  assert.match(source, /templateCode: 'form_wo_ready_for_wo_number'/)
  assert.match(source, /\['form_wo_', 'Repair & Retread'\]/)
})

test("form-wo email helper exposes approval and status update notification functions", () => {
  const source = read("lib/form-wo-email.ts")

  assert.match(source, /export async function sendFormWoApprovalRequestEmail/)
  assert.match(source, /export async function sendFormWoStatusApprovedEmail/)
  assert.match(source, /export async function sendFormWoStatusRejectedEmail/)
  assert.match(source, /export async function sendFormWoStatusRevertedEmail/)
  assert.match(source, /export async function sendFormWoBillingApprovedEmail/)
  assert.match(source, /export async function sendFormWoReadyForWoNumberEmail/)
  assert.match(source, /templateCode: "form_wo_approval_request"/)
  assert.match(source, /templateCode: "form_wo_status_approved"/)
  assert.match(source, /templateCode: "form_wo_status_rejected"/)
  assert.match(source, /templateCode: "form_wo_status_reverted"/)
  assert.match(source, /templateCode: "form_wo_billing_approved"/)
  assert.match(source, /templateCode: "form_wo_ready_for_wo_number"/)
})

test("form-wo server action triggers email notifications on create and status update", () => {
  const source = read("app/actions/form-wo.ts")

  assert.match(source, /sendFormWoApprovalRequestEmail/)
  assert.match(source, /sendFormWoStatusApprovedEmail/)
  assert.match(source, /sendFormWoStatusRejectedEmail/)
})
