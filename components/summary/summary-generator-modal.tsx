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
  Search,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getPendingRequestsAction,
  generateSummaryAction,
} from '@/app/dashboard/summary/actions';
import type {
  PendingSummaryRequest,
  PendingSummaryRequestItem,
} from '@/lib/summary-constants';
import type { SectionWithSummary } from './summary-list';

interface SummaryGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: SectionWithSummary;
  currentEmployeeId?: number;
  onSuccess: (summaryId: number) => void;
}

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

  // Fetch pending requests when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

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
      const selectedRequestsPayload = Array.from(selectedIds).map((requestId) => ({
        requestId,
        remarks: remarksMap[requestId]?.trim() || '',
        safetyShoesSize: shoeSizeMap[requestId]?.trim() || '',
      }));

      const empId = currentEmployeeId || 5;
      const res = await generateSummaryAction(section.id, empId, section.targetSite, {
        selectedRequests: selectedRequestsPayload,
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

        {/* Filter & Search Bar */}
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

        {/* Modal Body - Request Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                Pastikan sudah ada pengajuan APD karyawan yang telah disetujui (Approved) dan belum masuk ke dokumen summary lain.
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
                    <th className="py-2.5 px-3 min-w-[160px]">Nama Karyawan & SN</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Site</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Item Barang APD</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Ukuran Sepatu (Size)</th>
                    <th className="py-2.5 px-3 min-w-[220px]">
                      <span className="text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1">
                        Remarks (Keterangan)
                      </span>
                    </th>
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
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{req.employeeName}</div>
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