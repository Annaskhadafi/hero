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
    <div className="mx-auto w-full max-w-[1720px] px-4 pt-6 sm:px-6 lg:px-8 xl:px-12 space-y-6 text-slate-950 pb-20">
      {/* Top Header */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap text-xs font-bold text-slate-700">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
              <span>/</span>
              <span>PO &amp; Cargo Tracking</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-400 px-2.5 py-0.5 text-xs font-black text-amber-950">
                <Truck className="h-3.5 w-3.5 text-amber-700" />
                Supply Chain &amp; Cargo
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              PO &amp; Cargo Tracking
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-700 font-semibold">
              Pelacakan status manifest kargo pengiriman, nomor PO pelanggan, surat jalan DO, dan konsinyasi eVHS.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              className="h-10 gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-4 text-xs font-bold text-slate-900 hover:bg-slate-100 shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-slate-700" />
              <span>Segarkan Data</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* 1. Total Cargo Manifest */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-300 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Cargo Manifest</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-900 border border-blue-300 font-black">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl sm:text-3xl font-black text-slate-950">
              {initialData.kpis.totalManifest}
            </span>
          </div>
        </div>

        {/* 2. Pengiriman Dalam Perjalanan */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-300 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Dalam Perjalanan</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-black">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl sm:text-3xl font-black text-slate-950">
              {initialData.kpis.sentManifest || initialData.kpis.inTransitDeliveries}
            </span>
          </div>
        </div>

        {/* 3. Pengiriman Diterima */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-300 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Sampai di Site</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-black">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl sm:text-3xl font-black text-emerald-700">
              {initialData.kpis.deliveredManifest || initialData.kpis.receivedDeliveries}
            </span>
          </div>
        </div>

        {/* 4. Total Purchase Orders */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-300 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Total Purchase Order</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-300 font-black">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-display text-2xl sm:text-3xl font-black text-slate-950">
              {initialData.kpis.totalPo}
            </span>
            <span className="text-xs font-bold text-slate-600">PO</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Tab Switcher */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Pill Tab Switcher */}
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1.5 self-start overflow-x-auto max-w-full border-2 border-slate-300 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('manifest')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'manifest'
                  ? 'bg-blue-700 text-white font-black shadow-sm'
                  : 'bg-slate-200 text-slate-800 font-bold hover:bg-slate-300'
              }`}
            >
              <Truck className={`h-4 w-4 ${activeTab === 'manifest' ? 'text-white' : 'text-slate-700'}`} />
              <span>Cargo Manifest</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${activeTab === 'manifest' ? 'bg-white/20 text-white border border-white/30' : 'bg-slate-300 text-slate-950'}`}>
                {initialData.cargoManifests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('po')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'po'
                  ? 'bg-blue-700 text-white font-black shadow-sm'
                  : 'bg-slate-200 text-slate-800 font-bold hover:bg-slate-300'
              }`}
            >
              <Package className={`h-4 w-4 ${activeTab === 'po' ? 'text-white' : 'text-slate-700'}`} />
              <span>Purchase Order (PO)</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${activeTab === 'po' ? 'bg-white/20 text-white border border-white/30' : 'bg-slate-300 text-slate-950'}`}>
                {initialData.poList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deliveries')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'deliveries'
                  ? 'bg-blue-700 text-white font-black shadow-sm'
                  : 'bg-slate-200 text-slate-800 font-bold hover:bg-slate-300'
              }`}
            >
              <PackageCheck className={`h-4 w-4 ${activeTab === 'deliveries' ? 'text-white' : 'text-slate-700'}`} />
              <span>Surat Jalan &amp; DO</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${activeTab === 'deliveries' ? 'bg-white/20 text-white border border-white/30' : 'bg-slate-300 text-slate-950'}`}>
                {initialData.deliveriesList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vhs')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'vhs'
                  ? 'bg-blue-700 text-white font-black shadow-sm'
                  : 'bg-slate-200 text-slate-800 font-bold hover:bg-slate-300'
              }`}
            >
              <FileCheck className={`h-4 w-4 ${activeTab === 'vhs' ? 'text-white' : 'text-slate-700'}`} />
              <span>Konsinyasi (eVHS)</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${activeTab === 'vhs' ? 'bg-white/20 text-white border border-white/30' : 'bg-slate-300 text-slate-950'}`}>
                {initialData.vhsList.length}
              </span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[160px]">
              <select
                aria-label="Filter Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-11 text-xs sm:text-sm font-bold bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition shadow-sm"
              >
                <option value="all">Semua Status</option>
                <option value="delivered">Delivered / Selesai</option>
                <option value="sent">Sent / Dikirim</option>
                <option value="draft">Draft / Proses</option>
              </select>
            </div>

            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <Input
                placeholder="Cari manifest, no. PO, tujuan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-xl bg-white border-2 border-slate-300 pl-9 pr-3 text-xs sm:text-sm font-bold text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab 1: Cargo Manifests */}
      {activeTab === 'manifest' && (
        <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-900">
              <thead className="bg-slate-200/90 text-xs font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-300">
                <tr>
                  <th className="py-3.5 pl-5 pr-2 w-10"></th>
                  <th className="py-3.5 px-4">No. Manifest</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Site / Tujuan</th>
                  <th className="py-3.5 px-4">Transport / Ekspedisi</th>
                  <th className="py-3.5 px-4">Items / Qty</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                {filteredManifests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-sm font-bold text-slate-700">
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
                        <tr className="hover:bg-blue-50/60 transition-colors">
                          <td className="py-4 pl-5 pr-2">
                            <button
                              type="button"
                              onClick={() => toggleManifestRow(manifest.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 border border-slate-300 text-slate-800 hover:bg-slate-300 hover:text-slate-950 transition font-bold"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4 font-mono font-black text-slate-950 text-xs sm:text-sm">
                            {manifest.manifestNumber}
                          </td>
                          <td className="py-4 px-4 text-xs sm:text-sm text-slate-700 font-bold">{manifest.date}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-950">
                              <MapPin className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                              <span className="font-bold">{manifest.siteName || manifest.finalDestination || 'Site'}</span>
                            </div>
                            {manifest.attention && (
                              <p className="text-xs text-slate-600 font-semibold pl-5">Attn: {manifest.attention}</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-bold text-slate-950">{manifest.transportVia || 'Darat'}</p>
                            {manifest.shippedVia && (
                              <p className="text-xs text-slate-600 font-semibold">{manifest.shippedVia}</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-black text-slate-950">{totalQty} Unit</span>
                            <p className="text-xs text-slate-600 font-bold">{manifest.items.length} Baris Item</p>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ${statusStyle}`}>
                              {manifest.status}
                            </span>
                          </td>
                          <td className="py-4 pl-4 pr-6 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedManifest(manifest)}
                              className="h-8 px-3 rounded-lg border-2 border-slate-300 bg-white text-xs font-bold text-slate-900 hover:bg-slate-100 shadow-sm transition-colors cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1 text-slate-700" />
                              Detail
                            </Button>
                          </td>
                        </tr>

                        {/* Collapsible item details */}
                        {isExpanded && (
                          <tr className="bg-slate-100/70">
                            <td colSpan={8} className="py-3.5 px-6 sm:px-12">
                              <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-sm">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2.5">
                                  Daftar Item Barang &amp; Ban Terangkut
                                </h4>
                                <div className="divide-y divide-slate-200 text-xs sm:text-sm">
                                  {manifest.items.map((it) => (
                                    <div key={it.id} className="py-2.5 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs font-bold text-slate-600">{it.no}.</span>
                                        <div>
                                          <p className="font-bold text-slate-950">{it.description}</p>
                                          {it.serialNumber && (
                                            <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5">SN: {it.serialNumber}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-black text-slate-950">{it.qty} Unit</span>
                                        {it.remark && <p className="text-xs text-slate-600 font-semibold">{it.remark}</p>}
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
        <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-900">
              <thead className="bg-slate-200/90 text-xs font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-300">
                <tr>
                  <th className="py-3.5 pl-6 pr-4">No. PO Pelanggan</th>
                  <th className="py-3.5 px-4">Tanggal Order</th>
                  <th className="py-3.5 px-4">Kategori / Tujuan</th>
                  <th className="py-3.5 px-4">Jumlah Item / Qty</th>
                  <th className="py-3.5 px-4">Status Pengiriman</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                {filteredPo.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm font-bold text-slate-700">
                      Tidak ada data Purchase Order yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredPo.map((po) => {
                    const statusStyle = getPoStatusStyle(po.status)

                    return (
                      <tr key={po.id} className="hover:bg-blue-50/60 transition-colors">
                        <td className="py-4 pl-6 pr-4">
                          <p className="font-mono text-xs sm:text-sm font-black text-slate-950">{po.customerPo}</p>
                          {po.invoiceNumber && po.invoiceNumber !== '-' && (
                            <p className="text-xs text-slate-700 font-semibold mt-0.5">Inv: {po.invoiceNumber}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs sm:text-sm text-slate-700 font-bold">
                          {new Date(po.salesDate).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-950">
                            <MapPin className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            <span className="font-bold">{po.tripDestination || 'Site Operasional'}</span>
                          </div>
                          {po.categoryProduct && (
                            <p className="text-xs text-slate-600 font-semibold pl-5">{po.categoryProduct}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-black text-slate-950">{po.totalQty} Unit</span>
                          <p className="text-xs text-slate-600 font-bold">{po.totalItems} Jenis Barang</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ${statusStyle}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4 pr-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPo(po)}
                            className="h-8 px-3 rounded-lg border-2 border-slate-300 bg-white text-xs font-bold text-slate-900 hover:bg-slate-100 shadow-sm transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1 text-slate-700" />
                            Detail
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
        <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-900">
              <thead className="bg-slate-200/90 text-xs font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-300">
                <tr>
                  <th className="py-3.5 pl-6 pr-4">No. DO SAP / Surat Jalan</th>
                  <th className="py-3.5 px-4">Ref. PO Pelanggan</th>
                  <th className="py-3.5 px-4">Jadwal Kirim</th>
                  <th className="py-3.5 px-4">Ekspedisi / Driver</th>
                  <th className="py-3.5 px-4">Status Pengiriman</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                {filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm font-bold text-slate-700">
                      Tidak ada data Surat Jalan / DO yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((del) => {
                    const statusStyle = getDeliveryStatusStyle(del.status)

                    return (
                      <tr key={del.id} className="hover:bg-blue-50/60 transition-colors">
                        <td className="py-4 pl-6 pr-4">
                          <p className="font-mono text-xs sm:text-sm font-black text-slate-950">
                            {del.doSap || del.deliveryNumber}
                          </p>
                          {del.doSap && (
                            <p className="text-xs text-slate-700 font-semibold mt-0.5">Hero: {del.deliveryNumber}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs sm:text-sm font-bold text-slate-950">
                          {del.customerPo}
                        </td>
                        <td className="py-4 px-4 text-xs sm:text-sm text-slate-700 font-bold">
                          {new Date(del.scheduledDate).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-950">
                            {del.vendorName || del.driverName || 'Armada Internal HERO'}
                          </p>
                          {del.vehicleNumber && (
                            <p className="text-xs text-slate-600 font-semibold">{del.vehicleNumber}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ${statusStyle}`}>
                            {del.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4 pr-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDelivery(del)}
                            className="h-8 px-3 rounded-lg border-2 border-slate-300 bg-white text-xs font-bold text-slate-900 hover:bg-slate-100 shadow-sm transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1 text-slate-700" />
                            Detail
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVhs.length === 0 ? (
            <div className="col-span-full rounded-2xl border-2 border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-700 shadow-sm">
              Tidak ada data catatan konsinyasi eVHS yang tersedia.
            </div>
          ) : (
            filteredVhs.map((vhs) => (
              <div
                key={vhs.id}
                className="rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-xs font-black text-slate-950 bg-slate-200 px-2.5 py-0.5 rounded-md border border-slate-300">{vhs.vhsNo}</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-950 border border-emerald-400 px-2.5 py-0.5 text-xs font-black">
                      {vhs.totalQty} Ban Terpasang
                    </span>
                  </div>

                  <h3 className="font-black text-sm text-slate-950 font-display">
                    WO: {vhs.woNo || 'Reguler Maintenance'}
                  </h3>
                  <div className="mt-1.5 text-xs text-slate-700 font-semibold">
                    <span>Gudang Site: </span>
                    <strong className="text-slate-950 font-black">{vhs.warehouseName}</strong>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">{vhs.date}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedVhs(vhs)}
                    className="h-8 px-3 rounded-lg border-2 border-slate-300 bg-white text-xs font-bold text-slate-900 hover:bg-slate-100 shadow-sm transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1 text-slate-700" />
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
        <DialogContent className="max-w-2xl rounded-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-xl">
          {selectedManifest && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-xs font-black text-slate-950 bg-slate-200 px-2.5 py-0.5 rounded-md border border-slate-300">{selectedManifest.manifestNumber}</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ${getManifestStatusStyle(selectedManifest.status)}`}>
                    {selectedManifest.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-950 font-display">
                  Detail Dokumen Cargo Manifest
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3.5 rounded-xl bg-slate-100/90 border-2 border-slate-300 p-4 text-xs sm:text-sm">
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Tanggal Kirim</span>
                  <span className="font-bold text-slate-950">{selectedManifest.date}</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Site / Tujuan Akhir</span>
                  <span className="font-bold text-slate-950">
                    {selectedManifest.siteName || selectedManifest.finalDestination || 'Site'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Moda Transport</span>
                  <span className="font-bold text-slate-950">{selectedManifest.transportVia || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Shipped Via / Ekspedisi</span>
                  <span className="font-bold text-slate-950">{selectedManifest.shippedVia || '-'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 mb-2.5">Rincian Barang Cargo</h4>
                <div className="overflow-x-auto rounded-xl border-2 border-slate-300 bg-white">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-200/90 text-xs font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-300">
                      <tr>
                        <th className="py-2.5 px-3.5">No</th>
                        <th className="py-2.5 px-3.5">Deskripsi Barang / Ban</th>
                        <th className="py-2.5 px-3.5">Serial Number</th>
                        <th className="py-2.5 px-3.5 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                      {selectedManifest.items.map((it) => (
                        <tr key={it.id} className="hover:bg-blue-50/60 transition-colors">
                          <td className="py-3 px-3.5 font-bold text-slate-700">{it.no}</td>
                          <td className="py-3 px-3.5 font-bold text-slate-950">{it.description}</td>
                          <td className="py-3 px-3.5 font-mono text-xs font-bold text-slate-700">{it.serialNumber || '-'}</td>
                          <td className="py-3 px-3.5 text-right font-black text-slate-950">{it.qty} Unit</td>
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
        <DialogContent className="max-w-2xl rounded-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-xl">
          {selectedPo && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-xs font-black text-slate-950 bg-slate-200 px-2.5 py-0.5 rounded-md border border-slate-300">{selectedPo.customerPo}</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ${getPoStatusStyle(selectedPo.status)}`}>
                    {selectedPo.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-950 font-display">
                  Purchase Order Detail
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3.5 rounded-xl bg-slate-100/90 border-2 border-slate-300 p-4 text-xs sm:text-sm">
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Tanggal PO</span>
                  <span className="font-bold text-slate-950">
                    {new Date(selectedPo.salesDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Lokasi / Destinasi</span>
                  <span className="font-bold text-slate-950">{selectedPo.tripDestination || 'Site Operasional'}</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Total Kuantitas</span>
                  <span className="font-black text-slate-950">{selectedPo.totalQty} Unit</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">No. Invoice Terbit</span>
                  <span className="font-mono font-bold text-slate-950">{selectedPo.invoiceNumber}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 mb-2.5">Daftar Barang &amp; Ban</h4>
                <div className="overflow-x-auto rounded-xl border-2 border-slate-300 bg-white">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-200/90 text-xs font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-300">
                      <tr>
                        <th className="py-2.5 px-3.5">Deskripsi Ban / Material</th>
                        <th className="py-2.5 px-3.5">Part Number</th>
                        <th className="py-2.5 px-3.5 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                      {selectedPo.items.map((it) => (
                        <tr key={it.id} className="hover:bg-blue-50/60 transition-colors">
                          <td className="py-3 px-3.5 font-bold text-slate-950">{it.description}</td>
                          <td className="py-3 px-3.5 font-mono text-xs font-bold text-slate-700">{it.partNumber || '-'}</td>
                          <td className="py-3 px-3.5 text-right font-black text-slate-950">{it.quantity} Unit</td>
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
        <DialogContent className="max-w-xl rounded-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-xl">
          {selectedDelivery && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-xs font-black text-slate-950 bg-slate-200 px-2.5 py-0.5 rounded-md border border-slate-300">
                    {selectedDelivery.doSap || selectedDelivery.deliveryNumber}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ${getDeliveryStatusStyle(selectedDelivery.status)}`}>
                    {selectedDelivery.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-950 font-display">
                  Surat Jalan &amp; Tracking DO
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3.5 rounded-xl bg-slate-100/90 border-2 border-slate-300 p-4 text-xs sm:text-sm">
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Ref. PO Pelanggan</span>
                  <span className="font-mono font-bold text-slate-950">{selectedDelivery.customerPo}</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Jadwal Kirim</span>
                  <span className="font-bold text-slate-950">
                    {new Date(selectedDelivery.scheduledDate).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Driver / Ekspedisi</span>
                  <span className="font-bold text-slate-950">
                    {selectedDelivery.vendorName || selectedDelivery.driverName || 'Armada HERO'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Plat Nomor / Resi</span>
                  <span className="font-mono font-bold text-slate-950">
                    {selectedDelivery.vehicleNumber || selectedDelivery.awbNumber || '-'}
                  </span>
                </div>
              </div>

              {selectedDelivery.shippingAddress && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 mb-1.5">Alamat Tujuan Pengiriman</h4>
                  <p className="text-xs sm:text-sm text-slate-900 bg-slate-100 p-3.5 rounded-xl border-2 border-slate-300 font-semibold leading-relaxed">
                    {selectedDelivery.shippingAddress}
                  </p>
                </div>
              )}

              {/* DO Scan Document if available */}
              {selectedDelivery.scanDoDocument && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 mb-2">Scan Dokumen Bukti Terima</h4>
                  <a
                    href={resolveUploadUrl(selectedDelivery.scanDoDocument)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-slate-100 shadow-sm transition-colors"
                  >
                    <FileText className="h-4 w-4 text-amber-600" />
                    <span>Lihat Bukti Surat Jalan (Scan DO)</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-600 ml-1" />
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* VHS Detail Dialog */}
      <Dialog open={Boolean(selectedVhs)} onOpenChange={(open) => !open && setSelectedVhs(null)}>
        <DialogContent className="max-w-xl rounded-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-xl">
          {selectedVhs && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-xs font-black text-slate-950 bg-slate-200 px-2.5 py-0.5 rounded-md border border-slate-300">{selectedVhs.vhsNo}</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-950 border border-emerald-400 px-2.5 py-0.5 text-xs font-black">
                    {selectedVhs.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-950 font-display">
                  Rincian Pemakaian Ban Konsinyasi
                </DialogTitle>
              </DialogHeader>

              <div className="rounded-xl border-2 border-slate-300 bg-white overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-200/90 text-xs font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-300">
                    <tr>
                      <th className="py-2.5 px-3.5">Tipe Ban</th>
                      <th className="py-2.5 px-3.5">Serial Number</th>
                      <th className="py-2.5 px-3.5">Unit / Posisi</th>
                      <th className="py-2.5 px-3.5 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                    {selectedVhs.items.map((it) => (
                      <tr key={it.id} className="hover:bg-blue-50/60 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-slate-950">{it.productName}</td>
                        <td className="py-3 px-3.5 font-mono text-xs font-bold text-slate-700">{it.serialNumber || '-'}</td>
                        <td className="py-3 px-3.5 text-slate-800 font-bold">
                          {it.unitId ? `${it.unitId} (${it.pos || '-'})` : '-'}
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-slate-950">{it.qty} Unit</td>
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
      return 'bg-emerald-100 text-emerald-950 border border-emerald-400'
    case 'sent':
      return 'bg-amber-100 text-amber-950 border border-amber-400'
    default:
      return 'bg-slate-200 text-slate-950 border border-slate-400'
  }
}

function getPoStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'selesai':
      return 'bg-emerald-100 text-emerald-950 border border-emerald-400'
    case 'delivered':
    case 'terkirim':
      return 'bg-sky-100 text-sky-950 border border-sky-400'
    default:
      return 'bg-amber-100 text-amber-950 border border-amber-400'
  }
}

function getDeliveryStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'delivered':
    case 'completed':
      return 'bg-emerald-100 text-emerald-950 border border-emerald-400'
    case 'in_transit':
    case 'scheduled':
    case 'on_delivery':
      return 'bg-amber-100 text-amber-950 border border-amber-400'
    default:
      return 'bg-slate-200 text-slate-950 border border-slate-400'
  }
}
