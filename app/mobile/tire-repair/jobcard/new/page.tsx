'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  Wrench,
  Building2,
  Calendar,
  AlertTriangle,
  User,
  Clock,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toaster, toast } from 'sonner';
import {
  createTireRepairJobcardAction,
  updateTireRepairJobcardAction,
  getTireRepairJobcardByIdAction,
  getTireRepairJobcardsAction,
  getJobcardQcDefaultApproverAction,
} from '@/app/actions/tire-repair-jobcard-actions';
import {
  getTireRepairInspectionsAction,
  getTireRepairMasterDataAction,
} from '@/app/actions/tire-repair-actions';
import { TireRepairSearchableSelect } from '@/components/mobile/tire-repair-searchable-select';
import { TireRepairProcessTimer } from '@/components/mobile/tire-repair-process-timer';
import {
  STANDARD_TIRE_SIZES,
  STANDARD_TIRE_BRANDS,
  DEFAULT_CUSTOMERS,
  DEFAULT_CUSTOMER_SITES,
  DEFAULT_CHITRA_INSPECTORS,
  type TireRepairInspectionRecord,
} from '@/lib/tire-repair-constants';
import { parseInjuryRemarks } from '@/lib/jobcard-calc';

const DEFAULT_JOB_CARD_PROCESS_NAMES = [
  'Skiving',
  'Buffing',
  'Cementing',
  'Buffing Innerliner',
  'Install Patch',
  'Built Up',
  'Curing',
  'Finishing',
  'Painting',
] as const;

const STANDARD_PROCESSES = DEFAULT_JOB_CARD_PROCESS_NAMES;

interface ProcessItem {
  processName: string;
  materialUsed: string;
  qty: string;
  hours: string;
  byWhom: string;
  hardness: string;
}

interface InjuryItem {
  id: string;
  injuryCategory: 'Minor' | 'Major';
  injuryNumber: number;
  injuryName: string;
  injuryDate: string;
  dimensiLukaL: string;
  dimensiLukaW: string;
  dimensiLukaP: string;
  dimensiLukaT: string;
  processes: ProcessItem[];
}

export default function NewJobcardPage() {
  const router = useRouter();

  // Mode: 'FROM_INSPECTION' | 'STANDALONE'
  const [creationMode, setCreationMode] = useState<'FROM_INSPECTION' | 'STANDALONE'>('FROM_INSPECTION');

  // Existing Inspections for lookup
  const [inspections, setInspections] = useState<TireRepairInspectionRecord[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>('');

  // Options & Master data
  const [technicians, setTechnicians] = useState<string[]>(DEFAULT_CHITRA_INSPECTORS);
  const [customerOptions, setCustomerOptions] = useState<string[]>(DEFAULT_CUSTOMERS);
  const [sizeOptions, setSizeOptions] = useState<string[]>(STANDARD_TIRE_SIZES);
  const [brands, setBrands] = useState<string[]>(STANDARD_TIRE_BRANDS);

  // Form Fields (F.INPR.REM.003.00)
  const [woNo, setWoNo] = useState('');
  const [woDate, setWoDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [plant, setPlant] = useState('Workshop Sangatta');
  const [customerName, setCustomerName] = useState('PT Kaltim Prima Coal');
  const [customerId, setCustomerId] = useState('KPC');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [serialNumber, setSerialNumber] = useState('');
  const [tireSize, setTireSize] = useState('27.00R49');
  const [brand, setBrand] = useState('MICHELIN');
  const [pattern, setPattern] = useState('E4');
  const [tireConstruction, setTireConstruction] = useState('RADIAL');

  const [signQc, setSignQc] = useState('');
  const [byHeadSection, setByHeadSection] = useState('');

  // Editing existing jobcard
  const [editingJobcardId, setEditingJobcardId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const editIdParam = params.get('editId') || params.get('id');
      const snParam = params.get('sn') || params.get('serialNumber');
      const woParam = params.get('wo') || params.get('woNo');
      const custParam = params.get('customer') || params.get('customerName');
      const siteParam = params.get('site') || params.get('plant');
      const sizeParam = params.get('size') || params.get('tireSize');
      const brandParam = params.get('brand');

      if (editIdParam && !isNaN(Number(editIdParam))) {
        const targetId = Number(editIdParam);
        setEditingJobcardId(targetId);
        getTireRepairJobcardByIdAction(targetId).then((res) => {
          if (res.success && res.data) {
            const jc = res.data;
            const statusLower = (jc.status || '').toLowerCase();
            if (statusLower.includes('completed') || statusLower.includes('selesai')) {
              toast.error('Jobcard ini sudah selesai (COMPLETED) dan tidak dapat diedit lagi.');
              router.push('/mobile/tire-repair/jobcard');
              return;
            }
            if (jc.woNo) setWoNo(jc.woNo);
            if (jc.woDate) setWoDate(new Date(jc.woDate).toISOString().split('T')[0]);
            if (jc.plant) setPlant(jc.plant);
            if (jc.customerName) setCustomerName(jc.customerName);
            if (jc.serialNumber) setSerialNumber(jc.serialNumber);
            if (jc.tireSize) setTireSize(jc.tireSize);
            if (jc.brand) setBrand(jc.brand);
            if (jc.pattern) setPattern(jc.pattern);
            if (jc.tireConstruction) setTireConstruction(jc.tireConstruction);
            if (jc.signQc) setSignQc(jc.signQc);
            if (jc.byHeadSection) setByHeadSection(jc.byHeadSection);

            if (jc.injuries && jc.injuries.length > 0) {
              const loadedInjuries: InjuryItem[] = jc.injuries.map((inj: any, idx: number) => ({
                id: `inj_${inj.id || idx + 1}_${Date.now()}`,
                injuryCategory: (inj.injuryName && inj.injuryName.includes('Major')) ? 'Major' : 'Minor',
                injuryNumber: idx + 1,
                injuryName: inj.injuryName || `Minor #${idx + 1}`,
                injuryDate: inj.injuryDate ? new Date(inj.injuryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                dimensiLukaL: inj.dimensiLukaL || '',
                dimensiLukaW: inj.dimensiLukaW || '',
                dimensiLukaP: inj.dimensiLukaP || '',
                dimensiLukaT: inj.dimensiLukaT || '',
                processes: DEFAULT_JOB_CARD_PROCESS_NAMES.map((name) => {
                  const foundProc = (inj.processes || []).find(
                    (p: any) => (p.processName || '').trim().toLowerCase() === name.trim().toLowerCase()
                  );
                  return {
                    processName: name,
                    materialUsed: foundProc?.materialUsed || '',
                    qty: foundProc?.qty || '',
                    hours: foundProc?.hours || '',
                    byWhom: foundProc?.byWhom || '',
                    hardness: foundProc?.hardness || '',
                  };
                }),
              }));
              setInjuries(loadedInjuries);
            }
          }
        });
      } else {
        if (snParam) setSerialNumber(snParam);
        if (woParam && woParam !== 'Waiting WO') setWoNo(woParam);
        if (custParam) setCustomerName(custParam);
        if (siteParam) setPlant(siteParam.startsWith('Workshop') || siteParam.startsWith('CK') ? siteParam : `Workshop ${siteParam}`);
        if (sizeParam && sizeParam !== '-') setTireSize(sizeParam);
        if (brandParam && brandParam !== '-') setBrand(brandParam);
        setCreationMode('FROM_INSPECTION');
      }
    }
  }, []);

  // Injuries array starting at Minor #1
  const [injuries, setInjuries] = useState<InjuryItem[]>([
    {
      id: 'inj_1',
      injuryCategory: 'Minor',
      injuryNumber: 1,
      injuryName: 'Minor #1',
      injuryDate: new Date().toISOString().split('T')[0],
      dimensiLukaL: '',
      dimensiLukaW: '',
      dimensiLukaP: '',
      dimensiLukaT: '',
      processes: [
        { processName: 'Skiving', materialUsed: '', qty: '', hours: '', byWhom: '', hardness: '' },
        { processName: 'Buffing', materialUsed: '', qty: '', hours: '', byWhom: '', hardness: '' },
        { processName: 'Cementing', materialUsed: '', qty: '', hours: '', byWhom: '', hardness: '' },
        { processName: 'Buffing Innerliner', materialUsed: '', qty: '', hours: '', byWhom: '', hardness: '' },
        { processName: 'Install Patch', materialUsed: '', qty: '', hours: '', byWhom: '', hardness: '' },
        { processName: 'Built Up', materialUsed: '', qty: '', hours: '', byWhom: '', hardness: '' },
        { processName: 'Curing', materialUsed: '', qty: '', hours: '', byWhom: '', hardness: '' },
        { processName: 'Finishing', materialUsed: '', qty: '', hours: '', byWhom: '', hardness: '' },
        { processName: 'Painting', materialUsed: '', qty: '', hours: '', byWhom: '', hardness: '' },
      ],
    },
  ]);

  const [remarks, setRemarks] = useState('');
  const [remarksStatus, setRemarksStatus] = useState<{
    countMayor: number;
    countMinor: number;
    isValidFormat: boolean;
    hasInput: boolean;
  }>({ countMayor: 0, countMinor: 0, isValidFormat: true, hasInput: false });

  const hasInjuryFilledData = (inj: InjuryItem): boolean => {
    const hasDim = !!(inj.dimensiLukaL || inj.dimensiLukaW || inj.dimensiLukaP || inj.dimensiLukaT);
    const hasProc = inj.processes.some(
      (p) => !!(p.materialUsed?.trim() || p.qty?.trim() || p.hours?.trim() || p.byWhom?.trim())
    );
    return hasDim || hasProc;
  };

  const createDefaultProcesses = (firstInj?: InjuryItem): ProcessItem[] =>
    DEFAULT_JOB_CARD_PROCESS_NAMES.map((procName, procIdx) => {
      const form1Proc = firstInj?.processes[procIdx];
      const mat = form1Proc?.materialUsed || '';
      const by = form1Proc?.byWhom || '';
      const qty = mat.trim() ? (form1Proc?.qty || '1') : '';
      return {
        processName: procName,
        materialUsed: mat,
        qty: qty,
        hours: '',
        byWhom: by,
        hardness: '',
      };
    });

  const handleRemarksChange = (val: string) => {
    setRemarks(val);
    const parsed = parseInjuryRemarks(val);
    setRemarksStatus(parsed);

    if (!parsed.isValidFormat || !parsed.hasInput) return;
    if (parsed.countMayor === 0 && parsed.countMinor === 0) return;

    // Create target injury list
    const targetInjuries: { category: 'Major' | 'Minor'; name: string }[] = [];
    for (let i = 1; i <= parsed.countMayor; i++) {
      targetInjuries.push({ category: 'Major', name: `Mayor #${i}` });
    }
    for (let i = 1; i <= parsed.countMinor; i++) {
      targetInjuries.push({ category: 'Minor', name: `Minor #${i}` });
    }

    const newCount = targetInjuries.length;
    const removedFilledInjuries = injuries.slice(newCount).filter(hasInjuryFilledData);

    if (removedFilledInjuries.length > 0) {
      const confirmRemove = window.confirm(
        `Perubahan remarks menjadi "${val}" akan menghapus ${removedFilledInjuries.length} form Injury yang sudah terisi data. Apakah Anda yakin ingin melanjutkan?`
      );
      if (!confirmRemove) return;
    }

    const updated: InjuryItem[] = targetInjuries.map((target, idx) => {
      const existing = injuries[idx];
      if (existing) {
        return {
          ...existing,
          injuryCategory: target.category,
          injuryNumber: idx + 1,
          injuryName: target.name,
        };
      }
      return {
        id: `inj_${Date.now()}_${idx + 1}`,
        injuryCategory: target.category,
        injuryNumber: idx + 1,
        injuryName: target.name,
        injuryDate: new Date().toISOString().split('T')[0],
        dimensiLukaL: '',
        dimensiLukaW: '',
        dimensiLukaP: '',
        dimensiLukaT: '',
        processes: createDefaultProcesses(injuries[0]),
      };
    });

    setInjuries(updated);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load master data & registered inspections
  useEffect(() => {
    getJobcardQcDefaultApproverAction().then((res) => {
      if (res.success && res.defaultQcName) {
        setSignQc((prev) => prev || res.defaultQcName);
      }
    });
    setByHeadSection((prev) => prev || 'Ary Maulana');
    getTireRepairJobcardsAction().catch(() => {});
    getTireRepairInspectionsAction().then((res) => {
      if (res.success && res.data) {
        setInspections(res.data);
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const snParam = params.get('sn') || params.get('serialNumber');
          if (snParam) {
            const found = res.data.find((i) => (i.serialNumber || '').trim().toLowerCase() === snParam.trim().toLowerCase());
            if (found) {
              setSelectedInspectionId(String(found.id));
              if (found.brand && found.brand !== '-') setBrand(found.brand);
              if (found.tireSize && found.tireSize !== '-') setTireSize(found.tireSize);
              if (found.pattern && found.pattern !== '-') setPattern(found.pattern);
              if (found.typeConstruction) setTireConstruction(found.typeConstruction);
              if (found.customer) setCustomerName(found.customer);
              if (found.inspectLocation) setPlant(found.inspectLocation);
            }
          }
        }
      }
    });
    getTireRepairMasterDataAction().then((res) => {
      if (res.success && res.data) {
        if (res.data.inspectors && res.data.inspectors.length > 0) {
          setTechnicians(res.data.inspectors);
        }
        if (res.data.customers && res.data.customers.length > 0) {
          setCustomerOptions(res.data.customers);
        }
        if (res.data.sizes && res.data.sizes.length > 0) {
          setSizeOptions(res.data.sizes);
        }
        if (res.data.brands && res.data.brands.length > 0) {
          setBrands(res.data.brands);
        }
      }
    });
  }, []);

  // Handle Inspection Selection Auto-Fill
  const handleSelectInspection = (inspIdStr: string) => {
    setSelectedInspectionId(inspIdStr);
    const target = inspections.find((i) => String(i.id) === inspIdStr);
    if (target) {
      setSerialNumber(target.serialNumber);
      setTireSize(target.tireSize);
      setBrand(target.brand || 'MICHELIN');
      setPattern(target.pattern || 'E4');
      setTireConstruction(target.typeConstruction || 'RADIAL');
      setCustomerName(target.customer || 'PT Kaltim Prima Coal');
      setPlant(target.inspectLocation || 'Workshop Sangatta');
      if (target.dateReceived) {
        setReceivedDate(new Date(target.dateReceived).toISOString().split('T')[0]);
      }
      toast.success(`Data tire SN ${target.serialNumber} berhasil dimuat dari Inspeksi!`);
    }
  };

  // Category Switcher (Minor / Major)
  const handleCategoryChange = (injId: string, newCat: 'Minor' | 'Major') => {
    setInjuries((prev) =>
      prev.map((i, idx) => {
        if (i.id !== injId) return i;
        const num = i.injuryNumber || (idx + 1);
        return {
          ...i,
          injuryCategory: newCat,
          injuryName: `${newCat} #${num}`,
        };
      })
    );
  };

  // Add Injury Block starting at #1, #2...
  const handleAddInjury = () => {
    const newNum = injuries.length + 1;
    const defaultCat: 'Minor' | 'Major' = 'Minor';
    const newInj: InjuryItem = {
      id: `inj_${Date.now()}`,
      injuryCategory: defaultCat,
      injuryNumber: newNum,
      injuryName: `${defaultCat} #${newNum}`,
      injuryDate: new Date().toISOString().split('T')[0],
      dimensiLukaL: '',
      dimensiLukaW: '',
      dimensiLukaP: '',
      dimensiLukaT: '',
      processes: createDefaultProcesses(injuries[0]),
    };
    setInjuries((prev) => [...prev, newInj]);
  };

  const handleRemoveInjury = (id: string) => {
    if (injuries.length === 1) {
      toast.warning('Minimal 1 rincian Injury wajib diisi.');
      return;
    }
    setInjuries((prev) => prev.filter((i) => i.id !== id));
  };

  // Process item handlers
  const handleProcessChange = (injuryId: string, procIdx: number, field: keyof ProcessItem, value: string) => {
    setInjuries((prev) => {
      const isFirstForm = prev.length > 0 && prev[0].id === injuryId;
      const oldForm1Mat = prev.length > 0 ? (prev[0].processes[procIdx]?.materialUsed || '') : '';
      const oldForm1Manpower = prev.length > 0 ? (prev[0].processes[procIdx]?.byWhom || '') : '';

      return prev.map((inj, idx) => {
        if (inj.id === injuryId) {
          const updatedProcs = [...inj.processes];
          const curProc = updatedProcs[procIdx];
          const newProc = { ...curProc, [field]: value };

          // If material is entered/edited and qty is empty, default qty to '1'
          if (field === 'materialUsed' && value.trim() && !newProc.qty.trim()) {
            newProc.qty = '1';
          }

          updatedProcs[procIdx] = newProc;
          return { ...inj, processes: updatedProcs };
        }

        // Auto-propagate material / manpower from Form 1 to subsequent forms if editing Form 1
        if (isFirstForm && idx > 0) {
          const updatedProcs = [...inj.processes];
          const targetProc = updatedProcs[procIdx];

          if (field === 'materialUsed') {
            const currentSubMat = targetProc.materialUsed || '';
            let nextSubMat = currentSubMat;

            if (!currentSubMat || currentSubMat === oldForm1Mat) {
              nextSubMat = value;
            } else if (oldForm1Mat && currentSubMat.startsWith(oldForm1Mat)) {
              const suffix = currentSubMat.slice(oldForm1Mat.length);
              nextSubMat = value ? `${value}${suffix}` : suffix.replace(/^,\s*/, '');
            }

            const nextQty = (nextSubMat.trim() && !targetProc.qty.trim()) ? '1' : (targetProc.qty || (nextSubMat.trim() ? '1' : ''));
            updatedProcs[procIdx] = { ...targetProc, materialUsed: nextSubMat, qty: nextQty };
          } else if (field === 'byWhom') {
            const currentSubBy = targetProc.byWhom || '';
            if (!currentSubBy || currentSubBy === oldForm1Manpower) {
              updatedProcs[procIdx] = { ...targetProc, byWhom: value };
            }
          }

          return { ...inj, processes: updatedProcs };
        }

        return inj;
      });
    });
  };

  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  // Submit Handler (In Progress for multi-day repair or Completed for finished repair)
  const handleSubmitWithStatus = async (targetStatus: 'In Progress' | 'Completed' = 'In Progress', e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormErrorMessage(null);

    // Enforce required fields ONLY on Final Submit ('Completed')
    if (targetStatus === 'Completed') {
      if (!woNo.trim()) {
        const msg = 'Nomor WO (W/O #) wajib diisi saat Submit Final.';
        setFormErrorMessage(msg);
        toast.error(msg);
        if (typeof window !== 'undefined') window.alert(msg);
        return;
      }
      if (!serialNumber.trim()) {
        const msg = 'Serial Number wajib diisi saat Submit Final. Pilih tire dari Inspeksi atau isi manual.';
        setFormErrorMessage(msg);
        toast.error(msg);
        if (typeof window !== 'undefined') window.alert(msg);
        return;
      }
      if (!tireSize.trim()) {
        const msg = 'Ukuran tire wajib diisi saat Submit Final.';
        setFormErrorMessage(msg);
        toast.error(msg);
        if (typeof window !== 'undefined') window.alert(msg);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloadData = {
        inspectionId: selectedInspectionId ? Number(selectedInspectionId) : undefined,
        woNo: woNo.trim() || undefined,
        woDate: woDate || undefined,
        plant: plant.trim() || 'Workshop Sangatta',
        customerName: customerName.trim() || 'PT Kaltim Prima Coal',
        customerId: customerId.trim() || undefined,
        receivedDate: receivedDate || undefined,
        serialNumber: serialNumber.trim() ? serialNumber.trim().toUpperCase() : (editingJobcardId ? `DRAFT-${editingJobcardId}` : `DRAFT-${Date.now()}`),
        tireSize: tireSize.trim() || '-',
        brand: brand.trim() ? brand.trim().toUpperCase() : 'MICHELIN',
        pattern: pattern.trim() || 'E4',
        tireConstruction: tireConstruction || 'RADIAL',
        status: targetStatus,
        signQc: signQc.trim() || undefined,
        byHeadSection: byHeadSection.trim() || undefined,
        injuries: injuries.map((inj) => ({
          injuryName: inj.injuryName,
          injuryDate: inj.injuryDate,
          dimensiLukaL: inj.dimensiLukaL,
          dimensiLukaW: inj.dimensiLukaW,
          dimensiLukaP: inj.dimensiLukaP,
          dimensiLukaT: inj.dimensiLukaT,
          processes: inj.processes.map((p) => ({
            processName: p.processName,
            materialUsed: p.materialUsed,
            qty: p.qty,
            hours: p.hours,
            byWhom: p.byWhom,
            hardness: p.hardness,
          })),
        })),
      };

      const res = editingJobcardId
        ? await updateTireRepairJobcardAction(editingJobcardId, payloadData)
        : await createTireRepairJobcardAction(payloadData);

      if (res.success && res.data) {
        if (!editingJobcardId && res.data.id) {
          setEditingJobcardId(res.data.id);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `/mobile/tire-repair/jobcard/new?editId=${res.data.id}`);
          }
        }

        const successMsg = targetStatus === 'Completed'
          ? (res.message || 'Repair Job Card berhasil diterbitkan (Selesai).')
          : 'Draft Jobcard berhasil disimpan sementara.';

        toast.success(successMsg);

        if (targetStatus === 'Completed') {
          if (typeof window !== 'undefined') window.alert(successMsg);
          router.push('/mobile/tire-repair/jobcard');
        }
      } else {
        const msg = res.message || 'Gagal menyimpan Repair Job Card.';
        setFormErrorMessage(msg);
        toast.error(msg);
        if (typeof window !== 'undefined') window.alert(msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan sistem.';
      setFormErrorMessage(msg);
      toast.error(msg);
      if (typeof window !== 'undefined') window.alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8 w-full max-w-full overflow-x-hidden min-w-0">
      <Toaster position="top-center" richColors />
      {/* Header Card */}
      <div className="bg-white rounded-[1.3rem] p-4 shadow-[0_12px_28px_rgba(8,32,51,0.06)] border border-slate-100 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push('/mobile/tire-repair/jobcard')}
            className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[#082033] hover:bg-slate-200 transition-colors active:scale-95 shadow-xs"
          >
            <ChevronLeft className="w-5 h-5 text-[#003f78]" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-[#082033] font-mono truncate">
                FORM REPAIR JOB CARD
              </h1>
              <span className="w-2 h-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmitWithStatus('In Progress', e)} className="space-y-4 w-full min-w-0">
        {/* Creation Mode Switcher */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-2.5 min-w-0 overflow-hidden">
          <label className="text-xs font-bold text-[#486275] block">
            Sumber Data Tire:
          </label>
          <div className="grid grid-cols-2 gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setCreationMode('FROM_INSPECTION')}
              className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all min-w-0 truncate ${
                creationMode === 'FROM_INSPECTION'
                  ? 'bg-[#003f78] text-white border-[#003f78] shadow-xs'
                  : 'bg-slate-50 text-[#082033] border-slate-200 hover:bg-slate-100'
              }`}
            >
              Pilih dari Inspeksi
            </button>
            <button
              type="button"
              onClick={() => setCreationMode('STANDALONE')}
              className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all min-w-0 truncate ${
                creationMode === 'STANDALONE'
                  ? 'bg-[#003f78] text-white border-[#003f78] shadow-xs'
                  : 'bg-slate-50 text-[#082033] border-slate-200 hover:bg-slate-100'
              }`}
            >
              Input Standalone (Manual)
            </button>
          </div>

          {creationMode === 'FROM_INSPECTION' && (
            <div className="pt-1.5 space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">
                Status Data Tire Inspeksi:
              </label>
              {serialNumber && !serialNumber.startsWith('DRAFT-') ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-xs">
                  <div className="truncate">
                    <span className="text-emerald-700 block text-[10px] font-medium uppercase tracking-wider">✓ Data Tire Otomatis Terhubung:</span>
                    <span className="font-mono text-sm block font-black text-emerald-950">{serialNumber} · {brand} ({tireSize})</span>
                  </div>
                  {inspections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInspectionId('');
                        setSerialNumber('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-[11px] text-emerald-800 font-bold border border-emerald-300 ml-2 shrink-0 transition-colors"
                    >
                      Pilih Lain
                    </button>
                  )}
                </div>
              ) : (
                <Select value={selectedInspectionId} onValueChange={handleSelectInspection}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold text-[#082033] w-full min-w-0 overflow-hidden flex justify-between items-center pr-3">
                    <SelectValue placeholder="-- Pilih Serial Number Tire --" className="truncate block min-w-0" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-[#082033] max-w-[90vw]">
                    {inspections.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        {i.serialNumber} · {i.brand || 'MICHELIN'} ({i.tireSize}) - {i.customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {/* Section 1: Header Form W/O & Plant */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3 min-w-0 overflow-hidden">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase text-[#082033]">
              1. Header Dokumentasi & Plant
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 min-w-0">
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">
                W/O # <span className="text-red-500 font-bold">*</span>
              </label>
              <Input
                value={woNo}
                onChange={(e) => setWoNo(e.target.value)}
                placeholder="WO-2026-001"
                className="h-9.5 rounded-xl bg-slate-50 border-slate-200 text-xs font-mono font-bold text-[#082033] w-full min-w-0"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">W/O Date</label>
              <Input
                type="date"
                value={woDate}
                onChange={(e) => setWoDate(e.target.value)}
                className="h-9.5 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#082033] w-full min-w-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 min-w-0">
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">Customer Name</label>
              <TireRepairSearchableSelect
                value={customerName}
                onValueChange={setCustomerName}
                options={customerOptions}
                placeholder="Customer"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">Plant / Workshop</label>
              <Input
                value={plant}
                onChange={(e) => setPlant(e.target.value)}
                placeholder="Workshop Sangatta"
                className="h-9.5 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#082033] w-full min-w-0"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Tire Details */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3 min-w-0 overflow-hidden">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase text-[#082033]">
              2. Spesifikasi Tire (Tire Details)
            </h3>
          </div>

          <div className="space-y-1 min-w-0">
            <label className="text-[11px] font-semibold text-[#486275] block truncate">
              Serial Number <span className="text-rose-500">*</span>
            </label>
            <Input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
              placeholder="Contoh: BAL00079"
              className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-mono font-black text-[#082033] w-full min-w-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 min-w-0">
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">Ukuran Tire</label>
              <TireRepairSearchableSelect
                value={tireSize}
                onValueChange={setTireSize}
                options={sizeOptions}
                placeholder="Pilih Ukuran"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">Brand</label>
              <TireRepairSearchableSelect
                value={brand}
                onValueChange={setBrand}
                options={brands}
                placeholder="Brand"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 min-w-0">
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">Pattern</label>
              <Input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="E4 / E3A"
                className="h-9.5 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#082033] w-full min-w-0"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">Konstruksi</label>
              <Select value={tireConstruction} onValueChange={setTireConstruction}>
                <SelectTrigger className="h-9.5 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#082033] w-full min-w-0 overflow-hidden flex justify-between items-center pr-2">
                  <SelectValue placeholder="Konstruksi" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-[#082033]">
                  <SelectItem value="RADIAL">RADIAL</SelectItem>
                  <SelectItem value="BIAS">BIAS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 3: Dynamic Injuries & Processes Builder */}
        <div className="space-y-3 min-w-0">
          {/* Remarks Auto-Generator Box */}
          <div className="bg-sky-50/70 p-3.5 rounded-2xl border border-sky-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#003f78] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#003f78]" />
                <span>Remarks Injury (Auto-Generate Form)</span>
              </label>
              {remarksStatus.isValidFormat && remarksStatus.hasInput && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ✓ {remarksStatus.countMayor} Mayor, {remarksStatus.countMinor} Minor
                </span>
              )}
            </div>

            <Input
              value={remarks}
              onChange={(e) => handleRemarksChange(e.target.value)}
              placeholder='Contoh: "mayor 2 minor 3" atau "2 mayor 3 minor"'
              className="h-10 rounded-xl bg-white border-sky-300/80 text-xs font-semibold text-[#082033] shadow-xs"
            />

            {remarksStatus.hasInput && !remarksStatus.isValidFormat && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Format remarks tidak terbaca. Contoh format yang benar: &quot;mayor 2 minor 3&quot; atau &quot;2 mayor 3 minor&quot;.</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-1 min-w-0">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#082033] flex items-center gap-1.5 min-w-0 truncate pr-2">
              <Wrench className="w-4 h-4 shrink-0 text-[#003f78]" />
              <span className="truncate">3. Process & Material Pengerjaan</span>
            </h3>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddInjury}
              className="h-8 shrink-0 rounded-xl px-2.5 text-xs font-bold text-[#003f78] border-[#003f78]/30 bg-sky-50/50 hover:bg-sky-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Injury</span>
            </Button>
          </div>

          {injuries.map((inj, injIdx) => (
            <div
              key={inj.id}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3 relative min-w-0 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 min-w-0 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Select
                    value={inj.injuryCategory || 'Minor'}
                    onValueChange={(val: 'Minor' | 'Major') => handleCategoryChange(inj.id, val)}
                  >
                    <SelectTrigger className="h-8 rounded-xl bg-slate-100 border-slate-200 text-xs font-bold text-[#082033] w-24 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-[#082033]">
                      <SelectItem value="Minor">Minor</SelectItem>
                      <SelectItem value="Major">Major</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    value={inj.injuryName}
                    onChange={(e) =>
                      setInjuries((prev) =>
                        prev.map((i) => (i.id === inj.id ? { ...i, injuryName: e.target.value } : i))
                      )
                    }
                    className="h-8 text-xs font-bold font-mono bg-slate-50 border-slate-200 flex-1 min-w-[100px]"
                  />
                </div>

                {injuries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveInjury(inj.id)}
                    className="p-1 shrink-0 rounded-lg text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Processes List for this Injury (Sequence: 1. Skiving, 2. Buffing, 3. Dimensi Luka, 4. Cementing, 5. Buffing Innerliner, 6. Install Patch, 7. Built Up, 8. Curing, 9. Finishing, 10. Painting) */}
              <div className="space-y-2.5 pt-1 min-w-0">
                <span className="text-[10px] font-bold text-[#486275] uppercase block truncate">
                  10 Tahapan Pengerjaan & Material:
                </span>

                {inj.processes.map((proc, pIdx) => {
                  // Step numbering: 1. Skiving, 2. Buffing, (3. Dimensi Luka inserted after Buffing), 4. Cementing, 5. Buffing Innerliner, etc.
                  const displayStepNum = pIdx < 2 ? pIdx + 1 : pIdx + 2;

                  return (
                    <React.Fragment key={pIdx}>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between font-bold text-[#082033] min-w-0">
                          <span className="truncate">{displayStepNum}. {proc.processName}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 min-w-0">
                          <div className="min-w-0 space-y-1">
                            <label className="text-[10px] text-[#486275] block truncate">Material</label>
                            <Input
                              value={proc.materialUsed}
                              onChange={(e) => handleProcessChange(inj.id, pIdx, 'materialUsed', e.target.value)}
                              placeholder="Material / Patch"
                              className="h-8 text-xs bg-white border-slate-200 w-full min-w-0"
                            />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <label className="text-[10px] text-[#486275] block truncate">Qty / Takaran</label>
                            <Input
                              value={proc.qty}
                              onChange={(e) => handleProcessChange(inj.id, pIdx, 'qty', e.target.value)}
                              placeholder="300g / 1 pcs"
                              className="h-8 text-xs bg-white border-slate-200 w-full min-w-0"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 min-w-0">
                          <div className="min-w-0 space-y-1">
                            <label className="text-[10px] text-[#486275] block truncate">Durasi / Jam</label>
                            <TireRepairProcessTimer
                              value={proc.hours}
                              onChange={(val) => handleProcessChange(inj.id, pIdx, 'hours', val)}
                              placeholder="45m / 2 jam"
                              processName={proc.processName}
                            />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <label className="text-[10px] text-[#486275] block truncate">By Whom (Manpower)</label>
                            <TireRepairSearchableSelect
                              value={proc.byWhom}
                              onValueChange={(val) => handleProcessChange(inj.id, pIdx, 'byWhom', val)}
                              options={technicians}
                              placeholder="Pilih Manpower"
                              isMultiSelect={true}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Interleaved Step 3: Dimensi Luka (L x W x P x T mm) */}
                      {pIdx === 1 && (
                        <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-2 text-xs min-w-0 overflow-hidden">
                          <div className="flex items-center justify-between font-bold text-[#003f78] min-w-0">
                            <span className="truncate">3. Dimensi Luka (L x W x P x T mm)</span>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 min-w-0">
                            <div>
                              <label className="text-[9px] font-bold text-[#486275] block text-center">L (Panjang)</label>
                              <Input
                                placeholder="L mm"
                                value={inj.dimensiLukaL}
                                onChange={(e) =>
                                  setInjuries((prev) =>
                                    prev.map((i) => (i.id === inj.id ? { ...i, dimensiLukaL: e.target.value } : i))
                                  )
                                }
                                className="h-8 text-xs text-center font-mono bg-white border-slate-200 min-w-0"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-[#486275] block text-center">W (Lebar)</label>
                              <Input
                                placeholder="W mm"
                                value={inj.dimensiLukaW}
                                onChange={(e) =>
                                  setInjuries((prev) =>
                                    prev.map((i) => (i.id === inj.id ? { ...i, dimensiLukaW: e.target.value } : i))
                                  )
                                }
                                className="h-8 text-xs text-center font-mono bg-white border-slate-200 min-w-0"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-[#486275] block text-center">P (Kedalaman)</label>
                              <Input
                                placeholder="P mm"
                                value={inj.dimensiLukaP}
                                onChange={(e) =>
                                  setInjuries((prev) =>
                                    prev.map((i) => (i.id === inj.id ? { ...i, dimensiLukaP: e.target.value } : i))
                                  )
                                }
                                className="h-8 text-xs text-center font-mono bg-white border-slate-200 min-w-0"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-[#486275] block text-center">T (Tebal)</label>
                              <Input
                                placeholder="T mm"
                                value={inj.dimensiLukaT}
                                onChange={(e) =>
                                  setInjuries((prev) =>
                                    prev.map((i) => (i.id === inj.id ? { ...i, dimensiLukaT: e.target.value } : i))
                                  )
                                }
                                className="h-8 text-xs text-center font-mono bg-white border-slate-200 min-w-0"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Section 4: Sign QC & Approval */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3 min-w-0 overflow-hidden">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase text-[#082033]">
              4. Quality Control (QC) &amp; Penanggung Jawab
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 min-w-0">
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">Sign. QC</label>
              <TireRepairSearchableSelect
                value={signQc}
                onValueChange={setSignQc}
                options={technicians}
                placeholder="Nama QC"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-[#486275] block truncate">Head Section</label>
              <TireRepairSearchableSelect
                value={byHeadSection}
                onValueChange={setByHeadSection}
                options={technicians}
                placeholder="Head Section"
              />
            </div>
          </div>
        </div>

        {/* Form Error Banner */}
        {formErrorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{formErrorMessage}</span>
          </div>
        )}

        {/* Action Buttons: Multi-Day Progress vs Completed */}
        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            type="button"
            onClick={(e) => handleSubmitWithStatus('In Progress', e)}
            disabled={isSubmitting}
            className="w-full h-11 bg-white border-2 border-[#003f78] text-[#003f78] hover:bg-slate-50 font-bold rounded-xl text-xs tracking-wide cursor-pointer active:scale-[0.99]"
          >
            {isSubmitting ? 'Menyimpan Progress...' : '💾 SIMPAN PROGRESS (DALAM PENGERJAAN)'}
          </Button>

          <Button
            type="button"
            onClick={(e) => handleSubmitWithStatus('Completed', e)}
            disabled={isSubmitting}
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20 text-xs tracking-wide active:scale-[0.99] cursor-pointer"
          >
            {isSubmitting ? 'Menerbitkan Jobcard...' : '✅ SIMPAN & TANDAI SELESAI (COMPLETED)'}
          </Button>
        </div>
      </form>
    </div>
  );
}
