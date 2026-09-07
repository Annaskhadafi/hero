import { SecurityUserManagement } from '@/components/security-user-management'
import {
  getSecurityRoleOptions,
  getSecurityUserReferenceData,
  getSecurityUsersData,
} from '@/lib/hero-admin'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SecurityUsersPage() {
  const permission = await getCurrentMenuPermission('security_users')
  if (!permission.canView) redirect('/dashboard')
  const [users, roleOptions, referenceData] = await Promise.all([
    getSecurityUsersData(),
    getSecurityRoleOptions(),
    getSecurityUserReferenceData(),
  ])

  return (
    <SecurityUserManagement
      users={users}
      roleOptions={roleOptions}
      sections={referenceData.sections}
      departments={referenceData.departments}
      positions={referenceData.positions}
      sites={referenceData.sites}
      canEdit={permission.canEdit}
      canDelete={permission.canDelete}
    />
  )
}
