'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  CloudSun,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'

type DashboardHeaderProps = {
  employeeName: string
  totalPoints: number
  currentLevel: string
}

export function MobileDashboardHeader({
  employeeName,
  totalPoints,
  currentLevel,
}: DashboardHeaderProps) {
  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 11) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 19) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  function firstName(name: string) {
    return name.trim().split(/\s+/)[0] || 'User'
  }

  const levelProgress = Math.max(8, Math.min(96, totalPoints % 100))
  const nextLevelPoints = (Math.floor(totalPoints / 100) + 1) * 100
  const pointsToNext = Math.max(0, nextLevelPoints - totalPoints)

  return (
    <div className="space-y-3.5">
      {/* Greetings & Context Widget */}
      <section className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#003f78]" />
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#486275]">
              Command Center
            </p>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#003461]">
            {getGreeting()}, {firstName(employeeName)}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-800 shadow-2xs">
          <CloudSun className="size-3.5 text-amber-600" />
          <span>Shift Pagi · 29°C</span>
        </div>
      </section>

      {/* Double-Bezel Architecture Card (Outer Shell + Inner Core) */}
      <div className="rounded-[2rem] p-1.5 bg-gradient-to-b from-slate-200/60 via-slate-100/40 to-slate-200/50 border border-slate-200/80 shadow-[0_16px_36px_rgba(0,63,120,0.12)]">
        <section className="relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-gradient-to-br from-[#002f5a] via-[#004785] to-[#005ea3] p-5 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)]">
          {/* Subtle Ambient Radial Lighting Blobs */}
          <div className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-amber-400/15 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 -bottom-8 size-36 rounded-full bg-sky-300/15 blur-2xl" />

          {/* Card Top: Rank Badge & Level Info */}
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-md shadow-xs">
                <Trophy className="size-3 text-[#f4b183]" />
                <span className="text-[9.5px] font-black uppercase tracking-[0.16em] text-white">
                  {currentLevel.toUpperCase()} RANK
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <p className="text-3xl font-black leading-none tracking-tight text-white drop-shadow-xs">
                  {totalPoints.toLocaleString()}
                </p>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-200">
                  PTS
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-200/90 backdrop-blur-xs">
                Level {Math.floor(totalPoints / 100) + 1}
              </span>
              <p className="mt-1 text-[10px] font-bold text-sky-100/80">
                {pointsToNext > 0 ? `${pointsToNext} pts lagi ke Level ${Math.floor(totalPoints / 100) + 2}` : 'Max Level'}
              </p>
            </div>
          </div>

          {/* Refined Progress Bar with Milestone Glow */}
          <div className="relative z-10 mt-5">
            <div className="flex items-center justify-between text-[9px] font-bold text-sky-200/70 mb-1.5">
              <span>Progress Tingkat</span>
              <span>{levelProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/25 p-0.5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#f4a78d] via-amber-300 to-amber-400 shadow-[0_0_12px_rgba(244,167,141,0.6)] transition-all duration-700 ease-out"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>

          {/* Quick Footer Links */}
          <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-bold text-sky-100">
            <Link
              href="/mobile/gamification"
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Zap className="size-3 text-amber-300" />
              <span>Lihat Leaderboard</span>
            </Link>
            <Link
              href="/mobile/reward-store"
              className="flex items-center gap-1 text-[#f4b183] hover:text-amber-200 transition-colors"
            >
              <span>Tukar Poin</span>
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
