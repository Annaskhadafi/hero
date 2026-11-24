'use client';

import * as React from 'react';
import {
  Camera,
  Plus,
  RefreshCw,
  Search,
  MessageCircle,
  Mail,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Eye,
  Building,
  User,
  Flame,
  Award,
  Sparkles,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { AdminPageShell } from '@/components/admin-page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  HeroDataTable,
  HeroKpiCard,
  HeroConfirmDialog,
  type HeroColumnDef,
  type HeroTableFilter,
} from '@/components/templates';
import {
  getBusinessCardsAction,
  deleteBusinessCardAction,
} from '@/app/actions/business-card';
import type { ExpoBusinessCard } from '@/db/schema/expo-business-cards';
import { resolveUploadUrl } from '@/lib/resolve-upload-url';
import { ScanCardDialog } from './components/scan-card-dialog';
import { CardDetailModal } from './components/card-detail-modal';
import { CardFormDialog } from './components/card-form-dialog';

export function BusinessCardsClient({ canEdit, canDelete }: { canEdit: boolean; canDelete: boolean }) {
  const [cards, setCards] = React.useState<ExpoBusinessCard[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Modal dialog states
  const [isScanOpen, setIsScanOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const [selectedCard, setSelectedCard] = React.useState<ExpoBusinessCard | null>(null);
  const [cardToDelete, setCardToDelete] = React.useState<ExpoBusinessCard | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const loadCards = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getBusinessCardsAction();
      if (res.success && res.data) {
        setCards(res.data);
      }
    } catch (err) {
      console.error('Failed to load business cards:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleDeleteConfirm = async () => {
    if (!cardToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteBusinessCardAction(cardToDelete.id);
      if (res.success) {
        setIsDeleteOpen(false);
        setCardToDelete(null);
        await loadCards();
      }
    } catch (err) {
      console.error('Failed to delete card:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // KPI Calculations
  const totalCards = cards.length;
  const hotLeads = cards.filter((c) => c.rating === 'hot').length;
  const warmLeads = cards.filter((c) => c.rating === 'warm').length;
  const partnersVendors = cards.filter((c) => c.category === 'partner' || c.category === 'vendor').length;

  // Extract unique expo names for filters
  const uniqueExpos = React.useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => {
      if (c.expoName?.trim()) set.add(c.expoName.trim());
    });
    return Array.from(set).map((expo) => ({ value: expo, label: expo }));
  }, [cards]);

  const columns: HeroColumnDef<ExpoBusinessCard>[] = [
    {
      key: 'cardImageUrl',
      header: 'Kartu',
      width: '64px',
      align: 'center',
      render: (row) => {
        const imgUrl = row.cardImageUrl ? resolveUploadUrl(row.cardImageUrl) : '';
        return (
          <div
            className="size-10 rounded-md border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
            onClick={() => {
              setSelectedCard(row);
              setIsDetailOpen(true);
            }}
          >
            {imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgUrl} alt={row.contactName} className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-4 text-slate-400" />
            )}
          </div>
        );
      },
    },
    {
      key: 'contactName',
      header: 'Kontak & Perusahaan',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span
            className="font-bold text-slate-900 text-xs hover:text-blue-600 cursor-pointer"
            onClick={() => {
              setSelectedCard(row);
              setIsDetailOpen(true);
            }}
          >
            {row.contactName}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {row.companyName || 'Individu'}
          </span>
        </div>
      ),
      exportValue: (row) => `${row.contactName} (${row.companyName || '-'})`,
    },
    {
      key: 'jobTitle',
      header: 'Jabatan / Posisi',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium">
          {row.jobTitle || '-'}
        </span>
      ),
      exportValue: (row) => row.jobTitle || '-',
    },
    {
      key: 'phoneNumber',
      header: 'WhatsApp / Telepon',
      render: (row) => {
        if (!row.phoneNumber) return <span className="text-slate-400 text-xs">-</span>;
        let cleanDigits = row.phoneNumber.replace(/\D/g, '');
        if (cleanDigits.startsWith('0')) cleanDigits = '62' + cleanDigits.slice(1);
        const waLink = `https://wa.me/${cleanDigits}?text=Halo%20${encodeURIComponent(row.contactName)}`;

        return (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-mono font-medium hover:underline"
          >
            <MessageCircle className="size-3.5 text-emerald-600 shrink-0" />
            <span>{row.phoneNumber}</span>
          </a>
        );
      },
      exportValue: (row) => row.phoneNumber || '-',
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => {
        if (!row.email) return <span className="text-slate-400 text-xs">-</span>;
        return (
          <a
            href={`mailto:${row.email}`}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            <Mail className="size-3 text-blue-500 shrink-0" />
            <span className="truncate max-w-[150px]">{row.email}</span>
          </a>
        );
      },
      exportValue: (row) => row.email || '-',
    },
    {
      key: 'expoName',
      header: 'Event Expo',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {row.expoName || 'Umum'}
        </span>
      ),
      exportValue: (row) => row.expoName || 'Umum',
    },
    {
      key: 'rating',
      header: 'Prioritas',
      sortable: true,
      align: 'center',
      render: (row) => {
        const badgeStyle =
          row.rating === 'hot'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : row.rating === 'warm'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-slate-50 text-slate-700 border-slate-200';

        const label =
          row.rating === 'hot' ? '🔥 Hot' : row.rating === 'warm' ? '⚡ Warm' : '❄️ Cold';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeStyle}`}>
            {label}
          </span>
        );
      },
      exportValue: (row) => row.rating,
    },
    {
      key: 'createdAt',
      header: 'Tanggal Scan',
      sortable: true,
      align: 'center',
      render: (row) => (
        <span className="text-[11px] text-slate-500 font-mono">
          {new Date(row.createdAt).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
      exportValue: (row) => new Date(row.createdAt).toISOString(),
    },
  ];

  const filters: HeroTableFilter[] = [
    {
      key: 'expoName',
      label: 'Event Expo',
      isMulti: true,
      options: uniqueExpos,
    },
    {
      key: 'rating',
      label: 'Prioritas (Rating)',
      isMulti: true,
      options: [
        { value: 'hot', label: '🔥 Hot Lead' },
        { value: 'warm', label: '⚡ Warm Lead' },
        { value: 'cold', label: '❄️ Cold Lead' },
      ],
    },
    {
      key: 'category',
      label: 'Kategori Kontak',
      isMulti: true,
      options: [
        { value: 'lead', label: 'Potensial Lead' },
        { value: 'client', label: 'Client / Pelanggan' },
        { value: 'vendor', label: 'Vendor / Supplier' },
        { value: 'partner', label: 'Mitra Bisnis' },
        { value: 'other', label: 'Lainnya' },
      ],
    },
  ];

  return (
    <AdminPageShell
      title="Business Card Scanner (Expo & Event)"
      description="Pindai kartu nama fisik saat expo, ekstraksi otomatis dengan Vision AI, dan kelola direktori kontak terstruktur."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="dense"
            onClick={loadCards}
            className="h-9 gap-1.5 font-medium"
            disabled={isLoading}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {canEdit && <>
          <Button
            variant="outline"
            size="dense"
            onClick={() => {
              setSelectedCard(null);
              setIsFormOpen(true);
            }}
            className="h-9 gap-1.5 font-medium"
          >
            <Plus className="size-3.5" />
            <span>Tambah Manual</span>
          </Button>

          <Button
            variant="default"
            size="dense"
            onClick={() => setIsScanOpen(true)}
            className="h-9 gap-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Camera className="size-3.5" />
            <span>Scan Kartu Nama</span>
          </Button>
          </>}
        </div>
      }
    >
      {/* Top Colorful KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <HeroKpiCard
          title="Total Kartu Nama"
          value={totalCards}
          unit="Kontak"
          tone="blue"
          icon={<Layers className="size-5" />}
          badge="Direktori Expo"
          trend={{ value: 'Aktif', direction: 'up', label: 'terkumpul' }}
        />
        <HeroKpiCard
          title="Hot Leads"
          value={hotLeads}
          unit="Prioritas"
          tone="rose"
          icon={<Flame className="size-5" />}
          badge="Follow-up Cepat"
          trend={{ value: `${Math.round((hotLeads / (totalCards || 1)) * 100)}%`, direction: 'up', label: 'dari total' }}
        />
        <HeroKpiCard
          title="Warm Leads"
          value={warmLeads}
          unit="Prospek"
          tone="amber"
          icon={<Sparkles className="size-5" />}
          badge="Potensial"
          trend={{ value: 'Tertarik', direction: 'neutral', label: 'tahap diskusi' }}
        />
        <HeroKpiCard
          title="Mitra & Vendor"
          value={partnersVendors}
          unit="Relasi"
          tone="cyan"
          icon={<Building className="size-5" />}
          badge="Kemitraan"
          trend={{ value: 'B2B Network', direction: 'up', label: 'ekosistem' }}
        />
      </div>

      {/* Main Table Card */}
      <Card className="rounded-xl border border-border/70 shadow-xs">
        <CardContent className="pt-4 p-4">
          <HeroDataTable
            data={cards}
            columns={columns}
            idField="id"
            searchPlaceholder="Cari nama kontak, perusahaan, jabatan, event expo, nomor HP..."
            searchKeys={['contactName', 'companyName', 'jobTitle', 'expoName', 'phoneNumber', 'email', 'notes']}
            filters={filters}
            loading={isLoading}
            showSelection={false}
            renderRowActions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedCard(row);
                          setIsDetailOpen(true);
                        }}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Lihat Pratinjau Dokumen</TooltipContent>
                  </Tooltip>

                  {canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                        onClick={() => {
                          setSelectedCard(row);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Edit Data</TooltipContent>
                  </Tooltip>
                  )}

                  {canDelete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          setCardToDelete(row);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Hapus</TooltipContent>
                  </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* 1. Scan Dialog Modal */}
      <ScanCardDialog
        open={isScanOpen}
        onOpenChange={setIsScanOpen}
        onSuccess={loadCards}
      />

      {/* 2. Document Preview Modal */}
      <CardDetailModal
        card={selectedCard}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={canEdit ? (card) => {
          setIsDetailOpen(false);
          setSelectedCard(card);
          setIsFormOpen(true);
        } : undefined}
      />

      {/* 3. Manual Add / Edit Dialog */}
      <CardFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        card={selectedCard}
        onSuccess={loadCards}
      />

      {/* 4. Delete Confirmation Dialog */}
      <HeroConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Hapus Kartu Nama Kontak?"
        description={`Apakah Anda yakin ingin menghapus kartu nama "${cardToDelete?.contactName}" dari perusahaan "${cardToDelete?.companyName || '-'}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Kontak"
        tone="destructive"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </AdminPageShell>
  );
}
