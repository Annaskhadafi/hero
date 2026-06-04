import { getLetterArchives, getLetterStats } from '@/app/actions/surat'
import { db } from '@/db'
import { hrDepartments, hrEmployees, hrOrgNodes, hrPositions, hrSections, hrEmployeeStatuses } from '@/db/schema/hero'
import { and, asc, eq, ilike, or } from 'drizzle-orm'
import { SuratWorkspaceClient } from './client-page'

export const metadata = {
  title: 'Surat - HC',
}

const HR_SIGNER_OVERRIDES: Record<string, { jobTitle: string; signatureUrl?: string }> = {
  'Adila Tri Arizona': {
    jobTitle: 'HR-GA Admin',
    signatureUrl: '/ttd Adila Tri Arizona.png',
  },
  'Kesuma Bagaskara': {
    jobTitle: 'HR-GA Admin',
    signatureUrl: '/ttd Kesuma Bagaskara.png',
  },
  'Muhammad Iqbal': {
    jobTitle: 'HR-GA Supervisor',
    signatureUrl: '/ttd Muhammad Iqbal.png',
  },
  'Putri Rezky Fitriana': {
    jobTitle: 'HR-GA Admin',
  },
  'Putri Rezky Putriana': {
    jobTitle: 'HR-GA Admin',
  },
  'Rendra Rachman': {
    jobTitle: 'Human Capital Manager',
  },
}

export default async function SuratPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await props.searchParams
  const rawTab = resolvedSearchParams?.tab
  const requestedTab = typeof rawTab === 'string' ? rawTab : undefined
  const initialTab = ['keterangan', 'tugas', 'mcu', 'archive', 'perubahan-status'].includes(requestedTab || '')
    ? requestedTab || 'keterangan'
    : 'keterangan'
  const [employeesData, hrSignersData, letters, stats] = await Promise.all([
    db
      .select({
        id: hrEmployees.id,
        name: hrEmployees.fullName,
        employeeSn: hrEmployees.employeeId,
        joinYear: hrEmployees.joinDate,
        section: hrSections.name,
        jobTitle: hrPositions.rankName,
        levelName: hrPositions.levelName,
        employeeStatusType: hrEmployeeStatuses.name,
      })
      .from(hrEmployees)
      .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
      .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
      .leftJoin(hrEmployeeStatuses, eq(hrEmployees.demographicEmployeeStatusCode, hrEmployeeStatuses.code))
      .where(eq(hrEmployees.isActive, true))
      .orderBy(asc(hrEmployees.fullName)),
    db
      .select({
        id: hrEmployees.id,
        name: hrEmployees.fullName,
        employeeSn: hrEmployees.employeeId,
        jobTitle: hrPositions.rankName,
      })
      .from(hrEmployees)
      .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
      .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
      .leftJoin(hrOrgNodes, eq(hrEmployees.orgNodeId, hrOrgNodes.id))
      .where(
        and(
          eq(hrEmployees.isActive, true),
          or(
            ilike(hrOrgNodes.name, '%HR-GA%'),
            ilike(hrOrgNodes.name, '%HR GA%'),
            ilike(hrOrgNodes.pathText, '%HR-GA%'),
            ilike(hrOrgNodes.pathText, '%HR GA%'),
            eq(hrEmployees.fullName, 'Rendra Rachman')
          )
        )
      )
      .orderBy(asc(hrEmployees.fullName)),
    getLetterArchives(),
    getLetterStats(),
  ])

  const employees = employeesData.map((employee) => ({
    ...employee,
    joinYear: employee.joinYear
      ? new Date(employee.joinYear).getFullYear()
      : new Date().getFullYear(),
    section: employee.section || '-',
    jobTitle: employee.jobTitle || '-',
  }))

  const hrSigners = hrSignersData.map((signer) => {
    const override = HR_SIGNER_OVERRIDES[signer.name]
    return {
      ...signer,
      jobTitle: override?.jobTitle || signer.jobTitle || 'HR & GA Dept. Head',
      signatureUrl: override?.signatureUrl || '',
    }
  })

  return (
    <SuratWorkspaceClient
      employees={employees}
      hrSigners={hrSigners}
      letters={letters}
      stats={stats}
      initialTab={initialTab}
    />
  )
}
