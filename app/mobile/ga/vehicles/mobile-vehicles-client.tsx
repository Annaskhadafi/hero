'use client'

import React, { useState, useMemo } from 'react'
import {
  Truck,
  Car,
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Phone,
  MapPin,
  Calendar,
  Wrench,
  Shield,
  FileText,
  Building2,
  Printer,
  ChevronRight,
  User,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { VehicleStatusBadge } from '@/components/vehicles/vehicle-status-badge'
import { VehiclePrintDialog } from '@/components/vehicles/vehicle-print-dialog'
import { getVehicleById } from '@/app/actions/vehicles'
import type { HeroVehicle, HeroVehicleServiceLog } from '@/db/schema/vehicles'
import type { VehicleComputedRow, DocumentAlertStatus } from '@/lib/vehicle-status'

export type VehicleWithStatus = VehicleComputedRow

function toBadgeStatus(status: DocumentAlertStatus): 'valid' | 'warning' | 'expired' | 'none' {
  if (status === 'safe') return 'valid'
  if (status === 'warning') return 'warning'
  if (status === 'expired') return 'expired'
  return 'none'
}

function toServiceBadgeStatus(status: 'due' | 'safe' | 'not_recorded'): 'valid' | 'warning' | 'due' | 'none' {
  if (status === 'safe') return 'valid'
  if (status === 'due') return 'due'
  return 'none'
}

function hasVehicleAlert(v: VehicleComputedRow): boolean {
  return (
    v.stnkAlertStatus === 'expired' ||
    v.stnkAlertStatus === 'warning' ||
    v.taxAlertStatus === 'expired' ||
    v.taxAlertStatus === 'warning' ||
    v.kirAlertStatus === 'expired' ||
    v.kirAlertStatus === 'warning' ||
    v.serviceAlertStatus === 'due'
  )
}

interface MobileVehiclesClientProps {
  vehicles: VehicleComputedRow[]
  canManage: boolean
}

export function MobileVehiclesClient({
  vehicles,
  canManage,
}: MobileVehiclesClientProps) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'alert' | 'owned' | 'rented' | 'truck'>('all')

  // Selected vehicle for bottom sheet detail
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleComputedRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Print dialog
  const [printOpen, setPrintOpen] = useState(false)
  const [printVehicle, setPrintVehicle] = useState<(HeroVehicle & { serviceLogs?: HeroVehicleServiceLog[] }) | null>(null)

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const plate = (v.plateNumber || '').toLowerCase()
        const holder = (v.holderName || '').toLowerCase()
        const site = (v.siteNameFallback || v.locationName || '').toLowerCase()
        const matchPlate = plate.includes(q)
        const matchType = v.vehicleType?.toLowerCase().includes(q)
        const matchHolder = holder.includes(q)
        const matchSite = site.includes(q)
        if (!matchPlate && !matchType && !matchHolder && !matchSite) {
          return false
        }
      }

      // Tab filter
      if (activeTab === 'alert') {
        return hasVehicleAlert(v)
      }
      if (activeTab === 'owned') {
        return (v.ownership || '').toLowerCase() === 'owned'
      }
      if (activeTab === 'rented') {
        return (v.ownership || '').toLowerCase() === 'rented'
      }
      if (activeTab === 'truck') {
        return v.category === 'Heavy Truck' || v.category === 'Crane Truck' || v.category === 'Light Commercial'
      }

      return true
    })
  }, [vehicles, search, activeTab])

  const handleOpenDetail = (v: VehicleWithStatus) => {
    setSelectedVehicle(v)
    setDetailOpen(true)
  }

  const handleOpenPrint = async (v: VehicleWithStatus) => {
    try {
      const full = await getVehicleById(v.id)
      setPrintVehicle(full || v)
      setPrintOpen(true)
    } catch {
      setPrintVehicle(v)
      setPrintOpen(true)
    }
  }

  const formatDate = (val?: string | null) => {
    if (!val) return '-'
    try {
      return new Date(val).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return val
    }
  }

  return (
    <div className="space-y-3.5">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Cari plat nomor, tipe, holder, site..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 shadow-sm rounded-xl"
        />
      </div>

      {/* Filter Tabs Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'all'
              ? 'bg-[#003461] text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          Semua ({vehicles.length})
        </button>
        <button
          onClick={() => setActiveTab('alert')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'alert'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-rose-600 border border-rose-200 dark:border-rose-900'
          }`}
        >
          <AlertTriangle className="size-3" />
          Ada Alert ({vehicles.filter(hasVehicleAlert).length})
        </button>
        <button
          onClick={() => setActiveTab('owned')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'owned'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          Owned ({vehicles.filter((v) => (v.ownership || '').toLowerCase() === 'owned').length})
        </button>
        <button
          onClick={() => setActiveTab('rented')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'rented'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          Rented ({vehicles.filter((v) => (v.ownership || '').toLowerCase() === 'rented').length})
        </button>
        <button
          onClick={() => setActiveTab('truck')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'truck'
              ? 'bg-[#082033] text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          Truk / Niaga
        </button>
      </div>

      {/* Vehicle Card List */}
      <div className="space-y-2.5">
        {filteredVehicles.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-muted-foreground shadow-sm">
            <Truck className="size-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="font-bold text-sm text-foreground">Tidak Ada Kendaraan</p>
            <p className="text-xs mt-1">Coba sesuaikan pencarian atau tab filter Anda.</p>
          </div>
        ) : (
          filteredVehicles.map((v) => {
            const isRented = (v.ownership || '').toLowerCase() === 'rented'
            const plate = v.plateNumber || (v as any).policeNumber || '-'
            const holder = v.holderName || (v as any).assignedEmployeeName || 'Pool'
            const site = v.siteNameFallback || (v as any).siteName || v.locationName || '-'

            return (
              <div
                key={v.id}
                onClick={() => handleOpenDetail(v)}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer relative overflow-hidden"
              >
                {/* Left Accent Bar if alert */}
                {hasVehicleAlert(v) && (
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      v.stnkAlertStatus === 'expired' || v.taxAlertStatus === 'expired' || v.kirAlertStatus === 'expired'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  />
                )}

                {/* Top Row: Plate + Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm tracking-wide text-foreground">
                      {plate}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 font-bold ${
                        isRented
                          ? 'bg-amber-500/10 text-amber-700 border-amber-300'
                          : 'bg-blue-500/10 text-blue-700 border-blue-300'
                      }`}
                    >
                      {isRented ? 'Rented' : 'Owned'}
                    </Badge>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 font-semibold ${
                      v.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {v.status}
                  </Badge>
                </div>

                {/* Second Row: Vehicle Model & Category */}
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {v.vehicleType}
                </p>

                {/* Third Row: Holder & Site */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                  <span className="flex items-center gap-1 truncate max-w-[150px]">
                    <User className="size-3 text-slate-400" />
                    <strong className="text-foreground">{holder}</strong>
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="size-3 text-slate-400" />
                    {site}
                  </span>
                </div>

                {/* Document Status Badges Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                  <div>
                    <span className="text-muted-foreground block text-[9px] font-medium uppercase">STNK 5 Thn</span>
                    <VehicleStatusBadge status={toBadgeStatus(v.stnkAlertStatus)} remainingDays={v.stnkDaysRemaining} compact />
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] font-medium uppercase">Pajak 1 Thn</span>
                    <VehicleStatusBadge status={toBadgeStatus(v.taxAlertStatus)} remainingDays={v.taxDaysRemaining} compact />
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] font-medium uppercase">
                      {v.kirExpiryDate ? 'KIR Dishub' : 'Servis'}
                    </span>
                    {v.kirExpiryDate ? (
                      <VehicleStatusBadge status={toBadgeStatus(v.kirAlertStatus)} remainingDays={v.kirDaysRemaining} compact />
                    ) : (
                      <VehicleStatusBadge status={toServiceBadgeStatus(v.serviceAlertStatus)} remainingDays={v.serviceDaysSince} compact />
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom Sheet Detail */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-4 py-5">
          {selectedVehicle && (
            <div className="space-y-4">
              <SheetHeader className="text-left border-b pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-lg text-foreground">
                    {selectedVehicle.plateNumber}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      selectedVehicle.ownership?.toLowerCase() === 'rented'
                        ? 'bg-amber-500/10 text-amber-700 border-amber-300 font-bold'
                        : 'bg-blue-500/10 text-blue-700 border-blue-300 font-bold'
                    }
                  >
                    {selectedVehicle.ownership?.toLowerCase() === 'rented' ? 'Rented' : 'Owned'}
                  </Badge>
                </div>
                <SheetTitle className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {selectedVehicle.vehicleType} ({selectedVehicle.category})
                </SheetTitle>
              </SheetHeader>

              {/* Status Surat / Dokumen */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Shield className="size-4 text-blue-600" />
                  Masa Berlaku Dokumen & Surat
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] text-muted-foreground block font-medium">STNK (5 Tahunan)</span>
                    <p className="font-bold mt-0.5">{formatDate(selectedVehicle.stnkExpiryDate)}</p>
                    <div className="mt-1">
                      <VehicleStatusBadge
                        status={toBadgeStatus(selectedVehicle.stnkAlertStatus)}
                        remainingDays={selectedVehicle.stnkDaysRemaining}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] text-muted-foreground block font-medium">Pajak PKB (1 Tahunan)</span>
                    <p className="font-bold mt-0.5">{formatDate(selectedVehicle.taxExpiryDate)}</p>
                    <div className="mt-1">
                      <VehicleStatusBadge
                        status={toBadgeStatus(selectedVehicle.taxAlertStatus)}
                        remainingDays={selectedVehicle.taxDaysRemaining}
                      />
                    </div>
                  </div>

                  {selectedVehicle.kirExpiryDate && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 col-span-2">
                      <span className="text-[10px] text-muted-foreground block font-medium">Uji KIR Dishub</span>
                      <p className="font-bold mt-0.5">{formatDate(selectedVehicle.kirExpiryDate)}</p>
                      <div className="mt-1">
                        <VehicleStatusBadge
                          status={toBadgeStatus(selectedVehicle.kirAlertStatus)}
                          remainingDays={selectedVehicle.kirDaysRemaining}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Unit & Pemegang */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pemegang Unit</span>
                  <span className="font-bold">{selectedVehicle.holderName || 'Pool'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lokasi / Site</span>
                  <span className="font-semibold">{selectedVehicle.siteNameFallback || selectedVehicle.locationName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tahun Pembuatan</span>
                  <span>{selectedVehicle.manufactureYear || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Odometer Terakhir</span>
                  <span className="font-mono font-bold">
                    {selectedVehicle.lastServiceOdometer
                      ? `${new Intl.NumberFormat('id-ID').format(selectedVehicle.lastServiceOdometer)} KM`
                      : '-'}
                  </span>
                </div>
                {selectedVehicle.ownership?.toLowerCase() === 'rented' && (
                  <>
                    <div className="flex justify-between border-t pt-1.5">
                      <span className="text-muted-foreground">Vendor Rental</span>
                      <span className="font-semibold">{selectedVehicle.rentalVendor || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Akhir Kontrak Sewa</span>
                      <span className="font-semibold text-amber-600">
                        {formatDate(selectedVehicle.rentalEndDate)}
                      </span>
                    </div>
                  </>
                )}
                {selectedVehicle.notes && (
                  <div className="border-t pt-1.5 text-[11px] text-muted-foreground">
                    <strong>Catatan:</strong> {selectedVehicle.notes}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => handleOpenPrint(selectedVehicle)}
                  className="w-full text-xs font-semibold h-10 gap-1.5 rounded-xl"
                >
                  <Printer className="size-4 text-blue-600" />
                  Lihat Dokumen A4
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Print Preview Dialog */}
      <VehiclePrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        vehicle={printVehicle}
      />
    </div>
  )
}
