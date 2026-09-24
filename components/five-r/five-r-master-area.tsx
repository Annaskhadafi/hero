'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  History,
  Info,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  deleteMasterAreaAction,
  getMasterAreaPicHistoryAction,
  saveMasterAreaAction,
} from '@/app/dashboard/quality/5r/actions'

export type MasterAreaItem = {
  id: number
  name: string
  areaScale: string
  siteId: number
  siteName: string | null
  picEmployeeId: number | null
  picName: string | null
  effectivePicId?: number | null
  effectivePicName?: string | null
  isFallback?: boolean
  fallbackReason?: string
  description: string
  isActive: boolean
}

type MasterAreaProps = {
  initialAreas: MasterAreaItem[]
  sites: { id: number; name: string; headEmployeeId?: number | null }[]
  employees: { id: number; name: string; email?: string }[]
}

export function FiveRMasterArea({ initialAreas, sites, employees }: MasterAreaProps) {
  const [areas, setAreas] = useState<MasterAreaItem[]>(initialAreas)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<MasterAreaItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<MasterAreaItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [areaScale, setAreaScale] = useState<'small' | 'medium' | 'large'>('medium')
  const [siteId, setSiteId] = useState<string>('')
  const [picEmployeeId, setPicEmployeeId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // History State
  const [historyArea, setHistoryArea] = useState<MasterAreaItem | null>(null)
  const [historyList, setHistoryList] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await deleteMasterAreaAction(deleteTarget.id)
      if (res.success) {
        toast.success(res.message)
        setAreas((prev) => prev.filter((a) => a.id !== deleteTarget.id))
        setDeleteTarget(null)
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Gagal menghapus master area.')
    } finally {
      setIsDeleting(false)
    }
  }

  function openCreate() {
    setEditItem(null)
    setName('')
    setAreaScale('medium')
    setSiteId(sites[0]?.id?.toString() ?? '')
    setPicEmployeeId('')
    setDescription('')
    setIsModalOpen(true)
  }

  function openEdit(item: MasterAreaItem) {
    setEditItem(item)
    setName(item.name)
    setAreaScale(item.areaScale as any)
    setSiteId(item.siteId.toString())
    setPicEmployeeId(item.picEmployeeId?.toString() ?? '')
    setDescription(item.description)
    setIsModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Nama area wajib diisi.')
      return
    }
    if (!siteId) {
      toast.error('Site wajib dipilih.')
      return
    }

    setIsSaving(true)
    try {
      const res = await saveMasterAreaAction({
        id: editItem ? editItem.id : undefined,
        name: name.trim(),
        areaScale,
        siteId: Number(siteId),
        picEmployeeId: picEmployeeId ? Number(picEmployeeId) : null,
        description: description.trim(),
        isActive: true,
      })

      if (res.success) {
        toast.success(res.message)
        setIsModalOpen(false)
        window.location.reload()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Gagal menyimpan master area.')
    } finally {
      setIsSaving(false)
    }
  }

  async function openHistory(item: MasterAreaItem) {
    setHistoryArea(item)
    setLoadingHistory(true)
    try {
      const res = await getMasterAreaPicHistoryAction(item.id)
      if (res.success && res.data) {
        setHistoryList(res.data)
      } else {
        setHistoryList([])
      }
    } catch {
      setHistoryList([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const filteredAreas = areas.filter((a) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      a.name.toLowerCase().includes(q) ||
      (a.siteName || '').toLowerCase().includes(q) ||
      (a.picName || '').toLowerCase().includes(q) ||
      (a.effectivePicName || '').toLowerCase().includes(q)
    )
  })

  // Find fallback preview for currently selected site in modal
  const selectedSite = sites.find((s) => s.id.toString() === siteId)
  const siteHeadEmployee = employees.find((e) => e.id === selectedSite?.headEmployeeId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-slate-600">
            <Link href="/dashboard/quality/5r">
              <ArrowLeft className="mr-1.5 size-3.5" />
              Kembali ke Laporan
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Master Area 5R
            </h1>
            <p className="text-xs text-slate-500">
              Kelola daftar area kerja, skala audit, penanggung jawab (PIC), dan sistem fallback atasan langsung.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <Input
              placeholder="Cari area, site, PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-48 sm:w-64 pl-8 text-xs rounded-xl bg-white border-slate-200"
            />
          </div>

          <Button
            type="button"
            onClick={openCreate}
            size="sm"
            className="h-9 bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm shrink-0"
          >
            <Plus className="mr-1.5 size-4" />
            Tambah Area
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="py-3 px-3.5 font-semibold">Nama Area / Zona</th>
              <th className="py-3 px-3 font-semibold">Skala Area</th>
              <th className="py-3 px-3 font-semibold">Lokasi Site</th>
              <th className="py-3 px-3 font-semibold">PIC Area / Penanggung Jawab</th>
              <th className="py-3 px-3 font-semibold">Keterangan</th>
              <th className="py-3 px-3.5 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredAreas.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                  {searchTerm ? 'Tidak ada master area yang sesuai pencarian.' : 'Belum ada data Master Area.'}
                </td>
              </tr>
            ) : (
              filteredAreas.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-3.5 font-bold text-slate-900">{a.name}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        a.areaScale === 'small'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : a.areaScale === 'large'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {a.areaScale} (Min.{' '}
                      {a.areaScale === 'small' ? '2' : a.areaScale === 'large' ? '6' : '4'} Foto)
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-700 font-medium">{a.siteName ?? 'Global'}</td>
                  <td className="py-3.5 px-3">
                    {a.picEmployeeId ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                          <UserCheck className="size-3.5 text-emerald-600 shrink-0" />
                          <span>{a.picName || a.effectivePicName}</span>
                        </span>
                        <p className="text-[10px] text-slate-400 pl-1">PIC Definitif</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 border border-amber-200">
                          <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                          <span>PIC belum diatur &bull; Otomatis diarahkan ke <strong>{a.effectivePicName || 'Atasan Langsung'}</strong></span>
                        </span>
                        <p className="text-[10px] text-amber-700/80 pl-1 font-medium">
                          Fallback: {a.fallbackReason || 'Atasan Langsung Struktur Organisasi'}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 max-w-xs truncate">{a.description || '-'}</td>
                  <td className="py-3.5 px-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openHistory(a)}
                        className="h-7 px-2 text-xs border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        title="Lihat Histori Pergantian PIC"
                      >
                        <History className="mr-1 size-3 text-slate-400" />
                        Histori
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(a)}
                        className="h-7 px-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold"
                      >
                        <Edit className="mr-1 size-3.5" /> Edit
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(a)}
                        className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold"
                        title="Hapus Master Area"
                      >
                        <Trash2 className="mr-1 size-3.5" /> Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {editItem ? 'Edit Master Area 5R' : 'Tambah Master Area 5R'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Pengaturan area dan penanggung jawab PIC (Single Source of Truth)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nama Area / Zona</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Workshop Bay 1, Retread Plant, Tool Room"
                  className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Skala Area</Label>
                <select
                  value={areaScale}
                  onChange={(e) => setAreaScale(e.target.value as any)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs shadow-2xs focus:border-[#003461] focus:outline-none"
                >
                  <option value="small">Small Area (Lampirkan Min. 2 Foto)</option>
                  <option value="medium">Medium Area (Lampirkan Min. 4 Foto)</option>
                  <option value="large">Large Area (Lampirkan Min. 6 Foto)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Lokasi Site</Label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs shadow-2xs focus:border-[#003461] focus:outline-none"
                  required
                >
                  <option value="">– Pilih Site –</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id.toString()}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">
                    PIC Penanggung Jawab Area
                  </Label>
                  <span className="text-[10px] text-slate-500 font-medium">Single Source of Truth</span>
                </div>

                <select
                  value={picEmployeeId}
                  onChange={(e) => setPicEmployeeId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs shadow-2xs focus:border-[#003461] focus:outline-none"
                >
                  <option value="">– PIC Kosong (Otomatis Gunakan Atasan Langsung) –</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id.toString()}>
                      {emp.name}
                    </option>
                  ))}
                </select>

                {!picEmployeeId ? (
                  <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-200">
                    <Info className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Mode Fallback Aktif:</strong> Karena PIC belum diatur, persetujuan dan monitoring akan otomatis diarahkan ke atasan langsung / PJO Site {selectedSite?.name ? `(${selectedSite.name})` : ''} ({siteHeadEmployee?.name || 'PJO / Kepala Site'}).
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-700 font-medium pl-1 flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    PIC akan menggantikan status fallback dan langsung diterapkan ke seluruh approval berjalan.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Keterangan / Catatan Batas Area</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan tambahan batas area..."
                  className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                />
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold shadow-sm"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Master Area'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Histori PIC Drawer / Modal */}
      {historyArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="size-4 text-indigo-600" />
                  Histori PIC Area &bull; {historyArea.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Catatan pergantian PIC, penugasan, dan pengalihan fallback atasan langsung.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryArea(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {loadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-indigo-600" />
                  Memuat histori...
                </div>
              ) : historyList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                  Belum ada catatan histori pergantian PIC untuk area ini.
                </div>
              ) : (
                historyList.map((h, idx) => (
                  <div
                    key={h.id || idx}
                    className="relative pl-6 pb-3 border-l-2 border-indigo-200 last:border-l-0 last:pb-0"
                  >
                    <div className="absolute -left-1.5 top-0.5 size-3 rounded-full bg-indigo-600 ring-4 ring-indigo-50" />
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          h.actionType === 'assigned'
                            ? 'bg-emerald-100 text-emerald-800'
                            : h.actionType === 'cleared'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {h.actionType === 'assigned' ? 'Ditetapkan' : h.actionType === 'cleared' ? 'Dikosongkan (Fallback)' : 'Diperbarui'}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="size-2.5" />
                          {new Date(h.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-900 pt-0.5">
                        {h.previousPicName ? `${h.previousPicName} ➔ ` : ''}
                        <span className="text-indigo-700">{h.newPicName || '(Fallback Atasan Langsung)'}</span>
                      </div>

                      <p className="text-[11px] text-slate-600">{h.notes}</p>
                      <p className="text-[10px] text-slate-400 pt-0.5">Oleh: {h.changedByName || 'Admin'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 pt-3 text-right">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHistoryArea(null)}
                className="rounded-xl text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Trash2 className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Hapus Master Area?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus area <strong>&quot;{deleteTarget.name}&quot;</strong>?
                </p>
                <p className="text-[11px] text-slate-400">
                  Data master area dan histori penanggung jawab (PIC) akan dihapus dari sistem.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 font-semibold"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1.5 size-3.5" />
                    Ya, Hapus
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

