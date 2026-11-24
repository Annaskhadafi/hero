'use client';

import * as React from 'react';
import { Camera, Upload, Sparkles, Loader2, Check, Move, ScanLine } from 'lucide-react';

const BUSINESS_CATEGORIES = ['Otomotif', 'Konstruksi', 'Pendidikan', 'Energi', 'Keuangan', 'Kesehatan', 'Manufaktur', 'Pertambangan', 'Ritel', 'Teknologi', 'Logistik', 'Lainnya'];

export function businessCategoryOptions(value?: string | null) {
  return [...new Set([...BUSINESS_CATEGORIES, ...(value ? [value] : [])])].map(label => ({ value: label, label }));
}

type CropRect = { x: number; y: number; width: number; height: number };

/** Pointer- and keyboard-operable crop rectangle; coordinates are normalized to the image. */
function CardCropper({ src, onCropChange }: { src: string; onCropChange: (crop: CropRect) => void }) {
  const [crop, setCrop] = React.useState<CropRect>({ x: 0.08, y: 0.18, width: 0.84, height: 0.64 });
  const stageRef = React.useRef<HTMLDivElement>(null);
  const gesture = React.useRef<{ startX: number; startY: number; crop: CropRect; mode: 'move' | 'resize' } | null>(null);
  const update = (next: CropRect) => {
    const width = Math.max(0.15, Math.min(1, next.width));
    const height = Math.max(0.15, Math.min(1, next.height));
    const bounded = { x: Math.max(0, Math.min(1 - width, next.x)), y: Math.max(0, Math.min(1 - height, next.y)), width, height };
    setCrop(bounded);
    onCropChange(bounded);
  };
  const handlePointerDown = (event: React.PointerEvent, mode: 'move' | 'resize') => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { startX: event.clientX, startY: event.clientY, crop, mode };
  };
  const handlePointerMove = (event: React.PointerEvent) => {
    if (!gesture.current || !stageRef.current) return;
    const bounds = stageRef.current.getBoundingClientRect();
    const dx = (event.clientX - gesture.current.startX) / bounds.width;
    const dy = (event.clientY - gesture.current.startY) / bounds.height;
    const start = gesture.current.crop;
    update(gesture.current.mode === 'move'
      ? { ...start, x: start.x + dx, y: start.y + dy }
      : { ...start, width: start.width + dx, height: start.height + dy });
  };
  const keyboardAdjust = (event: React.KeyboardEvent, mode: 'move' | 'resize') => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.05 : 0.01;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    update(mode === 'move' ? { ...crop, x: crop.x + dx, y: crop.y + dy } : { ...crop, width: crop.width + dx, height: crop.height + dy });
  };
  return <div className="space-y-2">
    <div ref={stageRef} className="relative mx-auto w-fit max-w-full overflow-hidden rounded-lg bg-slate-950 touch-none select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt="Source business card for cropping" className="block max-h-[38vh] max-w-full w-auto h-auto" draggable={false} />
      <div role="group" tabIndex={0} onKeyDown={(e) => keyboardAdjust(e, 'move')} onPointerDown={(e) => handlePointerDown(e, 'move')} onPointerMove={handlePointerMove} onPointerUp={() => { gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }} className="absolute cursor-move border-2 border-blue-400 bg-blue-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }} aria-label="Geser bingkai potong">
        <span className="absolute left-1 top-1 rounded bg-slate-950/70 px-1.5 py-1 text-[10px] text-white"><Move className="inline size-3 mr-1"/>Geser</span>
        <button type="button" aria-label="Ubah ukuran bingkai potong" onKeyDown={(e) => { e.stopPropagation(); keyboardAdjust(e, 'resize'); }} onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize'); }} onPointerMove={handlePointerMove} onPointerUp={() => { gesture.current = null; }} className="absolute bottom-0 right-0 size-11 cursor-se-resize rounded-tl-lg bg-blue-600 text-white touch-none"><ScanLine className="mx-auto size-4"/></button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Geser bingkai atau tarik sudut kanan bawah untuk mengubah ukuran. Gunakan tombol panah jika memakai keyboard.</p>
  </div>;
}

function cropImageBlob(image: HTMLImageElement, crop: CropRect): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const width = Math.max(1, Math.floor(image.naturalWidth * crop.width));
  const height = Math.max(1, Math.floor(image.naturalHeight * crop.height));
  const scale = Math.min(1, 1800 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Canvas is unavailable.'));
  context.drawImage(image, Math.floor(image.naturalWidth * crop.x), Math.floor(image.naturalHeight * crop.y), width, height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to create cropped image.')), 'image/jpeg', 0.92));
}
import { Button } from '@/components/ui/button';
import { HeroFormField, HeroInput, HeroSearchableSelect, HeroTextarea } from '@/components/templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { scanBusinessCardAction, saveBusinessCardAction, type BusinessCardFormInput } from '@/app/actions/business-card';

interface ScanCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialExpoName?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'lead', label: 'Potensial Lead' },
  { value: 'client', label: 'Client / Pelanggan' },
  { value: 'vendor', label: 'Vendor / Supplier' },
  { value: 'partner', label: 'Mitra Bisnis' },
  { value: 'other', label: 'Lainnya' },
];

const RATING_OPTIONS = [
  { value: 'hot', label: '🔥 Hot Lead (Tindak Lanjut Cepat)' },
  { value: 'warm', label: '⚡ Warm Lead (Tertarik)' },
  { value: 'cold', label: '❄️ Cold Lead (Informasi Awal)' },
];

export function ScanCardDialog({
  open,
  onOpenChange,
  onSuccess,
  initialExpoName = '',
}: ScanCardDialogProps) {
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const generation = React.useRef(0);
  const [sourceUrl, setSourceUrl] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [crop, setCrop] = React.useState<CropRect>({ x: 0.08, y: 0.18, width: 0.84, height: 0.64 });
  const [scanStatus, setScanStatus] = React.useState('');
  const [isScanning, setIsScanning] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const emptyForm = React.useCallback((): BusinessCardFormInput => ({
    expoName: initialExpoName, contactName: '', companyName: '', jobTitle: '', phoneNumber: '',
    email: '', address: '', website: '', cardImageUrl: '', notes: '', category: 'lead', rating: 'warm',
  }), [initialExpoName]);
  const [formData, setFormData] = React.useState(emptyForm);
  React.useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);
  React.useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  React.useEffect(() => {
    if (!open) {
      generation.current++;
      setSourceUrl('');
      setPreviewUrl('');
      setIsScanning(false);
      setErrorMessage('');
      setScanStatus('');
      setFormData(emptyForm());
    }
  }, [open, emptyForm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    generation.current++;
    setSourceUrl(URL.createObjectURL(file));
    setPreviewUrl('');
    setFormData(prev => ({ ...emptyForm(), expoName: prev.expoName, notes: prev.notes }));
    setCrop({ x: 0.08, y: 0.18, width: 0.84, height: 0.64 });
    setErrorMessage('');
    setScanStatus('');
  };

  const confirmCrop = async () => {
    const request = ++generation.current;
    setIsScanning(true);
    setErrorMessage('');
    let phase: 'crop' | 'request' = 'crop';
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      const blob = await cropImageBlob(image, crop);
      if (generation.current !== request) return;
      const data = new FormData();
      data.append('file', new File([blob], 'business-card.jpg', { type: 'image/jpeg' }));
      phase = 'request';
      const result = await scanBusinessCardAction(data);
      if (generation.current !== request) return;
      if (result.cardImageUrl) {
        setPreviewUrl(URL.createObjectURL(blob));
        setSourceUrl('');
        setFormData(prev => ({ ...prev, ...(result.extracted ?? {}), cardImageUrl: result.cardImageUrl! }));
      }
      if (result.success && result.extracted) setScanStatus('Data berhasil diekstrak. Periksa sebelum menyimpan.');
      else setErrorMessage(result.extractionFailed ? 'Ekstraksi otomatis gagal. Silakan isi data secara manual.' : result.error || 'Gagal memproses foto.');
    } catch {
      if (generation.current === request) setErrorMessage(phase === 'crop'
        ? 'Foto tidak bisa dipotong di perangkat ini. Coba pilih foto lain.'
        : 'Tidak mendapat respons dari server. Coba pindai lagi; hasil potong tetap tersedia.');
    } finally {
      if (generation.current === request) setIsScanning(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactName.trim()) {
      setErrorMessage('Nama kontak wajib diisi.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const res = await saveBusinessCardAction(formData);
      if (res.success) {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Gagal menyimpan kartu nama.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex items-center justify-center size-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Camera className="size-4" />
            </span>
            Scan & Simpan Kartu Nama Expo
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Ambil foto kartu nama dengan kamera HP atau unggah file. Vision AI akan mengekstrak data secara otomatis.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <form onSubmit={handleSave} className="space-y-5">
          {/* Capture Trigger Area */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
            {sourceUrl ? (
              <div className="space-y-3">
                <CardCropper key={sourceUrl} src={sourceUrl} onCropChange={setCrop} />
                <Button type="button" className="h-9" disabled={isScanning} onClick={() => void confirmCrop()}>{isScanning ? 'Menganalisis…' : 'Potong & Pindai'}</Button>
                <Button type="button" variant="outline" className="ms-2 h-9" disabled={isScanning} onClick={() => fileInputRef.current?.click()}>Ganti Berkas</Button>
              </div>
            ) : previewUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative size-32 rounded-lg border border-slate-200 overflow-hidden bg-black shrink-0 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview Kartu Nama"
                    className="w-full h-full object-contain"
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 text-white">
                      <Loader2 className="size-5 animate-spin text-blue-400" />
                      <span className="text-[10px] font-medium">Menganalisis...</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="text-xs font-semibold text-slate-800 flex items-center justify-center sm:justify-start gap-1.5">
                    {isScanning ? (
                      <>
                        <Sparkles className="size-3.5 text-amber-500 animate-pulse" />
                        <span>Vision AI sedang mengekstrak teks kartu nama...</span>
                      </>
                    ) : (
                      <>
                        {scanStatus && <Check className="size-3.5 text-emerald-600" />}
                        <span>{scanStatus || 'Foto tersimpan. Lengkapi data secara manual.'}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Anda dapat memeriksa dan mengoreksi data pada form di bawah sebelum disimpan.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                      className="h-8 text-xs gap-1"
                    >
                      <Camera className="size-3.5" />
                      Foto Ulang
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs gap-1"
                    >
                      <Upload className="size-3.5" />
                      Ganti Berkas
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <div className="size-12 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center shadow-xs">
                  <Camera className="size-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Pindai Kartu Nama Fisik</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gunakan kamera smartphone untuk jepret langsung atau pilih gambar dari galeri.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <Button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4"
                  >
                    <Camera className="size-4" />
                    Buka Kamera Langsung
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 gap-1.5 font-medium text-xs px-4"
                  >
                    <Upload className="size-4" />
                    Pilih File Gambar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Form Fields: Editable after AI extraction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <HeroFormField label="Nama Acara Expo / Event (opsional)" tooltip="Nama pameran tempat kartu ini didapat">
              <HeroInput
                placeholder="Contoh: Mining Indonesia 2026"
                value={formData.expoName}
                onChange={(e) => setFormData({ ...formData, expoName: e.target.value })}
              />
            </HeroFormField>

            <HeroFormField label="Nama Lengkap Kontak" required tooltip="Nama pemegang kartu nama">
              <HeroInput
                placeholder="Nama Lengkap"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              />
            </HeroFormField>

            <HeroFormField label="Perusahaan / Instansi">
              <HeroInput
                placeholder="Nama Perusahaan"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </HeroFormField>

            <HeroFormField label="Jabatan / Posisi">
              <HeroInput
                placeholder="Contoh: Procurement Manager"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              />
            </HeroFormField>

            <HeroFormField label="Nomor WhatsApp / HP">
              <HeroInput
                placeholder="08123456789 atau +628..."
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </HeroFormField>

            <HeroFormField label="Alamat Email">
              <HeroInput
                type="email"
                placeholder="kontak@perusahaan.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </HeroFormField>

            <HeroFormField label="Website / Situs Web">
              <HeroInput
                placeholder="https://perusahaan.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </HeroFormField>

            <HeroFormField label="Kategori Usaha">
              <HeroSearchableSelect options={businessCategoryOptions(formData.businessCategory)} value={formData.businessCategory || ''}
                onChange={value => setFormData(prev => ({ ...prev, businessCategory: typeof value === 'string' ? value : '' }))} placeholder="Pilih Kategori Usaha" />
            </HeroFormField>
            <HeroFormField label="Produk / Layanan">
              <HeroInput placeholder="Produk atau layanan perusahaan" value={formData.productsServices ?? ''}
                onChange={e => setFormData(prev => ({ ...prev, productsServices: e.target.value }))} />
            </HeroFormField>
            <HeroFormField label="Kategori Kontak">
              <HeroSearchableSelect
                options={CATEGORY_OPTIONS}
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: (val as any) || 'lead' })}
                placeholder="Pilih Kategori"
              />
            </HeroFormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <HeroFormField label="Tingkat Prioritas (Rating)">
              <HeroSearchableSelect
                options={RATING_OPTIONS}
                value={formData.rating}
                onChange={(val) => setFormData({ ...formData, rating: (val as any) || 'warm' })}
                placeholder="Pilih Prioritas"
              />
            </HeroFormField>

            <HeroFormField label="Alamat / Kota">
              <HeroInput
                placeholder="Kota atau alamat lengkap"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </HeroFormField>
          </div>

          <HeroFormField label="Catatan Obrolan / Potensi Kerjasama">
            <HeroTextarea
              placeholder="Tuliskan poin penting obrolan, peluang proyek, atau instruksi tindak lanjut saat di expo..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </HeroFormField>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 font-medium"
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5"
              disabled={isSaving || isScanning || Boolean(sourceUrl)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  <span>Simpan Kartu Nama</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
