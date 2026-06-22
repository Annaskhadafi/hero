import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { ProfilePageClient } from './client-page'

export default async function ProfilePage() {
  const [employee, session] = await Promise.all([
    getCurrentEmployee(),
    auth.api.getSession({ headers: await headers() }),
  ])
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
  }

  return <ProfilePageClient profile={profile} />
}
