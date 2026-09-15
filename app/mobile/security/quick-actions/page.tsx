import { redirect } from 'next/navigation'
import { SecurityQuickActions } from '@/components/security-quick-actions'
import { getSecurityUserReferenceData, getSecurityUsersData } from '@/lib/hero-admin'
import { getCurrentEmployeeAccessRole, isSuperAdminRole } from '@/lib/hero-access'
import { getServerSession } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

export default async function MobileSecurityQuickActionsPage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/sign-in')
  if (!isSuperAdminRole(await getCurrentEmployeeAccessRole())) redirect('/mobile/dashboard')

  const [users, referenceData] = await Promise.all([
    getSecurityUsersData(),
    getSecurityUserReferenceData(),
  ])
  return <SecurityQuickActions users={users} sites={referenceData.sites} canEdit mobile />
}
