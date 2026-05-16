import fs from 'fs'
import path from 'path'

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('user management CRUD source of truth', () => {
  it('renders User Management from HR employee source', () => {
    const source = read('lib/hero-admin.ts')
    const start = source.indexOf('export async function getSecurityUsersData')
    const section = source.slice(
      start,
      source.indexOf('export async function getSecurityRolesData', start)
    )

    expect(section).toContain('.from(hrEmployees)')
  })

  it('writes create and import mutations to HR employees', () => {
    const source = read('app/dashboard/admin-actions.ts')
    const importStart = source.indexOf('export async function importSecurityUsersAction')
    const importEnd = source.indexOf('export async function manageSecurityUserAction', importStart)
    const importSection = source.slice(importStart, importEnd)
    const createStart = source.indexOf("payload.intent === 'create-user'")
    const createEnd = source.indexOf('if (!payload.employeeId)', createStart)
    const createSection = source.slice(createStart, createEnd)

    expect(importSection).toContain('.from(hrEmployees)')
    expect(importSection).toContain('.update(hrEmployees)')
    expect(importSection).toContain('.insert(hrEmployees)')
    expect(createSection).toContain('.insert(hrEmployees)')
    expect(createSection).toContain('currentDefaultLegacySite')
  })

  it('writes update, status, delete, and bulk mutations to HR employees', () => {
    const source = read('app/dashboard/admin-actions.ts')
    const manageStart = source.indexOf('export async function manageSecurityUserAction')
    const manageEnd = source.indexOf('// ─── Security Role Management', manageStart)
    const manageSection = source.slice(manageStart, manageEnd)
    const bulkStart = source.indexOf('export async function bulkUserActionsAction')
    const bulkEnd = source.indexOf('// ─── Face Registration Management', bulkStart)
    const bulkSection = source.slice(bulkStart, bulkEnd)

    expect(manageSection).toContain('.from(hrEmployees)')
    expect(manageSection).toContain('.update(hrEmployees)')
    expect(manageSection).toContain('.delete(hrEmployees)')
    expect(bulkSection).toContain('.update(hrEmployees)')
    expect(bulkSection).toContain('.delete(hrEmployees)')
  })

  it('row dialog uses tabs and no browser alert', () => {
    const source = read('components/security-user-row-actions.tsx')

    expect(source).toContain('Tabs')
    expect(source).toContain('TabsTrigger value="profile"')
    expect(source).toContain('TabsTrigger value="access"')
    expect(source).toContain('TabsTrigger value="security"')
    expect(source).toContain('TabsTrigger value="danger"')
    expect(source).not.toContain('alert(')
  })

  it('bulk toolbar supports role changes', () => {
    const source = read('components/security-user-bulk-actions.tsx')

    expect(source).toContain("action: 'change-role'")
    expect(source).toContain('roleOptions.map')
    expect(source).toContain("formData.append('roleId'")
  })
})
