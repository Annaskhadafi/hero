'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Tag,
  Boxes,
  CheckCircle2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Wand2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HeroDataTable,
  HeroKpiCard,
  HeroColumnDef,
  HeroTableFilter,
  HeroSearchableSelect,
  HeroFormField,
  HeroInput,
  HeroNumberInput,
  HeroTextarea,
  HeroSwitch,
  HeroFormDialog,
  HeroConfirmDialog,
  HeroStatusBadge,
} from '@/components/templates';
import {
  createMasterApdAction,
  updateMasterApdAction,
  toggleMasterApdStatusAction,
  deleteMasterApdAction,
  getNextMasterApdCodeAction,
  MasterApdInput,
} from '@/app/actions/master-apd-actions';

export interface MasterApdItem {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  hasSize: boolean;
  sizeOptions: string[] | null;
  minStock: number;
  isQtyOnly: boolean;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MasterApdClientProps {
  initialItems: MasterApdItem[];
}

const CATEGORY_OPTIONS = [
  { value: 'APD', label: 'APD (Alat Pelindung Diri)' },
  { value: 'Tools', label: 'Tools (Peralatan Kerja)' },
  { value: 'Material', label: 'Material (Bahan & Komponen)' },
];

const UNIT_OPTIONS = [
  { value: 'Pcs', label: 'Pcs (Satuan Buah)' },
  { value: 'Pasang', label: 'Pasang (Pair)' },
  { value: 'Set', label: 'Set (Paket Lengkap)' },
  { value: 'Box', label: 'Box (Kotak)' },
  { value: 'Roll', label: 'Roll (Gulungan)' },
  { value: 'Unit', label: 'Unit' },
];

const SHOE_SIZE_PRESETS = ['38', '39', '40', '41', '42', '43', '44', '45', '46'];
const APPAREL_SIZE_PRESETS = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export function MasterApdClient({ initialItems }: MasterApdClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterApdItem | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterApdItem | null>(null);

  const [isToggleOpen, setIsToggleOpen] = useState(false);
  const [itemToToggle, setItemToToggle] = useState<MasterApdItem | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('APD');
  const [unit, setUnit] = useState('Pcs');
  const [hasSize, setHasSize] = useState(false);
  const [sizeInput, setSizeInput] = useState('');
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [minStock, setMinStock] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Metrics
  const metrics = useMemo(() => {
    const total = initialItems.length;
    const active = initialItems.filter((i) => i.isActive).length;
    const apdCount = initialItems.filter((i) => i.category.toUpperCase() === 'APD').length;
    const toolsCount = initialItems.filter((i) => i.category.toUpperCase() === 'TOOLS').length;
    const materialCount = initialItems.filter((i) => i.category.toUpperCase() === 'MATERIAL').length;
    const hasSizeCount = initialItems.filter((i) => i.hasSize).length;
    return { total, active, apdCount, toolsCount, materialCount, hasSizeCount };
  }, [initialItems]);

  const handleOpenAdd = (defaultCat?: any) => {
    const validCategory = typeof defaultCat === 'string' ? defaultCat : 'APD';
    setEditingItem(null);
    setFormError('');
    setCode(`APD-${String(initialItems.length + 1).padStart(3, '0')}`);
    setName('');
    setCategory(validCategory);
    setUnit('Pcs');
    setHasSize(false);
    setSizeOptions([]);
    setSizeInput('');
    setMinStock(0);
    setNotes('');
    setIsFormOpen(true);

    // Fetch next code in background
    setIsGeneratingCode(true);
    getNextMasterApdCodeAction(validCategory)
      .then((codeRes) => {
        if (codeRes.success && codeRes.nextCode) {
          setCode(codeRes.nextCode);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsGeneratingCode(false);
      });
  };

  const handleOpenEdit = (item: MasterApdItem) => {
    setEditingItem(item);
    setFormError('');
    setCode(item.code);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setHasSize(item.hasSize);
    setSizeOptions(item.sizeOptions || []);
    setSizeInput('');
    setMinStock(item.minStock || 0);
    setNotes(item.notes || '');
    setIsFormOpen(true);
  };

  const handleAutoCode = async (cat: string) => {
    setIsGeneratingCode(true);
    const codeRes = await getNextMasterApdCodeAction(cat);
    if (codeRes.success) {
      setCode(codeRes.nextCode);
    }
    setIsGeneratingCode(false);
  };

  const handleAddSizeTag = () => {
    const trimmed = sizeInput.trim();
    if (trimmed && !sizeOptions.includes(trimmed)) {
      setSizeOptions([...sizeOptions, trimmed]);
      setSizeInput('');
    }
  };

  const handleRemoveSizeTag = (val: string) => {
    setSizeOptions(sizeOptions.filter((s) => s !== val));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!code.trim()) {
      setFormError('Kode APD wajib diisi');
      return;
    }
    if (!name.trim()) {
      setFormError('Nama APD wajib diisi');
      return;
    }

    const payload: MasterApdInput = {
      code: code.trim(),
      name: name.trim(),
      category,
      unit,
      hasSize,
      sizeOptions: hasSize ? sizeOptions : [],
      minStock: Number(minStock) || 0,
      isQtyOnly: true,
      notes: notes.trim(),
    };

    startTransition(async () => {
      let res;
      if (editingItem) {
        res = await updateMasterApdAction(editingItem.id, payload);
      } else {
        res = await createMasterApdAction(payload);
      }

      if (res.success) {
        setIsFormOpen(false);
        router.refresh();
      } else {
        setFormError(res.error || 'Terjadi kesalahan saat menyimpan data');
      }
    });
  };

  const handleToggleStatusConfirm = () => {
    if (!itemToToggle) return;
    startTransition(async () => {
      const res = await toggleMasterApdStatusAction(itemToToggle.id, !itemToToggle.isActive);
      if (res.success) {
        setIsToggleOpen(false);
        setItemToToggle(null);
        router.refresh();
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;
    startTransition(async () => {
      const res = await deleteMasterApdAction(itemToDelete.id);
      if (res.success) {
        setIsDeleteOpen(false);
        setItemToDelete(null);
        router.refresh();
      }
    });
  };

  // Table Filters
  const filters: HeroTableFilter[] = useMemo(
    () => [
      {
        key: 'category',
        label: 'Kategori',
        options: [
          { value: 'ALL', label: 'Semua Kategori' },
          { value: 'APD', label: 'APD' },
          { value: 'Tools', label: 'Tools' },
          { value: 'Material', label: 'Material' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'ALL', label: 'Semua Status' },
          { value: 'ACTIVE', label: 'Aktif' },
          { value: 'INACTIVE', label: 'Nonaktif' },
        ],
      },
    ],
    []
  );

  // Table Column Definitions
  const columns: HeroColumnDef<MasterApdItem>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Kode APD',
        sortable: true,
        render: (row) => (
          <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              {row.code}
            </span>
          </div>
        ),
      },
      {
        key: 'name',
        header: 'Nama Item / APD',
        sortable: true,
        render: (row) => (
          <div className="flex flex-col py-0.5">
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-[13px]">
              {row.name}
            </span>
            {row.notes && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic">
                {row.notes}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Kategori',
        sortable: true,
        render: (row) => {
          const cat = row.category?.toUpperCase() || 'APD';
          const badgeStyle =
            cat === 'APD'
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              : cat === 'TOOLS'
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
          return (
            <Badge variant="outline" className={`text-[11px] font-semibold px-2 py-0.5 border ${badgeStyle}`}>
              {cat}
            </Badge>
          );
        },
      },
      {
        key: 'unit',
        header: 'Satuan',
        sortable: true,
        render: (row) => (
          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            {row.unit || 'Pcs'}
          </span>
        ),
      },
      {
        key: 'hasSize',
        header: 'Variasi Ukuran',
        render: (row) => {
          if (!row.hasSize || !row.sizeOptions || row.sizeOptions.length === 0) {
            return <span className="text-xs text-slate-400">-</span>;
          }
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {row.sizeOptions.slice(0, 4).map((size) => (
                <span
                  key={size}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  {size}
                </span>
              ))}
              {row.sizeOptions.length > 4 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                  +{row.sizeOptions.length - 4}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'minStock',
        header: 'Min. Stock',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
            {row.minStock || 0} {row.unit || 'Pcs'}
          </span>
        ),
      },
      {
        key: 'isActive',
        header: 'Status',
        sortable: true,
        render: (row) => (
          <HeroStatusBadge
            status={row.isActive ? 'active' : 'inactive'}
            className="cursor-pointer"
          />
        ),
      },
      {
        key: 'actions',
        header: 'Aksi',
        align: 'right',
        render: (row) => (
          <div className="flex items-center gap-1 justify-end">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(row)}
                    className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Edit Master APD</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setItemToToggle(row);
                      setIsToggleOpen(true);
                    }}
                    className={`h-8 w-8 ${
                      row.isActive
                        ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {row.isActive ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {row.isActive ? 'Nonaktifkan Item' : 'Aktifkan Item'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setItemToDelete(row);
                      setIsDeleteOpen(true);
                    }}
                    className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Hapus Master APD</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO KPI SCORECARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Total Katalog Item"
          value={metrics.total}
          unit="Item"
          tone="blue"
          icon={<Package className="size-5" />}
          description="Total katalog APD, tools, dan material terdaftar"
        />

        <HeroKpiCard
          title="Item APD Aktif"
          value={metrics.active}
          unit="Siap Pakai"
          tone="emerald"
          icon={<ShieldCheck className="size-5" />}
          description="Item aktif dan dapat diajukan oleh pengguna"
        />

        <HeroKpiCard
          title="Kategori APD"
          value={metrics.apdCount}
          unit="Katalog"
          tone="amber"
          icon={<Tag className="size-5" />}
          description="Item Alat Pelindung Diri keselamatan kerja"
        />

        <HeroKpiCard
          title="Tools & Material"
          value={metrics.toolsCount + metrics.materialCount}
          unit="Item"
          tone="purple"
          icon={<Boxes className="size-5" />}
          description={`${metrics.toolsCount} Tools, ${metrics.materialCount} Material`}
        />
      </div>

      {/* 2. HERO DATA TABLE */}
      <HeroDataTable
        data={initialItems}
        columns={columns}
        idField="id"
        title="Katalog Master Data APD"
        description="Kelola dan tambahkan item Alat Pelindung Diri (APD), Tools, dan Material operasional"
        searchPlaceholder="Cari kode APD, nama item, merk, atau spesifikasi..."
        searchKeys={['code', 'name', 'notes', 'category', 'unit']}
        filters={filters}
        defaultPageSize={50}
        exportFileName="Master-Data-APD"
        pdfTitle="Laporan Katalog Master Data APD HERO"
        headerActions={
          <Button
            onClick={handleOpenAdd}
            className="h-9 px-4 font-semibold gap-2 bg-[#0753e7] hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="size-4" />
            Tambah Master APD
          </Button>
        }
      />

      {/* 3. HERO FORM DIALOG (CREATE / EDIT) */}
      <HeroFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingItem ? 'Edit Master Data APD' : 'Tambah Master Data APD Baru'}
        description={
          editingItem
            ? `Perbarui informasi katalog item ${editingItem.code}`
            : 'Masukkan detail APD, Tools, atau Material baru untuk ditambahkan ke master data'
        }
        submitLabel={editingItem ? 'Simpan Perubahan' : 'Tambahkan ke Master APD'}
        isSubmitting={isPending}
        onSubmit={handleSubmitForm}
        maxWidth="lg"
      >
        <div className="space-y-4 py-2">
          {formError && (
            <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          {/* Kode APD & Auto Code Button */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <HeroFormField
                label="Kode APD / Item"
                required
                tooltip="Kode unik sistem untuk katalog APD (contoh: APD-027)"
              >
                <div className="flex gap-2">
                  <HeroInput
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: APD-027"
                    className="font-mono font-bold"
                  />
                  {!editingItem && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAutoCode(category)}
                      disabled={isGeneratingCode}
                      className="h-9 px-3 gap-1.5 text-xs whitespace-nowrap"
                    >
                      <Wand2 className="size-3.5 text-blue-600" />
                      Auto
                    </Button>
                  )}
                </div>
              </HeroFormField>
            </div>

            <div>
              <HeroFormField label="Kategori" required>
                <HeroSearchableSelect
                  options={CATEGORY_OPTIONS}
                  value={category}
                  onChange={(val) => {
                    setCategory(val);
                    if (!editingItem) {
                      handleAutoCode(val);
                    }
                  }}
                  placeholder="Pilih Kategori"
                />
              </HeroFormField>
            </div>
          </div>

          {/* Nama APD */}
          <HeroFormField
            label="Nama Item / APD"
            required
            tooltip="Nama lengkap APD, merk, atau jenisnya (contoh: Tudung Kepala / Kupluk, Cotton Filter Respirator Honeywell)"
          >
            <HeroInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Tudung Kepala / Kupluk (Makatac) atau Cotton Filter Respirator Honeywell"
            />
          </HeroFormField>

          {/* Satuan & Min Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HeroFormField label="Satuan (Unit)" required>
              <HeroSearchableSelect
                options={UNIT_OPTIONS}
                value={unit}
                onChange={(val) => setUnit(val)}
                placeholder="Pilih Satuan"
              />
            </HeroFormField>

            <HeroFormField
              label="Batas Minimum Stok"
              tooltip="Jumlah minimum stok untuk kebutuhan operasional"
            >
              <HeroInput
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
              />
            </HeroFormField>
          </div>

          {/* Switch Opsi Ukuran */}
          <div className="rounded-lg border border-border/70 p-3 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <HeroSwitch
              label="Memerlukan Opsi Ukuran (Size)"
              description="Aktifkan jika item memiliki variasi ukuran seperti nomor sepatu, ukuran baju/celana, dll."
              checked={hasSize}
              onCheckedChange={setHasSize}
            />

            {hasSize && (
              <div className="pt-2 border-t border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Daftar Ukuran Tersedia:
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSizeOptions(SHOE_SIZE_PRESETS)}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      + Preset Sepatu
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSizeOptions(APPAREL_SIZE_PRESETS)}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      + Preset Pakaian
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSizeOptions([])}
                      className="text-[11px] font-medium text-rose-500 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <HeroInput
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSizeTag();
                      }
                    }}
                    placeholder="Ketik ukuran lalu Enter atau klik Tambah (contoh: 41, XL)"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSizeTag}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    Tambah
                  </Button>
                </div>

                {sizeOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sizeOptions.map((opt) => (
                      <span
                        key={opt}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      >
                        {opt}
                        <button
                          type="button"
                          onClick={() => handleRemoveSizeTag(opt)}
                          className="hover:text-rose-600"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Catatan / Keterangan Spesifikasi */}
          <HeroFormField
            label="Catatan / Spesifikasi / Peruntukan"
            tooltip="Keterangan peruntukan, standar merk, atau lokasi pemakaian (contoh: Maintenance Rim, Site Vale Sorowako, Honeywell 7506N95)"
          >
            <HeroTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Maintenance Rim - Tudung kepala / kupluk katun pelindung panas & kotoran"
              rows={2}
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* 4. HERO CONFIRM DIALOG (DELETE) */}
      <HeroConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Hapus Master Data APD"
        description={
          <div>
            Apakah Anda yakin ingin menghapus katalog{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {itemToDelete?.code} - {itemToDelete?.name}
            </strong>
            ? Tindakan ini tidak dapat dibatalkan.
          </div>
        }
        confirmLabel="Hapus Item"
        tone="destructive"
        isProcessing={isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteOpen(false)}
      />

      {/* 5. HERO CONFIRM DIALOG (TOGGLE STATUS) */}
      <HeroConfirmDialog
        open={isToggleOpen}
        onOpenChange={setIsToggleOpen}
        title={itemToToggle?.isActive ? 'Nonaktifkan Master APD' : 'Aktifkan Master APD'}
        description={
          <div>
            Apakah Anda ingin mengubah status{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {itemToToggle?.code} - {itemToToggle?.name}
            </strong>{' '}
            menjadi{' '}
            <strong className={itemToToggle?.isActive ? 'text-rose-600' : 'text-emerald-600'}>
              {itemToToggle?.isActive ? 'Nonaktif' : 'Aktif'}
            </strong>
            ?
          </div>
        }
        confirmLabel={itemToToggle?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        tone={itemToToggle?.isActive ? 'warning' : 'primary'}
        isProcessing={isPending}
        onConfirm={handleToggleStatusConfirm}
        onCancel={() => setIsToggleOpen(false)}
      />
    </div>
  );
}
