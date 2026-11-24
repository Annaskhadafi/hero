import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

test('sharing is opt-in by default and public token is opaque', () => {
  const schema = read('db/schema/hero.ts')
  assert.ok(schema.includes("businessCardPublicEnabled: boolean('business_card_public_enabled').notNull().default(false)"))
  assert.ok(schema.includes("businessCardPublicToken: text('business_card_public_token').unique()"))
})

test('public page checks sharing and active status, exposing only contact fields', () => {
  const page = read('app/business-card/[token]/page.tsx')
  const resolver = read('lib/public-employee-ecard.ts')
  assert.ok(page.includes('getPublicEmployeeEcard(token)'))
  assert.ok(resolver.includes('eq(employees.businessCardPublicEnabled, true)'))
  assert.ok(resolver.includes('eq(employees.isActive, true)'))
  assert.ok(!/employeeSn|birthDate|domicile|signatureDataUrl|salary/i.test(resolver))
  assert.ok(page.includes('hero.chitraparatama.com'))
  assert.ok(!/employeeSn|birthDate|domicile|signatureDataUrl|salary/i.test(page))
})

test('vCard route checks opt-in and active status and disables caching', () => {
  const route = read('app/business-card/[token]/contact.vcf/route.ts')
  assert.ok(route.includes('getPublicEmployeeEcard(token)'))
  assert.ok(route.includes('if (!employee)'))
  assert.ok(route.includes('private, no-store'))
  assert.ok(route.includes('BEGIN:VCARD'))
  assert.ok(route.includes('escapeVCard'))
  assert.ok(route.includes('X-Content-Type-Options'))
  assert.ok(route.includes('hero.chitraparatama.com'))
})

test('mobile action is authenticated and only changes the current employee', () => {
  const actions = read('app/mobile/profile/actions.ts')
  assert.ok(actions.includes('toggleBusinessCardSharingAction'))
  assert.ok(actions.includes('getCurrentUserManagementEmployee(session.user)'))
  assert.ok(actions.includes('crypto.randomUUID()'))
})

test('profile page connects the mobile card using authenticated employee share fields', () => {
  const page = read('app/mobile/profile/page.tsx')
  assert.ok(page.includes('<MobileBusinessCard'))
  assert.ok(page.includes('businessCardPublicEnabled: employees.businessCardPublicEnabled'))
  assert.ok(page.includes('token={emp?.businessCardPublicAlias || emp?.businessCardPublicToken'))
})

test('migration keeps existing employees opted out', () => {
  const migration = read('drizzle/0063_employee_business_card.sql')
  assert.ok(/business_card_public_enabled.*boolean NOT NULL DEFAULT false/i.test(migration))
  assert.ok(migration.includes('business_card_public_token'))
})

test('mobile card uses the shared Executive profile and explicit opt-in disclosure', () => {
  const ui = read('components/mobile/mobile-business-card.tsx')
  assert.ok(ui.includes('<EmployeeEcard'))
  assert.ok(ui.includes('Share my card'))
  assert.ok(ui.includes('Turn sharing off at any time'))
  assert.ok(ui.includes('hero.chitraparatama.com'))
})
