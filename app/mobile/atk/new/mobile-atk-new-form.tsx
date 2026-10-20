'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Loader2,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

type MobileItemRow = {
  id: string
  masterAtkId: number | null
  customItemName: string
  quantity: number
  unit: string
  notes: string
}

export function MobileAtkNewForm({
  masterItems,
  currentEmployee,
}: {
  masterItems: MasterItem[]
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
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<MobileItemRow[]>([
    {
      id: '1',
      masterAtkId: masterItems[0]?.id || null,
      customItemName: '',
      quantity: 1,
      unit: masterItems[0]?.unit || 'Pcs',
      notes: '',
    },
  ])

  // Canvas Pad
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#003461'
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
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const handleMasterChange = (rowId: string, value: string) => {
    if (value === 'custom') {
      setItems((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, masterAtkId: null, customItemName: '', unit: 'Pcs' } : r
        )
      )
    } else {
      const mid = Number(value)
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

  const handleQtyChange = (rowId: string, delta: number) => {
    setItems((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, quantity: Math.max(1, r.quantity + delta) } : r
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (items.length === 0) {
      setError('Tambahkan minimal 1 item ATK')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.masterAtkId && !it.customItemName.trim()) {
        setError(`Item #${i + 1}: Tentukan nama barang yang diminta`)
        return
      }
    }

    setSubmitting(true)

    try {
      let signatureUrl: string | undefined = undefined

      if (hasSignature && canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png')
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `sig_m_atk_${Date.now()}.png`, { type: 'image/png' })
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
        siteId: currentEmployee.siteId || undefined,
        departmentId: currentEmployee.departmentId || undefined,
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
        router.push('/mobile/atk')
        router.refresh()
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengajukan ATK')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-[#003461] to-[#082033] text-white px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link
            href="/mobile/atk"
            className="p-1.5 rounded-lg bg-white/10 active:scale-95 transition-transform"
          >
            <ArrowLeft className="size-5 text-white" />
          </Link>
          <h1 className="text-base font-black text-white">Form Pengajuan ATK</h1>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={submitting}
          className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-xs font-bold px-3 py-1.5 h-8 rounded-xl"
        >
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : 'Kirim'}
        </Button>
      </div>

      <div className="px-4 space-y-4">
        {error && (
          <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {/* Jenis Peruntukan */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
          <Label className="text-xs font-black text-slate-800 dark:text-slate-200">
            1. Peruntukan Barang ATK
          </Label>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setRequestType('personal')}
              className={`p-3 rounded-xl border text-left transition-all ${
                requestType === 'personal'
                  ? 'border-[#003461] bg-[#003461]/5 font-bold text-[#003461] dark:text-sky-300'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <p className="font-bold">Personal</p>
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">Untuk meja kerja saya</p>
            </button>

            <button
              type="button"
              onClick={() => setRequestType('department')}
              className={`p-3 rounded-xl border text-left transition-all ${
                requestType === 'department'
                  ? 'border-[#003461] bg-[#003461]/5 font-bold text-[#003461] dark:text-sky-300'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <p className="font-bold">Departemen</p>
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">Operasional divisi</p>
            </button>
          </div>

          {requestType === 'department' && (
            <div className="pt-2 space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">
                Nama Divisi / PIC Penerima *:
              </Label>
              <Input
                placeholder="Contoh: Divisi HR / Bu Rina"
                value={targetRecipientName}
                onChange={(e) => setTargetRecipientName(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>
          )}
        </div>

        {/* Daftar Barang */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-black text-slate-800 dark:text-slate-200">
              2. Daftar Barang ATK ({items.length})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="text-xs h-7 px-2.5 rounded-lg gap-1 border-sky-200 text-sky-700 font-bold"
            >
              <Plus className="size-3.5" />
              Tambah
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((row, idx) => (
              <div
                key={row.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#003461] dark:text-sky-400 text-[11px]">
                    Item #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(row.id)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Master select */}
                <Select
                  value={row.masterAtkId ? String(row.masterAtkId) : 'custom'}
                  onValueChange={(v) => handleMasterChange(row.id, v)}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Pilih barang ATK..." />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-56">
                    <SelectItem value="custom" className="font-semibold text-sky-600">
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
                    placeholder="Nama barang khusus..."
                    value={row.customItemName}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, customItemName: e.target.value } : r
                        )
                      )
                    }
                    className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900"
                    required
                  />
                )}

                {/* Counter Qty & Unit */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-slate-500 font-semibold text-[11px]">Jumlah:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(row.id, -1)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-xs">{row.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(row.id, 1)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <span className="text-slate-700 dark:text-slate-300 font-bold text-xs min-w-8">
                      {row.unit}
                    </span>
                  </div>
                </div>

                <Input
                  placeholder="Catatan / spesifikasi warna (opsional)"
                  value={row.notes}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, notes: e.target.value } : r))
                    )
                  }
                  className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900 text-slate-600"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Catatan Keseluruhan */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2 text-xs">
          <Label className="text-xs font-black text-slate-800 dark:text-slate-200">
            3. Catatan Kebutuhan (Opsional)
          </Label>
          <Textarea
            rows={2}
            placeholder="Keterangan tambahan untuk PIC GA..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-xs rounded-xl resize-none"
          />
        </div>

        {/* Tanda Tangan Digital */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-black text-slate-800 dark:text-slate-200">
              4. Tanda Tangan Pemohon
            </Label>
            <button
              type="button"
              onClick={clearSignature}
              className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          </div>

          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 p-1 flex justify-center">
            <canvas
              ref={canvasRef}
              width={320}
              height={120}
              className="w-full h-[120px] touch-none bg-white dark:bg-slate-900 rounded-lg"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <p className="text-[10px] text-slate-400 text-center">
            Tanda tangani langsung di layar ponsel Anda.
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#003461] to-[#082033] hover:from-[#082033] hover:to-[#003461] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Kirim Formulir Pengajuan ATK
        </Button>
      </div>
    </form>
  )
}
