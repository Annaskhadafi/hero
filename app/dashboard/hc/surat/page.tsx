import { getLetterArchives, getLetterStats } from '@/app/actions/surat'
import { getActiveMcuClinics } from '@/app/actions/hc-mcu-clinics'
import { db } from '@/db'
import { employees, hrOrgNodes, hrPositions, masterDepartments, masterSections, hcCandidates, hcRecruitments } from '@/db/schema/hero'
import { and, asc, eq, ilike, or, inArray, sql } from 'drizzle-orm'
import { SuratWorkspaceClient } from './client-page'

export const metadata = {
  title: 'Surat - HC',
}

const HR_SIGNER_OVERRIDES: Record<string, { jobTitle: string; signatureUrl?: string }> = {
  'Adila Tri Arizona': {
    jobTitle: 'HR Recruitment & GA',
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
  'Putri R. Fitriana': {
    jobTitle: 'HR Development & Comben',
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
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        joinYear: employees.joinDate,
        section: masterSections.name,
        jobTitle: hrPositions.rankName,
        levelName: hrPositions.levelName,
        employeeStatusType: sql<string>`null::text`,
      })
      .from(employees)
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        jobTitle: hrPositions.rankName,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
      .leftJoin(hrOrgNodes, eq(employees.orgNodeId, hrOrgNodes.id))
      .where(
        and(
          eq(employees.isActive, true),
          or(
            ilike(masterSections.name, '%Human Resources%GA%'),
            ilike(masterSections.name, '%HR%GA%'),
            ilike(employees.section, '%Human Resources%GA%'),
            ilike(employees.section, '%HR%GA%'),
            ilike(hrOrgNodes.name, '%HR-GA%'),
            ilike(hrOrgNodes.name, '%HR GA%'),
            ilike(hrOrgNodes.pathText, '%HR-GA%'),
            ilike(hrOrgNodes.pathText, '%HR GA%'),
            eq(employees.name, 'Rendra Rachman')
          )
        )
      )
      .orderBy(asc(employees.name)),
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
      .select({ name: masterSections.name })
      .from(masterSections)
      .where(eq(masterSections.isActive, true))
      .orderBy(asc(masterSections.name)),
    db
      .select({ name: masterDepartments.name })
      .from(masterDepartments)
      .where(eq(masterDepartments.isActive, true))
      .orderBy(asc(masterDepartments.name)),
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        section: masterSections.name,
        jobTitle: hrPositions.rankName,
      })
      .from(employees)
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
    getActiveMcuClinics(),
  ])

  const employeeList = employeesData.map((employee) => ({
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
      employees={employeeList}
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
