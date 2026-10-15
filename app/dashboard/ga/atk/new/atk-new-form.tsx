'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createAtkRequest } from '@/app/actions/atk'
import { uploadFile } from '@/app/actions/upload'

type MasterItem = {
  id: number
  code: string
  name: string
  category: string
  unit: string
}

type FormItemRow = {
  id: string
  masterAtkId: number | null
  customItemName: string
  quantity: number
  unit: string
  notes: string
}

export function AtkNewForm({
  masterItems,
  sites,
  departments,
  currentEmployee,
}: {
  masterItems: MasterItem[]
  sites: Array<{ id: number; name: string }>
  departments: Array<{ id: number; name: string }>
  currentEmployee: {
    id: number
    name: string
    employeeSn: string
    siteId?: number | null
    departmentId?: number | null
  }
}) {
  const router = useRouter()

  const [requestType, setRequestType] = useState<'personal' | 'department'>('personal')
  const [targetRecipientName, setTargetRecipientName] = useState('')
  const [siteId, setSiteId] = useState<number>(currentEmployee.siteId || (sites[0]?.id ?? 1))
  const [departmentId, setDepartmentId] = useState<number | undefined>(
    currentEmployee.departmentId || undefined
  )
  const [notes, setNotes] = useState('')

  // Items
  const [items, setItems] = useState<FormItemRow[]>([
    {
      id: '1',
      masterAtkId: masterItems[0]?.id || null,
      customItemName: '',
      quantity: 1,
      unit: masterItems[0]?.unit || 'Pcs',
      notes: '',
    },
  ])

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#082033'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  // Row Item handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        masterAtkId: masterItems[0]?.id || null,
        customItemName: '',
        quantity: 1,
        unit: masterItems[0]?.unit || 'Pcs',
        notes: '',
      },
    ])
  }

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleItemMasterChange = (rowId: string, masterIdStr: string) => {
    if (masterIdStr === 'custom') {
      setItems((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, masterAtkId: null, customItemName: '', unit: 'Pcs' }
            : r
        )
      )
    } else {
      const mid = Number(masterIdStr)
      const selected = masterItems.find((m) => m.id === mid)
      setItems((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                masterAtkId: mid,
                customItemName: '',
                unit: selected?.unit || 'Pcs',
              }
            : r
        )
      )
    }
  }

  const handleItemPropChange = (
    rowId: string,
    field: keyof FormItemRow,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (items.length === 0) {
      setError('Minimal harus menambahkan satu item ATK')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.masterAtkId && !it.customItemName.trim()) {
        setError(`Item baris #${i + 1}: Silakan pilih barang atau ketik nama barang khusus`)
        return
      }
      if (it.quantity < 1) {
        setError(`Item baris #${i + 1}: Kuantitas minimal 1`)
        return
      }
    }

    setSubmitting(true)

    try {
      let signatureUrl: string | undefined = undefined

      if (hasSignature && canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png')
        // Convert data URL to Blob and FormData for uploadFile action
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `sig_atk_${Date.now()}.png`, { type: 'image/png' })
        const formData = new FormData()
        formData.append('file', file)

        const uploadRes = await uploadFile(formData)
        if (uploadRes.success && uploadRes.url) {
          signatureUrl = uploadRes.url
        }
      }

      const res = await createAtkRequest({
        requestType,
        targetRecipientName,
        siteId,
        departmentId,
        notes,
        requesterSignatureUrl: signatureUrl,
        items: items.map((it) => ({
          masterAtkId: it.masterAtkId,
          customItemName: it.customItemName,
          quantity: it.quantity,
          unit: it.unit,
          notes: it.notes,
        })),
      })

      if (res.success) {
        router.push('/dashboard/ga/atk')
        router.refresh()
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat pengajuan ATK')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
              Formulir Permintaan ATK Baru
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Isi daftar kebutuhan alat tulis kantor untuk diproses dan disiapkan oleh tim General Affairs (GA).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/ga/atk">
            <Button variant="outline" size="sm" type="button" className="text-xs">
              Batal
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="text-xs font-semibold gap-1.5 shadow-sm"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Ajukan Permintaan ATK
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
          {error}
        </div>
      )}

      {/* Identitas Pemohon & Jenis Pengajuan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-black">
              1
            </span>
            Informasi Pemohon & Lokasi
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs text-muted-foreground">Nama Karyawan:</Label>
              <p className="font-bold text-foreground text-sm mt-0.5">
                {currentEmployee.name} (SN: {currentEmployee.employeeSn || '-'})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="site" className="text-xs font-semibold">
                  Lokasi / Site *:
                </Label>
                <Select
                  value={String(siteId)}
                  onValueChange={(v) => setSiteId(Number(v))}
                >
                  <SelectTrigger id="site" className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Site" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs font-semibold">
                  Departemen:
                </Label>
                <Select
                  value={departmentId ? String(departmentId) : undefined}
                  onValueChange={(v) => setDepartmentId(Number(v))}
                >
                  <SelectTrigger id="department" className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Departemen" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-black">
              2
            </span>
            Peruntukan Permintaan
          </h2>

          <div className="space-y-3.5 text-xs">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Jenis Kebutuhan:</Label>
              <RadioGroup
                value={requestType}
                onValueChange={(val) => setRequestType(val as 'personal' | 'department')}
                className="grid grid-cols-2 gap-3"
              >
                <label
                  htmlFor="req-personal"
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    requestType === 'personal'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-border text-foreground hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="personal" id="req-personal" />
                  <div>
                    <p className="text-xs">Kebutuhan Personal</p>
                    <p className="text-[10px] text-muted-foreground font-normal">
                      Untuk perlengkapan meja kerja saya
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="req-department"
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    requestType === 'department'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-border text-foreground hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="department" id="req-department" />
                  <div>
                    <p className="text-xs">Perwakilan Departemen</p>
                    <p className="text-[10px] text-muted-foreground font-normal">
                      Untuk stok operasional divisi
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {requestType === 'department' && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="targetName" className="text-xs font-semibold">
                  Nama Divisi / PIC Pengambil *:
                </Label>
                <Input
                  id="targetName"
                  placeholder="Contoh: Divisi HR / Bu Rina"
                  value={targetRecipientName}
                  onChange={(e) => setTargetRecipientName(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daftar Item ATK */}
      <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-black">
              3
            </span>
            Rincian Item ATK yang Diminta
          </h2>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="text-xs font-semibold gap-1.5 h-8"
          >
            <Plus className="size-3.5" />
            Tambah Baris Item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] font-bold border-b">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3 w-80">Pilih Barang dari Katalog</th>
                <th className="py-2.5 px-3 w-28 text-center">Jumlah</th>
                <th className="py-2.5 px-3 w-28 text-center">Satuan</th>
                <th className="py-2.5 px-3">Keterangan / Spesifikasi</th>
                <th className="py-2.5 px-3 w-12 text-center">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((row, idx) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="py-2.5 px-3 text-center font-medium text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <Select
                      value={row.masterAtkId ? String(row.masterAtkId) : 'custom'}
                      onValueChange={(val) => handleItemMasterChange(row.id, val)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Pilih barang..." />
                      </SelectTrigger>
                      <SelectContent className="text-xs max-h-60">
                        <SelectItem value="custom" className="font-semibold text-primary">
                          + [Ketik Barang Khusus / Non-Katalog]
                        </SelectItem>
                        {masterItems.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.name} ({m.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!row.masterAtkId && (
                      <Input
                        placeholder="Ketik nama & spesifikasi barang khusus..."
                        value={row.customItemName}
                        onChange={(e) =>
                          handleItemPropChange(row.id, 'customItemName', e.target.value)
                        }
                        className="h-8 text-xs mt-1.5"
                        required
                      />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) =>
                        handleItemPropChange(row.id, 'quantity', Number(e.target.value))
                      }
                      className="h-8 text-xs text-center w-20 mx-auto"
                      required
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Input
                      value={row.unit}
                      onChange={(e) =>
                        handleItemPropChange(row.id, 'unit', e.target.value)
                      }
                      className="h-8 text-xs text-center w-20 mx-auto"
                      placeholder="Satuan"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <Input
                      placeholder="Catatan tambahan / warna / kebutuhan khusus..."
                      value={row.notes}
                      onChange={(e) =>
                        handleItemPropChange(row.id, 'notes', e.target.value)
                      }
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(row.id)}
                      className="size-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Catatan & Tanda Tangan Digital */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-black">
              4
            </span>
            Catatan Tambahan
          </h2>
          <Textarea
            rows={4}
            placeholder="Keterangan tambahan untuk tim GA, misalnya batas waktu pengambilan atau urgensi kebutuhan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-xs resize-none"
          />
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-black">
                5
              </span>
              Tanda Tangan Pemohon
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSignature}
              className="text-xs h-7 text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg bg-slate-50 dark:bg-slate-900/40 p-1 flex flex-col items-center justify-center">
            <canvas
              ref={canvasRef}
              width={420}
              height={140}
              className="w-full h-[140px] touch-none cursor-crosshair bg-white dark:bg-slate-950 rounded"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Bubuhkan tanda tangan digital di kotak atas menggunakan mouse atau stylus / layar sentuh.
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/dashboard/ga/atk">
          <Button variant="outline" type="button" className="text-xs">
            Batal
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={submitting}
          className="text-xs font-semibold gap-1.5 shadow-sm px-6"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Kirim Pengajuan ATK
        </Button>
      </div>
    </form>
  )
}
