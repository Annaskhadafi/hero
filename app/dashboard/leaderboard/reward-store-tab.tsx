"use client"

import React, { useState, useTransition, useMemo } from "react"
import {
  Store,
  Sparkles,
  Ticket,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Plus,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Gift,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HeroSearchableSelect } from "@/components/templates"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  submitRewardRedemptionAction,
  adminReviewRedemptionAction,
  adminUpdateDeliveryStatusAction,
  adminSaveRewardItemAction,
  adminDeleteRewardItemAction,
  type RewardItemData,
  type RedemptionRecordData,
} from "@/app/actions/reward-store"
import { uploadFile } from "@/app/actions/upload"
import { resolveUploadUrl } from "@/lib/resolve-upload-url"
import { Download, Upload, Loader2, Image as ImageIcon, Trash2 } from "lucide-react"

interface RewardStoreTabProps {
  catalog: RewardItemData[]
  myRedemptions: RedemptionRecordData[]
  allRedemptions: RedemptionRecordData[]
  currentEmployee: {
    id: number
    name: string
    employeeSn: string | null
    totalPoints: number
    siteId: number | null
    siteName: string | null
    role: string
    hasClaimedThisYear: boolean
  } | null
  canManage: boolean
  canReviewClaims?: boolean
  siteOptions?: Array<{ id: number; name: string }>
  departmentOptions?: Array<{ id: number; name: string }>
  sectionOptions?: Array<{ id: number; name: string }>
}

export function RewardStoreTab({
  catalog,
  myRedemptions,
  allRedemptions,
  currentEmployee,
  canManage,
  canReviewClaims = false,
  siteOptions = [],
  departmentOptions = [],
  sectionOptions = [],
}: RewardStoreTabProps) {
  const [subTab, setSubTab] = useState<"catalog" | "my-claims" | "admin-manage">("catalog")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterTier, setFilterTier] = useState<string>("all")
  const [isPending, startTransition] = useTransition()

  // Redeem modal state
  const [selectedItemForRedeem, setSelectedItemForRedeem] = useState<RewardItemData | null>(null)
  const [redeemNote, setRedeemNote] = useState("")

  // Admin Item Create/Edit Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<RewardItemData> | null>(null)
  const [itemCategory, setItemCategory] = useState<string>("merchandise")
  const [itemTierEligibility, setItemTierEligibility] = useState<string>("all")
  const [itemImageUrl, setItemImageUrl] = useState("")
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([])
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([])
  const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>([])

  // Redemptions Table Sorting State
  const [redemptionSortField, setRedemptionSortField] = useState<string | null>(null)
  const [redemptionSortDir, setRedemptionSortDir] = useState<'asc' | 'desc'>('asc')

  const handleRedemptionSort = (field: string) => {
    if (redemptionSortField === field) {
      if (redemptionSortDir === 'asc') {
        setRedemptionSortDir('desc')
      } else {
        setRedemptionSortField(null)
        setRedemptionSortDir('asc')
      }
    } else {
      setRedemptionSortField(field)
      setRedemptionSortDir('asc')
    }
  }

  const sortedRedemptions = useMemo(() => {
    if (!redemptionSortField) return allRedemptions
    return [...allRedemptions].sort((a, b) => {
      let aVal = (a as any)[redemptionSortField] ?? ''
      let bVal = (b as any)[redemptionSortField] ?? ''
      if (redemptionSortField === 'pointsSpent') {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      } else {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
      }
      if (aVal < bVal) return redemptionSortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return redemptionSortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [allRedemptions, redemptionSortField, redemptionSortDir])

  // Sync itemImageUrl & conditions when editingItem changes or modal opens
  const openItemModal = (item?: Partial<RewardItemData> | null) => {
    setEditingItem(item || null)
    setItemCategory(item?.category || "merchandise")
    setItemTierEligibility(item?.tierEligibility || "all")
    setItemImageUrl(item?.imageUrl || "")
    setSelectedSiteIds(item?.eligibleSiteIds || [])
    setSelectedDepartmentIds(item?.eligibleDepartmentIds || [])
    setSelectedSectionIds(item?.eligibleSectionIds || [])
    setIsItemModalOpen(true)
  }

  // Handle direct file upload for reward merchandise photo
  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, WebP)")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB")
      return
    }

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadFile(formData)
      if (res.success && res.url) {
        setItemImageUrl(res.url)
        toast.success("Foto hadiah berhasil diunggah!")
      } else {
        toast.error(res.error || "Gagal mengunggah foto hadiah")
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat upload gambar")
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Export claims to CSV
  const handleExportClaimsCSV = () => {
    if (!allRedemptions || allRedemptions.length === 0) {
      toast.error("Tidak ada data klaim untuk diekspor")
      return
    }

    const headers = [
      "No. Klaim",
      "Tanggal Klaim",
      "Nama Karyawan",
      "NIK / ID",
      "Site",
      "Nama Hadiah",
      "Poin Dihabiskan",
      "Status Review HC",
      "Status Logistik",
      "Catatan HC / Resi",
    ]

    const csvRows = [headers.join(",")]

    for (const r of allRedemptions) {
      const row = [
        `"${r.redemptionNumber}"`,
        `"${new Date(r.createdAt).toLocaleDateString("id-ID")}"`,
        `"${(r.employeeName || "").replace(/"/g, '""')}"`,
        `"${r.employeeSn || "-"}"`,
        `"${(r.siteName || "Head Office").replace(/"/g, '""')}"`,
        `"${(r.rewardItemName || "").replace(/"/g, '""')}"`,
        r.pointsSpent,
        `"${r.status}"`,
        `"${r.deliveryStatus}"`,
        `"${(r.approvalNotes || r.trackingOrReceiptInfo || "").replace(/"/g, '""')}"`,
      ]
      csvRows.push(row.join(","))
    }

    const csvContent = "\uFEFF" + csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `rekap-klaim-hadiah-hero-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("File CSV rekap klaim berhasil diunduh!")
  }

  // Handle Admin Delete Item
  const handleDeleteItem = (item: RewardItemData) => {
    if (!window.confirm(`Yakin ingin menghapus item hadiah "${item.name}"?`)) return
    startTransition(async () => {
      const res = await adminDeleteRewardItemAction(item.id)
      if (res.success) {
        toast.success(res.message)
      } else {
        toast.error(res.error)
      }
    })
  }

  // Admin Review Modal
  const [selectedRedemptionForReview, setSelectedRedemptionForReview] =
    useState<RedemptionRecordData | null>(null)
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved")
  const [reviewNote, setReviewNote] = useState("")

  // Admin Logistics Modal
  const [selectedRedemptionForLogistics, setSelectedRedemptionForLogistics] =
    useState<RedemptionRecordData | null>(null)
  const [logisticsStatus, setLogisticsStatus] = useState<
    "pending" | "shipped_to_site" | "ready_at_site" | "received"
  >("shipped_to_site")
  const [trackingInfo, setTrackingInfo] = useState("")

  // Filtered Catalog
  const filteredCatalog = catalog.filter((item) => {
    const matchCategory = filterCategory === "all" || item.category === filterCategory
    let matchTier = true
    if (filterTier === "year_end") matchTier = item.isYearEndBazaar
    else if (filterTier === "exclusive") matchTier = item.tierEligibility !== "all"
    else if (filterTier === "all_tier") matchTier = item.tierEligibility === "all"
    return matchCategory && matchTier
  })

  // Handle Employee Redeem
  const handleConfirmRedeem = () => {
    if (!selectedItemForRedeem) return
    startTransition(async () => {
      const res = await submitRewardRedemptionAction(selectedItemForRedeem.id, redeemNote)
      if (res.success) {
        toast.success(res.message)
        setSelectedItemForRedeem(null)
        setRedeemNote("")
      } else {
        toast.error(res.error)
      }
    })
  }

  // Handle Admin Review
  const handleConfirmReview = () => {
    if (!selectedRedemptionForReview) return
    startTransition(async () => {
      const res = await adminReviewRedemptionAction(
        selectedRedemptionForReview.id,
        reviewAction,
        reviewNote
      )
      if (res.success) {
        toast.success(res.message)
        setSelectedRedemptionForReview(null)
        setReviewNote("")
      } else {
        toast.error(res.error)
      }
    })
  }

  // Handle Admin Logistics Update
  const handleConfirmLogistics = () => {
    if (!selectedRedemptionForLogistics) return
    startTransition(async () => {
      const res = await adminUpdateDeliveryStatusAction(
        selectedRedemptionForLogistics.id,
        logisticsStatus,
        trackingInfo
      )
      if (res.success) {
        toast.success(res.message)
        setSelectedRedemptionForLogistics(null)
        setTrackingInfo("")
      } else {
        toast.error(res.error)
      }
    })
  }

  // Handle Admin Save Item
  const handleSaveItemSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const code = form.get("code") as string
    const name = form.get("name") as string
    const description = form.get("description") as string
    const category = form.get("category") as string
    const pointsRequired = Number(form.get("pointsRequired") || 0)
    const stockQuantity = Number(form.get("stockQuantity") || 0)
    const tierEligibility = form.get("tierEligibility") as string
    const isYearEndBazaar = form.get("isYearEndBazaar") === "on"
    const imageUrl = itemImageUrl || (form.get("imageUrl") as string) || ""

    startTransition(async () => {
      const res = await adminSaveRewardItemAction({
        id: editingItem?.id,
        code,
        name,
        description,
        category,
        pointsRequired,
        stockQuantity,
        tierEligibility,
        eligibleSiteIds: selectedSiteIds,
        eligibleDepartmentIds: selectedDepartmentIds,
        eligibleSectionIds: selectedSectionIds,
        isYearEndBazaar,
        imageUrl,
      })
      if (res.success) {
        toast.success(res.message)
        setIsItemModalOpen(false)
        setEditingItem(null)
        setItemImageUrl("")
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* HEADER ARCADE BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Sparkles className="size-3.5" /> HERO Arcade Prize Counter & Store
              </div>
              <Badge className="border-amber-500/40 bg-amber-500 text-black font-extrabold uppercase tracking-wider text-[10px] px-2.5 py-0.5 shadow-sm hover:bg-amber-400">
                Coming Soon
              </Badge>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Tukar Skor Prestasi & Poin Kinerja dengan Hadiah Eksklusif
            </h2>
          </div>

          {/* User's Pouch */}
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-background/80 p-4 shadow-sm backdrop-blur">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <Ticket className="size-6" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Saldo Poin Anda
              </p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {(currentEmployee?.totalPoints ?? 0).toLocaleString("id-ID")}
                <span className="ml-1 text-xs font-medium text-muted-foreground">Pts</span>
              </p>
              {currentEmployee?.siteName && (
                <p className="text-[10px] text-muted-foreground">
                  Lokasi: <span className="font-semibold text-foreground">{currentEmployee.siteName}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5 rounded-xl bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setSubTab("catalog")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              subTab === "catalog"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="size-3.5" /> Katalog Hadiah ({filteredCatalog.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("my-claims")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              subTab === "my-claims"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="size-3.5" /> Riwayat Saya ({myRedemptions.length})
          </button>
          {(canManage || canReviewClaims) && (
            <button
              type="button"
              onClick={() => setSubTab("admin-manage")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                subTab === "admin-manage"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="size-3.5" /> Kelola Klaim & Stok ({allRedemptions.length})
            </button>
          )}
        </div>

        {/* Admin Quick Add Item (Desktop Only, Super Admin Only) */}
        {canManage && subTab === "catalog" && (
          <Button
            size="sm"
            onClick={() => openItemModal(null)}
            className="hidden md:inline-flex rounded-xl text-xs gap-1.5 font-semibold"
          >
            <Plus className="size-3.5" /> Tambah Hadiah Baru
          </Button>
        )}
      </div>

      {/* TAB 1: CATALOG GRID */}
      {subTab === "catalog" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Kategori:</span>
            {["all", "merchandise", "voucher", "apparel", "electronics", "special"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                  filterCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat === "all" ? "Semua Kategori" : cat}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Tier:</span>
              <HeroSearchableSelect
                value={filterTier}
                onChange={(val) => setFilterTier(val)}
                options={[
                  { value: "all", label: "Semua Akses Tier" },
                  { value: "all_tier", label: "Bebas Ditukar (All Staff)" },
                  { value: "exclusive", label: "Eksklusif (Top Performer)" },
                  { value: "year_end", label: "Event Akhir Tahun (Year-End)" },
                ]}
                placeholder="Pilih Tier..."
                className="h-8 w-[190px] text-xs"
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCatalog.map((item) => {
              const userPoints = currentEmployee?.totalPoints ?? 0
              const canAfford = userPoints >= item.pointsRequired
              const isOutOfStock = item.stockQuantity <= 0
              const isEligible = item.isEligible !== false
              const canRedeem = canAfford && !isOutOfStock && isEligible

              return (
                <Card
                  key={`item-${item.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-amber-500/40 hover:shadow-md"
                >
                  {/* Badges on Top */}
                  <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1 max-w-[85%]">
                    {item.isYearEndBazaar && (
                      <Badge className="border-blue-500/30 bg-blue-500 text-white text-[10px] shadow-sm">
                        Year-End Bazaar
                      </Badge>
                    )}
                    {item.tierEligibility === "top_10" && (
                      <Badge className="border-amber-500/30 bg-amber-500 text-black text-[10px] font-bold shadow-sm">
                        Top 10 Only
                      </Badge>
                    )}
                    {item.tierEligibility === "top_site" && (
                      <Badge className="border-purple-500/30 bg-purple-600 text-white text-[10px] shadow-sm">
                        Site Champion
                      </Badge>
                    )}
                    {item.eligibleSiteIds && item.eligibleSiteIds.length > 0 && (
                      <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                        Site Khusus
                      </Badge>
                    )}
                    {item.eligibleDepartmentIds && item.eligibleDepartmentIds.length > 0 && (
                      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                        Dept Khusus
                      </Badge>
                    )}
                    {item.eligibleSectionIds && item.eligibleSectionIds.length > 0 && (
                      <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">
                        Section Khusus
                      </Badge>
                    )}
                  </div>

                  {/* Image Holder */}
                  <div className="relative flex h-48 w-full items-center justify-center bg-muted/40 p-4 transition-colors group-hover:bg-muted/20">
                    {item.imageUrl ? (
                      <img
                        src={resolveUploadUrl(item.imageUrl)}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                        <Gift className="size-14 stroke-[1.2]" />
                        <span className="text-[11px]">Foto Merchandise</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {item.category} • {item.code}
                        </span>
                        <h3 className="line-clamp-2 text-sm font-bold text-foreground">
                          {item.name}
                        </h3>
                      </div>
                    </div>

                    <p className="line-clamp-2 text-xs text-muted-foreground mb-4">
                      {item.description || "Hadiah apresiasi performa operasional HERO."}
                    </p>

                    <div className="mt-auto space-y-3 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Harga Tiket:</span>
                        <span className="text-base font-black text-amber-600 dark:text-amber-400">
                          {item.pointsRequired.toLocaleString("id-ID")}{" "}
                          <span className="text-xs font-semibold">Poin</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Sisa Kuota:</span>
                        <span className={item.stockQuantity <= 5 ? "font-bold text-rose-500" : "font-medium"}>
                          {item.stockQuantity > 0 ? `${item.stockQuantity} pcs` : "Stok Habis"}
                        </span>
                      </div>

                      {/* Action Button */}
                      <Button
                        size="sm"
                        disabled={!canRedeem || isPending}
                        onClick={() => setSelectedItemForRedeem(item)}
                        className={`w-full rounded-xl text-xs font-semibold transition-all ${
                          canRedeem
                            ? "bg-amber-500 text-black hover:bg-amber-400 font-bold"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        {isOutOfStock
                          ? "Stok Habis"
                          : !isEligible
                          ? "Syarat Belum Terpenuhi"
                          : !canAfford
                          ? "Poin Belum Cukup"
                          : "Tukar Sekarang"}
                      </Button>

                      {!isEligible && item.ineligibilityReason && (
                        <p className="text-[10px] text-rose-500 font-medium text-center">
                          {item.ineligibilityReason}
                        </p>
                      )}

                      {/* Edit & Delete Action Buttons (Desktop Only & Super Admin Only) */}
                      {canManage && (
                        <div className="hidden md:flex items-center gap-1.5 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openItemModal(item)}
                            className="flex-1 h-7 rounded-lg text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteItem(item)}
                            className="h-7 px-2 rounded-lg text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Hapus Item Hadiah"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {filteredCatalog.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 p-12 text-center">
              <Gift className="size-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-semibold text-foreground">Tidak ada item hadiah yang sesuai</p>
              <p className="text-xs text-muted-foreground">Coba ubah filter kategori atau filter tier di atas.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY CLAIMS */}
      {subTab === "my-claims" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h3 className="text-sm font-bold text-foreground mb-1">Riwayat Klaim Penukaran Anda</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Lacak status persetujuan HC dan proses pengiriman merchandise ke lokasi Site Anda.
            </p>

            <div className="space-y-3">
              {myRedemptions.map((redemption) => (
                <div
                  key={`red-${redemption.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                      {redemption.rewardItemImage ? (
                        <img
                          src={resolveUploadUrl(redemption.rewardItemImage)}
                          alt={redemption.rewardItemName}
                          className="size-10 object-contain"
                        />
                      ) : (
                        <Gift className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-primary">
                          {redemption.redemptionNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            redemption.status === "approved"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px]"
                              : redemption.status === "rejected"
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-600 text-[10px]"
                              : redemption.status === "delivered"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-600 text-[10px]"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px]"
                          }
                        >
                          {redemption.status === "pending"
                            ? "Menunggu Review HC"
                            : redemption.status === "approved"
                            ? "Disetujui"
                            : redemption.status === "rejected"
                            ? "Ditolak (Poin Dikembalikan)"
                            : "Selesai Diterima"}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {redemption.rewardItemName}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Biaya: <span className="font-semibold text-foreground">{redemption.pointsSpent} Pts</span> • Tanggal:{" "}
                        {new Date(redemption.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Truck className="size-3.5" />
                      <span>Status Logistik: </span>
                      <span className="font-semibold text-foreground capitalize">
                        {redemption.deliveryStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                    {redemption.trackingOrReceiptInfo && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Resi/Info: {redemption.trackingOrReceiptInfo}
                      </span>
                    )}
                    {redemption.approvalNotes && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                        Catatan HC: {redemption.approvalNotes}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {myRedemptions.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Belum ada klaim penukaran hadiah. Kumpulkan poin dan tukarkan di katalog!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN MANAGEMENT */}
      {subTab === "admin-manage" && (canManage || canReviewClaims) && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Manajemen Permintaan Klaim Poin</h3>
                <p className="text-xs text-muted-foreground">
                  Persetujuan penukaran hadiah, pengembalian poin otomatis jika ditolak, dan update status logistik pengiriman ke site.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportClaimsCSV}
                className="h-8 gap-1.5 rounded-xl text-xs font-medium self-start sm:self-auto shrink-0"
              >
                <Download className="size-3.5 text-muted-foreground" /> Export Rekap Klaim (CSV)
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table containerClassName="rounded-none border-0 shadow-none" className="text-xs">
                <TableHeader>
                  <TableRow className="border-b border-border/60 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="p-3">
                      <button
                        type="button"
                        onClick={() => handleRedemptionSort('redemptionNumber')}
                        className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                      >
                        <span>No. Klaim</span>
                        {redemptionSortField === 'redemptionNumber' ? (
                          redemptionSortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="p-3">
                      <button
                        type="button"
                        onClick={() => handleRedemptionSort('employeeName')}
                        className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                      >
                        <span>Karyawan</span>
                        {redemptionSortField === 'employeeName' ? (
                          redemptionSortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="p-3">
                      <button
                        type="button"
                        onClick={() => handleRedemptionSort('siteName')}
                        className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                      >
                        <span>Site</span>
                        {redemptionSortField === 'siteName' ? (
                          redemptionSortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="p-3">
                      <button
                        type="button"
                        onClick={() => handleRedemptionSort('rewardItemName')}
                        className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                      >
                        <span>Hadiah</span>
                        {redemptionSortField === 'rewardItemName' ? (
                          redemptionSortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="p-3">
                      <button
                        type="button"
                        onClick={() => handleRedemptionSort('pointsSpent')}
                        className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                      >
                        <span>Poin</span>
                        {redemptionSortField === 'pointsSpent' ? (
                          redemptionSortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="p-3">
                      <button
                        type="button"
                        onClick={() => handleRedemptionSort('status')}
                        className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                      >
                        <span>Status Klaim</span>
                        {redemptionSortField === 'status' ? (
                          redemptionSortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="p-3">
                      <button
                        type="button"
                        onClick={() => handleRedemptionSort('deliveryStatus')}
                        className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                      >
                        <span>Logistik Site</span>
                        {redemptionSortField === 'deliveryStatus' ? (
                          redemptionSortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/60 group-hover:opacity-100" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="p-3 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {sortedRedemptions.map((r) => (
                    <TableRow key={`adm-red-${r.id}`} className="hover:bg-muted/20">
                      <TableCell className="p-3 font-mono font-semibold text-primary">{r.redemptionNumber}</TableCell>
                      <TableCell className="p-3">
                        <p className="font-semibold text-foreground">{r.employeeName}</p>
                        <p className="text-[10px] text-muted-foreground">{r.employeeSn || "-"}</p>
                      </TableCell>
                      <TableCell className="p-3">{r.siteName || "Head Office"}</TableCell>
                      <TableCell className="p-3 font-medium">{r.rewardItemName}</TableCell>
                      <TableCell className="p-3 font-bold text-amber-600 dark:text-amber-400">
                        {r.pointsSpent} Pts
                      </TableCell>
                      <TableCell className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            r.status === "approved"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                              : r.status === "rejected"
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
                              : r.status === "delivered"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-600"
                          }
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-3 capitalize">{r.deliveryStatus.replace(/_/g, " ")}</TableCell>
                      <TableCell className="p-3 text-right space-x-1.5">
                        {r.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] rounded-lg"
                            onClick={() => {
                              setSelectedRedemptionForReview(r)
                              setReviewAction("approved")
                            }}
                          >
                            Review
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] rounded-lg"
                          onClick={() => {
                            setSelectedRedemptionForLogistics(r)
                            setLogisticsStatus(
                              (r.deliveryStatus as any) || "shipped_to_site"
                            )
                            setTrackingInfo(r.trackingOrReceiptInfo || "")
                          }}
                        >
                          Logistik
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedRedemptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-8 text-center text-muted-foreground">
                        Belum ada data transaksi penukaran hadiah.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SUBMIT REDEEM CONFIRMATION */}
      <Dialog
        open={Boolean(selectedItemForRedeem)}
        onOpenChange={(open) => !open && setSelectedItemForRedeem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Gift className="size-5 text-amber-500" /> Konfirmasi Penukaran Poin
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pastikan Anda telah memeriksa rincian hadiah dan kuota poin Anda sebelum melanjutkan.
            </DialogDescription>
          </DialogHeader>

          {selectedItemForRedeem && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-background p-1">
                  {selectedItemForRedeem.imageUrl ? (
                    <img
                      src={resolveUploadUrl(selectedItemForRedeem.imageUrl)}
                      alt={selectedItemForRedeem.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Gift className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {selectedItemForRedeem.name}
                  </h4>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                    Biaya: {selectedItemForRedeem.pointsRequired.toLocaleString("id-ID")} Poin
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground space-y-1">
                <p>
                  • Saldo Anda saat ini:{" "}
                  <strong className="text-foreground">
                    {(currentEmployee?.totalPoints ?? 0).toLocaleString("id-ID")} Pts
                  </strong>
                </p>
                <p>
                  • Saldo setelah penukaran:{" "}
                  <strong className="text-emerald-600 font-bold">
                    {(
                      (currentEmployee?.totalPoints ?? 0) - selectedItemForRedeem.pointsRequired
                    ).toLocaleString("id-ID")}{" "}
                    Pts
                  </strong>
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                  *Poin akan di-reserve dan barang akan disiapkan oleh HC untuk dikirim ke site Anda.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Catatan / Keterangan Khusus (Opsional):</Label>
                <Textarea
                  value={redeemNote}
                  onChange={(e) => setRedeemNote(e.target.value)}
                  placeholder="Misal: Ukuran kaos L, dikirim ke mess site, dll."
                  className="text-xs h-20 rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs">
                Batal
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={isPending}
              size="sm"
              onClick={handleConfirmRedeem}
              className="rounded-xl text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400"
            >
              {isPending ? "Memproses..." : "Ya, Tukar Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADMIN REVIEW REDEMPTION */}
      <Dialog
        open={Boolean(selectedRedemptionForReview)}
        onOpenChange={(open) => !open && setSelectedRedemptionForReview(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Review Klaim Penukaran Hadiah</DialogTitle>
            <DialogDescription className="text-xs">
              Klaim #{selectedRedemptionForReview?.redemptionNumber} oleh{" "}
              {selectedRedemptionForReview?.employeeName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={reviewAction === "approved" ? "default" : "outline"}
                className={`flex-1 rounded-xl text-xs ${
                  reviewAction === "approved" ? "bg-emerald-600 hover:bg-emerald-500" : ""
                }`}
                onClick={() => setReviewAction("approved")}
              >
                <CheckCircle2 className="size-3.5 mr-1" /> Setujui Klaim
              </Button>
              <Button
                type="button"
                size="sm"
                variant={reviewAction === "rejected" ? "destructive" : "outline"}
                className="flex-1 rounded-xl text-xs"
                onClick={() => setReviewAction("rejected")}
              >
                <XCircle className="size-3.5 mr-1" /> Tolak & Refund Poin
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan Review HC:</Label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Alasan persetujuan atau alasan penolakan..."
                className="text-xs h-20 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs">
                Batal
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={isPending}
              size="sm"
              onClick={handleConfirmReview}
              className="rounded-xl text-xs font-semibold"
            >
              {isPending ? "Menyimpan..." : "Simpan Keputusan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ADMIN UPDATE LOGISTICS */}
      <Dialog
        open={Boolean(selectedRedemptionForLogistics)}
        onOpenChange={(open) => !open && setSelectedRedemptionForLogistics(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Update Status Logistik & Pengiriman</DialogTitle>
            <DialogDescription className="text-xs">
              Klaim #{selectedRedemptionForLogistics?.redemptionNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Pengiriman:</Label>
              <HeroSearchableSelect
                value={logisticsStatus}
                onChange={(val) => setLogisticsStatus(val as any)}
                options={[
                  { value: "pending", label: "Pending Persiapan" },
                  { value: "shipped_to_site", label: "Sedang Dikirim ke Site (In Transit)" },
                  { value: "ready_at_site", label: "Sudah Tiba di Site (Siap Diambil)" },
                  { value: "received", label: "Sudah Diterima oleh Karyawan (Selesai)" },
                ]}
                placeholder="Pilih Status..."
                className="h-9 w-full text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nomor Resi / Info PIC Penerima:</Label>
              <Input
                value={trackingInfo}
                onChange={(e) => setTrackingInfo(e.target.value)}
                placeholder="Contoh: Resi JNE 1234567 atau PIC Pak Agus GA Site"
                className="text-xs h-9 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs">
                Batal
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={isPending}
              size="sm"
              onClick={handleConfirmLogistics}
              className="rounded-xl text-xs font-semibold"
            >
              {isPending ? "Menyimpan..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ADMIN CREATE / EDIT REWARD ITEM */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveItemSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingItem ? "Edit Item Hadiah" : "Tambah Item Hadiah Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Masukkan detail merchandise, voucher, akses tier, dan kriteria kelayakan karyawan.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Kode Item</Label>
                <Input
                  name="code"
                  defaultValue={editingItem?.code || `RWD-${Date.now().toString().slice(-4)}`}
                  required
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kategori</Label>
                <input type="hidden" name="category" value={itemCategory} />
                <HeroSearchableSelect
                  value={itemCategory}
                  onChange={(val) => setItemCategory(val)}
                  options={[
                    { value: "merchandise", label: "Merchandise" },
                    { value: "voucher", label: "Voucher" },
                    { value: "apparel", label: "Apparel / Pakaian" },
                    { value: "electronics", label: "Elektronik" },
                    { value: "special", label: "Paket Spesial" },
                  ]}
                  placeholder="Pilih Kategori..."
                  className="h-8 w-full text-xs"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Nama Hadiah</Label>
                <Input
                  name="name"
                  defaultValue={editingItem?.name || ""}
                  required
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Harga Poin</Label>
                <Input
                  type="number"
                  name="pointsRequired"
                  defaultValue={editingItem?.pointsRequired || 100}
                  required
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Jumlah Stok</Label>
                <Input
                  type="number"
                  name="stockQuantity"
                  defaultValue={editingItem?.stockQuantity || 10}
                  required
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              {/* SECTION: ACCESS TIER & MULTI-CONDITION CRITERIA */}
              <div className="col-span-2 space-y-3 rounded-2xl border border-border/70 p-3.5 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                    <ShieldCheck className="size-4 text-amber-500" />
                    Kriteria Kelayakan & Akses Hadiah
                  </div>
                  <span className="text-[10px] text-muted-foreground">Biarkan kosong bila berlaku umum</span>
                </div>

                {/* Tier Ranking */}
                <div className="space-y-1">
                  <Label className="text-xs">Akses Tier Ranking</Label>
                  <input type="hidden" name="tierEligibility" value={itemTierEligibility} />
                  <HeroSearchableSelect
                    value={itemTierEligibility}
                    onChange={(val) => setItemTierEligibility(val)}
                    options={[
                      { value: "all", label: "Semua Karyawan (Umum)" },
                      { value: "top_10", label: "Top 10 Saja" },
                      { value: "top_site", label: "Juara Site Saja" },
                    ]}
                    placeholder="Pilih Akses Tier..."
                    className="h-8 w-full text-xs"
                  />
                </div>

                {/* Target Site Selection */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Batasi Berdasarkan Site ({selectedSiteIds.length === 0 ? "Semua Site" : `${selectedSiteIds.length} Site Dipilih`})
                    </Label>
                    {selectedSiteIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSiteIds([])}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Reset (Semua Site)
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg border border-border/50 bg-background/60">
                    {siteOptions.map((site) => {
                      const isSelected = selectedSiteIds.includes(site.id)
                      return (
                        <button
                          key={`cond-site-${site.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedSiteIds((prev) =>
                              isSelected ? prev.filter((id) => id !== site.id) : [...prev, site.id]
                            )
                          }}
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors border ${
                            isSelected
                              ? "bg-amber-500 text-black border-amber-600 font-bold"
                              : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                          }`}
                        >
                          {site.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Target Department Selection */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Batasi Berdasarkan Departemen ({selectedDepartmentIds.length === 0 ? "Semua Departemen" : `${selectedDepartmentIds.length} Dept Dipilih`})
                    </Label>
                    {selectedDepartmentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDepartmentIds([])}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Reset (Semua Dept)
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg border border-border/50 bg-background/60">
                    {departmentOptions.map((dept) => {
                      const isSelected = selectedDepartmentIds.includes(dept.id)
                      return (
                        <button
                          key={`cond-dept-${dept.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedDepartmentIds((prev) =>
                              isSelected ? prev.filter((id) => id !== dept.id) : [...prev, dept.id]
                            )
                          }}
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors border ${
                            isSelected
                              ? "bg-emerald-500 text-white border-emerald-600 font-bold"
                              : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                          }`}
                        >
                          {dept.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Target Section Selection */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Batasi Berdasarkan Section / Divisi ({selectedSectionIds.length === 0 ? "Semua Section" : `${selectedSectionIds.length} Section Dipilih`})
                    </Label>
                    {selectedSectionIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSectionIds([])}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Reset (Semua Section)
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg border border-border/50 bg-background/60">
                    {sectionOptions.map((sec) => {
                      const isSelected = selectedSectionIds.includes(sec.id)
                      return (
                        <button
                          key={`cond-sec-${sec.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedSectionIds((prev) =>
                              isSelected ? prev.filter((id) => id !== sec.id) : [...prev, sec.id]
                            )
                          }}
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors border ${
                            isSelected
                              ? "bg-indigo-500 text-white border-indigo-600 font-bold"
                              : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                          }`}
                        >
                          {sec.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Upload Foto Hadiah */}
              <div className="col-span-2 space-y-2 rounded-xl border border-dashed border-border/70 p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Foto / Gambar Merchandise Hadiah</Label>
                  {isUploadingImage && (
                    <span className="flex items-center gap-1 text-[11px] text-primary">
                      <Loader2 className="size-3 animate-spin" /> Mengunggah...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex size-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background overflow-hidden">
                    {itemImageUrl ? (
                      <img
                        src={resolveUploadUrl(itemImageUrl)}
                        alt="Preview Hadiah"
                        className="size-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="size-6 text-muted-foreground/40" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted transition-colors">
                      <Upload className="size-3.5 text-muted-foreground" />
                      <span>{itemImageUrl ? "Ganti Foto Hadiah" : "Unggah Foto Merchandise"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingImage}
                        onChange={handleItemImageUpload}
                      />
                    </label>

                    <Input
                      name="imageUrl"
                      value={itemImageUrl}
                      onChange={(e) => setItemImageUrl(e.target.value)}
                      placeholder="/api/uploads/..."
                      className="h-7 text-[11px] font-mono rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Deskripsi Hadiah</Label>
                <Textarea
                  name="description"
                  defaultValue={editingItem?.description || ""}
                  className="h-16 text-xs rounded-lg"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isYearEndBazaar"
                  name="isYearEndBazaar"
                  defaultChecked={editingItem?.isYearEndBazaar || false}
                  className="size-4 rounded border-input"
                />
                <Label htmlFor="isYearEndBazaar" className="text-xs cursor-pointer">
                  Khusus Event Akhir Tahun (Year-End Bazaar)
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs">
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending} size="sm" className="rounded-xl text-xs font-semibold">
                {isPending ? "Menyimpan..." : "Simpan Item Hadiah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
