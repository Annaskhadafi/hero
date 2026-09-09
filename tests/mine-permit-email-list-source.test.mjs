import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const reminderSource = readFileSync(
  new URL('../lib/mine-permit-reminder.ts', import.meta.url),
  'utf8'
)
const presetSource = readFileSync(
  new URL('../lib/email-template-presets.ts', import.meta.url),
  'utf8'
)

test('mine permit reminder renders expiring employees as readable bullet points', () => {
  assert.match(reminderSource, /const tableContentHtml = `\s*<ul/)
  assert.match(reminderSource, /<li style=/)
  assert.match(reminderSource, /escapeEmailHtml\(emp\.name\)/)
  assert.doesNotMatch(reminderSource, /const tableRowsHtml/)
})

test('mine permit preset preview uses the same bullet list presentation', () => {
  const minePermitPreset = presetSource.slice(
    presetSource.indexOf("templateCode: 'hc_employee_mine_permit_reminder'"),
    presetSource.indexOf("templateCode: 'five_r_approval_request'")
  )

  assert.match(minePermitPreset, /tableContentHtml:\s*'<ul/)
  assert.doesNotMatch(minePermitPreset, /tableContentHtml:\s*'<table/)
})
