import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('User Management SAP SN Validation and Search Visibility', () => {
  it('includes inactive users in getSecurityUsersData query so deactivated users can be searched', () => {
    const source = read('lib/hero-admin.ts')
    const start = source.indexOf('export async function getSecurityUsersData')
    const end = source.indexOf('export async function getSecurityRolesData', start)
    const section = source.slice(start, end)

    expect(section).toContain('.from(employees)')
    expect(section).not.toContain('.where(eq(employees.isActive, true))')
  })

  it('performs trimmed, case-insensitive duplicate checks and distinguishes active vs inactive SAP SN matches', () => {
    const source = read('app/dashboard/admin-actions.ts')
    const createStart = source.indexOf("payload.intent === 'create-user'")
    const createEnd = source.indexOf('if (!payload.employeeId)', createStart)
    const createSection = source.slice(createStart, createEnd)

    expect(createSection).toContain('existingEmployeeBySn')
    expect(createSection).toContain('existingEmployeeByEmail')
    expect(createSection).toContain('lower(trim(')
    expect(createSection).toContain('sudah digunakan oleh pengguna aktif')
    expect(createSection).toContain('sudah terdaftar pada pengguna non-aktif')
  })

  it('uses clear SAP NIK/SN label in SecurityUserCreateDialog', () => {
    const source = read('components/security-user-create-dialog.tsx')
    expect(source).toContain('SN / NIK (SAP)')
    expect(source).toContain('resmi dari SAP')
  })
})
