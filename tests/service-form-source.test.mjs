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
  assert.match(source, /new jsPDF\(\{ orientation: ['"](portrait|landscape)['"]/)
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
    /href: '\/mobile\/service-form'/
  )
})

test('service form supports Tire Inflation Checklist form (CP-CK-BIB-SVC-SEM-FORM-002)', () => {
  const workspace = read('components/service-forms/service-form-workspace.tsx')
  assert.match(workspace, /TireInflationForm/)
  assert.match(workspace, /<TabsTrigger value="tire-inflation">Pengisian Angin<\/TabsTrigger>/)
  assert.match(workspace, /<TabsContent value="tire-inflation">/)

  const inflationForm = read('components/service-forms/tire-inflation-form.tsx')
  assert.match(inflationForm, /CP-CK-BIB-SVC-SEM-FORM-002/)
  assert.match(inflationForm, /FORM CEK-LIST TAHAPAN PENGISIAN ANGIN BAN/)
  assert.match(inflationForm, /Ban Position 1/)
  assert.match(inflationForm, /Ban Position 6/)
  assert.match(inflationForm, /Time Keeper/)
  assert.match(inflationForm, /PARAF PENGAWAS/)
  assert.match(inflationForm, /hero-service-form-tire-inflation-history/)
  assert.match(inflationForm, /new jsPDF\(\{[\s\S]*orientation: 'landscape'/)
})

test('service form supports Tyre Handler Inspection form', () => {
  const workspace = read('components/service-forms/service-form-workspace.tsx')
  assert.match(workspace, /TyreHandlerInspectionForm/)
  assert.match(workspace, /<TabsTrigger value="tyre-handler">Tyre Handler<\/TabsTrigger>/)
  assert.match(workspace, /<TabsContent value="tyre-handler">/)

  const thForm = read('components/service-forms/tyre-handler-inspection-form.tsx')
  assert.match(thForm, /LAPORAN PEMERIKSAAN[\s\S]*HARIAN TYRE HANDLER/)
  assert.match(thForm, /Oil Engine/)
  assert.match(thForm, /Frame Handler/)
  assert.match(thForm, /Machine Hour Meter/)
  assert.match(thForm, /Tambahan Catatan : Keluhan, Kejadian, Kerusakan oleh Departemen Operation/)
  assert.match(thForm, /Tindak Lanjut\/Perbaikan\/Komentar oleh tim Plant/)
  assert.match(thForm, /hero-service-form-tyre-handler-history/)
  assert.match(thForm, /new jsPDF\(\{[\s\S]*orientation: 'portrait'/)
})

test('service form supports Siap dan Hadir form (Form Kesiapan Bekerja)', () => {
  const workspace = read('components/service-forms/service-form-workspace.tsx')
  assert.match(workspace, /SiapHadirForm/)
  assert.match(workspace, /<TabsTrigger value="siap-hadir">Siap dan Hadir<\/TabsTrigger>/)
  assert.match(workspace, /<TabsContent value="siap-hadir">/)

  const shForm = read('components/service-forms/siap-hadir-form.tsx')
  assert.match(shForm, /FORM KESIAPAN BEKERJA/)
  assert.match(shForm, /Konsumsi Obat/)
  assert.match(shForm, /Siap Kerja/)
  assert.match(shForm, /hero-service-form-kesiapan-bekerja-history/)
  assert.match(shForm, /new jsPDF\(\{[\s\S]*orientation: 'portrait'/)
  assert.match(shForm, /getDepartments/)
  assert.match(shForm, /departmentOptions/)

  const actions = read('app/dashboard/360-service/service-form/actions.ts')
  assert.match(actions, /export async function getDepartments/)
})


