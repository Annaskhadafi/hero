'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  FileCheck,
  FilePlus,
  Wrench,
  Clock,
  Camera,
  Plus,
  Search,
  Eye,
  Printer,
  RefreshCw,
  FileUp,
  FileSignature,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  getTireRepairJobcardsAction,
  createTireRepairJobcardAction,
  deleteTireRepairJobcardAction,
  type JobcardRecord,
} from '@/app/actions/tire-repair-jobcard-actions';
import { getWaitingWoFromApi, getFormWoList } from '@/app/actions/form-wo';
import { getTireRepairMasterDataAction, getTireRepairInspectionsAction } from '@/app/actions/tire-repair-actions';
import type { WipRepairRecord } from '@/lib/types/wip-repair';
import { TireRepairProcessTimer } from '@/components/mobile/tire-repair-process-timer';
import { TireRepairSearchableSelect } from '@/components/mobile/tire-repair-searchable-select';
import {
  computeMaterialSummary,
  computeTotalJobcardMinutes,
  computeDeduplicatedManpower,
  computeGroupedProcessRows,
  parseDurationToMinutes,
  type MaterialSummaryItem,
} from '@/lib/jobcard-calc';

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

interface JobcardDesktopClientProps {
  initialJobcards: JobcardRecord[];
  waitingWoList: WipRepairRecord[];
  formWoList: any[];
}

export function JobcardDesktopClient({
  initialJobcards,
  waitingWoList: serverWaitingList,
  formWoList: serverFormWoList,
}: JobcardDesktopClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [jobcards, setJobcards] = useState<JobcardRecord[]>(initialJobcards);
  const [waitingWo, setWaitingWo] = useState<WipRepairRecord[]>(serverWaitingList);
  const [formWos, setFormWos] = useState<any[]>(serverFormWoList);
  const [heroInspections, setHeroInspections] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'published' | 'input' | 'waiting' | 'upload'>('published');
  const [isLoading, setIsLoading] = useState(false);

  // Detail Modal state
  const [selectedJobcard, setSelectedJobcard] = useState<JobcardRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New Jobcard Modal state
  const DEFAULT_10_PROCESSES = [
    { processName: 'Skiving', materialUsed: '', qty: '', hours: '', byWhom: '' },
    { processName: 'Buffing', materialUsed: '', qty: '', hours: '', byWhom: '' },
    { processName: 'Dimensi Luka', materialUsed: '', qty: '', hours: '', byWhom: '' },
    { processName: 'Cementing', materialUsed: '', qty: '', hours: '', byWhom: '' },
    { processName: 'Buffing Innerliner', materialUsed: '', qty: '', hours: '', byWhom: '' },
    { processName: 'Install Patch', materialUsed: '', qty: '', hours: '', byWhom: '' },
    { processName: 'Built Up', materialUsed: '', qty: '', hours: '', byWhom: '' },
    { processName: 'Curing', materialUsed: '', qty: '', hours: '', byWhom: '' },
    { processName: 'Finishing', materialUsed: '', qty: '', hours: '', byWhom: '' },
    { processName: 'Painting', materialUsed: '', qty: '', hours: '', byWhom: '' },
  ];

  // New Jobcard Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [newSn, setNewSn] = useState('');
  const [newWo, setNewWo] = useState('');
  const [newCustomer, setNewCustomer] = useState('PT Kaltim Prima Coal');
  const [newSite, setNewSite] = useState('Sangatta KPC');
  const [newSize, setNewSize] = useState('27.00R49');
  const [newBrand, setNewBrand] = useState('MICHELIN');
  const [newPattern, setNewPattern] = useState('E4');
  const [newConstruction, setNewConstruction] = useState('RADIAL');

  const [dimLukaL, setDimLukaL] = useState('');
  const [dimLukaW, setDimLukaW] = useState('');
  const [dimLukaP, setDimLukaP] = useState('');
  const [dimLukaT, setDimLukaT] = useState('');

  const [jobcardProcesses, setJobcardProcesses] = useState(DEFAULT_10_PROCESSES);
  const [signQc, setSignQc] = useState('');
  const [byHeadSection, setByHeadSection] = useState('');

  const [employeeList, setEmployeeList] = useState<string[]>([]);
  const [currentUserEmployeeName, setCurrentUserEmployeeName] = useState<string>('');

  const loadData = () => {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const [jcRes, waitRes, formRes, masterRes, inspRes] = await Promise.all([
          getTireRepairJobcardsAction({ searchSN: searchQuery }),
          getWaitingWoFromApi().catch(() => []),
          getFormWoList().catch(() => []),
          getTireRepairMasterDataAction().catch(() => null),
          getTireRepairInspectionsAction().catch(() => null),
        ]);

        if (jcRes.success && jcRes.data) {
          setJobcards(jcRes.data);
        }
        if (Array.isArray(waitRes)) {
          setWaitingWo(waitRes);
        }
        if (Array.isArray(formRes)) {
          setFormWos(formRes);
        }
        if (inspRes?.success && Array.isArray(inspRes.data)) {
          setHeroInspections(inspRes.data);
        }
        if (masterRes?.success && masterRes?.data) {
          if (masterRes.data.inspectors && masterRes.data.inspectors.length > 0) {
            setEmployeeList(masterRes.data.inspectors);
          }
          if (masterRes.data.userDefaultName) {
            setCurrentUserEmployeeName(masterRes.data.userDefaultName);
          }
        }
      } catch (err) {
        console.error('Failed to load desktop jobcard data:', err);
      } finally {
        setIsLoading(false);
      }
    });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleDeleteJobcard = (id: number, jcNo: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Jobcard "${jcNo}"?`)) return;
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

  const heroKpcWaitingWo = waitingWo.filter((r) => {
    return r.is_hero === true || r.source === 'hero';
  });

  const inspectedSnSet = React.useMemo(() => {
    return new Set(
      heroInspections.map((i) => (i.serialNumber || '').trim().toLowerCase()).filter(Boolean)
    );
  }, [heroInspections]);

  const extractTireItemsFromFormWo = (f: any): any[] => {
    const result: any[] = [];
    const assignedWo = f.noWoTerbit || f.noWoCp || f.noPengajuan || f.idWo || 'WO Active';
    const seenSn = new Set<string>();

    if (f.items) {
      try {
        const parsed = JSON.parse(f.items);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            const sn = (item.description || item.serialNo || item.tire_sn || item.tireSn || f.tireSn || '').trim();
            const snKey = sn.toLowerCase();
            if (sn && !seenSn.has(snKey)) {
              seenSn.add(snKey);
              result.push({
                id: `FORMWO-${f.id}-${item.id || sn}`,
                customer: item.customer || f.customer || 'PT Kaltim Prima Coal',
                site: item.site || f.site || 'Sangatta KPC',
                storeLoc: f.storeLoc || item.refNo || 'Workshop Sangatta',
                tireSn: sn,
                serialNumber: sn,
                size: item.size || f.size || '-',
                brand: item.brand || f.brand || 'MICHELIN',
                pattern: f.pattern || '',
                noWoTerbit: item.noWoCp || assignedWo,
                noPengajuan: f.noPengajuan,
                idWo: assignedWo,
                woNo: item.noWoCp || assignedWo,
                formWoId: f.id,
              });
            }
          }
          if (result.length > 0) return result;
        }
      } catch {}
    }

    const sn = (f.tireSn || f.idWo || '').trim();
    if (sn) {
      result.push({
        id: `FORMWO-${f.id}`,
        customer: f.customer || 'PT Kaltim Prima Coal',
        site: f.site || 'Sangatta KPC',
        storeLoc: f.storeLoc || 'Workshop Sangatta',
        tireSn: sn,
        serialNumber: sn,
        size: f.size || '-',
        brand: f.brand || 'MICHELIN',
        pattern: f.pattern || '',
        noWoTerbit: f.noWoTerbit || f.noWoCp || assignedWo,
        noPengajuan: f.noPengajuan,
        idWo: assignedWo,
        woNo: f.noWoTerbit || f.noWoCp || assignedWo,
        formWoId: f.id,
      });
    }

    return result;
  };

  const issuedJobcardSns = new Set(
    jobcards.map((jc) => (jc.serialNumber || '').trim().toLowerCase()).filter(Boolean)
  );

  const seenSnInFormWo = new Set<string>();
  const inputReadyFormItems = formWos
    .flatMap((f) => extractTireItemsFromFormWo(f))
    .filter((item) => {
      const snLower = (item.serialNumber || item.tireSn || '').trim().toLowerCase();
      if (!snLower || issuedJobcardSns.has(snLower) || !inspectedSnSet.has(snLower)) return false;
      if (seenSnInFormWo.has(snLower)) return false;
      seenSnInFormWo.add(snLower);
      return true;
    });

  const handleOpenNewModal = (item?: any) => {
    const defaultOperator = currentUserEmployeeName || (employeeList.length > 0 ? employeeList[0] : '');
    if (item) {
      setNewSn(item.tireSn || item.serialNumber || '');
      setNewWo(item.noWoTerbit || item.noPengajuan || item.idWo || item.woNo || '');
      setNewCustomer(item.customer || 'PT Kaltim Prima Coal');
      setNewSite(item.site || 'Sangatta KPC');
      setNewSize(item.size || item.tireSize || '27.00R49');
      setNewBrand(item.brand || 'MICHELIN');
      setNewPattern(item.pattern || 'E4');
      setNewConstruction(item.tireConstruction || 'RADIAL');
    } else {
      setNewSn('');
      setNewWo('');
      setNewCustomer('PT Kaltim Prima Coal');
      setNewSite('Sangatta KPC');
      setNewSize('27.00R49');
      setNewBrand('MICHELIN');
      setNewPattern('E4');
      setNewConstruction('RADIAL');
    }
    setDimLukaL('');
    setDimLukaW('');
    setDimLukaP('');
    setDimLukaT('');
    setJobcardProcesses(
      DEFAULT_10_PROCESSES.map((p) => ({ ...p, byWhom: defaultOperator }))
    );
    setSignQc(defaultOperator);
    setByHeadSection('');
    setIsNewModalOpen(true);
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

  const handleProcessChange = (index: number, field: string, value: string) => {
    setJobcardProcesses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCreateJobcardSubmit = async () => {
    if (!newSn.trim()) {
      toast.error('Serial Number wajib diisi');
      return;
    }
    startTransition(async () => {
      const res = await createTireRepairJobcardAction({
        serialNumber: newSn.trim(),
        woNo: newWo.trim() || undefined,
        customerName: newCustomer.trim() || 'PT Kaltim Prima Coal',
        plant: newSite.trim() || 'Workshop Sangatta',
        tireSize: newSize.trim() || '27.00R49',
        brand: newBrand.trim() || 'MICHELIN',
        pattern: newPattern.trim() || 'E4',
        tireConstruction: newConstruction.trim() || 'RADIAL',
        status: 'In Progress',
        signQc: signQc.trim() || undefined,
        byHeadSection: byHeadSection.trim() || undefined,
        injuries: [
          {
            injuryName: 'Injury #1',
            dimensiLukaL: dimLukaL.trim() || undefined,
            dimensiLukaW: dimLukaW.trim() || undefined,
            dimensiLukaP: dimLukaP.trim() || undefined,
            dimensiLukaT: dimLukaT.trim() || undefined,
            processes: jobcardProcesses.map((proc) => ({
              processName: proc.processName,
              materialUsed: proc.materialUsed,
              qty: proc.qty,
              hours: proc.hours,
              byWhom: proc.byWhom,
            })),
          },
        ],
      });

      if (res.success) {
        toast.success(res.message);
        setIsNewModalOpen(false);
        loadData();
      } else {
        toast.error(res.message || 'Gagal menerbitkan Jobcard');
      }
    });
  };

  const filteredJobcards = jobcards.filter((jc) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      jc.serialNumber.toLowerCase().includes(q) ||
      jc.jobcardNo.toLowerCase().includes(q) ||
      (jc.woNo && jc.woNo.toLowerCase().includes(q)) ||
      jc.customerName.toLowerCase().includes(q) ||
      (jc.brand && jc.brand.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Module Quick Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
        <Link
          href="/dashboard/repair-retread/inspection"
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/60"
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Tire Inspection Report</span>
        </Link>

        <Link
          href="/dashboard/repair-retread/jobcard"
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-[#003f78] text-white shadow-xs"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Repair Job Card</span>
        </Link>

        <Link
          href="/dashboard/repair-retread/form-wo"
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/60"
        >
          <FilePlus className="w-3.5 h-3.5" />
          <span>Form WO & WIP</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="bg-[#003f78] text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black font-mono tracking-tight text-white">
              Repair Job Card System
            </h1>
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-mono font-bold">
              F.INPR.REM.003.00
            </Badge>
          </div>
          <p className="text-xs text-white/80 font-medium mt-1">
            Official Document & Form WO Management System — PT CHITRA PARATAMA (KPC Sangatta)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading || isPending}
            className="h-10 px-4 text-xs font-bold text-white border-white/30 bg-white/10 hover:bg-white/20 gap-2 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenNewModal()}
            className="h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Terbitkan Jobcard Baru</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jobcard Terbit</p>
              <h3 className="text-2xl font-black font-mono text-[#082033] mt-1">{jobcards.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Siap Input Jobcard</p>
              <h3 className="text-2xl font-black font-mono text-cyan-700 mt-1">{inputReadyFormItems.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
              <FileSignature className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Waiting WO# KPC</p>
              <h3 className="text-2xl font-black font-mono text-amber-700 mt-1">{heroKpcWaitingWo.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Active</p>
              <h3 className="text-sm font-black text-[#082033] mt-1 truncate">PT Kaltim Prima Coal</h3>
              <p className="text-[11px] text-slate-400">Workshop Sangatta</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tab Controls & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Segmented Tab Buttons */}
          <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('published')}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-tight transition-all flex items-center gap-2 ${
                activeTab === 'published'
                  ? 'bg-[#003f78] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Daftar Jobcard Terbit ({jobcards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('input')}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-tight transition-all flex items-center gap-2 ${
                activeTab === 'input'
                  ? 'bg-[#003f78] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileSignature className="w-4 h-4" />
              <span>Input Form Jobcard ({inputReadyFormItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('waiting')}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-tight transition-all flex items-center gap-2 ${
                activeTab === 'waiting'
                  ? 'bg-[#003f78] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Waiting WO# ({heroKpcWaitingWo.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-tight transition-all flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-[#003f78] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileUp className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SN / Jobcard / WO..."
              className="pl-9 bg-slate-50 text-xs font-mono h-10 rounded-xl border-slate-200"
            />
          </div>
        </div>

        {/* Tab 1: Published Jobcards Table */}
        {activeTab === 'published' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-700">No. Jobcard</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">No. WO</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Serial Number</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Ukuran & Brand</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Customer & Plant</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobcards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-400">
                      Belum ada Jobcard terbit yang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobcards.map((jc) => (
                    <TableRow key={jc.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono font-bold text-xs text-[#003f78]">
                        {jc.jobcardNo}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium text-slate-700">
                        {jc.woNo || '-'}
                      </TableCell>
                      <TableCell className="font-mono font-black text-xs text-[#082033]">
                        {jc.serialNumber}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-mono font-bold text-[#082033] block">{jc.tireSize}</span>
                        <span className="text-[11px] text-slate-500 block">{jc.brand || 'MICHELIN'} ({jc.tireConstruction})</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-bold text-[#082033] block">{jc.customerName}</span>
                        <span className="text-[11px] text-slate-500 block">{jc.plant}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                          {jc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedJobcard(jc);
                              setIsDetailOpen(true);
                            }}
                            className="h-8 px-3 rounded-lg text-xs font-bold text-[#003f78] border-slate-200 hover:bg-slate-100 gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Dokumen</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteJobcard(jc.id, jc.jobcardNo)}
                            className="h-8 px-2.5 rounded-lg text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50 gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Tab 2: Input Form Jobcard Table */}
        {activeTab === 'input' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-700">No. WO Terbit</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Serial Number</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Customer</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Site / Location</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Size & Brand</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inputReadyFormItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-slate-400">
                      Tidak ada Work Order aktif yang siap diinput.
                    </TableCell>
                  </TableRow>
                ) : (
                  inputReadyFormItems.map((f) => (
                    <TableRow key={f.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono font-black text-xs text-[#082033]">
                        {f.noWoTerbit || f.noPengajuan || f.idWo || '-'}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-[#003f78]">
                        {f.tireSn || f.idWo || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-[#082033]">
                        {f.customer || 'PT Kaltim Prima Coal'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {f.site || 'Sangatta KPC'} ({f.storeLoc || 'Workshop Sangatta'})
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        {f.size || '27.00R49'} — {f.brand || 'MICHELIN'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          onClick={() => handleOpenNewModal(f)}
                          className="h-8 px-4 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white gap-1.5 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Input Jobcard</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Tab 3: Waiting WO Table */}
        {activeTab === 'waiting' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-700">W/O Status</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Serial Number</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Customer</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Site</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Size & Brand</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Inspect Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heroKpcWaitingWo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-slate-400">
                      Tidak ada item Waiting WO KPC.
                    </TableCell>
                  </TableRow>
                ) : (
                  heroKpcWaitingWo.map((w, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/80">
                      <TableCell>
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-bold">
                          Waiting WO
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-[#082033]">
                        {w.tire_sn}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-[#082033]">
                        {w.customer}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {w.site} ({w.store_loc})
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        {w.size} — {w.brand}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500">
                        {w.inspect_date || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Tab 4: Upload Document Table */}
        {activeTab === 'upload' && (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <Camera className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-[#082033]">Upload Dokumentasi Foto Jobcard</p>
            <p className="text-[11px] text-slate-500">Pilih item dari list untuk menambahkan foto dokumentasi per area (Serial Number, Sidewall, Tread, Innerliner, Injury).</p>
          </div>
        )}
      </div>

      {/* JOBCARD FULL FORM OFFICIAL DOCUMENT PREVIEW MODAL */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[95vw] max-w-5xl sm:max-w-5xl max-h-[92vh] overflow-y-auto p-6 md:p-8 rounded-2xl bg-white text-slate-900 border-slate-200 shadow-2xl">
          {selectedJobcard && (
            <div id="print-jobcard-doc" className="space-y-4 bg-white text-slate-900 font-sans text-xs p-4">
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
              {/* Action Bar (hidden when printing) */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 no-print">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-[#082033]">Official Dokumen Repair Job Card</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-extrabold">
                    {selectedJobcard.status}
                  </Badge>
                </div>
                <Button
                  type="button"
                  onClick={handlePrintDocument}
                  className="h-9 px-4 rounded-xl bg-[#003f78] hover:bg-[#002d57] text-white font-bold text-xs gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Download Document</span>
                </Button>
              </div>

              {/* Document Header: Repair Jobcard & Logo */}
              <div className="flex items-start justify-between border-b border-slate-400 pb-2">
                <div>
                  <h1 className="text-base font-bold text-slate-900 tracking-tight font-sans">
                    Repair Jobcard : <span className="underline font-black">{selectedJobcard.jobcardNo}</span>
                  </h1>
                </div>
                <div>
                  <img
                    src="/cp_logo-removebg-preview.png"
                    alt="Chitra Paratama"
                    className="h-10 w-auto object-contain"
                  />
                </div>
              </div>

              {/* Metadata 3-Column Grid matching official print layout */}
              <div className="grid grid-cols-3 gap-y-1 gap-x-6 text-xs text-slate-900 py-1.5 font-sans">
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
                    <span className="font-bold flex-1 text-left">
                      : {selectedJobcard.injuries?.map((i) => i.injuryName).filter(Boolean).join(', ') || 'Injury #1'}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-slate-600 font-medium w-28 shrink-0">Dimensi Luka</span>
                    <span className="font-bold flex-1 text-left text-slate-900">
                      : {selectedJobcard.injuries && selectedJobcard.injuries.some((i) => i.dimensiLukaL || i.dimensiLukaW || i.dimensiLukaP || i.dimensiLukaT)
                          ? selectedJobcard.injuries.map((i) => {
                              const parts = [
                                i.dimensiLukaL ? `L: ${i.dimensiLukaL}mm` : null,
                                i.dimensiLukaW ? `W: ${i.dimensiLukaW}mm` : null,
                                i.dimensiLukaP ? `P: ${i.dimensiLukaP}mm` : null,
                                i.dimensiLukaT ? `T: ${i.dimensiLukaT}mm` : null,
                              ].filter(Boolean).join(' × ');
                              return `${i.injuryName || 'Injury'}${parts ? ` (${parts})` : ''}`;
                            }).join('; ')
                          : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-400 my-2" />

              {/* Process Section (Combined Document for All Injuries) */}
              <div className="space-y-2 pt-1 font-sans">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900">Process Breakdown (Gabungan Semua Injury)</h3>
                  <span className="text-[11px] font-bold text-[#003f78]">
                    Manpower: {computeDeduplicatedManpower(selectedJobcard.injuries)}
                  </span>
                </div>

                <div className="overflow-x-auto border-t border-b border-slate-400">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-400 font-bold text-slate-900 bg-slate-50/50 text-[11px]">
                        <th className="py-1.5 px-2 w-28">Injuries</th>
                        <th className="py-1.5 px-2 w-24">Date</th>
                        <th className="py-1.5 px-2 w-32">Process</th>
                        <th className="py-1.5 px-2">Material</th>
                        <th className="py-1.5 px-2 w-16 text-center">Qty</th>
                        <th className="py-1.5 px-2 text-center w-28">Duration (Min)</th>
                        <th className="py-1.5 px-2">Manpower</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-[11px] text-slate-900">
                      {(() => {
                        const rows = computeGroupedProcessRows(selectedJobcard.injuries);
                        if (rows.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="py-4 text-center text-slate-400 font-sans">Tidak ada data proses.</td>
                            </tr>
                          );
                        }

                        return rows.map((r, idx) => (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                            <td className="py-1.5 px-2 font-bold text-slate-900">
                              {r.injuriesLabel}
                            </td>
                            <td className="py-1.5 px-2 text-slate-700">
                              {formatDate(selectedJobcard.receivedDate || selectedJobcard.createdAt)}
                            </td>
                            <td className="py-1.5 px-2 font-bold text-slate-900">{r.processName}</td>
                            <td className="py-1.5 px-2 text-slate-700 uppercase">{r.materialUsed || '-'}</td>
                            <td className="py-1.5 px-2 text-center text-slate-700">{r.qty || '0'}</td>
                            <td className="py-1.5 px-2 text-center font-bold">{r.durationMin}</td>
                            <td className="py-1.5 px-2 text-slate-800">{r.manpower || '-'}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-400 font-bold text-slate-900">
                        <td colSpan={5} className="py-1.5 px-2 text-right">Total Duration :</td>
                        <td className="py-1.5 px-2 text-center font-black text-xs text-[#003f78]">
                          {(computeTotalJobcardMinutes(selectedJobcard.injuries) / 60).toFixed(2)} Hours
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Bottom Section: Material Summary */}
              <div className="pt-2 text-xs font-sans">
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

      {/* CREATE NEW JOBCARD EXPANDED MODAL (F.INPR.REM.003.00) */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="w-[95vw] max-w-7xl sm:max-w-7xl max-h-[92vh] overflow-y-auto p-6 md:p-8 rounded-2xl bg-white border-slate-200 text-slate-900 shadow-2xl space-y-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-[#082033] flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-emerald-600" />
                <span>Terbitkan Repair Job Card Baru (F.INPR.REM.003.00)</span>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold font-mono">
                KPC Sangatta
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Section 1: Header Metadata */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-[#003f78] uppercase font-mono tracking-wider flex items-center gap-1.5">
              <span>1. Header Data Ban & Work Order</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Serial Number (SN): *</label>
                <Input
                  value={newSn}
                  onChange={(e) => setNewSn(e.target.value)}
                  placeholder="e.g. 3243546TEST"
                  className="h-9 rounded-lg font-mono text-xs font-bold bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Work Order No (WO#):</label>
                <Input
                  value={newWo}
                  onChange={(e) => setNewWo(e.target.value)}
                  placeholder="e.g. WO-2026-001"
                  className="h-9 rounded-lg font-mono text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Customer Name:</label>
                <Input
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="h-9 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Plant / Site Location:</label>
                <Input
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  className="h-9 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Ukuran Ban (Tire Size):</label>
                <Input
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  className="h-9 rounded-lg font-mono text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Brand / Merk:</label>
                <Input
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="h-9 rounded-lg font-mono text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Pattern:</label>
                <Input
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  className="h-9 rounded-lg font-mono text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Konstruksi:</label>
                <Input
                  value={newConstruction}
                  onChange={(e) => setNewConstruction(e.target.value)}
                  className="h-9 rounded-lg font-mono text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dimensi Luka (Injury Dimensions) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-[#003f78] uppercase font-mono tracking-wider">
              2. Dimensi Luka (Injury Dimensions #1)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Dimensi Luka L (mm):</label>
                <Input
                  value={dimLukaL}
                  onChange={(e) => setDimLukaL(e.target.value)}
                  placeholder="10"
                  className="h-9 rounded-lg font-mono text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Dimensi Luka W (mm):</label>
                <Input
                  value={dimLukaW}
                  onChange={(e) => setDimLukaW(e.target.value)}
                  placeholder="10"
                  className="h-9 rounded-lg font-mono text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Dimensi Luka P (mm):</label>
                <Input
                  value={dimLukaP}
                  onChange={(e) => setDimLukaP(e.target.value)}
                  placeholder="5"
                  className="h-9 rounded-lg font-mono text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Dimensi Luka T (mm):</label>
                <Input
                  value={dimLukaT}
                  onChange={(e) => setDimLukaT(e.target.value)}
                  placeholder="5"
                  className="h-9 rounded-lg font-mono text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Tahapan & Rincian Proses Repair (10 Process Table) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#003f78] uppercase font-mono tracking-wider">
                3. Tahapan & Material Pekerjaan Repair (10 Langkah Standar)
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                    <th className="p-2.5 border-r border-slate-200 text-center w-10">No</th>
                    <th className="p-2.5 border-r border-slate-200 w-44">Nama Proses</th>
                    <th className="p-2.5 border-r border-slate-200">Material Digunakan</th>
                    <th className="p-2.5 border-r border-slate-200 text-center w-28">Qty / UOM</th>
                    <th className="p-2.5 border-r border-slate-200 text-center w-24">Durasi (Jam)</th>
                    <th className="p-2.5 text-center min-w-[180px]">Manpower</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobcardProcesses.map((proc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-[#082033]">
                        {proc.processName}
                      </td>
                      <td className="p-1.5 border-r border-slate-200">
                        <Input
                          value={proc.materialUsed}
                          onChange={(e) => handleProcessChange(idx, 'materialUsed', e.target.value)}
                          placeholder="Nama material..."
                          className="h-8 text-xs font-mono bg-white rounded-md border-slate-200"
                        />
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-center">
                        <Input
                          value={proc.qty}
                          onChange={(e) => handleProcessChange(idx, 'qty', e.target.value)}
                          placeholder="e.g. 1 PC / 0.5 KG"
                          className="h-8 text-xs font-mono text-center bg-white rounded-md border-slate-200"
                        />
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-center w-36">
                        <TireRepairProcessTimer
                          value={proc.hours}
                          onChange={(val) => handleProcessChange(idx, 'hours', val)}
                          placeholder="0.5 / 30m"
                          processName={proc.processName}
                        />
                      </td>
                      <td className="p-1.5 text-center min-w-[180px]">
                        <TireRepairSearchableSelect
                          value={proc.byWhom || currentUserEmployeeName}
                          onValueChange={(val) => handleProcessChange(idx, 'byWhom', val)}
                          options={employeeList}
                          placeholder="Pilih Manpower..."
                          isMultiSelect={true}
                          triggerClassName="h-8 text-xs font-sans rounded-md bg-white border-slate-200"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Signatures */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-[#003f78] uppercase font-mono tracking-wider">
              4. Otorisasi & Penanggung Jawab
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Nama QC Inspector:</label>
                <TireRepairSearchableSelect
                  value={signQc || currentUserEmployeeName}
                  onValueChange={(val) => setSignQc(val)}
                  options={employeeList}
                  placeholder="Pilih Nama QC Inspector..."
                  triggerClassName="h-9 text-xs font-sans rounded-lg bg-white border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Nama Head Section / Superintendent:</label>
                <TireRepairSearchableSelect
                  value={byHeadSection}
                  onValueChange={(val) => setByHeadSection(val)}
                  options={employeeList}
                  placeholder="Pilih Nama Head Section..."
                  triggerClassName="h-9 text-xs font-sans rounded-lg bg-white border-slate-200"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewModalOpen(false)}
              className="h-10 px-5 rounded-xl text-xs font-bold border-slate-200"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleCreateJobcardSubmit}
              disabled={isPending}
              className="h-10 px-6 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
            >
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
              <span>Terbitkan Repair Job Card</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
