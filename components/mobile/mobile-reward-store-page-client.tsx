"use client"

import React, { useState, useTransition } from "react"
import Link from "next/link"
import {
  Store,
  Sparkles,
  Ticket,
  Package,
  Gift,
  Truck,
  Plus,
  ShieldCheck,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Image as ImageIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  submitRewardRedemptionAction,
  adminReviewRedemptionAction,
  adminUpdateDeliveryStatusAction,
  adminSaveRewardItemAction,
  type RewardItemData,
  type RedemptionRecordData,
} from "@/app/actions/reward-store"
import { uploadFile } from "@/app/actions/upload"
import { resolveUploadUrl } from "@/lib/resolve-upload-url"

interface MobileRewardStorePageClientProps {
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
}

export function MobileRewardStorePageClient({
  catalog,
  myRedemptions,
  allRedemptions,
  currentEmployee,
  canManage,
  canReviewClaims = false,
}: MobileRewardStorePageClientProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "my-claims" | "admin-manage">("catalog")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [selectedItemForRedeem, setSelectedItemForRedeem] = useState<RewardItemData | null>(null)
  const [redeemNote, setRedeemNote] = useState("")

  // Admin Item Form Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<RewardItemData> | null>(null)
  const [itemImageUrl, setItemImageUrl] = useState("")
  const [isUploadingImage, setIsUploadingImage] = useState(false)

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

  const [isPending, startTransition] = useTransition()

  const userPoints = currentEmployee?.totalPoints ?? 0

  const filteredCatalog = catalog.filter((item) => {
    if (filterCategory === "all") return true
    return item.category === filterCategory
  })

  const openItemModal = (item?: Partial<RewardItemData> | null) => {
    setEditingItem(item || null)
    setItemImageUrl(item?.imageUrl || "")
    setIsItemModalOpen(true)
  }

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
        toast.error(res.error || "Gagal mengunggah foto")
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal upload gambar")
    } finally {
      setIsUploadingImage(false)
    }
  }

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

  const handleConfirmRedeem = () => {
    if (!selectedItemForRedeem) return
    startTransition(async () => {
      const res = await submitRewardRedemptionAction(selectedItemForRedeem.id, redeemNote)
      if (res.success) {
        toast.success(res.message)
        setSelectedItemForRedeem(null)
        setRedeemNote("")
        setActiveTab("my-claims")
      } else {
        toast.error(res.error)
      }
    })
  }

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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/mobile/dashboard"
            className="flex size-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Store className="size-4 text-amber-500" /> HERO Reward Store
              </h1>
              <Badge className="border-amber-500/40 bg-amber-500 text-black font-extrabold text-[9px] px-1.5 py-0 shadow-sm">
                Coming Soon
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Tukar Poin & Hadiah Eksklusif</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* POUCH HERO BANNER */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-background to-background p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <Sparkles className="size-3" /> Pouch Poin Anda
                </div>
                <Badge className="border-amber-500/40 bg-amber-500 text-black font-extrabold text-[9px] px-1.5 py-0 shadow-sm">
                  Coming Soon
                </Badge>
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {userPoints.toLocaleString("id-ID")}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">Pts</span>
              </p>
              {currentEmployee?.siteName && (
                <p className="text-[10px] text-muted-foreground">
                  Lokasi Site: <span className="font-semibold text-foreground">{currentEmployee.siteName}</span>
                </p>
              )}
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
              <Ticket className="size-6" />
            </div>
          </div>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === "catalog"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Katalog ({filteredCatalog.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my-claims")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === "my-claims"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Klaim Saya ({myRedemptions.length})
          </button>
          {(canManage || canReviewClaims) && (
            <button
              type="button"
              onClick={() => setActiveTab("admin-manage")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                activeTab === "admin-manage"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Kelola Klaim ({allRedemptions.length})
            </button>
          )}
        </div>

        {/* SUB-VIEW 1: CATALOG */}
        {activeTab === "catalog" && (
          <div className="space-y-3">
            {/* Filter Categories Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {["all", "merchandise", "voucher", "apparel", "electronics", "special"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize shrink-0 transition-colors ${
                    filterCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat === "all" ? "Semua" : cat}
                </button>
              ))}
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCatalog.map((item) => {
                const isEligible = item.isEligible !== false
                const canAfford = userPoints >= item.pointsRequired
                const isOutOfStock = item.stockQuantity <= 0
                const canRedeem = canAfford && !isOutOfStock && isEligible

                return (
                  <div
                    key={`mob-item-${item.id}`}
                    className="flex flex-col rounded-2xl border border-border/60 bg-card p-3 shadow-sm relative overflow-hidden"
                  >
                    {/* Badges */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap gap-1 max-w-[80%]">
                      {item.isYearEndBazaar && (
                        <Badge className="border-blue-500/30 bg-blue-600 text-white text-[9px]">
                          Year-End
                        </Badge>
                      )}
                      {item.tierEligibility === "top_10" && (
                        <Badge className="border-amber-500/30 bg-amber-500 text-black text-[9px] font-bold">
                          Top 10
                        </Badge>
                      )}
                      {item.tierEligibility === "top_site" && (
                        <Badge className="border-purple-500/30 bg-purple-600 text-white text-[9px]">
                          Site Champion
                        </Badge>
                      )}
                      {item.eligibleSiteIds && item.eligibleSiteIds.length > 0 && (
                        <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 text-[9px] font-semibold">
                          Site Khusus
                        </Badge>
                      )}
                      {item.eligibleDepartmentIds && item.eligibleDepartmentIds.length > 0 && (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[9px] font-semibold">
                          Dept Khusus
                        </Badge>
                      )}
                      {item.eligibleSectionIds && item.eligibleSectionIds.length > 0 && (
                        <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-600 text-[9px] font-semibold">
                          Section Khusus
                        </Badge>
                      )}
                    </div>

                    <div className="relative flex h-36 w-full items-center justify-center rounded-xl bg-muted/40 p-2 mb-2">
                      {item.imageUrl ? (
                        <img
                          src={resolveUploadUrl(item.imageUrl)}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Gift className="size-10 text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        {item.category} • {item.code}
                      </p>
                      <h4 className="text-xs font-bold text-foreground line-clamp-1">{item.name}</h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {item.description || "Hadiah apresiasi performa operasional HERO."}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">Sisa Stok:</span>
                          <span className={`text-[10px] font-bold ${item.stockQuantity <= 5 ? "text-rose-600" : "text-emerald-600"}`}>
                            {item.stockQuantity > 0 ? `${item.stockQuantity} pcs` : "Habis"}
                          </span>
                        </div>
                        <p className="text-sm font-black text-amber-600 dark:text-amber-400">
                          {item.pointsRequired.toLocaleString("id-ID")}{" "}
                          <span className="text-[10px] font-semibold">Pts</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          disabled={!canRedeem || isPending}
                          onClick={() => setSelectedItemForRedeem(item)}
                          className={`h-8 rounded-xl text-xs font-semibold px-3 ${
                            canRedeem
                              ? "bg-amber-500 text-black hover:bg-amber-400 font-bold"
                              : "opacity-50 cursor-not-allowed"
                          }`}
                        >
                          {isOutOfStock
                            ? "Stok Habis"
                            : !isEligible
                            ? "Terkunci"
                            : !canAfford
                            ? "Poin Belum Cukup"
                            : "Tukar"}
                        </Button>
                      </div>
                    </div>

                    {!isEligible && item.ineligibilityReason && (
                      <p className="mt-1 text-[10px] text-rose-500 font-medium">
                        {item.ineligibilityReason}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {filteredCatalog.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground rounded-2xl border border-dashed border-border/60">
                Tidak ada item hadiah di kategori ini.
              </div>
            )}
          </div>
        )}

        {/* SUB-VIEW 2: MY CLAIMS */}
        {activeTab === "my-claims" && (
          <div className="space-y-3">
            {myRedemptions.map((r) => (
              <div
                key={`my-red-${r.id}`}
                className="rounded-2xl border border-border/60 bg-card p-3 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary text-[11px]">
                    {r.redemptionNumber}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      r.status === "approved" || r.status === "fulfilled"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px]"
                        : r.status === "rejected"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-600 text-[10px]"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px]"
                    }
                  >
                    {r.status === "pending"
                      ? "Menunggu Review"
                      : r.status === "approved"
                      ? "Disetujui"
                      : r.status === "rejected"
                      ? "Ditolak (Refund)"
                      : "Selesai"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                    {r.rewardItemImage ? (
                      <img
                        src={resolveUploadUrl(r.rewardItemImage)}
                        alt={r.rewardItemName}
                        className="size-8 object-contain"
                      />
                    ) : (
                      <Gift className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground text-xs">{r.rewardItemName}</h5>
                    <p className="text-[10px] text-muted-foreground">
                      {r.pointsSpent} Pts •{" "}
                      {new Date(r.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/30 p-2 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Truck className="size-3 text-muted-foreground" />
                    <span>Logistik: </span>
                    <span className="font-semibold text-foreground capitalize">
                      {r.deliveryStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  {r.trackingOrReceiptInfo && (
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Resi: {r.trackingOrReceiptInfo}
                    </p>
                  )}
                  {r.approvalNotes && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                      Catatan HC: {r.approvalNotes}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {myRedemptions.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground rounded-2xl border border-dashed border-border/60">
                Belum ada transaksi penukaran hadiah. Kumpulkan poin dan tukarkan di katalog!
              </div>
            )}
          </div>
        )}

        {/* SUB-VIEW 3: ADMIN MANAGEMENT */}
        {activeTab === "admin-manage" && canManage && (
          <div className="space-y-3">
            {allRedemptions.map((r) => (
              <div
                key={`adm-claim-${r.id}`}
                className="rounded-2xl border border-border/60 bg-card p-3 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary text-[11px]">
                    {r.redemptionNumber}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      r.status === "approved" || r.status === "fulfilled"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px]"
                        : r.status === "rejected"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-600 text-[10px]"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px]"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>

                <div>
                  <p className="font-semibold text-foreground">{r.employeeName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Site: {r.siteName || "HO"} • Hadiah: {r.rewardItemName} ({r.pointsSpent} Pts)
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground capitalize">
                    Logistik: {r.deliveryStatus.replace(/_/g, " ")}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {r.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRedemptionForReview(r)
                          setReviewAction("approved")
                        }}
                        className="h-7 rounded-lg text-[10px] px-2.5"
                      >
                        Review
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedRedemptionForLogistics(r)
                        setLogisticsStatus((r.deliveryStatus as any) || "shipped_to_site")
                        setTrackingInfo(r.trackingOrReceiptInfo || "")
                      }}
                      className="h-7 rounded-lg text-[10px] px-2.5"
                    >
                      Logistik
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {allRedemptions.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground rounded-2xl border border-dashed border-border/60">
                Belum ada antrean penukaran hadiah.
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: REDEEM CONFIRM */}
      <Dialog
        open={Boolean(selectedItemForRedeem)}
        onOpenChange={(open) => !open && setSelectedItemForRedeem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Gift className="size-4 text-amber-500" /> Konfirmasi Penukaran Poin
            </DialogTitle>
            <DialogDescription className="text-xs">
              Klaim hadiah {selectedItemForRedeem?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20 space-y-1">
              <p className="text-[11px] text-muted-foreground">Biaya Poin:</p>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                {selectedItemForRedeem?.pointsRequired.toLocaleString("id-ID")} Poin
              </p>
              <p className="text-[10px] text-muted-foreground">
                Sisa Saldo Anda Setelah Ditukar:{" "}
                <span className="font-semibold text-foreground">
                  {(userPoints - (selectedItemForRedeem?.pointsRequired ?? 0)).toLocaleString("id-ID")}{" "}
                  Poin
                </span>
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Catatan Tambahan / Ukuran / Alamat Site:</Label>
              <Textarea
                value={redeemNote}
                onChange={(e) => setRedeemNote(e.target.value)}
                placeholder="Contoh: Ukuran baju L, kirim ke Site Berau mess hall..."
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
              onClick={handleConfirmRedeem}
              className="rounded-xl text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400"
            >
              {isPending ? "Memproses..." : "Konfirmasi Tukar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADMIN ADD/EDIT ITEM */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveItemSubmit} className="space-y-3">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">
                {editingItem ? "Edit Item Hadiah" : "Tambah Item Hadiah Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Detail hadiah untuk katalog HERO Arcade Store
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
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
                <Label className="text-xs">Nama Hadiah</Label>
                <Input
                  name="name"
                  defaultValue={editingItem?.name || ""}
                  required
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Kategori</Label>
                  <select
                    name="category"
                    defaultValue={editingItem?.category || "merchandise"}
                    className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs"
                  >
                    <option value="merchandise">Merchandise</option>
                    <option value="voucher">Voucher</option>
                    <option value="apparel">Apparel</option>
                    <option value="electronics">Elektronik</option>
                    <option value="special">Paket Spesial</option>
                  </select>
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
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Stok Kuota</Label>
                  <Input
                    type="number"
                    name="stockQuantity"
                    defaultValue={editingItem?.stockQuantity || 10}
                    required
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Akses Tier</Label>
                  <select
                    name="tierEligibility"
                    defaultValue={editingItem?.tierEligibility || "all"}
                    className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs"
                  >
                    <option value="all">Semua Karyawan</option>
                    <option value="top_10">Top 10 Saja</option>
                    <option value="top_site">Juara Site</option>
                  </select>
                </div>
              </div>

              {/* Upload Foto Hadiah */}
              <div className="space-y-2 rounded-xl border border-dashed border-border/70 p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Foto Merchandise</Label>
                  {isUploadingImage && (
                    <span className="flex items-center gap-1 text-[10px] text-primary">
                      <Loader2 className="size-3 animate-spin" /> Uploading...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background overflow-hidden">
                    {itemImageUrl ? (
                      <img
                        src={resolveUploadUrl(itemImageUrl)}
                        alt="Preview"
                        className="size-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="size-6 text-muted-foreground/40" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted">
                      <Upload className="size-3.5 text-muted-foreground" />
                      <span>{itemImageUrl ? "Ganti Foto" : "Unggah Foto"}</span>
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
                      className="h-6 text-[10px] font-mono rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Deskripsi</Label>
                <Textarea
                  name="description"
                  defaultValue={editingItem?.description || ""}
                  className="h-16 text-xs rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isYearEndBazaarMob"
                  name="isYearEndBazaar"
                  defaultChecked={editingItem?.isYearEndBazaar || false}
                  className="size-4 rounded border-input"
                />
                <Label htmlFor="isYearEndBazaarMob" className="text-xs cursor-pointer">
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
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ADMIN REVIEW */}
      <Dialog
        open={Boolean(selectedRedemptionForReview)}
        onOpenChange={(open) => !open && setSelectedRedemptionForReview(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Review Klaim Hadiah</DialogTitle>
            <DialogDescription className="text-xs">
              Klaim #{selectedRedemptionForReview?.redemptionNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={reviewAction === "approved" ? "default" : "outline"}
                className={`flex-1 rounded-xl text-xs ${
                  reviewAction === "approved" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : ""
                }`}
                onClick={() => setReviewAction("approved")}
              >
                <CheckCircle2 className="size-3.5 mr-1" /> Setujui
              </Button>
              <Button
                type="button"
                size="sm"
                variant={reviewAction === "rejected" ? "default" : "outline"}
                className={`flex-1 rounded-xl text-xs ${
                  reviewAction === "rejected" ? "bg-rose-600 hover:bg-rose-500 text-white" : ""
                }`}
                onClick={() => setReviewAction("rejected")}
              >
                <XCircle className="size-3.5 mr-1" /> Tolak & Refund
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Catatan Review HC:</Label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Catatan..."
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

      {/* MODAL 4: ADMIN LOGISTICS */}
      <Dialog
        open={Boolean(selectedRedemptionForLogistics)}
        onOpenChange={(open) => !open && setSelectedRedemptionForLogistics(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Update Status Logistik</DialogTitle>
            <DialogDescription className="text-xs">
              Klaim #{selectedRedemptionForLogistics?.redemptionNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Status Pengiriman:</Label>
              <select
                value={logisticsStatus}
                onChange={(e) => setLogisticsStatus(e.target.value as any)}
                className="w-full h-8 rounded-xl border border-input bg-background px-2.5 text-xs"
              >
                <option value="pending">Pending Persiapan</option>
                <option value="shipped_to_site">Sedang Dikirim ke Site</option>
                <option value="ready_at_site">Sudah Tiba di Site</option>
                <option value="received">Sudah Diterima (Selesai)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nomor Resi / Info PIC:</Label>
              <Input
                value={trackingInfo}
                onChange={(e) => setTrackingInfo(e.target.value)}
                placeholder="Resi ekspedisi atau nama PIC..."
                className="text-xs h-8 rounded-xl"
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
    </div>
  )
}
