"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/language-provider";
import { 
  Trophy, 
  CloudSun, 
  QrCode, 
  AlertTriangle, 
  MessageSquare,
  ArrowUpRight
} from "lucide-react";

type DashboardHeaderProps = {
  employeeName: string;
  totalPoints: number;
  currentLevel: string;
};

export function MobileDashboardHeader({ 
  employeeName, 
  totalPoints, 
  currentLevel 
}: DashboardHeaderProps) {
  const { isIndonesian } = useLanguage();
  
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 11) return isIndonesian ? "Selamat Pagi" : "Good Morning";
    if (hour < 15) return isIndonesian ? "Selamat Siang" : "Good Afternoon";
    if (hour < 19) return isIndonesian ? "Selamat Sore" : "Good Evening";
    return isIndonesian ? "Selamat Malam" : "Good Night";
  }

  function firstName(name: string) {
    return name.trim().split(/\s+/)[0] || "User";
  }

  const levelProgress = Math.max(8, Math.min(96, totalPoints % 100));

  return (
    <div className="space-y-4">
      {/* Greetings & Context Widget */}
      <section className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Command Center</p>
          <h1 className="text-2xl font-black tracking-tight text-[#003461]">
            {getGreeting()}, {firstName(employeeName)}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-700">
          <CloudSun className="size-3.5" />
          <span>{isIndonesian ? "Shift Pagi · Balikpapan 29°C" : "Morning Shift · Balikpapan 29°C"}</span>
        </div>
      </section>

      {/* Gopay-style Glassmorphic Card */}
      <section className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#003f78] via-[#004e92] to-[#005ea3] p-5 text-white shadow-[0_20px_40px_rgba(0,63,120,0.22)] border border-white/10">
        {/* Background glow accents */}
        <div className="absolute -right-10 -top-10 size-32 rounded-full bg-[#f4a78d]/10 blur-2xl" />
        <div className="absolute -left-10 -bottom-10 size-32 rounded-full bg-sky-400/10 blur-2xl" />

        {/* Card Header (XP & Points) */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <Badge className="border-0 bg-white/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <Trophy className="mr-1 size-3 text-[#f4b183]" />
              {currentLevel.toUpperCase()} {isIndonesian ? "PERINGKAT" : "RANK"}
            </Badge>
            <div className="mt-3 flex items-baseline gap-1">
              <p className="text-3xl font-black leading-none tracking-tight">
                {totalPoints.toLocaleString(isIndonesian ? "id-ID" : "en-US")}
              </p>
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-200">PTS</span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-200/80">{isIndonesian ? "Kemajuan Pro" : "Pro Progress"}</p>
            <p className="text-xs font-black text-white mt-1">Level {Math.floor(totalPoints / 100) + 1}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 relative z-10">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f4a78d] to-amber-300 shadow-[0_0_12px_rgba(244,167,141,0.5)] transition-all duration-500"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>

      </section>
    </div>
  );
}
