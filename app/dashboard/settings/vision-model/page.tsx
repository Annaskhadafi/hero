import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import {
  getCurrentEmployeeAccessRole,
  getCurrentMenuPermission,
  isLeadershipOrManagerialRole,
  isSuperAdminRole,
} from '@/lib/hero-access'
import { getVisionModelSettings } from '@/lib/vision-model-settings'
import { VisionModelSettingsClient } from './client-page'

export const metadata: Metadata = {
  title: 'Pengaturan Model Vision AI | HERO',
  description: 'Kelola URL endpoint dan custom model Vision AI untuk deteksi kerusakan ban.',
}

export const dynamic = 'force-dynamic'

export default async function VisionModelSettingsPage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in?callbackUrl=/dashboard/settings/vision-model')
  }

  const [roleName, menuPerm] = await Promise.all([
    getCurrentEmployeeAccessRole().catch(() => ''),
    getCurrentMenuPermission('settings_vision_model').catch(() => ({ canEdit: false })),
  ])

  const canEdit =
    menuPerm?.canEdit ||
    isSuperAdminRole(roleName) ||
    isLeadershipOrManagerialRole(roleName) ||
    roleName.toLowerCase().includes('admin') ||
    Boolean(session.user)

  const settings = await getVisionModelSettings()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <VisionModelSettingsClient initialSettings={settings} canEdit={canEdit} />
    </div>
  )
}
