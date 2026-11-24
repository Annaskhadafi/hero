import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

test('business card read, save, update and delete actions are authenticated and owner-scoped', () => {
  const actions = read('app/actions/business-card.ts')
  assert.match(actions, /getAuthenticatedSession\('business_cards', 'view'\)/)
  assert.match(actions, /getAuthenticatedSession\('business_cards', rawInput\.id \? 'edit' : 'create'\)/)
  assert.match(actions, /getAuthenticatedSession\('business_cards', 'delete'\)/)
  assert.match(actions, /conditions = \[eq\(expoBusinessCards\.createdById, session\.user\.id\)\]/)
  assert.match(actions, /eq\(expoBusinessCards\.createdById, session\.user\.id\)/)
  assert.match(actions, /createdById: session\.user\.id/)
  assert.match(actions, /returning\(\{ id: expoBusinessCards\.id \}\)/)
})

test('business-card photo proxy authenticates and binds image key to an owned record', () => {
  const route = read('app/api/uploads/[...path]/route.ts')
  assert.equal([...route.matchAll(/await authorizeBusinessCardPhoto\(path\)/g)].length, 2)
  assert.match(route, /if \(!session\?\.user\?\.id\)/)
  assert.match(route, /eq\(expoBusinessCards\.createdById, session\.user\.id\)/)
  assert.ok(route.includes("eq(expoBusinessCards.cardImageUrl, `/api/uploads/${path.join('/')}`)"))
  assert.ok(route.includes("path[0] !== 'business-cards'"))
  assert.match(route, /private, no-store/)
  assert.equal([...route.matchAll(/privatePhoto === false.*status: 404/g)].length, 2)
  const storage = read('lib/s3-storage.ts')
  assert.equal([...storage.matchAll(/includes\('business-cards'\) && !allowPrivateBusinessCard/g)].length, 2)
})

test('scan requires authentication and persistent upload; extraction fallback is never success', () => {
  const actions = read('app/actions/business-card.ts')
  assert.match(actions, /getAuthenticatedSession\('business_cards', 'create'\)/)
  assert.match(actions, /await uploadAnyFileToS3\(file, imagePrefix\(session\.user\.id\)\)/)
  assert.match(actions, /!validated\.cardImageUrl\.startsWith\(imageBase\)/)
  assert.match(actions, /extractionFailed: true/)
  assert.match(actions, /if \(aiResult\.isMockFallback\)/)
})

test('business fields are nullable and migration is additive', () => {
  const schema = read('db/schema/expo-business-cards.ts')
  const migration = read('drizzle/0064_business_card_business_fields.sql')
  assert.match(schema, /businessCategory: text\('business_category'\)/)
  assert.match(schema, /productsServices: text\('products_services'\)/)
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "business_category" text/)
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "products_services" text/)
})
