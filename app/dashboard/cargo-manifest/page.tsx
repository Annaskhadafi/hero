import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminTableCard } from "@/components/admin-table-card";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { TableFilterPresets } from "@/components/table-filter-presets";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CargoManifestCreateDialog,
  CargoManifestRowActions,
  CargoManifestStatusAction,
  CargoManifestImportDialog,
} from "@/components/cargo-manifest-panels";
import { getCargoManifests } from "@/app/actions/cargo-manifest";

export default async function CargoManifestPage() {
  const manifests = await getCargoManifests();

  const totalItems = manifests.reduce((sum, m) => sum + m.items.length, 0);
  const sent = manifests.filter((m) => m.status === "sent").length;
  const delivered = manifests.filter((m) => m.status === "delivered").length;
  const draft = manifests.filter((m) => m.status === "draft").length;

  const destinations = Array.from(new Set(manifests.map((m) => m.finalDestination).filter(Boolean))).sort();
  const statuses = Array.from(new Set(manifests.map((m) => m.status))).sort();

  return (
    <AdminPageShell
      eyebrow="Logistik • Cargo"
      title="Cargo Manifest"
      description="Daftar pengiriman barang / cargo manifest PT. Chitra Paratama."
      actions={
        <>
          <CargoManifestImportDialog />
          <CargoManifestCreateDialog />
        </>
      }
    >
      {/* KPI Summary */}
      <AdminMetricGrid
        items={[
          { label: "Total Manifest", value: `${manifests.length}`, meta: "Semua dokumen" },
          { label: "Draft", value: `${draft}`, meta: "Belum dikirim" },
          { label: "Sent", value: `${sent}`, meta: "Sudah dikirim" },
          { label: "Delivered", value: `${delivered}`, meta: "Sudah diterima" },
        ]}
      />

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="list">Daftar Pengiriman</TabsTrigger>
          <TabsTrigger value="master">Master Data Manifest</TabsTrigger>
        </TabsList>

        {/* ─── List Tab ─── */}
        <TabsContent value="list">
          <AdminTableCard
            title="Cargo Manifest"
            description="Daftar seluruh dokumen cargo manifest dengan detail item dan status pengiriman."
            columns={["No. Manifest", "Tanggal", "Attention", "Transport Via", "Tujuan", "Items", "Status", "Aksi"]}
            dateFilter
            actions={<CargoManifestCreateDialog />}
            presets={
              <TableFilterPresets
                presets={[
                  { label: "Draft", filters: { status: "draft" } },
                  { label: "Sent", filters: { status: "sent" } },
                  { label: "Delivered", filters: { status: "delivered" } },
                ]}
              />
            }
            filters={
              <>
                <TableMultiFilter
                  label="status"
                  filterKey="status"
                  options={statuses.map((s) => ({ value: s, label: s }))}
                />
                <TableMultiFilter
                  label="tujuan"
                  filterKey="destination"
                  options={destinations.map((d) => ({ value: d, label: d }))}
                />
              </>
            }
            rows={manifests.map((m, idx) => [
              <span key={`mn-${idx}`} className="font-mono text-xs font-semibold text-primary">
                {m.manifestNumber}
              </span>,
              m.date,
              m.attention || "—",
              m.transportVia || "—",
              m.finalDestination || "—",
              <span key={`items-${idx}`} className="text-xs text-muted-foreground">
                {m.items.length} item
              </span>,
              <AdminStatusBadge key={`status-${idx}`} value={m.status} />,
              <CargoManifestRowActions key={`actions-${idx}`} row={m} />,
            ])}
            rowAttributes={manifests.map((m) => ({
              "data-date-value": m.createdAt?.toISOString?.() ?? "",
              "data-filter-status": m.status,
              "data-filter-destination": m.finalDestination,
            }))}
          />
        </TabsContent>

        {/* ─── Master Data Tab ─── */}
        <TabsContent value="master">
          <AdminTableCard
            title="Master Data Manifest"
            description="Data master seluruh cargo manifest untuk referensi dan update status inline."
            columns={["No. Manifest", "Tanggal", "Transport Via", "Kiriman Via", "Tujuan Akhir", "Status", "Ubah Status"]}
            showImport={false}
            rows={manifests.map((m, idx) => [
              <span key={`mn2-${idx}`} className="font-mono text-xs font-semibold">
                {m.manifestNumber}
              </span>,
              m.date,
              m.transportVia || "—",
              m.shippedVia || "—",
              m.finalDestination || "—",
              <AdminStatusBadge key={`s2-${idx}`} value={m.status} />,
              <CargoManifestStatusAction key={`sa-${idx}`} id={m.id} currentStatus={m.status} />,
            ])}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
