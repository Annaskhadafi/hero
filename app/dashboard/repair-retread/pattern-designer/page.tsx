import { Metadata } from 'next'
import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { getTireSizePresets } from '@/app/actions/tire-pattern-actions'
import PatternDesignerClient from './pattern-designer-client'

export const metadata: Metadata = {
  title: 'Pattern Designer — Retread | HERO',
  description: 'Rancang pola ban retread secara digital: analisa referensi, generate 2D seamless, preview 3D, dan cetak gambar kerja A2.',
}

export default async function PatternDesignerPage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/sign-in')

  const presets = await getTireSizePresets()

  return <PatternDesignerClient presets={presets} userEmail={session.user.email} />
}
