import { getMySessions, getHrPersonnel, createSession } from "@/app/actions/hr-counseling";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlusCircle, MessageSquare, ArrowLeft, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { redirect } from "next/navigation";

export default async function MobileCurhatPage() {
  const sessions = await getMySessions();
  const hrList = await getHrPersonnel();

  async function handleCreateSession(formData: FormData) {
    "use server";
    const hrId = parseInt(formData.get("hrId") as string);
    const category = formData.get("category") as string;
    
    if (!hrId || !category) return;
    
    const session = await createSession(hrId, category);
    if (session) {
      redirect(`/mobile/curhat/${session.id}`);
    }
  }

  return (
    <div className="space-y-4 pb-12">
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

      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full h-14 rounded-2xl text-md font-bold shadow-lg" size="lg">
            <PlusCircle className="mr-2 h-5 w-5" />
            Mulai Konsultasi Baru
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md mx-4 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Mulai Sesi Curhat Baru</DialogTitle>
          </DialogHeader>
          <form action={handleCreateSession}>
            <div className="grid gap-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="hrId" className="text-sm font-semibold text-[#486275]">Pilih HR</Label>
                <Select name="hrId" required>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Pilih HR..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hrList.map((hr) => (
                      <SelectItem key={hr.id} value={hr.id.toString()}>
                        {hr.name} ({hr.jobTitle})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold text-[#486275]">Kategori Masalah</Label>
                <Select name="category" required>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Pilih Kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Karir">Karir</SelectItem>
                    <SelectItem value="Masalah Pribadi">Masalah Pribadi</SelectItem>
                    <SelectItem value="Konflik Pekerjaan">Konflik Pekerjaan</SelectItem>
                    <SelectItem value="Pelecehan/Kekerasan">Pelecehan/Kekerasan</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold">Mulai Chat</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <section className="space-y-3 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275] pl-1">Riwayat Sesi Curhat</p>
        
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
      </section>
    </div>
  );
}
