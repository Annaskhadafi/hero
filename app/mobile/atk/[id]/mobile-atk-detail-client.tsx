'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  PackageCheck,
  CheckCheck,
  XCircle,
  Building2,
  Calendar,
  User,
  RotateCcw,
  Loader2,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AtkStatusBadge } from '@/components/atk/atk-status-badge'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { updateAtkRequestStatus } from '@/app/actions/atk'
import { uploadFile } from '@/app/actions/upload'

type AtkDetailData = {
  id: number
  requestNumber: string
  requestType: string
  targetRecipientName: string
  requestDate: Date | string
  status: string
  notes: string
  requesterSignatureUrl?: string | null
  reviewerNote?: string | null
  reviewedAt?: Date | string | null
  recipientSignatureUrl?: string | null
  recipientName?: string | null
  completedAt?: Date | string | null
  employeeName: string
  employeeSn: string
  employeePosition?: string | null
  siteName: string
  departmentName?: string | null
  reviewerName?: string | null
  items: Array<{
    id: number
    displayName: string
    quantity: number
    displayUnit: string
    notes?: string
  }>
}

export function MobileAtkDetailClient({
  data,
  currentEmployee,
}: {
  data: AtkDetailData
  currentEmployee: {
    id: number
    name: string
    employeeSn: string
  }
}) {
  const router = useRouter()

  // Recipient Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [recipientName, setRecipientName] = useState(data.recipientName || currentEmployee.name)

  const [confirming, setConfirming] = useState(false)
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

  const handleConfirmHandover = async () => {
    if (!hasSignature || !canvasRef.current) {
      setError('Harap bubuhkan tanda tangan penerima terlebih dahulu')
      return
    }

    setConfirming(true)
    setError(null)

    try {
      const dataUrl = canvasRef.current.toDataURL('image/png')
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `handover_sig_${data.id}_${Date.now()}.png`, {
        type: 'image/png',
      })
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await uploadFile(formData)
      const recipientSignatureUrl = uploadRes.success ? uploadRes.url : undefined

      await updateAtkRequestStatus(data.id, {
        status: 'completed',
        recipientSignatureUrl,
        recipientName,
      })

      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Gagal mengonfirmasi penerimaan barang')
    } finally {
      setConfirming(false)
    }
  }

  const formattedDate = new Date(data.requestDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Stepper Calculation
  const isPending = data.status === 'pending_approval'
  const isApproved =
    data.status === 'approved' ||
    data.status === 'ready_for_pickup' ||
    data.status === 'completed'
  const isReady = data.status === 'ready_for_pickup' || data.status === 'completed'
  const isCompleted = data.status === 'completed'
  const isRejected = data.status === 'rejected'

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-[#003461] to-[#082033] text-white px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link
            href="/mobile/atk"
            className="p-1.5 rounded-lg bg-white/10 active:scale-95 transition-transform"
          >
            <ArrowLeft className="size-5 text-white" />
          </Link>
          <div>
            <p className="text-[10px] text-sky-300 font-bold uppercase">Detail Pengajuan</p>
            <h1 className="text-sm font-mono font-black text-white">{data.requestNumber}</h1>
          </div>
        </div>
        <AtkStatusBadge status={data.status} />
      </div>

      <div className="px-4 space-y-4">
        {/* Stepper Progress Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs font-black text-slate-800 dark:text-slate-200 mb-3">
            Progress Pengajuan ATK
          </p>

          <div className="flex items-center justify-between relative px-2">
            {/* Step 1: Diajukan */}
            <div className="flex flex-col items-center text-center z-10 w-16">
              <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                <CheckCircle2 className="size-4" />
              </div>
              <span className="text-[10px] font-bold mt-1 text-emerald-700 dark:text-emerald-400">
                Diajukan
              </span>
            </div>

            {/* Line 1 */}
            <div
              className={`flex-1 h-0.5 -mt-4 transition-colors ${
                isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-400' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />

            {/* Step 2: Disetujui/Disiapkan */}
            <div className="flex flex-col items-center text-center z-10 w-20">
              <div
                className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                  isRejected
                    ? 'bg-rose-600 text-white'
                    : isApproved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {isRejected ? (
                  <XCircle className="size-4" />
                ) : isApproved ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Clock className="size-3.5" />
                )}
              </div>
              <span
                className={`text-[10px] font-bold mt-1 ${
                  isRejected
                    ? 'text-rose-600'
                    : isApproved
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {isRejected ? 'Ditolak' : 'Disiapkan'}
              </span>
            </div>

            {/* Line 2 */}
            <div
              className={`flex-1 h-0.5 -mt-4 transition-colors ${
                isReady ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />

            {/* Step 3: Siap Ambil */}
            <div className="flex flex-col items-center text-center z-10 w-20">
              <div
                className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                  isReady
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {isReady ? <PackageCheck className="size-4" /> : <Package className="size-3.5" />}
              </div>
              <span
                className={`text-[10px] font-bold mt-1 ${
                  isReady ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400'
                }`}
              >
                Siap Ambil
              </span>
            </div>

            {/* Line 3 */}
            <div
              className={`flex-1 h-0.5 -mt-4 transition-colors ${
                isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />

            {/* Step 4: Selesai */}
            <div className="flex flex-col items-center text-center z-10 w-16">
              <div
                className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {isCompleted ? <CheckCheck className="size-4" /> : <Clock className="size-3.5" />}
              </div>
              <span
                className={`text-[10px] font-bold mt-1 ${
                  isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                }`}
              >
                Selesai
              </span>
            </div>
          </div>
        </div>

        {/* Informasi Pemohon & Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2.5 text-xs">
          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
            Informasi Permintaan
          </p>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-slate-400 block">Pemohon:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {data.employeeName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Tanggal:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formattedDate}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Site / Dept:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {data.departmentName || '-'} &bull; {data.siteName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Peruntukan:</span>
              <span className="font-bold text-slate-900 dark:text-white capitalize">
                {data.requestType === 'department'
                  ? `Divisi (${data.targetRecipientName || 'Dept'})`
                  : 'Personal'}
              </span>
            </div>
          </div>

          {data.notes && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-slate-400 block">Catatan Pemohon:</span>
              <p className="italic text-slate-700 dark:text-slate-300 mt-0.5">{data.notes}</p>
            </div>
          )}

          {data.reviewerNote && (
            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-[11px]">
              <span className="font-bold text-blue-800 dark:text-blue-300 block">
                Catatan PIC GA ({data.reviewerName || 'Petugas GA'}):
              </span>
              <p className="text-blue-900 dark:text-blue-200 mt-0.5">{data.reviewerNote}</p>
            </div>
          )}
        </div>

        {/* Rincian Barang ATK */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
            Daftar Barang yang Diminta ({data.items.length})
          </p>

          <div className="space-y-2">
            {data.items.map((it, idx) => (
              <div
                key={it.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-xs">
                    {it.displayName}
                  </p>
                  {it.notes && (
                    <p className="text-[11px] text-slate-500 mt-0.5 italic">{it.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-black text-sm text-[#003461] dark:text-sky-400">
                    {it.quantity}
                  </span>{' '}
                  <span className="text-[11px] font-semibold text-slate-500">{it.displayUnit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tanda Tangan Pemohon */}
        {data.requesterSignatureUrl && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2 text-xs">
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
              Tanda Tangan Pemohon
            </p>
            <div className="h-20 w-44 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
              <img
                src={resolveUploadUrl(data.requesterSignatureUrl)}
                alt="Signature Pemohon"
                className="max-h-16 max-w-full object-contain"
              />
            </div>
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {data.employeeName}
            </p>
          </div>
        )}

        {/* Konfirmasi Penerimaan Barang (Saat Status Siap Ambil) */}
        {data.status === 'ready_for_pickup' && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 p-4 shadow-sm space-y-3 text-xs">
            <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300">
              <PackageCheck className="size-5 shrink-0" />
              <div>
                <p className="font-black text-xs">Barang Siap Diambil di GA</p>
                <p className="text-[10px] text-purple-700 dark:text-purple-400">
                  Bubuhkan tanda tangan penerima di bawah saat menerima barang dari tim GA.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200 font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">Nama Penerima Barang:</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-slate-700">
                  Tanda Tangan Penerima:
                </Label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              </div>

              <div className="border border-dashed border-purple-300 dark:border-purple-700 rounded-xl bg-white dark:bg-slate-900 p-1 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={110}
                  className="w-full h-[110px] touch-none rounded-lg"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
            </div>

            <Button
              type="button"
              disabled={confirming}
              onClick={handleConfirmHandover}
              className="w-full h-10 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs gap-2 shadow-md"
            >
              {confirming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              Konfirmasi Barang Telah Diterima
            </Button>
          </div>
        )}

        {/* Tanda Tangan Penerima (Saat Status Selesai) */}
        {data.status === 'completed' && data.recipientSignatureUrl && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2 text-xs">
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
              Bukti Serah Terima Penerimaan
            </p>
            <div className="h-20 w-44 border border-dashed border-emerald-200 dark:border-emerald-800 rounded-lg p-1 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-center">
              <img
                src={resolveUploadUrl(data.recipientSignatureUrl)}
                alt="Signature Penerima"
                className="max-h-16 max-w-full object-contain"
              />
            </div>
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Diterima Oleh: {data.recipientName || data.employeeName}
            </p>
            {data.completedAt && (
              <p className="text-[10px] text-slate-400">
                Waktu:{' '}
                {new Date(data.completedAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
