"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Eye, FilePenLine, Trash2, Tag, Scale } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  HeroDataTable,
  HeroKpiCard,
  HeroColumnDef,
} from "@/components/templates"

import {
  WarehouseRepairType,
  WarehouseRepairUnit,
  WarehouseRepairPageShell,
  TableRbacAccess,
} from "./types"

import {
  MasterTypeOrUnitDialog,
  ConfirmDeleteDialog,
} from "./warehouse-repair-dialogs"

import {
  deleteWarehouseRepairType,
  deleteWarehouseRepairUnit,
  upsertWarehouseRepairType,
  upsertWarehouseRepairUnit,
} from "@/app/actions/warehouse-repair"

// ------------------------------------------------------------------
// 1. MASTER JENIS BARANG (KATEGORI)
// ------------------------------------------------------------------
export function WarehouseRepairTypesTable({
  types,
  access,
}: {
  types: WarehouseRepairType[]
  access?: TableRbacAccess
}) {
  const router = useRouter()
  const [openCreate, setOpenCreate] = useState(false)
  const [editRecord, setEditRecord] = useState<WarehouseRepairType | null>(null)
  const [deleteRecord, setDeleteRecord] = useState<WarehouseRepairType | null>(null)

  const handleRefresh = () => {
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteRecord) return
    const res = await deleteWarehouseRepairType(deleteRecord.id)
    if (res.success) {
      toast.success(`Jenis barang "${deleteRecord.typeName}" berhasil dihapus`)
      handleRefresh()
    } else {
      toast.error(res.error || "Gagal menghapus jenis barang")
    }
  }

  const handleToggleStatus = async (record: WarehouseRepairType) => {
    const res = await upsertWarehouseRepairType(
      {
        typeCode: record.typeCode,
        typeName: record.typeName,
        isActive: !record.isActive,
      },
      record.id
    )
    if (res.success) {
      toast.success(`Status ${record.typeName} diubah menjadi ${!record.isActive ? "Aktif" : "Nonaktif"}`)
      handleRefresh()
    } else {
      toast.error(res.error || "Gagal mengubah status")
    }
  }

  const columns: HeroColumnDef<WarehouseRepairType>[] = [
    {
      key: "typeCode",
      header: "Kode Kategori",
      sortable: true,
      width: "160px",
      render: (row) => <span className="font-mono text-xs font-bold text-primary">{row.typeCode}</span>,
    },
    {
      key: "typeName",
      header: "Nama Jenis / Kategori",
      sortable: true,
      render: (row) => <span className="font-semibold text-xs text-foreground">{row.typeName}</span>,
    },
    {
      key: "isActive",
      header: "Status",
      sortable: true,
      align: "center",
      width: "120px",
      render: (row) => (
        <button
          type="button"
          onClick={() => access?.canEdit !== false && handleToggleStatus(row)}
          className={`cursor-pointer transition-opacity ${access?.canEdit === false ? "cursor-default" : "hover:opacity-80"}`}
        >
          <Badge variant={row.isActive ? "default" : "outline"} className="text-xs">
            {row.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
        </button>
      ),
    },
  ]

  return (
    <WarehouseRepairPageShell
      title="Jenis Barang"
      description="Kelola kategori pengelompokan material dan part suku cadang repair."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HeroKpiCard
            title="Total Jenis Barang"
            value={types.length}
            unit="Kategori"
            tone="blue"
            icon={<Tag className="size-5" />}
          />
          <HeroKpiCard
            title="Kategori Aktif"
            value={types.filter((t) => t.isActive).length}
            unit="Kategori"
            tone="emerald"
          />
          <HeroKpiCard
            title="Kategori Nonaktif"
            value={types.filter((t) => !t.isActive).length}
            unit="Kategori"
            tone="rose"
          />
        </div>

        <HeroDataTable
          data={types}
          columns={columns}
          idField="id"
          searchPlaceholder="Cari kode atau nama jenis barang..."
          searchKeys={["typeCode", "typeName"]}
          exportFileName="master-jenis-barang-repair"
          pdfTitle="Master Data Jenis Barang - Warehouse Repair"
          headerActions={
            access?.canCreate !== false ? (
              <Button
                type="button"
                onClick={() => setOpenCreate(true)}
                className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
              >
                <Plus className="size-3.5" /> Tambah Jenis Barang
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
                  onClick={() => setDeleteRecord(row)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              ) : null}
            </div>
          )}
        />
      </div>

      <MasterTypeOrUnitDialog
        kind="type"
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSuccess={handleRefresh}
      />
      <MasterTypeOrUnitDialog
        kind="type"
        record={editRecord}
        open={Boolean(editRecord)}
        onOpenChange={(open) => !open && setEditRecord(null)}
        onSuccess={handleRefresh}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleteRecord)}
        onOpenChange={(open) => !open && setDeleteRecord(null)}
        title="Hapus Jenis Barang"
        description={`Apakah Anda yakin ingin menghapus kategori "${deleteRecord?.typeName}"?`}
        onConfirm={handleDelete}
      />
    </WarehouseRepairPageShell>
  )
}

// ------------------------------------------------------------------
// 2. MASTER SATUAN (UOM)
// ------------------------------------------------------------------
export function WarehouseRepairUnitsTable({
  units,
  access,
}: {
  units: WarehouseRepairUnit[]
  access?: TableRbacAccess
}) {
  const router = useRouter()
  const [openCreate, setOpenCreate] = useState(false)
  const [editRecord, setEditRecord] = useState<WarehouseRepairUnit | null>(null)
  const [deleteRecord, setDeleteRecord] = useState<WarehouseRepairUnit | null>(null)

  const handleRefresh = () => {
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteRecord) return
    const res = await deleteWarehouseRepairUnit(deleteRecord.id)
    if (res.success) {
      toast.success(`Satuan "${deleteRecord.unitName}" berhasil dihapus`)
      handleRefresh()
    } else {
      toast.error(res.error || "Gagal menghapus satuan")
    }
  }

  const handleToggleStatus = async (record: WarehouseRepairUnit) => {
    const res = await upsertWarehouseRepairUnit(
      {
        unitCode: record.unitCode,
        unitName: record.unitName,
        isActive: !record.isActive,
      },
      record.id
    )
    if (res.success) {
      toast.success(`Status ${record.unitName} diubah menjadi ${!record.isActive ? "Aktif" : "Nonaktif"}`)
      handleRefresh()
    } else {
      toast.error(res.error || "Gagal mengubah status")
    }
  }

  const columns: HeroColumnDef<WarehouseRepairUnit>[] = [
    {
      key: "unitCode",
      header: "Kode Satuan",
      sortable: true,
      width: "160px",
      render: (row) => <span className="font-mono text-xs font-bold text-primary">{row.unitCode}</span>,
    },
    {
      key: "unitName",
      header: "Nama Satuan (UOM)",
      sortable: true,
      render: (row) => <span className="font-semibold text-xs text-foreground">{row.unitName}</span>,
    },
    {
      key: "isActive",
      header: "Status",
      sortable: true,
      align: "center",
      width: "120px",
      render: (row) => (
        <button
          type="button"
          onClick={() => access?.canEdit !== false && handleToggleStatus(row)}
          className={`cursor-pointer transition-opacity ${access?.canEdit === false ? "cursor-default" : "hover:opacity-80"}`}
        >
          <Badge variant={row.isActive ? "default" : "outline"} className="text-xs">
            {row.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
        </button>
      ),
    },
  ]

  return (
    <WarehouseRepairPageShell
      title="Master Satuan (UOM)"
      description="Daftar unit pengukuran barang (Pieces, Roll, Kg, Meter, Box, dll)."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HeroKpiCard
            title="Total Satuan"
            value={units.length}
            unit="UOM"
            tone="blue"
            icon={<Scale className="size-5" />}
          />
          <HeroKpiCard
            title="Satuan Aktif"
            value={units.filter((u) => u.isActive).length}
            unit="UOM"
            tone="emerald"
          />
          <HeroKpiCard
            title="Satuan Nonaktif"
            value={units.filter((u) => !u.isActive).length}
            unit="UOM"
            tone="rose"
          />
        </div>

        <HeroDataTable
          data={units}
          columns={columns}
          idField="id"
          searchPlaceholder="Cari kode atau nama satuan..."
          searchKeys={["unitCode", "unitName"]}
          exportFileName="master-satuan-warehouse-repair"
          pdfTitle="Master Satuan (UOM) - Warehouse Repair"
          headerActions={
            access?.canCreate !== false ? (
              <Button
                type="button"
                onClick={() => setOpenCreate(true)}
                className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
              >
                <Plus className="size-3.5" /> Tambah Satuan
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
                  onClick={() => setDeleteRecord(row)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              ) : null}
            </div>
          )}
        />
      </div>

      <MasterTypeOrUnitDialog
        kind="unit"
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSuccess={handleRefresh}
      />
      <MasterTypeOrUnitDialog
        kind="unit"
        record={editRecord}
        open={Boolean(editRecord)}
        onOpenChange={(open) => !open && setEditRecord(null)}
        onSuccess={handleRefresh}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleteRecord)}
        onOpenChange={(open) => !open && setDeleteRecord(null)}
        title="Hapus Satuan"
        description={`Apakah Anda yakin ingin menghapus satuan "${deleteRecord?.unitName}"?`}
        onConfirm={handleDelete}
      />
    </WarehouseRepairPageShell>
  )
}
