import { getMySessions, getHrPersonnel, createSession, getCurrentEmployee, getHrSessions } from "@/app/actions/hr-counseling";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MessageSquare, ArrowLeft, ArrowRight, Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { CurhatCreateForm } from "@/components/mobile/curhat-create-form";

export default async function MobileCurhatPage() {
  const employee = await getCurrentEmployee();
  const sessions = await getMySessions();
  const hrList = await getHrPersonnel();
  
  const isHR = employee?.section === "HRGA" || employee?.section === "HR-GA";
  const hrSessions = isHR ? await getHrSessions() : [];

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
            Curhat Dengan HR
          </h1>
        </div>
      </div>

      {/* HR INBOX SECTION (Only for HRGA personnel) */}
      {isHR && (
        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#003461] bg-[#e0f2fe] text-[#0369a1] px-3 py-1 rounded-full w-fit">
            Inbox Curhat Karyawan (Sisi HR)
          </p>
          
          {hrSessions.length === 0 ? (
            <div className="rounded-[1.2rem] bg-white/70 p-6 text-center border border-dashed border-slate-200">
              <Inbox className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-500">Belum ada curhat masuk dari karyawan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hrSessions.map((session) => (
                <Link key={session.id} href={`/mobile/hr-counseling/${session.id}`} className="block">
                  <Card className="rounded-[1.25rem] shadow-[0_10px_24px_rgba(8,32,51,0.06)] border-0 ring-1 ring-[#0ea5e9]/20 bg-sky-50/20 active:scale-[0.98] transition-transform overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={session.status === "open" ? "default" : "secondary"} className={`text-[9px] uppercase tracking-wider px-2 py-0.5 ${session.status === "open" ? "bg-[#0ea5e9]" : ""}`}>
                            {session.status === "open" ? "Aktif" : "Selesai"}
                          </Badge>
                          <h3 className="font-black text-[#082033] truncate text-base">{session.userName}</h3>
                        </div>
                        <p className="text-xs font-semibold text-[#486275] truncate">
                          Kategori: {session.category}
                        </p>
                        <p className="text-[10px] font-semibold text-[#8ca0b0] mt-1">
                          Updated {new Date(session.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0ea5e9]/10 text-[#0ea5e9]">
                        <ArrowRight className="size-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* USER ACTION & LIST */}
      <section className="space-y-4 pt-2">
        {isHR && (
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275] pl-1">
            Riwayat Curhat Pribadi (Sisi Karyawan)
          </p>
        )}

        <CurhatCreateForm hrList={hrList} createSessionAction={handleCreateSession} />

        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="rounded-[1.2rem] bg-white p-8 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
              <MessageSquare className="mx-auto h-12 w-12 text-[#b9dff6] mb-3" />
              <p className="text-sm font-black text-[#082033]">Belum ada riwayat sesi.</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#486275]">
                Mulai konsultasi dengan tim HR kapan saja secara rahasia.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link key={session.id} href={`/mobile/curhat/${session.id}`} className="block">
                  <Card className="rounded-[1.25rem] shadow-[0_10px_24px_rgba(8,32,51,0.06)] border-0 ring-1 ring-black/5 active:scale-[0.98] transition-transform overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={session.status === "open" ? "default" : "secondary"} className="text-[9px] uppercase tracking-wider px-2 py-0.5">
                            {session.status === "open" ? "Aktif" : "Selesai"}
                          </Badge>
                          <h3 className="font-black text-[#082033] truncate text-base">{session.category}</h3>
                        </div>
                        <p className="text-xs font-semibold text-[#486275] truncate">
                          HR: {session.hrName}
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
