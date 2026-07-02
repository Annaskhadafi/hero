import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('service form routes reuse shared workspace', () => {
  assert.match(read('app/dashboard/360-service/service-form/page.tsx'), /ServiceFormWorkspace/)
  assert.match(read('app/mobile/service-form/page.tsx'), /ServiceFormWorkspace mobile/)
})

test('service form supports DT and OHT retorque PDF generation', () => {
  const source = read('components/service-forms/service-form-workspace.tsx')

  assert.match(source, /FORM TORQUE AND RETORQUE WHEEL NUT TIRE DT HAULING \/ SE/)
  assert.match(source, /FORM TORQUE AND RETORQUE WHEEL NUT TIRE OHT/)
  assert.match(source, /const MAX_RETORQUE_ROWS = 12/)
  assert.match(source, /variant === ['"]OHT['"] \? 6 : dtRowCount/)
  assert.match(source, /ChitraParatama_Stationery_Letterhead_jkt\.jpg/)
  assert.match(source, /SignatureCanvas/)
  assert.match(source, /new jsPDF\(\{ orientation: ['"]landscape['"]/)
  assert.match(source, /STORAGE_KEY = ['"]hero-service-form-retorque-history['"]/)
  assert.match(source, /function saveRecord\(\)/)
  assert.match(source, /function editRecord\(record: ServiceFormRecord\)/)
  assert.match(source, /MinimalTableShell label=['"]History Retorque['"]/)
  assert.match(source, /onClick=\{\(\) => downloadPdf\(record\)\}/)
})

test('service form is discoverable in desktop and mobile navigation', () => {
  assert.match(read('lib/hero-admin.ts'), /resource: 'service360_service_form'/)
  assert.match(read('lib/hero-admin.ts'), /url: '\/dashboard\/360-service\/service-form'/)
  assert.match(
    read('lib/mobile-access.ts'),
    /desktop: '\/dashboard\/360-service\/service-form', mobile: '\/mobile\/service-form'/
  )
  assert.match(
    read('components/mobile/mobile-app-shell.tsx'),
    /label: 'Service Form', href: '\/mobile\/service-form'/
  )
})
