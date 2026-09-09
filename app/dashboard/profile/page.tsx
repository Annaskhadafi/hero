import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { auth } from '@/lib/auth'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { ProfilePageClient } from './client-page'

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  let employee = await getCurrentEmployee()

  if (!employee && session?.user?.email) {
    const targetEmail = session.user.email.trim().toLowerCase()
    const [emailEmp] = await db
      .select()
      .from(employees)
      .where(sql`LOWER(TRIM(${employees.email})) = ${targetEmail}`)
      .limit(1)
    if (emailEmp) {
      employee = emailEmp
    }
  }

  if (!employee) return notFound()

  const profile = {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    employeeSn: employee.employeeSn,
    phoneNumber: employee.phoneNumber ?? '',
    domicile: employee.domicile ?? '',
    birthPlaceDate: employee.birthPlaceDate ?? '',
    religion: employee.religion ?? '',
    education: employee.education ?? '',
    maritalStatus: employee.maritalStatus ?? '',
    gender: employee.gender ?? '',
    department: employee.department ?? '',
    section: employee.section ?? '',
    jobTitle: employee.jobTitle ?? '',
    workLocation: employee.workLocation ?? '',
    joinDate: employee.joinDate ?? '',
    contractDurationStart: employee.contractDurationStart ?? '',
    contractDurationEnd: employee.contractDurationEnd ?? '',
    profileImage: session?.user?.image ?? '',
    employmentStatus: employee.employmentStatus ?? '',
    signatureDataUrl: employee.signatureDataUrl ?? null,
    signatureRegisteredAt: employee.signatureRegisteredAt ? new Date(employee.signatureRegisteredAt).toISOString() : null,
  }

  return <ProfilePageClient profile={profile} />
}
