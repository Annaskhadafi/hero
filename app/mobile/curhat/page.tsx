import { getMySessions, getHrPersonnel, createSession, getCurrentEmployee, getHrSessions } from "@/app/actions/hr-counseling";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Inbox, ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { CurhatCreateForm } from "@/components/mobile/curhat-create-form";
import { HrTicketStatusSelect } from "@/components/mobile/hr-ticket-status-select";
import { getHrTicketStatus } from "@/lib/hr-ticket-status";

export default async function MobileCurhatPage() {
  const employee = await getCurrentEmployee();
  const sessions = await getMySessions();
  const hrList = await getHrPersonnel();
  
  const isHR = employee?.section === "HRGA" || employee?.section === "HR-GA";
  const hrSessions = isHR ? await getHrSessions() : [];
  const activeStatuses = ["in_review", "in_progress", "waiting_user"];
  const stats = [
    ["Total", sessions.length],
    ["Diajukan", sessions.filter((session) => session.status === "open").length],
    ["Diproses", sessions.filter((session) => activeStatuses.includes(session.status)).length],
    ["Selesai", sessions.filter((session) => ["resolved", "closed"].includes(session.status)).length],
  ] as const;

  async function handleCreateSession(formData: FormData) {
    "use server";
    const hrId = parseInt(formData.get("hrId") as string);
    const category = formData.get("category") as string;
    if (!hrId || !category) return;
    const session = await createSession(hrId, category);
    if (!session) return;
    redirect(`/mobile/curhat/${session.id}`);
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full bg-white/50 shadow-sm">
          <Link href="/mobile">
            <ArrowLeft className="size-5 text-[#003461]" />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Human Capital</p>
          <h1 className="truncate text-xl font-black tracking-tight text-[#003461]">
            Pengaduan HR
          </h1>
        </div>
      </div>

      {/* HR INBOX SECTION (Only for HRGA personnel) */}
      {isHR && (
        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#003461] bg-[#e0f2fe] text-[#0369a1] px-3 py-1 rounded-full w-fit">
            Inbox Pengaduan Karyawan
          </p>
          
          {hrSessions.length === 0 ? (
            <div className="rounded-[1.2rem] bg-white/70 p-6 text-center border border-dashed border-slate-200">
              <Inbox className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-500">Belum ada pengaduan masuk dari karyawan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hrSessions.map((session) => (
                <div key={session.id}>
                  <Card className="rounded-[1.25rem] shadow-[0_10px_24px_rgba(8,32,51,0.06)] border-0 ring-1 ring-[#0ea5e9]/20 bg-sky-50/20 active:scale-[0.98] transition-transform overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <Link href={`/mobile/hr-counseling/${session.id}`} className="min-w-0 pr-3">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge className={`text-[9px] uppercase tracking-wider px-2 py-0.5 ${getHrTicketStatus(session.status).className}`}>
                            {getHrTicketStatus(session.status).label}
                          </Badge>
                          <h3 className="truncate text-base font-black text-[#082033]">{session.ticketNumber ?? `HR-${session.id}`}</h3>
                        </div>
                        <p className="truncate text-xs font-semibold text-[#486275]">{session.userName} · {session.category}</p>
                        <p className="mt-1 text-[10px] font-semibold text-[#8ca0b0]">Updated {new Date(session.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </Link>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <HrTicketStatusSelect sessionId={session.id} status={session.status} />
                        <Link href={`/mobile/hr-counseling/${session.id}`} aria-label={`Buka tiket ${session.ticketNumber ?? session.id}`}>
                          <ArrowRight className="size-4 text-[#0ea5e9]" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* USER ACTION & LIST */}
      <section className="space-y-4 pt-2">
        {isHR && (
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275] pl-1">
            Pengaduan Saya
          </p>
        )}

        <CurhatCreateForm hrList={hrList} createSessionAction={handleCreateSession} />

        <div className="grid grid-cols-4 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white px-2 py-3 text-center shadow-[0_8px_20px_rgba(8,32,51,0.05)]">
              <p className="text-lg font-black text-[#003461]">{value}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#7890a0]">{label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="rounded-[1.2rem] bg-white p-8 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
              <ClipboardList className="mx-auto mb-3 h-12 w-12 text-[#b9dff6]" />
              <p className="text-sm font-black text-[#082033]">Belum ada pengaduan.</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#486275]">
                Buat tiket baru untuk menyampaikan pengaduan kepada tim HR.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link key={session.id} href={`/mobile/curhat/${session.id}`} className="block">
                  <Card className="rounded-[1.25rem] shadow-[0_10px_24px_rgba(8,32,51,0.06)] border-0 ring-1 ring-black/5 active:scale-[0.98] transition-transform overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="min-w-0 pr-3">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge className={`text-[9px] uppercase tracking-wider px-2 py-0.5 ${getHrTicketStatus(session.status).className}`}>
                            {getHrTicketStatus(session.status).label}
                          </Badge>
                          <h3 className="truncate text-base font-black text-[#082033]">{session.ticketNumber ?? `HR-${session.id}`}</h3>
                        </div>
                        <p className="text-xs font-semibold text-[#486275] truncate">
                          {session.category} · HR: {session.hrName}
                        </p>
                        <p className="text-[10px] font-semibold text-[#8ca0b0] mt-1">
                          Updated {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f6fd] text-[#003f78]">
                        <ArrowRight className="size-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
