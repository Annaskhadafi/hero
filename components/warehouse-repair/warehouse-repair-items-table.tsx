"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Boxes,
  ArrowRightLeft,
  Plus,
  Eye,
  FilePenLine,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  HeroDataTable,
  HeroKpiCard,
  HeroColumnDef,
  HeroTableFilter,
} from "@/components/templates"

import {
  WarehouseRepairItem,
  WarehouseRepairType,
  WarehouseRepairUnit,
  WarehouseRepairPageShell,
  TableRbacAccess,
} from "./types"

import {
  ItemFormDialog,
  TransferStockDialog,
  ItemDetailModal,
  ConfirmDeleteDialog,
} from "./warehouse-repair-dialogs"

import {
  deleteWarehouseRepairItem,
  bulkImportWarehouseRepairItems,
} from "@/app/actions/warehouse-repair"

export function WarehouseRepairItemsTable({
  items,
  types,
  units,
  access,
}: {
  items: WarehouseRepairItem[]
  types: WarehouseRepairType[]
  units: WarehouseRepairUnit[]
  access?: TableRbacAccess
}) {
  const router = useRouter()
  const [openCreate, setOpenCreate] = useState(false)
  const [editItem, setEditItem] = useState<WarehouseRepairItem | null>(null)
  const [detailItem, setDetailItem] = useState<WarehouseRepairItem | null>(null)
  const [transferItem, setTransferItem] = useState<WarehouseRepairItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<WarehouseRepairItem | null>(null)

  const handleRefresh = () => {
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    const res = await deleteWarehouseRepairItem(deleteItem.id)
    if (res.success) {
      toast.success(`Barang ${deleteItem.itemName} berhasil dihapus`)
      handleRefresh()
    } else {
      toast.error(res.error || "Gagal menghapus data barang")
    }
  }

  const handleBulkImport = async (payload: { rows: Record<string, any>[] }) => {
    const toastId = toast.loading("Mengimpor data barang...")
    try {
      const res = await bulkImportWarehouseRepairItems(payload.rows)
      if (res.success) {
        toast.success(`Berhasil mengimpor ${payload.rows.length} data barang`, { id: toastId })
        handleRefresh()
      } else {
        toast.error(res.error || "Gagal mengimpor data", { id: toastId })
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal impor", { id: toastId })
    }
  }

  // Filter definitions
  const filters: HeroTableFilter[] = [
    {
      key: "typeName",
      title: "Kategori",
      options: types.map((t) => ({ value: t.typeName, label: t.typeName })),
      isMulti: true,
    },
    {
      key: "unitName",
      title: "Satuan (UOM)",
      options: units.map((u) => ({ value: u.unitName, label: u.unitName })),
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
    {
      key: "activeStatus",
      title: "Status",
      options: [
        { value: "true", label: "Aktif" },
        { value: "false", label: "Nonaktif" },
      ],
    },
  ]

  // Column definitions
  const columns: HeroColumnDef<WarehouseRepairItem>[] = [
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
            <div className="text-[11px] text-muted-foreground truncate max-w-[260px]">
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
      key: "isActive",
      header: "Status",
      sortable: true,
      align: "center",
      width: "90px",
      render: (row) => (
        <Badge variant={row.isActive ? "default" : "outline"} className="text-[11px]">
          {row.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
  ]

  const importFields = [
    { key: "itemCode", label: "Kode Barang (itemCode)", required: true },
    { key: "itemName", label: "Nama Barang (itemName)", required: true },
    { key: "materialDesc", label: "Material Desc (materialDesc)" },
    { key: "typeName", label: "Kategori (typeName)" },
    { key: "unitName", label: "Satuan (unitName)" },
    { key: "storageLocation", label: "S-Loc (storageLocation)" },
    { key: "storageLocationDesc", label: "S-Loc Desc (storageLocationDesc)" },
    { key: "stock", label: "Stok Awal (stock)" },
    { key: "minimumStock", label: "Minimum Stock (minimumStock)" },
  ]

  // Pre-process items for filter matching
  const processedItems = items.map((i) => ({
    ...i,
    stockStatus: Number(i.stock || 0) <= Number(i.minimumStock || 0) ? "low" : "safe",
    activeStatus: String(Boolean(i.isActive)),
  }))

  return (
    <WarehouseRepairPageShell
      title="Master Data Barang"
      description="Katalog material, suku cadang perbaikan ban, dan posisi stok fisik gudang."
    >
      <div className="space-y-4">
        {/* KPI Scorecard */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <HeroKpiCard
            title="Total Jenis Barang"
            value={items.length}
            unit="Part"
            tone="blue"
            icon={<Boxes className="size-5" />}
          />
          <HeroKpiCard
            title="Total Akumulasi Stok"
            value={items.reduce((s, i) => s + Number(i.stock || 0), 0)}
            unit="Unit"
            tone="emerald"
          />
          <HeroKpiCard
            title="Low Stock Warning"
            value={items.filter((i) => Number(i.stock || 0) <= Number(i.minimumStock || 0)).length}
            unit="Part"
            tone="amber"
            icon={<AlertTriangle className="size-5" />}
          />
          <HeroKpiCard
            title="Barang Aktif"
            value={items.filter((i) => i.isActive).length}
            unit="Part"
            tone="cyan"
          />
        </div>

        {/* Hero Data Table */}
        <HeroDataTable
          data={processedItems}
          columns={columns}
          idField="id"
          searchPlaceholder="Cari part code, nama barang, material desc, s-loc..."
          searchKeys={["itemCode", "itemName", "materialDesc", "storageLocation", "storageLocationDesc", "typeName"]}
          filters={filters}
          exportFileName="data-barang-warehouse-repair"
          pdfTitle="Master Data Barang & Posisi Stok - Warehouse Repair"
          importFields={importFields}
          importTitle="Import Data Barang Warehouse Repair"
          onImport={handleBulkImport}
          headerActions={
            <div className="flex items-center gap-2">
              {access?.canCreate !== false ? (
                <>
                  <Button
                    type="button"
                    onClick={() => setOpenCreate(true)}
                    className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
                  >
                    <Plus className="size-3.5" /> Tambah Barang
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setTransferItem(items[0] || null)}
                    variant="outline"
                    className="h-9 gap-1.5 text-xs text-purple-700 border-purple-300 hover:bg-purple-50 dark:border-purple-800"
                  >
                    <ArrowRightLeft className="size-3.5" /> Transfer Stok
                  </Button>
                </>
              ) : null}
            </div>
          }
          renderRowActions={(row) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                title="Lihat Detail Barang"
                onClick={() => setDetailItem(row as any)}
              >
                <Eye className="size-3.5 text-slate-600" />
              </Button>

              {access?.canEdit !== false ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    title="Transfer Stok S-Loc"
                    onClick={() => setTransferItem(row as any)}
                  >
                    <ArrowRightLeft className="size-3.5 text-purple-600" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    title="Edit Data Barang"
                    onClick={() => setEditItem(row as any)}
                  >
                    <FilePenLine className="size-3.5 text-blue-600" />
                  </Button>
                </>
              ) : null}

              {access?.canDelete !== false ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs hover:bg-destructive/10"
                  title="Hapus Data Barang"
                  onClick={() => setDeleteItem(row as any)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              ) : null}
            </div>
          )}
        />
      </div>

      {/* DIALOGS */}
      <ItemFormDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        types={types}
        units={units}
        onSuccess={handleRefresh}
      />
      <ItemFormDialog
        item={editItem}
        open={Boolean(editItem)}
        onOpenChange={(open) => !open && setEditItem(null)}
        types={types}
        units={units}
        onSuccess={handleRefresh}
      />
      <TransferStockDialog
        items={items}
        defaultItem={transferItem}
        open={Boolean(transferItem)}
        onOpenChange={(open) => !open && setTransferItem(null)}
        onSuccess={handleRefresh}
      />
      <ItemDetailModal
        item={detailItem}
        open={Boolean(detailItem)}
        onOpenChange={(open) => !open && setDetailItem(null)}
        onEditClick={() => {
          setEditItem(detailItem)
        }}
        onTransferClick={() => {
          setTransferItem(detailItem)
        }}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Hapus Data Barang"
        description={`Apakah Anda yakin ingin menghapus "${deleteItem?.itemName}" (${deleteItem?.itemCode})? Data riwayat mutasi terkait akan terhapus.`}
        onConfirm={handleDelete}
      />
    </WarehouseRepairPageShell>
  )
}
