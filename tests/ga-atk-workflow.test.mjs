import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('1. Database schema defines hero_master_atk, hero_atk_requests, hero_atk_request_items and exports in db/schema/index.ts', async () => {
  const schema = await read('db/schema/atk.ts')
  assert.match(schema, /heroMasterAtk = pgTable\('hero_master_atk'/)
  assert.match(schema, /heroAtkRequests = pgTable\('hero_atk_requests'/)
  assert.match(schema, /heroAtkRequestItems = pgTable\('hero_atk_request_items'/)
  assert.match(schema, /code: text\('code'\)\.notNull\(\)\.unique\(\)/)
  assert.match(schema, /requestNumber: text\('request_number'\)\.notNull\(\)\.unique\(\)/)
  assert.match(schema, /status: text\('status'\)\.notNull\(\)\.default\('pending_approval'\)/)

  const index = await read('db/schema/index.ts')
  assert.match(index, /export \* from '\.\/atk'/)
})

test('2. Server Actions in app/actions/atk.ts support full lifecycle, approval, and notifications', async () => {
  const actions = await read('app/actions/atk.ts')
  assert.match(actions, /export async function getMasterAtkList/)
  assert.match(actions, /export async function createMasterAtkItem/)
  assert.match(actions, /export async function updateMasterAtkItem/)
  assert.match(actions, /export async function deleteMasterAtkItem/)
  assert.match(actions, /export async function toggleMasterAtkStatus/)
  assert.match(actions, /export async function getAtkRequests/)
  assert.match(actions, /export async function getAtkRequestById/)
  assert.match(actions, /export async function createAtkRequest/)
  assert.match(actions, /export async function updateAtkRequestStatus/)
  assert.match(actions, /export async function deleteAtkRequest/)
  assert.match(actions, /export async function getAtkDashboardMetrics/)
  assert.match(actions, /notifyWorkflowBellRecipients/)
})

test('3. Desktop navigation registers under HRGA -> General Affairs (GA)', async () => {
  const sidebarMode = await read('lib/sidebar-mode.ts')
  assert.match(sidebarMode, /url\.startsWith\("\/dashboard\/ga\/atk"\)/)
  assert.match(sidebarMode, /groupLabel: "General Affairs \(GA\)"/)
})

test('4. Mobile navigation & dashboard services integrate ATK', async () => {
  const mobileAccess = await read('lib/mobile-access.ts')
  assert.match(mobileAccess, /'\/mobile\/atk'/)
  assert.match(mobileAccess, /'\/mobile\/atk\/new'/)
  assert.match(mobileAccess, /desktop: '\/dashboard\/ga\/atk', mobile: '\/mobile\/atk'/)

  const mobileServices = await read('components/mobile/mobile-dashboard-services.tsx')
  assert.match(mobileServices, /title: 'Pengajuan ATK \(Alat Tulis\)'/)
  assert.match(mobileServices, /href: '\/mobile\/atk'/)
})

test('5. Print preview document dialog follows standards (.pdf-wrapper, sm:max-w-7xl, @media print)', async () => {
  const printDialog = await read('components/atk/atk-print-document-dialog.tsx')
  assert.match(printDialog, /pdf-wrapper/)
  assert.match(printDialog, /sm:max-w-7xl/)
  assert.match(printDialog, /@media print/)
  assert.match(printDialog, /size: A4 portrait/)
  assert.match(printDialog, /SURAT PERMINTAAN & BUKTI SERAH TERIMA ALAT TULIS KANTOR/)
})

test('6. TanStack Virtualization table correctly implemented in Desktop ATK Dashboard', async () => {
  const dashboardClient = await read('app/dashboard/ga/atk/atk-dashboard-client.tsx')
  assert.match(dashboardClient, /useVirtualizer/)
  assert.match(dashboardClient, /parentRef/)
  assert.match(dashboardClient, /virtualizer\.getVirtualItems\(\)/)
  assert.match(dashboardClient, /before > 0/)
  assert.match(dashboardClient, /after > 0/)
})

test('7. Mobile ATK detail supports recipient handover confirmation and signature', async () => {
  const mobileDetail = await read('app/mobile/atk/[id]/mobile-atk-detail-client.tsx')
  assert.match(mobileDetail, /Konfirmasi Barang Telah Diterima/)
  assert.match(mobileDetail, /handleConfirmHandover/)
  assert.match(mobileDetail, /recipientSignatureUrl/)
})
