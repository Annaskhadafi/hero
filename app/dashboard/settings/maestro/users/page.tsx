import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { getMaestroUserManagementData } from '@/lib/maestro-admin'
import { syncMaestroFoundation } from '@/lib/maestro-pages'
import { MaestroUserManagementClient } from '../user-management-client'

export const dynamic = 'force-dynamic'

export default async function MaestroUsersPage() {
  const [access, role] = await Promise.all([
    getCurrentMenuPermission('settings_maestro_users'),
    getCurrentEmployeeAccessRole(),
  ])

  if (!access.canView && !isSuperAdminRole(role)) redirect('/dashboard')

  await syncMaestroFoundation()
  const data = await getMaestroUserManagementData()

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Pengguna MAESTRO
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola data akun, role, dan hak akses site untuk perwakilan customer.
          </p>
        </div>
        <Button asChild variant="outline" size="dense" className="gap-2">
          <Link href="/dashboard/settings/maestro">
            <ArrowLeft className="size-4" /> Kembali ke Overview
          </Link>
        </Button>
      </header>

      <MaestroUserManagementClient {...data} />
    </div>
  )
}
