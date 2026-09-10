import { getPtwApprovalByToken } from '@/app/dashboard/hse/izin-kerja-ptw/actions'
import { PtwPublicApproval } from './public-approval'
import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { user } from '@/db/schema/auth'
import { sql } from 'drizzle-orm'

export const revalidate = 0

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function PtwPublicPage({ params }: PageProps) {
  const { token } = await params
  const result = await getPtwApprovalByToken(token)

  if (!result.success || !result.data) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h1 className="text-xl font-semibold text-slate-900">Approval tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-500">
            {result.error || 'Link tidak valid atau approval sudah tidak tersedia.'}
          </p>
        </div>
      </main>
    )
  }

  const { approval, ...restData } = result.data
  const docIdentifier = restData.permitNumber || String(restData.permitId || (restData as any).id || '')

  // 1. Check if user is currently logged in to Hero
  const session = await getServerSession()

  // 2. Check if this approval step belongs to an internal employee / user in Hero
  let isInternalHeroUser = Boolean(approval?.approverEmployeeId)
  if (!isInternalHeroUser && approval?.approverEmail) {
    const normEmail = approval.approverEmail.trim().toLowerCase()
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(sql`lower(${employees.email}) = ${normEmail}`)
      .limit(1)
      .catch(() => [])

    if (emp) {
      isInternalHeroUser = true
    } else {
      const [u] = await db
        .select({ id: user.id })
        .from(user)
        .where(sql`lower(${user.email}) = ${normEmail}`)
        .limit(1)
        .catch(() => [])
      if (u) {
        isInternalHeroUser = true
      }
    }
  }

  // If user is already logged in, redirect straight to Inbox Approval
  if (session?.user) {
    redirect(`/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`)
  }

  // If this step is for an internal employee who is not logged in, redirect to login page with return URL
  if (isInternalHeroUser) {
    const targetUrl = `/dashboard/approval?openDoc=${encodeURIComponent(docIdentifier)}`
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(targetUrl)}`)
  }

  // External vendor without a Hero account -> render public approval page
  return (
    <PtwPublicApproval
      token={token}
      approval={JSON.parse(JSON.stringify(approval))}
      data={JSON.parse(JSON.stringify(restData))}
    />
  )
}
