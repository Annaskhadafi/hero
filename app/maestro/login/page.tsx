import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import {
  BarChart3,
  ChevronRight,
  Headphones,
  Package,
  ShieldCheck,
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
    <div className="relative min-h-screen w-full bg-[#f8f9fa] text-slate-900 flex items-center justify-center overflow-x-hidden">
      {/* Background Graphic: Provided bg maestro.png */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
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
      <main className="relative z-10 mx-auto flex w-full max-w-[1380px] flex-col lg:flex-row items-center justify-between px-6 py-10 sm:px-10 lg:px-16 lg:py-16 gap-10 lg:gap-8">
        
        {/* Left Column: Chitra Brand, MAESTRO Acronym, Hero Headline & 4 Feature Pills */}
        <div className="w-full lg:max-w-[620px] md:pl-28 lg:pl-16 flex flex-col justify-center">
          
          {/* Brand & Acronym Header */}
          <div className="mb-6 flex flex-wrap items-center gap-3.5">
            <Image
              src="/cp_logo-removebg-preview.png"
              alt="PT Chitra Paratama Logo"
              width={160}
              height={60}
              priority
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-xs"
            />
            <div className="hidden sm:block h-8 w-px bg-slate-300/70" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                  MAESTRO<span className="text-[#c97a00]">™</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 leading-tight">
                Monitoring Aktivitas, Efisiensi, Safety, Transaksi &amp; Reporting Online
              </p>
            </div>
          </div>

          {/* Elevated English Headline */}
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-[3.15rem] leading-[1.12] tracking-tight text-slate-900">
            Field Operations
            <br />
            &amp; Tire Supply Chain
            <br />
            <span className="text-[#c97a00]">in Real-Time.</span>
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-slate-600 max-w-[480px] leading-relaxed">
            Integrated live monitoring portal for PT Chitra Paratama enterprise customers across all operational mining sites.
          </p>

          {/* 4 Feature Cards (2x2 Grid) */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 max-w-[530px]">
            {/* 1. Daily Activity */}
            <div className="group rounded-2xl border border-slate-100/90 bg-white/95 px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-sm flex items-center justify-between transition hover:shadow-md hover:border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/90 text-amber-700">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="font-semibold text-xs sm:text-sm text-slate-900">
                  Daily Activity
                </span>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition group-hover:translate-x-0.5 group-hover:bg-slate-100">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* 2. Safety Compliance */}
            <div className="group rounded-2xl border border-slate-100/90 bg-white/95 px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-sm flex items-center justify-between transition hover:shadow-md hover:border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/90 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="font-semibold text-xs sm:text-sm text-slate-900">
                  Safety Compliance
                </span>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition group-hover:translate-x-0.5 group-hover:bg-slate-100">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* 3. Tracking PO */}
            <div className="group rounded-2xl border border-slate-100/90 bg-white/95 px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-sm flex items-center justify-between transition hover:shadow-md hover:border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/90 text-blue-700">
                  <Package className="h-5 w-5" />
                </div>
                <span className="font-semibold text-xs sm:text-sm text-slate-900">
                  Tracking PO
                </span>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition group-hover:translate-x-0.5 group-hover:bg-slate-100">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* 4. Ticketing */}
            <div className="group rounded-2xl border border-slate-100/90 bg-white/95 px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-sm flex items-center justify-between transition hover:shadow-md hover:border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100/90 text-purple-700">
                  <Headphones className="h-5 w-5" />
                </div>
                <span className="font-semibold text-xs sm:text-sm text-slate-900">
                  Ticketing
                </span>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition group-hover:translate-x-0.5 group-hover:bg-slate-100">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Floating White Login Card */}
        <div className="w-full lg:w-[460px] shrink-0 flex justify-center">
          <div className="w-full max-w-[430px] rounded-[28px] border border-slate-100/90 bg-white/95 p-7 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-md">
            <div className="mb-6">
              <h2 className="font-display font-bold text-2xl tracking-tight text-slate-900">
                Masuk ke Akun Anda
              </h2>
              <p className="mt-1 text-xs text-slate-500">
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
