import { db } from '@/db'
import { hrDepartments, hrEmployees, hrOrgNodes, hrPositions, hrSections } from '@/db/schema/hero'
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
        id: hrEmployees.id,
        name: hrEmployees.fullName,
        employeeSn: hrEmployees.employeeId,
        joinYear: hrEmployees.joinDate,
        section: hrSections.name,
        jobTitle: hrPositions.rankName,
      })
      .from(hrEmployees)
      .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
      .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
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
