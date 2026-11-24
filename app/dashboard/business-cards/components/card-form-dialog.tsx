'use client';

import { businessCategoryOptions } from './scan-card-dialog';
import * as React from 'react';
import { HeroFormDialog, HeroFormField, HeroInput, HeroSearchableSelect, HeroTextarea } from '@/components/templates';
import { saveBusinessCardAction, type BusinessCardFormInput } from '@/app/actions/business-card';
import type { ExpoBusinessCard } from '@/db/schema/expo-business-cards';

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: ExpoBusinessCard | null;
  onSuccess?: () => void;
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

export function CardFormDialog({
  open,
  onOpenChange,
  card,
  onSuccess,
}: CardFormDialogProps) {
  const [formData, setFormData] = React.useState<BusinessCardFormInput>({
    expoName: '',
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    if (card) {
      setFormData({
        id: card.id,
        expoName: card.expoName || '',
        businessCategory: card.businessCategory,
        productsServices: card.productsServices,
        contactName: card.contactName || '',
        companyName: card.companyName || '',
        jobTitle: card.jobTitle || '',
        phoneNumber: card.phoneNumber || '',
        email: card.email || '',
        address: card.address || '',
        website: card.website || '',
        cardImageUrl: card.cardImageUrl || '',
        notes: card.notes || '',
        category: (card.category as any) || 'lead',
        rating: (card.rating as any) || 'warm',
      });
    } else {
      setFormData({
        expoName: '',
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
    }
    setErrorMsg('');
  }, [card, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactName.trim()) {
      setErrorMsg('Nama kontak wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await saveBusinessCardAction(formData);
      if (res.success) {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan kartu nama.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <HeroFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={card ? 'Ubah Data Kartu Nama' : 'Tambah Kartu Nama Manual'}
      description="Lengkapi informasi kontak dan catatan pertemuan expo di bawah ini."
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={card ? 'Simpan Perubahan' : 'Tambah Kontak'}
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <HeroFormField label="Nama Acara Expo / Event (opsional)">
            <HeroInput
              placeholder="Contoh: Mining Indonesia 2026"
              value={formData.expoName}
              onChange={(e) => setFormData({ ...formData, expoName: e.target.value })}
            />
          </HeroFormField>

          <HeroFormField label="Nama Lengkap Kontak" required>
            <HeroInput
              placeholder="Nama Kontak"
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
              placeholder="Contoh: Procurement Lead"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            />
          </HeroFormField>

          <HeroFormField label="Nomor WhatsApp / HP">
            <HeroInput
              placeholder="08123456789"
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

          <HeroFormField label="Prioritas (Rating)">
            <HeroSearchableSelect
              options={RATING_OPTIONS}
              value={formData.rating}
              onChange={(val) => setFormData({ ...formData, rating: (val as any) || 'warm' })}
              placeholder="Pilih Prioritas"
            />
          </HeroFormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <HeroFormField label="Website">
            <HeroInput
              placeholder="https://perusahaan.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </HeroFormField>

          <HeroFormField label="Alamat / Kota">
            <HeroInput
              placeholder="Kota / Alamat"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </HeroFormField>
        </div>

        <HeroFormField label="Catatan Pertemuan & Tindak Lanjut">
          <HeroTextarea
            placeholder="Poin penting diskusi, potensi order ban OTR, jadwal follow up..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </HeroFormField>
      </div>
    </HeroFormDialog>
  );
}
