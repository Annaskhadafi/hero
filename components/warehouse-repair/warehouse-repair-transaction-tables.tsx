"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  PackagePlus,
  PackageMinus,
  Plus,
  FilePenLine,
  Trash2,
  FileText,
  Printer,
  Boxes,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSession } from "@/lib/auth-client"
import {
  createCargoManifestFromOutbound,
  createCargoManifestFromMultipleOutbound,
  type CargoManifestRecord,
} from "@/app/actions/cargo-manifest"
import { CargoManifestPdfDialog } from "@/components/cargo-manifest-panels"

import {
  HeroDataTable,
  HeroKpiCard,
  HeroColumnDef,
  HeroTableFilter,
} from "@/components/templates"

import {
  WarehouseRepairItem,
  WarehouseRepairInbound,
  WarehouseRepairOutbound,
  WarehouseRepairPageShell,
  TableRbacAccess,
} from "./types"

import {
  TransactionFormDialog,
  ConfirmDeleteDialog,
} from "./warehouse-repair-dialogs"

import {
  deleteWarehouseRepairInbound,
  deleteWarehouseRepairOutbound,
} from "@/app/actions/warehouse-repair"

// ------------------------------------------------------------------
// 1. INBOUND TRANSACTION TABLE (BARANG MASUK)
// ------------------------------------------------------------------
export function WarehouseRepairInboundTable({
  inbound,
  items,
  access,
}: {
  inbound: WarehouseRepairInbound[]
  items: WarehouseRepairItem[]
  access?: TableRbacAccess
}) {
  const router = useRouter()
  const [openCreate, setOpenCreate] = useState(false)
  const [editRecord, setEditRecord] = useState<WarehouseRepairInbound | null>(null)
  const [deleteRecord, setDeleteRecord] = useState<WarehouseRepairInbound | null>(null)

  const handleRefresh = () => {
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteRecord) return
    const res = await deleteWarehouseRepairInbound(deleteRecord.id)
    if (res.success) {
      toast.success(`Transaksi masuk #${deleteRecord.transactionNo} berhasil dihapus`)
      handleRefresh()
    } else {
      toast.error(res.error || "Gagal menghapus transaksi")
    }
  }

  const columns: HeroColumnDef<WarehouseRepairInbound>[] = [
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
      render: (row) => <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{row.itemCode}</span>,
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
      key: "typeName",
      header: "Kategori",
      sortable: true,
      width: "120px",
      render: (row) => <span className="text-xs text-muted-foreground">{row.typeName || "-"}</span>,
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
      width: "100px",
      render: (row) => (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white">
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

  return (
    <WarehouseRepairPageShell
      title="Barang Masuk (Inbound)"
      description="Pencatatan penerimaan suku cadang dan material repair untuk penambahan stok gudang."
    >
      <div className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HeroKpiCard
            title="Total Transaksi Masuk"
            value={inbound.length}
            unit="Transaksi"
            tone="cyan"
            icon={<PackagePlus className="size-5" />}
          />
          <HeroKpiCard
            title="Total Qty Diterima"
            value={inbound.reduce((s, r) => s + Number(r.quantity || 0), 0)}
            unit="Unit"
            tone="emerald"
          />
          <HeroKpiCard
            title="Ragam Item Diterima"
            value={new Set(inbound.map((r) => r.itemId || r.itemCode)).size}
            unit="SKU"
            tone="blue"
          />
        </div>

        <HeroDataTable
          data={inbound}
          columns={columns}
          idField="id"
          searchPlaceholder="Cari no transaksi, kode, nama barang, s-loc..."
          searchKeys={["transactionNo", "itemCode", "itemName", "materialDesc", "targetSLoc", "targetSLocDesc", "note"]}
          exportFileName="transaksi-barang-masuk-repair"
          pdfTitle="Rekapitulasi Barang Masuk - Warehouse Repair"
          headerActions={
            access?.canCreate !== false ? (
              <Button
                type="button"
                onClick={() => setOpenCreate(true)}
                className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
              >
                <Plus className="size-3.5" /> Entri Barang Masuk
              </Button>
            ) : null
          }
          renderRowActions={(row) => (
            <div className="flex items-center justify-end gap-1">
              {access?.canEdit !== false ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  title="Edit Transaksi Masuk"
                  onClick={() => setEditRecord(row)}
                >
                  <FilePenLine className="size-3.5 text-blue-600" />
                </Button>
              ) : null}
              {access?.canDelete !== false ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs hover:bg-destructive/10"
                  title="Hapus Transaksi Masuk"
                  onClick={() => setDeleteRecord(row)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              ) : null}
            </div>
          )}
        />
      </div>

      <TransactionFormDialog
        kind="in"
        items={items}
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSuccess={handleRefresh}
      />
      <TransactionFormDialog
        kind="in"
        items={items}
        transaction={editRecord}
        open={Boolean(editRecord)}
        onOpenChange={(open) => !open && setEditRecord(null)}
        onSuccess={handleRefresh}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleteRecord)}
        onOpenChange={(open) => !open && setDeleteRecord(null)}
        title="Hapus Transaksi Barang Masuk"
        description={`Apakah Anda yakin ingin menghapus transaksi "${deleteRecord?.transactionNo}"? Stok barang terkait akan dikurangi kembali.`}
        onConfirm={handleDelete}
      />
    </WarehouseRepairPageShell>
  )
}

// ------------------------------------------------------------------
// 2. OUTBOUND TRANSACTION TABLE (BARANG KELUAR & CARGO MANIFEST)
// ------------------------------------------------------------------
export function WarehouseRepairOutboundTable({
  outbound,
  items,
  access,
}: {
  outbound: WarehouseRepairOutbound[]
  items: WarehouseRepairItem[]
  access?: TableRbacAccess
}) {
  const router = useRouter()
  const { data: session } = useSession()
  const userSignerName = session?.user?.name || ""

  const [openCreate, setOpenCreate] = useState(false)
  const [editRecord, setEditRecord] = useState<WarehouseRepairOutbound | null>(null)
  const [deleteRecord, setDeleteRecord] = useState<WarehouseRepairOutbound | null>(null)

  // Cargo Manifest modal state
  const [cargoManifest, setCargoManifest] = useState<CargoManifestRecord | null>(null)
  const [openCargoPdf, setOpenCargoPdf] = useState(false)
  const [isGeneratingCargo, startCargoTransition] = useTransition()

  const handleRefresh = () => {
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteRecord) return
    const res = await deleteWarehouseRepairOutbound(deleteRecord.id)
    if (res.success) {
      toast.success(`Transaksi keluar #${deleteRecord.transactionNo} berhasil dihapus`)
      handleRefresh()
    } else {
      toast.error(res.error || "Gagal menghapus transaksi")
    }
  }

  // Single row Cargo Manifest print
  const handlePrintSingleCargo = (row: WarehouseRepairOutbound) => {
    startCargoTransition(async () => {
      const toastId = toast.loading("Membuat dokumen Cargo Manifest...")
      try {
        const res = await createCargoManifestFromOutbound(row.id, userSignerName)
        if (res.success && res.manifest) {
          toast.success("Dokumen Cargo Manifest siap", { id: toastId })
          setCargoManifest(res.manifest)
          setOpenCargoPdf(true)
        } else {
          toast.error(res.error || "Gagal membuat Cargo Manifest", { id: toastId })
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal memproses", { id: toastId })
      }
    })
  }

  // Multi-item bulk Cargo Manifest conversion via Floating Action Bar
  const handleConvertBulkToCargo = (selectedIds: string[]) => {
    if (selectedIds.length === 0) return
    const numericIds = selectedIds.map(Number)

    startCargoTransition(async () => {
      const toastId = toast.loading(`Menggabungkan ${selectedIds.length} item ke Cargo Manifest...`)
      try {
        const res = await createCargoManifestFromMultipleOutbound(numericIds, userSignerName)
        if (res.success && res.manifest) {
          toast.success("Dokumen gabungan Cargo Manifest siap", { id: toastId })
          setCargoManifest(res.manifest)
          setOpenCargoPdf(true)
        } else {
          toast.error(res.error || "Gagal membuat Cargo Manifest gabungan", { id: toastId })
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal memproses dokumen gabungan", { id: toastId })
      }
    })
  }

  const filters: HeroTableFilter[] = [
    {
      key: "outboundType",
      title: "Tipe Pengeluaran",
      options: [
        { value: "Pemakaian Internal", label: "Pemakaian Internal" },
        { value: "Stock Transfer", label: "Stock Transfer (Pindah Gudang)" },
      ],
    },
  ]

  const columns: HeroColumnDef<WarehouseRepairOutbound>[] = [
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
      render: (row) => <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{row.itemCode}</span>,
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
      render: (row) => {
        const isTransfer = row.outboundType === "Stock Transfer"
        return (
          <Badge variant={isTransfer ? "default" : "outline"} className={`text-[11px] ${isTransfer ? "bg-purple-600 text-white" : ""}`}>
            {row.outboundType || "Pemakaian Internal"}
          </Badge>
        )
      },
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
      width: "100px",
      render: (row) => (
        <Badge variant="outline" className="border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400 font-bold text-xs">
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

  return (
    <WarehouseRepairPageShell
      title="Barang Keluar (Outbound)"
      description="Pencatatan pemakaian internal workshop dan transfer part ke gudang cabang dengan cetak Cargo Manifest."
    >
      <div className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <HeroKpiCard
            title="Total Transaksi Keluar"
            value={outbound.length}
            unit="Transaksi"
            tone="rose"
            icon={<PackageMinus className="size-5" />}
          />
          <HeroKpiCard
            title="Total Qty Keluar"
            value={outbound.reduce((s, r) => s + Number(r.quantity || 0), 0)}
            unit="Unit"
            tone="amber"
          />
          <HeroKpiCard
            title="Stock Transfer Cabang"
            value={outbound.filter((r) => r.outboundType === "Stock Transfer").length}
            unit="Transfer"
            tone="purple"
          />
          <HeroKpiCard
            title="Pemakaian Internal"
            value={outbound.filter((r) => r.outboundType !== "Stock Transfer").length}
            unit="Transaksi"
            tone="blue"
          />
        </div>

        {/* Hero Data Table with Multi-Select & Floating Bulk Actions */}
        <HeroDataTable
          data={outbound}
          columns={columns}
          idField="id"
          searchPlaceholder="Cari no transaksi, kode, nama barang, tujuan..."
          searchKeys={["transactionNo", "itemCode", "itemName", "materialDesc", "destinationSLoc", "destinationSLocDesc", "note"]}
          filters={filters}
          showSelection={true}
          exportFileName="transaksi-barang-keluar-repair"
          pdfTitle="Rekapitulasi Barang Keluar - Warehouse Repair"
          headerActions={
            access?.canCreate !== false ? (
              <Button
                type="button"
                onClick={() => setOpenCreate(true)}
                className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
              >
                <Plus className="size-3.5" /> Entri Barang Keluar
              </Button>
            ) : null
          }
          onBulkEdit={(selectedIds) => {
            // Repurposed as bulk cargo manifest trigger
            handleConvertBulkToCargo(selectedIds)
          }}
          renderRowActions={(row) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                title="Cetak Cargo Manifest"
                disabled={isGeneratingCargo}
                onClick={() => handlePrintSingleCargo(row)}
              >
                <FileText className="size-3.5 mr-1" /> Manifest
              </Button>

              {access?.canEdit !== false ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  title="Edit Transaksi"
                  onClick={() => setEditRecord(row)}
                >
                  <FilePenLine className="size-3.5 text-slate-600" />
                </Button>
              ) : null}

              {access?.canDelete !== false ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs hover:bg-destructive/10"
                  title="Hapus Transaksi"
                  onClick={() => setDeleteRecord(row)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              ) : null}
            </div>
          )}
        />
      </div>

      <TransactionFormDialog
        kind="out"
        items={items}
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSuccess={handleRefresh}
      />
      <TransactionFormDialog
        kind="out"
        items={items}
        transaction={editRecord}
        open={Boolean(editRecord)}
        onOpenChange={(open) => !open && setEditRecord(null)}
        onSuccess={handleRefresh}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleteRecord)}
        onOpenChange={(open) => !open && setDeleteRecord(null)}
        title="Hapus Transaksi Barang Keluar"
        description={`Apakah Anda yakin ingin menghapus transaksi "${deleteRecord?.transactionNo}"? Stok barang terkait akan dikembalikan ke gudang.`}
        onConfirm={handleDelete}
      />

      {/* Cargo Manifest PDF Dialog */}
      {cargoManifest && (
        <CargoManifestPdfDialog
          row={cargoManifest}
          open={openCargoPdf}
          onOpenChange={setOpenCargoPdf}
          trigger={null}
        />
      )}
    </WarehouseRepairPageShell>
  )
}
