import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { TrendingUp, ListTodo, BarChart3, ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'CS Forecast | HERO Mobile',
  description: 'Central Service Revenue Forecasting & Daily Report Mobile',
}

export default function MobileCSForecastLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4 pb-24 font-sans">
      {/* Top Mobile Header (Matching HERO Mobile Theme) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/mobile/dashboard"
              className="p-2 rounded-xl bg-white text-[#003461] border border-slate-200/80 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-[10px] font-black tracking-[0.24em] text-[#486275] uppercase">
                Central Service
              </p>
              <h1 className="text-xl font-black tracking-tight text-[#003461] flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5 text-[#0ea5b0]" />
                CS Forecast Revenue
              </h1>
            </div>
          </div>
        </div>

        {/* HERO Mobile Style Tabs Bar */}
        <div className="grid grid-cols-2 gap-1.5 bg-white p-1.5 rounded-2xl shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-slate-100">
          <Link
            href="/mobile/central-service/forecast/daily"
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-[#003461] hover:bg-[#eaf4fb]"
          >
            <ListTodo className="w-4 h-4 text-[#0ea5b0]" />
            Daily Updates
          </Link>
          <Link
            href="/mobile/central-service/forecast/report"
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-[#003461] hover:bg-[#eaf4fb]"
          >
            <BarChart3 className="w-4 h-4 text-[#0ea5b0]" />
            Daily Report
          </Link>
        </div>
      </section>

      {/* Main Content View */}
      <main className="space-y-4">{children}</main>
    </div>
  )
}
