import { redirect } from "next/navigation";
import { Medal, Sparkles, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getMobileGamification } from "@/lib/mobile-data";

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default async function MobileGamificationPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getMobileGamification(session.user.email);
  if (!data) return null;

  const progress = Math.max(8, Math.min(96, data.context.employee.totalPoints % 100));

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Gamification</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Point Arena</h1>
      </section>

      <section className="rounded-[1.35rem] bg-[#003f78] p-5 text-white shadow-[0_20px_42px_rgba(0,63,120,0.24)]">
        <div className="flex items-start justify-between">
          <div>
            <Badge className="border-0 bg-white/16 text-white">
              <Trophy className="mr-1 size-3" />
              Rank #{data.rank ?? "-"}
            </Badge>
            <p className="mt-3 text-3xl font-black italic leading-none">{data.context.employee.levelName.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">PTS</p>
            <p className="text-4xl font-black leading-none">{data.context.employee.totalPoints.toLocaleString("id-ID")}</p>
          </div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#0a5798]">
          <div className="h-full rounded-full bg-[#f4a78d]" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Site Leaderboard</p>
        {data.leaderboard.slice(0, 8).map((employee, index) => (
          <article key={employee.id} className="flex items-center gap-3 rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-[#e9f6fd] text-sm font-black text-[#003f78]">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-black text-[#082033]">{employee.name}</h2>
              <p className="text-xs font-semibold text-[#486275]">{employee.levelName} · {employee.department}</p>
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
              <p className="text-sm font-black text-[#003f78]">{event.points > 0 ? "+" : ""}{event.points}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
