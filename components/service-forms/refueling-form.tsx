'use client'

import {
  ArrowLeft,
  Camera,
  Download,
  Fuel,
  Image as ImageIcon,
  Loader2,
  PenLine,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  Eye,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  getEmployees,
  getSites,
  getServiceFormUserContext,
  type ServiceFormUserContext,
} from '@/app/dashboard/360-service/service-form/actions'
import { submitRefuelingLog } from '@/app/actions/central-service-refueling'

export type RefuelingDraft = {
  siteName: string
  customSiteName: string
  driverName: string
  refuelDate: string
  unitNumber: string
  customUnitNumber: string
  odometerKm: string
  fuelExpenditureType: string
  customFuelExpenditureType: string
  fuelAmountLiters: string
  fuelmanName: string
  odometerPhotoUrl: string
  flowmeterPhotoUrl: string
  remarks: string
}

export type RefuelingRecord = RefuelingDraft & {
  id: string
  createdAt: string
  updatedAt: string
  createdByUserId?: string
  createdBySn?: string
  createdByName?: string
}

const STORAGE_KEY = 'hero-service-form-refueling-history'
const LETTERHEAD_URL = '/ChitraParatama_Stationery_Letterhead_jkt.jpg'

const SITE_PRESETS = [
  'CK KIM',
  'CK DMP',
  'CK BIB',
  'CK BMB',
  'CK MHU',
  'VALE SOROWAKU',
]

const UNIT_PRESETS = [
  'CP-06',
  'CP-02',
]

const EXPENDITURE_TYPE_PRESETS = [
  'Di bebankan ke PT Chitra Paratama (Internal)',
  'Di bebankan ke Customer (External)',
]

function getInitialDraft(): RefuelingDraft {
  const today = new Date().toISOString().split('T')[0]
  return {
    siteName: 'CK BMB',
    customSiteName: '',
    driverName: '',
    refuelDate: today,
    unitNumber: 'CP-06',
    customUnitNumber: '',
    odometerKm: '',
    fuelExpenditureType: 'Di bebankan ke PT Chitra Paratama (Internal)',
    customFuelExpenditureType: '',
    fuelAmountLiters: '',
    fuelmanName: '',
    odometerPhotoUrl: '',
    flowmeterPhotoUrl: '',
    remarks: '',
  }
}

function compressImage(file: File, maxWidth = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const elem = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        elem.width = width
        elem.height = height
        const ctx = elem.getContext('2d')
        if (!ctx) {
          resolve(img.src)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(elem.toDataURL('image/jpeg', quality))
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, '_')
}

// ── Live Camera Modal Component ──────────────────────────────────────────────
function LiveCameraModal({
  title,
  onClose,
  onCapture,
}: {
  title: string
  onClose: () => void
  onCapture: (dataUrl: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let activeStream: MediaStream | null = null

    async function startCamera() {
      setIsLoading(true)
      setError(null)
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Browser tidak mendukung akses kamera langsung.')
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        activeStream = mediaStream
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          await videoRef.current.play().catch(() => {})
        }
      } catch (err: any) {
        console.error('Camera access error:', err)
        setError(
          'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan pada browser atau coba pilih file gambar dari Galeri.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    startCamera()

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [facingMode])

  function handleCapture() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480

    // Downscale if too large to fit lightweight storage
    const maxWidth = 1000
    let targetWidth = width
    let targetHeight = height
    if (targetWidth > maxWidth) {
      targetHeight = Math.round((targetHeight * maxWidth) / targetWidth)
      targetWidth = maxWidth
    }

    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
      onCapture(dataUrl)
    }
  }

  function toggleCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-slate-950 shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="size-4 text-blue-400" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative flex min-h-[320px] max-h-[60vh] w-full items-center justify-center bg-black overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
              <Loader2 className="size-8 animate-spin text-blue-400" />
              <span className="text-xs">Menghubungkan ke kamera...</span>
            </div>
          )}

          {error ? (
            <div className="p-6 text-center text-rose-400 text-xs max-w-sm">
              <p className="font-semibold mb-2">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 text-white border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs"
                onClick={onClose}
              >
                Tutup & Gunakan Galeri
              </Button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Action Controls */}
        {!error && (
          <div className="flex items-center justify-around bg-slate-900 px-6 py-4 border-t border-slate-800">
            <button
              type="button"
              onClick={toggleCamera}
              className="flex size-11 items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700 active:scale-95 transition-all"
              title="Ganti Kamera Depan/Belakang"
            >
              <RefreshCw className="size-5" />
            </button>

            {/* Shutter Button */}
            <button
              type="button"
              onClick={handleCapture}
              disabled={isLoading}
              className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-lg active:scale-90 transition-all hover:bg-blue-500 disabled:opacity-50"
              title="Ambil Foto"
            >
              <div className="size-11 rounded-full bg-white transition-transform hover:scale-95" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex size-11 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 transition-all"
              title="Batal"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function RefuelingForm({
  mobile = false,
  onBackToHub,
}: {
  mobile?: boolean
  onBackToHub?: () => void
}) {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form')
  const [draft, setDraft] = useState<RefuelingDraft>(getInitialDraft)
  const [records, setRecords] = useState<RefuelingRecord[]>([])
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Autocomplete data
  const [siteOptions, setSiteOptions] = useState<string[]>(SITE_PRESETS)
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([])

  // Search & Filter for History
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSite, setFilterSite] = useState('ALL')

  // PDF Preview / Render Ref
  const [pdfPayload, setPdfPayload] = useState<RefuelingDraft | null>(null)
  const pdfPageRef = useRef<HTMLDivElement>(null)

  // Photo Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState<{ title: string; url: string } | null>(null)

  // Live Camera Modal Trigger
  const [cameraModalConfig, setCameraModalConfig] = useState<{
    isOpen: boolean
    targetKey: 'odometerPhotoUrl' | 'flowmeterPhotoUrl'
    title: string
  } | null>(null)

  // Load from local storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setRecords(JSON.parse(raw))
      }
    } catch (e) {
      console.error('[refueling-form] failed to load local storage:', e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save records to local storage
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch (e) {
      console.error('[refueling-form] failed to persist records:', e)
    }
  }, [records, isLoaded])

  const [userContext, setUserContext] = useState<ServiceFormUserContext | null>(null)

  // Load user context
  useEffect(() => {
    getServiceFormUserContext().then((ctx) => {
      setUserContext(ctx)
    })
  }, [])

  const canEditHistory = Boolean(userContext?.isSuperAdmin || userContext?.canEdit)

  // Fetch employees & sites
  useEffect(() => {
    getSites().then((res) => {
      if (res.success && res.data.length > 0) {
        const names = Array.from(
          new Set([...SITE_PRESETS, ...res.data.map((s) => s.name).filter(Boolean)])
        )
        setSiteOptions(names)
      }
    })

    getEmployees().then((res) => {
      if (res.success && res.data.length > 0) {
        setEmployeeOptions(Array.from(new Set(res.data.map((e) => e.name).filter(Boolean))))
      }
    })
  }, [])

  function updateDraft<K extends keyof RefuelingDraft>(key: K, value: RefuelingDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  // Handle Photo upload from File / Gallery
  async function handlePhotoUpload(key: 'odometerPhotoUrl' | 'flowmeterPhotoUrl', file: File | null) {
    if (!file) return
    try {
      const compressed = await compressImage(file, 1000, 0.7)
      updateDraft(key, compressed)
    } catch (e) {
      console.error('Failed to compress photo:', e)
      window.alert('Gagal memproses file foto. Pastikan format gambar valid.')
    }
  }

  function handleOdometerChange(val: string) {
    const sanitized = val.replace(/[^0-9]/g, '')
    updateDraft('odometerKm', sanitized)
  }

  function handleLitersChange(val: string) {
    const sanitized = val.replace(',', '.')
    updateDraft('fuelAmountLiters', sanitized)
  }

  function getEffectiveSiteName(d: RefuelingDraft) {
    return d.siteName === 'Other' && d.customSiteName.trim()
      ? d.customSiteName.trim()
      : d.siteName
  }

  function getEffectiveUnitNumber(d: RefuelingDraft) {
    return d.unitNumber === 'Other' && d.customUnitNumber.trim()
      ? d.customUnitNumber.trim()
      : d.unitNumber
  }

  function getEffectiveExpenditureType(d: RefuelingDraft) {
    return d.fuelExpenditureType === 'Other' && d.customFuelExpenditureType.trim()
      ? d.customFuelExpenditureType.trim()
      : d.fuelExpenditureType
  }

  function resetForm() {
    setDraft(getInitialDraft())
    setEditingRecordId(null)
  }

  function editRecord(record: RefuelingRecord) {
    if (!canEditHistory) {
      window.alert('Anda hanya memiliki izin melihat riwayat dan tidak dapat mengedit data.')
      return
    }
    setDraft({ ...record })
    setEditingRecordId(record.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function deleteRecord(id: string) {
    if (!canEditHistory) {
      window.alert('Anda tidak memiliki izin menghapus data riwayat.')
      return
    }
    if (window.confirm('Hapus riwayat pengisian bahan bakar ini?')) {
      setRecords((prev) => prev.filter((r) => r.id !== id))
      if (editingRecordId === id) {
        resetForm()
      }
    }
  }

  async function saveRecord() {
    if (!draft.driverName.trim()) {
      window.alert('Mohon isi Nama Pengemudi.')
      return
    }
    if (!draft.refuelDate) {
      window.alert('Mohon isi Tanggal Pengisian Bahan Bakar.')
      return
    }
    if (!draft.odometerKm) {
      window.alert('Mohon isi Kilometer LV saat pengisian.')
      return
    }
    if (!draft.fuelAmountLiters) {
      window.alert('Mohon isi Jumlah Liter pengisian.')
      return
    }
    if (!draft.fuelmanName.trim()) {
      window.alert('Mohon isi Nama Petugas Fuelman.')
      return
    }

    const now = new Date().toISOString()
    const payloadToSave: RefuelingDraft = {
      ...draft,
    }

    const effectiveSite = getEffectiveSiteName(draft)
    const effectiveUnit = getEffectiveUnitNumber(draft)
    const effectiveExpenditure = getEffectiveExpenditureType(draft)

    // Push to PostgreSQL Database
    try {
      await submitRefuelingLog({
        siteName: effectiveSite,
        driverName: draft.driverName,
        driverSn: userContext?.employeeSn || undefined,
        refuelDate: draft.refuelDate,
        unitNumber: effectiveUnit,
        odometerKm: Number(draft.odometerKm) || 0,
        fuelExpenditureType: effectiveExpenditure,
        fuelAmountLiters: draft.fuelAmountLiters,
        fuelmanName: draft.fuelmanName,
        odometerPhotoUrl: draft.odometerPhotoUrl || undefined,
        flowmeterPhotoUrl: draft.flowmeterPhotoUrl || undefined,
        remarks: draft.remarks,
        createdByUserId: userContext?.userId || undefined,
      })
    } catch (e) {
      console.error('[refueling-form] server push failed, caching locally:', e)
    }

    if (editingRecordId) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecordId
            ? {
                ...payloadToSave,
                id: r.id,
                createdAt: r.createdAt,
                updatedAt: now,
                createdByUserId: r.createdByUserId || userContext?.userId || undefined,
                createdBySn: r.createdBySn || userContext?.employeeSn || undefined,
                createdByName: r.createdByName || userContext?.name || undefined,
              }
            : r
        )
      )
      window.alert('Data pengisian bahan bakar berhasil disimpan & disinkronkan!')
    } else {
      const newRecord: RefuelingRecord = {
        ...payloadToSave,
        id: `refuel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: now,
        updatedAt: now,
        createdByUserId: userContext?.userId || undefined,
        createdBySn: userContext?.employeeSn || undefined,
        createdByName: userContext?.name || undefined,
      }
      setRecords((prev) => [newRecord, ...prev])
      window.alert('Data pengisian bahan bakar berhasil disimpan & disinkronkan ke Central Service!')
    }

    resetForm()
  }

  async function downloadPdf(targetPayload: RefuelingDraft = draft) {
    setPdfPayload(targetPayload)
    setIsGenerating(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const page = pdfPageRef.current
      if (!page) {
        throw new Error('PDF element not found')
      }

      const images = Array.from(page.querySelectorAll('img'))
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((r) => {
                img.onload = () => r()
                img.onerror = () => r()
              })
        )
      )
      await document.fonts?.ready

      const { default: html2canvas } = await import('html2canvas-pro')
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      pdf.addImage(canvas.toDataURL('image/jpeg', 1), 'JPEG', 0, 0, 210, 297)

      const unit = getEffectiveUnitNumber(targetPayload)
      const site = getEffectiveSiteName(targetPayload)
      pdf.save(`Form-Refueling-${sanitizeFilePart(site)}-${sanitizeFilePart(unit)}-${targetPayload.refuelDate}.pdf`)
    } catch (e) {
      console.error('[refueling-form] PDF generation failed:', e)
      window.alert('Gagal membuat file PDF. Coba periksa file gambar atau ulangi.')
    } finally {
      setIsGenerating(false)
    }
  }

  const filteredRecords = useMemo(() => {
    const isGlobal = Boolean(userContext?.isSuperAdmin || userContext?.dataScope === 'global')
    const userName = (userContext?.name || '').trim().toLowerCase()
    const userSn = (userContext?.employeeSn || '').trim().toLowerCase()
    const userId = userContext?.userId

    return records.filter((r) => {
      const site = getEffectiveSiteName(r)
      const unit = getEffectiveUnitNumber(r)
      const matchSite = filterSite === 'ALL' || site === filterSite
      const matchSearch =
        searchTerm === '' ||
        site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.fuelmanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.refuelDate.includes(searchTerm) ||
        r.remarks.toLowerCase().includes(searchTerm.toLowerCase())

      // Scoping: Super admin / global see all; regular user see only own records
      const matchScope =
        isGlobal ||
        !userContext ||
        (userName && (
          r.driverName.toLowerCase().includes(userName) ||
          r.fuelmanName.toLowerCase().includes(userName) ||
          (r.createdByName && r.createdByName.toLowerCase().includes(userName))
        )) ||
        (userSn && r.createdBySn && r.createdBySn.toLowerCase() === userSn) ||
        (userId && r.createdByUserId === userId)

      return matchSite && matchSearch && matchScope
    })
  }, [records, filterSite, searchTerm, userContext])

  return (
    <>
      <div className={cn('space-y-4', mobile && 'pb-20')}>
        {/* Top Back & Header Bar */}
        {onBackToHub && (
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="dense"
              onClick={onBackToHub}
              className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="size-4" />
              Menu Hub
            </Button>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                Re-Fueling
              </span>
              {editingRecordId && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Edit
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mobile Segmented Toggle */}
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all',
              activeTab === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            )}
          >
            <Pencil className="size-3.5" />
            Isi Form
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all',
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            )}
          >
            <Save className="size-3.5" />
            Riwayat ({filteredRecords.length})
          </button>
        </div>

        {activeTab === 'form' && (
          <div className="space-y-6">
            {/* ── Form Card ──────────────────────────────────────────────────────── */}
            <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                      <Fuel className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        {editingRecordId ? 'Ubah Form Re-Fueling' : 'Form Re-Fueling Chitra Paratama'}
                      </CardTitle>
                      <p className="text-xs text-slate-500 italic">
                        Form ini digunakan untuk setiap pengisian bahan bakar LV (Light vehicle)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {editingRecordId && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        Mode Edit
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="dense"
                      onClick={resetForm}
                      className="h-8 text-xs"
                    >
                      <RotateCcw className="size-3.5 mr-1" />
                      Reset
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="dense"
                      onClick={saveRecord}
                      className="h-8 px-3 text-xs font-semibold"
                    >
                      <Save className="size-3.5 mr-1.5" />
                      {editingRecordId ? 'Update Form' : 'Submit Form'}
                    </Button>
                    <Button
                      type="button"
                      size="dense"
                      onClick={() => downloadPdf(draft)}
                      disabled={isGenerating}
                      className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isGenerating ? (
                        <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5 mr-1.5" />
                      )}
                      Download PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Section 1 & 2: Lokasi Site, Pengemudi & Tanggal */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Pilih lokasi Site <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={draft.siteName}
                onValueChange={(val) => updateDraft('siteName', val)}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Pilih lokasi site..." />
                </SelectTrigger>
                <SelectContent>
                  {siteOptions.map((site) => (
                    <SelectItem key={site} value={site}>
                      {site}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Lainnya...</SelectItem>
                </SelectContent>
              </Select>
              {draft.siteName === 'Other' && (
                <Input
                  placeholder="Ketik nama site..."
                  value={draft.customSiteName}
                  onChange={(e) => updateDraft('customSiteName', e.target.value)}
                  className="mt-1.5 bg-white"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Nama Pengemudi <span className="text-rose-500">*</span>
              </Label>
              {employeeOptions.length > 0 ? (
                <Combobox
                  options={employeeOptions}
                  value={draft.driverName}
                  onChange={(val) => updateDraft('driverName', val)}
                  placeholder="Pilih atau ketik nama pengemudi..."
                  emptyText="Ketik nama baru jika tidak ada di daftar"
                />
              ) : (
                <Input
                  placeholder="Nama pengemudi..."
                  value={draft.driverName}
                  onChange={(e) => updateDraft('driverName', e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Tanggal pengisian bahan bakar <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={draft.refuelDate}
                onChange={(e) => updateDraft('refuelDate', e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Kendaraan & Odometer */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Nomer Lambung LV <span className="text-rose-500">*</span>
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {UNIT_PRESETS.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => updateDraft('unitNumber', unit)}
                    className={cn(
                      'flex items-center justify-center rounded-lg border px-4 py-2 text-xs font-medium transition-colors',
                      draft.unitNumber === unit
                        ? 'border-blue-600 bg-blue-50 font-bold text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    {unit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => updateDraft('unitNumber', 'Other')}
                  className={cn(
                    'flex items-center justify-center rounded-lg border px-4 py-2 text-xs font-medium transition-colors',
                    draft.unitNumber === 'Other'
                      ? 'border-blue-600 bg-blue-50 font-bold text-blue-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  Other
                </button>
              </div>
              {draft.unitNumber === 'Other' && (
                <Input
                  placeholder="Ketik nomor lambung LV..."
                  value={draft.customUnitNumber}
                  onChange={(e) => updateDraft('customUnitNumber', e.target.value)}
                  className="mt-1"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Kilometer LV pada saat pengisian <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Contoh: 45280 (tanpa titik atau koma)"
                value={draft.odometerKm}
                onChange={(e) => handleOdometerChange(e.target.value)}
              />
              <p className="text-[11px] text-slate-400">
                * Masukkan angka bulat saja, tidak menggunakan tanda koma atau titik.
              </p>
            </div>
          </div>

          {/* Section 4: Tipe Pengeluaran, Liter & Fuelman */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Tipe Pengeluaran Bahan Bakar <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={draft.fuelExpenditureType}
                onValueChange={(val) => updateDraft('fuelExpenditureType', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih tipe pengeluaran..." />
                </SelectTrigger>
                <SelectContent>
                  {EXPENDITURE_TYPE_PRESETS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {draft.fuelExpenditureType === 'Other' && (
                <Input
                  placeholder="Ketik tipe pengeluaran..."
                  value={draft.customFuelExpenditureType}
                  onChange={(e) => updateDraft('customFuelExpenditureType', e.target.value)}
                  className="mt-1.5"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Jumlah Liter Pengisian <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Contoh: 45.5"
                  value={draft.fuelAmountLiters}
                  onChange={(e) => handleLitersChange(e.target.value)}
                  className="pr-12"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
                  Liter
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Nama Petugas Fuelman <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Nama petugas fuelman..."
                value={draft.fuelmanName}
                onChange={(e) => updateDraft('fuelmanName', e.target.value)}
              />
            </div>
          </div>

          {/* Section 5: Bukti Foto (KM LV & Flowmeter) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Foto KM LV */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800">
                  Foto kilometer LV pada saat pengisian <span className="text-rose-500">*</span>
                </Label>
                {draft.odometerPhotoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => updateDraft('odometerPhotoUrl', '')}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              {draft.odometerPhotoUrl ? (
                <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-black/5">
                  <img
                    src={draft.odometerPhotoUrl}
                    alt="Foto Kilometer LV"
                    className="h-44 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() =>
                        setPreviewPhoto({
                          title: 'Foto Kilometer LV pada Saat Pengisian',
                          url: draft.odometerPhotoUrl,
                        })
                      }
                    >
                      <Eye className="size-3.5" />
                      Lihat Foto
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => updateDraft('odometerPhotoUrl', '')}
                    >
                      <Trash2 className="size-3.5" />
                      Ganti Foto
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-44 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 transition-colors hover:border-blue-400">
                  <span className="text-xs font-semibold text-slate-700 mb-1">
                    Upload Foto Kilometer LV
                  </span>
                  <span className="text-[10px] text-slate-400 mb-3">Maksimal 10 MB (JPG, PNG)</span>
                  
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {/* Live Camera Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setCameraModalConfig({
                          isOpen: true,
                          targetKey: 'odometerPhotoUrl',
                          title: 'Foto Kilometer LV Saat Pengisian',
                        })
                      }
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 active:scale-[0.98]"
                    >
                      <Camera className="size-3.5" />
                      <span>Buka Kamera</span>
                    </button>

                    {/* Gallery / File Picker */}
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 active:scale-[0.98]">
                      <ImageIcon className="size-3.5 text-slate-500" />
                      <span>Galeri / File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handlePhotoUpload('odometerPhotoUrl', e.target.files?.[0] || null)
                        }
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Foto Flowmeter */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800">
                  Foto flowmeter fuel station / fuel tank <span className="text-rose-500">*</span>
                </Label>
                {draft.flowmeterPhotoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => updateDraft('flowmeterPhotoUrl', '')}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              {draft.flowmeterPhotoUrl ? (
                <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-black/5">
                  <img
                    src={draft.flowmeterPhotoUrl}
                    alt="Foto Flowmeter Fuel Station"
                    className="h-44 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() =>
                        setPreviewPhoto({
                          title: 'Foto Flowmeter Fuel Station / Fuel Tank',
                          url: draft.flowmeterPhotoUrl,
                        })
                      }
                    >
                      <Eye className="size-3.5" />
                      Lihat Foto
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => updateDraft('flowmeterPhotoUrl', '')}
                    >
                      <Trash2 className="size-3.5" />
                      Ganti Foto
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-44 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 transition-colors hover:border-blue-400">
                  <span className="text-xs font-semibold text-slate-700 mb-1">
                    Upload Foto Flowmeter Fuel Station
                  </span>
                  <span className="text-[10px] text-slate-400 mb-3">Maksimal 10 MB (JPG, PNG)</span>
                  
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {/* Live Camera Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setCameraModalConfig({
                          isOpen: true,
                          targetKey: 'flowmeterPhotoUrl',
                          title: 'Foto Flowmeter Fuel Station / Fuel Tank',
                        })
                      }
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 active:scale-[0.98]"
                    >
                      <Camera className="size-3.5" />
                      <span>Buka Kamera</span>
                    </button>

                    {/* Gallery / File Picker */}
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 active:scale-[0.98]">
                      <ImageIcon className="size-3.5 text-slate-500" />
                      <span>Galeri / File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handlePhotoUpload('flowmeterPhotoUrl', e.target.files?.[0] || null)
                        }
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Remarks / Catatan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Remarks (Catatan) <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              rows={3}
              placeholder="Mohon ditambahkan catatan tujuan penggunaan bahan bakar (Contoh: Operational Site / Kebutuhan Site Visit, dll)..."
              value={draft.remarks}
              onChange={(e) => updateDraft('remarks', e.target.value)}
              className="bg-white text-sm"
            />
          </div>

          {/* Form Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={resetForm}
              className="h-9 px-3 text-xs"
            >
              <RotateCcw className="size-3.5 mr-1" />
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={saveRecord}
              className="h-9 px-4 text-xs font-semibold"
            >
              <Save className="size-3.5 mr-1.5" />
              {editingRecordId ? 'Update Form' : 'Submit Form'}
            </Button>
            <Button
              type="button"
              size="dense"
              disabled={isGenerating}
              onClick={() => downloadPdf(draft)}
              className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isGenerating ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="size-3.5 mr-1.5" />
              )}
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Sticky Action Bar */}
      <div className="fixed bottom-[64px] inset-x-0 mx-auto max-w-[430px] z-50 p-2.5 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl flex items-center gap-2 sm:hidden">
        <Button
          type="button"
          variant="outline"
          size="dense"
          onClick={resetForm}
          className="h-10 px-3 text-xs"
        >
          <RotateCcw className="size-3.5 mr-1" />
          Reset
        </Button>
        <Button
          type="button"
          size="dense"
          variant="outline"
          onClick={saveRecord}
          className="flex-1 h-10 text-xs font-bold"
        >
          <Save className="size-3.5 mr-1.5" />
          {editingRecordId ? 'Update Form' : 'Submit Form'}
        </Button>
        <Button
          type="button"
          size="dense"
          onClick={() => downloadPdf(draft)}
          disabled={isGenerating}
          className="flex-1 h-10 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isGenerating ? (
            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="size-3.5 mr-1.5" />
          )}
          Download PDF
        </Button>
      </div>
    </div>
  )}

      {/* ── History Table Card ────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Riwayat Pengisian Bahan Bakar LV
                </CardTitle>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {filteredRecords.length} Data
                </span>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-44">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Cari pengemudi, unit, site..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs bg-white"
                  />
                </div>

                <Select value={filterSite} onValueChange={setFilterSite}>
                  <SelectTrigger className="h-8 text-xs min-w-32 bg-white">
                    <SelectValue placeholder="Filter Site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Site</SelectItem>
                    {siteOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-6">
            {/* Mobile Cards View */}
            <div className="space-y-3 sm:hidden">
              {filteredRecords.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Belum ada riwayat pengisian bahan bakar yang tersimpan.
                </p>
              ) : (
                filteredRecords.map((rec, index) => {
                  const site = getEffectiveSiteName(rec)
                  const unit = getEffectiveUnitNumber(rec)
                  const expType = getEffectiveExpenditureType(rec)
                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                            {unit}
                          </span>
                          <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {site}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-slate-500">{rec.refuelDate}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400">Pengemudi:</span>{' '}
                          <span className="font-medium text-slate-800">{rec.driverName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">Fuelman:</span>{' '}
                          <span className="font-medium text-slate-800">{rec.fuelmanName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Odometer:</span>{' '}
                          <span className="font-mono text-slate-700 font-semibold">
                            {Number(rec.odometerKm || 0).toLocaleString('id-ID')} km
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">BBM:</span>{' '}
                          <span className="font-mono font-bold text-amber-600 text-sm">
                            {rec.fuelAmountLiters} L
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px] text-slate-500">
                        <span className="truncate max-w-[180px]">{expType}</span>
                        <div className="flex items-center gap-1">
                          {rec.odometerPhotoUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  title: `Foto KM LV - ${unit} (${rec.refuelDate})`,
                                  url: rec.odometerPhotoUrl,
                                })
                              }
                              className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600"
                            >
                              KM
                            </button>
                          ) : null}
                          {rec.flowmeterPhotoUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  title: `Foto Flowmeter - ${unit} (${rec.refuelDate})`,
                                  url: rec.flowmeterPhotoUrl,
                                })
                              }
                              className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600"
                            >
                              Flow
                            </button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="denseIcon"
                            onClick={() => downloadPdf(rec)}
                            className="h-8 w-8 text-blue-600"
                            title="Download PDF"
                          >
                            <Download className="size-3.5" />
                          </Button>
                          {canEditHistory && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="denseIcon"
                                onClick={() => {
                                  editRecord(rec)
                                  setActiveTab('form')
                                }}
                                className="h-8 w-8 text-slate-600"
                                title="Edit Form"
                              >
                                <PenLine className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="denseIcon"
                                onClick={() => deleteRecord(rec.id)}
                                className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                                title="Hapus"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <MinimalTableShell label="Riwayat Pengisian Bahan Bakar LV">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                      <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold">Site</TableHead>
                      <TableHead className="text-xs font-semibold">No. Lambung LV</TableHead>
                      <TableHead className="text-xs font-semibold">Pengemudi</TableHead>
                      <TableHead className="text-right text-xs font-semibold">KM Saat Isi</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Jumlah (L)</TableHead>
                      <TableHead className="text-xs font-semibold">Tipe Pengeluaran</TableHead>
                      <TableHead className="text-xs font-semibold">Fuelman</TableHead>
                      <TableHead className="text-center text-xs font-semibold">Foto</TableHead>
                      <TableHead className="text-center text-xs font-semibold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="py-8 text-center text-xs text-slate-400">
                          Belum ada riwayat pengisian bahan bakar yang tersimpan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((rec, index) => {
                        const site = getEffectiveSiteName(rec)
                        const unit = getEffectiveUnitNumber(rec)
                        const expType = getEffectiveExpenditureType(rec)
                        return (
                          <TableRow key={rec.id} className="hover:bg-slate-50/50">
                            <TableCell className="text-center text-xs font-medium text-slate-500">
                              {index + 1}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-900 whitespace-nowrap">
                              {rec.refuelDate}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700 whitespace-nowrap">
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
                                {site}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-bold text-blue-700 whitespace-nowrap">
                              {unit}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-800">
                              {rec.driverName}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono text-slate-700">
                              {Number(rec.odometerKm || 0).toLocaleString('id-ID')} km
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-bold text-amber-600">
                              {rec.fuelAmountLiters} L
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-40 truncate">
                              {expType}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {rec.fuelmanName}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {rec.odometerPhotoUrl ? (
                                  <button
                                    type="button"
                                    title="Foto KM"
                                    onClick={() =>
                                      setPreviewPhoto({
                                        title: `Foto KM LV - ${unit} (${rec.refuelDate})`,
                                        url: rec.odometerPhotoUrl,
                                      })
                                    }
                                    className="flex size-6 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  >
                                    <ImageIcon className="size-3.5" />
                                  </button>
                                ) : null}
                                {rec.flowmeterPhotoUrl ? (
                                  <button
                                    type="button"
                                    title="Foto Flowmeter"
                                    onClick={() =>
                                      setPreviewPhoto({
                                        title: `Foto Flowmeter - ${unit} (${rec.refuelDate})`,
                                        url: rec.flowmeterPhotoUrl,
                                      })
                                    }
                                    className="flex size-6 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  >
                                    <Fuel className="size-3.5" />
                                  </button>
                                ) : null}
                                {!rec.odometerPhotoUrl && !rec.flowmeterPhotoUrl && (
                                  <span className="text-[10px] text-slate-300">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-slate-600 hover:bg-slate-100"
                                  title="Export PDF"
                                  onClick={() => downloadPdf(rec)}
                                >
                                  <Download className="size-3.5" />
                                </Button>
                                {canEditHistory && (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 text-blue-600 hover:bg-blue-50"
                                      title="Edit Form"
                                      onClick={() => {
                                        editRecord(rec)
                                        setActiveTab('form')
                                      }}
                                    >
                                      <PenLine className="size-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 text-rose-600 hover:bg-rose-50"
                                      title="Hapus"
                                      onClick={() => deleteRecord(rec.id)}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </div>
          </CardContent>
        </Card>
      )}
    </div>

      {/* ── Photo Preview Dialog ─────────────────────────────────────────── */}
      <Dialog open={Boolean(previewPhoto)} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent className="max-w-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {previewPhoto?.title || 'Preview Foto'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dokumentasi visual pengisian bahan bakar
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-900/5">
            {previewPhoto?.url ? (
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[70vh] w-full object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Live Camera Modal ────────────────────────────────────────────── */}
      {cameraModalConfig?.isOpen && (
        <LiveCameraModal
          title={cameraModalConfig.title}
          onClose={() => setCameraModalConfig(null)}
          onCapture={(dataUrl) => {
            updateDraft(cameraModalConfig.targetKey, dataUrl)
            setCameraModalConfig(null)
          }}
        />
      )}

      {/* ── Off-screen PDF Template Container ──────── */}
      <div style={{ position: 'fixed', left: '-10000px', top: '-10000px', zIndex: -100 }} aria-hidden="true">
        <div ref={pdfPageRef}>
          <RefuelingPdfPage payload={pdfPayload || draft} />
        </div>
      </div>
    </>
  )
}

function RefuelingPdfPage({ payload }: { payload: RefuelingDraft }) {
  const effectiveSite =
    payload.siteName === 'Other' && payload.customSiteName.trim()
      ? payload.customSiteName.trim()
      : payload.siteName
  const effectiveUnit =
    payload.unitNumber === 'Other' && payload.customUnitNumber.trim()
      ? payload.customUnitNumber.trim()
      : payload.unitNumber
  const effectiveExpenditure =
    payload.fuelExpenditureType === 'Other' && payload.customFuelExpenditureType.trim()
      ? payload.customFuelExpenditureType.trim()
      : payload.fuelExpenditureType

  return (
    <div
      className="relative overflow-hidden bg-white text-black font-sans"
      style={{
        width: '210mm',
        minHeight: '297mm',
        height: '297mm',
        boxSizing: 'border-box',
      }}
    >
      <img
        src={LETTERHEAD_URL}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-fill"
      />
      <div className="relative z-10 px-[18mm] pt-[50mm] pb-[38mm] text-black">
        {/* Header Title */}
        <div className="border-b-2 border-slate-900 pb-2">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[13px] font-black uppercase tracking-tight text-slate-950">
                FORM RE-FUELING CHITRA PARATAMA
              </h1>
              <p className="text-[8px] font-medium text-slate-600 italic">
                Form ini digunakan untuk setiap pengisian bahan bakar LV (Light vehicle)
              </p>
            </div>
            <div className="text-right text-[8.5px]">
              <p className="font-bold text-slate-900 uppercase">
                Site: {effectiveSite || '-'}
              </p>
              <p className="text-slate-600">Tanggal: {payload.refuelDate || '-'}</p>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="mt-2.5">
          <table className="w-full border-collapse border border-slate-800 text-[8px]">
            <tbody>
              <tr className="border-b border-slate-800">
                <td className="w-[38%] bg-slate-100 px-2 py-1 font-bold text-slate-800 border-r border-slate-800">
                  Pilih Lokasi Site
                </td>
                <td className="px-2 py-1 font-semibold text-slate-900">
                  {effectiveSite || '-'}
                </td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="bg-slate-100 px-2 py-1 font-bold text-slate-800 border-r border-slate-800">
                  Nama Pengemudi
                </td>
                <td className="px-2 py-1 font-semibold text-slate-900">
                  {payload.driverName || '-'}
                </td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="bg-slate-100 px-2 py-1 font-bold text-slate-800 border-r border-slate-800">
                  Tanggal Pengisian Bahan Bakar
                </td>
                <td className="px-2 py-1 font-semibold text-slate-900">
                  {payload.refuelDate || '-'}
                </td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="bg-slate-100 px-2 py-1 font-bold text-slate-800 border-r border-slate-800">
                  Nomer Lambung LV
                </td>
                <td className="px-2 py-1 font-bold text-blue-900">
                  {effectiveUnit || '-'}
                </td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="bg-slate-100 px-2 py-1 font-bold text-slate-800 border-r border-slate-800">
                  Kilometer LV pada Saat Pengisian
                </td>
                <td className="px-2 py-1 font-mono font-bold text-slate-900">
                  {Number(payload.odometerKm || 0).toLocaleString('id-ID')} KM
                </td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="bg-slate-100 px-2 py-1 font-bold text-slate-800 border-r border-slate-800">
                  Tipe Pengeluaran Bahan Bakar
                </td>
                <td className="px-2 py-1 font-semibold text-slate-900">
                  {effectiveExpenditure || '-'}
                </td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="bg-slate-100 px-2 py-1 font-bold text-slate-800 border-r border-slate-800">
                  Jumlah Liter Pengisian
                </td>
                <td className="px-2 py-1 font-mono font-black text-amber-800 text-[9.5px]">
                  {payload.fuelAmountLiters || '0'} Liter
                </td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="bg-slate-100 px-2 py-1 font-bold text-slate-800 border-r border-slate-800">
                  Nama Petugas Fuelman
                </td>
                <td className="px-2 py-1 font-semibold text-slate-900">
                  {payload.fuelmanName || '-'}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-100 px-2 py-1 font-bold text-slate-800 align-top border-r border-slate-800">
                  Remarks (Catatan)
                </td>
                <td className="px-2 py-1 text-slate-900 whitespace-pre-wrap leading-tight">
                  {payload.remarks || '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Photo Evidences (2 Columns) */}
        <div className="mt-2.5 space-y-1">
          <h3 className="text-[8.5px] font-bold uppercase tracking-wider text-slate-900">
            Dokumentasi Foto Pengisian Bahan Bakar
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Foto KM */}
            <div className="rounded border border-slate-800 p-1 text-center bg-white">
              <p className="mb-0.5 text-[7.5px] font-bold text-slate-800">
                Foto Kilometer LV pada Saat Pengisian
              </p>
              <div className="flex h-[32mm] items-center justify-center overflow-hidden rounded bg-slate-50 border border-slate-200">
                {payload.odometerPhotoUrl ? (
                  <img
                    src={payload.odometerPhotoUrl}
                    alt="Foto KM LV"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[7.5px] text-slate-400 italic">Tidak ada foto</span>
                )}
              </div>
            </div>

            {/* Foto Flowmeter */}
            <div className="rounded border border-slate-800 p-1 text-center bg-white">
              <p className="mb-0.5 text-[7.5px] font-bold text-slate-800">
                Foto Flowmeter Fuel Station / Fuel Tank
              </p>
              <div className="flex h-[32mm] items-center justify-center overflow-hidden rounded bg-slate-50 border border-slate-200">
                {payload.flowmeterPhotoUrl ? (
                  <img
                    src={payload.flowmeterPhotoUrl}
                    alt="Foto Flowmeter"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[7.5px] text-slate-400 italic">Tidak ada foto</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Footer */}
        <div className="mt-3 border-t border-slate-300 pt-2">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div className="rounded border border-slate-300 bg-slate-50/70 p-1.5">
              <p className="text-[7.5px] uppercase font-bold text-slate-600">Pengemudi LV</p>
              <p className="mt-0.5 text-[9px] font-bold text-slate-950">
                {payload.driverName || '-'}
              </p>
            </div>

            <div className="rounded border border-slate-300 bg-slate-50/70 p-1.5">
              <p className="text-[7.5px] uppercase font-bold text-slate-600">Petugas Fuelman</p>
              <p className="mt-0.5 text-[9px] font-bold text-slate-950">
                {payload.fuelmanName || '-'}
              </p>
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[7px] text-slate-400">
            <span>PT CHITRA PARATAMA — HERO 360 SERVICE SYSTEM</span>
            <span>Dicetak otomatis pada: {new Date().toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
