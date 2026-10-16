import { CheckCircle2, Clock3, ShieldAlert, Sparkles } from "lucide-react";
import { HeroKpiCard } from "@/components/templates/hero-kpi-card";

interface MyDayStatCardsProps {
  jobsCompleted: number;
  jobsAssigned: number;
  pointsToday: number;
  pendingApprovalCount: number;
  penaltyToday: number;
}

export function MyDayStatCards({
  jobsCompleted,
  jobsAssigned,
  pointsToday,
  pendingApprovalCount,
  penaltyToday,
}: MyDayStatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* 1. Pekerjaan */}
      <HeroKpiCard
        title="Pekerjaan"
        value={jobsCompleted}
        unit={`/ ${jobsAssigned} selesai`}
        tone="blue"
        icon={<CheckCircle2 className="size-5" />}
        description={`${jobsCompleted} pekerjaan terselesaikan hari ini`}
      />

      {/* 2. Poin Hari Ini */}
      <HeroKpiCard
        title="Poin Hari Ini"
        value={pointsToday}
        unit="pts"
        tone="emerald"
        icon={<Sparkles className="size-5" />}
        description="Poin reward aktivitas hari ini"
      />

      {/* 3. Menunggu Approval */}
      <HeroKpiCard
        title="Menunggu Approval"
        value={pendingApprovalCount}
        unit="aktivitas"
        tone="amber"
        icon={<Clock3 className="size-5" />}
        description="Aktivitas menanti persetujuan lead"
      />

      {/* 4. Penalty */}
      <HeroKpiCard
        title="Penalty"
        value={penaltyToday > 0 ? `-${penaltyToday}` : "0"}
        unit="pts"
        tone={penaltyToday > 0 ? "rose" : "slate"}
        icon={<ShieldAlert className="size-5" />}
        description={penaltyToday > 0 ? "Poin penalti hari ini" : "Tidak ada penalti"}
      />
    </div>
  );
}
