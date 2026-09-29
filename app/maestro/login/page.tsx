import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import {
  BarChart3,
  ChevronRight,
  Headphones,
  Package,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { getMaestroServerSession } from '@/lib/maestro-session'
import { MaestroLoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'MAESTRO™ | PT Chitra Paratama',
  description:
    'Monitoring Aktivitas, Efisiensi, Safety, Transaksi & Reporting Online - PT Chitra Paratama.',
}

export default async function MaestroLoginPage() {
  const session = await getMaestroServerSession()
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden py-12 px-4 sm:px-6 lg:px-8 bg-slate-100/90 text-slate-950">
      {/* Background Graphic */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20">
        <Image
          src="/bg-maestro.png"
          alt="MAESTRO Portal Wallpaper"
          fill
          priority
          quality={100}
          className="object-cover object-center"
        />
      </div>

      {/* Main Two-Column Layout */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1720px] flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16 px-4 sm:px-6 lg:px-8 xl:px-12">
        
        {/* Left Column: Chitra Brand, MAESTRO Acronym, Hero Headline & 4 Feature Floating Pills */}
        <div className="w-full lg:max-w-[680px] flex-1 flex flex-col justify-center">
          
          {/* Brand & Acronym Header */}
          <div className="mb-6 flex flex-wrap items-center gap-3.5">
            <div className="rounded-2xl bg-white p-2.5 border-2 border-slate-300 shadow-sm transition-transform duration-300 hover:scale-105">
              <Image
                src="/cp_logo-removebg-preview.png"
                alt="PT Chitra Paratama Logo"
                width={150}
                height={50}
                priority
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block h-8 w-px bg-slate-300" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xl sm:text-2xl tracking-tight text-slate-950">
                  MAESTRO<span className="text-blue-700">™</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-950 border border-blue-400 px-2.5 py-0.5 text-xs font-black">
                  <Sparkles className="h-3.5 w-3.5 text-blue-700" />
                  Live Portal
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700 leading-tight">
                Monitoring Aktivitas, Efisiensi, Safety, Transaksi &amp; Reporting Online
              </p>
            </div>
          </div>

          {/* Elevated Hero Headline */}
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-[3.25rem] leading-[1.12] tracking-tight text-slate-950">
            Field Operations
            <br />
            &amp; Tire Supply Chain
            <br />
            <span className="text-blue-700">in Real-Time.</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-800 font-semibold max-w-[500px] leading-relaxed">
            Integrated live monitoring portal for PT Chitra Paratama enterprise customers across all operational mining sites.
          </p>

          {/* 4 Feature Cards (2x2 Grid) */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[540px]">
            {/* 1. Daily Activity */}
            <div className="group rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm flex items-center justify-between transition-all duration-200 hover:border-slate-400">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-900 border border-blue-300 font-black">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-black text-xs sm:text-sm text-slate-950 block">
                    Daily Activity
                  </span>
                  <span className="text-xs text-slate-700 font-bold">Progres Teknisi Live</span>
                </div>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition group-hover:text-blue-700 group-hover:translate-x-0.5">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* 2. Safety Compliance */}
            <div className="group rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm flex items-center justify-between transition-all duration-200 hover:border-slate-400">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-black">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-black text-xs sm:text-sm text-slate-950 block">
                    Safety &amp; PTW
                  </span>
                  <span className="text-xs text-slate-700 font-bold">K3 Terverifikasi</span>
                </div>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition group-hover:text-emerald-700 group-hover:translate-x-0.5">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* 3. Tracking PO */}
            <div className="group rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm flex items-center justify-between transition-all duration-200 hover:border-slate-400">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-300 font-black">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-black text-xs sm:text-sm text-slate-950 block">
                    Tracking Logistik
                  </span>
                  <span className="text-xs text-slate-700 font-bold">Manifest &amp; DO</span>
                </div>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition group-hover:text-indigo-700 group-hover:translate-x-0.5">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* 4. Helpdesk */}
            <div className="group rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm flex items-center justify-between transition-all duration-200 hover:border-slate-400">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-900 border border-sky-300 font-black">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-black text-xs sm:text-sm text-slate-950 block">
                    Helpdesk &amp; Tiket
                  </span>
                  <span className="text-xs text-slate-700 font-bold">AI &amp; Staf HERO</span>
                </div>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition group-hover:text-sky-700 group-hover:translate-x-0.5">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Clean White Login Card */}
        <div className="w-full lg:w-[440px] shrink-0 flex justify-center">
          <div className="w-full max-w-[420px] rounded-2xl border-2 border-slate-300 bg-white p-7 sm:p-8 shadow-md">
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-950 border border-blue-400 px-2.5 py-0.5 text-xs font-black mb-3">
                Portal Pelanggan
              </span>
              <h2 className="font-display font-black text-2xl tracking-tight text-slate-950">
                Masuk ke Akun Anda
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-700 font-semibold">
                Akses portal resmi PT Chitra Paratama.
              </p>
            </div>

            <Suspense fallback={<div className="h-44" />}>
              <MaestroLoginForm />
            </Suspense>
          </div>
        </div>

      </main>
    </div>
  )
}
