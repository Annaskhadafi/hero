import React from 'react'
import { notFound } from 'next/navigation'
import { getJsaById } from '@/app/dashboard/hse/jsa/actions'
import { PrintJsaClient } from './print-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PrintJsaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ orientation?: string }>
}) {
  const { id } = await params
  const sp = searchParams ? await searchParams : {}
  const initialOrientation = sp?.orientation === 'landscape' ? 'landscape' : 'portrait'

  const data = await getJsaById(id)
  if (!data) return notFound()

  return <PrintJsaClient data={data as any} initialOrientation={initialOrientation} />
}
