import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  Building2,
  FileCheck2,
  Headphones,
  LogOut,
  MapPin,
  PackageCheck,
  ShieldCheck,
  User,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { logoutMaestroAction } from '@/app/maestro/login/actions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard Operasional',
}

export default async function MaestroDashboardPage() {
  const session = await getMaestroServerSession()
  if (!session) {
    redirect('/login')
  }

  const { user, customer, access } = session

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 font-display font-black text-slate-950 shadow-sm">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                  MAESTRO<span className="text-amber-500">™</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  <Building2 className="h-3 w-3 text-slate-400" />
                  {customer.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-900">{user.name}</p>
              <p className="text-[11px] text-slate-400">{user.email}</p>
            </div>

            <form action={logoutMaestroAction}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-full border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-400" />
                <span>Keluar</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-3xl border border-slate-200/70 bg-white p-7 sm:p-9 shadow-2xs">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200/60 px-3 py-1 text-xs font-semibold text-amber-900 mb-3">
                <Building2 className="h-3.5 w-3.5 text-amber-600" />
                <span>{customer.name} {customer.customerCode ? `(${customer.customerCode})` : ''}</span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Selamat Datang, {user.name}
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                Pemantauan operasional PT Chitra Paratama terintegrasi untuk seluruh armada dan site Anda.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
              <div className="flex items-center gap-2 rounded-2xl bg-[#f8f9fa] border border-slate-200/70 px-4 py-3 text-xs text-slate-600">
                <MapPin className="h-4 w-4 text-amber-600" />
                <span>
                  Cakupan Area:{' '}
                  <strong className="font-bold text-slate-900">{access.siteIds.length} Site</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Modules Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
                Modul Operasional &amp; Monitoring
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pilih modul layanan untuk memantau progress teknisi, keselamatan kerja, dan pelacakan tiket.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Daily Activity */}
            <Link
              href="/activity"
              className="group rounded-3xl border border-slate-200/70 bg-white p-6 shadow-2xs transition-all hover:shadow-md hover:border-slate-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition group-hover:scale-105">
                    <Activity className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                    Live
                  </span>
                </div>
                <h3 className="mt-5 text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">
                  Daily Activity &amp; Servis
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Pantau log aktivitas teknisi harian, status pengerjaan ban, dan progres servis di site.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700">
                  Buka Monitoring
                </span>
                <span className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                  &rarr;
                </span>
              </div>
            </Link>

            {/* 2. Safety & PTW */}
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-2xs flex flex-col justify-between opacity-80">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    Tahap 2
                  </span>
                </div>
                <h3 className="mt-5 text-sm font-bold text-slate-900">Safety &amp; PTW</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Verifikasi kepatuhan HSE, izin kerja risiko tinggi, dan inspeksi keselamatan peralatan.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-400">Segera Hadir</span>
              </div>
            </div>

            {/* 3. PO & Delivery Tracking */}
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-2xs flex flex-col justify-between opacity-80">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <PackageCheck className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    Tahap 2
                  </span>
                </div>
                <h3 className="mt-5 text-sm font-bold text-slate-900">PO &amp; Delivery Tracking</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Pelacakan pengiriman ban, status PO servis, dan rekonsiliasi pengiriman unit.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-400">Segera Hadir</span>
              </div>
            </div>

            {/* 4. Problem Ticketing */}
            <Link
              href="/tickets"
              className="group rounded-3xl border border-slate-200/70 bg-white p-6 shadow-2xs transition-all hover:shadow-md hover:border-slate-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:scale-105">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
                    Aktif
                  </span>
                </div>
                <h3 className="mt-5 text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  Helpdesk &amp; Tiket
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Laporkan kebutuhan kendala teknis dan operasional secara langsung ke tim HERO.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                  Buka Helpdesk
                </span>
                <span className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs group-hover:bg-indigo-600 transition">
                  &rarr;
                </span>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
