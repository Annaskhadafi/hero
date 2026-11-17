import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { listTwibbonTemplatesAction } from '@/app/actions/twibbon'
import { MobileTwibbonView } from '@/components/mobile/mobile-twibbon-view'
import { getServerSession } from '@/lib/auth-session'

export const metadata: Metadata = {
  title: 'Twibbon Studio | HERO Mobile',
  description:
    'Upload foto atau video Anda dan gabungkan otomatis dengan frame Twibbon ukuran Instagram (1:1, 4:5, 9:16).',
}

export const dynamic = 'force-dynamic'

export default async function MobileTwibbonPage({
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
    <div className="w-full">
      <MobileTwibbonView
        initialTemplates={res.success ? res.data : []}
        initialSelectedSlug={params?.template || null}
      />
    </div>
  )
}
