import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  Headphones,
  LogOut,
  MapPin,
  MessageSquare,
  PackageCheck,
  PhoneCall,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  Wrench,
  Zap,
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
    <div className="min-h-screen pb-20 text-slate-950">
      {/* Top Navbar: High-Contrast Modern Header */}
      <header className="sticky top-0 z-40 border-b-2 border-slate-300/80 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex h-16 w-full max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-display font-black text-lg text-white shadow-xs">
              M
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-lg sm:text-xl font-black tracking-tight text-slate-950">
                  MAESTRO<span className="text-blue-700">™</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 text-blue-950 border border-blue-400 px-2.5 py-0.5 text-xs font-bold">
                  <Building2 className="h-3.5 w-3.5 text-blue-700" />
                  {customer.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden text-right sm:block">
              <p className="text-xs sm:text-sm font-extrabold text-slate-950">{user.name}</p>
              <p className="text-xs text-slate-700 font-semibold">{user.email}</p>
            </div>

            <form action={logoutMaestroAction}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 px-3.5 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-700 group-hover:text-rose-700" />
                <span>Keluar</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1720px] px-4 pt-6 sm:px-6 lg:px-8 xl:px-12 flex flex-col gap-5 sm:gap-6">
        {/* Executive Welcome Hero & Live Status Bar */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 shadow-xs flex flex-col lg:flex-row items-stretch justify-between gap-6">
          {/* Left Col: Main Greetings & Info */}
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 text-blue-950 border border-blue-400 px-2.5 py-1 text-xs font-bold">
                <Building2 className="h-3.5 w-3.5 text-blue-700" />
                {customer.name} {customer.customerCode ? `(${customer.customerCode})` : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-400 px-2.5 py-1 text-xs font-bold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                Mitra Korporat Terverifikasi
              </span>
            </div>

            <div className="mt-1">
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
                Selamat Datang, {user.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-700 font-semibold mt-1">
                Portal monitoring real-time aktivitas operasional, kepatuhan K3, logistik ban, dan pusat layanan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-900">
                <MapPin className="h-3.5 w-3.5 text-blue-700" />
                <span>{access.siteIds.length} Site Aktif</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-900">
                <Clock className="h-3.5 w-3.5 text-sky-700" />
                <span>Sinkronisasi Realtime</span>
              </div>
            </div>
          </div>

          {/* Right Col: Live Operational Status Widget */}
          <div className="w-full lg:w-80 flex flex-col justify-between gap-3.5 rounded-xl border-2 border-slate-300 bg-slate-50 p-4 sm:p-5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Status Operasional
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-400 px-2.5 py-0.5 text-xs font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                SISTEM AKTIF
              </span>
            </div>

            <div className="flex items-center justify-between py-1 text-xs">
              <span className="font-bold text-slate-700">Layanan HERO</span>
              <span className="font-black text-slate-950">Berjalan Normal (24/7)</span>
            </div>

            <Link
              href="/tickets"
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-4 text-xs font-black shadow-xs transition-colors"
            >
              <Headphones className="h-4 w-4 text-blue-100" />
              <span>Pusat Bantuan &amp; Pengaduan</span>
            </Link>
          </div>
        </div>

        {/* 4 Core Module Cards: Responsive Fluid Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6 items-stretch">
          {/* Card 1: Daily Activity & Servis */}
          <Link
            href="/activity"
            className="group flex flex-col justify-between h-full relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-blue-500 transition-all duration-200"
          >
            <div className="flex flex-col gap-3.5 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold border border-blue-300 group-hover:scale-105 transition-transform">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-950 border border-blue-400 px-2.5 py-0.5 text-xs font-bold">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  LIVE SHIFT
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-950 group-hover:text-blue-700 transition-colors">
                  Daily Activity &amp; Manpower
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mt-1 font-semibold leading-relaxed">
                  Pantau presensi check-in, jadwal roster, dan pengerjaan log servis harian teknisi OTR secara transparan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-3 py-1 text-xs font-bold">
                  Shift Pagi / Malam
                </span>
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-3 py-1 text-xs font-bold">
                  OTR Tyre Service
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t-2 border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-blue-700 transition-colors">
                Buka Monitoring Aktivitas
              </span>
              <span className="h-9 w-9 rounded-xl bg-slate-100 text-slate-900 group-hover:bg-blue-700 group-hover:text-white flex items-center justify-center transition-colors font-bold">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Card 2: Safety & PTW */}
          <Link
            href="/safety"
            className="group flex flex-col justify-between h-full relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-emerald-500 transition-all duration-200"
          >
            <div className="flex flex-col gap-3.5 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold border border-emerald-300 group-hover:scale-105 transition-transform">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-400 px-2.5 py-0.5 text-xs font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  HSE 100%
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-950 group-hover:text-emerald-700 transition-colors">
                  Safety &amp; PTW
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mt-1 font-semibold leading-relaxed">
                  Manajemen izin kerja berisiko tinggi (PTW), analisis bahaya kerja JSA, serta catatan zero fatality.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-3 py-1 text-xs font-bold">
                  Safe Man Hours
                </span>
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-3 py-1 text-xs font-bold">
                  PTW &amp; JSA K3
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t-2 border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-emerald-700 transition-colors">
                Buka Portal Safety
              </span>
              <span className="h-9 w-9 rounded-xl bg-slate-100 text-slate-900 group-hover:bg-emerald-700 group-hover:text-white flex items-center justify-center transition-colors font-bold">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Card 3: Cargo Tracking & PO */}
          <Link
            href="/tracking"
            className="group flex flex-col justify-between h-full relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-amber-500 transition-all duration-200"
          >
            <div className="flex flex-col gap-3.5 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold border border-amber-300 group-hover:scale-105 transition-transform">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-950 border border-amber-400 px-2.5 py-0.5 text-xs font-bold">
                  <Truck className="h-3.5 w-3.5 text-amber-700" />
                  SUPPLY CHAIN
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-950 group-hover:text-amber-700 transition-colors">
                  PO &amp; Cargo Tracking
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mt-1 font-semibold leading-relaxed">
                  Lacak pergerakan manifest kargo antar site, status DO pengiriman SAP, dan konsinyasi eVHS.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-3 py-1 text-xs font-bold">
                  Cargo Manifest Site
                </span>
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-3 py-1 text-xs font-bold">
                  DO SAP &amp; eVHS
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t-2 border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-amber-700 transition-colors">
                Buka Pelacakan Kargo
              </span>
              <span className="h-9 w-9 rounded-xl bg-slate-100 text-slate-900 group-hover:bg-amber-700 group-hover:text-white flex items-center justify-center transition-colors font-bold">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Card 4: Helpdesk & Tiket */}
          <Link
            href="/tickets"
            className="group flex flex-col justify-between h-full relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-indigo-500 transition-all duration-200"
          >
            <div className="flex flex-col gap-3.5 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold border border-indigo-300 group-hover:scale-105 transition-transform">
                  <Headphones className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 text-indigo-950 border border-indigo-400 px-2.5 py-0.5 text-xs font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-700" />
                  CHITRA AI &amp; STAF
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-950 group-hover:text-indigo-700 transition-colors">
                  Layanan Bantuan &amp; Tiket
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mt-1 font-semibold leading-relaxed">
                  Sampaikan keluhan operasional atau kendala teknis. Respon cerdas otomatis AI dan eskalasi ke staf HERO.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-3 py-1 text-xs font-bold">
                  Smart Ticketing AI
                </span>
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-3 py-1 text-xs font-bold">
                  Live Stream Chat
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t-2 border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-indigo-700 transition-colors">
                Buat Tiket &amp; Riwayat
              </span>
              <span className="h-9 w-9 rounded-xl bg-slate-100 text-slate-900 group-hover:bg-indigo-700 group-hover:text-white flex items-center justify-center transition-colors font-bold">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>

        {/* Bottom Support Callout Card */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-slate-300 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold border border-blue-300 shrink-0">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-950">
                Butuh Bantuan Cepat atau Koordinasi Darurat?
              </h4>
              <p className="text-xs text-slate-700 font-semibold mt-0.5">
                Tim technical support dan operasional HERO siap membantu 24 jam.
              </p>
            </div>
          </div>

          <Link
            href="/tickets"
            className="h-11 inline-flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-5 text-xs font-black shadow-xs transition-colors shrink-0"
          >
            <Plus className="h-4 w-4 text-blue-100" />
            <span>Buat Tiket Baru</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
