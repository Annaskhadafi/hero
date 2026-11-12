import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { listTwibbonTemplatesAction } from '@/app/actions/twibbon'
import { getServerSession } from '@/lib/auth-session'
import { TwibbonDesktopClient } from './client-page'

export const metadata: Metadata = {
  title: 'Twibbon Studio | HERO',
  description:
    'Buat template frame PNG ukuran Instagram (1:1, 4:5, 9:16) dan gabungkan foto atau video secara otomatis.',
}

export const dynamic = 'force-dynamic'

export default async function DesktopTwibbonPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user?.email && !session?.user?.id) {
    redirect('/sign-in')
  }

  const params = await searchParams
  const res = await listTwibbonTemplatesAction()

  return (
    <TwibbonDesktopClient
      initialTemplates={res.success ? res.data : []}
      initialSelectedSlug={params?.template || null}
    />
  )
}
