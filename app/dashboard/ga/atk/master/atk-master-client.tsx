'use client'

import React, { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FolderKanban,
  Plus,
  ArrowLeft,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  createMasterAtkItem,
  updateMasterAtkItem,
  deleteMasterAtkItem,
  toggleMasterAtkStatus,
} from '@/app/actions/atk'

type MasterAtkItem = {
  id: number
  code: string
  name: string
  category: string
  unit: string
  description: string
  minStock: number
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

const CATEGORY_OPTIONS = [
  'Kertas & Buku',
  'Alat Tulis & Koreksi',
  'Arsip & Binder',
  'Aksesoris & Peralatan Meja',
  'Lainnya',
]

const UNIT_OPTIONS = [
  'Pcs',
  'Box',
  'Rim',
  'Pack',
  'Set',
  'Buku',
  'Pad',
  'Rol',
  'Pak',
  'Lusin',
  'Kotak',
]

export function AtkMasterClient({ initialItems }: { initialItems: MasterAtkItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MasterAtkItem | null>(null)

  // Form State
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Alat Tulis & Koreksi')
  const [unit, setUnit] = useState('Pcs')
  const [description, setDescription] = useState('')
  const [minStock, setMinStock] = useState(10)
  const [isActive, setIsActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (search.trim()) {
        const query = search.toLowerCase()
        return (
          item.name.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [initialItems, search, categoryFilter])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setCode('')
    setName('')
    setCategory('Alat Tulis & Koreksi')
    setUnit('Pcs')
    setDescription('')
    setMinStock(10)
    setIsActive(true)
    setError(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (item: MasterAtkItem) => {
    setEditingItem(item)
    setCode(item.code)
    setName(item.name)
    setCategory(item.category)
    setUnit(item.unit)
    setDescription(item.description)
    setMinStock(item.minStock)
    setIsActive(item.isActive)
    setError(null)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama barang wajib diisi')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingItem) {
        await updateMasterAtkItem(editingItem.id, {
          code,
          name,
          category,
          unit,
          description,
          minStock,
          isActive,
        })
      } else {
        await createMasterAtkItem({
          code,
          name,
          category,
          unit,
          description,
          minStock,
          isActive,
        })
      }

      setModalOpen(false)
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan item master ATK')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus atau menonaktifkan item ATK ini?')) {
      try {
        await deleteMasterAtkItem(id)
        startTransition(() => {
          router.refresh()
        })
      } catch (err: any) {
        alert(err?.message || 'Gagal menghapus item')
      }
    }
  }

  const handleToggleStatus = async (item: MasterAtkItem) => {
    try {
      await toggleMasterAtkStatus(item.id, !item.isActive)
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      alert(err?.message || 'Gagal memperbarui status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/ga/atk">
            <Button variant="ghost" size="icon" className="size-8">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              Katalog Master Data ATK
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Standarisasi katalog barang, kode barang, kategori, dan satuan untuk formulir pengajuan.
            </p>
          </div>
        </div>

        <Button onClick={handleOpenCreate} size="sm" className="text-xs font-semibold gap-1.5 h-9">
          <Plus className="size-4" />
          Tambah Item ATK
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode atau nama barang ATK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[220px] text-xs h-9">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">Semua Kategori ({initialItems.length})</SelectItem>
            {CATEGORY_OPTIONS.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/80 text-muted-foreground uppercase text-[10px] font-bold border-b">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-36">Kode Barang</th>
                <th className="py-3 px-4">Nama Barang ATK</th>
                <th className="py-3 px-4 w-48">Kategori</th>
                <th className="py-3 px-4 w-24 text-center">Satuan</th>
                <th className="py-3 px-4 w-28 text-center">Stok Min</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <FolderKanban className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">Belum ada barang di kategori ini</p>
                    <p className="text-xs mt-1">Gunakan tombol &quot;Tambah Item ATK&quot; untuk menambahkan katalog baru.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 text-center font-medium text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {item.code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-foreground">{item.name}</p>
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Tag className="size-3" />
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-foreground">
                      {item.unit}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                      {item.minStock}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className="cursor-pointer"
                        title="Klik untuk ubah status aktif/non-aktif"
                      >
                        {item.isActive ? (
                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-[10px] font-semibold">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px]">
                            Non-Aktif
                          </Badge>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="size-3.5" />
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

      {/* Modal Tambah / Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingItem ? 'Edit Master Item ATK' : 'Tambah Master Item ATK Baru'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Informasi barang ini akan muncul sebagai opsi pilihan di formulir pengajuan ATK.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              {error && (
                <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs font-semibold">
                    Kode Barang (Opsional):
                  </Label>
                  <Input
                    id="code"
                    placeholder="Auto generate jika kosong"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold">
                    Kategori:
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category" className="h-8 text-xs">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Nama Barang ATK *:
                </Label>
                <Input
                  id="name"
                  placeholder="Contoh: Ballpoint Standard AE7 0.5mm Hitam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unit" className="text-xs font-semibold">
                    Satuan:
                  </Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger id="unit" className="h-8 text-xs">
                      <SelectValue placeholder="Satuan" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="minStock" className="text-xs font-semibold">
                    Ambang Batas Minimum:
                  </Label>
                  <Input
                    id="minStock"
                    type="number"
                    min={0}
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Deskripsi / Spesifikasi:
                </Label>
                <Textarea
                  id="description"
                  rows={2}
                  placeholder="Keterangan merk, ukuran, warna, isi per box, dll."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={saving} className="text-xs gap-1.5">
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                {editingItem ? 'Simpan Perubahan' : 'Tambah Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
