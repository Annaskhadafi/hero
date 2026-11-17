"use client"

import React, { useState, useMemo } from "react"
import type { DateRange } from "react-day-picker"
import {
  Boxes,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  Calendar,
  Layers,
  FileSpreadsheet,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  HeroDataTable,
  HeroKpiCard,
  HeroColumnDef,
  HeroTableFilter,
  HeroDateRangePicker,
} from "@/components/templates"

import {
  WarehouseRepairItem,
  WarehouseRepairInbound,
  WarehouseRepairOutbound,
  WarehouseRepairType,
  WarehouseRepairUnit,
  WarehouseRepairPageShell,
  TableRbacAccess,
} from "./types"

export function WarehouseRepairReportsTable({
  reportType,
  items = [],
  inbound = [],
  outbound = [],
  types = [],
  units = [],
  access,
}: {
  reportType: "stock" | "inbound" | "outbound"
  items?: WarehouseRepairItem[]
  inbound?: WarehouseRepairInbound[]
  outbound?: WarehouseRepairOutbound[]
  types?: WarehouseRepairType[]
  units?: WarehouseRepairUnit[]
  access?: TableRbacAccess
}) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Titles and descriptions
  const reportConfig = {
    stock: {
      title: "Laporan Posisi Stok",
      desc: "Laporan komprehensif posisi stok fisik material dan evaluasi batas stok minimum gudang.",
      badge: "Laporan Stok",
      exportFile: "laporan-posisi-stok-repair",
      pdfTitle: "Laporan Posisi Stok Gudang - PT Chitra Paratama",
    },
    inbound: {
      title: "Laporan Barang Masuk",
      desc: "Rekapitulasi riwayat penerimaan barang masuk dan penambahan stok repair.",
      badge: "Laporan Inbound",
      exportFile: "laporan-barang-masuk-repair",
      pdfTitle: "Laporan Riwayat Barang Masuk - PT Chitra Paratama",
    },
    outbound: {
      title: "Laporan Barang Keluar",
      desc: "Rekapitulasi pengeluaran suku cadang untuk pemakaian internal workshop dan transfer ke gudang site.",
      badge: "Laporan Outbound",
      exportFile: "laporan-barang-keluar-repair",
      pdfTitle: "Laporan Riwayat Barang Keluar - PT Chitra Paratama",
    },
  }[reportType]

  // Filter by date range for inbound & outbound
  const filteredInbound = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return inbound
    return inbound.filter((row) => {
      const d = new Date(row.transactionDate).getTime()
      if (dateRange.from && d < new Date(dateRange.from).setHours(0, 0, 0, 0)) return false
      if (dateRange.to && d > new Date(dateRange.to).setHours(23, 59, 59, 999)) return false
      return true
    })
  }, [inbound, dateRange])

  const filteredOutbound = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return outbound
    return outbound.filter((row) => {
      const d = new Date(row.transactionDate).getTime()
      if (dateRange.from && d < new Date(dateRange.from).setHours(0, 0, 0, 0)) return false
      if (dateRange.to && d > new Date(dateRange.to).setHours(23, 59, 59, 999)) return false
      return true
    })
  }, [outbound, dateRange])

  // STOCK REPORT COLUMNS
  const stockColumns: HeroColumnDef<WarehouseRepairItem>[] = [
    {
      key: "itemCode",
      header: "Kode Part",
      sortable: true,
      width: "130px",
      render: (row) => <span className="font-mono text-xs font-bold text-primary">{row.itemCode}</span>,
    },
    {
      key: "itemName",
      header: "Nama Barang",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-xs text-foreground">{row.itemName}</div>
          {row.materialDesc && (
            <div className="text-[11px] text-muted-foreground truncate max-w-[280px]">
              {row.materialDesc}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "typeName",
      header: "Kategori",
      sortable: true,
      width: "140px",
      render: (row) => <span className="text-xs text-slate-700 dark:text-slate-300">{row.typeName || "-"}</span>,
    },
    {
      key: "unitName",
      header: "Satuan",
      sortable: true,
      width: "90px",
      render: (row) => <span className="text-xs text-muted-foreground">{row.unitName || "-"}</span>,
    },
    {
      key: "storageLocation",
      header: "S-Loc",
      sortable: true,
      width: "120px",
      render: (row) => (
        <div>
          <span className="font-semibold text-xs text-foreground">{row.storageLocation || "RS01"}</span>
          <span className="text-[10px] text-muted-foreground block">{row.storageLocationDesc || "Balikpapan"}</span>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stok Fisik",
      sortable: true,
      align: "center",
      width: "100px",
      render: (row) => {
        const isLow = row.stock <= row.minimumStock
        return (
          <Badge variant={isLow ? "destructive" : "default"} className="font-bold text-xs">
            {row.stock}
          </Badge>
        )
      },
    },
    {
      key: "minimumStock",
      header: "Min Buffer",
      sortable: true,
      align: "center",
      width: "90px",
      render: (row) => <span className="text-xs font-semibold text-muted-foreground">{row.minimumStock}</span>,
    },
    {
      key: "stockHealth",
      header: "Kesehatan Stok",
      sortable: true,
      align: "center",
      width: "120px",
      render: (row) => {
        const isLow = row.stock <= row.minimumStock
        return (
          <Badge variant={isLow ? "destructive" : "outline"} className="text-xs">
            {isLow ? "Low Stock Alert" : "Stok Aman"}
          </Badge>
        )
      },
    },
  ]

  // INBOUND REPORT COLUMNS
  const inboundColumns: HeroColumnDef<WarehouseRepairInbound>[] = [
    {
      key: "transactionNo",
      header: "No. Transaksi",
      sortable: true,
      width: "150px",
      render: (row) => <span className="font-mono text-xs font-bold text-primary">{row.transactionNo}</span>,
    },
    {
      key: "transactionDate",
      header: "Tanggal",
      sortable: true,
      width: "110px",
      render: (row) => (
        <span className="text-xs text-foreground">
          {new Date(row.transactionDate).toLocaleDateString("id-ID")}
        </span>
      ),
    },
    {
      key: "itemCode",
      header: "Kode Part",
      sortable: true,
      width: "130px",
      render: (row) => <span className="font-mono text-xs font-semibold">{row.itemCode}</span>,
    },
    {
      key: "itemName",
      header: "Nama Barang",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-xs text-foreground">{row.itemName}</div>
          {row.materialDesc && <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{row.materialDesc}</div>}
        </div>
      ),
    },
    {
      key: "targetSLoc",
      header: "S-Loc Penerima",
      sortable: true,
      width: "130px",
      render: (row) => (
        <div>
          <span className="font-semibold text-xs text-foreground">{row.targetSLoc || row.storageLocation || "RS01"}</span>
          <span className="text-[10px] text-muted-foreground block">{row.targetSLocDesc || row.storageLocationDesc || "Balikpapan"}</span>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Qty Masuk",
      sortable: true,
      align: "center",
      width: "110px",
      render: (row) => (
        <Badge variant="default" className="bg-emerald-600 font-bold text-xs text-white">
          +{row.quantity} {row.unitName || ""}
        </Badge>
      ),
    },
    {
      key: "note",
      header: "Keterangan",
      render: (row) => <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{row.note || "-"}</span>,
    },
  ]

  // OUTBOUND REPORT COLUMNS
  const outboundColumns: HeroColumnDef<WarehouseRepairOutbound>[] = [
    {
      key: "transactionNo",
      header: "No. Transaksi",
      sortable: true,
      width: "150px",
      render: (row) => <span className="font-mono text-xs font-bold text-primary">{row.transactionNo}</span>,
    },
    {
      key: "transactionDate",
      header: "Tanggal",
      sortable: true,
      width: "110px",
      render: (row) => (
        <span className="text-xs text-foreground">
          {new Date(row.transactionDate).toLocaleDateString("id-ID")}
        </span>
      ),
    },
    {
      key: "itemCode",
      header: "Kode Part",
      sortable: true,
      width: "130px",
      render: (row) => <span className="font-mono text-xs font-semibold">{row.itemCode}</span>,
    },
    {
      key: "itemName",
      header: "Nama Barang",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-xs text-foreground">{row.itemName}</div>
          {row.materialDesc && <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{row.materialDesc}</div>}
        </div>
      ),
    },
    {
      key: "storageLocation",
      header: "Gudang Asal",
      sortable: true,
      width: "110px",
      render: (row) => <span className="font-semibold text-xs">{row.storageLocation || "RS01"}</span>,
    },
    {
      key: "outboundType",
      header: "Tipe Keluar",
      sortable: true,
      width: "140px",
      render: (row) => (
        <Badge variant={row.outboundType === "Stock Transfer" ? "default" : "outline"} className="text-[11px]">
          {row.outboundType || "Pemakaian Internal"}
        </Badge>
      ),
    },
    {
      key: "destinationSLoc",
      header: "Tujuan / S-Loc",
      sortable: true,
      width: "130px",
      render: (row) => (
        <div>
          <span className="font-semibold text-xs text-foreground">{row.destinationSLoc || "-"}</span>
          {row.destinationSLocDesc && <span className="text-[10px] text-muted-foreground block">{row.destinationSLocDesc}</span>}
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Qty Keluar",
      sortable: true,
      align: "center",
      width: "110px",
      render: (row) => (
        <Badge variant="outline" className="border-rose-300 text-rose-700 font-bold text-xs">
          -{row.quantity} {row.unitName || ""}
        </Badge>
      ),
    },
    {
      key: "note",
      header: "Keterangan",
      render: (row) => <span className="text-xs text-muted-foreground truncate max-w-[180px] block">{row.note || "-"}</span>,
    },
  ]

  // Pre-process items for stock report filters
  const processedItems = items.map((i) => ({
    ...i,
    stockStatus: Number(i.stock || 0) <= Number(i.minimumStock || 0) ? "low" : "safe",
  }))

  const stockFilters: HeroTableFilter[] = [
    {
      key: "typeName",
      title: "Kategori",
      options: types.map((t) => ({ value: t.typeName, label: t.typeName })),
      isMulti: true,
    },
    {
      key: "stockStatus",
      title: "Kondisi Stok",
      options: [
        { value: "low", label: "Low Stock Alert" },
        { value: "safe", label: "Stok Aman" },
      ],
    },
  ]

  return (
    <WarehouseRepairPageShell
      title={reportConfig.title}
      description={reportConfig.desc}
      badge={reportConfig.badge}
    >
      <div className="space-y-4">
        {/* SCORECARD KPIS */}
        {reportType === "stock" && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <HeroKpiCard
              title="Total Ragam Part"
              value={items.length}
              unit="Part"
              tone="blue"
              icon={<Boxes className="size-5" />}
            />
            <HeroKpiCard
              title="Total Fisik Stok"
              value={items.reduce((s, i) => s + Number(i.stock || 0), 0)}
              unit="Unit"
              tone="emerald"
              icon={<Layers className="size-5" />}
            />
            <HeroKpiCard
              title="Alert Low Stock"
              value={items.filter((i) => Number(i.stock || 0) <= Number(i.minimumStock || 0)).length}
              unit="Item Kritis"
              tone="amber"
              icon={<AlertTriangle className="size-5" />}
            />
            <HeroKpiCard
              title="Stok Aman"
              value={items.filter((i) => Number(i.stock || 0) > Number(i.minimumStock || 0)).length}
              unit="Item Aman"
              tone="cyan"
            />
          </div>
        )}

        {reportType === "inbound" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <HeroKpiCard
              title="Total Transaksi Masuk"
              value={filteredInbound.length}
              unit="Transaksi"
              tone="cyan"
              icon={<PackagePlus className="size-5" />}
            />
            <HeroKpiCard
              title="Total Qty Masuk"
              value={filteredInbound.reduce((s, r) => s + Number(r.quantity || 0), 0)}
              unit="Unit"
              tone="emerald"
            />
            <HeroKpiCard
              title="Ragam Material Masuk"
              value={new Set(filteredInbound.map((r) => r.itemId || r.itemCode)).size}
              unit="SKU"
              tone="blue"
            />
          </div>
        )}

        {reportType === "outbound" && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <HeroKpiCard
              title="Total Transaksi Keluar"
              value={filteredOutbound.length}
              unit="Transaksi"
              tone="rose"
              icon={<PackageMinus className="size-5" />}
            />
            <HeroKpiCard
              title="Total Qty Keluar"
              value={filteredOutbound.reduce((s, r) => s + Number(r.quantity || 0), 0)}
              unit="Unit"
              tone="amber"
            />
            <HeroKpiCard
              title="Stock Transfer Cabang"
              value={filteredOutbound.filter((r) => r.outboundType === "Stock Transfer").length}
              unit="Transfer"
              tone="purple"
            />
            <HeroKpiCard
              title="Pemakaian Internal"
              value={filteredOutbound.filter((r) => r.outboundType !== "Stock Transfer").length}
              unit="Transaksi"
              tone="blue"
            />
          </div>
        )}

        {/* DATE RANGE FILTER FOR TRANSACTION REPORTS */}
        {reportType !== "stock" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-card/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Calendar className="size-4 text-primary" /> Filter Periode Tanggal Laporan:
            </div>
            <HeroDateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Pilih rentang tanggal..."
            />
          </div>
        )}

        {/* DATA TABLE */}
        {reportType === "stock" && (
          <HeroDataTable
            data={processedItems}
            columns={stockColumns}
            idField="id"
            searchPlaceholder="Cari part code, nama barang, material desc, s-loc..."
            searchKeys={["itemCode", "itemName", "materialDesc", "storageLocation", "typeName"]}
            filters={stockFilters}
            exportFileName={reportConfig.exportFile}
            pdfTitle={reportConfig.pdfTitle}
          />
        )}

        {reportType === "inbound" && (
          <HeroDataTable
            data={filteredInbound}
            columns={inboundColumns}
            idField="id"
            searchPlaceholder="Cari no transaksi, kode, nama barang, s-loc..."
            searchKeys={["transactionNo", "itemCode", "itemName", "materialDesc", "targetSLoc", "targetSLocDesc", "note"]}
            exportFileName={reportConfig.exportFile}
            pdfTitle={reportConfig.pdfTitle}
          />
        )}

        {reportType === "outbound" && (
          <HeroDataTable
            data={filteredOutbound}
            columns={outboundColumns}
            idField="id"
            searchPlaceholder="Cari no transaksi, kode, nama barang, tujuan..."
            searchKeys={["transactionNo", "itemCode", "itemName", "materialDesc", "destinationSLoc", "destinationSLocDesc", "note"]}
            exportFileName={reportConfig.exportFile}
            pdfTitle={reportConfig.pdfTitle}
          />
        )}
      </div>
    </WarehouseRepairPageShell>
  )
}
