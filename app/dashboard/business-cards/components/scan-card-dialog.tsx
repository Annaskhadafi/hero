'use client';

import * as React from 'react';
import { Camera, Upload, Sparkles, Loader2, Check, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroFormField, HeroInput, HeroSearchableSelect, HeroTextarea } from '@/components/templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { scanBusinessCardAction, saveBusinessCardAction, type BusinessCardFormInput } from '@/app/actions/business-card';
import { resolveUploadUrl } from '@/lib/resolve-upload-url';

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

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string>('');
  const [isScanning, setIsScanning] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const [formData, setFormData] = React.useState<BusinessCardFormInput>({
    expoName: initialExpoName,
    contactName: '',
    companyName: '',
    jobTitle: '',
    phoneNumber: '',
    email: '',
    address: '',
    website: '',
    cardImageUrl: '',
    notes: '',
    category: 'lead',
    rating: 'warm',
  });

  React.useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        expoName: prev.expoName || initialExpoName,
      }));
    } else {
      // Reset state on close
      setSelectedFile(null);
      setPreviewUrl('');
      setErrorMessage('');
    }
  }, [open, initialExpoName]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setErrorMessage('');

    // Trigger AI Scan automatically
    await processCardFile(file);
  };

  const processCardFile = async (file: File) => {
    setIsScanning(true);
    setErrorMessage('');

    try {
      const data = new FormData();
      data.append('file', file);
      const res = await scanBusinessCardAction(data);

      if (res.success && res.extracted) {
        setFormData((prev) => ({
          ...prev,
          contactName: res.extracted?.contactName || prev.contactName,
          companyName: res.extracted?.companyName || prev.companyName,
          jobTitle: res.extracted?.jobTitle || prev.jobTitle,
          phoneNumber: res.extracted?.phoneNumber || prev.phoneNumber,
          email: res.extracted?.email || prev.email,
          address: res.extracted?.address || prev.address,
          website: res.extracted?.website || prev.website,
          notes: res.extracted?.notes || prev.notes,
          category: res.extracted?.category || prev.category,
          rating: res.extracted?.rating || prev.rating,
          cardImageUrl: res.cardImageUrl || prev.cardImageUrl,
        }));
      } else {
        setErrorMessage(res.error || 'Gagal mengekstrak data dari kartu nama. Silakan lengkapi manual.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat memindai kartu nama.');
    } finally {
      setIsScanning(false);
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
            {previewUrl ? (
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
                        <Check className="size-3.5 text-emerald-600" />
                        <span>Foto siap & data berhasil diekstrak!</span>
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
            <HeroFormField label="Nama Acara Expo / Event" tooltip="Nama pameran tempat kartu ini didapat">
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
              disabled={isSaving || isScanning}
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
