import { getMySessions, getHrPersonnel, createSession } from "@/app/actions/hr-counseling";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { redirect } from "next/navigation";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getHrTicketStatus } from "@/lib/hr-ticket-status";

export default async function CurhatPage() {
  const sessions = await getMySessions();
  const hrList = await getHrPersonnel();

  async function handleCreateSession(formData: FormData) {
    "use server";
    const hrId = parseInt(formData.get("hrId") as string);
    const category = formData.get("category") as string;
    
    if (!hrId || !category) return;
    
    const session = await createSession(hrId, category);
    if (session) {
      redirect(`/dashboard/curhat/${session.id}`);
    }
  }

  return (
    <div className="container mx-auto w-full max-w-none p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengaduan</h1>
          <p className="text-muted-foreground">Sampaikan pengaduan secara aman kepada tim HR.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Pengaduan Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Tiket Pengaduan</DialogTitle>
            </DialogHeader>
            <form action={handleCreateSession}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="hrId">Pilih HR</Label>
                  <Select name="hrId" required>
                    <SelectTrigger>
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
                  <Label htmlFor="category">Kategori</Label>
                  <Select name="category" required>
                    <SelectTrigger>
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
                <Button type="submit">Buat Tiket</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <MinimalTableShell label="pengaduan" fileName="Riwayat-Pengaduan" searchPlaceholder="Cari nomor tiket, kategori, HR..." showImport={false} dateFilter className="w-full">
        <Table className="w-full">
          <TableHeader><TableRow><TableHead>No. Tiket</TableHead><TableHead>Kategori</TableHead><TableHead>HR</TableHead><TableHead>Status</TableHead><TableHead>Diperbarui</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {sessions.length === 0 ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Belum ada pengaduan.</TableCell></TableRow> : sessions.map((session) => {
              const status = getHrTicketStatus(session.status);
              return <TableRow key={session.id}><TableCell className="font-semibold">{session.ticketNumber ?? `HR-${session.id}`}</TableCell><TableCell>{session.category}</TableCell><TableCell>{session.hrName}</TableCell><TableCell><Badge className={status.className}>{status.label}</Badge></TableCell><TableCell data-date-value={session.updatedAt.toISOString()}>{session.updatedAt.toLocaleDateString("id-ID")}</TableCell><TableCell className="text-right"><Link href={`/dashboard/curhat/${session.id}`} className="font-semibold text-primary hover:underline">Buka</Link></TableCell></TableRow>;
            })}
          </TableBody>
        </Table>
      </MinimalTableShell>
    </div>
  );
}
