import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  pendingApprovals,
  teamBoardSummary,
  teamMembers,
} from "@/lib/activity-hub-data";
import { CheckCheck, Clock3, Flame, TriangleAlert, Users2 } from "lucide-react";

const memberStatusStyles: Record<string, string> = {
  Working: "bg-emerald-100 text-emerald-900",
  Traveling: "bg-sky-100 text-sky-900",
  "On Site": "bg-amber-100 text-amber-900",
  "Needs Review": "bg-rose-100 text-rose-900",
};

export function ActivityHubTeamBoard() {
  return (
    <div className="space-y-4 pb-6">
      <Card className="rounded-[1.75rem] border-0 bg-[linear-gradient(135deg,#3f2b00_0%,#8a5a00_45%,#0f172a_100%)] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
        <p className="text-xs uppercase tracking-[0.22em] text-amber-200">
          Team command
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Satu layar untuk foreman</h3>
        <p className="mt-2 text-sm leading-6 text-white/75">
          Pantau manpower, cari bottleneck approval, dan prioritaskan job emergency
          sebelum akhir shift.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-sm text-white/70">Checked-in</p>
            <p className="mt-1 text-2xl font-semibold">
              {teamBoardSummary.checkedIn}/{teamBoardSummary.activeWorkers}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-sm text-white/70">Pending approval</p>
            <p className="mt-1 text-2xl font-semibold">
              {teamBoardSummary.pendingApproval}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="surface-module-card rounded-[1.4rem] p-4">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
            <Flame className="h-4 w-4 text-amber-600" />
            Emergency
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {teamBoardSummary.emergencyJobs}
          </p>
          <p className="mt-1 text-xs text-slate-500">Job breakdown aktif</p>
        </Card>
        <Card className="surface-module-card rounded-[1.4rem] p-4">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
            <Clock3 className="h-4 w-4 text-sky-600" />
            Overtime
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {teamBoardSummary.overtimeCandidates}
          </p>
          <p className="mt-1 text-xs text-slate-500">Perlu review sebelum 17:00</p>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold">Status Tim Lapangan</h4>
            <p className="text-sm text-muted-foreground">
              Cocok untuk monitor cepat dari HP sebelum approval.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            <Users2 className="mr-1 h-3.5 w-3.5" />
            {teamMembers.length} orang
          </Badge>
        </div>

        {teamMembers.map((member) => (
          <Card
            key={member.name}
            className="surface-module-card rounded-[1.5rem] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                <p className="text-sm text-slate-500">{member.role}</p>
              </div>
              <Badge
                className={`rounded-full border-0 px-3 py-1 ${memberStatusStyles[member.status]}`}
              >
                {member.status}
              </Badge>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-700">{member.currentJob}</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Progress job</span>
                <span>{member.progress}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-900"
                  style={{ width: `${member.progress}%` }}
                />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Update terakhir {member.lastUpdate}
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold">Pending Approval</h4>
            <p className="text-sm text-muted-foreground">
              Fokuskan approval berisiko tinggi dan kandidat lembur lebih dulu.
            </p>
          </div>
          <Button asChild size="sm" className="rounded-full px-4">
            <Link href="/dashboard/approval">
              <CheckCheck className="mr-2 h-4 w-4" />
              Review batch
            </Link>
          </Button>
        </div>

        {pendingApprovals.map((approval) => (
          <Card
            key={approval.id}
            className="surface-module-card rounded-[1.5rem] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {approval.id}
                </p>
                <h5 className="mt-1 text-base font-semibold text-slate-900">
                  {approval.employee}
                </h5>
              </div>
              <Badge
                className={
                  approval.risk === "Emergency"
                    ? "rounded-full border-0 bg-rose-100 px-3 py-1 text-rose-900"
                    : approval.risk === "Safety"
                      ? "rounded-full border-0 bg-amber-100 px-3 py-1 text-amber-900"
                      : "rounded-full border-0 bg-slate-200 px-3 py-1 text-slate-800"
                }
              >
                {approval.risk === "Emergency" ? (
                  <TriangleAlert className="mr-1 h-3.5 w-3.5" />
                ) : null}
                {approval.risk}
              </Badge>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-700">{approval.item}</p>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Submit {approval.submittedAt}</span>
              <span>Lembur {approval.overtime}</span>
            </div>

            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" variant="outline" className="flex-1 rounded-full">
                <Link href="/dashboard/approval">Detail</Link>
              </Button>
              <Button asChild size="sm" className="flex-1 rounded-full">
                <Link href="/dashboard/approval">Approve</Link>
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
