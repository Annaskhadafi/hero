"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Boxes,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  Plus,
  Layers,
  MapPin,
  ExternalLink,
  Clock,
  Eye,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  HeroDataTable,
  HeroKpiCard,
  HeroColumnDef,
} from "@/components/templates"

import {
  WarehouseRepairItem,
  WarehouseRepairInbound,
  WarehouseRepairOutbound,
  WarehouseRepairType,
  WarehouseRepairUnit,
  WarehouseRepairMetrics,
  WarehouseRepairPageShell,
  TableRbacAccess,
  PRESET_SLOCS,
} from "./types"

import {
  ItemFormDialog,
  TransactionFormDialog,
  TransferStockDialog,
  ItemDetailModal,
} from "./warehouse-repair-dialogs"

export function WarehouseRepairOverview({
  data,
  access,
}: {
  data: {
    items: WarehouseRepairItem[]
    types: WarehouseRepairType[]
    units: WarehouseRepairUnit[]
    inbound: WarehouseRepairInbound[]
    outbound: WarehouseRepairOutbound[]
    metrics?: WarehouseRepairMetrics
  }
  access?: TableRbacAccess
}) {
  const router = useRouter()
  const [openItemForm, setOpenItemForm] = useState(false)
  const [openInboundForm, setOpenInboundForm] = useState(false)
  const [openOutboundForm, setOpenOutboundForm] = useState(false)
  const [openTransferForm, setOpenTransferForm] = useState(false)
  const [selectedDetailItem, setSelectedDetailItem] = useState<WarehouseRepairItem | null>(null)

  const metrics = data.metrics ?? {
    items: data.items.length,
    lowStock: data.items.filter((i) => i.stock <= i.minimumStock).length,
    inbound: data.inbound.length,
    outbound: data.outbound.length,
    totalStock: data.items.reduce((s, i) => s + Number(i.stock || 0), 0),
  }

  // Low stock items
  const lowStockItems = data.items.filter((i) => Number(i.stock || 0) <= Number(i.minimumStock || 0))

  // Recent movements combined & sorted
  const recentMovements = [
    ...data.inbound.map((inb) => ({
      id: `in-${inb.id}`,
      type: "in" as const,
      transactionNo: inb.transactionNo,
      date: inb.transactionDate,
      itemCode: inb.itemCode || "-",
      itemName: inb.itemName || "-",
      qty: inb.quantity,
      sloc: inb.targetSLoc || "RS01",
      slocDesc: inb.targetSLocDesc || "Balikpapan",
      note: inb.note || "Barang Masuk",
    })),
    ...data.outbound.map((out) => ({
      id: `out-${out.id}`,
      type: "out" as const,
      transactionNo: out.transactionNo,
      date: out.transactionDate,
      itemCode: out.itemCode || "-",
      itemName: out.itemName || "-",
      qty: out.quantity,
      sloc: out.storageLocation || "RS01",
      slocDesc: out.outboundType === "Stock Transfer" ? `Transfer ke ${out.destinationSLoc || "Gudang"}` : "Pemakaian Internal",
      note: out.note || "Barang Keluar",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  // S-Loc Summary
  const slocCounts = PRESET_SLOCS.map((preset) => {
    const count = data.items
      .filter((i) => (i.storageLocation || "").toUpperCase() === preset.code.toUpperCase())
      .reduce((sum, item) => sum + Number(item.stock || 0), 0)
    return { ...preset, stockCount: count }
  })

  // Columns for low stock alert table
  const lowStockColumns: HeroColumnDef<WarehouseRepairItem>[] = [
    {
      key: "itemCode",
      header: "Kode Part",
      width: "140px",
      render: (row) => <span className="font-mono text-xs font-bold text-primary">{row.itemCode}</span>,
    },
    {
      key: "itemName",
      header: "Nama Barang",
      render: (row) => (
        <div>
          <div className="font-semibold text-xs text-foreground">{row.itemName}</div>
          {row.materialDesc && <div className="text-[11px] text-muted-foreground truncate max-w-[240px]">{row.materialDesc}</div>}
        </div>
      ),
    },
    {
      key: "storageLocation",
      header: "S-Loc",
      width: "100px",
      render: (row) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {row.storageLocation || "RS01"}
        </span>
      ),
    },
    {
      key: "stock",
      header: "Stok Fisik",
      align: "center",
      width: "90px",
      render: (row) => (
        <Badge variant="destructive" className="font-bold text-xs">
          {row.stock} {row.unitName || ""}
        </Badge>
      ),
    },
    {
      key: "minimumStock",
      header: "Min Buffer",
      align: "center",
      width: "90px",
      render: (row) => <span className="text-xs font-semibold text-muted-foreground">{row.minimumStock}</span>,
    },
  ]

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <WarehouseRepairPageShell
      title="Warehouse Command Center"
      description="Monitoring persediaan material, stok minimum suku cadang repair, dan mutasi barang terkini."
    >
      {/* 1. SCORECARD METRICS (5 Colorful Tone KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <HeroKpiCard
          title="Total Ragam Part"
          value={metrics.items}
          unit="SKU"
          tone="blue"
          icon={<Boxes className="size-5" />}
        />
        <HeroKpiCard
          title="Total Fisik Stok"
          value={metrics.totalStock}
          unit="Unit"
          tone="emerald"
          icon={<Layers className="size-5" />}
        />
        <HeroKpiCard
          title="Alert Low Stock"
          value={metrics.lowStock}
          unit="Kritis"
          tone={metrics.lowStock > 0 ? "amber" : "emerald"}
          icon={<AlertTriangle className="size-5" />}
        />
        <HeroKpiCard
          title="Barang Masuk"
          value={metrics.inbound}
          unit="Transaksi"
          tone="cyan"
          icon={<PackagePlus className="size-5" />}
        />
        <HeroKpiCard
          title="Barang Keluar"
          value={metrics.outbound}
          unit="Transaksi"
          tone="rose"
          icon={<PackageMinus className="size-5" />}
        />
      </div>

      {/* 2. QUICK ACTION PANEL */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Aksi Cepat Gudang:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {access?.canCreate !== false ? (
            <>
              <Button
                type="button"
                onClick={() => setOpenItemForm(true)}
                className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
              >
                <Plus className="size-3.5" /> Tambah Barang
              </Button>
              <Button
                type="button"
                onClick={() => setOpenInboundForm(true)}
                variant="outline"
                className="h-9 gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/40"
              >
                <PackagePlus className="size-3.5" /> Barang Masuk
              </Button>
              <Button
                type="button"
                onClick={() => setOpenOutboundForm(true)}
                variant="outline"
                className="h-9 gap-1.5 text-xs text-blue-700 border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/40"
              >
                <PackageMinus className="size-3.5" /> Barang Keluar
              </Button>
              <Button
                type="button"
                onClick={() => setOpenTransferForm(true)}
                variant="outline"
                className="h-9 gap-1.5 text-xs text-purple-700 border-purple-300 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/40"
              >
                <ArrowRightLeft className="size-3.5" /> Transfer S-Loc
              </Button>
            </>
          ) : null}
          <Link href="/dashboard/warehouse-repair/laporan-stok">
            <Button type="button" variant="ghost" size="sm" className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
              <ExternalLink className="size-3.5" /> Laporan Lengkap
            </Button>
          </Link>
        </div>
      </div>

      {/* 3. TWO-COLUMN OPERATIONAL DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: LOW STOCK MONITORING TABLE */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="py-3.5 px-5 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Peringatan Stok Minimum (Low Stock Alert)
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Daftar material yang stok fisiknya telah mencapai batas aman atau kosong.
                </p>
              </div>
              <Badge variant={lowStockItems.length > 0 ? "destructive" : "default"} className="text-xs">
                {lowStockItems.length} Item
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <HeroDataTable
                data={lowStockItems}
                columns={lowStockColumns}
                idField="id"
                searchPlaceholder="Cari item low stock..."
                searchKeys={["itemCode", "itemName", "materialDesc", "storageLocation"]}
                enableExport={false}
                emptyTitle="Semua Stok Aman"
                emptyDescription="Tidak ada barang repair yang berada di bawah stok minimum saat ini."
                renderRowActions={(row) => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-primary"
                    onClick={() => setSelectedDetailItem(row)}
                  >
                    <Eye className="size-3.5 mr-1" /> Detail
                  </Button>
                )}
              />
            </CardContent>
          </Card>

          {/* S-LOC DISTRIBUTION BADGES */}
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="py-3 px-5 border-b border-border/70 bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="size-3.5 text-primary" /> Posisi Stok Fisik per Gudang (S-Loc)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {slocCounts.map((s) => (
                  <div key={s.code} className="rounded-xl border border-border/60 bg-muted/10 p-3 text-center">
                    <span className="text-[10px] font-bold text-primary font-mono block">{s.code}</span>
                    <span className="text-xs font-semibold text-foreground truncate block">{s.desc}</span>
                    <div className="text-base font-bold text-foreground mt-1">
                      {s.stockCount} <span className="text-[10px] font-normal text-muted-foreground">unit</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KANAN: RECENT MUTATIONS FEED */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="py-3.5 px-5 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  Riwayat Mutasi Terkini
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  10 aktivitas penerimaan dan pengeluaran barang terbaru.
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {recentMovements.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Belum ada transaksi mutasi.</div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentMovements.map((mov) => (
                    <div key={mov.id} className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-muted/30 rounded-lg transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                            mov.type === "in"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                          }`}
                        >
                          {mov.type === "in" ? <PackagePlus className="size-4" /> : <PackageMinus className="size-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-foreground">{mov.itemCode}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">{mov.itemName}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{new Date(mov.date).toLocaleDateString("id-ID")}</span>
                            <span>•</span>
                            <span>{mov.slocDesc}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge
                          variant={mov.type === "in" ? "default" : "outline"}
                          className={`text-[11px] font-bold ${
                            mov.type === "in"
                              ? "bg-emerald-600 text-white"
                              : "text-blue-700 border-blue-300 dark:text-blue-400"
                          }`}
                        >
                          {mov.type === "in" ? "+" : "-"}
                          {mov.qty}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL DIALOGS */}
      <ItemFormDialog
        open={openItemForm}
        onOpenChange={setOpenItemForm}
        types={data.types}
        units={data.units}
        onSuccess={handleRefresh}
      />
      <TransactionFormDialog
        kind="in"
        items={data.items}
        open={openInboundForm}
        onOpenChange={setOpenInboundForm}
        onSuccess={handleRefresh}
      />
      <TransactionFormDialog
        kind="out"
        items={data.items}
        open={openOutboundForm}
        onOpenChange={setOpenOutboundForm}
        onSuccess={handleRefresh}
      />
      <TransferStockDialog
        items={data.items}
        open={openTransferForm}
        onOpenChange={setOpenTransferForm}
        onSuccess={handleRefresh}
      />
      <ItemDetailModal
        item={selectedDetailItem}
        open={Boolean(selectedDetailItem)}
        onOpenChange={(open) => !open && setSelectedDetailItem(null)}
      />
    </WarehouseRepairPageShell>
  )
}
