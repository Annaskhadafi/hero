'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCheck,
  Loader2,
  Printer,
  QrCode,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getPtwApprovalData } from '@/app/dashboard/hse/izin-kerja-ptw/actions'
import { PtwChecklistTable } from '@/components/ptw-checklist-table'
import { PtwDocumentQr } from '@/components/ptw-document-qr'
import {
  cleanPtwDescription,
  extractCheckedEquipment,
  getDefaultSubTypes,
  getActivePermitTypeKeys,
  normalizePermitTypes,
} from '@/lib/ptw-helpers'
import { downloadElementAsPdf } from '@/lib/pdf-download'

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '-'
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function formatPtwTime(value: Date | string | null | undefined) {
  if (!value) return '08:00'
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return '08:00'
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace('.', ':')
  } catch {
    return '08:00'
  }
}

export interface PtwDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  permitId?: number | string | null
  fallbackRecord?: any | null
}

export function PtwDocumentModal({
  isOpen,
  onClose,
  permitId,
  fallbackRecord,
}: PtwDocumentModalProps) {
  const [data, setData] = useState<any | null>(fallbackRecord || null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [targetVerifyUrl, setTargetVerifyUrl] = useState<string>('')

  const printableRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Drag-to-pan state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  const cleanPermitId = typeof permitId === 'string' ? permitId.replace(/^ptw-/i, '') : permitId

  // Fetch or sync data on open
  useEffect(() => {
    if (!isOpen) return

    if (typeof window !== 'undefined') {
      const w = window.innerWidth
      if (w < 640) setZoomLevel(0.48)
      else if (w < 1280) setZoomLevel(0.72)
      else if (w < 1536) setZoomLevel(0.85)
      else setZoomLevel(0.95)
    }

    if (cleanPermitId) {
      setIsLoading(true)
      setError(null)
      getPtwApprovalData(cleanPermitId)
        .then((res) => {
          if (res) {
            setData(res)
          } else if (fallbackRecord) {
            setData(fallbackRecord)
          } else {
            setError('Dokumen Izin Kerja PTW tidak ditemukan.')
          }
        })
        .catch((err) => {
          if (fallbackRecord) {
            setData(fallbackRecord)
          } else {
            setError(err?.message || 'Gagal memuat dokumen PTW.')
          }
        })
        .finally(() => setIsLoading(false))
    } else if (fallbackRecord) {
      setData(fallbackRecord)
      setIsLoading(false)
    } else {
      setData(null)
      setIsLoading(false)
    }
  }, [isOpen, cleanPermitId, fallbackRecord])

  // Generate QR Code Data URL
  useEffect(() => {
    if (!isOpen || !data) return
    const permitNumber = data?.permitNumber || data?.documentNumber || (cleanPermitId ? (String(cleanPermitId).startsWith('PTW') ? String(cleanPermitId) : `PTW-${cleanPermitId}`) : 'PTW')
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hero.chitraparatama.com'
    const targetUrl = `${origin}/ptw-evidence/${encodeURIComponent(permitNumber)}`
    setTargetVerifyUrl(targetUrl)

    QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
    })
      .then(setQrCodeDataUrl)
      .catch((err) => console.error('Failed to generate PTW QR Code:', err))
  }, [isOpen, data, cleanPermitId])

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    setIsDragging(true)
    setDragStart({
      x: e.pageX - scrollContainerRef.current.offsetLeft,
      y: e.pageY - scrollContainerRef.current.offsetTop,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const y = e.pageY - scrollContainerRef.current.offsetTop
    const walkX = (x - dragStart.x) * 1.2
    const walkY = (y - dragStart.y) * 1.2
    scrollContainerRef.current.scrollLeft = dragStart.scrollLeft - walkX
    scrollContainerRef.current.scrollTop = dragStart.scrollTop - walkY
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  // Direct Print Handler
  const handlePrint = () => {
    if (!printableRef.current) return
    const contentHtml = printableRef.current.innerHTML
    const printWindow = window.open('', '_blank', 'width=1122,height=793')
    if (!printWindow) {
      toast.error('Popup browser diblokir. Izinkan pop-up untuk mencetak.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PTW - ${data?.permitNumber || 'Document'}</title>
          <style>
            @page { size: landscape; margin: 0; }
            body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #fff; color: #000; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            table { border-collapse: collapse; }
          </style>
          <link rel="stylesheet" href="/_next/static/css/app/layout.css" />
        </head>
        <body onload="window.focus(); window.print(); window.close();">
          <div style="padding: 15px; width: 1122px; margin: 0 auto;">
            ${contentHtml}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Direct Download PDF Handler
  const handleDownloadPdf = async () => {
    if (!printableRef.current || isDownloading) return
    setIsDownloading(true)
    const toastId = toast.loading('Menyiapkan file PDF PTW...', { id: 'ptw-pdf-download' })

    try {
      const permitNo = (data?.permitNumber || data?.documentNumber || (cleanPermitId ? (String(cleanPermitId).startsWith('PTW') ? String(cleanPermitId) : `PTW-${cleanPermitId}`) : 'PTW-DOC')).replace(/[^a-zA-Z0-9_-]/g, '_')
      await downloadElementAsPdf(printableRef.current, `${permitNo}-IzinKerjaAman.pdf`, {
        orientation: 'landscape',
      })
      toast.success('PDF PTW berhasil diunduh!', { id: toastId })
    } catch (err: any) {
      console.error('Error downloading PTW PDF:', err)
      toast.error(err?.message || 'Gagal mengunduh file PDF PTW.', { id: toastId })
    } finally {
      setIsDownloading(false)
    }
  }

  const permitNumber = data?.permitNumber || data?.documentNumber || (cleanPermitId ? (String(cleanPermitId).startsWith('PTW') ? String(cleanPermitId) : `PTW-${cleanPermitId}`) : 'PTW')
  const workOrderNo = data?.workOrderNo || permitNumber.replace('PTW', 'WO')
  const ptwApprovals: any[] = data?.approvals || data?.steps || []
  const stepPemberi =
    ptwApprovals.find((a: any) => a.stepOrder === 1 || a.approverRole === 'pemberi_kerja' || a.approverRole === 'safety_officer' || a.level === 1) ||
    ptwApprovals[0]
  const stepSafety =
    ptwApprovals.find((a: any) => a.approverRole === 'safety_dept' || a.approverRole === 'authorized' || a.stepLabel?.toLowerCase().includes('safety') || a.stepLabel?.toLowerCase().includes('hse')) ||
    (ptwApprovals.length > 2 ? ptwApprovals[ptwApprovals.length - 1] : (ptwApprovals.find((a: any) => a.stepOrder === 3) || ptwApprovals[2]))
  const pelaksanaSteps = ptwApprovals.filter((a: any) => {
    if (stepPemberi && (a.id ? a.id === stepPemberi.id : a.stepOrder === stepPemberi.stepOrder)) return false
    if (stepSafety && (a.id ? a.id === stepSafety.id : a.stepOrder === stepSafety.stepOrder)) return false
    return true
  })
  const stepPelaksana = pelaksanaSteps[0] || ptwApprovals.find((a: any) => a.stepOrder === 2) || ptwApprovals[1]

  const isSignedPemberi = ['approved', 'completed', 'signed'].includes((stepPemberi?.status || '').toLowerCase())
  const isSignedSafety = ['approved', 'completed', 'signed'].includes((stepSafety?.status || '').toLowerCase())

  const sigPemberi = stepPemberi?.signatureDataUrl || stepPemberi?.signatureUrl || data?.signatures?.step1 || data?.signatures?.stepPemberi || null
  const sigSafety = stepSafety?.signatureDataUrl || stepSafety?.signatureUrl || data?.signatures?.step3 || data?.signatures?.stepSafety || null

  const ppeList: string[] = Array.isArray(data?.ppe)
    ? data.ppe
    : typeof data?.ppe === 'string'
    ? data.ppe.split(',').map((s: string) => s.trim()).filter(Boolean)
    : ['Helmet', 'Safety Shoes', 'Respirator', 'Full Body Harness']



  const checkedEquipment = extractCheckedEquipment(
    data?.controlSteps,
    data?.checkedEquipment,
    data?.permitType
  )

  const rawDescription = data?.description || data?.additionalNotes || ''
  const cleanedDesc = cleanPtwDescription(rawDescription) || rawDescription

  const hiradcRef =
    data?.hiradcReference ||
    (rawDescription.match(/\[Referensi HIRADC:\s*(.*?)\]/)?.[1]) ||
    'JSA-HSE-PTW-2026-001'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[98vw] 2xl:max-w-[1550px] w-full h-[94vh] max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl transition-all"
      >
        {/* Modal Header Bar - Clean White, No Gradients */}
        <DialogHeader className="px-5 py-3.5 bg-white text-slate-900 border-b border-slate-200 shrink-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <FileCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Izin Kerja Aman (PTW)</span>
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    {permitNumber}
                  </span>
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-normal">
                  <span>{data?.projectName || 'Official Work Permit'}</span>
                  <span>•</span>
                  <span>{data?.location || 'Operational Site'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-1.5 py-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                  className="size-7 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
                  title="Zoom Out (-10%)"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
                <span className="text-xs font-mono font-bold text-slate-700 min-w-[42px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
                  className="size-7 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
                  title="Zoom In (+10%)"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const w = window.innerWidth
                      if (w < 640) setZoomLevel(0.48)
                      else if (w < 1280) setZoomLevel(0.72)
                      else if (w < 1536) setZoomLevel(0.85)
                      else setZoomLevel(0.95)
                    }
                  }}
                  className="text-[10px] font-bold px-2 py-0 h-6 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-md cursor-pointer"
                  title="Fit Layar Landscape"
                >
                  Fit Layar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoomLevel(1.0)}
                  className="text-[10px] font-bold px-1.5 py-0 h-6 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md cursor-pointer"
                  title="Reset 100%"
                >
                  100%
                </Button>
              </div>

              {/* Print Button */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePrint}
                className="h-8.5 px-3 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                title="Cetak Dokumen PTW Langsung"
              >
                <Printer className="size-3.5 text-slate-600" />
                <span className="hidden sm:inline">Cetak</span>
              </Button>

              {/* Download PDF Button */}
              <Button
                type="button"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="h-8.5 px-3.5 text-xs font-bold bg-[#003461] hover:bg-[#002647] text-white rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
                title="Unduh Berkas PDF Landscape"
              >
                {isDownloading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                <span>{isDownloading ? 'Unduh...' : 'Unduh PDF'}</span>
              </Button>

              {/* Single Clean Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="size-8.5 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer ml-0.5"
                aria-label="Tutup"
                title="Tutup Modal"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Sub-bar with Status Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                {data?.permitType || 'Cold Permit'}
              </span>
              <span className="text-[10.5px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Status: {data?.status || 'Active'}
              </span>
              <span className="text-[10.5px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                Risk: {data?.riskLevel || 'Medium'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="size-3 text-slate-400" /> Mulai: {formatDate(data?.startAt || data?.startDate)} {formatPtwTime(data?.startAt || data?.startTime)}
              </span>
              <span>s/d</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3 text-slate-400" /> Selesai: {formatDate(data?.endAt || data?.endDate)} {formatPtwTime(data?.endAt || data?.endTime)}
              </span>
            </div>
          </div>
          <DialogDescription className="sr-only">Pratinjau resmi dokumen Izin Kerja Aman (PTW)</DialogDescription>
        </DialogHeader>

        {/* Modal Body Canvas - Clean Neutral Light Background */}
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/90 flex justify-center items-start ${
            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
        >
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="size-9 text-slate-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-600">Memuat berkas resmi dokumen PTW...</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center space-y-3 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md">
              <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <X className="size-5" />
              </div>
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsLoading(true)
                  setError(null)
                  if (cleanPermitId) {
                    getPtwApprovalData(cleanPermitId)
                      .then(setData)
                      .catch((e) => setError(e?.message || 'Gagal memuat PTW'))
                      .finally(() => setIsLoading(false))
                  }
                }}
                className="text-xs text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                Coba Lagi
              </Button>
            </div>
          ) : !data ? (
            <div className="py-20 text-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-500 shadow-2xs">
              Dokumen PTW tidak tersedia.
            </div>
          ) : (
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              className="shrink-0 shadow-lg rounded-sm"
            >
              {/* PRINTABLE A4 LANDSCAPE SHEET */}
              <div
                ref={printableRef}
                className="bg-white text-slate-900 w-[1122px] min-h-[793px] p-6 flex flex-col justify-between border border-slate-300"
                style={{ boxSizing: 'border-box' }}
              >
                {/* ── HEADER TABLE ── */}
                <div className="grid grid-cols-[180px_1fr] border-2 border-slate-900">
                  <div className="flex items-center justify-center p-2 border-r-2 border-slate-900 bg-white">
                    <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-12 object-contain" />
                  </div>
                  <div className="bg-[#bfe6ff] flex items-center justify-center font-bold text-base tracking-wider uppercase py-2.5 text-slate-900">
                    IJIN KERJA BERBAHAYA ( Work Permit )
                  </div>
                </div>

                {/* ── FORM META FIELDS ── */}
                <div className="grid grid-cols-12 border-x-2 border-b-2 border-slate-900 text-[8pt]">
                  <div className="col-span-4 border-r border-slate-900 p-1.5 bg-slate-50">
                    <span className="font-bold">No. Ijin Kerja Berbahaya :</span> <span className="font-mono font-semibold">{permitNumber}</span>
                  </div>
                  <div className="col-span-8 p-1.5 bg-slate-50">
                    <span className="font-bold">No. Work Order :</span> <span className="font-mono font-semibold">{workOrderNo}</span>
                  </div>

                  <div className="col-span-4 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
                    <span className="font-bold block text-[7.5pt] text-slate-500">Nama Pekerja :</span>
                    <span className="font-semibold text-slate-900">{data.applicantName || data.applicant || '—'}</span>
                  </div>
                  <div className="col-span-3 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
                    <span className="font-bold block text-[7.5pt] text-slate-500">Lokasi :</span>
                    <span className="font-semibold text-slate-900">{data.location} {data.area ? `(${data.area})` : ''}</span>
                  </div>
                  <div className="col-span-5 border-t border-slate-900 p-1.5 min-h-[44px]">
                    <span className="font-bold block text-[7.5pt] text-slate-500">Uraian Pekerjaan :</span>
                    <span className="font-semibold text-slate-900">{data.projectName || cleanedDesc || '—'}</span>
                  </div>

                  <div className="col-span-6 border-r border-slate-900 border-t border-slate-900 p-1.5 bg-blue-50/50">
                    <span className="font-bold text-slate-800">Referensi HIRADC :</span>{' '}
                    <span className="font-semibold text-blue-900">
                      {hiradcRef}
                    </span>
                  </div>
                  <div className="col-span-6 border-t border-slate-900 p-1.5 bg-blue-50/50">
                    <span className="font-bold text-slate-800">Tipe Izin Kerja Terpilih :</span>{' '}
                    <span className="font-semibold uppercase text-slate-900">{normalizePermitTypes(data.permitType || (fallbackRecord as any)?.permitType || 'Cold Permit')}</span>
                  </div>
                </div>

                {/* ── TABLE TITLE: JENIS PEKERJAAN ── */}
                <div className="bg-[#e2e8f0] text-center font-bold uppercase text-[8.5pt] py-1 border-x-2 border-b-2 border-slate-900">
                  JENIS PEKERJAAN
                </div>

                {/* ── UNIFIED TABLE FOR PERMIT TYPES ── */}
                <div className="border-x-2 border-slate-900">
                  <PtwChecklistTable
                    permitType={data.permitType}
                    subTypes={data.subTypes || (fallbackRecord as any)?.subTypes || getDefaultSubTypes()}
                    checkedEquipment={checkedEquipment}
                  />
                </div>

                {/* ── ALAT PELINDUNG DIRI (APD) WAJIB ── */}
                <div className="p-2 border-x-2 border-b-2 border-slate-900 text-[8pt] bg-slate-50/80 flex items-center justify-between">
                  <div>
                    <span className="font-bold block text-[7.5pt] text-slate-900">ALAT PELINDUNG DIRI (APD) WAJIB :</span>
                    <div className="flex flex-wrap gap-1.5 mt-1 font-semibold text-slate-800">
                      {ppeList.map((apd: string) => (
                        <span key={apd} className="inline-block bg-white border border-slate-400 rounded px-2 py-0.5 text-[7.5pt] shadow-2xs">
                          ☑ {apd}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 font-bold text-[7.5pt] text-slate-800 shrink-0">
                    <span>Gas Test: <strong className="text-emerald-700">{data.gasTestRequired ? 'WAJIB' : 'TIDAK'}</strong></span>
                    <span>LOTO / Isolasi: <strong className="text-emerald-700">{data.isolationRequired ? 'WAJIB' : 'TIDAK'}</strong></span>
                    <span>Risk Level: <strong className="text-rose-700 uppercase">{data.riskLevel || 'HIGH'}</strong></span>
                  </div>
                </div>

                {/* ── DESKRIPSI PEKERJAAN ── */}
                <div className="p-2 border-x-2 border-b-2 border-slate-900 text-[8pt] bg-white">
                  <span className="font-bold block text-[7.5pt] text-slate-900 uppercase tracking-wide">
                    DESKRIPSI PEKERJAAN :
                  </span>
                  <div className="text-[7.5pt] text-slate-700 mt-0.5 leading-relaxed whitespace-pre-wrap font-medium">
                    {cleanedDesc || <span className="text-slate-400 italic text-[7pt]">— Tidak ada deskripsi pekerjaan tambahan —</span>}
                  </div>
                </div>

                {/* ── 3 KOLOM CATATAN VERIFIKASI & QR CODE ── */}
                <div className="grid grid-cols-12 border-x-2 border-b-2 border-slate-900 bg-slate-50/90 text-[8pt] items-stretch min-h-[75px] divide-x divide-slate-900">
                  {/* 1. Catatan Pemberi Kerja */}
                  <div className="col-span-3 p-2 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
                        CATATAN PEMBERI KERJA
                      </span>
                      <div className="text-[7pt] text-slate-700 leading-snug break-words">
                        {stepPemberi?.remarks || 'Pekerjaan diizinkan sesuai SOP & JSA.'}
                      </div>
                    </div>
                  </div>

                  {/* 2. Catatan Pelaksana Pekerjaan */}
                  <div className="col-span-3 p-2 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
                        CATATAN PELAKSANA KERJA
                      </span>
                      <div className="text-[7pt] text-slate-700 leading-snug break-words">
                        {pelaksanaSteps.map((p: any) => p.remarks).filter(Boolean).join('; ') || stepPelaksana?.remarks || 'APD lengkap & checklist K3 terverifikasi.'}
                      </div>
                    </div>
                  </div>

                  {/* 3. Catatan Safety Dept */}
                  <div className="col-span-3 p-2 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
                        CATATAN SAFETY DEPT
                      </span>
                      <div className="text-[7pt] text-slate-700 leading-snug break-words">
                        {stepSafety?.remarks || 'Monitoring berkala oleh Pengawas HSE.'}
                      </div>
                    </div>
                  </div>

                  {/* 4. QR Code Validasi Interaktif & Dokumen Pendukung */}
                  <div className="col-span-3 flex flex-col items-center justify-center p-1.5 bg-white text-slate-900">
                    <PtwDocumentQr
                      permitId={permitId || permitNumber}
                      permitNumber={permitNumber}
                      fallbackRecord={data}
                      imageClassName="size-13"
                      labelTitle="Scan / Klik PTW"
                      labelSubtitle="Dokumen Pendukung"
                    />
                  </div>
                </div>

                {/* ── MASA BERLAKU (IJIN KERJA BERBAHAYA) ── */}
                <div className="border-x-2 border-b-2 border-slate-900 text-[8pt] bg-white">
                  <div className="bg-[#bfe6ff] text-center font-bold uppercase text-[8pt] py-1 border-b border-slate-900 tracking-wide text-slate-900">
                    MASA BERLAKU (IJIN KERJA BERBAHAYA)
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-900">
                    <div className="grid grid-cols-2 divide-x divide-slate-300">
                      <div className="p-1 text-center">
                        <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL MULAI</span>
                        <span className="font-semibold">{formatDate(data.startAt || data.startDate)}</span>
                      </div>
                      <div className="p-1 text-center">
                        <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU MULAI</span>
                        <span className="font-semibold">{formatPtwTime(data.startAt || data.startTime)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-300">
                      <div className="p-1 text-center">
                        <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL BERAKHIR</span>
                        <span className="font-semibold">{formatDate(data.endAt || data.endDate)}</span>
                      </div>
                      <div className="p-1 text-center">
                        <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU BERAKHIR</span>
                        <span className="font-semibold">{formatPtwTime(data.endAt || data.endTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── TANDA TANGAN SIGNATORIES ── */}
                <div className="grid grid-cols-3 border-x-2 border-b-2 border-slate-900 text-[8pt] divide-x divide-slate-900 bg-white">
                  {/* Pemberi Kerja */}
                  <div className="p-2 flex flex-col items-center justify-between text-center min-h-[110px]">
                    <span className="font-bold text-[7.5pt] text-slate-800 uppercase">PEMBERI KERJA</span>
                    <div className="my-1 flex items-center justify-center h-12 w-full">
                      {sigPemberi ? (
                        <img src={sigPemberi} alt="TTD Pemberi Kerja" className="max-h-12 max-w-[120px] object-contain" />
                      ) : isSignedPemberi ? (
                        <span className="text-emerald-700 font-bold text-[7.5pt] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ Disetujui Digital
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                      )}
                    </div>
                    <div className="w-full border-t border-slate-300 pt-0.5">
                      <span className="font-bold text-slate-900 text-[8pt] block truncate">
                        {stepPemberi?.approverName || data.fieldPicName || data.fieldPic || '—'}
                      </span>
                      <span className="text-[6.5pt] text-slate-500">Field Supervisor</span>
                    </div>
                  </div>

                  {/* Pelaksana Kerja */}
                  <div className="p-2 flex flex-col items-center justify-between text-center min-h-[110px]">
                    <span className="font-bold text-[7.5pt] text-slate-800 uppercase">PELAKSANA KERJA</span>
                    <div className="my-1 flex flex-wrap items-center justify-center gap-2 min-h-12 w-full">
                      {pelaksanaSteps.length > 0 ? (
                        pelaksanaSteps.map((pStep: any, pIdx: number) => {
                          const isSigned = ['approved', 'completed', 'signed'].includes((pStep.status || '').toLowerCase())
                          const pSig = isSigned ? (pStep.signatureDataUrl || pStep.signatureUrl) : null
                          return (
                            <div key={pStep.id || pIdx} className="flex flex-col items-center justify-center text-center">
                              {isSigned && pSig ? (
                                <img src={pSig} alt={`TTD ${pStep.approverName}`} className="max-h-10 max-w-[100px] object-contain" />
                              ) : isSigned ? (
                                <span className="text-emerald-700 font-bold text-[6.5pt] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  ✓ Disetujui
                                </span>
                              ) : (pStep.status || '').toLowerCase() === 'reverted' ? (
                                <span className="text-amber-700 font-bold text-[6.5pt] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  ↺ Dikembalikan
                                </span>
                              ) : (pStep.status || '').toLowerCase() === 'rejected' ? (
                                <span className="text-rose-700 font-bold text-[6.5pt] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  ✗ Ditolak
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[6.5pt]">(Belum Disetujui)</span>
                              )}
                              <span className="text-[6.5pt] text-slate-600 font-semibold mt-0.5">{pStep.approverName}</span>
                            </div>
                          )
                        })
                      ) : stepPelaksana?.signatureDataUrl ? (
                        <div className="flex flex-col items-center justify-center text-center">
                          <img src={stepPelaksana.signatureDataUrl} alt="TTD Pelaksana" className="max-h-10 max-w-[100px] object-contain" />
                          <span className="text-[6.5pt] text-slate-600 font-semibold mt-0.5">{stepPelaksana.approverName || data.applicantName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[7pt]">(Belum Ditandatangani)</span>
                      )}
                    </div>
                    <div className="w-full border-t border-slate-300 pt-0.5">
                      <span className="font-bold text-slate-900 text-[8pt] block truncate" title={pelaksanaSteps.map((p: any) => p.approverName).join(', ') || data.applicantName || data.applicant}>
                        {pelaksanaSteps.map((p: any) => p.approverName).join(', ') || data.applicantName || data.applicant || '—'}
                      </span>
                      <span className="text-[6.5pt] text-slate-500">Pelaksana Kerja</span>
                    </div>
                  </div>

                  {/* Safety Dept */}
                  <div className="p-2 flex flex-col items-center justify-between text-center min-h-[110px]">
                    <span className="font-bold text-[7.5pt] text-slate-800 uppercase">SAFETY DEPT</span>
                    <div className="my-1 flex items-center justify-center h-12 w-full">
                      {sigSafety ? (
                        <img src={sigSafety} alt="TTD Safety Dept" className="max-h-12 max-w-[120px] object-contain" />
                      ) : isSignedSafety ? (
                        <span className="text-emerald-700 font-bold text-[7.5pt] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ Disetujui K3
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                      )}
                    </div>
                    <div className="w-full border-t border-slate-300 pt-0.5">
                      <span className="font-bold text-slate-900 text-[8pt] block truncate">
                        {stepSafety?.approverName || data.authorizedByName || data.authorizedBy || 'HSE Dept'}
                      </span>
                      <span className="text-[6.5pt] text-slate-500">HSE Officer</span>
                    </div>
                  </div>
                </div>

                {/* Footer Code */}
                <div className="flex items-center justify-between text-[7pt] text-slate-500 pt-2 font-mono">
                  <span>F.HSE.PTW.001.01 • PT CHITRA PARATAMA</span>
                  <span>Dokumen Izin Kerja Sah Terverifikasi</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
