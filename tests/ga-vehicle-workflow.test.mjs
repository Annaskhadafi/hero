import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('1. Database schema defines heroVehicles, heroVehicleServiceLogs and exports in db/schema/index.ts', async () => {
  const schema = await read('db/schema/vehicles.ts')
  assert.match(schema, /heroVehicles = pgTable\('hero_vehicles'/)
  assert.match(schema, /heroVehicleServiceLogs = pgTable\('hero_vehicle_service_logs'/)
  assert.match(schema, /plateNumber: text\('plate_number'\)\.notNull\(\)\.unique\(\)/)
  assert.match(schema, /ownership: text\('ownership'\)/)
  assert.match(schema, /stnkExpiryDate: date\('stnk_expiry_date'\)/)
  assert.match(schema, /taxExpiryDate: date\('tax_expiry_date'\)/)
  assert.match(schema, /kirExpiryDate: date\('kir_expiry_date'\)/)

  const index = await read('db/schema/index.ts')
  assert.match(index, /export \* from '\.\/vehicles'/)
})

test('2. Server Actions in app/actions/vehicles.ts support full lifecycle, reminders, and alerts', async () => {
  const actions = await read('app/actions/vehicles.ts')
  assert.match(actions, /export async function getAllVehicles/)
  assert.match(actions, /export async function getVehicleById/)
  assert.match(actions, /export async function createVehicle/)
  assert.match(actions, /export async function updateVehicle/)
  assert.match(actions, /export async function deleteVehicle/)
  assert.match(actions, /export async function addVehicleServiceLog/)
  assert.match(actions, /export async function triggerVehicleReminderCheck/)
  const vehicleStatusLib = await read('lib/vehicle-status.ts')
  assert.match(vehicleStatusLib, /export function computeVehicleStatus/)
  assert.match(actions, /notifyWorkflowBellRecipients/)
})

test('3. Desktop navigation registers under HRGA -> General Affairs (GA)', async () => {
  const sidebarMode = await read('lib/sidebar-mode.ts')
  assert.match(sidebarMode, /url\.startsWith\("\/dashboard\/ga\/vehicles"\)/)
  assert.match(sidebarMode, /groupLabel: "General Affairs \(GA\)"/)
})

test('4. Mobile navigation & dashboard services integrate GA Vehicles', async () => {
  const mobileAccess = await read('lib/mobile-access.ts')
  assert.match(mobileAccess, /'\/mobile\/ga\/vehicles'/)
  assert.match(mobileAccess, /desktop: '\/dashboard\/ga\/vehicles', mobile: '\/mobile\/ga\/vehicles'/)

  const mobileServices = await read('components/mobile/mobile-dashboard-services.tsx')
  assert.match(mobileServices, /title: 'Armada GA'/)
  assert.match(mobileServices, /href: '\/mobile\/ga\/vehicles'/)
})

test('5. Print preview document dialog follows standards (.pdf-wrapper, sm:max-w-7xl, @media print)', async () => {
  const printDialog = await read('components/vehicles/vehicle-print-dialog.tsx')
  assert.match(printDialog, /pdf-wrapper/)
  assert.match(printDialog, /sm:max-w-7xl/)
  assert.match(printDialog, /@media print/)
  assert.match(printDialog, /size: A4 portrait/)
  assert.match(printDialog, /KARTU IDENTITAS & DATA KELAYAKAN KENDARAAN OPERASIONAL|LEMBAR DATA KENDARAAN & STATUS KELAYAKAN SURAT/)
})

test('6. Desktop Virtualized table conforms to TanStack standard', async () => {
  const dashboardClient = await read('app/dashboard/ga/vehicles/vehicles-dashboard-client.tsx')
  assert.match(dashboardClient, /useVirtualizer/)
  assert.match(dashboardClient, /parentRef/)
  assert.match(dashboardClient, /h-\[600px\]/)
  assert.match(dashboardClient, /scrollbar-thin scrollbar-thumb-accent/)
  assert.match(dashboardClient, /before > 0/)
  assert.match(dashboardClient, /after > 0/)
})

test('7. Central Service Marital Status supports Edit and Delete/Reset of invalid employee records', async () => {
  const actions = await read('app/dashboard/central-service/marital-status/actions.ts')
  assert.match(actions, /export async function updateMarriedEmployeeProfile/)
  assert.match(actions, /export async function resetInvalidMaritalStatusAction/)

  const clientTab = await read('components/marital-status/married-on-site-employees-tab.tsx')
  assert.match(clientTab, /Edit Data Pernikahan/)
  assert.match(clientTab, /Reset & Hapus dari Daftar Married On Site/)
  assert.match(clientTab, /resetInvalidMaritalStatusAction/)
})
