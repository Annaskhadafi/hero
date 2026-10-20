"use client"

import React, { useState, useTransition } from "react"
import {
  Gift,
  Ticket,
  Sparkles,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  submitRewardRedemptionAction,
  type RewardItemData,
  type RedemptionRecordData,
} from "@/app/actions/reward-store"
import { resolveUploadUrl } from "@/lib/resolve-upload-url"

interface MobileRewardStoreSectionProps {
  catalog: RewardItemData[]
  myRedemptions: RedemptionRecordData[]
  totalPoints: number
}

export function MobileRewardStoreSection({
  catalog,
  myRedemptions,
  totalPoints,
}: MobileRewardStoreSectionProps) {
  const [selectedItem, setSelectedItem] = useState<RewardItemData | null>(null)
  const [note, setNote] = useState("")
  const [activeTab, setActiveTab] = useState<"catalog" | "my-claims">("catalog")
  const [isPending, startTransition] = useTransition()

  const handleRedeem = () => {
    if (!selectedItem) return
    startTransition(async () => {
      const res = await submitRewardRedemptionAction(selectedItem.id, note)
      if (res.success) {
        toast.success(res.message)
        setSelectedItem(null)
        setNote("")
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Mini Tabs */}
      <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "catalog"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <span>Tukar Hadiah ({catalog.length})</span>
          <span className="rounded bg-amber-500 px-1 py-0.5 text-[8px] font-extrabold text-black">
            Coming Soon
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("my-claims")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "my-claims"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Klaim Saya ({myRedemptions.length})
        </button>
      </div>

      {activeTab === "catalog" && (
        <div className="space-y-2.5">
          {catalog.map((item) => {
            const isEligible = item.isEligible !== false
            const canAfford = totalPoints >= item.pointsRequired
            const isOutOfStock = item.stockQuantity <= 0
            const canRedeem = canAfford && !isOutOfStock && isEligible

            return (
              <div
                key={`mob-item-${item.id}`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-xs"
              >
                {/* Image / Icon */}
                <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-gray-50 p-1">
                  {item.imageUrl ? (
                    <img
                      src={resolveUploadUrl(item.imageUrl)}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Gift className="size-6 text-amber-500" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.isYearEndBazaar && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                        Year-End
                      </span>
                    )}
                    {item.eligibleSiteIds && item.eligibleSiteIds.length > 0 && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600">
                        Site Khusus
                      </span>
                    )}
                    {item.eligibleDepartmentIds && item.eligibleDepartmentIds.length > 0 && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">
                        Dept Khusus
                      </span>
                    )}
                    {item.eligibleSectionIds && item.eligibleSectionIds.length > 0 && (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600">
                        Section Khusus
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">
                      {item.category}
                    </span>
                  </div>
                  <h4 className="truncate text-xs font-bold text-gray-900">{item.name}</h4>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs font-black text-amber-600">
                      {item.pointsRequired.toLocaleString("id-ID")} Pts
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Sisa: {item.stockQuantity > 0 ? `${item.stockQuantity} pcs` : "Habis"}
                    </span>
                  </div>
                  {!isEligible && item.ineligibilityReason && (
                    <p className="mt-0.5 text-[9px] text-rose-500 font-medium truncate">
                      {item.ineligibilityReason}
                    </p>
                  )}
                </div>

                {/* Redeem Button */}
                <Button
                  size="sm"
                  disabled={!canRedeem || isPending}
                  onClick={() => setSelectedItem(item)}
                  className={`h-8 rounded-lg px-3 text-[11px] font-semibold shrink-0 ${
                    canRedeem
                      ? "bg-amber-500 text-black hover:bg-amber-400 font-bold"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  {isOutOfStock ? "Habis" : !isEligible ? "Terkunci" : "Tukar"}
                </Button>
              </div>
            )
          })}

          {catalog.length === 0 && (
            <div className="p-6 text-center text-xs text-gray-400">
              Belum ada item hadiah yang tersedia di toko saat ini.
            </div>
          )}
        </div>
      )}

      {activeTab === "my-claims" && (
        <div className="space-y-2.5">
          {myRedemptions.map((r) => (
            <div
              key={`mob-red-${r.id}`}
              className="rounded-xl border border-gray-100 bg-white p-3 shadow-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-blue-600">
                  {r.redemptionNumber}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                    r.status === "approved"
                      ? "bg-emerald-50 text-emerald-700"
                      : r.status === "rejected"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {r.status === "approved"
                    ? "Disetujui"
                    : r.status === "rejected"
                    ? "Ditolak (Refund)"
                    : "Menunggu Review"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-900">{r.rewardItemName}</span>
                <span className="font-bold text-amber-600">{r.pointsSpent} Pts</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-50">
                <span className="flex items-center gap-1">
                  <Truck className="size-3" /> {r.deliveryStatus.replace(/_/g, " ")}
                </span>
                <span>
                  {new Date(r.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </div>
          ))}

          {myRedemptions.length === 0 && (
            <div className="p-6 text-center text-xs text-gray-400">
              Anda belum memiliki riwayat penukaran hadiah.
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-xs rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
              <Gift className="size-4 text-amber-500" /> Tukar Poin Hadiah
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedItem?.name} ({selectedItem?.pointsRequired} Pts)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg bg-gray-50 p-2.5 text-[11px] text-gray-600 space-y-1">
              <p>Poin Anda: <strong>{totalPoints} Pts</strong></p>
              <p>Sisa Setelah Tukar: <strong className="text-emerald-600">{totalPoints - (selectedItem?.pointsRequired ?? 0)} Pts</strong></p>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Catatan / Ukuran (Opsional):</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Misal: Ukuran baju L, serahkan di office site..."
                className="h-16 text-xs rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="flex-1 rounded-xl text-xs">
                Batal
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={isPending}
              size="sm"
              onClick={handleRedeem}
              className="flex-1 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400"
            >
              {isPending ? "Proses..." : "Tukar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
