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
import { CargoManifestTable } from "@/components/cargo-manifest-table";
import {
  MasterGoodsDialog,
  MasterGoodsRowActions,
  MasterLocationDialog,
  MasterLocationRowActions,
  MasterRecipientDialog,
  MasterRecipientRowActions,
  MasterSiteDialog,
  MasterSiteRowActions,
} from "@/components/cargo-master-panels";
import { getCargoManifests } from "@/app/actions/cargo-manifest";
import { getMasterGoods, getMasterLocations, getMasterRecipients, getMasterSites } from "@/app/actions/cargo-master";

export default async function CargoManifestPage() {
  const [manifests, masterGoods, masterLocations, masterRecipients, masterSites] = await Promise.all([
    getCargoManifests(),
    getMasterGoods(),
    getMasterLocations(),
    getMasterRecipients(),
    getMasterSites(),
  ]);

  const totalItems = manifests.reduce((sum, m) => sum + m.items.length, 0);
  const sent = manifests.filter((m) => m.status === "sent").length;
  const delivered = manifests.filter((m) => m.status === "delivered").length;
  const draft = manifests.filter((m) => m.status === "draft").length;

  const destinations = Array.from(new Set(manifests.map((m) => m.finalDestination).filter(Boolean))).sort();
  const statuses = Array.from(new Set(manifests.map((m) => m.status))).sort();
  const empty = (value: string | null | undefined) => value?.trim() || "-";

  return (
    <AdminPageShell
      eyebrow="Logistik ? Cargo"
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

        {/* ??? List Tab ??? */}
        <TabsContent value="list">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Cargo Manifest</h3>
                <p className="text-sm text-muted-foreground">
                  Daftar seluruh dokumen cargo manifest dengan detail item dan status pengiriman.
                </p>
              </div>
              <div className="flex gap-2">
                <CargoManifestImportDialog />
                <CargoManifestCreateDialog />
              </div>
            </div>
            <CargoManifestTable manifests={manifests} />
          </div>
        </TabsContent>

        {/* === Master Data Tab === */}
        <TabsContent value="master" className="space-y-4">
          <Tabs defaultValue="items" className="space-y-4">
            <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
              <TabsTrigger value="items">Master Data Item</TabsTrigger>
              <TabsTrigger value="locations">Master Data Lokasi</TabsTrigger>
              <TabsTrigger value="recipients">Master Data Penerima</TabsTrigger>
              <TabsTrigger value="sites">Master Data Site</TabsTrigger>
            </TabsList>

            {/* Master Data Item */}
            <TabsContent value="items">
              <AdminTableCard
                title="Master Data Item / Barang"
                description="Data master barang untuk referensi saat membuat cargo manifest."
                columns={["Nama Barang", "Kategori", "Brand", "Unit", "Berat", "Dimensi", "Aksi"]}
                actions={<MasterGoodsDialog mode="create" />}
                rows={masterGoods.map((item, idx) => [
                  <span key={`goods-${idx}`} className="font-medium">
                    {item.goodsName}
                  </span>,
                  empty(item.category),
                  empty(item.brand),
                  empty(item.unit),
                  empty(item.weight),
                  empty(item.dimensions),
                  <MasterGoodsRowActions key={`actions-${idx}`} row={item} />,
                ])}
              />
            </TabsContent>

            {/* Master Data Lokasi */}
            <TabsContent value="locations">
              <AdminTableCard
                title="Master Data Lokasi"
                description="Data master lokasi tujuan untuk referensi saat membuat cargo manifest."
                columns={["Nama Lokasi", "Alamat", "Kota", "Provinsi", "Contact Person", "Phone", "Aksi"]}
                actions={<MasterLocationDialog mode="create" />}
                rows={masterLocations.map((loc, idx) => [
                  <span key={`loc-${idx}`} className="font-medium">
                    {loc.locationName}
                  </span>,
                  <span key={`addr-${idx}`} className="max-w-[200px] truncate text-xs text-muted-foreground block" title={loc.address || undefined}>
                    {empty(loc.address)}
                  </span>,
                  empty(loc.city),
                  empty(loc.province),
                  empty(loc.contactPerson),
                  empty(loc.contactPhone),
                  <MasterLocationRowActions key={`actions-${idx}`} row={loc} />,
                ])}
              />
            </TabsContent>

            {/* Master Data Penerima */}
            <TabsContent value="recipients">
              <AdminTableCard
                title="Master Data Penerima"
                description="Data master penerima barang untuk referensi saat membuat cargo manifest."
                columns={["Nama Penerima", "Perusahaan", "Contact Person", "Phone", "Email", "Kota", "Aksi"]}
                actions={<MasterRecipientDialog mode="create" />}
                rows={masterRecipients.map((rec, idx) => [
                  <span key={`rec-${idx}`} className="font-medium">
                    {rec.recipientName}
                  </span>,
                  empty(rec.companyName),
                  empty(rec.contactPerson),
                  empty(rec.contactPhone),
                  empty(rec.contactEmail),
                  empty(rec.city),
                  <MasterRecipientRowActions key={`actions-${idx}`} row={rec} />,
                ])}
              />
            </TabsContent>
            <TabsContent value="sites">
              <AdminTableCard
                title="Master Data Site"
                description="Data master site untuk referensi saat membuat cargo manifest."
                columns={["Nama Site", "Lokasi", "Notes", "Aksi"]}
                actions={<MasterSiteDialog mode="create" />}
                rows={masterSites.map((site, idx) => [
                  <span key={`site-${idx}`} className="font-medium">
                    {site.siteName}
                  </span>,
                  empty(site.location),
                  empty(site.notes),
                  <MasterSiteRowActions key={`actions-${idx}`} row={site} />,
                ])}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
