import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import { fetchApdRequests, fetchMasterSections } from "@/lib/apd-data";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DeleteApdButton } from "./delete-button";
import { ApdStatusActions } from "./status-actions";
import { normalizeApdRequestStatus } from "@/lib/apd-status";
import { ApdSectionFilter } from "./section-filter";

import { redirect } from "next/navigation";

export default async function ApdRequestsPage(props: {
  searchParams: Promise<{ tab?: string; section?: string }>;
}) {
  const apdAccess = await getCurrentMenuPermission("apd-request");
  if (!apdAccess.canView) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const currentEmployee = await getCurrentEmployee();
  
  // Use proper RBAC check for the inventory button
  const inventoryPermission = await getCurrentMenuPermission('hse_inventaris');
  
  // Legacy status check for backward compatibility on other UI elements if needed
  const canManageStatus = currentEmployee?.role === "admin" || currentEmployee?.role === "superadmin" || apdAccess.canEdit;
  
  // Determine if the user can view the inventory button based on either legacy or new RBAC
  const canViewInventory = canManageStatus || inventoryPermission.canView;
  
  const activeTab = searchParams?.tab === "tools" || searchParams?.tab === "material" || searchParams?.tab === "apd" ? searchParams.tab : "all";
  const sectionParam = searchParams?.section || "";
  const activeSections = sectionParam ? sectionParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
  
  // Filter by employee ID if scope is own
  const employeeIdFilter = apdAccess.dataScope === "own" && currentEmployee?.id ? currentEmployee.id : undefined;
  const rows = await fetchApdRequests(employeeIdFilter);
  const masterSectionsList = await fetchMasterSections();

  // Combine DB master sections with any section names present in data rows for comprehensive coverage
  const categoryBaseRows = activeTab === "all" ? rows : rows.filter((row) => row.requestCategory === activeTab.toUpperCase());
  
  const sectionMap = new Map<string, { id: number; name: string; count: number }>();
  masterSectionsList.forEach((s) => sectionMap.set(s.name, { id: s.id, name: s.name, count: 0 }));
  
  categoryBaseRows.forEach((r, idx) => {
    const secName = r.sectionName || r.departmentName;
    if (secName) {
      const existing = sectionMap.get(secName);
      if (existing) {
        existing.count += 1;
      } else {
        sectionMap.set(secName, { id: 9000 + idx, name: secName, count: 1 });
      }
    }
  });

  const availableSections = Array.from(sectionMap.values()).filter((s) => s.count > 0 || masterSectionsList.some(ms => ms.name === s.name));

  let filteredRows = categoryBaseRows;
  if (activeSections.length > 0 && !activeSections.includes("all")) {
    const lowerSelected = activeSections.map((s) => s.toLowerCase());
    filteredRows = filteredRows.filter(
      (row) => {
        const sec = (row.sectionName || row.departmentName || "").toLowerCase();
        return lowerSelected.includes(sec);
      }
    );
  }

  const sectionQueryParam = activeSections.length > 0 ? `&section=${encodeURIComponent(activeSections.join(","))}` : "";
  
  return (
    <AdminPageShell
      eyebrow="HSE • Alat Pelindung Diri"
      title="Request Barang"
      description="Daftar request APD, tools, dan material beserta status prosesnya."
      actions={
        <div className="flex gap-2">
          {canViewInventory && (
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/apd/inventory">
                Inventory Aset
              </Link>
            </Button>
          )}
          <Button asChild className="gap-2">
            <Link href={`/dashboard/apd/new?category=${activeTab === "all" ? "apd" : activeTab}`}>
              <Plus className="size-4" />
              Ajukan Barang
            </Link>
          </Button>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex h-10 flex-wrap items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground gap-1">
          <Link
            href={`/dashboard/apd?tab=all${sectionQueryParam}`}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === "all" ? "bg-background text-foreground shadow" : "hover:text-foreground hover:bg-muted-foreground/10"
            }`}
          >
            Semua Permintaan
          </Link>
          <Link
            href={`/dashboard/apd?tab=tools${sectionQueryParam}`}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === "tools" ? "bg-background text-foreground shadow" : "hover:text-foreground hover:bg-muted-foreground/10"
            }`}
          >
            Daftar Request Tools
          </Link>
          <Link
            href={`/dashboard/apd?tab=apd${sectionQueryParam}`}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === "apd" ? "bg-background text-foreground shadow" : "hover:text-foreground hover:bg-muted-foreground/10"
            }`}
          >
            Daftar Request APD
          </Link>
          <Link
            href={`/dashboard/apd?tab=material${sectionQueryParam}`}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === "material" ? "bg-background text-foreground shadow" : "hover:text-foreground hover:bg-muted-foreground/10"
            }`}
          >
            Daftar Request Material
          </Link>
        </div>

        <ApdSectionFilter
          sections={availableSections}
          activeSections={activeSections}
          activeTab={activeTab}
        />
      </div>

      <AdminMetricGrid
        mode="compact"
        items={[
          { label: "Total Permintaan", value: `${filteredRows.length}`, meta: activeSections.length > 0 ? `Filtered: ${activeSections.join(", ")}` : "Total pengajuan tercatat" },
          {
            label: "Pending Approval",
            value: `${filteredRows.filter((row) => row.status === "pending" || row.status === "pending_approval").length}`,
            meta: "Sedang dalam proses approval",
          },
          {
            label: "Selesai",
            value: `${filteredRows.filter((row) => row.status === "complete" || row.status === "completed").length}`,
            meta: "Request sudah selesai",
          },
        ]}
      />

      <AdminTableCard
        title={
          activeTab === "all"
            ? "Seluruh Daftar Request Barang"
            : activeTab === "tools"
            ? "Daftar Request Tools"
            : activeTab === "material"
            ? "Daftar Request Material"
            : "Daftar Request APD"
        }
        description={
          activeSections.length > 0
            ? `Menampilkan permintaan untuk section: ${activeSections.join(", ")}.`
            : activeTab === "all"
            ? "Pantau status semua permintaan barang dari seluruh karyawan."
            : `Pantau status permintaan ${activeTab.toUpperCase()} dari seluruh karyawan.`
        }
        filters={
          <ApdSectionFilter
            sections={availableSections}
            activeSections={activeSections}
            activeTab={activeTab}
          />
        }
        columns={["No. Tiket", "Tanggal", "Jenis Request", "Karyawan", "Section", "Lokasi", "Menunggu Review", "Status", "Aksi"]}
        rows={filteredRows.map((row) => [
          <span className="font-medium text-foreground" key="req">{row.requestNumber}</span>,
          row.requestDate?.toLocaleDateString("id-ID", { dateStyle: "medium" }),
          row.requestCategory,
          row.employeeName,
          row.sectionName || row.departmentName || "-",
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
                  <DialogTitle>Preview Permintaan {activeTab === "all" ? row.requestCategory : activeTab.toUpperCase()}</DialogTitle>
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
