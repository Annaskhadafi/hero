import { getLetterArchives, getLetterStats } from '@/app/actions/surat'
import { getActiveMcuClinics } from '@/app/actions/hc-mcu-clinics'
import { db } from '@/db'
import { hrDepartments, hrEmployees, hrOrgNodes, hrPositions, hrSections, hrEmployeeStatuses, hcCandidates, hcRecruitments } from '@/db/schema/hero'
import { and, asc, eq, ilike, or, inArray } from 'drizzle-orm'
import { SuratWorkspaceClient } from './client-page'

export const metadata = {
  title: 'Surat - HC',
}

const HR_SIGNER_OVERRIDES: Record<string, { jobTitle: string; signatureUrl?: string }> = {
  'Adila Tri Arizona': {
    jobTitle: 'HR Recruitement & GA',
    signatureUrl: '/ttd Adila Tri Arizona.png',
  },
  'Kesuma Bagaskara': {
    jobTitle: 'HR Operation & IR',
    signatureUrl: '/ttd Kesuma Bagaskara.png',
  },
  'Muhammad Iqbal': {
    jobTitle: 'HR-GA Supervisor',
    signatureUrl: '/ttd Muhammad Iqbal.png',
  },
  'Putri Rezky Fitriana': {
    jobTitle: 'HR Development & COMBEN',
  },
  'Putri Rezky Putriana': {
    jobTitle: 'HR Development & COMBEN',
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
  const validTabs = ['keterangan', 'tugas', 'mcu', 'penawaran-kerja', 'archive', 'perintah-kerja', 'perubahan-status', 'pengalaman-kerja']
  const initialTab = validTabs.includes(requestedTab || '')
    ? requestedTab || 'keterangan'
    : 'keterangan'
  const [employeesData, hrSignersData, letters, stats, candidatesData, sectionsData, departmentsData, supervisorsData, mcuClinicsData] = await Promise.all([
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
    db
      .select({
        id: hcCandidates.id,
        fullName: hcCandidates.fullName,
        email: hcCandidates.email,
        phone: hcCandidates.phone,
        jobTitle: hcRecruitments.jobTitle,
        department: hcRecruitments.department,
        section: hcRecruitments.section,
        location: hcRecruitments.location,
      })
      .from(hcCandidates)
      .leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id))
      .where(inArray(hcCandidates.currentStage, ['Offering', 'Medical Checkup', 'Hired']))
      .orderBy(asc(hcCandidates.fullName)),
    db
      .select({ name: hrSections.name })
      .from(hrSections)
      .where(eq(hrSections.isActive, true))
      .orderBy(asc(hrSections.name)),
    db
      .select({ name: hrDepartments.name })
      .from(hrDepartments)
      .where(eq(hrDepartments.isActive, true))
      .orderBy(asc(hrDepartments.name)),
    db
      .select({
        id: hrEmployees.id,
        name: hrEmployees.fullName,
        employeeSn: hrEmployees.employeeId,
        section: hrSections.name,
        jobTitle: hrPositions.rankName,
      })
      .from(hrEmployees)
      .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
      .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
      .where(eq(hrEmployees.isActive, true))
      .orderBy(asc(hrEmployees.fullName)),
    getActiveMcuClinics(),
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

  const candidates = candidatesData.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    jobTitle: c.jobTitle || '-',
    department: c.department || '-',
    section: c.section || '-',
    location: c.location || '-',
  }))

  const sections = [...new Set(sectionsData.map((s) => s.name).filter(Boolean))]
  const departments = [...new Set(departmentsData.map((d) => d.name).filter(Boolean))]
  const supervisors = supervisorsData.map((s) => ({
    id: s.id,
    name: s.name,
    employeeSn: s.employeeSn,
    section: s.section || '-',
    jobTitle: s.jobTitle || '-',
  }))

  const mcuClinics = mcuClinicsData.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    city: c.city,
    address: c.address,
    contactPerson: c.contactPerson,
    paketOptions: c.paketOptions as string[] | null,
  }))

  return (
    <SuratWorkspaceClient
      employees={employees}
      hrSigners={hrSigners}
      letters={letters}
      stats={stats}
      candidates={candidates}
      sections={sections}
      departments={departments}
      supervisors={supervisors}
      mcuClinics={mcuClinics}
      initialTab={initialTab}
    />
  )
}
