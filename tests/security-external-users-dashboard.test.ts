import fs from 'fs'
import path from 'path'
import { isExternalUserLocation } from '@/components/security-external-users-list'
import type { SecurityUserRecord } from '@/lib/hero-admin'

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('security external users & vendor separation', () => {
  it('correctly identifies Balikpapan External as vendor', () => {
    const internalUser: SecurityUserRecord = {
      id: '1',
      employeeId: 'emp-1',
      employeeSn: '001',
      name: 'John Doe',
      email: 'john@hero.com',
      avatarUrl: null,
      siteId: 1,
      siteName: 'Balikpapan Workshop',
      workLocation: 'Balikpapan Head Office',
      departmentId: null,
      department: 'Operations',
      sectionId: null,
      section: 'Maintenance',
      jobTitle: 'Technician',
      levelName: 'Staff',
      roleId: 1,
      accessRole: 'Technician',
      status: 'active',
      isActive: true,
      lastActive: null,
      createdAt: '2026-01-01',
      employeeStatusType: 'PKWT',
      gender: 'Male',
      religion: 'Islam',
      education: 'D3',
      maritalStatus: 'Menikah',
      pointOfHire: 'Balikpapan',
      joinDate: '2024-01-01',
      contractDurationStart: '2024-01-01',
      contractDurationEnd: '2025-01-01',
      permanentDate: null,
      birthDate: '1995-05-15',
      phoneNumber: null,
      domicile: null,
      directManagerName: null,
      faceEnrolled: false,
      faceImageUrl: null,
      joinYear: 2024,
    }

    expect(isExternalUserLocation(internalUser)).toBe(false)

    // Example given by user: Balikpapan External
    const externalBySiteName: SecurityUserRecord = {
      ...internalUser,
      siteName: 'Balikpapan External',
      workLocation: 'Balikpapan Workshop',
    }
    expect(isExternalUserLocation(externalBySiteName)).toBe(true)

    const externalByWorkLoc: SecurityUserRecord = {
      ...internalUser,
      siteName: 'Balikpapan',
      workLocation: 'Balikpapan External',
    }
    expect(isExternalUserLocation(externalByWorkLoc)).toBe(true)
  })

  it('excludes external vendor users from SecurityUserDashboard metrics', () => {
    const userDash = read('components/security-user-dashboard.tsx')
    expect(userDash).toContain('isExternalUserLocation')
    expect(userDash).toContain('SecurityExternalUsersList')
    expect(userDash).toContain('internalUsers')
    expect(userDash).toContain('externalUsers')
    expect(userDash).toContain('<SecurityExternalUsersList users={externalUsers} />')
  })

  it('excludes external vendor users from SecurityServicemanDashboard metrics', () => {
    const serviceDash = read('components/security-serviceman-dashboard.tsx')
    expect(serviceDash).toContain('isExternalUserLocation')
    expect(serviceDash).toContain('SecurityExternalUsersList')
    expect(serviceDash).toContain('internalUsers')
    expect(serviceDash).toContain('externalUsers')
    expect(serviceDash).toContain('<SecurityExternalUsersList users={externalUsers} />')
  })
})
