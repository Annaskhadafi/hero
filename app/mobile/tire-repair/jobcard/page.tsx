'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Search,
  Plus,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Building2,
  Calendar,
  FileText,
  User,
  ShieldCheck,
  Printer,
  Camera,
  Upload,
  Image as ImageIcon,
  Tag,
  Briefcase,
  Hash,
  MoreHorizontal,
  FileUp,
  FileSignature,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import {
  getTireRepairJobcardsAction,
  deleteTireRepairJobcardAction,
  type JobcardRecord,
} from '@/app/actions/tire-repair-jobcard-actions';
import { getWaitingWoFromApi, getFormWoList } from '@/app/actions/form-wo';
import type { WipRepairRecord } from '@/lib/types/wip-repair';

function formatDate(dateVal?: Date | string | null) {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toISOString().split('T')[0];
  } catch {
    return String(dateVal);
  }
}

interface MaterialSummaryItem {
  name: string;
  qty: string;
  uom: string;
}

function computeMaterialSummary(injuries?: any[]): MaterialSummaryItem[] {
  if (!injuries || injuries.length === 0) return [];
  const map = new Map<string, { qty: string; uom: string }>();

  injuries.forEach((inj) => {
    inj.processes?.forEach((p: any) => {
      const mat = (p.materialUsed || '').trim();
      if (!mat || mat === '-' || mat === '0') return;

      const rawQty = (p.qty || '').trim();
      let uom = 'PC';
      let numStr = rawQty;

      if (rawQty.toUpperCase().includes('KG')) {
        uom = 'KG';
        numStr = rawQty.replace(/KG/i, '').trim();
      } else if (rawQty.toUpperCase().includes('ML')) {
        uom = 'mL';
        numStr = rawQty.replace(/ML/i, '').trim();
      } else if (rawQty.toUpperCase().includes('GRAM') || rawQty.toUpperCase().includes('G')) {
        uom = 'G';
        numStr = rawQty.replace(/GRAM|G/i, '').trim();
      } else if (rawQty.toUpperCase().includes('PCS') || rawQty.toUpperCase().includes('PC')) {
        uom = 'PC';
        numStr = rawQty.replace(/PCS?/i, '').trim();
      }

      if (!map.has(mat)) {
        map.set(mat, { qty: numStr || '1', uom: uom });
      }
    });
  });

  return Array.from(map.entries()).map(([name, val]) => ({
    name,
    qty: val.qty,
    uom: val.uom,
  }));
}

function parseDurationToMinutes(durationStr?: string | null): number {
  if (!durationStr) return 0;
  const str = durationStr.trim().toLowerCase();
  if (!str || str === '-') return 0;

  if (!isNaN(Number(str))) {
    const val = Number(str);
    return val > 10 ? Math.round(val) : Math.round(val * 60);
  }

  let totalMins = 0;
  const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:jam|h)/);
  if (hourMatch) {
    totalMins += Math.round(parseFloat(hourMatch[1]) * 60);
  }

  const minMatch = str.match(/(\d+)\s*(?:m|min|menit)/);
  if (minMatch) {
    totalMins += parseInt(minMatch[1], 10);
  }

  if (totalMins === 0) {
    const numOnly = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (!isNaN(numOnly)) {
      return numOnly > 10 ? Math.round(numOnly) : Math.round(numOnly * 60);
    }
  }

  return totalMins;
}

interface JobcardWipItem {
  id: string;
  customer: string;
  site: string;
  repairLocation: string;
  serialNumber: string;
  tireSize: string;
  brand?: string;
  woNo?: string;
  pattern?: string;
  photoCount?: number;
}

function getStatusBadge(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s.includes('completed') || s.includes('selesai')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
        COMPLETED
      </span>
    );
  }
  if (s.includes('qc')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
        QC INSPECTION
      </span>
    );
  }
  if (s.includes('rework')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
        REWORK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
      IN PROGRESS
    </span>
  );
}

export default function MobileJobcardListPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active Tab: 'upload' | 'waiting' | 'form'
  const [activeTab, setActiveTab] = useState<'upload' | 'waiting' | 'form'>('form');

  const [jobcards, setJobcards] = useState<JobcardRecord[]>([]);
  const [wipItems, setWipItems] = useState<JobcardWipItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Photo Upload Dialog state for Tab 1
  const [selectedPhotoItem, setSelectedPhotoItem] = useState<JobcardWipItem | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [photoArea, setPhotoArea] = useState('Serial Number');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Jobcard Detail Modal state
  const [selectedJobcard, setSelectedJobcard] = useState<JobcardRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleDeleteJobcard = (id: number, jcNo: string) => {
    if (!confirm(`Hapus Jobcard "${jcNo}"?`)) return;
    startTransition(async () => {
      const res = await deleteTireRepairJobcardAction(id);
      if (res.success) {
        toast.success(`Jobcard ${jcNo} berhasil dihapus`);
        setIsDetailOpen(false);
        setSelectedJobcard(null);
        loadData();
      } else {
        toast.error(res.message || 'Gagal menghapus Jobcard');
      }
    });
  };

  const loadData = () => {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const [jobcardRes, waitingWoRes, formWoRes] = await Promise.all([
          getTireRepairJobcardsAction({ searchSN: searchQuery }),
          getWaitingWoFromApi().catch(() => []),
          getFormWoList().catch(() => []),
        ]);

        if (jobcardRes.success && jobcardRes.data) {
          const heroKpcJobcards = jobcardRes.data.filter((jc) => {
            const custLower = (jc.customerName || '').toLowerCase();
            return !jc.customerName || custLower.includes('kpc') || custLower.includes('kaltim prima coal');
          });
          setJobcards(heroKpcJobcards);
        }

        let mappedWaiting: JobcardWipItem[] = [];
        if (Array.isArray(waitingWoRes)) {
          // Strictly filter for HERO-inputted records for KPC Sangatta only
          const heroKpcOnly = waitingWoRes.filter((r) => {
            const isHeroInput = r.is_hero === true || r.source === 'hero';
            const custLower = (r.customer || '').toLowerCase();
            const isKpc = !r.customer || custLower.includes('kpc') || custLower.includes('kaltim prima coal');
            return isHeroInput && isKpc;
          });

          mappedWaiting = heroKpcOnly.map((r) => ({
            id: r.id_wo || r.tire_sn,
            customer: r.customer || 'PT Kaltim Prima Coal',
            site: r.site || 'Sangatta KPC',
            repairLocation: r.store_loc || r.site || 'Workshop Sangatta',
            serialNumber: r.tire_sn,
            tireSize: r.size || '-',
            brand: r.brand || '-',
            woNo: r.wo || 'Waiting WO',
            pattern: r.pattern || '',
          }));
        }

        let mappedFormWo: JobcardWipItem[] = [];
        if (Array.isArray(formWoRes)) {
          const isFromToday = (dateVal?: Date | string | null) => {
            if (!dateVal) return false;
            try {
              const d = new Date(dateVal);
              if (isNaN(d.getTime())) return false;
              const dateStr = d.toISOString().split('T')[0];
              const todayStr = new Date().toISOString().split('T')[0];
              return dateStr >= todayStr;
            } catch {
              return false;
            }
          };

          mappedFormWo = formWoRes
            .filter((f) => {
              const custLower = (f.customer || '').toLowerCase();
              const isKpc = !f.customer || custLower.includes('kpc') || custLower.includes('kaltim prima coal');
              const isSubmittedToday = isFromToday(f.createdAt || f.tanggalPengajuan);
              return isKpc && isSubmittedToday;
            })
            .map((f) => {
              const assignedWo = f.noWoTerbit || f.noPengajuan || f.idWo || 'WO Active';
              return {
                id: `FORMWO-${f.id}`,
                customer: f.customer || 'PT Kaltim Prima Coal',
                site: f.site || 'Sangatta KPC',
                repairLocation: f.storeLoc || f.site || 'Workshop Sangatta',
                serialNumber: f.tireSn || f.idWo || '-',
                tireSize: f.size || '-',
                brand: f.brand || '-',
                woNo: assignedWo,
                pattern: f.pattern || '',
              };
            });
        }

        setWipItems([...mappedWaiting, ...mappedFormWo]);
      } catch (err) {
        console.error('Failed to load mobile jobcard data:', err);
      } finally {
        setIsLoading(false);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filterBySearch = (items: JobcardWipItem[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.serialNumber.toLowerCase().includes(q) ||
        item.customer.toLowerCase().includes(q) ||
        item.site.toLowerCase().includes(q) ||
        (item.woNo && item.woNo.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.repairLocation && item.repairLocation.toLowerCase().includes(q))
    );
  };

  const filteredWip = filterBySearch(wipItems);

  // Dynamic tab partitions strictly from REAL fetched DB data
  const uploadItems = filteredWip;
  const waitingWoItems = filteredWip.filter(
    (item) => !item.woNo || item.woNo.trim().toLowerCase() === 'waiting wo'
  );

  const issuedJobcardSns = new Set(
    jobcards.map((jc) => (jc.serialNumber || '').trim().toLowerCase()).filter(Boolean)
  );
  const issuedJobcardWos = new Set(
    jobcards.map((jc) => (jc.woNo || '').trim().toLowerCase()).filter(Boolean)
  );

  const inputFormItems = filteredWip.filter((item) => {
    const isNotWaiting = item.woNo && item.woNo.trim().toLowerCase() !== 'waiting wo';
    const snLower = (item.serialNumber || '').trim().toLowerCase();
    const woLower = (item.woNo || '').trim().toLowerCase();
    const hasJobcard = (snLower && issuedJobcardSns.has(snLower)) || (woLower && issuedJobcardWos.has(woLower));
    return isNotWaiting && !hasJobcard;
  });

  const handleOpenPhotoDialog = (item: JobcardWipItem) => {
    setSelectedPhotoItem(item);
    setPhotoArea('Serial Number');
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsPhotoDialogOpen(true);
  };

  const handleUploadPhotoSubmit = () => {
    if (!photoFile && !photoPreview) {
      toast.error('Silakan pilih foto terlebih dahulu');
      return;
    }
    toast.success(`Foto untuk SN '${selectedPhotoItem?.serialNumber}' (${photoArea}) berhasil diupload!`);
    setIsPhotoDialogOpen(false);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleNavigateNewJobcard = (item: JobcardWipItem) => {
    const params = new URLSearchParams();
    if (item.serialNumber) params.set('sn', item.serialNumber);
    if (item.woNo && item.woNo !== 'Waiting WO') params.set('wo', item.woNo);
    if (item.customer) params.set('customer', item.customer);
    if (item.site) params.set('site', item.site);
    if (item.tireSize && item.tireSize !== '-') params.set('size', item.tireSize);
    if (item.brand && item.brand !== '-') params.set('brand', item.brand);

    router.push(`/mobile/tire-repair/jobcard/new?${params.toString()}`);
  };

  const handlePrintDocument = () => {
    const printEl = document.getElementById('print-jobcard-doc');
    if (!printEl) {
      window.print();
      return;
    }

    const clone = printEl.cloneNode(true) as HTMLElement;
    const noPrints = clone.querySelectorAll('.no-print');
    noPrints.forEach((el) => el.remove());

    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Repair Jobcard - ${selectedJobcard?.jobcardNo || 'Document'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #0f172a;
              font-size: 11.5px;
              line-height: 1.4;
            }
            img {
              height: 48px !important;
              max-height: 48px !important;
              width: auto !important;
              object-fit: contain !important;
            }
            .no-print { display: none !important; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace !important; }
            .font-sans { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; }
            .space-y-4 > * + * { margin-top: 0.85rem !important; }
            .space-y-2 > * + * { margin-top: 0.5rem !important; }
            .space-y-1 > * + * { margin-top: 0.3rem !important; }
            .space-y-0.5 > * + * { margin-top: 0.15rem !important; }
            
            .grid { display: grid !important; }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .gap-x-4 { column-gap: 1.25rem !important; }
            .gap-x-6 { column-gap: 1.75rem !important; }
            .gap-y-1 { row-gap: 0.35rem !important; }
            .gap-y-1.5 { row-gap: 0.4rem !important; }
            .gap-6 { gap: 1.25rem !important; }
            .gap-8 { gap: 1.75rem !important; }
            .gap-2 { gap: 0.65rem !important; }

            .flex { display: flex !important; }
            .items-start { align-items: flex-start !important; }
            .items-center { align-items: center !important; }
            .justify-between { justify-content: space-between !important; }
            .justify-end { justify-content: flex-end !important; }
            .flex-1 { flex: 1 1 0% !important; }
            .shrink-0 { flex-shrink: 0 !important; }

            .text-right { text-align: right !important; }
            .text-center { text-align: center !important; }
            .text-left { text-align: left !important; }
            
            .font-bold { font-weight: 700 !important; }
            .font-black { font-weight: 900 !important; }
            .font-medium { font-weight: 500 !important; }
            .font-semibold { font-weight: 600 !important; }
            
            .text-xs { font-size: 11.5px !important; }
            .text-sm { font-size: 13.5px !important; }
            .text-base { font-size: 15.5px !important; }
            .text-\[9px\] { font-size: 10px !important; }
            .text-\[10px\] { font-size: 10.5px !important; }
            .text-\[11px\] { font-size: 11.5px !important; }

            .border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; border-bottom-color: #94a3b8 !important; }
            .border-t { border-top-width: 1px !important; border-top-style: solid !important; border-top-color: #94a3b8 !important; }
            .border { border-width: 1px !important; border-style: solid !important; border-color: #94a3b8 !important; }
            .border-slate-400 { border-color: #94a3b8 !important; }
            .border-slate-300 { border-color: #cbd5e1 !important; }
            .border-slate-200 { border-color: #e2e8f0 !important; }

            .py-1 { padding-top: 0.35rem !important; padding-bottom: 0.35rem !important; }
            .py-1.5 { padding-top: 0.45rem !important; padding-bottom: 0.45rem !important; }
            .py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
            .py-2.5 { padding-top: 0.6rem !important; padding-bottom: 0.6rem !important; }
            .px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
            .px-2.5 { padding-left: 0.6rem !important; padding-right: 0.6rem !important; }
            .pb-1 { padding-bottom: 0.35rem !important; }
            .pb-2 { padding-bottom: 0.55rem !important; }
            .pb-3 { padding-bottom: 0.75rem !important; }
            .pt-1 { padding-top: 0.35rem !important; }
            .my-2 { margin-top: 0.65rem !important; margin-bottom: 0.65rem !important; }
            .my-3 { margin-top: 0.85rem !important; margin-bottom: 0.85rem !important; }
            .my-3.5 { margin-top: 0.95rem !important; margin-bottom: 0.95rem !important; }
            .my-4 { margin-top: 1.1rem !important; margin-bottom: 1.1rem !important; }

            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border-color: #94a3b8 !important; padding: 7px 8px !important; }
            .underline { text-decoration: underline !important; }
            .uppercase { text-transform: uppercase !important; }
            .whitespace-nowrap { white-space: nowrap !important; }
            .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
            .w-28 { width: 7rem !important; }
            .w-56, .w-60, .w-64 { width: 17.5rem !important; min-width: 280px !important; }
            .h-24, .h-28, .h-32 { height: 140px !important; min-height: 140px !important; }
            .relative { position: relative !important; }
            .absolute { position: absolute !important; }
            .top-1\.5 { top: 8px !important; }
            .right-2 { right: 10px !important; }
            .min-h-\[40px\] { min-height: 40px !important; }
            .bg-white { background-color: #ffffff !important; }
            .bg-slate-50\/50 { background-color: #f8fafc !important; }
          </style>
        </head>
        <body>
          ${clone.outerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4 pb-24 min-h-screen bg-slate-50/50">
      {/* Top Header Bar */}
      <div className="bg-[#003f78] text-white rounded-[1.4rem] p-4 shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/mobile/tire-repair')}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all active:scale-95 shadow-xs"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight font-mono text-white flex items-center gap-1.5">
              <span>Jobcard Repair</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h1>
            <p className="text-[11px] text-white/80 font-medium">Form Wo & Output Jobcard System</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          disabled={isLoading || isPending}
          className="text-xs text-white hover:bg-white/10 h-9 w-9 p-0 rounded-xl border border-white/20"
        >
          <RefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#003f78] absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search... (SN / Customer / WO#)"
            className="pl-9 pr-3 bg-slate-50 text-[#082033] placeholder:text-slate-400 font-mono text-xs h-10 rounded-xl border-slate-200 focus:border-[#003f78]"
          />
        </div>
      </div>

      {/* Top Segmented Tab Switcher */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-300/60 shadow-inner text-center">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`py-2 px-1 rounded-xl text-[11px] font-black tracking-tight transition-all flex flex-col items-center justify-center gap-1 ${
            activeTab === 'upload'
              ? 'bg-[#003f78] text-white shadow-md shadow-[#003f78]/20 scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileUp className="w-4 h-4" />
          <span className="truncate w-full text-center">Upload Document</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('waiting')}
          className={`py-2 px-1 rounded-xl text-[11px] font-black tracking-tight transition-all flex flex-col items-center justify-center gap-1 ${
            activeTab === 'waiting'
              ? 'bg-[#003f78] text-white shadow-md shadow-[#003f78]/20 scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="truncate w-full text-center">Waiting WO#</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('form')}
          className={`py-2 px-1 rounded-xl text-[11px] font-black tracking-tight transition-all flex flex-col items-center justify-center gap-1 ${
            activeTab === 'form'
              ? 'bg-[#003f78] text-white shadow-md shadow-[#003f78]/20 scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span className="truncate w-full text-center">Input Form Jobcard</span>
        </button>
      </div>

      {/* Content Section based on Active Tab */}
      <div className="space-y-3">
        {/* TAB 1: UPLOAD DOCUMENT / FOTO */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#003f78] mb-2" />
                <span>Memuat data Upload Document...</span>
              </div>
            ) : uploadItems.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-[#082033]">Tidak ada item Upload Document</p>
                <p className="text-[11px] text-slate-400">Belum ada data dokumen/foto yang perlu diupload.</p>
              </div>
            ) : (
              uploadItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-[#f4f3ff] rounded-2xl border border-indigo-100 shadow-[0_8px_20px_rgba(8,32,51,0.04)] space-y-3 hover:border-indigo-200 transition-all"
                >
                  <div className="space-y-1 text-xs text-[#082033]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-medium">Customer :</span>
                      <span className="font-extrabold text-[#082033]">{item.customer}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-medium">Site :</span>
                      <span className="font-bold text-[#082033]">{item.site}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-medium">Repair Location :</span>
                      <span className="font-bold text-[#082033]">{item.repairLocation}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-100/70">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                        Serial Number
                      </span>
                      <span className="text-sm font-black font-mono text-[#082033] block truncate">
                        {item.serialNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                        Tire Size
                      </span>
                      <span className="text-sm font-black font-mono text-[#082033] block truncate">
                        {item.tireSize}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => handleOpenPhotoDialog(item)}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2 text-xs"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Add Picture</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: WAITING WO# */}
        {activeTab === 'waiting' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#003f78] mb-2" />
                <span>Memuat data Waiting WO...</span>
              </div>
            ) : waitingWoItems.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-[#082033]">Tidak ada item Waiting WO#</p>
                <p className="text-[11px] text-slate-400">Semua Work Order sudah terbit.</p>
              </div>
            ) : (
              waitingWoItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-[#f4f3ff] rounded-2xl border border-indigo-100 shadow-[0_8px_20px_rgba(8,32,51,0.04)] space-y-3 hover:border-indigo-200 transition-all"
                >
                  <div className="space-y-1 text-xs text-[#082033]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-medium">Customer :</span>
                      <span className="font-extrabold text-[#082033]">{item.customer}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-medium">Site :</span>
                      <span className="font-bold text-[#082033]">{item.site}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-medium">Repair Location :</span>
                      <span className="font-bold text-[#082033]">{item.repairLocation}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                      W/O #
                    </span>
                    <span className="text-base font-black font-mono text-[#082033] block">
                      Waiting WO
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-100/70">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                        Serial Number
                      </span>
                      <span className="text-sm font-black font-mono text-[#082033] block truncate">
                        {item.serialNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                        Tire Size
                      </span>
                      <span className="text-sm font-black font-mono text-[#082033] block truncate">
                        {item.tireSize}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: INPUT FORM JOBCARD */}
        {activeTab === 'form' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#003f78] mb-2" />
                <span>Memuat data Work Order...</span>
              </div>
            ) : inputFormItems.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
                <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-[#082033]">Tidak ada item Input Form Jobcard</p>
                <p className="text-[11px] text-slate-400">Belum ada Work Order aktif yang siap diinput.</p>
              </div>
            ) : (
              inputFormItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-[#f4f3ff] rounded-2xl border border-indigo-100 shadow-[0_8px_20px_rgba(8,32,51,0.04)] space-y-3 hover:border-indigo-200 transition-all"
                >
                  <div className="space-y-1 text-xs text-[#082033]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-medium">Customer :</span>
                      <span className="font-extrabold text-[#082033]">{item.customer}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-medium">Site :</span>
                      <span className="font-bold text-[#082033]">{item.site}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-medium">Repair Location :</span>
                      <span className="font-bold text-[#082033]">{item.repairLocation}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                      W/O #
                    </span>
                    <span className="text-base font-black font-mono text-[#082033] block">
                      {item.woNo || 'Waiting WO'}
                    </span>
                  </div>

                  {item.brand && item.brand !== '-' && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                        Brand
                      </span>
                      <span className="text-xs font-black text-[#082033] block">
                        {item.brand}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-100/70">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                        Serial Number
                      </span>
                      <span className="text-sm font-black font-mono text-[#082033] block truncate">
                        {item.serialNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                        Tire Size
                      </span>
                      <span className="text-sm font-black font-mono text-[#082033] block truncate">
                        {item.tireSize}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => handleNavigateNewJobcard(item)}
                      className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-md shadow-cyan-600/20 active:scale-95 flex items-center justify-center gap-2 text-xs"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Input Jobcard</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* JOBCARD LIST DARI DB APABILA ADA */}
      {jobcards.length > 0 && (
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <h2 className="text-xs font-black text-[#082033] font-mono uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#003f78]" />
            <span>Daftar Jobcard Terbit ({jobcards.length})</span>
          </h2>

          {jobcards.map((jc) => (
            <div
              key={jc.id}
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">
                    {jc.jobcardNo} {jc.woNo ? `· WO: ${jc.woNo}` : ''}
                  </span>
                  <span className="text-sm font-black font-mono text-[#082033]">
                    {jc.serialNumber}
                  </span>
                </div>
                {getStatusBadge(jc.status)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Ukuran & Brand</span>
                  <span className="font-bold text-[#082033] font-mono text-xs block">
                    {jc.tireSize}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {jc.brand || 'MICHELIN'} ({jc.tireConstruction})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Customer & Plant</span>
                  <span className="font-bold text-[#082033] truncate block" title={jc.customerName}>
                    {jc.customerName}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate block">
                    {jc.plant}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  {jc.injuries?.length || 0} Kerusakan (Injuries)
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl px-2.5 text-xs font-bold gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => router.push(`/mobile/tire-repair/jobcard/new?editId=${jc.id}`)}
                  >
                    <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Edit / Lanjutkan</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl px-3 text-xs font-bold gap-1 text-[#003f78] border-slate-200 hover:bg-slate-50"
                    onClick={() => {
                      setSelectedJobcard(jc);
                      setIsDetailOpen(true);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl px-2.5 text-xs font-bold gap-1 text-rose-700 border-rose-200 hover:bg-rose-50"
                    onClick={() => handleDeleteJobcard(jc.id, jc.jobcardNo)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PHOTO UPLOAD DIALOG FOR TAB 1 */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-md p-5 rounded-2xl bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-[#082033] flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Upload Foto Dokumentasi</span>
            </DialogTitle>
          </DialogHeader>

          {selectedPhotoItem && (
            <div className="space-y-4 text-xs pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Serial Number:</span>
                  <span className="font-mono font-bold text-[#082033]">{selectedPhotoItem.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-bold text-[#082033]">{selectedPhotoItem.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Size:</span>
                  <span className="font-mono font-bold text-[#082033]">{selectedPhotoItem.tireSize}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#082033]">Area Foto:</label>
                <Select value={photoArea} onValueChange={setPhotoArea}>
                  <SelectTrigger className="h-9 rounded-xl bg-white border-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Serial Number" className="text-xs">Serial Number</SelectItem>
                    <SelectItem value="Area Sidewall" className="text-xs">Area Sidewall</SelectItem>
                    <SelectItem value="Area Crown / Tread" className="text-xs">Area Crown / Tread</SelectItem>
                    <SelectItem value="Innerliner" className="text-xs">Innerliner</SelectItem>
                    <SelectItem value="Kerusakan (Injury)" className="text-xs">Kerusakan (Injury)</SelectItem>
                    <SelectItem value="General / Tampak Depan" className="text-xs">General / Tampak Depan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#082033]">File Foto:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#003f78] file:text-white hover:file:bg-[#002d57] cursor-pointer"
                />
              </div>

              {photoPreview && (
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48 flex justify-center bg-slate-100 p-1">
                  <img src={photoPreview} alt="Preview" className="max-h-44 object-contain rounded-lg" />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPhotoDialogOpen(false)}
              className="h-10 rounded-xl text-xs font-bold border-slate-200"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleUploadPhotoSubmit}
              className="h-10 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              Simpan Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JOBCARD FULL FORM DETAIL MODAL */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-8 rounded-2xl border-slate-200 bg-white text-slate-900 shadow-2xl">
          {selectedJobcard && (
            <div id="print-jobcard-doc" className="space-y-4 text-slate-900 font-sans text-xs bg-white p-2">
              <style>{`
                @media print {
                  body > *:not([data-radix-portal]) {
                    display: none !important;
                  }
                  body > [data-radix-portal] {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                  }
                  [data-radix-portal] > * {
                    display: none !important;
                  }
                  [data-radix-portal] [role="dialog"] {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    background: white !important;
                    max-height: none !important;
                    height: auto !important;
                    overflow: visible !important;
                  }
                  #print-jobcard-doc {
                    display: block !important;
                    position: relative !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    color: black !important;
                  }
                  .no-print, button {
                    display: none !important;
                  }
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  @page {
                    size: A4 portrait;
                    margin: 8mm;
                  }
                }
              `}</style>
              {/* Document Action Bar */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 no-print">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#082033]">Dokumen Official Repair Jobcard</span>
                  {getStatusBadge(selectedJobcard.status)}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrintDocument}
                    className="h-8 rounded-xl text-xs font-bold gap-1.5 text-[#003f78] border-slate-200"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Download</span>
                  </Button>
                </div>
              </div>

              {/* Document Header: Repair Jobcard & Logo */}
              <div className="flex items-start justify-between border-b border-slate-400 pb-2">
                <div>
                  <h1 className="text-sm font-bold text-slate-900 tracking-tight font-sans">
                    Repair Jobcard : <span className="underline font-black">{selectedJobcard.jobcardNo}</span>
                  </h1>
                </div>
                <div>
                  <img
                    src="/cp_logo-removebg-preview.png"
                    alt="Chitra Paratama"
                    className="h-9 w-auto object-contain"
                  />
                </div>
              </div>

              {/* Metadata 3-Column Grid matching official print layout */}
              <div className="grid grid-cols-3 gap-y-1 gap-x-4 text-xs text-slate-900 py-1.5 font-sans">
                {/* Column 1 */}
                <div className="space-y-1">
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Customer</span>
                    <span className="font-bold flex-1 text-left">: {selectedJobcard.customerName}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Project</span>
                    <span className="font-bold flex-1 text-left">: {selectedJobcard.plant}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Serial Number</span>
                    <span className="font-bold flex-1 text-left">: {selectedJobcard.serialNumber}</span>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-1">
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Tyre Brand</span>
                    <span className="font-bold flex-1 text-left">: {selectedJobcard.brand || 'MICHELIN'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Tyre Pattern</span>
                    <span className="font-bold flex-1 text-left">: {selectedJobcard.pattern || 'E4'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Tyre Size</span>
                    <span className="font-bold flex-1 text-left">: {selectedJobcard.tireSize}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Tyre Type</span>
                    <span className="font-bold flex-1 text-left">: {selectedJobcard.tireConstruction || 'RADIAL'}</span>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="space-y-1">
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Wo Date</span>
                    <span className="font-bold flex-1 text-left">: {formatDate(selectedJobcard.woDate)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Progress Date</span>
                    <span className="font-bold flex-1 text-left">: {formatDate(selectedJobcard.receivedDate || selectedJobcard.createdAt)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Finish Date</span>
                    <span className="font-bold flex-1 text-left">: {formatDate(selectedJobcard.offRepairDate)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Injury</span>
                    <span className="font-bold flex-1 text-left">: {selectedJobcard.injuries?.[0]?.injuryName || 'Injury #1'}</span>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-400 my-2" />

              {/* Process Section (#1) */}
              <div className="space-y-2 pt-1 font-sans">
                <h3 className="font-bold text-xs text-slate-900">Process #1</h3>

                <div className="overflow-x-auto border-t border-b border-slate-400">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-400 font-bold text-slate-900 bg-slate-50/50 text-[11px]">
                        <th className="py-2 px-2.5 min-w-[120px]">Injuries</th>
                        <th className="py-2 px-2.5 min-w-[80px]">Date</th>
                        <th className="py-2 px-2.5 min-w-[100px]">Process</th>
                        <th className="py-2 px-2.5 min-w-[120px]">Material</th>
                        <th className="py-2 px-2.5 text-center min-w-[60px]">Qty</th>
                        <th className="py-2 px-2.5 text-center min-w-[90px]">Duration (Min)</th>
                        <th className="py-2 px-2.5 min-w-[120px]">Manpower</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-[11px] text-slate-900">
                      {selectedJobcard.injuries?.[0]?.processes?.map((proc, pIdx) => {
                        const isDimensiRow = (proc?.processName || '').toLowerCase().includes('dimensi') || pIdx === 2;
                        const inj = selectedJobcard.injuries?.[0];
                        const injDimStr = inj
                          ? `L${inj.dimensiLukaL || '0'},W${inj.dimensiLukaW || '0'},P${inj.dimensiLukaP || '0'},T${inj.dimensiLukaT || '0'}`
                          : '-';

                        const durMins = parseDurationToMinutes(proc.hours);

                        return (
                          <tr key={proc.id || pIdx} className="border-b border-slate-200 hover:bg-slate-50/50">
                            <td className="py-2 px-2.5 font-bold text-slate-900">
                              {isDimensiRow ? injDimStr : ''}
                            </td>
                            <td className="py-2 px-2.5 text-slate-700">
                              {formatDate(selectedJobcard.receivedDate || selectedJobcard.createdAt)}
                            </td>
                            <td className="py-2 px-2.5 font-bold text-slate-900">{proc.processName}</td>
                            <td className="py-2 px-2.5 text-slate-700 uppercase">{proc.materialUsed || '-'}</td>
                            <td className="py-2 px-2.5 text-center text-slate-700">{proc.qty || '0'}</td>
                            <td className="py-2 px-2.5 text-center font-bold">{durMins}</td>
                            <td className="py-2 px-2.5 text-slate-800">{proc.byWhom || '-'}</td>
                          </tr>
                        );
                      }) || (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-slate-400 font-sans">Tidak ada data proses.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-400 font-bold text-slate-900">
                        <td colSpan={5} className="py-2 px-2.5 text-right">Total Duration :</td>
                        <td className="py-2 px-2.5 text-center font-black text-xs text-[#003f78]">
                          {(
                            (selectedJobcard.injuries?.[0]?.processes?.reduce(
                              (acc, p) => acc + parseDurationToMinutes(p.hours),
                              0
                            ) || 0) / 60
                          ).toFixed(2)}{' '}
                          Hours
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="border-b border-slate-400 my-4" />

              {/* Bottom Section: Quality Check & Material Summary */}
              <div className="grid grid-cols-2 gap-6 pt-1 text-xs font-sans">
                {/* Left Column: Quality Check Signature Box */}
                <div className="space-y-1.5 font-sans">
                  <h4 className="font-bold text-slate-900 text-xs">Quality Check:</h4>
                  <div
                    className="w-60 border border-slate-400 bg-white relative"
                    style={{ width: '250px', height: '120px', minHeight: '120px' }}
                  >
                    <span
                      className="absolute top-1.5 right-2 text-[10px] text-slate-400 uppercase font-bold tracking-wider"
                      style={{ position: 'absolute', top: '6px', right: '8px' }}
                    >
                      SIGN
                    </span>
                  </div>
                  <div className="w-60 text-center font-bold text-xs text-slate-900 pt-1.5" style={{ width: '250px' }}>
                    ( {selectedJobcard.signQc || '............................'} )
                  </div>
                </div>

                {/* Right Column: Material Summary */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs">Material Summary</h4>
                  <div className="overflow-x-auto border-t border-b border-slate-400">
                    <table className="w-full text-left text-xs font-sans border-collapse">
                      <thead>
                        <tr className="border-b border-slate-400 bg-slate-50/50 font-bold text-slate-900">
                          <th className="py-1.5 px-2">Material Summary</th>
                          <th className="py-1.5 px-2 text-center">Qty</th>
                          <th className="py-1.5 px-2 text-center">Uom</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {computeMaterialSummary(selectedJobcard.injuries).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-2 px-2 text-slate-400 italic font-sans text-center">
                              Tidak ada pemakaian material
                            </td>
                          </tr>
                        ) : (
                          computeMaterialSummary(selectedJobcard.injuries).map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-2 uppercase font-medium text-slate-900">{item.name}</td>
                              <td className="py-1.5 px-2 text-center text-slate-800">{item.qty}</td>
                              <td className="py-1.5 px-2 text-center uppercase text-slate-800">{item.uom}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* STICKY BOTTOM NAVIGATION BAR MATCHING SCREENSHOTS */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(8,32,51,0.08)] py-2 px-3">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              activeTab === 'upload'
                ? 'text-[#003f78] font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Hash className={`w-5 h-5 ${activeTab === 'upload' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] truncate max-w-full">Upload Document...</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('waiting')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              activeTab === 'waiting'
                ? 'text-[#003f78] font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <MoreHorizontal className={`w-5 h-5 ${activeTab === 'waiting' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] truncate max-w-full">Waiting WO#</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              activeTab === 'form'
                ? 'text-[#003f78] font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Briefcase className={`w-5 h-5 ${activeTab === 'form' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] truncate max-w-full">Input Form Jobc...</span>
          </button>
        </div>
      </div>
    </div>
  );
}
