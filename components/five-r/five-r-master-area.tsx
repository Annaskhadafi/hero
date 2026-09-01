'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveMasterAreaAction } from '@/app/dashboard/quality/5r/actions'

export type MasterAreaItem = {
  id: number
  name: string
  areaScale: string
  siteId: number
  siteName: string | null
  picEmployeeId: number | null
  picName: string | null
  description: string
  isActive: boolean
}

type MasterAreaProps = {
  initialAreas: MasterAreaItem[]
  sites: { id: number; name: string }[]
  employees: { id: number; name: string }[]
}

export function FiveRMasterArea({ initialAreas, sites, employees }: MasterAreaProps) {
  const [areas, setAreas] = useState<MasterAreaItem[]>(initialAreas)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<MasterAreaItem | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [areaScale, setAreaScale] = useState<'small' | 'medium' | 'large'>('medium')
  const [siteId, setSiteId] = useState<string>('')
  const [picEmployeeId, setPicEmployeeId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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
              Kelola daftar area, zona kerja, skala luas area, dan penanggung jawab (PIC) audit 5R.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={openCreate}
          size="sm"
          className="h-9 bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm"
        >
          <Plus className="mr-1.5 size-4" />
          Tambah Master Area
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="py-3 px-3.5 font-semibold">Nama Area / Zona</th>
              <th className="py-3 px-3 font-semibold">Skala Area</th>
              <th className="py-3 px-3 font-semibold">Lokasi Site</th>
              <th className="py-3 px-3 font-semibold">PIC Area</th>
              <th className="py-3 px-3 font-semibold">Keterangan</th>
              <th className="py-3 px-3.5 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {areas.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                  Belum ada data Master Area. Klik &quot;Tambah Master Area&quot; untuk menambahkan.
                </td>
              </tr>
            ) : (
              areas.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3.5 font-bold text-slate-900">{a.name}</td>
                  <td className="py-3 px-3">
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
                  <td className="py-3 px-3 text-slate-700">{a.siteName ?? 'Global'}</td>
                  <td className="py-3 px-3 font-medium text-slate-800">
                    {a.picName || <span className="text-slate-400 italic">Belum diset</span>}
                  </td>
                  <td className="py-3 px-3 text-slate-500">{a.description || '-'}</td>
                  <td className="py-3 px-3.5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(a)}
                      className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                    >
                      <Edit className="mr-1 size-3.5" /> Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editItem ? 'Edit Master Area 5R' : 'Tambah Master Area 5R'}
              </h3>
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
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Skala Area</Label>
                <select
                  value={areaScale}
                  onChange={(e) => setAreaScale(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs shadow-sm focus:border-slate-800"
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
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs shadow-sm focus:border-slate-800"
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

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  PIC Penanggung Jawab Area
                </Label>
                <select
                  value={picEmployeeId}
                  onChange={(e) => setPicEmployeeId(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs shadow-sm focus:border-slate-800"
                >
                  <option value="">– Pilih PIC Karyawan (Opsional) –</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id.toString()}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Keterangan / Catatan</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan tambahan batas area..."
                />
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Area'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
