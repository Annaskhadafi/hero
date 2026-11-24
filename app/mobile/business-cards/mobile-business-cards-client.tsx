'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Camera,
  Search,
  MessageCircle,
  Mail,
  Building,
  Calendar,
  Sparkles,
  Flame,
  Plus,
  RefreshCw,
  ExternalLink,
  Phone,
  Image as ImageIcon,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { ExpoBusinessCard } from '@/db/schema/expo-business-cards';
import { resolveUploadUrl } from '@/lib/resolve-upload-url';
import { getBusinessCardsAction } from '@/app/actions/business-card';
import { ScanCardDialog } from '@/app/dashboard/business-cards/components/scan-card-dialog';
import { CardDetailModal } from '@/app/dashboard/business-cards/components/card-detail-modal';
import { CardFormDialog } from '@/app/dashboard/business-cards/components/card-form-dialog';

interface MobileBusinessCardsClientProps {
  initialCards: ExpoBusinessCard[];
}

export function MobileBusinessCardsClient({ initialCards }: MobileBusinessCardsClientProps) {
  const [cards, setCards] = React.useState<ExpoBusinessCard[]>(initialCards);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'hot' | 'warm' | 'partner'>('all');
  const [isLoading, setIsLoading] = React.useState(false);

  // Dialog states
  const [isScanOpen, setIsScanOpen] = React.useState(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedCard, setSelectedCard] = React.useState<ExpoBusinessCard | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getBusinessCardsAction();
      if (res.success && res.data) {
        setCards(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh cards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCards = React.useMemo(() => {
    return cards.filter((card) => {
      // 1. Filter by category/rating pill
      if (activeFilter === 'hot' && card.rating !== 'hot') return false;
      if (activeFilter === 'warm' && card.rating !== 'warm') return false;
      if (activeFilter === 'partner' && card.category !== 'partner' && card.category !== 'vendor') return false;

      // 2. Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = card.contactName?.toLowerCase().includes(q);
        const matchCompany = card.companyName?.toLowerCase().includes(q);
        const matchTitle = card.jobTitle?.toLowerCase().includes(q);
        const matchExpo = card.expoName?.toLowerCase().includes(q);
        const matchPhone = card.phoneNumber?.toLowerCase().includes(q);
        return matchName || matchCompany || matchTitle || matchExpo || matchPhone;
      }

      return true;
    });
  }, [cards, activeFilter, searchQuery]);

  const totalCards = cards.length;
  const hotLeads = cards.filter((c) => c.rating === 'hot').length;
  const warmLeads = cards.filter((c) => c.rating === 'warm').length;

  const cleanPhoneForWa = (phone: string) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    return digits;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 text-slate-800">
      {/* Top Header Mobile */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-[#003461] to-[#082033] text-white px-4 pt-3 pb-4 shadow-md">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <Link
              href="/mobile/dashboard"
              className="p-1.5 rounded-lg bg-white/10 active:scale-95 transition-transform"
            >
              <ArrowLeft className="size-5 text-white" />
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-wider uppercase text-sky-300">
                Marketing & Expo
              </p>
              <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                Business Card Scanner
              </h1>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            className="size-8 text-white/80 hover:text-white hover:bg-white/10"
            disabled={isLoading}
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Quick Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, perusahaan, no HP, event..."
            className="h-9 pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs rounded-xl focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 transition-colors"
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Prominent Scan CTA Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white shadow-md flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-200">
              <Sparkles className="size-3.5" />
              Vision AI Auto-Extraction
            </span>
            <h3 className="text-sm font-bold leading-tight">Sedang di Venue Expo?</h3>
            <p className="text-[11px] text-blue-100/90 leading-snug">
              Jepret kartu nama fisik dan simpan kontak langsung ke sistem.
            </p>
          </div>
          <Button
            onClick={() => setIsScanOpen(true)}
            className="h-10 px-4 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shrink-0 shadow-xs flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Camera className="size-4 text-blue-600" />
            <span>Scan Sekarang</span>
          </Button>
        </div>

        {/* KPI Metric Pills */}
        <div className="grid grid-cols-3 gap-2">
          <div
            onClick={() => setActiveFilter('all')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200/80'
            }`}
          >
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total</p>
            <p className="text-lg font-black text-slate-900 leading-none mt-1">{totalCards}</p>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Kontak</span>
          </div>

          <div
            onClick={() => setActiveFilter('hot')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'hot'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                : 'bg-white border-slate-200/80'
            }`}
          >
            <p className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-0.5">
              <Flame className="size-3 text-rose-500" />
              Hot
            </p>
            <p className="text-lg font-black text-rose-700 leading-none mt-1">{hotLeads}</p>
            <span className="text-[9px] text-rose-500/80 mt-0.5 block">Prioritas</span>
          </div>

          <div
            onClick={() => setActiveFilter('warm')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'warm'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200/80'
            }`}
          >
            <p className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-0.5">
              <Sparkles className="size-3 text-amber-500" />
              Warm
            </p>
            <p className="text-lg font-black text-amber-700 leading-none mt-1">{warmLeads}</p>
            <span className="text-[9px] text-amber-600/80 mt-0.5 block">Potensial</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs shrink-0 transition-colors ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Semua ({totalCards})
          </button>
          <button
            onClick={() => setActiveFilter('hot')}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs shrink-0 transition-colors ${
              activeFilter === 'hot'
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            🔥 Hot Leads ({hotLeads})
          </button>
          <button
            onClick={() => setActiveFilter('warm')}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs shrink-0 transition-colors ${
              activeFilter === 'warm'
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            ⚡ Warm Leads ({warmLeads})
          </button>
          <button
            onClick={() => setActiveFilter('partner')}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs shrink-0 transition-colors ${
              activeFilter === 'partner'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            🏢 Mitra / Vendor
          </button>
        </div>

        {/* Contact Cards List */}
        <div className="space-y-3">
          {filteredCards.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
              <div className="size-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Camera className="size-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">Belum Ada Kartu Nama</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchQuery
                  ? `Tidak ada kontak yang cocok dengan "${searchQuery}".`
                  : 'Mulai jepret kartu nama orang saat di expo untuk menyimpan kontak.'}
              </p>
              <Button
                onClick={() => setIsScanOpen(true)}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl gap-1.5 mt-1"
              >
                <Camera className="size-3.5" />
                Scan Kartu Nama
              </Button>
            </div>
          ) : (
            filteredCards.map((card) => {
              const imgUrl = card.cardImageUrl ? resolveUploadUrl(card.cardImageUrl) : '';
              const waDigits = card.phoneNumber ? cleanPhoneForWa(card.phoneNumber) : '';
              const waUrl = waDigits
                ? `https://wa.me/${waDigits}?text=Halo%20${encodeURIComponent(card.contactName)},%20senang%20bisa%20berkenalan%20di%20${encodeURIComponent(card.expoName || 'Expo')}.`
                : '';

              const ratingBadge =
                card.rating === 'hot'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : card.rating === 'warm'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200';

              return (
                <div
                  key={card.id}
                  className="rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-xs space-y-3 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div
                      onClick={() => {
                        setSelectedCard(card);
                        setIsDetailOpen(true);
                      }}
                      className="size-16 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                    >
                      {imgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgUrl} alt={card.contactName} className="size-full object-cover" />
                      ) : (
                        <ImageIcon className="size-6 text-slate-400" />
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          onClick={() => {
                            setSelectedCard(card);
                            setIsDetailOpen(true);
                          }}
                          className="font-bold text-slate-900 text-sm truncate cursor-pointer hover:text-blue-600"
                        >
                          {card.contactName}
                        </h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${ratingBadge}`}>
                          {card.rating === 'hot' ? '🔥 Hot' : card.rating === 'warm' ? '⚡ Warm' : '❄️ Cold'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 truncate mt-0.5">{card.jobTitle || 'Kontak'}</p>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium truncate mt-1">
                        <Building className="size-3 text-slate-400 shrink-0" />
                        <span className="truncate">{card.companyName || 'Perusahaan tidak tertera'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata & Event Badge */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                      <Calendar className="size-3 text-slate-400" />
                      {card.expoName || 'Expo Umum'}
                    </span>

                    <span className="text-slate-400 text-[10px] font-mono">
                      {new Date(card.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  {/* Mobile Quick Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {waUrl ? (
                      <a href={waUrl} target="_blank" rel="noreferrer" className="w-full">
                        <Button
                          size="sm"
                          className="w-full h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1"
                        >
                          <MessageCircle className="size-3.5" />
                          WhatsApp
                        </Button>
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        disabled
                        className="w-full h-8 text-[11px] font-bold bg-slate-100 text-slate-400 rounded-lg gap-1"
                      >
                        <MessageCircle className="size-3.5" />
                        WhatsApp
                      </Button>
                    )}

                    {card.email ? (
                      <a href={`mailto:${card.email}`} className="w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-[11px] font-bold border-slate-200 text-slate-700 rounded-lg gap-1"
                        >
                          <Mail className="size-3.5 text-blue-600" />
                          Email
                        </Button>
                      </a>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="w-full h-8 text-[11px] font-bold border-slate-200 text-slate-400 rounded-lg gap-1"
                      >
                        <Mail className="size-3.5" />
                        Email
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedCard(card);
                        setIsDetailOpen(true);
                      }}
                      className="w-full h-8 text-[11px] font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg"
                    >
                      Detail
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) on Mobile */}
      <div className="fixed bottom-6 right-5 z-40">
        <Button
          onClick={() => setIsScanOpen(true)}
          className="size-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center p-0 active:scale-95 transition-transform ring-4 ring-blue-500/20"
        >
          <Camera className="size-6" />
        </Button>
      </div>

      {/* Modals */}
      <ScanCardDialog
        open={isScanOpen}
        onOpenChange={setIsScanOpen}
        onSuccess={loadData}
      />

      <CardDetailModal
        card={selectedCard}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={(card) => {
          setIsDetailOpen(false);
          setSelectedCard(card);
          setIsFormOpen(true);
        }}
      />

      <CardFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        card={selectedCard}
        onSuccess={loadData}
      />
    </div>
  );
}
