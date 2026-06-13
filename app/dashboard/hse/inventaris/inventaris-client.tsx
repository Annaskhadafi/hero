"use client"

import * as React from "react"
import { AlertCircle, AlertTriangle, CheckCircle, Eye, FileSpreadsheet, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdminTableCard } from "@/components/admin-table-card"
import { TableMultiFilter } from "@/components/ui/table-multi-filter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  HseInventoryFormDialog,
  HseInventoryDetailDialog,
} from "./inventaris-dialogs"
import { deleteHseInventory, updateHseInventoryStatus } from "@/app/actions/hse-inventaris"
import { toast } from "sonner"

type HseInventory = {
  id: number
  documentId: string
  name: string
  category: string
  qty: number
  location: string
  condition: string
  notes: string
  picName: string
  photoUrl: string
  verifiedStatus: string
  verifiedAt: Date | string
  purchaseDate: Date | string | null
  validityMonths: number | null
  expirationDate: Date | string | null
  reminderDaysBefore: number
  reminderEmailRecipients: string
  lastReminderSentAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

type HeroMenuPermission = {
  roleName: string | null
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll: boolean
}

interface ClientProps {
  data: HseInventory[]
  access: HeroMenuPermission
  userEmails?: { id: number; name: string; email: string }[]
}

export function InventarisClient({ data, access, userEmails = [] }: ClientProps) {
  const [inventories, setInventories] = React.useState<HseInventory[]>(data)
  const [mobileQuery, setMobileQuery] = React.useState("")
  const [mobileCategory, setMobileCategory] = React.useState("")
  const [mobileCondition, setMobileCondition] = React.useState("")
  
  // Dialog States
  const [formOpen, setFormOpen] = React.useState(false)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [selectedItem, setSelectedItem] = React.useState<HseInventory | null>(null)
  
  // Inline update loading state
  const [updatingId, setUpdatingId] = React.useState<number | null>(null)

  React.useEffect(() => {
    setInventories(data)
  }, [data])

  // Hitung KPI / Metrik
  const now = new Date()
  const stats = React.useMemo(() => {
    let totalQty = 0
    let baikCount = 0
    let perbaikanCount = 0
    let rusakCount = 0
    let expiredCount = 0
    let warningCount = 0 // Hampir expired (dalam reminderDaysBefore hari)

    inventories.forEach((item) => {
      totalQty += item.qty
      
      if (item.condition === "Baik") baikCount++
      else if (item.condition === "Perlu Perbaikan") perbaikanCount++
      else if (item.condition === "Rusak") rusakCount++

      if (item.expirationDate) {
        const expDate = new Date(item.expirationDate)
        const expTime = expDate.getTime()
        const nowTime = now.getTime()
        
        if (nowTime > expTime) {
          expiredCount++
        } else {
          const warningDaysMs = (item.reminderDaysBefore || 30) * 24 * 60 * 60 * 1000
          if (nowTime >= expTime - warningDaysMs) {
            warningCount++
          }
        }
      }
    })

    return {
      totalItems: inventories.length,
      totalQty,
      baikCount,
      perbaikanCount,
      rusakCount,
      expiredCount,
      warningCount,
    }
  }, [inventories])

  // Handle Edit Click
  const handleEdit = (item: HseInventory) => {
    setSelectedItem(item)
    setFormOpen(true)
  }

  // Handle View/Preview Click
  const handleView = (item: HseInventory) => {
    setSelectedItem(item)
    setDetailOpen(true)
  }

  // Handle Delete Click
  const handleDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data inventaris ini?")) return

    try {
      const res = await deleteHseInventory(id)
      if (res.success) {
        setInventories((prev) => prev.filter((item) => item.id !== id))
        toast.success("Aset berhasil dihapus dari inventaris")
      } else {
        toast.error(res.error || "Gagal menghapus aset")
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem")
    }
  }

  // Handle Inline Status Change
  const handleStatusChange = async (id: number, newCondition: string) => {
    if (!access.canEdit) {
      toast.error("Anda tidak memiliki izin untuk mengubah status aset")
      return
    }

    setUpdatingId(id)
    try {
      const res = await updateHseInventoryStatus(id, newCondition)
      if (res.success && res.data) {
        setInventories((prev) =>
          prev.map((item) => (item.id === id ? (res.data as HseInventory) : item))
        )
        toast.success(`Kondisi aset diubah menjadi ${newCondition}`)
      } else {
        toast.error(res.error || "Gagal memperbarui kondisi")
      }
    } catch (err) {
      toast.error("Terjadi kesalahan")
    } finally {
      setUpdatingId(null)
    }
  }

  // Helper render badge kondisi
  const renderConditionBadge = (item: HseInventory) => {
    const isUpdating = updatingId === item.id
    
    let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200"
    let icon = <CheckCircle className="mr-1 size-3 text-emerald-600" />
    
    if (item.condition === "Perlu Perbaikan") {
      badgeStyle = "bg-amber-50 text-amber-700 border-amber-200"
      icon = <Wrench className="mr-1 size-3 text-amber-600" />
    } else if (item.condition === "Rusak") {
      badgeStyle = "bg-rose-50 text-rose-700 border-rose-200"
      icon = <AlertTriangle className="mr-1 size-3 text-rose-600" />
    }

    const badgeEl = (
      <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-xs font-semibold flex items-center cursor-pointer transition-transform hover:scale-105 select-none ${badgeStyle}`}>
        {isUpdating ? <span className="size-2 animate-ping bg-muted-foreground rounded-full mr-1.5" /> : icon}
        {item.condition}
      </Badge>
    )

    // Jika memiliki edit permission, bungkus badge dengan dropdown untuk inline update
    if (access.canEdit) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none">{badgeEl}</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {["Baik", "Perlu Perbaikan", "Rusak"].map((cond) => (
              <DropdownMenuItem
                key={cond}
                disabled={item.condition === cond || isUpdating}
                onClick={() => handleStatusChange(item.id, cond)}
                className="font-medium"
              >
                {cond}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return badgeEl
  }

  // Filter lists options
  const categoryOptions = Array.from(new Set(inventories.map((row) => row.category))).sort()
  const conditionOptions = ["Baik", "Perlu Perbaikan", "Rusak"]

  // Formating rows for AdminTableCard
  const rows = inventories.map((row, index) => {
    // Check status expired
    let expiredBadge = null
    if (row.expirationDate) {
      const expDate = new Date(row.expirationDate)
      if (now.getTime() > expDate.getTime()) {
        expiredBadge = (
          <Badge variant="outline" className="ml-1 bg-red-100 text-red-800 border-red-200 text-[10px] py-0 px-1.5 rounded">
            EXPIRED
          </Badge>
        )
      } else {
        const warningDaysMs = (row.reminderDaysBefore || 30) * 24 * 60 * 60 * 1000
        if (now.getTime() >= expDate.getTime() - warningDaysMs) {
          expiredBadge = (
            <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-800 border-amber-200 text-[10px] py-0 px-1.5 rounded animate-pulse">
              DUE SOON
            </Badge>
          )
        }
      }
    }

    const expDateStr = row.expirationDate
      ? new Date(row.expirationDate).toLocaleDateString("id-ID", { dateStyle: "short" })
      : "-"

    const validityDisplay = row.validityMonths ? (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-[#0f172a]">{row.validityMonths} Bulan</span>
        <span className="text-[10px] text-muted-foreground flex items-center">
          Exp: {expDateStr}
          {expiredBadge}
        </span>
      </div>
    ) : (
      "-"
    )

    return [
      <span key={`index-${row.id}`} className="font-semibold text-muted-foreground">
        {index + 1}
      </span>,
      <div key={`name-${row.id}`} className="flex flex-col gap-0.5">
        <span className="font-bold text-[#0f172a]">{row.name}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{row.documentId}</span>
      </div>,
      row.category,
      <span key={`qty-${row.id}`} className="font-bold">{row.qty}</span>,
      row.location,
      validityDisplay,
      renderConditionBadge(row),
      <div key={`actions-${row.id}`} className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 hover:bg-primary/10 hover:text-primary rounded-md border"
          onClick={() => handleView(row)}
          title="Lihat Detail"
        >
          <Eye className="size-4 text-blue-600" />
        </Button>
        {access.canEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hover:bg-primary/10 hover:text-primary rounded-md border"
            onClick={() => handleEdit(row)}
            title="Edit"
          >
            <Pencil className="size-4 text-emerald-600" />
          </Button>
        )}
        {access.canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hover:bg-rose-50 hover:text-rose-600 rounded-md border"
            onClick={() => handleDelete(row.id)}
            title="Hapus"
          >
            <Trash2 className="size-4 text-rose-600" />
          </Button>
        )}
      </div>,
    ]
  })

  const rowAttributes = inventories.map((row) => ({
    "data-date-value": row.purchaseDate ? new Date(row.purchaseDate).toISOString() : "",
    "data-filter-category": row.category,
    "data-filter-condition": row.condition,
  }))

  const handleAddClick = () => {
    setSelectedItem(null)
    setFormOpen(true)
  }

  const mobileFilteredInventories = React.useMemo(() => {
    const query = mobileQuery.trim().toLowerCase()

    return inventories.filter((item) => {
      const matchesQuery = !query || [
        item.name,
        item.documentId,
        item.category,
        item.location,
        item.picName,
      ].some((value) => value?.toLowerCase().includes(query))

      const matchesCategory = !mobileCategory || item.category === mobileCategory
      const matchesCondition = !mobileCondition || item.condition === mobileCondition

      return matchesQuery && matchesCategory && matchesCondition
    })
  }, [inventories, mobileCategory, mobileCondition, mobileQuery])

  // Memastikan export data Excel menyertakan kolom reminder & expired
  const columnOptions = [
    { key: "ID", label: "No" },
    { key: "documentId", label: "Document ID" },
    { key: "name", label: "Nama Barang" },
    { key: "category", label: "Kategori" },
    { key: "qty", label: "Qty" },
    { key: "location", label: "Lokasi" },
    { key: "purchaseDate", label: "Tanggal Beli" },
    { key: "validityMonths", label: "Masa Berlaku (Bulan)" },
    { key: "expirationDate", label: "Tanggal Expired" },
    { key: "condition", label: "Kondisi" },
    { key: "picName", label: "Petugas PIC" },
    { key: "reminderDaysBefore", label: "Reminder Days Before" },
    { key: "reminderEmailRecipients", label: "Reminder Recipients" },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-3 md:hidden">
        <div className="rounded-[1.1rem] bg-surface-container-low p-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold tracking-tight text-[#0f172a]">
                Inventaris HSE
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {mobileFilteredInventories.length} dari {inventories.length} aset tampil
              </p>
            </div>
            {access.canEdit && (
              <Button onClick={handleAddClick} size="sm" className="h-10 shrink-0 rounded-xl bg-primary px-3 text-white hover:bg-primary/90">
                <Plus className="mr-1 size-4" />
                Tambah
              </Button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white p-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</span>
              <p className="font-display text-xl font-bold text-[#0f172a]">{stats.totalItems}</p>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expired/Rusak</span>
              <p className="font-display text-xl font-bold text-rose-600">{stats.expiredCount + stats.rusakCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.1rem] border border-border/70 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={mobileQuery}
              onChange={(event) => setMobileQuery(event.target.value)}
              placeholder="Cari aset, ID, lokasi..."
              className="h-11 w-full rounded-xl border border-border/70 bg-muted/20 pl-9 pr-3 text-sm outline-none focus:border-primary/40 focus:bg-white"
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={mobileCategory}
              onChange={(event) => setMobileCategory(event.target.value)}
              className="h-11 min-w-0 rounded-xl border border-border/70 bg-white px-3 text-xs font-medium text-[#0f172a] outline-none"
            >
              <option value="">Semua kategori</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={mobileCondition}
              onChange={(event) => setMobileCondition(event.target.value)}
              className="h-11 min-w-0 rounded-xl border border-border/70 bg-white px-3 text-xs font-medium text-[#0f172a] outline-none"
            >
              <option value="">Semua kondisi</option>
              {conditionOptions.map((condition) => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {mobileFilteredInventories.map((item) => {
            const expDate = item.expirationDate
              ? new Date(item.expirationDate).toLocaleDateString("id-ID", { dateStyle: "medium" })
              : "-"

            return (
              <article key={item.id} className="rounded-[1.1rem] border border-border/70 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold text-[#0f172a]">{item.name}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{item.documentId}</p>
                  </div>
                  <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-bold text-[#0f172a]">
                    Qty {item.qty}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-surface-container-low p-2.5">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kategori</span>
                    <span className="mt-1 block font-semibold text-[#0f172a]">{item.category}</span>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-2.5">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lokasi</span>
                    <span className="mt-1 block font-semibold text-[#0f172a]">{item.location}</span>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-2.5">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expired</span>
                    <span className="mt-1 block font-semibold text-rose-600">{expDate}</span>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-2.5">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kondisi</span>
                    <div className="mt-1">{renderConditionBadge(item)}</div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => handleView(item)}>
                    <Eye className="mr-1.5 size-4 text-blue-600" />
                    Detail
                  </Button>
                  {access.canEdit && (
                    <Button variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => handleEdit(item)}>
                      <Pencil className="mr-1.5 size-4 text-emerald-600" />
                      Edit
                    </Button>
                  )}
                  {access.canDelete && (
                    <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="size-4 text-rose-600" />
                    </Button>
                  )}
                </div>
              </article>
            )
          })}

          {mobileFilteredInventories.length === 0 && (
            <div className="rounded-[1.1rem] border border-border/70 bg-white px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
              Tidak ada inventaris cocok dengan filter.
            </div>
          )}
        </div>
      </div>

      {/* Table Card Wrapper */}
      <div className="hidden md:block">
        <AdminTableCard
        title="Daftar Inventaris HSE"
        description="Kelola aset keselamatan perusahaan, monitor kondisi fisik barang, masa berlaku, dan reminder email kedaluwarsa secara real-time."
        columns={["No", "Nama Barang", "Kategori", "Qty", "Lokasi", "Masa Berlaku", "Kondisi", "Aksi"]}
        dateFilter={true}
        showImport={false} // Only support Export for safety assets
        columnOptions={columnOptions}
        actions={
          access.canEdit ? (
            <Button onClick={handleAddClick} className="bg-primary text-white hover:bg-primary/90">
              <Plus className="mr-1.5 size-4" />
              Tambah Aset
            </Button>
          ) : undefined
        }
        filters={
          <>
            <TableMultiFilter
              label="kategori"
              filterKey="category"
              options={categoryOptions.map((cat) => ({ value: cat, label: cat }))}
            />
            <TableMultiFilter
              label="kondisi"
              filterKey="condition"
              options={conditionOptions.map((cond) => ({ value: cond, label: cond }))}
            />
          </>
        }
        scorecards={[
          {
            label: "Total Aset",
            value: stats.totalItems,
            icon: <FileSpreadsheet className="size-4 text-blue-600" />,
            tone: "info",
          },
          {
            label: "Kondisi Baik",
            value: stats.baikCount,
            icon: <CheckCircle className="size-4 text-emerald-600" />,
            tone: "success",
          },
          {
            label: "Mendekati Expired",
            value: stats.warningCount,
            icon: <AlertCircle className="size-4 text-amber-500" />,
            tone: "warning",
          },
          {
            label: "Expired / Rusak",
            value: stats.expiredCount + stats.rusakCount,
            icon: <AlertTriangle className="size-4 text-rose-600" />,
            tone: "danger",
          },
        ]}
        rows={rows}
        rowAttributes={rowAttributes}
        />
      </div>

      {/* Dialog Form */}
      <HseInventoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={selectedItem}
        currentUser="User HSE"
        userEmails={userEmails}
        onSuccess={() => {
          // Refresh list. Karena server action revalidatePath, kita bisa reload page atau panggil fetch
          window.location.reload()
        }}
      />

      {/* Dialog Preview */}
      <HseInventoryDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={selectedItem}
        canEdit={access.canEdit}
        onEditClick={() => {
          setDetailOpen(false)
          if (selectedItem) handleEdit(selectedItem)
        }}
      />
    </div>
  )
}
