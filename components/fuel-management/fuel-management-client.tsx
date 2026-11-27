'use client'

import React, { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Fuel,
  TrendingDown,
  TrendingUp,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  Truck,
  Building2,
  FileText,
  Search,
  Filter,
  Layers,
  Gauge,
  User,
  Camera,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  History,
  LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import {
  HeroKpiCard,
  HeroEmptyState,
} from '@/components/templates'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  FuelDashboardSummary,
  submitFuelIn,
  submitFuelOut,
  getFuelTransactions,
} from '@/app/actions/fuel-management'
import { FuelTransaction, FuelTank } from '@/db/schema/fuel-management'
import { uploadFile } from '@/app/actions/upload'

interface FuelManagementClientProps {
  initialDashboard: FuelDashboardSummary
  vehicles: Array<{
    id: number
    vehicleCode: string
    plateNumber: string
    vehicleType: string
    lastServiceOdometer: number | null
    locationName: string
  }>
  initialTransactions: Array<FuelTransaction & { tankName?: string; tankCode?: string }>
  isMobileView?: boolean
}

const SUPPLIER_PRESETS = [
  'PT Pertamina Patra Niaga',
  'PT AKR Corporindo Tbk',
  'PT Petro Andalan Nusantara',
  'PT Cosmic Petroleum Indonesia',
  'PT Elnusa Petrofin',
]

export function FuelManagementClient({
  initialDashboard,
  vehicles,
  initialTransactions,
  isMobileView = false,
}: FuelManagementClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fuel_in' | 'fuel_out' | 'history'>('dashboard')
  const [dashboardData, setDashboardData] = useState<FuelDashboardSummary>(initialDashboard)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [isPending, startTransition] = useTransition()

  // Selected Transaction for Detail Modal
  const [selectedDetailTx, setSelectedDetailTx] = useState<(FuelTransaction & { tankName?: string; tankCode?: string }) | null>(null)

  // ─── Fuel In Form State ─────────────────────────────────────────────────────
  const [inTankId, setInTankId] = useState<number>(dashboardData.tanks[0]?.id || 1)
  const [inSupplier, setInSupplier] = useState<string>(SUPPLIER_PRESETS[0])
  const [inCustomSupplier, setInCustomSupplier] = useState<string>('')
  const [inDoNumber, setInDoNumber] = useState<string>('')
  const [inQuantity, setInQuantity] = useState<string>('')
  const [inAttachmentUrl, setInAttachmentUrl] = useState<string>('')
  const [inNotes, setInNotes] = useState<string>('')
  const [inDate, setInDate] = useState<string>(new Date().toISOString().slice(0, 16))
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false)
  const [isSubmittingIn, setIsSubmittingIn] = useState<boolean>(false)

  // ─── Fuel Out Form State ────────────────────────────────────────────────────
  const [outTankId, setOutTankId] = useState<number>(dashboardData.tanks[0]?.id || 1)
  const [outVehicleCode, setOutVehicleCode] = useState<string>(vehicles[0]?.vehicleCode || '')
  const [outCustomUnit, setOutCustomUnit] = useState<string>('')
  const [outHmKm, setOutHmKm] = useState<string>('')
  const [outQuantity, setOutQuantity] = useState<string>('')
  const [outOperator, setOutOperator] = useState<string>('')
  const [outNotes, setOutNotes] = useState<string>('')
  const [outDate, setOutDate] = useState<string>(new Date().toISOString().slice(0, 16))
  const [isSubmittingOut, setIsSubmittingOut] = useState<boolean>(false)

  // ─── History Filter State ───────────────────────────────────────────────────
  const [histType, setHistType] = useState<string>('all')
  const [histTankId, setHistTankId] = useState<string>('all')
  const [histSearch, setHistSearch] = useState<string>('')

  // Selected Tank for Form Info
  const selectedInTank = useMemo(() => {
    return dashboardData.tanks.find((t) => t.id === inTankId) || dashboardData.tanks[0]
  }, [dashboardData.tanks, inTankId])

  const selectedOutTank = useMemo(() => {
    return dashboardData.tanks.find((t) => t.id === outTankId) || dashboardData.tanks[0]
  }, [dashboardData.tanks, outTankId])

  // Matched Vehicle for Fuel Out HM
  const matchedVehicle = useMemo(() => {
    return vehicles.find((v) => v.vehicleCode === outVehicleCode)
  }, [vehicles, outVehicleCode])

  // Update suggested HM when vehicle changes
  React.useEffect(() => {
    if (matchedVehicle && matchedVehicle.lastServiceOdometer) {
      setOutHmKm(String(matchedVehicle.lastServiceOdometer))
    }
  }, [matchedVehicle])

  // Filtered History
  const filteredHistory = useMemo(() => {
    return transactions.filter((tx) => {
      if (histType !== 'all' && tx.transactionType !== histType) return false
      if (histTankId !== 'all' && String(tx.tankId) !== histTankId) return false
      if (histSearch.trim() !== '') {
        const q = histSearch.toLowerCase().trim()
        const matchNum = tx.transactionNumber.toLowerCase().includes(q)
        const matchUnit = (tx.equipmentUnitCode || '').toLowerCase().includes(q)
        const matchDO = (tx.deliveryOrderNumber || '').toLowerCase().includes(q)
        const matchSup = (tx.supplierName || '').toLowerCase().includes(q)
        const matchOp = (tx.operatorName || '').toLowerCase().includes(q)
        const matchNotes = (tx.notes || '').toLowerCase().includes(q)
        if (!matchNum && !matchUnit && !matchDO && !matchSup && !matchOp && !matchNotes) {
          return false
        }
      }
      return true
    })
  }, [transactions, histType, histTankId, histSearch])

  // Handlers
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadFile(formData)
      if (res?.success && res.readableUrl) {
        setInAttachmentUrl(res.readableUrl)
        toast.success('Foto surat jalan / flowmeter berhasil diunggah.')
      } else {
        toast.error(res?.message || 'Gagal mengunggah foto.')
      }
    } catch (err: any) {
      toast.error('Gagal mengunggah berkas: ' + err?.message)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleFuelInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseFloat(inQuantity)
    if (isNaN(qty) || qty <= 0) {
      toast.error('Jumlah liter penerimaan BBM harus lebih besar dari 0.')
      return
    }

    const supplierFinal = inSupplier === 'custom' ? inCustomSupplier.trim() : inSupplier.trim()
    if (!supplierFinal) {
      toast.error('Harap isi nama supplier BBM.')
      return
    }

    if (!inDoNumber.trim()) {
      toast.error('Harap isi nomor Delivery Order (DO).')
      return
    }

    setIsSubmittingIn(true)
    const res = await submitFuelIn({
      tankId: inTankId,
      quantityLiters: qty,
      supplierName: supplierFinal,
      deliveryOrderNumber: inDoNumber.trim(),
      attachmentUrl: inAttachmentUrl || undefined,
      notes: inNotes.trim() || undefined,
      transactionDate: inDate ? new Date(inDate).toISOString() : undefined,
    })
    setIsSubmittingIn(false)

    if (res.success) {
      toast.success(res.message)
      setInQuantity('')
      setInDoNumber('')
      setInNotes('')
      setInAttachmentUrl('')
      // Switch back to dashboard to see updated stock
      setActiveTab('dashboard')
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  const handleFuelOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseFloat(outQuantity)
    if (isNaN(qty) || qty <= 0) {
      toast.error('Jumlah liter pengisian BBM harus lebih besar dari 0.')
      return
    }

    if (selectedOutTank && selectedOutTank.currentStockLiters < qty) {
      toast.error(
        `Stok BBM tangki tidak mencukupi! Sisa: ${selectedOutTank.currentStockLiters.toLocaleString('id-ID')} L. Stok tidak boleh minus.`
      )
      return
    }

    const finalUnitCode = outVehicleCode === 'custom' ? outCustomUnit.trim() : outVehicleCode.trim()
    if (!finalUnitCode) {
      toast.error('Harap pilih atau tulis kode unit kendaraan/alat berat.')
      return
    }

    const currentHm = outHmKm.trim() ? parseFloat(outHmKm) : null

    setIsSubmittingOut(true)
    const res = await submitFuelOut({
      tankId: outTankId,
      quantityLiters: qty,
      equipmentUnitCode: finalUnitCode,
      equipmentId: matchedVehicle ? matchedVehicle.id : null,
      currentHmKm: currentHm,
      operatorName: outOperator.trim() || undefined,
      notes: outNotes.trim() || undefined,
      transactionDate: outDate ? new Date(outDate).toISOString() : undefined,
    })
    setIsSubmittingOut(false)

    if (res.success) {
      toast.success(res.message)
      setOutQuantity('')
      setOutNotes('')
      setOutOperator('')
      // Switch back to dashboard to see updated stock
      setActiveTab('dashboard')
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-4 pb-12 max-w-5xl mx-auto">
      {/* ─── Top Header & Submenu Navigation ──────────────────────────────── */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25">
              <Fuel className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#486275]">
                Operasional Logistik &amp; Fleet
              </p>
              <h1 className="text-xl font-black tracking-tight text-[#003461]">
                Fuel Management
              </h1>
            </div>
          </div>

          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 text-xs font-bold px-2.5 py-0.5">
            Real-Time Stock
          </Badge>
        </div>

        {/* Submenu Tabs (4 Items as per PDF Development Brief) */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-black transition-all',
              activeTab === 'dashboard'
                ? 'bg-white text-[#003461] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <LayoutDashboard className="size-3.5 shrink-0" />
            <span className="truncate">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('fuel_in')}
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-black transition-all',
              activeTab === 'fuel_in'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <PlusCircle className="size-3.5 shrink-0" />
            <span className="truncate">Fuel In</span>
          </button>
          <button
            onClick={() => setActiveTab('fuel_out')}
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-black transition-all',
              activeTab === 'fuel_out'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <MinusCircle className="size-3.5 shrink-0" />
            <span className="truncate">Fuel Out</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-black transition-all',
              activeTab === 'history'
                ? 'bg-white text-[#003461] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <History className="size-3.5 shrink-0" />
            <span className="truncate">History</span>
          </button>
        </div>
      </section>

      {/* ─── TAB 1: DASHBOARD ────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Summary Cards (4 Cards as per PDF Brief) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <HeroKpiCard
              title="Current Stock"
              value={`${dashboardData.currentStock.toLocaleString('id-ID')} L`}
              description="Total BBM seluruh tangki aktif"
              icon={Fuel}
              tone="amber"
              className="p-3.5"
            />
            <HeroKpiCard
              title="Fuel In Today"
              value={`+${dashboardData.fuelInToday.toLocaleString('id-ID')} L`}
              description="Penerimaan masuk hari ini"
              icon={TrendingUp}
              tone="emerald"
              className="p-3.5"
            />
            <HeroKpiCard
              title="Fuel Out Today"
              value={`-${dashboardData.fuelOutToday.toLocaleString('id-ID')} L`}
              description="Pengisian ke unit hari ini"
              icon={TrendingDown}
              tone="rose"
              className="p-3.5"
            />
            <HeroKpiCard
              title="Monthly Consumption"
              value={`${dashboardData.monthlyConsumption.toLocaleString('id-ID')} L`}
              description="Total konsumsi bulan berjalan"
              icon={Gauge}
              tone="blue"
              className="p-3.5"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setActiveTab('fuel_in')}
              className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
            >
              <PlusCircle className="size-4" />
              <span>+ Catat Fuel In (Penerimaan)</span>
            </button>
            <button
              onClick={() => setActiveTab('fuel_out')}
              className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-sm shadow-md shadow-amber-600/20 active:scale-98 transition-all"
            >
              <MinusCircle className="size-4" />
              <span>− Catat Fuel Out (Pengisian)</span>
            </button>
          </div>

          {/* Tank Overview Section */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Monitoring Tangki
                </p>
                <h2 className="text-sm font-black text-[#003461]">
                  Tank Overview &amp; Stock Level
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {dashboardData.tanks.length} Tangki Terdaftar
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dashboardData.tanks.map((tank) => (
                <div
                  key={tank.id}
                  className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#003461]">{tank.name}</span>
                        <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                          {tank.code}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                        Lokasi: {tank.locationName} · {tank.fuelType}
                      </p>
                    </div>

                    {tank.isLowStock ? (
                      <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[9px] font-black gap-1">
                        <AlertTriangle className="size-3 text-rose-600" />
                        Low Stock Alert
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-black gap-1">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        Normal
                      </Badge>
                    )}
                  </div>

                  {/* Stock Level Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-[#082033]">
                        {tank.currentStockLiters.toLocaleString('id-ID')} L
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Kapasitas: {tank.capacityLiters.toLocaleString('id-ID')} L ({tank.stockPercentage}%)
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          tank.isLowStock
                            ? 'bg-rose-500'
                            : tank.stockPercentage > 60
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        )}
                        style={{ width: `${tank.stockPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                    <span>Min. Alert: {tank.minStockAlertLiters.toLocaleString('id-ID')} L</span>
                    <button
                      onClick={() => {
                        setInTankId(tank.id)
                        setOutTankId(tank.id)
                        setActiveTab('fuel_out')
                      }}
                      className="text-[#003461] font-bold hover:underline"
                    >
                      Isi BBM Unit Ini &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Transactions Section */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Transaksi Terakhir
                </p>
                <h2 className="text-sm font-black text-[#003461]">
                  Recent Transactions (5–10 Terakhir)
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs font-black text-[#003461] hover:underline flex items-center gap-0.5"
              >
                Lihat Semua ({transactions.length}) <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {dashboardData.recentTransactions.length === 0 ? (
                <div className="rounded-2xl bg-white p-6 text-center text-xs text-slate-500 border border-slate-200">
                  Belum ada transaksi BBM tercatat.
                </div>
              ) : (
                dashboardData.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedDetailTx(tx)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'flex size-9 items-center justify-center rounded-xl shrink-0 font-bold',
                          tx.transactionType === 'fuel_in'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {tx.transactionType === 'fuel_in' ? (
                          <TrendingUp className="size-4" />
                        ) : (
                          <TrendingDown className="size-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[#082033] truncate">
                            {tx.transactionType === 'fuel_in'
                              ? `Penerimaan: ${tx.supplierName || 'Supplier'}`
                              : `Pengisian Unit: ${tx.equipmentUnitCode || 'Equipment'}`}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {tx.transactionNumber}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {new Date(tx.transactionDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          WIB · {tx.tankName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={cn(
                          'text-xs font-black',
                          tx.transactionType === 'fuel_in'
                            ? 'text-emerald-700'
                            : 'text-amber-800'
                        )}
                      >
                        {tx.transactionType === 'fuel_in' ? '+' : '-'}
                        {Number(tx.quantityLiters).toLocaleString('id-ID')} L
                      </p>
                      <span className="text-[9px] text-slate-400">Detail &rarr;</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* ─── TAB 2: FUEL IN (PENERIMAAN BBM) ─────────────────────────────── */}
      {activeTab === 'fuel_in' && (
        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <PlusCircle className="size-4" />
              </span>
              <h2 className="text-base font-black text-[#003461]">
                Form Fuel In – Penerimaan BBM
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Catat pasokan BBM yang diterima masuk ke tangki penyimpanan site.
            </p>
          </div>

          <form onSubmit={handleFuelInSubmit} className="space-y-4">
            {/* Tangki Penyimpanan & Current Stock Display */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                Tangki Penyimpanan BBM <span className="text-rose-500">*</span>
              </label>
              <select
                value={inTankId}
                onChange={(e) => setInTankId(parseInt(e.target.value, 10))}
                className="h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none focus:border-emerald-600"
              >
                {dashboardData.tanks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code}) - Sisa: {t.currentStockLiters.toLocaleString('id-ID')} L / {t.capacityLiters.toLocaleString('id-ID')} L
                  </option>
                ))}
              </select>

              {selectedInTank && (
                <div className="rounded-xl bg-emerald-50/60 p-2.5 border border-emerald-100 text-[11px] text-emerald-950 flex items-center justify-between">
                  <span>Stok saat ini: <b>{selectedInTank.currentStockLiters.toLocaleString('id-ID')} L</b></span>
                  <span>Kapasitas: <b>{selectedInTank.capacityLiters.toLocaleString('id-ID')} L</b></span>
                </div>
              )}
            </div>

            {/* Supplier & DO Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#082033]">
                  Supplier BBM <span className="text-rose-500">*</span>
                </label>
                <select
                  value={inSupplier}
                  onChange={(e) => setInSupplier(e.target.value)}
                  className="h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none focus:border-emerald-600"
                >
                  {SUPPLIER_PRESETS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="custom">+ Ketik Supplier Lainnya...</option>
                </select>

                {inSupplier === 'custom' && (
                  <input
                    type="text"
                    placeholder="Nama Supplier BBM..."
                    value={inCustomSupplier}
                    onChange={(e) => setInCustomSupplier(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl bg-white px-3 text-xs border border-slate-200 outline-none"
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#082033]">
                  Nomor Delivery Order (DO) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: DO-PTM-2026-9812"
                  value={inDoNumber}
                  onChange={(e) => setInDoNumber(e.target.value)}
                  className="h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none focus:border-emerald-600"
                  required
                />
              </div>
            </div>

            {/* Quantity Input with Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                Jumlah BBM Diterima (Liter) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={inQuantity}
                  onChange={(e) => setInQuantity(e.target.value)}
                  className="h-12 w-full rounded-xl bg-white px-3 text-lg font-black text-[#082033] border border-slate-200 outline-none focus:border-emerald-600 pr-12"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  Liter
                </span>
              </div>

              {/* Quick Liter Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[500, 1000, 2500, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInQuantity(String(preset))}
                    className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-[11px] font-bold text-slate-700 hover:text-emerald-800 transition-colors"
                  >
                    +{preset.toLocaleString('id-ID')} L
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Date & Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                Waktu Transaksi (Otomatis)
              </label>
              <input
                type="datetime-local"
                value={inDate}
                onChange={(e) => setInDate(e.target.value)}
                className="h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none"
              />
            </div>

            {/* Photo / Attachment Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                Foto Surat Jalan / Flowmeter Tanker (Opsional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer border border-slate-200 transition-colors">
                  <Camera className="size-4" />
                  <span>{isUploadingPhoto ? 'Mengunggah...' : 'Pilih Foto / Dokumen'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                </label>
                {inAttachmentUrl && (
                  <a
                    href={resolveUploadUrl(inAttachmentUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-emerald-700 underline truncate max-w-[200px]"
                  >
                    Lihat Lampiran Terunggah
                  </a>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                Catatan / Keterangan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Catatan kondisi penerimaan atau spesifikasi fuel..."
                value={inNotes}
                onChange={(e) => setInNotes(e.target.value)}
                className="w-full rounded-xl bg-white p-3 text-xs font-medium text-[#082033] border border-slate-200 outline-none focus:border-emerald-600"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmittingIn}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-md shadow-emerald-600/20 hover:opacity-95"
            >
              {isSubmittingIn ? 'Menyimpan Transaksi...' : 'Simpan Penerimaan BBM (Fuel In)'}
            </Button>
          </form>
        </div>
      )}

      {/* ─── TAB 3: FUEL OUT (PENGISIAN BBM KE UNIT) ─────────────────────── */}
      {activeTab === 'fuel_out' && (
        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <MinusCircle className="size-4" />
              </span>
              <h2 className="text-base font-black text-[#003461]">
                Form Fuel Out – Pengisian BBM ke Unit
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Catat pengisian BBM dari tangki penyimpanan ke kendaraan atau alat berat.
            </p>
          </div>

          <form onSubmit={handleFuelOutSubmit} className="space-y-4">
            {/* Sumber Tangki BBM */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                Sumber Tangki BBM <span className="text-rose-500">*</span>
              </label>
              <select
                value={outTankId}
                onChange={(e) => setOutTankId(parseInt(e.target.value, 10))}
                className="h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none focus:border-amber-600"
              >
                {dashboardData.tanks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code}) - Sisa Stok: {t.currentStockLiters.toLocaleString('id-ID')} L
                  </option>
                ))}
              </select>

              {selectedOutTank && (
                <div className="rounded-xl bg-amber-50/70 p-2.5 border border-amber-200/80 text-[11px] text-amber-950 flex items-center justify-between">
                  <span>Sisa Stok Tersedia: <b>{selectedOutTank.currentStockLiters.toLocaleString('id-ID')} L</b></span>
                  <span>Kapasitas: <b>{selectedOutTank.capacityLiters.toLocaleString('id-ID')} L</b></span>
                </div>
              )}
            </div>

            {/* Equipment / Unit & HM/KM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#082033]">
                  Equipment / Unit Kendaraan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={outVehicleCode}
                  onChange={(e) => setOutVehicleCode(e.target.value)}
                  className="h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none focus:border-amber-600"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.vehicleCode}>
                      {v.vehicleCode} - {v.plateNumber} ({v.vehicleType})
                    </option>
                  ))}
                  <option value="custom">+ Ketik Kode Unit Lainnya...</option>
                </select>

                {outVehicleCode === 'custom' && (
                  <input
                    type="text"
                    placeholder="Kode unit, misal: DT-09, LV-11, GENSET-01..."
                    value={outCustomUnit}
                    onChange={(e) => setOutCustomUnit(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl bg-white px-3 text-xs border border-slate-200 outline-none"
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#082033]">
                  HM / Odometer Saat Ini <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Contoh: 45210"
                  value={outHmKm}
                  onChange={(e) => setOutHmKm(e.target.value)}
                  className="h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none focus:border-amber-600"
                  required
                />
                {matchedVehicle?.lastServiceOdometer && (
                  <p className="text-[10px] text-slate-500">
                    Odometer terakhir tercatat: <b>{matchedVehicle.lastServiceOdometer.toLocaleString('id-ID')} KM</b>
                  </p>
                )}
              </div>
            </div>

            {/* Fuel Quantity Input with Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                Jumlah Liter Pengisian <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={outQuantity}
                  onChange={(e) => setOutQuantity(e.target.value)}
                  className="h-12 w-full rounded-xl bg-white px-3 text-lg font-black text-[#082033] border border-slate-200 outline-none focus:border-amber-600 pr-12"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  Liter
                </span>
              </div>

              {/* Quick Liter Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[20, 40, 60, 80, 100, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOutQuantity(String(preset))}
                    className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-[11px] font-bold text-slate-700 hover:text-amber-800 transition-colors"
                  >
                    +{preset} L
                  </button>
                ))}
              </div>
            </div>

            {/* Operator / Driver */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                Nama Operator / Driver (Opsional)
              </label>
              <input
                type="text"
                placeholder="Nama pengemudi atau teknisi lapangan..."
                value={outOperator}
                onChange={(e) => setOutOperator(e.target.value)}
                className="h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none focus:border-amber-600"
              />
            </div>

            {/* Transaction Date & Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                Waktu Transaksi (Otomatis)
              </label>
              <input
                type="datetime-local"
                value={outDate}
                onChange={(e) => setOutDate(e.target.value)}
                className="h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                Catatan Pengisian (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Keterangan rute, pekerjaan, atau kondisi unit..."
                value={outNotes}
                onChange={(e) => setOutNotes(e.target.value)}
                className="w-full rounded-xl bg-white p-3 text-xs font-medium text-[#082033] border border-slate-200 outline-none focus:border-amber-600"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmittingOut}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-sm shadow-md shadow-amber-600/20 hover:opacity-95"
            >
              {isSubmittingOut ? 'Menyimpan Pengisian...' : 'Simpan Pengisian BBM (Fuel Out)'}
            </Button>
          </form>
        </div>
      )}

      {/* ─── TAB 4: HISTORY ──────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari No. Transaksi, Unit, DO, Operator, Supplier..."
                value={histSearch}
                onChange={(e) => setHistSearch(e.target.value)}
                className="h-10 w-full rounded-xl bg-slate-50 pl-10 pr-4 text-xs font-semibold text-[#082033] outline-none border border-slate-200 focus:border-[#003461]"
              />
              {histSearch && (
                <button
                  onClick={() => setHistSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
                <button
                  onClick={() => setHistType('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    histType === 'all' ? 'bg-white text-[#003461] shadow-xs font-black' : 'text-slate-600'
                  )}
                >
                  Semua
                </button>
                <button
                  onClick={() => setHistType('fuel_in')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    histType === 'fuel_in' ? 'bg-emerald-600 text-white shadow-xs font-black' : 'text-slate-600'
                  )}
                >
                  Fuel In
                </button>
                <button
                  onClick={() => setHistType('fuel_out')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    histType === 'fuel_out' ? 'bg-amber-600 text-white shadow-xs font-black' : 'text-slate-600'
                  )}
                >
                  Fuel Out
                </button>
              </div>

              {/* Tank Selector */}
              <select
                value={histTankId}
                onChange={(e) => setHistTankId(e.target.value)}
                className="h-8 rounded-xl bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 border-none outline-none"
              >
                <option value="all">Semua Tangki</option>
                {dashboardData.tanks.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            {filteredHistory.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center border border-slate-200">
                <FileText className="mx-auto mb-2 size-10 text-slate-300" />
                <p className="font-black text-[#082033] text-sm">Tidak Ada Transaksi Ditemukan</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sesuaikan kata kunci pencarian atau filter tipe transaksi di atas.
                </p>
              </div>
            ) : (
              filteredHistory.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedDetailTx(tx)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'flex size-10 items-center justify-center rounded-xl shrink-0 font-bold',
                        tx.transactionType === 'fuel_in'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {tx.transactionType === 'fuel_in' ? (
                        <TrendingUp className="size-4" />
                      ) : (
                        <TrendingDown className="size-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#082033] truncate">
                          {tx.transactionType === 'fuel_in'
                            ? `Penerimaan: ${tx.supplierName || 'Supplier'}`
                            : `Unit: ${tx.equipmentUnitCode || '-'}`}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] font-mono px-1.5 py-0',
                            tx.transactionType === 'fuel_in'
                              ? 'border-emerald-300 text-emerald-800'
                              : 'border-amber-300 text-amber-800'
                          )}
                        >
                          {tx.transactionNumber}
                        </Badge>
                      </div>

                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {new Date(tx.transactionDate).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        WIB · {tx.tankName} · Oleh: {tx.createdByName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        'text-sm font-black',
                        tx.transactionType === 'fuel_in'
                          ? 'text-emerald-700'
                          : 'text-amber-800'
                      )}
                    >
                      {tx.transactionType === 'fuel_in' ? '+' : '-'}
                      {Number(tx.quantityLiters).toLocaleString('id-ID')} L
                    </p>
                    <span className="text-[9px] text-slate-400">Lihat Detail &rarr;</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TRANSACTION DETAIL MODAL ────────────────────────────────────── */}
      <Dialog open={Boolean(selectedDetailTx)} onOpenChange={(open) => !open && setSelectedDetailTx(null)}>
        <DialogContent className="max-w-md w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl p-5 bg-white border-slate-200">
          {selectedDetailTx && (
            <>
              <DialogHeader className="text-left space-y-1 border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <Badge
                    className={cn(
                      'text-[10px] font-black uppercase px-2 py-0.5',
                      selectedDetailTx.transactionType === 'fuel_in'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {selectedDetailTx.transactionType === 'fuel_in'
                      ? 'Penerimaan BBM (Fuel In)'
                      : 'Pengisian Unit (Fuel Out)'}
                  </Badge>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {selectedDetailTx.transactionNumber}
                  </span>
                </div>
                <DialogTitle className="text-base font-black text-[#003461]">
                  Detail Transaksi BBM
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Waktu: {new Date(selectedDetailTx.transactionDate).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })} WIB
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                {/* Quantity Box */}
                <div
                  className={cn(
                    'p-3.5 rounded-2xl text-center space-y-0.5',
                    selectedDetailTx.transactionType === 'fuel_in'
                      ? 'bg-emerald-50 border border-emerald-100 text-emerald-950'
                      : 'bg-amber-50 border border-amber-100 text-amber-950'
                  )}
                >
                  <p className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                    Jumlah Volume BBM
                  </p>
                  <p className="text-3xl font-black">
                    {selectedDetailTx.transactionType === 'fuel_in' ? '+' : '-'}
                    {Number(selectedDetailTx.quantityLiters).toLocaleString('id-ID')} Liter
                  </p>
                  <p className="text-[11px] font-bold text-slate-600">
                    Stok Tangki: {Number(selectedDetailTx.stockBeforeLiters).toLocaleString('id-ID')} L &rarr;{' '}
                    <b>{Number(selectedDetailTx.stockAfterLiters).toLocaleString('id-ID')} L</b>
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Tangki Penyimpanan</span>
                    <span className="font-bold text-slate-900">{selectedDetailTx.tankName || 'Tangki BBM'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Dicatat Oleh</span>
                    <span className="font-bold text-slate-900">{selectedDetailTx.createdByName}</span>
                  </div>

                  {selectedDetailTx.transactionType === 'fuel_in' ? (
                    <>
                      <div className="col-span-2 pt-2 border-t border-slate-200">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Supplier</span>
                        <span className="font-bold text-slate-900">{selectedDetailTx.supplierName || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Nomor Delivery Order (DO)</span>
                        <span className="font-mono font-bold text-blue-700">{selectedDetailTx.deliveryOrderNumber || '-'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-2 pt-2 border-t border-slate-200">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Unit Kendaraan / Equipment</span>
                        <span className="font-bold text-[#003461]">{selectedDetailTx.equipmentUnitCode || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">HM / Odometer Saat Ini</span>
                        <span className="font-bold text-slate-900">
                          {selectedDetailTx.currentHmKm ? `${Number(selectedDetailTx.currentHmKm).toLocaleString('id-ID')} KM` : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Operator / Driver</span>
                        <span className="font-bold text-slate-900">{selectedDetailTx.operatorName || '-'}</span>
                      </div>
                    </>
                  )}

                  {selectedDetailTx.notes && (
                    <div className="col-span-2 pt-2 border-t border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Catatan</span>
                      <p className="text-slate-700 italic">{selectedDetailTx.notes}</p>
                    </div>
                  )}
                </div>

                {/* Attachment photo preview */}
                {selectedDetailTx.attachmentUrl && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Foto Bukti / Surat Jalan</span>
                    <a
                      href={resolveUploadUrl(selectedDetailTx.attachmentUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl overflow-hidden border border-slate-200 relative aspect-video bg-slate-100"
                    >
                      <Image
                        src={resolveUploadUrl(selectedDetailTx.attachmentUrl)}
                        alt="Foto Surat Jalan"
                        fill
                        className="object-cover"
                      />
                    </a>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setSelectedDetailTx(null)}
                  className="w-full h-10 rounded-xl bg-[#003461] text-white text-xs font-bold"
                >
                  Tutup Rincian
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
