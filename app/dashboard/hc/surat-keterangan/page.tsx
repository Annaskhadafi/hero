import { db } from '@/db'
import { employees, hrOrgNodes, hrPositions, masterDepartments, masterSections } from '@/db/schema/hero'
import { and, asc, eq, ilike, or } from 'drizzle-orm'
import { SuratKeteranganClient } from './client-form'

export const metadata = {
  title: 'Surat Keterangan - HC',
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

export default async function SuratKeteranganPage() {
  const [employeesData, hrSignersData] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        joinYear: employees.joinDate,
        section: masterSections.name,
        jobTitle: hrPositions.rankName,
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
      .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
      .leftJoin(hrOrgNodes, eq(employees.orgNodeId, hrOrgNodes.id))
      .where(
        and(
          eq(employees.isActive, true),
          or(
            ilike(hrOrgNodes.name, '%HR-GA%'),
            ilike(hrOrgNodes.name, '%HR GA%'),
            ilike(hrOrgNodes.pathText, '%HR-GA%'),
            ilike(hrOrgNodes.pathText, '%HR GA%'),
            eq(employees.name, 'Rendra Rachman')
          )
        )
      )
      .orderBy(asc(employees.name)),
  ])

  const formattedData = employeesData.map((e) => ({
    ...e,
    joinYear: e.joinYear ? new Date(e.joinYear).getFullYear() : new Date().getFullYear(),
    section: e.section || '-',
    jobTitle: e.jobTitle || '-',
  }))

  const hrSigners = hrSignersData.map((signer) => {
    const override = HR_SIGNER_OVERRIDES[signer.name]
    return {
      ...signer,
      jobTitle: override?.jobTitle || signer.jobTitle || 'HR & GA Dept. Head',
      signatureUrl: override?.signatureUrl || '',
    }
  })

  return <SuratKeteranganClient employees={formattedData} hrSigners={hrSigners} />
}
