'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  Filter,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
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
import { uploadFile } from '@/app/actions/upload';
import { resolveUploadUrl } from '@/lib/resolve-upload-url';
import { FiveRCameraModal } from '@/components/five-r/five-r-camera-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getPendingRequestsAction,
  getAvailableEmployeesForSummaryAction,
  generateSummaryAction,
} from '@/app/dashboard/summary/actions';
import { getMasterApdListAction } from '@/app/actions/master-apd-actions';
import {
  SAFETY_SHOES_COL,
  QTY_ONLY_COLUMNS,
  APD_ITEM_COLUMNS,
  getDefaultApdSummaryDateRange,
  getPreviousApdSummaryDateRange,
  getCalendarMonthApdSummaryDateRange,
  type PendingSummaryRequest,
  type PendingSummaryRequestItem,
  type ManualSummaryEntry,
  type ManualSummaryItem,
  parsePhotoUrls,
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
  'Sarung Tangan Dotting',
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
  'Face Shield Helmet',
  'Sarung Tangan Kulit (Vale)',
  'Sarung Tangan Kleenguard G40 (Vale)',
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

  // Date Range state for APD summary cut-off
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'active_cutoff' | 'prev_cutoff' | 'calendar_month' | 'all'>('active_cutoff');

  // Camera, Upload & Photo Lightbox States
  const [activeCameraItemType, setActiveCameraItemType] = useState<string | null>(null);
  const [uploadingItemTypes, setUploadingItemTypes] = useState<Set<string>>(new Set());
  const [previewingPhotos, setPreviewingPhotos] = useState<{ title: string; photos: string[] } | null>(null);

  // Manual employee entry states
  const [isAddManualOpen, setIsAddManualOpen] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [apdSearch, setApdSearch] = useState('');
  const [selectedManualEmp, setSelectedManualEmp] = useState<AvailableEmployee | null>(null);
  const [manualSelectedItems, setManualSelectedItems] = useState<ManualSummaryItem[]>([
    { itemType: 'Safety Shoes', canonicalName: 'Safety Shoes', quantity: 1, requestType: 'baru', photoUrls: [], photoUrl: '' },
  ]);
  const [manualShoeSize, setManualShoeSize] = useState('');
  const [manualRemarks, setManualRemarks] = useState('');
  const [masterApdItems, setMasterApdItems] = useState<string[]>(COMMON_APD_ITEMS);

  const loadRequests = (start?: string, end?: string) => {
    setLoading(true);
    getPendingRequestsAction(section.id, section.targetSite, {
      startDate: start || undefined,
      endDate: end || undefined,
    })
      .then((res) => {
        if (res.success && res.requests) {
          setRequests(res.requests);
          const allIds = new Set(res.requests.map((r) => r.requestId));
          setSelectedIds(allIds);

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
        toast.error(err.message || 'Terjadi kesalahan sistem');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Fetch pending requests and master APD items when modal opens
  useEffect(() => {
    if (!isOpen) return;

    getMasterApdListAction('APD', true).then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setMasterApdItems(Array.from(new Set(res.data.map((i) => i.name).filter(Boolean))));
      }
    });

    const defaultRange = getDefaultApdSummaryDateRange();
    setStartDate(defaultRange.startDate);
    setEndDate(defaultRange.endDate);
    setActivePreset('active_cutoff');
    setIsAddManualOpen(false);
    setSelectedManualEmp(null);

    loadRequests(defaultRange.startDate, defaultRange.endDate);
  }, [isOpen, section.id, section.targetSite]);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setActivePreset('all');
    loadRequests(val, endDate);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setActivePreset('all');
    loadRequests(startDate, val);
  };

  const applyPreset = (preset: 'active_cutoff' | 'prev_cutoff' | 'calendar_month' | 'all') => {
    setActivePreset(preset);
    if (preset === 'active_cutoff') {
      const range = getDefaultApdSummaryDateRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      loadRequests(range.startDate, range.endDate);
    } else if (preset === 'prev_cutoff') {
      const range = getPreviousApdSummaryDateRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      loadRequests(range.startDate, range.endDate);
    } else if (preset === 'calendar_month') {
      const range = getCalendarMonthApdSummaryDateRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      loadRequests(range.startDate, range.endDate);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      loadRequests('', '');
    }
  };

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

  // Convert dataURL from camera to File object
  function dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  // Upload photos to S3 and append to manual item
  const uploadAndAppendPhotos = async (itemType: string, files: File[]) => {
    if (!files || files.length === 0) return;
    setUploadingItemTypes((prev) => new Set([...prev, itemType]));
    const toastId = toast.loading(`Mengunggah ${files.length} foto untuk ${itemType}...`);

    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'activity-photos');
        const res = await uploadFile(fd);
        if (res.success && res.url) {
          uploadedUrls.push(res.url);
        } else {
          throw new Error(res.error || 'Gagal mengunggah salah satu foto');
        }
      }

      setManualSelectedItems((prev) =>
        prev.map((it) => {
          if (it.itemType !== itemType) return it;
          const currentUrls = it.photoUrls || [];
          const combined = Array.from(new Set([...currentUrls, ...uploadedUrls]));
          return {
            ...it,
            photoUrls: combined,
            photoUrl: JSON.stringify(combined),
          };
        })
      );
      toast.success(`${uploadedUrls.length} foto berhasil diunggah!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah foto', { id: toastId });
    } finally {
      setUploadingItemTypes((prev) => {
        const next = new Set(prev);
        next.delete(itemType);
        return next;
      });
    }
  };

  const handleCameraCapture = (itemType: string, dataUrl: string) => {
    const file = dataURLtoFile(dataUrl, `apd_manual_${Date.now()}.jpg`);
    uploadAndAppendPhotos(itemType, [file]);
  };

  const handleFileSelect = (itemType: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadAndAppendPhotos(itemType, Array.from(files));
  };

  const handleRemovePhoto = (itemType: string, photoIdx: number) => {
    setManualSelectedItems((prev) =>
      prev.map((it) => {
        if (it.itemType !== itemType) return it;
        const currentUrls = it.photoUrls || [];
        const nextUrls = currentUrls.filter((_, idx) => idx !== photoIdx);
        return {
          ...it,
          photoUrls: nextUrls,
          photoUrl: nextUrls.length > 0 ? JSON.stringify(nextUrls) : '',
        };
      })
    );
  };

  const handleToggleItem = (itemType: string) => {
    const existingIndex = manualSelectedItems.findIndex((i) => i.itemType === itemType);
    if (existingIndex >= 0) {
      setManualSelectedItems((prev) => prev.filter((i) => i.itemType !== itemType));
    } else {
      setManualSelectedItems((prev) => [
        ...prev,
        { itemType, canonicalName: itemType, quantity: 1, requestType: 'baru', photoUrls: [], photoUrl: '' },
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
    if (uploadingItemTypes.size > 0) {
      toast.error('Mohon tunggu hingga seluruh foto selesai diunggah ke server');
      return;
    }

    // Validation: Check photos for replacement and manual request
    const totalPhotos = manualSelectedItems.reduce((acc, it) => acc + (it.photoUrls?.length || 0), 0);
    const missingPergantian = manualSelectedItems.find(
      (it) => it.requestType === 'pergantian' && (!it.photoUrls || it.photoUrls.length === 0)
    );
    if (missingPergantian) {
      toast.error(`Item "${missingPergantian.itemType}" (Pergantian) wajib melampirkan minimal 1 foto bukti fisik barang rusak/lama.`);
      return;
    }
    if (totalPhotos === 0) {
      toast.error('Wajib melampirkan minimal 1 foto bukti fisik APD untuk pengajuan manual');
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
        photoUrl: item.photoUrls && item.photoUrls.length > 0 ? JSON.stringify(item.photoUrls) : (item.photoUrl || ''),
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
      { itemType: 'Safety Shoes', canonicalName: 'Safety Shoes', quantity: 1, requestType: 'baru', photoUrls: [], photoUrl: '' },
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

  // Filtered requests by search and sorted by site then employee name
  const filteredRequests = useMemo(() => {
    let result = requests;
    if (search.trim()) {
      const lower = search.toLowerCase();
      result = requests.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(lower) ||
          r.employeeSn.toLowerCase().includes(lower) ||
          r.requestNumber.toLowerCase().includes(lower) ||
          r.siteName.toLowerCase().includes(lower)
      );
    }
    return [...result].sort((a, b) => {
      const siteCmp = (a.siteName || '').localeCompare(b.siteName || '', 'id-ID', { sensitivity: 'base' });
      if (siteCmp !== 0) return siteCmp;
      return (a.employeeName || '').localeCompare(b.employeeName || '', 'id-ID', { sensitivity: 'base' });
    });
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

  // Filtered APD items for manual addition
  const filteredApdItems = useMemo(() => {
    const rawList = masterApdItems.length > 0 ? masterApdItems : COMMON_APD_ITEMS;
    const itemsList = Array.from(new Set(rawList.filter(Boolean)));
    if (!apdSearch.trim()) return itemsList;
    const lower = apdSearch.toLowerCase();
    return itemsList.filter((item) => item.toLowerCase().includes(lower));
  }, [apdSearch, masterApdItems]);

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
              photoUrl: it.photoUrl || undefined,
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
        periodStart: startDate || null,
        periodEnd: endDate || null,
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

        {/* Date Range & Preset Filter Bar */}
        <div className="px-6 py-2.5 bg-slate-50/90 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Periode Pengajuan:
            </span>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="h-8 text-xs w-36 px-2 bg-white dark:bg-slate-900"
              />
              <span className="text-slate-400 font-medium">s/d</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="h-8 text-xs w-36 px-2 bg-white dark:bg-slate-900"
              />
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Filter tgl request APD karyawan)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('active_cutoff')}
              className={`h-7 px-2.5 text-[11px] rounded-lg transition-colors ${
                activePreset === 'active_cutoff'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tgl 6 s/d 6 Aktif
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('prev_cutoff')}
              className={`h-7 px-2.5 text-[11px] rounded-lg transition-colors ${
                activePreset === 'prev_cutoff'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tgl 6 s/d 6 Lalu
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('calendar_month')}
              className={`h-7 px-2.5 text-[11px] rounded-lg transition-colors ${
                activePreset === 'calendar_month'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Bulan Ini
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyPreset('all')}
              className={`h-7 px-2 text-[11px] rounded-lg transition-colors ${
                activePreset === 'all'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Semua
            </Button>
          </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-200 block text-xs">
                        Pilih Item APD
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {manualSelectedItems.length} item dipilih
                      </span>
                    </div>
                    <div className="relative mb-1.5">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        value={apdSearch}
                        onChange={(e) => setApdSearch(e.target.value)}
                        placeholder="Cari item APD..."
                        className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/40 dark:bg-slate-950/30">
                      {filteredApdItems.length === 0 && !apdSearch.trim() ? (
                        <div className="p-2 text-center text-slate-400 text-[11px] w-full">Tidak ada item APD</div>
                      ) : (
                        filteredApdItems.map((item, idx) => {
                          const isSelected = manualSelectedItems.some((i) => i.itemType === item);
                          return (
                            <button
                              key={`${item}-${idx}`}
                              type="button"
                              onClick={() => handleToggleItem(item)}
                              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}
                              {item}
                            </button>
                          );
                        })
                      )}
                      {apdSearch.trim() && !filteredApdItems.some((i) => i.toLowerCase() === apdSearch.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => {
                            handleToggleItem(apdSearch.trim());
                            setApdSearch('');
                          }}
                          className="px-2 py-1 rounded text-[11px] font-bold border border-dashed border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                        >
                          + Tambah &quot;{apdSearch.trim()}&quot;
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selected Items Config List with Photo Upload */}
                  {manualSelectedItems.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {manualSelectedItems.map((it) => {
                        const isUploading = uploadingItemTypes.has(it.itemType);
                        const photos = it.photoUrls || [];
                        const isPergantian = it.requestType === 'pergantian';

                        return (
                          <div
                            key={it.itemType}
                            className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                {it.itemType}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleItemQtyChange(it.itemType, -1)}
                                    className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 font-bold text-xs">{it.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleItemQtyChange(it.itemType, 1)}
                                    className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                                <select
                                  value={it.requestType}
                                  onChange={(e) => handleItemRequestTypeChange(it.itemType, e.target.value)}
                                  className="h-7 text-xs px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md font-medium"
                                >
                                  <option value="baru">Baru</option>
                                  <option value="pergantian">Pergantian</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleToggleItem(it.itemType)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                  title="Hapus item ini"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Foto Bukti Section for this item */}
                            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                                  Foto Bukti Fisik APD:
                                  {isPergantian ? (
                                    <span className="text-rose-600 font-bold text-[10px] ml-0.5">* Wajib</span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px] font-normal ml-0.5">(Opsional)</span>
                                  )}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  photos.length > 0
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : isPergantian
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {photos.length} Foto Terlampir
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isUploading}
                                  onClick={() => setActiveCameraItemType(it.itemType)}
                                  className="h-7 px-2 text-[11px] gap-1 bg-white hover:bg-slate-50 border-slate-200 shadow-2xs font-semibold text-slate-700 cursor-pointer"
                                >
                                  <Camera className="w-3 h-3 text-blue-600" />
                                  Kamera
                                </Button>
                                <label className="inline-flex items-center justify-center rounded-md text-[11px] font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-7 px-2.5 cursor-pointer gap-1 shadow-2xs">
                                  <ImageIcon className="w-3 h-3 text-slate-600" />
                                  Pilih File / Galeri
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={isUploading}
                                    className="hidden"
                                    onChange={(e) => {
                                      handleFileSelect(it.itemType, e.target.files);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                                {isUploading && (
                                  <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Mengunggah foto...</span>
                                  </div>
                                )}
                              </div>

                              {/* Previews Thumbnails Grid */}
                              {photos.length > 0 && (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
                                  {photos.map((pUrl, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100 shadow-2xs"
                                    >
                                      <img
                                        src={resolveUploadUrl(pUrl)}
                                        alt={`Foto ${pIdx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setPreviewingPhotos({ title: `${it.itemType} (Foto #${pIdx + 1})`, photos: [pUrl] })}
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                                        title="Perbesar foto"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePhoto(it.itemType, pIdx)}
                                        className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white p-0.5 rounded-full shadow transition-colors cursor-pointer"
                                        title="Hapus foto ini"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{req.requestNumber}</span>
                            <span>&bull;</span>
                            <span className="text-slate-600 dark:text-slate-300 font-sans font-medium">
                              {req.requestDate ? new Date(req.requestDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[10px] font-medium bg-slate-50 dark:bg-slate-800">
                            {req.siteName}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {req.items.map((item, iIdx) => {
                              const photos = parsePhotoUrls(item.photoUrl);
                              return (
                                <span
                                  key={iIdx}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                                >
                                  <span>{item.canonicalName}</span>
                                  <span className="font-bold text-blue-600">x{item.quantity}</span>
                                  {photos.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewingPhotos({
                                          title: `${req.employeeName} - ${item.canonicalName}`,
                                          photos,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 px-1 py-0.2 rounded transition-colors cursor-pointer"
                                      title={`${photos.length} Foto Bukti Terlampir (Klik untuk melihat)`}
                                    >
                                      <Camera className="w-2.5 h-2.5" />
                                      <span>{photos.length}</span>
                                    </button>
                                  )}
                                </span>
                              );
                            })}
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
                            maxLength={150}
                            onChange={(e) =>
                              setRemarksMap((prev) => ({ ...prev, [req.requestId]: e.target.value }))
                            }
                            placeholder="Tulis keterangan (maks. 150 karakter)..."
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

      {/* Lightbox Modal for Photo Evidence */}
      <Dialog open={Boolean(previewingPhotos)} onOpenChange={(open) => !open && setPreviewingPhotos(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Foto Bukti Fisik APD: {previewingPhotos?.title}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto p-1">
            {previewingPhotos?.photos.map((photoUrl, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 group">
                <img
                  src={resolveUploadUrl(photoUrl)}
                  alt={`Bukti APD ${idx + 1}`}
                  className="w-full h-56 object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Foto #{idx + 1}
                </div>
                <a
                  href={resolveUploadUrl(photoUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Buka ukuran asli"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Camera Modal */}
      <FiveRCameraModal
        isOpen={Boolean(activeCameraItemType)}
        onClose={() => setActiveCameraItemType(null)}
        onCapture={(dataUrl) => {
          if (activeCameraItemType) {
            handleCameraCapture(activeCameraItemType, dataUrl);
            setActiveCameraItemType(null);
          }
        }}
        title={`Ambil Foto Bukti APD - ${activeCameraItemType || ''}`}
      />
    </div>
  );
}