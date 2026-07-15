import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import { fetchApdRequests } from "@/lib/apd-data";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DeleteApdButton } from "./delete-button";
import { ApdStatusActions } from "./status-actions";
import { normalizeApdRequestStatus } from "@/lib/apd-status";

export default async function ApdRequestsPage() {
  const currentEmployee = await getCurrentEmployee();
  const canManageStatus = currentEmployee?.role === "admin" || currentEmployee?.role === "superadmin";
  
  // For now, if the user is a superadmin (or specific roles), we might want to show all requests.
  // But typically this page shows the user's own requests. Let's fetch all if they have permission, or their own.
  // We'll just fetch all for now, as it's an admin-like dashboard view, but filter by employee if needed.
  // Wait, if it's "User Mengajukan", maybe they only see their own, unless they are admin.
  // To keep it simple and fulfill "List Semua Permintaan", we'll fetch all.
  const rows = await fetchApdRequests();
  
  return (
    <AdminPageShell
      eyebrow="HSE • Alat Pelindung Diri"
      title="Request Barang"
      description="Daftar request APD, tools, dan material beserta status prosesnya."
      actions={
        <Button asChild className="gap-2">
          <Link href="/dashboard/apd/new">
            <Plus className="size-4" />
            Ajukan Barang
          </Link>
        </Button>
      }
    >
      <AdminMetricGrid
        mode="compact"
        items={[
          { label: "Total Permintaan", value: `${rows.length}`, meta: "Total pengajuan tercatat" },
          {
            label: "Pending Approval",
            value: `${rows.filter((row) => row.status === "pending" || row.status === "pending_approval").length}`,
            meta: "Sedang dalam proses approval",
          },
          {
            label: "Selesai",
            value: `${rows.filter((row) => row.status === "complete" || row.status === "completed").length}`,
            meta: "Request sudah selesai",
          },
        ]}
      />

      <AdminTableCard
        title="Daftar Request Barang"
        description="Pantau status permintaan APD dari seluruh karyawan."
        columns={["No. Tiket", "Tanggal", "Jenis Request", "Karyawan", "Lokasi", "Menunggu Review", "Status", "Aksi"]}
        rows={rows.map((row) => [
          <span className="font-medium text-foreground" key="req">{row.requestNumber}</span>,
          row.requestDate?.toLocaleDateString("id-ID", { dateStyle: "medium" }),
          row.requestCategory,
          row.employeeName,
          row.siteName,
          row.pendingWith || "-",
          <div key={`status-${row.id}`} className="flex flex-col items-start gap-2">
            <AdminStatusBadge value={normalizeApdRequestStatus(row.status) ?? row.status} />
            {canManageStatus && <ApdStatusActions id={row.id} status={row.status} />}
          </div>,
          <div key={`action-${row.id}`} className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Preview Dokumen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Preview Permintaan APD</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden mt-4 rounded-md border">
                  <iframe 
                    src={`/print/apd/${row.id}`}
                    className="w-full h-full"
                    title="Preview Dokumen"
                  />
                </div>
              </DialogContent>
            </Dialog>
            <DeleteApdButton id={row.id} />
          </div>,
        ])}
      />
    </AdminPageShell>
  );
}
