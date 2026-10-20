'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Camera,
  ImageIcon,
  Trash2,
  AlertTriangle,
  Check,
  Plus,
  Loader2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  createTireRepairInspectionAction,
  updateTireRepairInspectionAction,
  getTireRepairInspectionByIdAction,
  getTireRepairMasterDataAction,
} from '@/app/actions/tire-repair-actions';
import { TireRepairCameraModal } from '@/components/mobile/tire-repair-camera-modal';
import { TireRepairSearchableSelect } from '@/components/mobile/tire-repair-searchable-select';
import { resolveUploadUrl } from '@/lib/resolve-upload-url';
import {
  STANDARD_TIRE_SIZES,
  STANDARD_TIRE_BRANDS,
  DEFAULT_CUSTOMERS,
  DEFAULT_CUSTOMER_SITES,
  DEFAULT_CHITRA_INSPECTORS,
  DURATION_CONFIG,
  type DurationTag,
} from '@/lib/tire-repair-constants';

const PHOTO_AREAS = [
  'Serial Number',
  'Area Sidewall',
  'Area Shoulder',
  'Area Tread',
  'Area Bead',
  'Area Inner Linner',
  'Area Chaffer',
] as const;

interface UploadedPhoto {
  id: string;
  photoArea: string;
  photoUrl: string;
  photoType?: 'INSPECTION' | 'SKIVING';
  isLandscape: boolean;
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

export default function NewTireRepairInspectionPage() {
  const router = useRouter();

  // Master Data Options
  const [sizeOptions, setSizeOptions] = useState<string[]>(STANDARD_TIRE_SIZES);
  const [customerOptions, setCustomerOptions] = useState<string[]>(DEFAULT_CUSTOMERS);
  const [siteOptions, setSiteOptions] = useState<string[]>(DEFAULT_CUSTOMER_SITES);
  const [locationOptions, setLocationOptions] = useState<string[]>(DEFAULT_WORKSHOP_LOCATIONS);
  const [brands, setBrands] = useState<string[]>(STANDARD_TIRE_BRANDS);
  const [patterns, setPatterns] = useState<string[]>(['E4', 'L4', 'L5', 'E3', 'TRACTION', 'ROCK', 'SMOOTH']);
  const [inspectorOptions, setInspectorOptions] = useState<string[]>(DEFAULT_CHITRA_INSPECTORS);

  // Section 1: Informasi Inspeksi
  const [inspectLocation, setInspectLocation] = useState('Workshop Sangatta');
  const [dateInspect, setDateInspect] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportBy, setReportBy] = useState('');
  const [repairDuration, setRepairDuration] = useState<DurationTag>('R1');
  const [rtd1, setRtd1] = useState('');
  const [rtd2, setRtd2] = useState('');
  const [remarks, setRemarks] = useState('');
  const [scrapReason, setScrapReason] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Section 2: Upload Foto (Single-select area per photo, multiple photos per area supported)
  const [uploadCategory, setUploadCategory] = useState<'SKIVING' | 'INSPECTION'>('SKIVING');
  const [selectedPhotoArea, setSelectedPhotoArea] = useState<string>(PHOTO_AREAS[0]);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [hasPortraitWarning, setHasPortraitWarning] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Section 3: Tire Detail & Status
  const [tireSize, setTireSize] = useState('27.00R49');
  const [isCustomTireSize, setIsCustomTireSize] = useState(false);
  const [customSizeModalOpen, setCustomSizeModalOpen] = useState(false);
  const [newCustomSizeInput, setNewCustomSizeInput] = useState('');

  const [customBrandModalOpen, setCustomBrandModalOpen] = useState(false);
  const [newCustomBrandInput, setNewCustomBrandInput] = useState('');

  const [customCustomerModalOpen, setCustomCustomerModalOpen] = useState(false);
  const [newCustomCustomerInput, setNewCustomCustomerInput] = useState('');

  const [customSiteModalOpen, setCustomSiteModalOpen] = useState(false);
  const [newCustomSiteInput, setNewCustomSiteInput] = useState('');

  const [serialNumber, setSerialNumber] = useState('');
  const [brand, setBrand] = useState('MICHELIN');
  const [typeConstruction, setTypeConstruction] = useState('RADIAL');
  const [pattern, setPattern] = useState('E4');
  const [dateReceived, setDateReceived] = useState(() => new Date().toISOString().split('T')[0]);
  const [customer, setCustomer] = useState('PT Kaltim Prima Coal');
  const [customerSite, setCustomerSite] = useState('Sangatta KPC');
  const [status, setStatus] = useState<'Repair' | 'Retread' | 'Reject'>('Repair');

  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing inspection if editing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('editId') || params.get('id');
      if (idParam && !isNaN(Number(idParam))) {
        const targetId = Number(idParam);
        setEditingId(targetId);
        getTireRepairInspectionByIdAction(targetId).then((res) => {
          if (res.success && res.data) {
            const item = res.data;
            setSerialNumber(item.serialNumber || '');
            setTireSize(item.tireSize || '27.00R49');
            setBrand(item.brand || 'MICHELIN');
            setTypeConstruction(item.typeConstruction || 'RADIAL');
            setPattern(item.pattern || 'E4');
            if (item.dateReceived) setDateReceived(new Date(item.dateReceived).toISOString().split('T')[0]);
            if (item.dateInspect) setDateInspect(new Date(item.dateInspect).toISOString().split('T')[0]);
            setCustomer(item.customer || 'PT Kaltim Prima Coal');
            setCustomerSite(item.customerSite || 'Sangatta KPC');
            setInspectLocation(item.inspectLocation || 'Workshop Sangatta');
            setReportBy(item.reportBy || '');
            setRepairDuration((item.repairDuration as DurationTag) || 'R1');
            setRtd1(item.rtd1 || '');
            setRtd2(item.rtd2 || '');
            setRemarks(item.remarks || '');
            setScrapReason(item.scrapReason || '');
            setStatus((item.status as any) || 'Repair');
            if (item.photos && item.photos.length > 0) {
              setPhotos(
                item.photos.map((p) => ({
                  id: `photo_${p.id || Math.random()}`,
                  photoArea: p.photoArea,
                  photoUrl: p.photoUrl,
                  photoType: (p.photoType as any) || 'INSPECTION',
                  isLandscape: true,
                }))
              );
            }
          }
        });
      }
    }
  }, []);

  // Load user default location & master data
  useEffect(() => {
    getTireRepairMasterDataAction().then((res) => {
      if (res.success && res.data) {
        if (res.data.locations && res.data.locations.length > 0) {
          const locs = res.data.userDefaultLocation
            ? Array.from(new Set([res.data.userDefaultLocation, ...res.data.locations]))
            : res.data.locations;
          setLocationOptions(locs);
        }
        if (res.data.userDefaultLocation) {
          setInspectLocation(res.data.userDefaultLocation);
        }
        if (res.data.userDefaultName) {
          setReportBy(res.data.userDefaultName);
        }
        if (res.data.inspectors && res.data.inspectors.length > 0) {
          setInspectorOptions(res.data.inspectors);
          if (!res.data.userDefaultName && res.data.inspectors[0]) {
            setReportBy(res.data.inspectors[0]);
          }
        }
        if (res.data.sizes && res.data.sizes.length > 0) {
          setSizeOptions(res.data.sizes);
        }
        if (res.data.customers && res.data.customers.length > 0) {
          setCustomerOptions(res.data.customers);
          const defCust = res.data.customers.find((c) => c.toLowerCase().includes('kaltim prima coal')) || res.data.customers[0];
          setCustomer(defCust);
        }
        if (res.data.sites && res.data.sites.length > 0) {
          setSiteOptions(res.data.sites);
          const defSite = res.data.sites.find((s) => s.toLowerCase().includes('sangatta kpc')) || res.data.sites.find((s) => s.toLowerCase().includes('sangatta')) || res.data.sites[0];
          setCustomerSite(defSite);
        }
        if (res.data.brands && res.data.brands.length > 0) {
          setBrands(res.data.brands);
        }
        if (res.data.patterns && res.data.patterns.length > 0) {
          setPatterns(res.data.patterns);
        }
      }
    });
  }, []);

  // Handle Photo File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const resultStr = event.target?.result as string;
      if (!resultStr) return;

      // Validate Landscape (width >= height)
      const img = new Image();
      img.onload = () => {
        const isLandscape = img.width >= img.height;
        if (!isLandscape) {
          setHasPortraitWarning(true);
          toast.warning('Disarankan mengambil foto dalam format Landscape (Mendatar) agar hasil inspeksi maksimal.');
        } else {
          setHasPortraitWarning(false);
        }

        const newPhoto: UploadedPhoto = {
          id: Math.random().toString(36).substring(2, 9),
          photoArea: selectedPhotoArea,
          photoUrl: resultStr,
          photoType: uploadCategory,
          isLandscape,
        };

        setPhotos((prev) => [...prev, newPhoto]);
        toast.success(`Foto ${uploadCategory === 'SKIVING' ? 'setelah skiving' : 'kondisi awal'} (${selectedPhotoArea}) berhasil diunggah.`);
      };
      img.src = resultStr;
    };

    reader.readAsDataURL(file);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  };

  // Live Camera Capture Handler
  const handleCameraCapture = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const isLandscape = img.width >= img.height;
      if (!isLandscape) {
        setHasPortraitWarning(true);
        toast.warning('Disarankan mengambil foto dalam format Landscape (Mendatar) agar hasil inspeksi maksimal.');
      } else {
        setHasPortraitWarning(false);
      }

      const newPhoto: UploadedPhoto = {
        id: Math.random().toString(36).substring(2, 9),
        photoArea: selectedPhotoArea,
        photoUrl: dataUrl,
        photoType: uploadCategory,
        isLandscape,
      };

      setPhotos((prev) => [...prev, newPhoto]);
      toast.success(`Foto ${uploadCategory === 'SKIVING' ? 'setelah skiving' : 'kondisi awal'} (${selectedPhotoArea}) berhasil diambil.`);
    };
    img.src = dataUrl;
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Add Custom Tire Size
  const handleAddCustomSize = () => {
    const val = newCustomSizeInput.trim().toUpperCase();
    if (!val) return;
    if (!sizeOptions.includes(val)) {
      setSizeOptions((prev) => [...prev, val]);
    }
    setTireSize(val);
    setIsCustomTireSize(true);
    setNewCustomSizeInput('');
    setCustomSizeModalOpen(false);
    toast.success(`Ukuran tire "${val}" berhasil ditambahkan.`);
  };

  // Add Custom Brand
  const handleAddCustomBrand = () => {
    const val = newCustomBrandInput.trim().toUpperCase();
    if (!val) return;
    if (!brands.includes(val)) {
      setBrands((prev) => [val, ...prev]);
    }
    setBrand(val);
    setNewCustomBrandInput('');
    setCustomBrandModalOpen(false);
    toast.success(`Brand "${val}" berhasil ditambahkan.`);
  };

  // Add Custom Customer
  const handleAddCustomCustomer = () => {
    const val = newCustomCustomerInput.trim().toUpperCase();
    if (!val) return;
    if (!customerOptions.includes(val)) {
      setCustomerOptions((prev) => [val, ...prev]);
    }
    setCustomer(val);
    setNewCustomCustomerInput('');
    setCustomCustomerModalOpen(false);
    toast.success(`Customer "${val}" berhasil ditambahkan.`);
  };

  // Add Custom Site
  const handleAddCustomSite = () => {
    const val = newCustomSiteInput.trim();
    if (!val) return;
    if (!siteOptions.includes(val)) {
      setSiteOptions((prev) => [val, ...prev]);
    }
    setCustomerSite(val);
    setNewCustomSiteInput('');
    setCustomSiteModalOpen(false);
    toast.success(`Site "${val}" berhasil ditambahkan.`);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serialNumber.trim()) {
      toast.error('Serial Number tire wajib diisi.');
      return;
    }
    if (!tireSize) {
      toast.error('Tire Size wajib dipilih.');
      return;
    }
    if (!customer) {
      toast.error('Customer wajib dipilih.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadData = {
        serialNumber: serialNumber.trim().toUpperCase(),
        tireSize,
        isCustomTireSize,
        brand: brand.trim().toUpperCase() || 'MICHELIN',
        typeConstruction: typeConstruction || 'RADIAL',
        pattern: pattern || 'E4',
        dateReceived,
        customer: customer || 'PT Kaltim Prima Coal',
        customerSite: customerSite || 'Sangatta',
        status,
        scrapReason: status === 'Reject' ? scrapReason : null,
        inspectLocation: inspectLocation || 'Workshop Sangatta',
        dateInspect,
        reportBy: reportBy || 'Inspector',
        repairDuration,
        rtd1: rtd1 ? String(rtd1) : undefined,
        rtd2: rtd2 ? String(rtd2) : undefined,
        remarks: remarks.trim() || undefined,
        photos: photos.map((p) => ({
          photoArea: p.photoArea,
          photoUrl: p.photoUrl,
          photoType: p.photoType || 'INSPECTION',
        })),
      };

      const res = editingId
        ? await updateTireRepairInspectionAction(editingId, payloadData)
        : await createTireRepairInspectionAction(payloadData);

      if (res.success) {
        toast.success(res.message || (editingId ? 'Data inspeksi tire berhasil diperbarui!' : 'Laporan inspeksi tire berhasil disimpan!'));
        router.push('/mobile/tire-repair/inspection');
      } else {
        toast.error(res.message || 'Gagal menyimpan laporan inspeksi.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header Card */}
      <div className="bg-white rounded-[1.3rem] p-4 shadow-[0_12px_28px_rgba(8,32,51,0.06)] border border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/mobile/tire-repair/inspection')}
            className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[#082033] hover:bg-slate-200 transition-colors active:scale-95 shadow-xs"
          >
            <ChevronLeft className="w-5 h-5 text-[#003f78]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-[#082033] font-mono">
                {editingId ? 'EDIT INSPEKSI & FOTO SKIVING' : 'INPUT INSPEKSI TIRE'}
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-[#486275] font-medium">
              {editingId ? `Perbarui data & foto ban SN: ${serialNumber || '-'}` : 'Form Inspeksi Fisik Workshop'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Informasi Inspeksi */}
        <div className="bg-white p-4.5 rounded-[1.3rem] border border-slate-100 shadow-[0_12px_28px_rgba(8,32,51,0.06)] space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#082033]">
              1. Informasi Inspeksi
            </h3>
          </div>

          {/* Repair Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#486275]">
              Repair Location
            </label>
            <TireRepairSearchableSelect
              value={inspectLocation}
              onValueChange={setInspectLocation}
              options={locationOptions}
              placeholder="Pilih Lokasi Workshop"
              searchPlaceholder="Cari lokasi workshop..."
            />
          </div>

          {/* Date Inspect & Report By */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#486275]">
                Date Inspect
              </label>
              <Input
                type="date"
                value={dateInspect}
                onChange={(e) => setDateInspect(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#082033]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#486275]">
                Report By
              </label>
              <TireRepairSearchableSelect
                value={reportBy}
                onValueChange={setReportBy}
                options={inspectorOptions}
                placeholder="Pilih/ketik Inspector..."
                searchPlaceholder="Cari nama inspector/karyawan..."
              />
            </div>
          </div>

          {/* Duration R1 - R4 Single Select Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#486275] block">
              Estimasi Durasi Perbaikan
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DURATION_CONFIG) as DurationTag[]).map((tag) => {
                const conf = DURATION_CONFIG[tag];
                const isSelected = repairDuration === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setRepairDuration(tag)}
                    className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50 text-[#082033] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold">{tag}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] block mt-0.5 text-[#486275] font-medium">
                      Max {conf.maxDays} Hari Kerja
                    </span>
                  </button>
                );
              })}
            </div>
          </div>


          {/* RTD mm */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#486275]">
              RTD (mm)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                value={rtd1}
                onChange={(e) => setRtd1(e.target.value)}
                placeholder="0.0"
                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs text-center font-bold text-[#082033] flex-1"
              />
              <span className="text-slate-400 font-bold text-sm select-none">/</span>
              <Input
                type="number"
                step="0.1"
                value={rtd2}
                onChange={(e) => setRtd2(e.target.value)}
                placeholder="0.0"
                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs text-center font-bold text-[#082033] flex-1"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#486275]">
              Remarks (Catatan Tambahan)
            </label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Tuliskan catatan kondisi tire atau instruksi khusus..."
              rows={3}
              className="rounded-xl bg-slate-50 border-slate-200 text-xs text-[#082033] resize-none"
            />
          </div>
        </div>

        {/* Section 2: Upload Foto */}
        <div className="bg-white p-4.5 rounded-[1.3rem] border border-slate-100 shadow-[0_12px_28px_rgba(8,32,51,0.06)] space-y-4">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#082033]">
              2. Upload Foto Dokumentasi
            </h3>
            <span className="text-[10px] text-[#486275] font-bold">({photos.length} foto)</span>
          </div>

          {/* Category Toggle: Foto Setelah Skiving vs Foto Kondisi Awal */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#486275]">
              Target Kategori Upload:
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setUploadCategory('SKIVING')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  uploadCategory === 'SKIVING'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Foto Skiving ({photos.filter((p) => p.photoType === 'SKIVING').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadCategory('INSPECTION')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  uploadCategory === 'INSPECTION'
                    ? 'bg-[#003f78] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Foto Awal ({photos.filter((p) => p.photoType !== 'SKIVING').length})</span>
              </button>
            </div>
            {uploadCategory === 'SKIVING' && (
              <p className="text-[11px] text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                <span>★ Foto setelah skiving akan diprioritaskan di PDF Report.</span>
                <span className="font-bold uppercase text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">PDF Priority</span>
              </p>
            )}
          </div>

          {/* Warning Banner */}
          {hasPortraitWarning && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>Perhatian:</strong> Ambil foto dalam mode <strong>Landscape (Mendatar)</strong> agar dokumentasi inspeksi tire terlihat jelas & simetris.
              </span>
            </div>
          )}

          {/* Multi-Select Area Selector + Upload Dual Buttons */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#486275]">
                  Pilih Area Foto ({uploadCategory === 'SKIVING' ? 'Setelah Skiving' : 'Kondisi Awal'})
                </label>
                <span className="text-[10px] font-bold text-[#003f78] bg-[#e9f6fd] px-2 py-0.5 rounded-full border border-sky-200">
                  {selectedPhotoArea}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PHOTO_AREAS.map((area) => {
                  const isSelected = selectedPhotoArea === area;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSelectedPhotoArea(area)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 border ${
                        isSelected
                          ? 'bg-[#003f78] text-white border-[#003f78] shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-[#082033] hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{area}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hidden Inputs for Camera and Gallery */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Dual Buttons: Ambil Foto & Pilih Galeri */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                onClick={() => setIsLiveCameraOpen(true)}
                variant="outline"
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] ${
                  uploadCategory === 'SKIVING'
                    ? 'border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Ambil Foto {uploadCategory === 'SKIVING' ? 'Skiving' : 'Awal'}</span>
              </Button>

              <Button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                variant="outline"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 text-[#082033] hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
              >
                <ImageIcon className="w-4 h-4 text-[#003f78]" />
                <span>Pilih Galeri</span>
              </Button>
            </div>
            <p className="text-[11px] text-[#486275] text-center">
              Tag foto: <span className="font-semibold text-[#003f78]">{selectedPhotoArea}</span> ({uploadCategory === 'SKIVING' ? 'Setelah Skiving' : 'Kondisi Awal'})
            </p>
          </div>

          {/* Uploaded Thumbnails Split */}
          {(() => {
            const skivingList = photos.filter((p) => p.photoType === 'SKIVING');
            const initialList = photos.filter((p) => p.photoType !== 'SKIVING');

            return (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Skiving Photos List */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                    <span className="flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      Foto Setelah Skiving ({skivingList.length}):
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300 font-semibold">
                      PDF Priority
                    </span>
                  </div>

                  {skivingList.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {skivingList.map((photo) => (
                        <div
                          key={photo.id}
                          className="group relative rounded-xl border border-emerald-300 overflow-hidden bg-black aspect-4/3 shadow-2xs"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveUploadUrl(photo.photoUrl)}
                            alt={photo.photoArea}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5">
                            <span className="text-[10px] font-semibold text-white block truncate">
                              {photo.photoArea}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photo.id)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md active:scale-90"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2.5 rounded-lg text-center">
                      Belum ada foto setelah skiving. Ambil/pilih foto dengan tab &quot;Foto Skiving&quot;.
                    </p>
                  )}
                </div>

                {/* Initial Photos List */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Foto Kondisi Awal ({initialList.length}):
                  </span>

                  {initialList.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {initialList.map((photo) => (
                        <div
                          key={photo.id}
                          className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-4/3 shadow-2xs"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveUploadUrl(photo.photoUrl)}
                            alt={photo.photoArea}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5">
                            <span className="text-[10px] font-semibold text-white block truncate">
                              {photo.photoArea}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photo.id)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md active:scale-90"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2.5 rounded-lg text-center">
                      Tidak ada foto kondisi awal.
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Section 3: Tire Detail & Status */}
        <div className="bg-white p-4.5 rounded-[1.3rem] border border-slate-100 shadow-[0_12px_28px_rgba(8,32,51,0.06)] space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#082033]">
              3. Tire Detail & Status
            </h3>
          </div>

          {/* Tire Size with Search + Manual */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#486275]">
              Tire Size <span className="text-red-500">*</span>
            </label>
            <TireRepairSearchableSelect
              value={tireSize}
              onValueChange={(val) => {
                setTireSize(val);
                setIsCustomTireSize(false);
              }}
              options={sizeOptions}
              placeholder="Pilih Ukuran Tire"
              searchPlaceholder="Cari ukuran tire..."
              onAddNewManual={() => setCustomSizeModalOpen(true)}
              addNewManualLabel="+ Tambah Manual"
            />
          </div>

          {/* Serial Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#486275]">
              Serial Number <span className="text-red-500">*</span>
            </label>
            <Input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
              placeholder="Contoh: SN-889920"
              required
              className="h-11 rounded-xl bg-slate-50 border-slate-300 text-sm font-mono font-black uppercase tracking-wider text-[#082033]"
            />
          </div>

          {/* Brand & Type Construction */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#486275]">
                Brand
              </label>
              <TireRepairSearchableSelect
                value={brand}
                onValueChange={setBrand}
                options={brands}
                placeholder="Pilih Brand"
                searchPlaceholder="Cari brand tire..."
                onAddNewManual={() => setCustomBrandModalOpen(true)}
                addNewManualLabel="+ Tambah Manual"
                uppercase
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#486275]">
                Type Construction
              </label>
              <Select value={typeConstruction} onValueChange={setTypeConstruction}>
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs text-[#082033]">
                  <SelectValue placeholder="Pilih Tipe" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-[#082033]">
                  <SelectItem value="RADIAL">RADIAL</SelectItem>
                  <SelectItem value="BIAS">BIAS</SelectItem>
                  <SelectItem value="SOLID">SOLID</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pattern & Date Received */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#486275]">
                Pattern
              </label>
              <Input
                value={pattern}
                onChange={(e) => setPattern(e.target.value.toUpperCase())}
                placeholder="E4"
                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs uppercase text-[#082033]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#486275]">
                Date Received
              </label>
              <Input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs text-[#082033]"
              />
            </div>
          </div>

          {/* Customer (Full Width with Search) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#486275]">
              Customer <span className="text-red-500">*</span>
            </label>
            <TireRepairSearchableSelect
              value={customer}
              onValueChange={setCustomer}
              options={customerOptions}
              placeholder="Pilih Customer"
              searchPlaceholder="Cari nama customer..."
              onAddNewManual={() => setCustomCustomerModalOpen(true)}
              addNewManualLabel="+ Tambah Manual"
              uppercase
            />
          </div>

          {/* Site & Status Ban */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#486275]">
                Site
              </label>
              <TireRepairSearchableSelect
                value={customerSite}
                onValueChange={setCustomerSite}
                options={siteOptions}
                placeholder="Pilih Site"
                searchPlaceholder="Cari nama site..."
                onAddNewManual={() => setCustomSiteModalOpen(true)}
                addNewManualLabel="+ Tambah Manual"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#486275]">
                Status
              </label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-[#003f78]">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-[#082033]">
                  <SelectItem value="Repair">Repair</SelectItem>
                  <SelectItem value="Retread">Retread</SelectItem>
                  <SelectItem value="Reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scrap Reason jika status Reject */}
          {status === 'Reject' && (
            <div className="space-y-1.5 p-3 rounded-xl bg-red-50/70 border border-red-200/80">
              <label className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                <span>Alasan Reject / Scrap Ban</span>
                <span className="text-[10px] text-red-500 font-normal">(Wajib diisi)</span>
              </label>
              <Textarea
                value={scrapReason}
                onChange={(e) => setScrapReason(e.target.value)}
                placeholder="Contoh: Ply separator parah, bead kawat putus saat skiving..."
                rows={2}
                className="bg-white border-red-200 text-xs text-red-950 placeholder:text-red-300 resize-none rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-gradient-to-r from-[#003f78] to-[#0055a5] hover:from-[#003566] hover:to-[#004b87] text-white font-black rounded-xl shadow-lg shadow-[#003f78]/20 active:scale-[0.99] text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{editingId ? 'Memperbarui Inspeksi...' : 'Menyimpan Laporan...'}</span>
              </>
            ) : (
              <span>{editingId ? 'Perbarui Inspeksi Ban' : 'Simpan Laporan Inspeksi'}</span>
            )}
          </Button>
        </div>
      </form>

      {/* Modal Tambah Ukuran Tire Manual */}
      <Dialog open={customSizeModalOpen} onOpenChange={setCustomSizeModalOpen}>
        <DialogContent className="max-w-xs p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              Tambah Ukuran Tire Manual
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-xs text-slate-500">
              Masukkan ukuran tire:
            </label>
            <Input
              value={newCustomSizeInput}
              onChange={(e) => setNewCustomSizeInput(e.target.value)}
              placeholder="59/80R63"
              className="h-10 rounded-xl text-xs uppercase"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCustomSizeModalOpen(false)}
              className="flex-1 rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustomSize}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Brand Tire Manual */}
      <Dialog open={customBrandModalOpen} onOpenChange={setCustomBrandModalOpen}>
        <DialogContent className="max-w-xs p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              Tambah Brand Tire Manual
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-xs text-slate-500">
              Masukkan nama brand:
            </label>
            <Input
              value={newCustomBrandInput}
              onChange={(e) => setNewCustomBrandInput(e.target.value)}
              placeholder="CONTINENTAL"
              className="h-10 rounded-xl text-xs uppercase"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCustomBrandModalOpen(false)}
              className="flex-1 rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustomBrand}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Customer Manual */}
      <Dialog open={customCustomerModalOpen} onOpenChange={setCustomCustomerModalOpen}>
        <DialogContent className="max-w-xs p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              Tambah Customer Manual
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-xs text-slate-500">
              Masukkan nama customer:
            </label>
            <Input
              value={newCustomCustomerInput}
              onChange={(e) => setNewCustomCustomerInput(e.target.value)}
              placeholder="PT Kaltim Prima Coal"
              className="h-10 rounded-xl text-xs uppercase"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCustomCustomerModalOpen(false)}
              className="flex-1 rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustomCustomer}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Site Manual */}
      <Dialog open={customSiteModalOpen} onOpenChange={setCustomSiteModalOpen}>
        <DialogContent className="max-w-xs p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              Tambah Site Manual
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-xs text-slate-500">
              Masukkan nama site:
            </label>
            <Input
              value={newCustomSiteInput}
              onChange={(e) => setNewCustomSiteInput(e.target.value)}
              placeholder="Sangatta"
              className="h-10 rounded-xl text-xs"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCustomSiteModalOpen(false)}
              className="flex-1 rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustomSite}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Camera Viewfinder Modal */}
      <TireRepairCameraModal
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        onCapture={handleCameraCapture}
        areaTitle={selectedPhotoArea}
        onFallbackNative={() => cameraInputRef.current?.click()}
      />
    </div>
  );
}
