"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  MapPin, 
  CheckCircle2, 
  TriangleAlert, 
  Sparkles,
  ArrowRight,
  Clock3,
  CalendarDays
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Assignment = {
  customJobName?: string | null;
  activityName?: string | null;
  statusLabel?: string | null;
  createdAt?: Date | null;
  deadline?: Date | null;
} | null;

type FeedItem = {
  id: string;
  title: string;
  detail: string;
  at: Date;
  tone: "penalty" | "point" | "activity";
};

type DashboardTabsProps = {
  primaryAssignment: Assignment;
  recentFeed: FeedItem[];
  siteName: string;
  workLocation: string;
};

export function MobileDashboardTabs({ 
  primaryAssignment, 
  recentFeed,
  siteName,
  workLocation
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "feed">("tasks");

  function formatShortTime(value?: Date | null) {
    if (!value) return "--:--";
    return new Date(value).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatFeedTime(value: Date) {
    return new Date(value).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Dynamic Tab Trigger */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "flex-1 pb-3 text-center text-xs font-black uppercase tracking-wider transition-colors",
            activeTab === "tasks" 
              ? "border-b-2 border-[#003f78] text-[#003f78]" 
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          Tugas Aktif
        </button>
        <button
          onClick={() => setActiveTab("feed")}
          className={cn(
            "flex-1 pb-3 text-center text-xs font-black uppercase tracking-wider transition-colors",
            activeTab === "feed" 
              ? "border-b-2 border-[#003f78] text-[#003f78]" 
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          Log Aktivitas
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "tasks" && (
          <div className="space-y-3 animation-fade-in">
            {primaryAssignment ? (
              <div className="rounded-[1.3rem] bg-white p-4 shadow-[0_16px_36px_rgba(8,32,51,0.06)] border border-slate-100/60 border-l-4 border-l-[#003f78]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black leading-tight text-[#082033]">
                      {primaryAssignment.customJobName || primaryAssignment.activityName || "Pekerjaan Aktual"}
                    </h2>
                    <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#486275]">
                      <MapPin className="size-3.5" />
                      {siteName || workLocation || "Site"}
                    </div>
                  </div>
                  <Badge className="border-0 bg-[#eaf4fb] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#003f78]">
                    {primaryAssignment.statusLabel}
                  </Badge>
                </div>

                <div className="mt-4 border-t border-dashed border-[#d8e8f3] pt-3">
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">
                    <div>
                      <p>Started</p>
                      <p className="mt-1 text-xs text-[#082033]">{formatShortTime(primaryAssignment.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p>E.T.A</p>
                      <p className="mt-1 text-xs text-[#082033]">{formatShortTime(primaryAssignment.deadline)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-6 text-center border border-slate-100 shadow-[0_14px_32px_rgba(8,32,51,0.06)]">
                <p className="text-sm font-black text-[#082033]">Belum ada assignment aktif hari ini.</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#486275]">
                  Tetap bisa input aktivitas mandiri atau buka menu kerja.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/mobile/activity/input"
                    className="flex min-h-11 items-center justify-center rounded-xl bg-[#003f78] px-3 text-[10px] font-black uppercase tracking-[0.08em] text-white active:scale-[0.98] transition-transform"
                  >
                    Input
                  </Link>
                  <Link
                    href="/mobile/approval"
                    className="flex min-h-11 items-center justify-center rounded-xl bg-slate-50 px-3 text-[10px] font-black uppercase tracking-[0.08em] text-[#003f78] hover:bg-slate-100 active:scale-[0.98] transition-transform"
                  >
                    Approval
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "feed" && (
          <div className="space-y-3 animation-fade-in">
            {recentFeed.length > 0 ? (
              <div className="space-y-2">
                {recentFeed.map((item) => {
                  const Icon =
                    item.tone === "penalty" ? TriangleAlert : item.tone === "point" ? Sparkles : CheckCircle2;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-[1.1rem] bg-white p-3 shadow-[0_10px_24px_rgba(8,32,51,0.05)] border border-slate-100/60"
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          item.tone === "penalty" ? "bg-[#f6dfcf] text-[#5a2200]" : "bg-[#e9f6fd] text-[#003f78]",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-[#082033]">{item.title}</p>
                        <p className="truncate text-[10px] font-semibold text-[#486275]">{item.detail}</p>
                      </div>
                      <p className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em] text-[#486275]">
                        {formatFeedTime(item.at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.2rem] bg-white p-6 text-center text-xs font-semibold text-[#486275] border border-slate-100">
                Belum ada aktivitas, poin, atau penalty hari ini.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
