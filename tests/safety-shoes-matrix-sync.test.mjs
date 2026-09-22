import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('fetchSafetyShoesMatrix queries from hero_employees as single source of truth', () => {
  const dataPath = path.join(process.cwd(), 'lib/apd-inventory-data.ts')
  const content = fs.readFileSync(dataPath, 'utf8')

  assert.ok(
    content.includes('.from(employees)') && content.includes('eq(employees.isActive, true)'),
    'fetchSafetyShoesMatrix must query active employees from employees table'
  )

  assert.ok(
    content.includes('.leftJoin(sites, eq(employees.siteId, sites.id))'),
    'fetchSafetyShoesMatrix must join sites on employees.siteId'
  )

  assert.ok(
    content.includes('.leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))'),
    'fetchSafetyShoesMatrix must join masterDepartments on employees.departmentId'
  )

  assert.ok(
    content.includes('.leftJoin(masterSections, eq(employees.sectionId, masterSections.id))'),
    'fetchSafetyShoesMatrix must join masterSections on employees.sectionId'
  )

  assert.ok(
    content.includes('.from(employeeAssets)') && content.includes("ilike(employeeAssets.itemName, \"%sepatu safety%\")"),
    'fetchSafetyShoesMatrix must query safety shoes assets and map to employee rows'
  )
})

test('Safety shoes actions support employee-level updates and revalidates HC and APD paths', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/apd/inventory/safety-shoes/actions.ts')
  const content = fs.readFileSync(actionsPath, 'utf8')

  assert.ok(
    content.includes('revalidatePath("/dashboard/apd/inventory/safety-shoes")'),
    'safety-shoes actions must revalidate safety-shoes path'
  )

  assert.ok(
    content.includes('revalidatePath("/dashboard/hc/employee")'),
    'fast employee actions must also revalidate hc/employee path'
  )

  assert.ok(
    content.includes('updateAssetSize') && content.includes('employeeId'),
    'updateAssetSize must handle employeeId when assetId is not yet present'
  )

  assert.ok(
    content.includes('updateSafetyShoesDate') && content.includes('deleteSafetyShoesRecord'),
    'actions.ts must define updateSafetyShoesDate and deleteSafetyShoesRecord for editing wrong dates'
  )
})

test('HC employee actions trigger revalidation for safety shoes inventory matrix', () => {
  const hcActionsPath = path.join(process.cwd(), 'app/actions/employee.ts')
  const content = fs.readFileSync(hcActionsPath, 'utf8')

  assert.ok(
    content.includes('revalidatePath("/dashboard/apd/inventory/safety-shoes")'),
    'app/actions/employee.ts must revalidate safety-shoes matrix when employee is modified'
  )
})
