import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  FileText,
  Plus,
  ArrowLeft,
  Clock,
  CheckCircle2,
  PackageCheck,
  ChevronRight,
  Package,
  Layers,
} from 'lucide-react'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getAtkRequests } from '@/app/actions/atk'
import { AtkStatusBadge } from '@/components/atk/atk-status-badge'
import { MobileAtkClient } from './mobile-atk-client'

export const metadata = {
  title: 'Pengajuan ATK Mobile | HERO',
  description: 'Permohonan dan status serah terima alat tulis kantor',
}

export default async function MobileAtkPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500 m-4">
        Data employee belum terdaftar untuk akun ini.
      </div>
    )
  }

  // Fetch requests for current user (or department)
  const requests = await getAtkRequests({ ownOnly: false })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header Mobile */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-[#003461] to-[#082033] text-white px-4 pt-3 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/mobile/dashboard"
              className="p-1.5 rounded-lg bg-white/10 active:scale-95 transition-transform"
            >
              <ArrowLeft className="size-5 text-white" />
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-wider uppercase text-sky-300">
                General Affairs (GA)
              </p>
              <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                Pengajuan ATK
              </h1>
            </div>
          </div>

          <Link
            href="/mobile/atk/new"
            className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 active:scale-95 transition-transform text-white font-bold text-xs px-3 py-2 rounded-xl shadow-md"
          >
            <Plus className="size-4" />
            <span>Ajukan</span>
          </Link>
        </div>

        {/* Quick Stat Bar */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5">
            <p className="text-[10px] font-medium text-slate-300">Total Pengajuan</p>
            <p className="text-base font-black text-white mt-0.5">{requests.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5">
            <p className="text-[10px] font-medium text-amber-300">Menunggu</p>
            <p className="text-base font-black text-amber-300 mt-0.5">
              {requests.filter((r) => r.status === 'pending_approval').length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5">
            <p className="text-[10px] font-medium text-emerald-300">Selesai</p>
            <p className="text-base font-black text-emerald-300 mt-0.5">
              {requests.filter((r) => r.status === 'completed').length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content List & Filters */}
      <div className="px-4 py-4">
        <MobileAtkClient requests={requests} currentEmployeeId={currentEmployee.id} />
      </div>
    </div>
  )
}
