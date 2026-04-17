"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  badgeCollection,
  pointsProfile,
  pointsSources,
  rewardTracker,
  siteLeaderboard,
} from "@/lib/points-data";
import { Award, Medal, ShieldCheck, TrendingUp } from "lucide-react";

const badgeStyles: Record<string, string> = {
  Unlocked: "bg-emerald-100 text-emerald-900",
  "In Progress": "bg-amber-100 text-amber-900",
  Locked: "bg-slate-200 text-slate-800",
};

const rewardStyles: Record<string, string> = {
  "On Track": "bg-emerald-100 text-emerald-900",
  "In Progress": "bg-amber-100 text-amber-900",
};

export function PointsOverview() {
  const progress =
    ((pointsProfile.totalPoints /
      pointsProfile.nextLevelTarget) *
      100);

  return (
    <div className="space-y-4 pb-6">
      <Card className="rounded-[1.75rem] border-0 bg-[linear-gradient(135deg,#172554_0%,#4c1d95_44%,#0f766e_100%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)]">
        <p className="text-xs uppercase tracking-[0.22em] text-violet-100">
          M5 • HERO Points & Leveling
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Setiap pekerjaan terasa bernilai</h3>
        <p className="mt-2 text-sm leading-6 text-white/80">
          Poin, streak, badge, dan leaderboard membantu tim lapangan tetap disiplin
          mengisi aktivitas dan melihat progres mereka setiap hari.
        </p>

        <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-violet-100">
                {pointsProfile.name}
              </p>
              <h4 className="mt-1 text-lg font-semibold">{pointsProfile.currentLevel}</h4>
              <p className="mt-1 text-sm text-white/75">{pointsProfile.role}</p>
            </div>
            <Badge className="rounded-full border-0 bg-white/14 px-3 py-1 text-white">
              Rank #{pointsProfile.monthlyRank}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-sm text-white/70">Total points</p>
              <p className="mt-1 text-2xl font-semibold">{pointsProfile.totalPoints}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-sm text-white/70">Streak</p>
              <p className="mt-1 text-2xl font-semibold">{pointsProfile.streakDays} hari</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/10 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Progress ke {pointsProfile.nextLevel}</span>
              <span className="font-medium">{pointsProfile.pointsToNextLevel} poin lagi</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/15">
              <div
                className="h-2 rounded-full bg-violet-300 transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Badge earned"
          value={`${pointsProfile.badgesEarned}`}
          caption="Badge aktif bulan ini"
          icon={<Award className="h-4 w-4 text-amber-600" />}
        />
        <MetricCard
          label="Momentum"
          value="Naik"
          caption="Trend positif 2 minggu"
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
        />
      </div>

      <Tabs defaultValue="sources" className="gap-4">
        <TabsList className="surface-tab-shell grid h-auto grid-cols-3 rounded-2xl p-1">
          <TabsTrigger value="sources" className="rounded-xl py-2 text-xs sm:text-sm">
            Sumber poin
          </TabsTrigger>
          <TabsTrigger value="badges" className="rounded-xl py-2 text-xs sm:text-sm">
            Badge
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="rounded-xl py-2 text-xs sm:text-sm">
            Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-3">
          {pointsSources.map((item) => (
            <Card key={item.label} className="surface-module-card rounded-[1.5rem] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.category}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
                </div>
                <Badge className="rounded-full border-0 bg-emerald-100 px-3 py-1 text-emerald-900">
                  {item.points}
                </Badge>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="badges" className="space-y-3">
          {badgeCollection.map((badge) => (
            <Card key={badge.name} className="surface-module-card rounded-[1.5rem] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{badge.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{badge.description}</p>
                </div>
                <Badge className={`rounded-full border-0 px-3 py-1 ${badgeStyles[badge.status]}`}>
                  {badge.status}
                </Badge>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-3">
          {siteLeaderboard.map((entry) => (
            <Card
              key={entry.rank}
              className="surface-module-card rounded-[1.5rem] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 font-semibold text-slate-900">
                    #{entry.rank}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">{entry.name}</p>
                    <p className="text-sm text-slate-500">{entry.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-900">{entry.points}</p>
                  <p className="text-xs text-slate-500">{entry.trend}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <section className="space-y-3">
        <div>
          <h4 className="text-lg font-semibold">Reward Tracker</h4>
          <p className="text-sm text-muted-foreground">
            Jalur motivasi dari poin ke benefit nyata untuk karyawan lapangan.
          </p>
        </div>

        {rewardTracker.map((reward) => (
          <Card key={reward.title} className="surface-module-card rounded-[1.5rem] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{reward.title}</p>
                <p className="mt-2 text-sm text-slate-600">Target: {reward.target}</p>
                <p className="mt-1 text-sm text-slate-500">{reward.progress}</p>
              </div>
              <Badge className={`rounded-full border-0 px-3 py-1 ${rewardStyles[reward.status]}`}>
                {reward.status}
              </Badge>
            </div>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/dashboard/hc">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Training & wellness
          </Link>
        </Button>
        <Button className="rounded-2xl">
          <Medal className="mr-2 h-4 w-4" />
          Klaim reward
        </Button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="surface-module-card rounded-[1.4rem] p-4">
      <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </Card>
  );
}
