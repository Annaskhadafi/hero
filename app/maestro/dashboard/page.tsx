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
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 font-display font-black text-slate-950 shadow-md shadow-amber-500/10">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                  MAESTRO<span className="text-amber-500">™</span>
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                  Customer Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{customer.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-900">{user.name}</p>
              <p className="text-[11px] text-slate-500">{user.email}</p>
            </div>

            <form action={logoutMaestroAction}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Keluar</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Building2 className="h-4 w-4 text-amber-600" />
                <span>{customer.name} {customer.customerCode ? `(${customer.customerCode})` : ''}</span>
              </div>
              <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Selamat Datang, {user.name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Portal pemantauan operasional PT Chitra Paratama aktif untuk lokasi Anda.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>
                Cakupan Lokasi:{' '}
                <strong className="text-slate-900">{access.siteIds.length} Site</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Operational Modules Grid */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
            Modul Operasional & Pemantauan
          </h2>
          <p className="text-xs text-slate-500">
            Akses visibilitas aktivitas, keselamatan, pelacakan PO ban, dan laporan kendala.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/activity"
              className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-amber-400/50 block"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition group-hover:scale-105">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                  Aktif
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900 group-hover:text-amber-700 transition">
                Daily Activity &amp; Servis
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Pantau log pekerjaan harian, timesheet teknisi, dan progress servis di site.
              </p>
              <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-sky-600 group-hover:text-amber-700">
                  Buka Monitoring &rarr;
                </span>
              </div>
            </Link>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">Safety & PTW</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Verifikasi kepatuhan HSE, izin kerja risiko tinggi, dan inspeksi peralatan.
              </p>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <span className="text-[11px] font-medium text-emerald-600">Segera Aktif &rarr;</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <PackageCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">PO & Delivery Tracking</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Pelacakan PO servis dan pengiriman ban terintegrasi dengan One Chitra.
              </p>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <span className="text-[11px] font-medium text-amber-600">Segera Aktif &rarr;</span>
              </div>
            </div>

            <Link
              href="/tickets"
              className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-indigo-400/50 block"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:scale-105">
                  <Headphones className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
                  Aktif
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition">
                Problem Ticketing &amp; Bantuan
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Laporkan keluhan operasional &amp; teknis. Dilayani oleh Chitra Smart Ticketing &amp; staf HERO.
              </p>
              <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-800">
                  Buka Helpdesk Tiket &rarr;
                </span>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
