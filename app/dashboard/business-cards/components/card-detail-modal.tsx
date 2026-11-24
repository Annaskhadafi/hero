'use client';

import * as React from 'react';
import {
  MessageCircle,
  Mail,
  Globe,
  MapPin,
  Calendar,
  Building,
  User,
  Phone,
  FileText,
  ExternalLink,
  Edit2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroDetailModal, HeroStatusBadge } from '@/components/templates';
import type { ExpoBusinessCard } from '@/db/schema/expo-business-cards';
import { resolveUploadUrl } from '@/lib/resolve-upload-url';

interface CardDetailModalProps {
  card: ExpoBusinessCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (card: ExpoBusinessCard) => void;
}

export function CardDetailModal({
  card,
  open,
  onOpenChange,
  onEdit,
}: CardDetailModalProps) {
  if (!card) return null;

  const cleanPhoneForWa = (phone: string) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = '62' + digits.slice(1);
    }
    return digits;
  };

  const waNumber = card.phoneNumber ? cleanPhoneForWa(card.phoneNumber) : '';
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=Halo%20${encodeURIComponent(card.contactName)},%20senang%20bisa%20berkenalan%20di%20${encodeURIComponent(card.expoName || 'Expo')}.` : '';
  const mailtoUrl = card.email ? `mailto:${card.email}?subject=Follow-up%20Pertemuan%20di%20${encodeURIComponent(card.expoName || 'Expo')}` : '';
  const webUrl = card.website ? (card.website.startsWith('http') ? card.website : `https://${card.website}`) : '';

  const ratingTone =
    card.rating === 'hot'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : card.rating === 'warm'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';

  const ratingLabel =
    card.rating === 'hot'
      ? '🔥 Hot Lead'
      : card.rating === 'warm'
      ? '⚡ Warm Lead'
      : '❄️ Cold Lead';

  const categoryLabel =
    card.category === 'client'
      ? 'Client / Pelanggan'
      : card.category === 'vendor'
      ? 'Vendor / Supplier'
      : card.category === 'partner'
      ? 'Mitra Bisnis'
      : 'Potensial Lead';

  const resolvedImage = card.cardImageUrl ? resolveUploadUrl(card.cardImageUrl) : '';

  return (
    <HeroDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={card.contactName}
      subtitle={`${card.companyName ? card.companyName + ' • ' : ''}${card.jobTitle || 'Kontak Expo'}`}
      statusBadge={
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${ratingTone}`}>
            {ratingLabel}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {categoryLabel}
          </span>
        </div>
      }
      onEdit={onEdit ? () => onEdit(card) : undefined}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
        {/* Left Column: Business Card Image Preview */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Dokumen Foto Kartu Nama
          </h4>
          <div className="relative aspect-[16/10] w-full rounded-xl border border-slate-200 bg-slate-900 overflow-hidden shadow-sm flex items-center justify-center">
            {resolvedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedImage}
                alt={`Kartu Nama ${card.contactName}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-2">
                <FileText className="size-10 mx-auto opacity-50" />
                <p className="text-xs">Foto kartu nama tidak dilampirkan atau dimasukkan secara manual</p>
              </div>
            )}
          </div>

          {resolvedImage && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Resolusi penuh tersimpan di S3</span>
              <a
                href={resolvedImage}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-medium"
              >
                Buka Ukuran Penuh
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <h5 className="text-xs font-bold text-slate-700">Tindakan Cepat (Quick Actions)</h5>
            <div className="flex flex-wrap gap-2">
              {waUrl ? (
                <a href={waUrl} target="_blank" rel="noreferrer" className="flex-1 min-w-[140px]">
                  <Button
                    variant="default"
                    className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs gap-1.5"
                  >
                    <MessageCircle className="size-4" />
                    Chat WhatsApp
                  </Button>
                </a>
              ) : null}

              {mailtoUrl ? (
                <a href={mailtoUrl} className="flex-1 min-w-[140px]">
                  <Button
                    variant="outline"
                    className="w-full h-9 border-slate-300 text-slate-800 font-medium text-xs gap-1.5"
                  >
                    <Mail className="size-4 text-blue-600" />
                    Kirim Email
                  </Button>
                </a>
              ) : null}

              {webUrl ? (
                <a href={webUrl} target="_blank" rel="noreferrer" className="flex-1 min-w-[120px]">
                  <Button
                    variant="outline"
                    className="w-full h-9 border-slate-300 text-slate-800 font-medium text-xs gap-1.5"
                  >
                    <Globe className="size-4 text-slate-600" />
                    Website
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Column: Structured Information */}
        <div className="lg:col-span-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Detail Informasi Kontak
          </h4>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 text-xs shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                <User className="size-4" />
              </span>
              <div>
                <span className="text-slate-400 text-[11px]">Nama & Jabatan</span>
                <p className="font-bold text-slate-900 text-sm">{card.contactName}</p>
                <p className="text-slate-600">{card.jobTitle || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                <Building className="size-4" />
              </span>
              <div>
                <span className="text-slate-400 text-[11px]">Perusahaan / Instansi</span>
                <p className="font-semibold text-slate-900">{card.companyName || '-'}</p>
                {card.businessCategory && <p>Kategori Usaha: {card.businessCategory}</p>}
                {card.productsServices && <p>Produk / Layanan: {card.productsServices}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div className="flex items-start gap-2.5">
                <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
                  <Phone className="size-3.5" />
                </span>
                <div>
                  <span className="text-slate-400 text-[11px]">Telepon / HP</span>
                  <p className="font-mono font-medium text-slate-900">{card.phoneNumber || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="p-1.5 rounded-md bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                  <Mail className="size-3.5" />
                </span>
                <div>
                  <span className="text-slate-400 text-[11px]">Email</span>
                  <p className="font-medium text-slate-900 break-all">{card.email || '-'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div className="flex items-start gap-2.5">
                <span className="p-1.5 rounded-md bg-purple-50 text-purple-600 shrink-0 mt-0.5">
                  <Calendar className="size-3.5" />
                </span>
                <div>
                  <span className="text-slate-400 text-[11px]">Nama Expo / Event</span>
                  <p className="font-medium text-slate-900">{card.expoName || 'Umum'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="p-1.5 rounded-md bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                  <MapPin className="size-3.5" />
                </span>
                <div>
                  <span className="text-slate-400 text-[11px]">Lokasi / Alamat</span>
                  <p className="font-medium text-slate-900">{card.address || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes / Follow-up Discussion */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="size-3.5 text-blue-600" />
              Catatan Pertemuan & Potensi Kerjasama
            </span>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {card.notes || 'Belum ada catatan khusus untuk kontak ini.'}
            </p>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Dibuat oleh: {card.createdByName || 'Sistem'}</span>
            <span>
              {new Date(card.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>
    </HeroDetailModal>
  );
}
