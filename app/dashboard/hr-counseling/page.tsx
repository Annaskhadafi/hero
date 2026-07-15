import { getHrSessions, getTicketForwardOptions } from "@/app/actions/hr-counseling";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getHrTicketStatus } from "@/lib/hr-ticket-status";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { HrForwardTicketForm } from "@/components/dashboard/hr-forward-ticket-form";
import { Button } from "@/components/ui/button";

export default async function HrCounselingDashboard() {
  const sessions = await getHrSessions();
  const forwardOptions = await getTicketForwardOptions();

  return (
    <div className="container mx-auto w-full max-w-none p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Pengaduan HR</h1>
        <p className="text-muted-foreground">Ringkasan dan tindak lanjut tiket pengaduan karyawan.</p>
      </div>

      <MinimalTableShell
        label="pengaduan"
        fileName="Ringkasan-Pengaduan-HR"
        searchPlaceholder="Cari nomor tiket, karyawan, kategori..."
        showImport={false}
        dateFilter
        className="w-full"
        scorecards={[
          { label: "Total", value: sessions.length, tone: "info", icon: <MessageSquare className="size-4 text-primary" /> },
          { label: "Diajukan", value: sessions.filter((session) => session.status === "open").length, tone: "warning" },
          { label: "Diproses", value: sessions.filter((session) => ["in_review", "in_progress", "waiting_user"].includes(session.status)).length, tone: "default" },
          { label: "Selesai", value: sessions.filter((session) => ["resolved", "closed"].includes(session.status)).length, tone: "success" },
        ]}
      >
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>No. Tiket</TableHead>
              <TableHead>Karyawan</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead>Diperbarui</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Belum ada pengaduan.</TableCell></TableRow>
            ) : sessions.map((session) => {
              const status = getHrTicketStatus(session.status);
              return (
                <TableRow key={session.id}>
                  <TableCell className="font-semibold">{session.ticketNumber ?? `HR-${session.id}`}</TableCell>
                  <TableCell>{session.userName}</TableCell>
                  <TableCell>{session.category}</TableCell>
                  <TableCell><Badge className={status.className}>{status.label}</Badge></TableCell>
                  <TableCell data-date-value={session.createdAt.toISOString()}>{session.createdAt.toLocaleDateString("id-ID")}</TableCell>
                  <TableCell data-date-value={session.updatedAt.toISOString()}>{session.updatedAt.toLocaleDateString("id-ID")}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-3"><Link href={`/dashboard/hr-counseling/${session.id}`} className="font-semibold text-primary hover:underline">Buka</Link><HrForwardTicketForm sessionId={session.id} {...forwardOptions} trigger={<Button variant="outline" size="sm">Teruskan</Button>} /></div></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </MinimalTableShell>
    </div>
  );
}
