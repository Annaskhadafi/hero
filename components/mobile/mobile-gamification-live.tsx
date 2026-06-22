"use client";

import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Medal, Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type GamificationPayload = {
  context: {
    employee: {
      id: number;
      name: string;
      department: string;
      section: string;
      workLocation: string;
      levelName: string;
      totalPoints: number;
    };
  };
  leaderboard: Array<{
    id: number;
    name: string;
    role: string;
    department: string;
    section: string;
    workLocation: string;
    levelName: string;
    totalPoints: number;
  }>;
  events: Array<{
    id: number;
    category: string;
    label: string;
    points: number;
    createdAt: string;
  }>;
  rank: number | null;
  weeklyPoints: Array<{
    label: string;
    points: number;
  }>;
  pointsDelta: number;
};

const chartConfig = {
  points: {
    label: "Points",
    color: "#f4a78d",
  },
} satisfies ChartConfig;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function MobileGamificationLive({
  initialData,
}: {
  initialData: GamificationPayload;
}) {
  const [data, setData] = useState(initialData);
  const [isFlashing, setIsFlashing] = useState(false);
  const previousPointsRef = useRef(initialData.context.employee.totalPoints);

  const refreshData = useEffectEvent(async () => {
    const response = await fetch("/api/mobile/gamification", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const next = (await response.json()) as GamificationPayload;
    startTransition(() => setData(next));
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshData();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    if (data.context.employee.totalPoints === previousPointsRef.current) {
      return;
    }

    previousPointsRef.current = data.context.employee.totalPoints;
    setIsFlashing(true);
    const timeout = window.setTimeout(() => setIsFlashing(false), 900);

    return () => window.clearTimeout(timeout);
  }, [data.context.employee.totalPoints]);

  const progress = Math.max(8, Math.min(96, data.context.employee.totalPoints % 100));
  const podium = data.leaderboard.slice(0, 3);

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Leaderboard</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Section & Site Rank</h1>
        <p className="mt-1 text-xs font-semibold text-[#486275]">
          {data.context.employee.section || "Section"} · {data.context.employee.workLocation || "Site"}
        </p>
      </section>

      <section className="rounded-[1.35rem] bg-[#003f78] p-5 text-white shadow-[0_20px_42px_rgba(0,63,120,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="border-0 bg-white/16 text-white">
              <Trophy className="mr-1 size-3" />
              Rank #{data.rank ?? "-"}
            </Badge>
            <p className="mt-3 text-3xl font-black italic leading-none">
              {data.context.employee.levelName.toUpperCase()}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#d9ebf8]">
              Delta terbaru {data.pointsDelta > 0 ? "+" : ""}
              {data.pointsDelta} poin
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">PTS</p>
            <p
              className={`text-4xl font-black leading-none transition-transform duration-300 ${
                isFlashing ? "scale-110 text-[#ffd6c5]" : ""
              }`}
            >
              {data.context.employee.totalPoints.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#0a5798]">
          <div
            className="h-full rounded-full bg-[#f4a78d] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Live Momentum</p>
          <Badge className="border-0 bg-[#e9f6fd] text-[#003f78]">Auto refresh 15s</Badge>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <BarChart data={data.weeklyPoints}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="points" radius={[10, 10, 4, 4]} fill="var(--color-points)" />
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Podium</p>
        <div className="grid grid-cols-3 gap-3">
          {podium.map((employee, index) => (
            <article
              key={employee.id}
              className={`rounded-[1.2rem] p-4 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)] ${
                index === 0 ? "bg-[#003f78] text-white" : "bg-white text-[#082033]"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em]">
                #{index + 1}
              </p>
              <p className="mt-3 text-sm font-black leading-5">{employee.name}</p>
              <p className="mt-1 text-[11px] font-semibold opacity-80">{employee.levelName}</p>
              <p className="mt-4 text-2xl font-black">{employee.totalPoints}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Section Leaderboard</p>
        {data.leaderboard.slice(0, 10).map((employee, index) => (
          <article
            key={employee.id}
            className="flex items-center gap-3 rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-[#e9f6fd] text-sm font-black text-[#003f78]">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-black text-[#082033]">{employee.name}</h2>
              <p className="text-xs font-semibold text-[#486275]">
                {employee.levelName} · {employee.workLocation || "Site"}
              </p>
            </div>
            <p className="text-sm font-black text-[#003f78]">{employee.totalPoints}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Point Events</p>
        {data.events.map((event) => (
          <article key={event.id} className="rounded-[1.2rem] bg-[#e9f6fd] p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#5a2200]">
                {event.points >= 0 ? <Sparkles className="size-4" /> : <Medal className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-[#082033]">{event.label}</h3>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  {event.category} · {formatDate(event.createdAt)}
                </p>
              </div>
              <p className="text-sm font-black text-[#003f78]">
                {event.points > 0 ? "+" : ""}
                {event.points}
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
