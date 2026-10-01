'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  Tag,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  createMasterApdAction,
  updateMasterApdAction,
  toggleMasterApdStatusAction,
  deleteMasterApdAction,
  MasterApdInput,
} from '@/app/actions/master-apd-actions';

interface MasterApdItem {
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

export function MasterApdClient({ initialItems }: MasterApdClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterApdItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterApdItem | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('APD');
  const [unit, setUnit] = useState('Pcs');
  const [hasSize, setHasSize] = useState(false);
  const [sizeInput, setSizeInput] = useState('');
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [minStock, setMinStock] = useState('0');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Filtering
  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      const matchSearch =
        !search.trim() ||
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));

      const matchCategory =
        categoryFilter === 'ALL' || item.category.toUpperCase() === categoryFilter;

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.isActive) ||
        (statusFilter === 'INACTIVE' && !item.isActive);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [initialItems, search, categoryFilter, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = initialItems.length;
    const active = initialItems.filter((i) => i.isActive).length;
    const apdCount = initialItems.filter((i) => i.category.toUpperCase() === 'APD').length;
    const toolsCount = initialItems.filter((i) => i.category.toUpperCase() === 'TOOLS').length;
    const materialCount = initialItems.filter(
      (i) => i.category.toUpperCase() === 'MATERIAL'
    ).length;
    return { total, active, apdCount, toolsCount, materialCount };
  }, [initialItems]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setCode(`APD-${String(initialItems.length + 1).padStart(3, '0')}`);
    setName('');
    setCategory('APD');
    setUnit('Pcs');
    setHasSize(false);
    setSizeOptions([]);
    setSizeInput('');
    setMinStock('0');
    setNotes('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: MasterApdItem) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setHasSize(item.hasSize);
    setSizeOptions(item.sizeOptions || []);
    setSizeInput('');
    setMinStock(String(item.minStock || 0));
    setNotes(item.notes || '');
    setFormError('');
    setIsFormOpen(true);
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
      setFormError('Kode item wajib diisi');
      return;
    }
    if (!name.trim()) {
      setFormError('Nama item wajib diisi');
      return;
    }

    const payload: MasterApdInput = {
      code: code.trim(),
      name: name.trim(),
      category,
      unit,
      hasSize,
      sizeOptions: hasSize ? sizeOptions : [],
      minStock: parseInt(minStock, 10) || 0,
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

  const handleToggleStatus = (item: MasterApdItem) => {
    startTransition(async () => {
      const res = await toggleMasterApdStatusAction(item.id, !item.isActive);
      if (res.success) {
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

  return (
    <div className="space-y-6 pb-12">
      {/* Dynamic Header & Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {metrics.total}
            </div>
            <div className="text-xs text-slate-500 font-medium">Total Master Item</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {metrics.apdCount}
            </div>
            <div className="text-xs text-slate-500 font-medium">Kategori APD</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {metrics.toolsCount + metrics.materialCount}
            </div>
            <div className="text-xs text-slate-500 font-medium">Tools & Material</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {metrics.active} <span className="text-xs font-normal text-slate-400">Aktif</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">Item Siap Pakai</div>
          </div>
        </div>
      </div>

      {/* Action Bar & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode, nama APD, atau catatan..."
              className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'APD', 'TOOLS', 'MATERIAL'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'ALL' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 px-4 text-xs gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Tambah Item APD
        </Button>
      </div>

      {/* Main Data Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Katalog Master APD
            </span>
            <Badge variant="outline" className="text-[11px] font-medium border-slate-300">
              {filteredItems.length} Item
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Kode & Nama APD</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Satuan</th>
                <th className="py-3 px-4">Opsi Ukuran</th>
                <th className="py-3 px-4">Min. Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <p className="font-medium text-xs">Tidak ada data Master APD ditemukan</p>
                      {search && (
                        <p className="text-[11px] text-slate-400">
                          Coba atur ulang kata kunci pencarian &quot;{search}&quot;
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">
                        {item.name}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        {item.code}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          item.category.toUpperCase() === 'APD'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900'
                            : item.category.toUpperCase() === 'TOOLS'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900'
                            : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900'
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {item.unit}
                    </td>
                    <td className="py-3 px-4">
                      {item.hasSize && item.sizeOptions && item.sizeOptions.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.sizeOptions.map((sz) => (
                            <span
                              key={sz}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {sz}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Tanpa Ukuran</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      <span className="text-slate-700 dark:text-slate-300">
                        {item.minStock} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {item.isActive ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Aktif
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          title="Edit APD"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setItemToDelete(item);
                            setIsDeleteOpen(true);
                          }}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                          title="Hapus APD"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Master APD */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              {editingItem ? 'Edit Item Master APD' : 'Tambah Item Master APD Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Isi data detail barang katalog untuk APD, Tools, atau Material.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Kode APD <span className="text-red-500">*</span>
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="APD-001"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-md text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="APD">APD</option>
                  <option value="Tools">Tools</option>
                  <option value="Material">Material</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Nama Barang / APD <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Safety Shoes Krushers, Helmet Kuning"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Satuan (Unit)
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full h-9 px-3 rounded-md text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Pcs">Pcs</option>
                  <option value="Pasang">Pasang</option>
                  <option value="Set">Set</option>
                  <option value="Box">Box</option>
                  <option value="Roll">Roll</option>
                  <option value="Unit">Unit</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Minimum Stok
                </label>
                <Input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Checkbox Has Size */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSize}
                  onChange={(e) => setHasSize(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Memiliki Pilihan Ukuran (Size Options)?
                </span>
              </label>
            </div>

            {hasSize && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                  Daftar Pilihan Ukuran
                </label>
                <div className="flex gap-1.5">
                  <Input
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSizeTag();
                      }
                    }}
                    placeholder="Contoh: 39, 40, S, M, XL..."
                    className="h-8 text-xs bg-white dark:bg-slate-900"
                  />
                  <Button
                    type="button"
                    onClick={handleAddSizeTag}
                    variant="outline"
                    className="h-8 px-3 text-xs"
                  >
                    + Tambah
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {sizeOptions.map((sz) => (
                    <span
                      key={sz}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      {sz}
                      <button
                        type="button"
                        onClick={() => handleRemoveSizeTag(sz)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {sizeOptions.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">
                      Belum ada ukuran ditambahkan
                    </span>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Catatan / Spesifikasi Singkat
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan..."
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isPending ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Hapus Master APD
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Apakah Anda yakin ingin menghapus item{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {itemToDelete?.name} ({itemToDelete?.code})
              </strong>
              ? Aksi ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleDeleteConfirm}
              className="h-9 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isPending ? 'Menghapus...' : 'Ya, Hapus Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
