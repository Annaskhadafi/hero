import { getHrSessions } from "@/app/actions/hr-counseling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, MessageSquare, ArrowRight } from "lucide-react";

export default async function MobileHrCounselingInboxPage() {
  const sessions = await getHrSessions();

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full bg-white/50 shadow-sm">
          <Link href="/mobile">
            <ArrowLeft className="size-5 text-[#003461]" />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Inbox HR</p>
          <h1 className="truncate text-xl font-black tracking-tight text-[#003461]">
            Konsultasi Karyawan
          </h1>
        </div>
      </div>

      <section className="space-y-3 pt-4">
        {sessions.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-8 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f5f9] mb-4">
              <MessageSquare className="h-6 w-6 text-[#94a3b8]" />
            </div>
            <h3 className="text-sm font-bold text-[#003461]">Belum Ada Sesi</h3>
            <p className="text-xs text-[#486275] mt-1 leading-relaxed">
              Anda belum menerima permintaan curhat dari karyawan.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link 
                key={session.id} 
                href={`/mobile/hr-counseling/${session.id}`}
                className="block rounded-[1.2rem] bg-white p-4 shadow-[0_4px_20px_rgba(8,32,51,0.05)] border border-slate-100/60 active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={session.status === "open" ? "default" : "secondary"}
                      className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        session.status === "open" ? "bg-[#0ea5e9] hover:bg-[#0ea5e9]/90" : ""
                      }`}
                    >
                      {session.status === "open" ? "Aktif" : "Selesai"}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(session.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                
                <h3 className="font-bold text-[#003461] text-base leading-tight mb-1">{session.userName}</h3>
                <p className="text-xs text-[#486275] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  Kategori: {session.category}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-[#003461]">
                  <span className="text-[11px] font-semibold">Buka Chat</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
