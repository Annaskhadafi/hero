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
    <div className="min-h-screen pb-24">
      {/* Top Navbar: High-Legibility Frosted Glass */}
      <header className="sticky top-0 z-40 border-b border-white/80 bg-white/85 backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 font-display font-black text-2xl text-slate-950 shadow-md border border-amber-300">
              M
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-display text-2xl font-black tracking-tight text-slate-950">
                  MAESTRO<span className="text-amber-500">™</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 border border-amber-200 px-3.5 py-1 text-xs sm:text-sm font-extrabold text-amber-950 shadow-2xs">
                  <Building2 className="h-4 w-4 text-amber-800" />
                  {customer.name}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 hidden sm:block mt-0.5">
                Portal Pemantauan Operasional PT Chitra Paratama
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden text-right sm:block">
              <p className="text-sm sm:text-base font-black text-slate-950">{user.name}</p>
              <p className="text-xs font-bold text-slate-600">{user.email}</p>
            </div>

            <form action={logoutMaestroAction}>
              <Button
                variant="outline"
                size="sm"
                className="h-11 gap-2 rounded-2xl border-slate-300 bg-white px-5 text-xs sm:text-sm font-extrabold text-slate-900 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 shadow-sm transition"
              >
                <LogOut className="h-4 w-4 text-slate-600" />
                <span>Keluar</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 space-y-8">
        {/* Executive Welcome Hero & Live Status Bar */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/85 p-7 sm:p-10 shadow-[0_10px_35px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Col: Main Greetings & Info */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3.5 py-1 text-xs sm:text-sm font-extrabold text-amber-950 shadow-2xs">
                  <Building2 className="h-4 w-4 text-amber-800" />
                  {customer.name} {customer.customerCode ? `(${customer.customerCode})` : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3.5 py-1 text-xs sm:text-sm font-extrabold text-emerald-950 shadow-2xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  Mitra Korporat Terverifikasi
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 leading-tight">
                Selamat Datang, {user.name}
              </h1>

              <p className="text-sm sm:text-base lg:text-lg font-medium text-slate-700 leading-relaxed max-w-3xl">
                Pantau seluruh operasional armada ban OTR, kinerja teknisi lapangan, kepatuhan keselamatan kerja (HSE), dan pelacakan kargo pengiriman di site Anda secara terpadu.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200/90 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-slate-900 shadow-2xs">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  <span>{access.siteIds.length} Site Aktif</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200/90 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-slate-900 shadow-2xs">
                  <Clock className="h-4 w-4 text-sky-600" />
                  <span>Sinkronisasi Data Realtime</span>
                </div>
              </div>
            </div>

            {/* Right Col: Live Operational Status Widget */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-4 rounded-3xl border border-white/90 bg-white/90 p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-600">
                  Status Operasional
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-black text-emerald-950">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  SISTEM AKTIF
                </span>
              </div>

              <div className="space-y-2 py-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-slate-600">Layanan HERO</span>
                  <span className="font-extrabold text-slate-950">Berjalan Normal</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-slate-600">Bantuan AI &amp; Staff</span>
                  <span className="font-extrabold text-indigo-700">24/7 Siap Melayani</span>
                </div>
              </div>

              <Link
                href="/tickets"
                className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-slate-900 transition"
              >
                <Headphones className="h-4 w-4 text-amber-400" />
                <span>Pusat Bantuan &amp; Pengaduan</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-2">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              Modul Operasional &amp; Monitoring
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-700 mt-1">
              Pilih modul layanan di bawah untuk memantau progress aktivitas teknisi, keselamatan kerja, pengiriman, dan tiket.
            </p>
          </div>
        </div>

        {/* Asymmetrical Bento Grid Layout: 2 Tiered Rows with Rich Previews */}
        <div className="space-y-6">
          {/* TIER 1: Activity (7 cols) + Safety (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Card 1: Daily Activity & Servis (Spans 7 cols - Featured Wide Hero Card) */}
            <Link
              href="/activity"
              className="group lg:col-span-7 relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-400/80 hover:bg-white hover:shadow-[0_20px_40px_rgba(2,132,199,0.12)] flex flex-col justify-between"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-800 font-black border border-sky-300 shadow-sm transition group-hover:scale-105">
                    <Activity className="h-8 w-8" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 border border-sky-300 px-3.5 py-1 text-xs sm:text-sm font-black text-sky-950">
                    <span className="h-2 w-2 rounded-full bg-sky-600 animate-pulse" />
                    LIVE SHIFT
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 group-hover:text-sky-700 transition">
                    Daily Activity &amp; Manpower
                  </h3>
                  <p className="mt-2 text-sm sm:text-base font-medium leading-relaxed text-slate-700">
                    Pantau log aktivitas teknisi lapangan secara live per shift, rotasi dan servis ban unit OTR, status pengerjaan, serta rekonsiliasi manpower hadir di site.
                  </p>
                </div>

                {/* Feature Pills Preview */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase">Shift Coverage</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-1">Pagi / Siang / Malam</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase">Inspeksi Ban</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-1">OTR Tyre Service</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase">Dokumentasi</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-1">Foto &amp; Work Order</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-sm sm:text-base font-extrabold text-slate-950 group-hover:text-sky-700 transition">
                  Buka Monitoring Aktivitas &rarr;
                </span>
                <span className="h-10 w-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-sm font-black group-hover:bg-sky-600 shadow-sm transition">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>

            {/* Card 2: Safety & PTW (Spans 5 cols - Focused Tall Card) */}
            <Link
              href="/safety"
              className="group lg:col-span-5 relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-400/80 hover:bg-white hover:shadow-[0_20px_40px_rgba(16,185,129,0.12)] flex flex-col justify-between"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 font-black border border-emerald-300 shadow-sm transition group-hover:scale-105">
                    <FileCheck2 className="h-8 w-8" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3.5 py-1 text-xs sm:text-sm font-black text-emerald-950">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    HSE 100%
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 group-hover:text-emerald-700 transition">
                    Safety &amp; PTW
                  </h3>
                  <p className="mt-2 text-sm sm:text-base font-medium leading-relaxed text-slate-700">
                    Verifikasi izin kerja risiko tinggi (*Permit to Work*), riwayat tanda tangan digital K3, observasi hazard, dan panduan Job Safety Analysis (JSA).
                  </p>
                </div>

                {/* Safety Highlights */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50/70 border border-emerald-200/80 px-4 py-2.5 text-xs sm:text-sm">
                    <span className="font-extrabold text-emerald-950 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      Safe Man Hours Tracked
                    </span>
                    <span className="font-black text-emerald-800">Aktif</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-2.5 text-xs sm:text-sm">
                    <span className="font-bold text-slate-800">Izin Kerja &amp; Approval</span>
                    <span className="font-black text-slate-950">Realtime Audit</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-sm sm:text-base font-extrabold text-slate-950 group-hover:text-emerald-700 transition">
                  Buka Portal Safety &rarr;
                </span>
                <span className="h-10 w-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-sm font-black group-hover:bg-emerald-600 shadow-sm transition">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>

          {/* TIER 2: Cargo Tracking (5 cols) + Helpdesk & Tickets (7 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Card 3: Cargo Tracking & PO (Spans 5 cols - Focused Left Card) */}
            <Link
              href="/tracking"
              className="group lg:col-span-5 relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/80 hover:bg-white hover:shadow-[0_20px_40px_rgba(245,158,11,0.12)] flex flex-col justify-between"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-black border border-amber-300 shadow-sm transition group-hover:scale-105">
                    <PackageCheck className="h-8 w-8" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3.5 py-1 text-xs sm:text-sm font-black text-amber-950">
                    <Truck className="h-4 w-4 text-amber-800" />
                    SUPPLY CHAIN
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 group-hover:text-amber-800 transition">
                    PO &amp; Cargo Tracking
                  </h3>
                  <p className="mt-2 text-sm sm:text-base font-medium leading-relaxed text-slate-700">
                    Pelacakan kargo pengiriman ban &amp; sparepart, dokumen *Cargo Manifest*, status pemenuhan PO, surat jalan SAP DO, dan pemakaian konsinyasi eVHS.
                  </p>
                </div>

                {/* Supply Chain Highlights */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between rounded-2xl bg-amber-50/70 border border-amber-200/80 px-4 py-2.5 text-xs sm:text-sm">
                    <span className="font-extrabold text-amber-950">Cargo Manifest Antar-Site</span>
                    <span className="font-black text-amber-800">Pelacakan Rinci</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-2.5 text-xs sm:text-sm">
                    <span className="font-bold text-slate-800">SAP DO &amp; Konsinyasi eVHS</span>
                    <span className="font-black text-slate-950">Terverifikasi</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-sm sm:text-base font-extrabold text-slate-950 group-hover:text-amber-800 transition">
                  Buka Pelacakan Kargo &rarr;
                </span>
                <span className="h-10 w-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-sm font-black group-hover:bg-amber-500 group-hover:text-slate-950 shadow-sm transition">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>

            {/* Card 4: Helpdesk & Tiket (Spans 7 cols - Wide Interactive Right Card) */}
            <Link
              href="/tickets"
              className="group lg:col-span-7 relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-400/80 hover:bg-white hover:shadow-[0_20px_40px_rgba(99,102,241,0.12)] flex flex-col justify-between"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-800 font-black border border-indigo-300 shadow-sm transition group-hover:scale-105">
                    <Headphones className="h-8 w-8" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 border border-indigo-300 px-3.5 py-1 text-xs sm:text-sm font-black text-indigo-950">
                    <Sparkles className="h-4 w-4 text-indigo-700" />
                    CHITRA AI &amp; STAF HERO
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 group-hover:text-indigo-700 transition">
                    Layanan Bantuan &amp; Tiket Pengaduan
                  </h3>
                  <p className="mt-2 text-sm sm:text-base font-medium leading-relaxed text-slate-700">
                    Sampaikan pertanyaan teknis, kendala servis di site, atau permintaan bantuan darurat. Didukung respon instan asisten cerdas dan eskalasi langsung ke staf HERO.
                  </p>
                </div>

                {/* Features Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl bg-indigo-50/60 border border-indigo-200/80 p-3.5">
                    <p className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-700" />
                      Chitra Smart Ticketing
                    </p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">Diagnosa awal otomatis berbasis AI</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
                    <p className="text-xs font-extrabold text-slate-950 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-emerald-700" />
                      Direct Chat Live Stream
                    </p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">Interaksi langsung dengan staf HERO</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-sm sm:text-base font-extrabold text-slate-950 group-hover:text-indigo-700 transition">
                  Buat Tiket &amp; Lihat Riwayat Pengaduan &rarr;
                </span>
                <span className="h-10 w-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-sm font-black group-hover:bg-indigo-600 shadow-sm transition">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Bottom Support Callout Card */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-white/80 bg-white/80 p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.03)] backdrop-blur-xl">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-bold border border-amber-200 shrink-0">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-950">
                Butuh Bantuan Cepat atau Koordinasi Darurat?
              </h4>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                Tim operasional PT Chitra Paratama siap berkoordinasi 24 jam untuk kelancaran operasional site Anda.
              </p>
            </div>
          </div>

          <Link
            href="/tickets"
            className="h-11 inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-300 px-6 text-xs sm:text-sm font-extrabold text-slate-900 hover:bg-slate-50 shadow-2xs transition shrink-0"
          >
            <Plus className="h-4 w-4 text-amber-600" />
            <span>Buat Tiket Keluhan Baru</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
