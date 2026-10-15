import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getAtkRequestById } from '@/app/actions/atk'
import { MobileAtkDetailClient } from './mobile-atk-detail-client'

export const metadata = {
  title: 'Detail Pengajuan ATK Mobile | HERO',
  description: 'Informasi rincian permohonan dan serah terima ATK',
}

export default async function MobileAtkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) redirect('/mobile')

  const { id } = await params
  const requestId = Number(id)
  if (isNaN(requestId)) notFound()

  const data = await getAtkRequestById(requestId)
  if (!data) notFound()

  const serializedData = {
    ...data,
    requestDate: data.requestDate ? new Date(data.requestDate).toISOString() : '',
    reviewedAt: data.reviewedAt ? new Date(data.reviewedAt).toISOString() : null,
    completedAt: data.completedAt ? new Date(data.completedAt).toISOString() : null,
    createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <MobileAtkDetailClient
        data={serializedData as any}
        currentEmployee={{
          id: currentEmployee.id,
          name: currentEmployee.name,
          employeeSn: currentEmployee.employeeSn,
        }}
      />
    </div>
  )
}
