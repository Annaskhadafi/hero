import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../lib/mine-permit-reminder.ts', import.meta.url), 'utf8')

test('mine permit reminders cap each expired permit at two sends', () => {
  assert.match(source, /minePermitReminderSends/)
  assert.match(source, /send_count < 2/)
  assert.match(source, /permit_expiry_date/)
  assert.match(source, /send_count = GREATEST\(send_count - 1, 0\)/)
})
