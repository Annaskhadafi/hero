'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Search,
  Plus,
  Building2,
  CheckCircle2,
  MoreHorizontal,
  X,
  Eye,
  Camera,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Pencil,
  Trash2,
  Printer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TireInspectionPrintReport } from '@/components/tire-inspection-print-report';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  getTireRepairInspectionsAction,
  getTireRepairMasterDataAction,
  deleteTireRepairInspectionAction,
  updateTireRepairInspectionAction,
} from '@/app/actions/tire-repair-actions';
import {
  STANDARD_TIRE_SIZES,
  DEFAULT_CUSTOMERS,
  REPAIR_LOCATIONS,
  type TireRepairInspectionRecord,
} from '@/lib/tire-repair-constants';
import { TireInspectionImportDialog } from '@/app/dashboard/repair-retread/inspection/_components/tire-inspection-import-dialog';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

function formatDateShort(dateVal?: string | Date | null): string {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yr = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${yr}`;
}

function formatDateLong(dateVal?: string | Date | null): string {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDurationBadge(durationTag?: string | null) {
  switch (durationTag) {
    case 'R1':
      return {
        bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        cardBorder: 'border-l-4 border-l-emerald-500',
        cardBg: 'hover:border-emerald-400 bg-white dark:bg-slate-900',
        label: 'R1 (Max 4 Hari)',
      };
    case 'R2':
      return {
        bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        cardBorder: 'border-l-4 border-l-amber-500',
        cardBg: 'hover:border-amber-400 bg-white dark:bg-slate-900',
        label: 'R2 (Max 8 Hari)',
      };
    case 'R3':
      return {
        bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        cardBorder: 'border-l-4 border-l-blue-600',
        cardBg: 'hover:border-blue-400 bg-white dark:bg-slate-900',
        label: 'R3 (Max 12 Hari)',
      };
    case 'R4':
      return {
        bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
        cardBorder: 'border-l-4 border-l-purple-600',
        cardBg: 'hover:border-purple-400 bg-white dark:bg-slate-900',
        label: 'R4 (Max 18 Hari)',
      };
    default:
      return {
        bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300',
        cardBorder: 'border-l-4 border-l-slate-400',
        cardBg: 'hover:border-slate-400 bg-white dark:bg-slate-900',
        label: durationTag || 'N/A',
      };
  }
}

function getMobileStatusBadge(statusVal?: string | null) {
  const s = (statusVal || '').toLowerCase();
  if (s.includes('repair') || statusVal === 'A') {
    return (
      <Badge className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 px-2 py-0.5 shadow-2xs">
        REPAIR (A)
      </Badge>
    );
  }
  if (s.includes('retread') || statusVal === 'B') {
    return (
      <Badge className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 shrink-0 px-2 py-0.5 shadow-2xs">
        RETREAD (B)
      </Badge>
    );
  }
  if (s.includes('reject') || s.includes('scrap') || statusVal === 'C') {
    return (
      <Badge className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 shrink-0 px-2 py-0.5 shadow-2xs">
        REJECT (C)
      </Badge>
    );
  }
  return (
    <Badge className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shrink-0 px-2 py-0.5">
      {statusVal || 'REPAIR'}
    </Badge>
  );
}

const DEFAULT_WORKSHOP_LOCATIONS = [
  'Workshop Sangatta',
  'Workshop Balikpapan',
  'Workshop Tanjung',
  'Workshop Berau',
  'Workshop BMB',
  'Workshop BIB',
  'Workshop KIM',
  'Workshop Palu',
  'Workshop Malinau',
  'CP DMP',
  'CP SBS',
  'CP BSI Banyuwangi',
  'CP Sorowako Vale',
  'CP Bengkulu CDE',
  'CP MHU',
];

export default function TireRepairInspectionListPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Filters
  const [searchSN, setSearchSN] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSize, setSelectedSize] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  // Tabs: 'INSPECTED' | 'NOT_INSPECT'
  const [activeTab, setActiveTab] = useState<'INSPECTED' | 'NOT_INSPECT'>('INSPECTED');

  // Data
  const [inspections, setInspections] = useState<TireRepairInspectionRecord[]>([]);
  const [customerOptions, setCustomerOptions] = useState<string[]>(DEFAULT_CUSTOMERS);
  const [locationOptions, setLocationOptions] = useState<string[]>(REPAIR_LOCATIONS);
  const [sizeOptions, setSizeOptions] = useState<string[]>(STANDARD_TIRE_SIZES);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [selectedItem, setSelectedItem] = useState<TireRepairInspectionRecord | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleDeleteItem = (id: number, sn: string) => {
    if (!confirm(`Hapus data inspeksi tire SN "${sn}"?`)) return;
    startTransition(async () => {
      const res = await deleteTireRepairInspectionAction(id);
      if (res?.success) {
        toast.success(`Data inspeksi ${sn} berhasil dihapus`);
        setSelectedItem(null);
        loadData();
      } else {
        toast.error(res?.message || 'Gagal menghapus data inspeksi');
      }
    });
  };

  // Export Excel (KPC Format)
  const handleExportExcel = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (selectedMonth) params.set('month', selectedMonth);
    if (selectedYear) params.set('year', selectedYear);

    const exportUrl = `/api/export/tire-inspection${params.toString() ? `?${params.toString()}` : ''}`;
    const link = document.createElement('a');
    link.href = exportUrl;
    link.download = `Tyre_Inspection_Report_KPC_${selectedMonth || 'ALL'}_${selectedYear || '2026'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 500);
  };

  // Load master data
  useEffect(() => {
    getTireRepairMasterDataAction().then((res) => {
      if (res.success && res.data) {
        if (res.data.customers && res.data.customers.length > 0) {
          setCustomerOptions(res.data.customers);
        }
        if (res.data.locations && res.data.locations.length > 0) {
          setLocationOptions(res.data.locations);
        }
        if (res.data.sizes && res.data.sizes.length > 0) {
          setSizeOptions(res.data.sizes);
        }
      }
    });
  }, []);

  // Fetch Inspections
  const loadData = () => {
    setIsLoading(true);
    startTransition(async () => {
      const res = await getTireRepairInspectionsAction({
        searchSN: searchSN.trim() || undefined,
        customer: selectedCustomer !== 'ALL' ? selectedCustomer : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        tireSize: selectedSize !== 'ALL' ? selectedSize : undefined,
        repairLocation: selectedLocation !== 'ALL' ? selectedLocation : undefined,
        month: selectedMonth ? Number(selectedMonth) : undefined,
        year: selectedYear ? Number(selectedYear) : undefined,
      });

      if (res.success && res.data) {
        setInspections(res.data);
      }
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCustomer,
    selectedStatus,
    selectedSize,
    selectedLocation,
    selectedMonth,
    selectedYear,
  ]);

  // Handle Search Debounce / Trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Filtered Tab Items
  const inspectedList = useMemo(() => {
    return inspections.filter((item) => !!item.dateInspect);
  }, [inspections]);

  const notInspectList = useMemo(() => {
    return inspections.filter((item) => !item.dateInspect);
  }, [inspections]);

  const displayedList = activeTab === 'INSPECTED' ? inspectedList : notInspectList;

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-[1.3rem] p-4 shadow-[0_12px_28px_rgba(8,32,51,0.06)] border border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/mobile/tire-repair')}
            className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[#082033] hover:bg-slate-200 transition-colors active:scale-95 shadow-xs"
          >
            <ChevronLeft className="w-5 h-5 text-[#003f78]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-[#082033] font-mono">
                TIRE INSPECTION REPORT
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-[#486275] font-medium">
              Tire Repair Inspection Report & Physical Monitoring
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          disabled={isLoading || isPending}
          className="text-xs text-[#082033] hover:bg-slate-100 h-9 w-9 p-0 rounded-xl border border-slate-200"
        >
          <RefreshCw className={`w-4 h-4 text-[#003f78] ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filter Section */}
      <section className="bg-white rounded-[1.3rem] p-4 shadow-[0_12px_28px_rgba(8,32,51,0.06)] border border-slate-100 space-y-3">
        {/* Search SN */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-[#003f78] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchSN}
            onChange={(e) => setSearchSN(e.target.value)}
            onBlur={loadData}
            placeholder="Search Serial Number..."
            className="pl-10 pr-8 bg-slate-50 text-[#082033] placeholder:text-slate-400 font-mono text-xs h-10 rounded-xl border-slate-200 focus:border-[#003f78]"
          />
          {searchSN && (
            <button
              type="button"
              onClick={() => {
                setSearchSN('');
                setTimeout(loadData, 0);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Dropdown Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          {/* Customer */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#486275] mb-1 block">
              Customer
            </label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#082033]">
                <SelectValue placeholder="All Customer" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-[#082033]">
                <SelectItem value="ALL">All (Customer)</SelectItem>
                {customerOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#486275] mb-1 block">
              Status
            </label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#003f78]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-[#082033]">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="Repair">Repair</SelectItem>
                <SelectItem value="Retread">Retread</SelectItem>
                <SelectItem value="Reject">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tire Size */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#486275] mb-1 block">
              Size Tire
            </label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#082033] font-mono">
                <SelectValue placeholder="All Size" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-[#082033]">
                <SelectItem value="ALL">All (Select Size)</SelectItem>
                {sizeOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#486275] mb-1 block">
              Repair Location
            </label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#082033]">
                <SelectValue placeholder="All Location" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-[#082033]">
                <SelectItem value="ALL">All (Location)</SelectItem>
                {locationOptions.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#486275] mb-1 block">
              Bulan
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#082033]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-[#082033]">
                {MONTH_NAMES.map((m, idx) => (
                  <SelectItem key={m} value={String(idx + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#486275] mb-1 block">
              Tahun
            </label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#082033] font-mono">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-[#082033]">
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Add Tire Action Button */}
      <div>
        <Link href="/mobile/tire-repair/inspection/new" className="block w-full">
          <Button className="w-full h-12 bg-gradient-to-r from-[#003f78] to-[#0055a5] hover:from-[#003566] hover:to-[#004b87] text-white font-black rounded-xl shadow-lg shadow-[#003f78]/20 active:scale-[0.99] flex items-center justify-center gap-2 text-sm tracking-wide">
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>INPUT INSPEKSI TIRE BARU (ADD TIRE)</span>
          </Button>
        </Link>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="bg-slate-200/70 p-1 rounded-xl grid grid-cols-2 gap-1 text-xs font-black">
        <button
          type="button"
          onClick={() => setActiveTab('NOT_INSPECT')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'NOT_INSPECT'
              ? 'bg-white text-[#082033] shadow-xs'
              : 'text-[#486275] hover:text-[#082033]'
          }`}
        >
          <MoreHorizontal className="w-4 h-4 text-amber-600" />
          <span>Not Inspect ({notInspectList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INSPECTED')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'INSPECTED'
              ? 'bg-[#003f78] text-white shadow-xs'
              : 'text-[#486275] hover:text-[#082033]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Inspected ({inspectedList.length})</span>
        </button>
      </div>

      {/* Main List Body */}
      <main className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#486275] px-1 font-semibold">
          <span>
            Menampilkan <strong className="text-[#082033]">{displayedList.length}</strong> tire ({activeTab === 'INSPECTED' ? 'Inspected' : 'Not Inspect'})
          </span>
          <span className="text-[11px]">
            {MONTH_NAMES[Number(selectedMonth) - 1]} {selectedYear}
          </span>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 bg-white rounded-xl border border-slate-200/70 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayedList.length === 0 && (
          <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Filter className="w-6 h-6 text-[#003f78]" />
            </div>
            <h3 className="text-sm font-bold text-[#082033]">
              Tidak Ada Data Tire
            </h3>
            <p className="text-xs text-[#486275] mt-1 max-w-xs mx-auto">
              Tidak ditemukan tire dengan kombinasi filter yang dipilih. Silakan ubah filter atau tambah tire baru.
            </p>
          </div>
        )}

        {/* Cards */}
        {!isLoading &&
          displayedList.map((item) => {
            const badgeStyle = getDurationBadge(item.repairDuration);
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-4 rounded-[1.25rem] bg-white border border-slate-100 shadow-[0_10px_24px_rgba(8,32,51,0.06)] transition-all active:scale-[0.99] cursor-pointer relative overflow-hidden ${badgeStyle.cardBorder}`}
              >
                {/* Header row: Tire Graphic + Serial Number & Duration */}
                <div className="flex items-start gap-3">
                  {/* Tire Graphic SVG (Black Rubber Tread + Yellow Rim Hub) */}
                  <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-xs">
                    <svg
                      viewBox="0 0 64 64"
                      className="w-7 h-7 fill-none"
                    >
                      {/* Outer Tread Grooves (Black Rubber) */}
                      <circle cx="32" cy="32" r="27" stroke="#64748b" strokeWidth="4" strokeDasharray="4 2" />
                      {/* Sidewall Ring */}
                      <circle cx="32" cy="32" r="18" stroke="#94a3b8" strokeWidth="3" />
                      {/* Center Yellow Wheel Rim Hub */}
                      <circle cx="32" cy="32" r="9.5" fill="#eab308" stroke="#fef08a" strokeWidth="2" />
                      {/* Center Pin / Nut */}
                      <circle cx="32" cy="32" r="3.5" fill="#090d16" />
                      {/* Tread Radial Slits */}
                      <line x1="32" y1="5" x2="32" y2="14" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                      <line x1="32" y1="50" x2="32" y2="59" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                      <line x1="5" y1="32" x2="14" y2="32" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                      <line x1="50" y1="32" x2="59" y2="32" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Main Tire Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-base font-black font-mono tracking-tight text-[#082033] truncate bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                        {item.serialNumber}
                      </h4>
                      {item.repairDuration && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${badgeStyle.bg}`}
                        >
                          {item.repairDuration}
                        </Badge>
                      )}
                    </div>

                    {/* Customer & Site */}
                    <div className="text-xs font-semibold text-[#082033] mt-1.5 pb-1 border-b border-slate-100 flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-[#003f78] shrink-0" />
                      <span>{item.customer || 'PT Kaltim Prima Coal'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[#486275] font-normal">{item.customerSite || 'Sangatta KPC'}</span>
                    </div>

                    {/* Brand / Size & Status */}
                    <div className="text-xs text-[#486275] mt-2 flex items-center justify-between gap-2">
                      <span className="truncate font-semibold font-mono text-[#082033]">
                        {item.tireSize || '27.00R49'} <span className="font-sans font-normal text-slate-500">({item.brand || 'MICHELIN'})</span>
                      </span>
                      {getMobileStatusBadge(item.status)}
                    </div>

                    {/* RTD & Photo Badges */}
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                      {(item.rtd1 || item.rtd2) ? (
                        <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          RTD: {item.rtd1 || '-'} / {item.rtd2 || '-'} mm
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">RTD: -</span>
                      )}

                      {item.photos && item.photos.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-[#082033] px-2 py-0.5 rounded-md border border-slate-200/80">
                          <Camera className="w-3 h-3 text-[#003f78]" />
                          {item.photos.length} Foto
                        </span>
                      )}
                    </div>

                    {/* Dates row */}
                    <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#486275] block text-[9px] uppercase font-semibold">
                          Inspected Date
                        </span>
                        <span className="font-semibold text-[#082033]">
                          {formatDateShort(item.dateInspect)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#486275] block text-[9px] uppercase font-semibold">
                          Estimasi Selesai
                        </span>
                        <span className="font-bold text-emerald-700">
                          {formatDateShort(item.repairCompletedDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </main>


      {/* Detail Dialog Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-5 rounded-2xl">
          {selectedItem && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    {selectedItem.serialNumber}
                  </DialogTitle>
                  {selectedItem.repairDuration && (
                    <Badge className="bg-emerald-500 text-white font-bold">
                      {selectedItem.repairDuration}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {selectedItem.customer} - {selectedItem.customerSite}
                </p>
              </DialogHeader>

              {/* General Specs */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Size & Brand</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedItem.tireSize} / {selectedItem.brand}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Status</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedItem.status}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Type & Pattern</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedItem.typeConstruction || '-'} / {selectedItem.pattern || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Location</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedItem.inspectLocation || '-'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Date Received</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDateLong(selectedItem.dateReceived)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Date Inspect</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDateLong(selectedItem.dateInspect)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Repair Completed</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatDateLong(selectedItem.repairCompletedDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Reported By</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedItem.reportBy || '-'}
                    </p>
                  </div>
                </div>

                {selectedItem.cargoManifestNo && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Cargo Manifest No</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedItem.cargoManifestNo}
                    </p>
                  </div>
                )}

                {(selectedItem.rtd1 || selectedItem.rtd2) && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 text-[10px] block">RTD (mm) Left</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {selectedItem.rtd1 ?? '-'} mm
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">RTD (mm) Right</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {selectedItem.rtd2 ?? '-'} mm
                      </p>
                    </div>
                  </div>
                )}

                {selectedItem.remarks && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Remarks</span>
                    <p className="text-slate-700 dark:text-slate-300 text-xs italic">
                      &quot;{selectedItem.remarks}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Photos Gallery */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  Foto Dokumentasi ({selectedItem.photos?.length || 0})
                </h4>

                {(!selectedItem.photos || selectedItem.photos.length === 0) ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-3 rounded-lg text-center">
                    Tidak ada foto inspeksi yang diunggah.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.photos.map((photo, pIdx) => (
                      <div
                        key={photo.id || pIdx}
                        onClick={() => setPreviewPhotoUrl(photo.photoUrl)}
                        className="group relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 aspect-4/3 cursor-pointer shadow-2xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.photoUrl}
                          alt={photo.photoArea}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5">
                          <span className="text-[10px] font-semibold text-white block truncate">
                            {photo.photoArea}
                          </span>
                        </div>
                        <div className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs font-semibold bg-[#003f78] hover:bg-[#002f5a] text-white gap-1.5"
                  onClick={() => window.print()}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Laporan</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-50"
                  onClick={() => handleDeleteItem(selectedItem.id, selectedItem.serialNumber)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Hapus Inspeksi
                </Button>
              </div>

              {/* Printable Report Component */}
              <TireInspectionPrintReport record={selectedItem} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Photo Preview Modal */}
      <Dialog open={!!previewPhotoUrl} onOpenChange={(open) => !open && setPreviewPhotoUrl(null)}>
        <DialogContent className="max-w-2xl p-2 bg-black/90 border-none">
          {previewPhotoUrl && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewPhotoUrl}
                alt="Full Preview"
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import CSV / Excel Dialog */}
      <TireInspectionImportDialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
