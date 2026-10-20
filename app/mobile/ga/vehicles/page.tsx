import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Truck, ShieldAlert, CheckCircle2, Clock } from 'lucide-react'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { getAllVehicles, getVehicleMetrics } from '@/app/actions/vehicles'
import { MobileVehiclesClient } from './mobile-vehicles-client'

export const metadata = {
  title: 'Armada Kendaraan Mobile | HERO',
  description: 'Monitoring armada kendaraan dan reminder masa berlaku STNK, Pajak & KIR',
}

export default async function MobileVehiclesPage() {
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

  const [permission, vehicles, metrics] = await Promise.all([
    getCurrentMenuPermission('ga-vehicles'),
    getAllVehicles(),
    getVehicleMetrics(),
  ])

  const isSuper = isSuperAdminRole(currentEmployee.accessRole)
  const canManage = permission.canEdit || isSuper

  const totalExpired = metrics.stnkExpired + metrics.taxExpired + metrics.kirExpired
  const totalWarning = metrics.stnkWarning + metrics.taxWarning + metrics.kirWarning + metrics.serviceWarning

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
                Armada Kendaraan
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full text-xs font-semibold">
            <Truck className="size-3.5 text-sky-300" />
            <span>{vehicles.length} Unit</span>
          </div>
        </div>

        {/* Quick Stat Bar */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2">
            <p className="text-[10px] font-medium text-slate-300">Total Unit</p>
            <p className="text-sm font-black text-white mt-0.5">{metrics.total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2">
            <p className="text-[10px] font-medium text-rose-300">Expired</p>
            <p className="text-sm font-black text-rose-300 mt-0.5">{totalExpired}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2">
            <p className="text-[10px] font-medium text-amber-300">H-30 Alert</p>
            <p className="text-sm font-black text-amber-300 mt-0.5">{totalWarning}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2">
            <p className="text-[10px] font-medium text-emerald-300">Servis Due</p>
            <p className="text-sm font-black text-emerald-300 mt-0.5">{metrics.serviceDue}</p>
          </div>
        </div>
      </div>

      {/* Main Content List & Filters */}
      <div className="px-4 py-4">
        <MobileVehiclesClient vehicles={vehicles} canManage={canManage} />
      </div>
    </div>
  )
}
