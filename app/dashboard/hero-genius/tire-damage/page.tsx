import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { isSuperAdminRole } from '@/lib/hero-access'
import { getVisionModelSettings } from '@/lib/vision-model-settings'
import { DesktopTireDamageClient } from './client-page'

export const metadata: Metadata = {
  title: 'Deteksi Kerusakan Ban (AI) | HERO Genius',
  description: 'Deteksi otomatis kerusakan ban tambang berbasis Computer Vision AI & deep learning.',
}

export const dynamic = 'force-dynamic'

export default async function DesktopTireDamagePage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in?callbackUrl=/dashboard/hero-genius/tire-damage')
  }

  const role = (session.user as any)?.role || ''
  const canConfigureModel = isSuperAdminRole(role) || role.toLowerCase().includes('admin')
  const settings = await getVisionModelSettings()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <DesktopTireDamageClient
        settings={settings}
        canConfigureModel={canConfigureModel}
      />
    </div>
  )
}
