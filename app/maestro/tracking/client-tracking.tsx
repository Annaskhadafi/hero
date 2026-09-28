'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Image as ImageIcon,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  User,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import type {
  MaestroTrackingData,
  MaestroCargoManifestItem,
  MaestroPoItem,
  MaestroDeliveryItem,
  MaestroVhsUsageItem,
} from '@/app/actions/maestro-tracking'

interface Props {
  initialData: MaestroTrackingData
  customerUser: {
    id: string
    name: string
    email: string
  }
}

export function MaestroClientTracking({ initialData, customerUser }: Props) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'manifest' | 'po' | 'deliveries' | 'vhs'>('manifest')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedManifestRows, setExpandedManifestRows] = useState<Set<number>>(new Set())

  // Detail Modal States
  const [selectedManifest, setSelectedManifest] = useState<MaestroCargoManifestItem | null>(null)
  const [selectedPo, setSelectedPo] = useState<MaestroPoItem | null>(null)
  const [selectedDelivery, setSelectedDelivery] = useState<MaestroDeliveryItem | null>(null)
  const [selectedVhs, setSelectedVhs] = useState<MaestroVhsUsageItem | null>(null)

  const toggleManifestRow = (id: number) => {
    const next = new Set(expandedManifestRows)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedManifestRows(next)
  }

  // Filtered Cargo Manifests
  const filteredManifests = useMemo(() => {
    return initialData.cargoManifests.filter((m) => {
      const matchStatus =
        selectedStatus === 'all' ||
        !selectedStatus ||
        m.status.toLowerCase() === selectedStatus.toLowerCase()

      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        m.manifestNumber.toLowerCase().includes(q) ||
        (m.siteName && m.siteName.toLowerCase().includes(q)) ||
        (m.finalDestination && m.finalDestination.toLowerCase().includes(q)) ||
        (m.attention && m.attention.toLowerCase().includes(q)) ||
        (m.transportVia && m.transportVia.toLowerCase().includes(q)) ||
        m.items.some((it) => it.description.toLowerCase().includes(q) || it.serialNumber.toLowerCase().includes(q))

      return matchStatus && matchSearch
    })
  }, [initialData.cargoManifests, selectedStatus, searchQuery])

  // Filtered POs
  const filteredPo = useMemo(() => {
    return initialData.poList.filter((po) => {
      const matchStatus =
        selectedStatus === 'all' ||
        !selectedStatus ||
        po.status.toLowerCase() === selectedStatus.toLowerCase()

      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        po.customerPo.toLowerCase().includes(q) ||
        po.invoiceNumber.toLowerCase().includes(q) ||
        (po.tripDestination && po.tripDestination.toLowerCase().includes(q)) ||
        (po.notes && po.notes.toLowerCase().includes(q))

      return matchStatus && matchSearch
    })
  }, [initialData.poList, selectedStatus, searchQuery])

  // Filtered Deliveries
  const filteredDeliveries = useMemo(() => {
    return initialData.deliveriesList.filter((del) => {
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        del.deliveryNumber.toLowerCase().includes(q) ||
        (del.doSap && del.doSap.toLowerCase().includes(q)) ||
        del.customerPo.toLowerCase().includes(q) ||
        (del.driverName && del.driverName.toLowerCase().includes(q)) ||
        (del.vehicleNumber && del.vehicleNumber.toLowerCase().includes(q)) ||
        (del.shippingAddress && del.shippingAddress.toLowerCase().includes(q))

      return matchSearch
    })
  }, [initialData.deliveriesList, searchQuery])

  // Filtered VHS
  const filteredVhs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return initialData.vhsList
    return initialData.vhsList.filter(
      (v) =>
        v.vhsNo.toLowerCase().includes(q) ||
        (v.woNo && v.woNo.toLowerCase().includes(q)) ||
        v.warehouseName.toLowerCase().includes(q),
    )
  }, [initialData.vhsList, searchQuery])

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 space-y-8 text-slate-900 pb-20">
      {/* Top Header: Frosted Glass Panel */}
      <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/85 p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/90 border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs sm:text-sm font-bold shadow-2xs transition"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
                <span>Dashboard</span>
              </Link>
              <span className="text-slate-400 font-bold">/</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800">PO &amp; Cargo Tracking</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-extrabold text-amber-950 shadow-2xs">
                <Truck className="h-4 w-4 text-amber-700" />
                Supply Chain &amp; Cargo
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-black tracking-tight text-slate-950">
              PO &amp; Cargo Tracking
            </h1>
            <p className="text-sm sm:text-base text-slate-700 mt-2 font-medium">
              Pelacakan manifest kargo, status DO SAP / surat jalan, Purchase Order servis, dan pemakaian konsinyasi eVHS untuk site {initialData.customerName}.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              className="h-11 gap-2 rounded-2xl border-slate-300 bg-white/90 px-5 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
            >
              <RefreshCw className="h-4 w-4 text-slate-600" />
              <span>Segarkan Data</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards: Frosted Glass */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Cargo Manifest */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Cargo Manifest</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-800 font-bold border border-sky-200 shadow-2xs">
              <Truck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5">
            <span className="font-display text-3xl sm:text-4xl font-black text-slate-950">
              {initialData.kpis.totalManifest}
            </span>
            <p className="text-xs text-slate-600 font-semibold mt-1">Total pengiriman kargo</p>
          </div>
        </div>

        {/* 2. Pengiriman Dalam Perjalanan */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Dalam Perjalanan</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-bold border border-amber-200 shadow-2xs">
              <Package className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5">
            <span className="font-display text-3xl sm:text-4xl font-black text-amber-900">
              {initialData.kpis.sentManifest || initialData.kpis.inTransitDeliveries}
            </span>
            <p className="text-xs text-slate-600 font-semibold mt-1">Status Sent / In Transit</p>
          </div>
        </div>

        {/* 3. Pengiriman Diterima */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Sampai di Site</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shadow-2xs">
              <PackageCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5">
            <span className="font-display text-3xl sm:text-4xl font-black text-emerald-700">
              {initialData.kpis.deliveredManifest || initialData.kpis.receivedDeliveries}
            </span>
            <p className="text-xs text-slate-600 font-semibold mt-1">Status Delivered / Selesai</p>
          </div>
        </div>

        {/* 4. Total Purchase Orders */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Total Purchase Order</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 shadow-2xs">
              <FileCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl sm:text-4xl font-black text-slate-950">
                {initialData.kpis.totalPo}
              </span>
              <span className="text-sm font-bold text-slate-600">PO</span>
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1">{initialData.kpis.totalTiresDelivered} Unit Ban Terkirim</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Tab Switcher: Frosted Glass */}
      <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xs backdrop-blur-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Pill Tab Switcher */}
          <div className="inline-flex rounded-2xl bg-slate-100/90 p-1.5 shadow-2xs self-start overflow-x-auto max-w-full border border-slate-300/70">
            <button
              type="button"
              onClick={() => setActiveTab('manifest')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'manifest'
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Cargo Manifest</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${activeTab === 'manifest' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-800'}`}>
                {initialData.cargoManifests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('po')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'po'
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Purchase Order (PO)</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${activeTab === 'po' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-800'}`}>
                {initialData.poList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deliveries')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'deliveries'
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <PackageCheck className="h-4 w-4" />
              <span>Surat Jalan &amp; DO</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${activeTab === 'deliveries' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-800'}`}>
                {initialData.deliveriesList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vhs')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'vhs'
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <FileCheck className="h-4 w-4" />
              <span>Konsinyasi (eVHS)</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${activeTab === 'vhs' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-800'}`}>
                {initialData.vhsList.length}
              </span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[160px]">
              <select
                aria-label="Filter Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-11 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-2xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-2xs transition"
              >
                <option value="all">Semua Status</option>
                <option value="delivered">Delivered / Selesai</option>
                <option value="sent">Sent / Dikirim</option>
                <option value="draft">Draft / Proses</option>
              </select>
            </div>

            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cari manifest, no. PO, tujuan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-2xl border-slate-300 bg-white pl-10 pr-4 text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 shadow-2xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab 1: Cargo Manifests */}
      {activeTab === 'manifest' && (
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-xs backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-800">
              <thead className="bg-slate-100/90 text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200">
                <tr>
                  <th className="py-4 pl-6 pr-2 w-10"></th>
                  <th className="py-4 px-4">No. Manifest</th>
                  <th className="py-4 px-4">Tanggal</th>
                  <th className="py-4 px-4">Site / Tujuan</th>
                  <th className="py-4 px-4">Transport / Ekspedisi</th>
                  <th className="py-4 px-4">Items / Qty</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 pl-4 pr-6 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 font-semibold text-slate-800">
                {filteredManifests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-sm font-medium text-slate-500">
                      Tidak ada data Cargo Manifest yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredManifests.map((manifest) => {
                    const isExpanded = expandedManifestRows.has(manifest.id)
                    const statusStyle = getManifestStatusStyle(manifest.status)
                    const totalQty = manifest.items.reduce((s, it) => s + it.qty, 0)

                    return (
                      <React.Fragment key={manifest.id}>
                        <tr className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-4 pl-6 pr-2">
                            <button
                              type="button"
                              onClick={() => toggleManifestRow(manifest.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-950 transition"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4 font-mono font-black text-slate-950 text-sm">
                            {manifest.manifestNumber}
                          </td>
                          <td className="py-4 px-4 text-xs sm:text-sm text-slate-700 font-semibold">{manifest.date}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-900">
                              <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                              <span className="font-bold">{manifest.siteName || manifest.finalDestination || 'Site'}</span>
                            </div>
                            {manifest.attention && (
                              <p className="text-xs text-slate-500 pl-5 font-medium">Attn: {manifest.attention}</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-bold text-slate-900 text-sm">{manifest.transportVia || 'Darat'}</p>
                            {manifest.shippedVia && (
                              <p className="text-xs text-slate-500 font-semibold">{manifest.shippedVia}</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-black text-slate-950 text-sm">{totalQty} Unit</span>
                            <p className="text-xs text-slate-500 font-medium">{manifest.items.length} Baris Item</p>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}>
                              {manifest.status}
                            </span>
                          </td>
                          <td className="py-4 pl-4 pr-6 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedManifest(manifest)}
                              className="h-10 px-4 rounded-2xl border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
                            >
                              <Eye className="h-4 w-4 mr-1 text-slate-600" />
                              Lihat Detail
                            </Button>
                          </td>
                        </tr>

                        {/* Collapsible item details */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={8} className="py-4 px-6 sm:px-12">
                              <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-2xs">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3">
                                  Daftar Item Barang &amp; Ban Terangkut
                                </h4>
                                <div className="divide-y divide-slate-200/70 text-xs sm:text-sm">
                                  {manifest.items.map((it) => (
                                    <div key={it.id} className="py-3 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs font-bold text-slate-400">{it.no}.</span>
                                        <div>
                                          <p className="font-bold text-slate-950">{it.description}</p>
                                          {it.serialNumber && (
                                            <p className="text-xs font-mono font-semibold text-slate-600 mt-0.5">SN: {it.serialNumber}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-black text-slate-950">{it.qty} Unit</span>
                                        {it.remark && <p className="text-xs text-slate-500 font-medium">{it.remark}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: POs */}
      {activeTab === 'po' && (
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-xs backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-800">
              <thead className="bg-slate-100/90 text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200">
                <tr>
                  <th className="py-4 pl-6 pr-4">No. PO Pelanggan</th>
                  <th className="py-4 px-4">Tanggal Order</th>
                  <th className="py-4 px-4">Kategori / Tujuan</th>
                  <th className="py-4 px-4">Jumlah Item / Qty</th>
                  <th className="py-4 px-4">Status Pengiriman</th>
                  <th className="py-4 pl-4 pr-6 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 font-semibold text-slate-800">
                {filteredPo.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm font-medium text-slate-500">
                      Tidak ada data Purchase Order yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredPo.map((po) => {
                    const statusStyle = getPoStatusStyle(po.status)

                    return (
                      <tr key={po.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-4 pl-6 pr-4">
                          <p className="font-mono text-xs sm:text-sm font-black text-slate-950">{po.customerPo}</p>
                          {po.invoiceNumber && po.invoiceNumber !== '-' && (
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">Inv: {po.invoiceNumber}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs sm:text-sm text-slate-700 font-semibold">
                          {new Date(po.salesDate).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-900">
                            <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                            <span className="font-bold">{po.tripDestination || 'Site Operasional'}</span>
                          </div>
                          {po.categoryProduct && (
                            <p className="text-xs text-slate-500 pl-5 font-medium">{po.categoryProduct}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-black text-slate-950 text-sm">{po.totalQty} Unit</span>
                          <p className="text-xs text-slate-500 font-medium">{po.totalItems} Jenis Barang</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4 pr-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPo(po)}
                            className="h-10 px-4 rounded-2xl border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
                          >
                            <Eye className="h-4 w-4 mr-1 text-slate-600" />
                            Lihat Detail
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Deliveries */}
      {activeTab === 'deliveries' && (
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-xs backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-800">
              <thead className="bg-slate-100/90 text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200">
                <tr>
                  <th className="py-4 pl-6 pr-4">No. DO SAP / Surat Jalan</th>
                  <th className="py-4 px-4">Ref. PO Pelanggan</th>
                  <th className="py-4 px-4">Jadwal Kirim</th>
                  <th className="py-4 px-4">Ekspedisi / Driver</th>
                  <th className="py-4 px-4">Status Pengiriman</th>
                  <th className="py-4 pl-4 pr-6 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 font-semibold text-slate-800">
                {filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm font-medium text-slate-500">
                      Tidak ada data Surat Jalan / DO yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((del) => {
                    const statusStyle = getDeliveryStatusStyle(del.status)

                    return (
                      <tr key={del.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-4 pl-6 pr-4">
                          <p className="font-mono text-xs sm:text-sm font-black text-slate-950">
                            {del.doSap || del.deliveryNumber}
                          </p>
                          {del.doSap && (
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">Hero: {del.deliveryNumber}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs sm:text-sm font-bold text-slate-900">
                          {del.customerPo}
                        </td>
                        <td className="py-4 px-4 text-xs sm:text-sm text-slate-700 font-semibold">
                          {new Date(del.scheduledDate).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-900 text-sm">
                            {del.vendorName || del.driverName || 'Armada Internal HERO'}
                          </p>
                          {del.vehicleNumber && (
                            <p className="text-xs text-slate-500 font-semibold">{del.vehicleNumber}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}>
                            {del.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4 pr-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDelivery(del)}
                            className="h-10 px-4 rounded-2xl border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
                          >
                            <Eye className="h-4 w-4 mr-1 text-slate-600" />
                            Lihat Detail
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: VHS */}
      {activeTab === 'vhs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVhs.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-white/80 bg-white/90 p-12 text-center text-sm font-medium text-slate-500 shadow-xs backdrop-blur-xl">
              Tidak ada data catatan konsinyasi eVHS yang tersedia.
            </div>
          ) : (
            filteredVhs.map((vhs) => (
              <div
                key={vhs.id}
                className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xs backdrop-blur-xl hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs sm:text-sm font-black text-slate-900">{vhs.vhsNo}</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 px-3 py-1 text-xs font-bold shadow-2xs">
                      {vhs.totalQty} Ban Terpasang
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-950">
                    WO: {vhs.woNo || 'Reguler Maintenance'}
                  </h3>
                  <div className="mt-2 text-xs sm:text-sm text-slate-600 font-medium">
                    <span>Gudang Site: </span>
                    <strong className="text-slate-950 font-bold">{vhs.warehouseName}</strong>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{vhs.date}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedVhs(vhs)}
                    className="h-9 px-4 rounded-2xl border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
                  >
                    <Eye className="h-4 w-4 mr-1 text-slate-600" />
                    <span>Rincian</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cargo Manifest Detail Dialog */}
      <Dialog open={Boolean(selectedManifest)} onOpenChange={(open) => !open && setSelectedManifest(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border-white/80 shadow-2xl">
          {selectedManifest && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-sm font-black text-slate-950">{selectedManifest.manifestNumber}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getManifestStatusStyle(selectedManifest.status)}`}>
                    {selectedManifest.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-950">
                  Detail Dokumen Cargo Manifest
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 p-5 text-xs sm:text-sm">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tanggal Kirim</span>
                  <span className="font-bold text-slate-950">{selectedManifest.date}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Site / Tujuan Akhir</span>
                  <span className="font-bold text-slate-950">
                    {selectedManifest.siteName || selectedManifest.finalDestination || 'Site'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Moda Transport</span>
                  <span className="font-bold text-slate-950">{selectedManifest.transportVia || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Shipped Via / Ekspedisi</span>
                  <span className="font-bold text-slate-950">{selectedManifest.shippedVia || '-'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3">Rincian Barang Cargo</h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-100/90 text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">No</th>
                        <th className="py-3 px-4">Deskripsi Barang / Ban</th>
                        <th className="py-3 px-4">Serial Number</th>
                        <th className="py-3 px-4 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 font-semibold">
                      {selectedManifest.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-3 px-4 font-bold text-slate-500">{it.no}</td>
                          <td className="py-3 px-4 font-bold text-slate-950">{it.description}</td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-600">{it.serialNumber || '-'}</td>
                          <td className="py-3 px-4 text-right font-black text-slate-950">{it.qty} Unit</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PO Detail Dialog */}
      <Dialog open={Boolean(selectedPo)} onOpenChange={(open) => !open && setSelectedPo(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border-white/80 shadow-2xl">
          {selectedPo && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-sm font-black text-slate-950">{selectedPo.customerPo}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getPoStatusStyle(selectedPo.status)}`}>
                    {selectedPo.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-950">
                  Purchase Order Detail
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 p-5 text-xs sm:text-sm">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tanggal PO</span>
                  <span className="font-bold text-slate-950">
                    {new Date(selectedPo.salesDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Lokasi / Destinasi</span>
                  <span className="font-bold text-slate-950">{selectedPo.tripDestination || 'Site Operasional'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Kuantitas</span>
                  <span className="font-black text-slate-950">{selectedPo.totalQty} Unit</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">No. Invoice Terbit</span>
                  <span className="font-mono font-bold text-slate-950">{selectedPo.invoiceNumber}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3">Daftar Barang &amp; Ban</h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-100/90 text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Deskripsi Ban / Material</th>
                        <th className="py-3 px-4">Part Number</th>
                        <th className="py-3 px-4 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 font-semibold">
                      {selectedPo.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-3 px-4 font-bold text-slate-950">{it.description}</td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-600">{it.partNumber || '-'}</td>
                          <td className="py-3 px-4 text-right font-black text-slate-950">{it.quantity} Unit</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delivery Detail Dialog */}
      <Dialog open={Boolean(selectedDelivery)} onOpenChange={(open) => !open && setSelectedDelivery(null)}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border-white/80 shadow-2xl">
          {selectedDelivery && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-sm font-black text-slate-950">
                    {selectedDelivery.doSap || selectedDelivery.deliveryNumber}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getDeliveryStatusStyle(selectedDelivery.status)}`}>
                    {selectedDelivery.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-950">
                  Surat Jalan &amp; Tracking DO
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 p-5 text-xs sm:text-sm">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ref. PO Pelanggan</span>
                  <span className="font-mono font-bold text-slate-950">{selectedDelivery.customerPo}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Jadwal Kirim</span>
                  <span className="font-bold text-slate-950">
                    {new Date(selectedDelivery.scheduledDate).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Driver / Ekspedisi</span>
                  <span className="font-bold text-slate-950">
                    {selectedDelivery.vendorName || selectedDelivery.driverName || 'Armada HERO'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Plat Nomor / Resi</span>
                  <span className="font-mono font-bold text-slate-950">
                    {selectedDelivery.vehicleNumber || selectedDelivery.awbNumber || '-'}
                  </span>
                </div>
              </div>

              {selectedDelivery.shippingAddress && (
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">Alamat Tujuan Pengiriman</h4>
                  <p className="text-xs sm:text-sm text-slate-800 bg-slate-50/90 p-4 rounded-2xl border border-slate-200 font-medium leading-relaxed">
                    {selectedDelivery.shippingAddress}
                  </p>
                </div>
              )}

              {/* DO Scan Document if available */}
              {selectedDelivery.scanDoDocument && (
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">Scan Dokumen Bukti Terima</h4>
                  <a
                    href={resolveUploadUrl(selectedDelivery.scanDoDocument)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-xs sm:text-sm font-bold text-slate-900 hover:bg-slate-100 shadow-2xs transition"
                  >
                    <FileText className="h-4 w-4 text-amber-600" />
                    <span>Lihat Bukti Surat Jalan (Scan DO)</span>
                    <ExternalLink className="h-4 w-4 opacity-60 ml-1" />
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* VHS Detail Dialog */}
      <Dialog open={Boolean(selectedVhs)} onOpenChange={(open) => !open && setSelectedVhs(null)}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border-white/80 shadow-2xl">
          {selectedVhs && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-sm font-black text-slate-950">{selectedVhs.vhsNo}</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 px-3 py-1 text-xs font-bold shadow-2xs">
                    {selectedVhs.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-950">
                  Rincian Pemakaian Ban Konsinyasi
                </DialogTitle>
              </DialogHeader>

              <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100/90 text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Tipe Ban</th>
                      <th className="py-3 px-4">Serial Number</th>
                      <th className="py-3 px-4">Unit / Posisi</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 font-semibold">
                    {selectedVhs.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-3 px-4 font-bold text-slate-950">{it.productName}</td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-600">{it.serialNumber || '-'}</td>
                        <td className="py-3 px-4 text-slate-800 font-semibold">
                          {it.unitId ? `${it.unitId} (${it.pos || '-'})` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-950">{it.qty} Unit</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getManifestStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'delivered':
      return 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs'
    case 'sent':
      return 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs'
    default:
      return 'bg-slate-200 text-slate-900 border border-slate-300 shadow-2xs'
  }
}

function getPoStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'selesai':
      return 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs'
    case 'delivered':
    case 'terkirim':
      return 'bg-sky-100 text-sky-950 border border-sky-300 shadow-2xs'
    default:
      return 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs'
  }
}

function getDeliveryStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'delivered':
    case 'completed':
      return 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs'
    case 'in_transit':
    case 'scheduled':
    case 'on_delivery':
      return 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs'
    default:
      return 'bg-slate-200 text-slate-900 border border-slate-300 shadow-2xs'
  }
}
