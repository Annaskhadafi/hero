import fs from 'fs'
import path from 'path'

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('user management CRUD source of truth', () => {
  it('renders User Management from employee source', () => {
    const source = read('lib/hero-admin.ts')
    const start = source.indexOf('export async function getSecurityUsersData')
    const section = source.slice(
      start,
      source.indexOf('export async function getSecurityRolesData', start)
    )

    expect(section).toContain('.from(employees)')
    expect(section).not.toContain('.from(hrEmployees)')
  })

  it('writes create and import mutations to employees', () => {
    const source = read('app/dashboard/admin-actions.ts')
    const importStart = source.indexOf('export async function importSecurityUsersAction')
    const importEnd = source.indexOf('export async function manageSecurityUserAction', importStart)
    const importSection = source.slice(importStart, importEnd)
    const createStart = source.indexOf("payload.intent === 'create-user'")
    const createEnd = source.indexOf('if (!payload.employeeId)', createStart)
    const createSection = source.slice(createStart, createEnd)

    expect(importSection).toContain('.from(employees)')
    expect(importSection).toContain('.update(employees)')
    expect(importSection).toContain('.insert(employees)')
    expect(importSection).not.toContain('hrEmployees')
    expect(createSection).toContain('.insert(employees)')
    expect(createSection).toContain('currentDefaultSite')
  })

  it('writes update, status, delete, and bulk mutations to employees', () => {
    const source = read('app/dashboard/admin-actions.ts')
    const manageStart = source.indexOf('export async function manageSecurityUserAction')
    const manageEnd = source.indexOf('// ─── Security Role Management', manageStart)
    const manageSection = source.slice(manageStart, manageEnd)
    const bulkStart = source.indexOf('export async function bulkUserActionsAction')
    const bulkEnd = source.indexOf('// ─── Face Registration Management', bulkStart)
    const bulkSection = source.slice(bulkStart, bulkEnd)

    expect(manageSection).toContain('.from(employees)')
    expect(manageSection).toContain('.update(employees)')
    expect(manageSection).toContain('.delete(employees)')
    expect(manageSection).not.toContain('hrEmployees')
    expect(bulkSection).toContain('.update(employees)')
    expect(bulkSection).toContain('.delete(employees)')
  })

  it('resolves Indonesian export headers during selected-column import updates', () => {
    const source = read('app/dashboard/admin-actions.ts')
    const start = source.indexOf('export async function importUpdateUsersAction')
    const end = source.indexOf('export async function manageSecurityUserAction', start)
    const section = source.slice(start, end)

    expect(section).toContain('const mappedHeaders = autoMapHeaders(headers)')
    expect(section).toContain("name: 'fullName'")
    expect(section).toContain("'lokasi site': 'workLocation'")
    expect(section).toContain('isColumnSelected(headers[')
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

  it('profile edit exposes editable email and persists it to employee auth records', () => {
    const rowActions = read('components/security-user-row-actions.tsx')
    const actions = read('app/dashboard/admin-actions.ts')
    const formStart = rowActions.indexOf('name="intent" value="update-profile"')
    const formEnd = rowActions.indexOf('ProfileSubmitButton', formStart)
    const formSection = rowActions.slice(formStart, formEnd)
    const updateStart = actions.indexOf("payload.intent === 'update-profile'")
    const updateEnd = actions.indexOf("payload.intent === 'ban-user'", updateStart)
    const updateSection = actions.slice(updateStart, updateEnd)

    expect(formSection).toContain('<Input')
    expect(formSection).toContain('name="email"')
    expect(formSection).toContain('type="email"')
    expect(formSection).not.toContain('type="hidden" name="email"')
    expect(updateSection).toContain('isValidEmailFormat(email)')
    expect(updateSection).toContain("message: 'Email is already used by another user.'")
    expect(updateSection).toContain('emailEmployeeOwner')
    expect(updateSection).toContain('emailAuthOwner')
    expect(updateSection).toContain('email,')
    expect(updateSection).toContain('updateCredentialEmailAccountId')
  })
})
