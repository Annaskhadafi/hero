import assert from 'node:assert'
import fs from 'node:fs/promises'

async function testTireCountIntegration() {
  const heroSchema = await fs.readFile('db/schema/hero.ts', 'utf8')
  assert.ok(heroSchema.includes("requiresTireCount: boolean('requires_tire_count')"), 'hero.ts missing requiresTireCount column definition')
  assert.ok(heroSchema.includes("tireCount: integer('tire_count')"), 'hero.ts missing tireCount column definition')

  const actions = await fs.readFile('app/dashboard/activity-hub/actions.ts', 'utf8')
  assert.ok(actions.includes('requiresTireCount: formBoolean(false)'), 'actions.ts missing requiresTireCount in manageLibrarySchema')
  assert.ok(actions.includes('tireCount: z.coerce.number()'), 'actions.ts missing tireCount in submitActivitySchema')

  const createForm = await fs.readFile('components/activity-library-create-form.tsx', 'utf8')
  assert.ok(createForm.includes('["requiresTireCount", "Pilihan jumlah tire"]'), 'create form missing Pilihan jumlah tire field')

  const rowActions = await fs.readFile('components/activity-library-row-actions.tsx', 'utf8')
  assert.ok(rowActions.includes('["requiresTireCount", "Pilihan jumlah tire"]'), 'row actions missing Pilihan jumlah tire field')

  const mobileForm = await fs.readFile('components/mobile/mobile-daily-activity-form.tsx', 'utf8')
  assert.ok(mobileForm.includes('requiresTireCount: boolean'), 'mobile form missing requiresTireCount in LibraryOption')
  assert.ok(mobileForm.includes('requiresTireCount?: boolean'), 'mobile form missing requiresTireCount in ChecklistRenderItem')
  assert.ok(mobileForm.includes('Jumlah tire'), 'mobile form missing Jumlah tire input label')
  assert.ok(mobileForm.includes('GpsLocationPreviewCard'), 'mobile form missing GpsLocationPreviewCard component')
  assert.ok(mobileForm.includes('needsGps={needsGps}'), 'mobile form missing conditional needsGps prop')

  const desktopForm = await fs.readFile('components/daily-activity-submit-form.tsx', 'utf8')
  assert.ok(desktopForm.includes('requiresTireCount?: boolean'), 'desktop form missing requiresTireCount in LibraryOption')
  assert.ok(desktopForm.includes('requiresTireCount?: boolean'), 'desktop form missing requiresTireCount in RouteChecklistItem')
  assert.ok(desktopForm.includes('Jumlah Tire'), 'desktop form missing Jumlah tire input label')

  const approvalWorkspace = await fs.readFile('lib/approval-workspace.ts', 'utf8')
  assert.ok(approvalWorkspace.includes('tireCount: activities.tireCount'), 'approval workspace missing tireCount select')

  const approvalWorkbench = await fs.readFile('components/approval-workbench.tsx', 'utf8')
  assert.ok(approvalWorkbench.includes('Tire'), 'approval workbench missing Tire label display')

  const approvalDetails = await fs.readFile('components/approval-request-details.tsx', 'utf8')
  assert.ok(approvalDetails.includes('Jumlah Tire'), 'approval details missing Jumlah Tire label display')

  assert.ok(heroSchema.includes("departmentIds: jsonb('department_ids')"), 'hero.ts missing departmentIds column')
  assert.ok(heroSchema.includes("sectionIds: jsonb('section_ids')"), 'hero.ts missing sectionIds column')

  const multiSelectComp = await fs.readFile('components/activity-department-section-multi-select.tsx', 'utf8')
  assert.ok(multiSelectComp.includes('departmentIds'), 'multi-select component missing departmentIds field')
  assert.ok(multiSelectComp.includes('sectionIds'), 'multi-select component missing sectionIds field')

  console.log('All tire count and multi-select department/section checks passed!')
}

testTireCountIntegration().catch((err) => {
  console.error(err)
  process.exit(1)
})
