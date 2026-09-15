import { redirect } from 'next/navigation'
import { SecurityQuickActions } from '@/components/security-quick-actions'
import { getSecurityUserReferenceData, getSecurityUsersData } from '@/lib/hero-admin'
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SecurityQuickActionsPage() {
  const permission = await getCurrentMenuPermission('security_users')
  const role = await getCurrentEmployeeAccessRole()
  if (!permission.canView || !isSuperAdminRole(role)) redirect('/dashboard')
  const [users, referenceData] = await Promise.all([getSecurityUsersData(), getSecurityUserReferenceData()])
  return <SecurityQuickActions users={users} sites={referenceData.sites} canEdit={permission.canEdit} />
}
