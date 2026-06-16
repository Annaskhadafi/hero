import { Metadata } from 'next'
import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { getTireSizePresets, getPattern } from '@/app/actions/tire-pattern-actions'
import PatternDesignerClient from './pattern-designer-client'

export const metadata: Metadata = {
  title: 'Pattern Designer — Retread | HERO',
  description: 'Rancang pola ban retread secara digital: analisa referensi, generate 2D seamless, preview 3D, dan cetak gambar kerja A2.',
}

interface PageProps {
  searchParams: Promise<{ load?: string }>
}

export default async function PatternDesignerPage({ searchParams }: PageProps) {
  const session = await getServerSession()
  if (!session?.user) redirect('/sign-in')

  const resolvedParams = await searchParams
  const loadId = resolvedParams.load ? parseInt(resolvedParams.load) : undefined
  
  let initialPattern = null
  if (loadId && !isNaN(loadId)) {
    initialPattern = await getPattern(loadId)
  }

  const presets = await getTireSizePresets()

  return (
    <PatternDesignerClient 
      presets={presets} 
      userEmail={session.user.email} 
      initialPattern={initialPattern || undefined} 
    />
  )
}
