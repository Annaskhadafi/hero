'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Filter,
  Layers,
  Loader2,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getPendingRequestsAction,
  getAvailableEmployeesForSummaryAction,
  generateSummaryAction,
} from '@/app/dashboard/summary/actions';
import {
  SAFETY_SHOES_COL,
  QTY_ONLY_COLUMNS,
  APD_ITEM_COLUMNS,
  type PendingSummaryRequest,
  type PendingSummaryRequestItem,
  type ManualSummaryEntry,
  type ManualSummaryItem,
} from '@/lib/summary-constants';
import type { SectionWithSummary } from './summary-list';

interface SummaryGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: SectionWithSummary;
  currentEmployeeId?: number;
  onSuccess: (summaryId: number) => void;
}

type AvailableEmployee = {
  id: number;
  name: string;
  employeeSn: string;
  sectionId: number | null;
  sectionName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  siteId: number | null;
  siteName: string | null;
  employmentStatus: string | null;
  safetyShoesSize: string;
};

const COMMON_APD_ITEMS = [
  'Safety Shoes',
  'Safety Boot Petrova',
  'Helmet Kuning',
  'Helmet Putih',
  'Safety Glasses',
  'Safety Goggles',
  'Sarung Tangan Ansel',
  'Kaos Tangan Dotting',
  'Masker',
  'Ear Plug',
  'Padlock Merah',
  'Padlock Kuning',
  'Sisor',
  'Apron',
  'Sunbrim Helmet',
  'Dalaman Helm',
  'Tali Kacamata',
  'Chin Strap',
];

export function SummaryGeneratorModal({
  isOpen,
  onClose,
  section,
  currentEmployeeId = 0,
  onSuccess,
}: SummaryGeneratorModalProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [requests, setRequests] = useState<PendingSummaryRequest[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [remarksMap, setRemarksMap] = useState<Record<number, string>>({});
  const [shoeSizeMap, setShoeSizeMap] = useState<Record<number, string>>({});
  const [globalRemarks, setGlobalRemarks] = useState('');

  // Manual employee entry states
  const [isAddManualOpen, setIsAddManualOpen] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedManualEmp, setSelectedManualEmp] = useState<AvailableEmployee | null>(null);
  const [manualSelectedItems, setManualSelectedItems] = useState<ManualSummaryItem[]>([
    { itemType: 'Safety Shoes', canonicalName: 'Safety Shoes', quantity: 1, requestType: 'baru' },
  ]);
  const [manualShoeSize, setManualShoeSize] = useState('');
  const [manualRemarks, setManualRemarks] = useState('');

  // Fetch pending requests when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setIsAddManualOpen(false);
    setSelectedManualEmp(null);

    getPendingRequestsAction(section.id, section.targetSite)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.requests) {
          setRequests(res.requests);
          // Default: select all
          const allIds = new Set(res.requests.map((r) => r.requestId));
          setSelectedIds(allIds);

          // Initialize maps
          const initRemarks: Record<number, string> = {};
          const initSize: Record<number, string> = {};

          for (const req of res.requests) {
            initRemarks[req.requestId] = req.suggestedRemarks || '';
            initSize[req.requestId] = req.safetyShoesSize || '';
          }

          setRemarksMap(initRemarks);
          setShoeSizeMap(initSize);
        } else {
          toast.error(res.error || 'Gagal memuat daftar pengajuan');
        }
      })
      .catch((err) => {
        if (isMounted) {
          toast.error(err.message || 'Terjadi kesalahan sistem');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, section.id, section.targetSite]);

  // Load available employees when manual form is toggled
  const handleOpenManualForm = async () => {
    setIsAddManualOpen(true);
    if (availableEmployees.length === 0) {
      setLoadingEmployees(true);
      try {
        const res = await getAvailableEmployeesForSummaryAction(section.id);
        if (res.success && res.employees) {
          setAvailableEmployees(res.employees);
        } else {
          toast.error(res.error || 'Gagal memuat data karyawan');
        }
      } catch (err: any) {
        toast.error(err.message || 'Gagal mengambil data karyawan');
      } finally {
        setLoadingEmployees(false);
      }
    }
  };

  const handleSelectEmployee = (emp: AvailableEmployee) => {
    setSelectedManualEmp(emp);
    if (emp.safetyShoesSize) {
      setManualShoeSize(emp.safetyShoesSize);
    }
  };

  const handleToggleItem = (itemType: string) => {
    const existingIndex = manualSelectedItems.findIndex((i) => i.itemType === itemType);
    if (existingIndex >= 0) {
      setManualSelectedItems((prev) => prev.filter((i) => i.itemType !== itemType));
    } else {
      setManualSelectedItems((prev) => [
        ...prev,
        { itemType, canonicalName: itemType, quantity: 1, requestType: 'baru' },
      ]);
    }
  };

  const handleItemQtyChange = (itemType: string, delta: number) => {
    setManualSelectedItems((prev) =>
      prev.map((it) => {
        if (it.itemType === itemType) {
          const nextQty = Math.max(1, it.quantity + delta);
          return { ...it, quantity: nextQty };
        }
        return it;
      })
    );
  };

  const handleItemRequestTypeChange = (itemType: string, requestType: string) => {
    setManualSelectedItems((prev) =>
      prev.map((it) => (it.itemType === itemType ? { ...it, requestType } : it))
    );
  };

  const handleAddManualToTable = () => {
    if (!selectedManualEmp) {
      toast.error('Pilih karyawan terlebih dahulu');
      return;
    }
    if (manualSelectedItems.length === 0) {
      toast.error('Pilih minimal 1 item APD');
      return;
    }

    const tempId = `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const syntheticId = -Date.now(); // negative ID to distinguish from real DB requests

    const hasShoes = manualSelectedItems.some(
      (i) => i.canonicalName === 'Safety Shoes' || i.itemType.toLowerCase().includes('sepatu')
    );

    const syntheticRequest: PendingSummaryRequest = {
      requestId: syntheticId,
      tempId,
      isManual: true,
      requestNumber: `MANUAL-${selectedManualEmp.employeeSn || selectedManualEmp.id}`,
      requestDate: new Date(),
      employeeId: selectedManualEmp.id,
      employeeName: selectedManualEmp.name,
      employeeSn: selectedManualEmp.employeeSn || '-',
      siteId: selectedManualEmp.siteId || 1,
      siteName: selectedManualEmp.siteName || (section.targetSite === 'VALE' ? 'Vale' : 'Site'),
      departmentName: selectedManualEmp.departmentName,
      items: manualSelectedItems.map((item, idx) => ({
        id: idx + 1,
        itemType: item.itemType,
        canonicalName: item.canonicalName,
        requestType: item.requestType,
        quantity: item.quantity,
        notes: item.notes || '',
      })),
      safetyShoesSize: hasShoes ? manualShoeSize : '',
      suggestedRemarks: manualRemarks,
    };

    setRequests((prev) => [syntheticRequest, ...prev]);
    setSelectedIds((prev) => new Set([...prev, syntheticId]));
    setRemarksMap((prev) => ({ ...prev, [syntheticId]: manualRemarks }));
    setShoeSizeMap((prev) => ({ ...prev, [syntheticId]: manualShoeSize }));

    toast.success(`Karyawan ${selectedManualEmp.name} berhasil ditambahkan secara manual`);

    // Reset manual form
    setIsAddManualOpen(false);
    setSelectedManualEmp(null);
    setManualSelectedItems([
      { itemType: 'Safety Shoes', canonicalName: 'Safety Shoes', quantity: 1, requestType: 'baru' },
    ]);
    setManualShoeSize('');
    setManualRemarks('');
    setEmpSearch('');
  };

  const handleRemoveManualRow = (requestId: number) => {
    setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });
    setRemarksMap((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
    setShoeSizeMap((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
    toast.info('Baris manual dihapus');
  };

  // Filtered requests by search
  const filteredRequests = useMemo(() => {
    if (!search.trim()) return requests;
    const lower = search.toLowerCase();
    return requests.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(lower) ||
        r.employeeSn.toLowerCase().includes(lower) ||
        r.requestNumber.toLowerCase().includes(lower) ||
        r.siteName.toLowerCase().includes(lower)
    );
  }, [requests, search]);

  // Filtered available employees for manual addition
  const filteredAvailableEmployees = useMemo(() => {
    if (!empSearch.trim()) return availableEmployees.slice(0, 50);
    const lower = empSearch.toLowerCase();
    return availableEmployees
      .filter(
        (e) =>
          e.name.toLowerCase().includes(lower) ||
          e.employeeSn.toLowerCase().includes(lower) ||
          (e.sectionName && e.sectionName.toLowerCase().includes(lower))
      )
      .slice(0, 50);
  }, [availableEmployees, empSearch]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map((r) => r.requestId)));
    }
  };

  const toggleSelectOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Calculate live item counts for selected requests
  const liveTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    let totalQty = 0;

    for (const req of requests) {
      if (!selectedIds.has(req.requestId)) continue;
      for (const item of req.items) {
        totals[item.canonicalName] = (totals[item.canonicalName] || 0) + item.quantity;
        totalQty += item.quantity;
      }
    }

    return { totals, totalQty };
  }, [requests, selectedIds]);

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.error('Pilih minimal 1 pengajuan untuk dibuat summary');
      return;
    }

    setGenerating(true);
    const toastId = toast.loading('Sedang membuat dokumen summary APD...');

    try {
      const regularSelectedPayload: Array<{
        requestId: number;
        remarks?: string;
        safetyShoesSize?: string;
      }> = [];

      const manualEntriesPayload: ManualSummaryEntry[] = [];

      for (const req of requests) {
        if (!selectedIds.has(req.requestId)) continue;

        const remarks = remarksMap[req.requestId]?.trim() || '';
        const safetyShoesSize = shoeSizeMap[req.requestId]?.trim() || '';

        if (req.isManual) {
          manualEntriesPayload.push({
            tempId: req.tempId || `m-${req.requestId}`,
            employeeId: req.employeeId,
            employeeName: req.employeeName,
            employeeSn: req.employeeSn,
            siteId: req.siteId,
            siteName: req.siteName,
            departmentName: req.departmentName,
            items: req.items.map((it) => ({
              itemType: it.itemType,
              canonicalName: it.canonicalName,
              quantity: it.quantity,
              requestType: it.requestType,
              notes: it.notes,
            })),
            safetyShoesSize,
            remarks,
          });
        } else {
          regularSelectedPayload.push({
            requestId: req.requestId,
            remarks,
            safetyShoesSize,
          });
        }
      }

      const empId = currentEmployeeId || 5;
      const res = await generateSummaryAction(section.id, empId, section.targetSite, {
        selectedRequests: regularSelectedPayload,
        manualEntries: manualEntriesPayload,
        defaultRemarks: globalRemarks,
      });

      if (res.success && 'summaryId' in res && res.summaryId) {
        toast.success(`Summary APD ${res.summaryNumber} berhasil dibuat!`, { id: toastId });
        onSuccess(res.summaryId);
        onClose();
      } else {
        toast.error(res.error || 'Gagal generate summary', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem saat generate summary', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Generate Summary APD
                {section.targetSite === 'VALE' && (
                  <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300">
                    Vale
                  </Badge>
                )}
                {section.targetSite === 'GABUNGAN' && (
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300">
                    Gabungan Site
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Section: <span className="font-semibold text-slate-700 dark:text-slate-200">{section.name}</span> &bull; Pilih pengajuan dan lengkapi kolom Remarks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Action Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama karyawan, SN, atau nomor request..."
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenManualForm}
              className="h-9 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 gap-1.5 shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Tambah Karyawan Manual
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              disabled={loading || filteredRequests.length === 0}
              className="h-9 text-xs"
            >
              {selectedIds.size === filteredRequests.length ? 'Batalkan Semua' : 'Pilih Semua'}
            </Button>
            <Badge variant="secondary" className="h-9 px-3 text-xs font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              {selectedIds.size} / {filteredRequests.length} Terpilih
            </Badge>
          </div>
        </div>

        {/* Modal Body - Request Table & Manual Entry Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Expandable Manual Addition Form */}
          {isAddManualOpen && (
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 shadow-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Tambah Karyawan Manual ke Summary
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Pilih karyawan dan tentukan item APD yang akan langsung dimasukkan ke dokumen draft ini.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddManualOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/50 text-xs">
                {/* 1. Pilih Karyawan */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Pilih Karyawan
                  </label>
                  {loadingEmployees ? (
                    <div className="flex items-center gap-2 text-slate-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Memuat daftar karyawan...</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Input
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        placeholder="Ketik nama atau SN karyawan..."
                        className="h-8 text-xs"
                      />
                      <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-md divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                        {filteredAvailableEmployees.length === 0 ? (
                          <div className="p-2 text-center text-slate-400 text-[11px]">Karyawan tidak ditemukan</div>
                        ) : (
                          filteredAvailableEmployees.map((emp) => {
                            const isChosen = selectedManualEmp?.id === emp.id;
                            return (
                              <div
                                key={emp.id}
                                onClick={() => handleSelectEmployee(emp)}
                                className={`p-2 flex items-center justify-between cursor-pointer transition-colors ${
                                  isChosen
                                    ? 'bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100 font-semibold'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                <div>
                                  <div className="text-xs">{emp.name}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                    {emp.employeeSn} &bull; {emp.sectionName || emp.departmentName || 'Section'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {emp.siteName || 'Site'}
                                  </Badge>
                                  {emp.safetyShoesSize && (
                                    <div className="text-[10px] text-emerald-600 font-medium">
                                      Size {emp.safetyShoesSize}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {selectedManualEmp && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md">
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                        <span>{selectedManualEmp.name}</span>
                        <Badge className="bg-emerald-600 text-[10px]">{selectedManualEmp.siteName || 'Site'}</Badge>
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
                        SN: {selectedManualEmp.employeeSn} &bull; {selectedManualEmp.sectionName || '-'}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Pilih Item APD & Ukuran Sepatu */}
                <div className="space-y-2.5">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                      Pilih Item APD
                    </label>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/40 dark:bg-slate-950/30">
                      {COMMON_APD_ITEMS.map((item) => {
                        const isSelected = manualSelectedItems.some((i) => i.itemType === item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleToggleItem(item)}
                            className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Items Config List */}
                  {manualSelectedItems.length > 0 && (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {manualSelectedItems.map((it) => (
                        <div
                          key={it.itemType}
                          className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                            {it.itemType}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900">
                              <button
                                type="button"
                                onClick={() => handleItemQtyChange(it.itemType, -1)}
                                className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                -
                              </button>
                              <span className="px-2 font-bold text-xs">{it.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleItemQtyChange(it.itemType, 1)}
                                className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                +
                              </button>
                            </div>
                            <select
                              value={it.requestType}
                              onChange={(e) => handleItemRequestTypeChange(it.itemType, e.target.value)}
                              className="h-6 text-[11px] px-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded"
                            >
                              <option value="baru">Baru</option>
                              <option value="pergantian">Pergantian</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleToggleItem(it.itemType)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Shoe Size & Remarks */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-200 block text-[11px] mb-0.5">
                        Ukuran Sepatu (Size)
                      </label>
                      <Input
                        value={manualShoeSize}
                        onChange={(e) => setManualShoeSize(e.target.value)}
                        placeholder="e.g. 41 / 42"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-200 block text-[11px] mb-0.5">
                        Remarks (Keterangan)
                      </label>
                      <Input
                        value={manualRemarks}
                        onChange={(e) => setManualRemarks(e.target.value)}
                        placeholder="e.g. Karyawan Baru"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddManualOpen(false)}
                  className="h-8 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddManualToTable}
                  disabled={!selectedManualEmp || manualSelectedItems.length === 0}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambahkan ke Tabel
                </Button>
              </div>
            </div>
          )}

          {/* Table Area */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Memuat pengajuan approved untuk section ini...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Tidak ada pengajuan yang siap digenerate
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Anda dapat menambahkan karyawan secara manual menggunakan tombol <strong>+ Tambah Karyawan Manual</strong> di atas, atau menunggu pengajuan APD disetujui.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Nama Karyawan & SN</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Site</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Item Barang APD</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Ukuran Sepatu (Size)</th>
                    <th className="py-2.5 px-3 min-w-[220px]">
                      <span className="text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1">
                        Remarks (Keterangan)
                      </span>
                    </th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredRequests.map((req, idx) => {
                    const isSelected = selectedIds.has(req.requestId);
                    const hasShoes = req.items.some(
                      (i) => i.canonicalName === 'Safety Shoes' || i.itemType.toLowerCase().includes('sepatu')
                    );

                    return (
                      <tr
                        key={req.requestId}
                        className={`transition-colors ${
                          isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(req.requestId)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{req.employeeName}</span>
                            {req.isManual && (
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 text-[9px] font-bold px-1.5 py-0">
                                MANUAL
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">{req.employeeSn}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{req.requestNumber}</div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[10px] font-medium bg-slate-50 dark:bg-slate-800">
                            {req.siteName}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {req.items.map((item, iIdx) => (
                              <span
                                key={iIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                              >
                                {item.canonicalName}
                                <span className="font-bold text-blue-600">x{item.quantity}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {hasShoes ? (
                            <Input
                              value={shoeSizeMap[req.requestId] ?? ''}
                              onChange={(e) =>
                                setShoeSizeMap((prev) => ({ ...prev, [req.requestId]: e.target.value }))
                              }
                              placeholder="Size (e.g. 41)"
                              className="h-7 text-xs px-2"
                            />
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            value={remarksMap[req.requestId] ?? ''}
                            onChange={(e) =>
                              setRemarksMap((prev) => ({ ...prev, [req.requestId]: e.target.value }))
                            }
                            placeholder="Tulis keterangan untuk karyawan ini..."
                            className="h-8 text-xs px-2.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-blue-500"
                          />
                        </td>
                        <td className="py-3 px-2 text-center">
                          {req.isManual && (
                            <button
                              type="button"
                              onClick={() => handleRemoveManualRow(req.requestId)}
                              title="Hapus baris manual"
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Live APD Breakdown Card */}
          {selectedIds.size > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  Rekap Total Barang APD yang akan Masuk Summary:
                </span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  Total {liveTotals.totalQty} Item ({selectedIds.size} Karyawan)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(liveTotals.totals).map(([item, qty]) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs"
                  >
                    <span>{item}</span>
                    <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded text-[11px] font-bold">
                      {qty}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="text-xs text-slate-500">
            {selectedIds.size > 0 ? (
              <span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedIds.size}</strong> pengajuan akan digabung ke dalam 1 dokumen summary draft.
              </span>
            ) : (
              <span className="text-amber-600 font-medium">Silakan centang minimal 1 pengajuan.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={generating}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generating || selectedIds.size === 0 || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Membuat Summary...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Summary ({selectedIds.size})
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}