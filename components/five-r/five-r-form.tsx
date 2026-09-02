'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  PenTool,
  Plus,
  Trash2,
  Upload,
  ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { SignaturePad } from '@/components/signature-pad'
import { FiveRCameraModal } from './five-r-camera-modal'
import { FiveRDetailDialog } from './five-r-detail-dialog'
import { createFiveRReportAction, getPreviousOpenFindingsAction } from '@/app/dashboard/quality/5r/actions'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const PILLAR_OPTIONS = [
  { label: 'Sangat Baik (0 Temuan)', value: 100 },
  { label: 'Baik (1 Temuan)', value: 80 },
  { label: 'Cukup Baik (2 Temuan)', value: 60 },
  { label: 'Kurang Baik (3-4 Temuan)', value: 40 },
  { label: 'Tidak Baik (>5 Temuan)', value: 20 },
]

export type MasterAreaOption = {
  id: number
  name: string
  areaScale: string
  siteId: number
  siteName: string | null
  picEmployeeId: number | null
  picName: string | null
}

type FindingRow = {
  id: string
  category5r: 'Rapi' | 'Ringkas' | 'Resik' | 'Rawat' | 'Rajin'
  area: string
  findingDescription: string
  findingPhotoUrl: string
  actionDescription: string
  actionPhotoUrl: string
  noFindingPhotoUrl: string
}

type FiveRFormProps = {
  masterAreas: MasterAreaOption[]
  currentUser: {
    id: number
    name: string
    email: string
    siteId: number | null
  }
}

export function FiveRForm({ masterAreas, currentUser }: FiveRFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = Boolean(pathname?.startsWith('/mobile'))
  const returnUrl = isMobile ? '/mobile/quality/5r' : '/dashboard/quality/5r'
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Header State
  const [selectedAreaId, setSelectedAreaId] = useState<string>('')
  const [customAreaName, setCustomAreaName] = useState<string>('')
  const [auditorName, setAuditorName] = useState<string>(currentUser.name || '')
  const [auditorEmail, setAuditorEmail] = useState<string>(currentUser.email || '')
  const currentMonth = MONTHS[new Date().getMonth()]
  const [auditPeriod, setAuditPeriod] = useState<string>(currentMonth)
  const todayFormatted = new Date().toISOString().split('T')[0]
  const [auditDate, setAuditDate] = useState<string>(todayFormatted)
  const [reportType, setReportType] = useState<
    'ada_temuan' | 'after_temuan_sebelumnya' | 'tidak_ada_temuan'
  >('ada_temuan')
  const [auditorSignature, setAuditorSignature] = useState<string | null>(null)
  const [createdReportId, setCreatedReportId] = useState<number | null>(null)

  // 5 Pillars State
  const [scoreRapi, setScoreRapi] = useState<number>(100)
  const [scoreRingkas, setScoreRingkas] = useState<number>(100)
  const [scoreResik, setScoreResik] = useState<number>(100)
  const [scoreRawat, setScoreRawat] = useState<number>(100)
  const [scoreRajin, setScoreRajin] = useState<number>(100)

  // Nilai Audit Calculation (Average 0 - 100)
  const auditScore = useMemo(() => {
    return Math.round(
      (scoreRapi + scoreRingkas + scoreResik + scoreRawat + scoreRajin) / 5
    )
  }, [scoreRapi, scoreRingkas, scoreResik, scoreRawat, scoreRajin])

  // Table Findings State
  const [findings, setFindings] = useState<FindingRow[]>([])

  // Camera Modal State
  const [cameraTarget, setCameraTarget] = useState<{
    rowIndex: number
    field: 'findingPhotoUrl' | 'actionPhotoUrl' | 'noFindingPhotoUrl'
  } | null>(null)

  // Previous Open Findings for "After" mode
  const [openFindingsList, setOpenFindingsList] = useState<any[]>([])
  const [isLoadingOpenFindings, setIsLoadingOpenFindings] = useState(false)
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)

  // Lightbox Image Preview State
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)

  const DRAFT_KEY = 'hero_5r_form_draft_v1'

  // Restore draft from localStorage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.selectedAreaId !== undefined) setSelectedAreaId(parsed.selectedAreaId)
        if (parsed.customAreaName !== undefined) setCustomAreaName(parsed.customAreaName)
        if (parsed.auditorName !== undefined) setAuditorName(parsed.auditorName)
        if (parsed.auditorEmail !== undefined) setAuditorEmail(parsed.auditorEmail)
        if (parsed.auditPeriod !== undefined) setAuditPeriod(parsed.auditPeriod)
        if (parsed.auditDate !== undefined) setAuditDate(parsed.auditDate)
        if (parsed.reportType !== undefined) setReportType(parsed.reportType)
        if (parsed.scoreRapi !== undefined) setScoreRapi(parsed.scoreRapi)
        if (parsed.scoreRingkas !== undefined) setScoreRingkas(parsed.scoreRingkas)
        if (parsed.scoreResik !== undefined) setScoreResik(parsed.scoreResik)
        if (parsed.scoreRawat !== undefined) setScoreRawat(parsed.scoreRawat)
        if (parsed.scoreRajin !== undefined) setScoreRajin(parsed.scoreRajin)
        if (Array.isArray(parsed.findings) && parsed.findings.length > 0) {
          setFindings(parsed.findings)
        }
        setHasRestoredDraft(true)
      }
    } catch (e) {
      console.warn('Failed to restore 5R draft:', e)
    }
  }, [])

  // Auto-save form state to localStorage whenever changed
  useEffect(() => {
    try {
      const draft = {
        selectedAreaId,
        customAreaName,
        auditorName,
        auditorEmail,
        auditPeriod,
        auditDate,
        reportType,
        scoreRapi,
        scoreRingkas,
        scoreResik,
        scoreRawat,
        scoreRajin,
        findings,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch (e) {
      console.warn('Failed to save 5R draft:', e)
    }
  }, [
    selectedAreaId,
    customAreaName,
    auditorName,
    auditorEmail,
    auditPeriod,
    auditDate,
    reportType,
    scoreRapi,
    scoreRingkas,
    scoreResik,
    scoreRawat,
    scoreRajin,
    findings,
  ])

  function resetFormDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY)
      setSelectedAreaId('')
      setCustomAreaName('')
      setAuditorName(currentUser.name || '')
      setAuditorEmail(currentUser.email || '')
      setAuditPeriod(MONTHS[new Date().getMonth()])
      setAuditDate(new Date().toISOString().split('T')[0])
      setReportType('ada_temuan')
      setScoreRapi(100)
      setScoreRingkas(100)
      setScoreResik(100)
      setScoreRawat(100)
      setScoreRajin(100)
      setFindings([])
      setHasRestoredDraft(false)
      toast.success('Formulir berhasil di-reset.')
    } catch (e) {
      console.error(e)
    }
  }

  // Auto-fill area details if master area is selected
  const selectedAreaObj = useMemo(() => {
    return masterAreas.find((a) => a.id.toString() === selectedAreaId)
  }, [masterAreas, selectedAreaId])

  useEffect(() => {
    if (selectedAreaObj && selectedAreaId !== 'custom') {
      setCustomAreaName(selectedAreaObj.name)
    }
  }, [selectedAreaObj, selectedAreaId])

  // Load previous open findings when switching to "after_temuan_sebelumnya"
  useEffect(() => {
    if (reportType === 'after_temuan_sebelumnya') {
      setIsLoadingOpenFindings(true)
      getPreviousOpenFindingsAction({
        siteId: selectedAreaObj?.siteId ?? currentUser.siteId ?? undefined,
        masterAreaId: selectedAreaObj?.id ?? undefined,
      })
        .then((res) => {
          if (res.success) setOpenFindingsList(res.data)
        })
        .finally(() => setIsLoadingOpenFindings(false))
    }
  }, [reportType, selectedAreaObj, currentUser.siteId])

  function addEntry() {
    const defaultArea = customAreaName || (selectedAreaObj?.name ?? '')
    const newRow: FindingRow = {
      id: `row-${Date.now()}-${Math.random()}`,
      category5r: 'Rapi',
      area: defaultArea,
      findingDescription: '',
      findingPhotoUrl: '',
      actionDescription: '',
      actionPhotoUrl: '',
      noFindingPhotoUrl: '',
    }
    setFindings((prev) => [...prev, newRow])
  }

  function removeEntry(index: number) {
    setFindings((prev) => prev.filter((_, idx) => idx !== index))
  }

  function updateRow(
    index: number,
    field: keyof FindingRow,
    value: string | boolean
  ) {
    setFindings((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  function importOpenFinding(item: any) {
    const newRow: FindingRow = {
      id: `row-${Date.now()}-${Math.random()}`,
      category5r: (item.category5r as any) || 'Rapi',
      area: item.area || '',
      findingDescription: item.findingDescription || '',
      findingPhotoUrl: item.findingPhotoUrl || '',
      actionDescription: item.actionDescription || '',
      actionPhotoUrl: '',
      noFindingPhotoUrl: '',
    }
    setFindings((prev) => [...prev, newRow])
    toast.success(`Temuan dari ${item.reportNumber} dimuat.`)
  }

  // Handle direct file upload / convert to dataUrl or file URL
  function handleFileUpload(
    index: number,
    field: 'findingPhotoUrl' | 'actionPhotoUrl' | 'noFindingPhotoUrl',
    file: File
  ) {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG/PNG/WebP).')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      updateRow(index, field, dataUrl)
      toast.success('Foto berhasil dilampirkan.')
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const finalPicAreaName = customAreaName.trim()
    if (!finalPicAreaName) {
      toast.error('PIC - Area 5R wajib diisi atau dipilih.')
      return
    }
    if (!auditorName.trim()) {
      toast.error('Nama Auditor wajib diisi.')
      return
    }

    if (!auditorSignature) {
      toast.error('Tanda tangan digital Auditor wajib dibubuhkan sebelum mengirim laporan.')
      return
    }

    if (reportType === 'ada_temuan' && findings.length === 0) {
      toast.error('Silakan tambahkan minimal 1 entri temuan pada tabel.')
      return
    }

    let finalFindings = [...findings]
    if (reportType === 'tidak_ada_temuan' && finalFindings.length === 0) {
      finalFindings = [
        {
          id: `row-${Date.now()}`,
          category5r: 'Rapi',
          area: finalPicAreaName,
          findingDescription: '',
          findingPhotoUrl: '',
          actionDescription: '',
          actionPhotoUrl: '',
          noFindingPhotoUrl: '',
        },
      ]
    }

    setIsSubmitting(true)
    try {
      const res = await createFiveRReportAction({
        masterAreaId: selectedAreaId ? Number(selectedAreaId) : null,
        picAreaName: finalPicAreaName,
        siteId: selectedAreaObj?.siteId ?? currentUser.siteId ?? null,
        auditorId: currentUser.id,
        auditorName: auditorName.trim(),
        auditorEmail: auditorEmail.trim(),
        auditPeriod,
        auditDate,
        reportType,
        scoreRapi,
        scoreRingkas,
        scoreResik,
        scoreRawat,
        scoreRajin,
        auditorSignatureUrl: auditorSignature,
        findings: finalFindings.map((f) => ({
          category5r: f.category5r,
          area: f.area || finalPicAreaName,
          findingDescription: f.findingDescription,
          findingPhotoUrl: f.findingPhotoUrl,
          actionDescription: f.actionDescription,
          actionPhotoUrl: f.actionPhotoUrl,
          noFindingPhotoUrl: f.noFindingPhotoUrl,
        })),
      })

      if (res.success) {
        try {
          localStorage.removeItem(DRAFT_KEY)
        } catch {}
        toast.success(res.message)
        if (res.reportId) {
          setCreatedReportId(res.reportId)
        } else {
          router.push(returnUrl)
        }
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message ?? 'Gagal mengajukan laporan 5R.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={isMobile ? 'space-y-4 pb-12' : 'mx-auto max-w-5xl space-y-6 pb-12'}>
      {/* Draft Recovery Notification Banner */}
      {hasRestoredDraft && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="size-4 text-amber-700 shrink-0" />
            <span className="truncate">
              <strong>Draft Dipulihkan:</strong> Data isian Anda tersimpan otomatis.
            </span>
          </div>
          <button
            type="button"
            onClick={resetFormDraft}
            className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors shrink-0 ml-2"
          >
            Reset Form
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className={isMobile ? 'rounded-2xl border border-slate-100 bg-white p-4 shadow-sm' : 'rounded-xl border border-border/70 bg-surface_container_lowest p-6 shadow-sm'}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Formulir Audit 5R
            </h1>
            <p className="text-xs text-rose-600 font-medium">
              &quot;(Wajib Diisi)&quot; menunjukkan kolom yang harus diisi
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2 sm:mt-0">
            {hasRestoredDraft && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFormDraft}
                className="h-7 text-xs border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Reset Draft
              </Button>
            )}
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
              Quality & CPI Standard
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Top Form Fields Grid: 1 column on mobile, responsive on desktop */}
          <div className={isMobile ? 'grid grid-cols-1 gap-3.5' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
            {/* PIC - AREA 5R */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                PIC – AREA 5R <span className="text-rose-500 font-normal italic">(Wajib Diisi)</span>
              </Label>
              <div className="space-y-1">
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs shadow-2xs focus:border-[#003461] focus:outline-none"
                >
                  <option value="">– Pilih –</option>
                  {masterAreas.map((area) => (
                    <option key={area.id} value={area.id.toString()}>
                      {area.name}
                    </option>
                  ))}
                  <option value="custom">Lainnya</option>
                </select>
                {(selectedAreaId === 'custom' || (!selectedAreaId && masterAreas.length === 0)) && (
                  <Input
                    placeholder="Ketik nama area & PIC (misal: Workshop Bay 2 - Budi)"
                    value={customAreaName}
                    onChange={(e) => setCustomAreaName(e.target.value)}
                    className="h-8 text-xs bg-slate-50"
                  />
                )}
              </div>
            </div>

            {/* Auditor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Auditor <span className="text-rose-500 font-normal italic">(Wajib Diisi)</span>
              </Label>
              <Input
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                placeholder="Nama Auditor"
                className="h-10 rounded-xl text-xs bg-slate-50 border-slate-300"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Email Auditor</Label>
              <Input
                type="email"
                value={auditorEmail}
                onChange={(e) => setAuditorEmail(e.target.value)}
                placeholder="email@chitraparatama.co.id"
                className="h-10 rounded-xl text-xs bg-slate-50 border-slate-300"
              />
            </div>

            {/* Periode Audit */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Periode Audit <span className="text-rose-500 font-normal italic">(Wajib Diisi)</span>
              </Label>
              <select
                value={auditPeriod}
                onChange={(e) => setAuditPeriod(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs shadow-2xs focus:border-[#003461] focus:outline-none"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tanggal Audit</Label>
              <Input
                type="date"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                className="h-10 rounded-xl text-xs bg-slate-50 border-slate-300"
                required
              />
            </div>

            {/* Report Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Jenis Laporan <span className="text-rose-500 font-normal italic">(Wajib Diisi)</span>
              </Label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value as any)
                  setFindings([]) // Reset table entries on type switch
                }}
                className="h-10 w-full rounded-xl border-2 border-emerald-600 bg-emerald-50/50 px-3 text-xs font-semibold text-emerald-950 shadow-2xs focus:border-emerald-700 focus:outline-none"
              >
                <option value="ada_temuan">Ada Temuan</option>
                <option value="after_temuan_sebelumnya">
                  After (Temuan Bulan Sebelumnya)
                </option>
                <option value="tidak_ada_temuan">Tidak Ada Temuan</option>
              </select>
            </div>
          </div>

          <div className="border-t border-border/70 pt-5">
            {/* 5 Pillars Assessment Section */}
            <div className={isMobile ? "grid grid-cols-1 gap-3.5" : "grid gap-4 sm:gap-6 md:grid-cols-2"}>
              {/* 1. Rapi */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:p-4">
                <div className="font-display text-xs font-bold text-slate-900">
                  Rapi <span className="font-normal text-slate-600">(Ada tempat untuk semua barang dan semua barang pada tempatnya)</span>
                </div>
                {/* Mobile selector */}
                <div className={isMobile ? "block pt-1" : "sm:hidden pt-1"}>
                  <select
                    value={scoreRapi}
                    onChange={(e) => setScoreRapi(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-none"
                  >
                    {PILLAR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value} Poin)
                      </option>
                    ))}
                  </select>
                </div>
                {/* Desktop radios */}
                <div className={isMobile ? "hidden" : "hidden sm:block space-y-1.5 pt-1"}>
                  {PILLAR_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                        scoreRapi === opt.value
                          ? 'bg-emerald-100/80 font-medium text-emerald-950'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scoreRapi"
                        checked={scoreRapi === opt.value}
                        onChange={() => setScoreRapi(opt.value)}
                        className="size-3.5 accent-emerald-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 2. Ringkas */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:p-4">
                <div className="font-display text-xs font-bold text-slate-900">
                  Ringkas <span className="font-normal text-slate-600">(Membedakan barang diperlukan dengan yang tidak diperlukan)</span>
                </div>
                {/* Mobile selector */}
                <div className={isMobile ? "block pt-1" : "sm:hidden pt-1"}>
                  <select
                    value={scoreRingkas}
                    onChange={(e) => setScoreRingkas(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-none"
                  >
                    {PILLAR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value} Poin)
                      </option>
                    ))}
                  </select>
                </div>
                {/* Desktop radios */}
                <div className={isMobile ? "hidden" : "hidden sm:block space-y-1.5 pt-1"}>
                  {PILLAR_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                        scoreRingkas === opt.value
                          ? 'bg-emerald-100/80 font-medium text-emerald-950'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scoreRingkas"
                        checked={scoreRingkas === opt.value}
                        onChange={() => setScoreRingkas(opt.value)}
                        className="size-3.5 accent-emerald-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Resik */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:p-4">
                <div className="font-display text-xs font-bold text-slate-900">
                  Resik <span className="font-normal text-slate-600">(Kebersihan dan cara-cara untuk tetap menjaga kebersihan)</span>
                </div>
                {/* Mobile selector */}
                <div className={isMobile ? "block pt-1" : "sm:hidden pt-1"}>
                  <select
                    value={scoreResik}
                    onChange={(e) => setScoreResik(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-none"
                  >
                    {PILLAR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value} Poin)
                      </option>
                    ))}
                  </select>
                </div>
                {/* Desktop radios */}
                <div className={isMobile ? "hidden" : "hidden sm:block space-y-1.5 pt-1"}>
                  {PILLAR_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                        scoreResik === opt.value
                          ? 'bg-emerald-100/80 font-medium text-emerald-950'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scoreResik"
                        checked={scoreResik === opt.value}
                        onChange={() => setScoreResik(opt.value)}
                        className="size-3.5 accent-emerald-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Rawat */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:p-4">
                <div className="font-display text-xs font-bold text-slate-900">
                  Rawat <span className="font-normal text-slate-600">(Mempertahankan dan mengawasi 3 kategori diatas)</span>
                </div>
                {/* Mobile selector */}
                <div className={isMobile ? "block pt-1" : "sm:hidden pt-1"}>
                  <select
                    value={scoreRawat}
                    onChange={(e) => setScoreRawat(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-none"
                  >
                    {PILLAR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value} Poin)
                      </option>
                    ))}
                  </select>
                </div>
                {/* Desktop radios */}
                <div className={isMobile ? "hidden" : "hidden sm:block space-y-1.5 pt-1"}>
                  {PILLAR_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                        scoreRawat === opt.value
                          ? 'bg-emerald-100/80 font-medium text-emerald-950'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scoreRawat"
                        checked={scoreRawat === opt.value}
                        onChange={() => setScoreRawat(opt.value)}
                        className="size-3.5 accent-emerald-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 5. Rajin & Nilai Audit */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:p-4">
                <div className="font-display text-xs font-bold text-slate-900">
                  Rajin <span className="font-normal text-slate-600">(Karyawan mengetahui dan melaksanakan penerapan 5R di area kerja)</span>
                </div>
                {/* Mobile selector */}
                <div className={isMobile ? "block pt-1" : "sm:hidden pt-1"}>
                  <select
                    value={scoreRajin}
                    onChange={(e) => setScoreRajin(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-none"
                  >
                    {PILLAR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value} Poin)
                      </option>
                    ))}
                  </select>
                </div>
                {/* Desktop radios */}
                <div className={isMobile ? "hidden" : "hidden sm:block space-y-1.5 pt-1"}>
                  {PILLAR_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                        scoreRajin === opt.value
                          ? 'bg-emerald-100/80 font-medium text-emerald-950'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scoreRajin"
                        checked={scoreRajin === opt.value}
                        onChange={() => setScoreRajin(opt.value)}
                        className="size-3.5 accent-emerald-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Nilai Audit Card */}
              <div className="flex flex-col justify-center items-center rounded-xl border-2 border-slate-800 bg-slate-900 text-white p-5 sm:p-6 shadow-md">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Nilai Audit 5R
                </span>
                <div className="mt-2 text-4xl sm:text-5xl font-black tracking-tight text-emerald-400">
                  {auditScore}
                </div>
                <div className="mt-1 text-xs text-slate-300">
                  Skala Evaluasi (Rata-rata 5 Pilar)
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Table Findings Section */}
          <div className="border-t border-border/70 pt-6 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {reportType === 'ada_temuan'
                    ? 'Ada Temuan'
                    : reportType === 'after_temuan_sebelumnya'
                    ? 'Before After'
                    : 'Tidak Ada Temuan'}
                </h3>
                <p className="text-xs text-slate-500">
                  {reportType === 'ada_temuan'
                    ? 'Catat temuan 5R beserta foto dan tindakan yang direncanakan/dilakukan.'
                    : reportType === 'after_temuan_sebelumnya'
                    ? 'Dokumentasikan tindak lanjut perbaikan dari temuan audit bulan sebelumnya.'
                    : 'Lampirkan foto bukti kondisi area yang rapi, bersih, dan sesuai standar.'}
                </p>
              </div>

              {/* Quick load button for After mode */}
              {reportType === 'after_temuan_sebelumnya' && (
                <div className="flex items-center gap-2">
                  {openFindingsList.length > 0 && (
                    <select
                      onChange={(e) => {
                        const item = openFindingsList.find(
                          (f) => f.findingId.toString() === e.target.value
                        )
                        if (item) importOpenFinding(item)
                      }}
                      className="h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        {isLoadingOpenFindings
                          ? 'Memuat temuan open...'
                          : `Pilih Temuan Open Sebelumnya (${openFindingsList.length})...`}
                      </option>
                      {openFindingsList.map((f) => (
                        <option key={f.findingId} value={f.findingId.toString()}>
                          [{f.reportNumber}] {f.category5r} – {f.area}: {f.findingDescription.slice(0, 30)}...
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Card-Based Findings View */}
            <div className={isMobile ? "space-y-3 block" : "space-y-3 sm:hidden"}>
              {findings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
                  Belum ada temuan/foto. Tekan tombol <strong>ADD ENTRY</strong> di bawah untuk menambahkan.
                </div>
              ) : (
                findings.map((row, idx) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        Entry #{idx + 1}
                        {reportType === 'ada_temuan' && (
                          <span className="text-emerald-700">&bull; {row.category5r}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEntry(idx)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="size-3.5" /> Hapus
                      </button>
                    </div>

                    {reportType === 'ada_temuan' && (
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">Kategori 5R</Label>
                        <select
                          value={row.category5r}
                          onChange={(e) => updateRow(idx, 'category5r', e.target.value as any)}
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs focus:outline-none focus:border-slate-800"
                        >
                          <option value="Rapi">Rapi</option>
                          <option value="Ringkas">Ringkas</option>
                          <option value="Resik">Resik</option>
                          <option value="Rawat">Rawat</option>
                          <option value="Rajin">Rajin</option>
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Lokasi / Area Spesifik</Label>
                      <Input
                        value={row.area}
                        onChange={(e) => updateRow(idx, 'area', e.target.value)}
                        placeholder="Lokasi / Area spesifik (misal: Rak Tools Bay 3)"
                        className="h-9 text-xs"
                        required
                      />
                    </div>

                    {reportType === 'ada_temuan' && (
                      <div className="space-y-3 pt-1 border-t border-slate-100">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700">Uraian Temuan</Label>
                          <Input
                            value={row.findingDescription}
                            onChange={(e) => updateRow(idx, 'findingDescription', e.target.value)}
                            placeholder="Uraian ketidaksesuaian 5R"
                            className="h-9 text-xs"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700">Foto Temuan</Label>
                          <PhotoCell
                            photoUrl={row.findingPhotoUrl}
                            onPreview={() =>
                              row.findingPhotoUrl &&
                              setPreviewImage({
                                url: row.findingPhotoUrl,
                                title: `Foto Temuan 5R (Baris ${idx + 1} - ${row.area || 'Area'})`,
                              })
                            }
                            onCaptureClick={() =>
                              setCameraTarget({ rowIndex: idx, field: 'findingPhotoUrl' })
                            }
                            onUpload={(file) =>
                              handleFileUpload(idx, 'findingPhotoUrl', file)
                            }
                            onRemove={() => updateRow(idx, 'findingPhotoUrl', '')}
                          />
                        </div>
                      </div>
                    )}

                    {reportType !== 'tidak_ada_temuan' && (
                      <div className="space-y-3 pt-1 border-t border-slate-100">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700">
                            {reportType === 'after_temuan_sebelumnya' ? 'Tindakan Perbaikan (After)' : 'Tindakan'}
                          </Label>
                          <Input
                            value={row.actionDescription}
                            onChange={(e) => updateRow(idx, 'actionDescription', e.target.value)}
                            placeholder="Tindakan korektif yang dilakukan"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700">Foto Tindakan</Label>
                          <PhotoCell
                            photoUrl={row.actionPhotoUrl}
                            onPreview={() =>
                              row.actionPhotoUrl &&
                              setPreviewImage({
                                url: row.actionPhotoUrl,
                                title: `Foto Tindakan Perbaikan (Baris ${idx + 1} - ${row.area || 'Area'})`,
                              })
                            }
                            onCaptureClick={() =>
                              setCameraTarget({ rowIndex: idx, field: 'actionPhotoUrl' })
                            }
                            onUpload={(file) =>
                              handleFileUpload(idx, 'actionPhotoUrl', file)
                            }
                            onRemove={() => updateRow(idx, 'actionPhotoUrl', '')}
                          />
                        </div>
                      </div>
                    )}

                    {reportType === 'tidak_ada_temuan' && (
                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        <Label className="text-[11px] font-semibold text-slate-700">Foto Bukti Kondisi Area</Label>
                        <PhotoCell
                          photoUrl={row.noFindingPhotoUrl}
                          onPreview={() =>
                            row.noFindingPhotoUrl &&
                            setPreviewImage({
                              url: row.noFindingPhotoUrl,
                              title: `Foto Bukti Kondisi Area (Baris ${idx + 1} - ${row.area || 'Area'})`,
                            })
                          }
                          onCaptureClick={() =>
                            setCameraTarget({ rowIndex: idx, field: 'noFindingPhotoUrl' })
                          }
                          onUpload={(file) =>
                            handleFileUpload(idx, 'noFindingPhotoUrl', file)
                          }
                          onRemove={() => updateRow(idx, 'noFindingPhotoUrl', '')}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className={isMobile ? "hidden" : "hidden sm:block overflow-x-auto rounded-lg border border-slate-200 bg-white"}>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold w-12 text-center">Row ID</th>
                    {reportType === 'ada_temuan' && (
                      <th className="py-2.5 px-3 font-semibold w-28">Kategori 5R</th>
                    )}
                    <th className="py-2.5 px-3 font-semibold min-w-[140px]">Area</th>
                    {reportType === 'ada_temuan' && (
                      <>
                        <th className="py-2.5 px-3 font-semibold min-w-[160px]">Temuan</th>
                        <th className="py-2.5 px-3 font-semibold min-w-[130px]">Foto Temuan</th>
                      </>
                    )}
                    {reportType !== 'tidak_ada_temuan' && (
                      <>
                        <th className="py-2.5 px-3 font-semibold min-w-[160px]">Tindakan</th>
                        <th className="py-2.5 px-3 font-semibold min-w-[130px]">Foto Tindakan</th>
                      </>
                    )}
                    {reportType === 'tidak_ada_temuan' && (
                      <th className="py-2.5 px-3 font-semibold min-w-[200px]">
                        Foto Bukti Tidak Ada Temuan
                      </th>
                    )}
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {findings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-xs text-slate-400 italic"
                      >
                        There are no entries. Klik &quot;Add Entry&quot; untuk menambahkan baris.
                      </td>
                    </tr>
                  ) : (
                    findings.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        {/* Row ID */}
                        <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Kategori 5R */}
                        {reportType === 'ada_temuan' && (
                          <td className="py-2.5 px-3">
                            <select
                              value={row.category5r}
                              onChange={(e) =>
                                updateRow(idx, 'category5r', e.target.value as any)
                              }
                              className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                            >
                              <option value="Rapi">Rapi</option>
                              <option value="Ringkas">Ringkas</option>
                              <option value="Resik">Resik</option>
                              <option value="Rawat">Rawat</option>
                              <option value="Rajin">Rajin</option>
                            </select>
                          </td>
                        )}

                        {/* Area */}
                        <td className="py-2.5 px-3">
                          <Input
                            value={row.area}
                            onChange={(e) => updateRow(idx, 'area', e.target.value)}
                            placeholder="Lokasi / Area spesifik"
                            className="h-8 text-xs"
                            required
                          />
                        </td>

                        {/* Temuan & Foto Temuan (Ada Temuan) */}
                        {reportType === 'ada_temuan' && (
                          <>
                            <td className="py-2.5 px-3">
                              <Input
                                value={row.findingDescription}
                                onChange={(e) =>
                                  updateRow(idx, 'findingDescription', e.target.value)
                                }
                                placeholder="Uraian temuan 5R"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <PhotoCell
                                photoUrl={row.findingPhotoUrl}
                                onPreview={() =>
                                  row.findingPhotoUrl &&
                                  setPreviewImage({
                                    url: row.findingPhotoUrl,
                                    title: `Foto Temuan 5R (Baris ${idx + 1} - ${row.area || 'Area'})`,
                                  })
                                }
                                onCaptureClick={() =>
                                  setCameraTarget({ rowIndex: idx, field: 'findingPhotoUrl' })
                                }
                                onUpload={(file) =>
                                  handleFileUpload(idx, 'findingPhotoUrl', file)
                                }
                                onRemove={() => updateRow(idx, 'findingPhotoUrl', '')}
                              />
                            </td>
                          </>
                        )}

                        {/* Tindakan & Foto Tindakan */}
                        {reportType !== 'tidak_ada_temuan' && (
                          <>
                            <td className="py-2.5 px-3">
                              <Input
                                value={row.actionDescription}
                                onChange={(e) =>
                                  updateRow(idx, 'actionDescription', e.target.value)
                                }
                                placeholder="Tindakan korektif"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <PhotoCell
                                photoUrl={row.actionPhotoUrl}
                                onPreview={() =>
                                  row.actionPhotoUrl &&
                                  setPreviewImage({
                                    url: row.actionPhotoUrl,
                                    title: `Foto Tindakan Perbaikan (Baris ${idx + 1} - ${row.area || 'Area'})`,
                                  })
                                }
                                onCaptureClick={() =>
                                  setCameraTarget({ rowIndex: idx, field: 'actionPhotoUrl' })
                                }
                                onUpload={(file) =>
                                  handleFileUpload(idx, 'actionPhotoUrl', file)
                                }
                                onRemove={() => updateRow(idx, 'actionPhotoUrl', '')}
                              />
                            </td>
                          </>
                        )}

                        {/* Foto Bukti Tidak Ada Temuan */}
                        {reportType === 'tidak_ada_temuan' && (
                          <td className="py-2.5 px-3">
                            <PhotoCell
                              photoUrl={row.noFindingPhotoUrl}
                              onPreview={() =>
                                row.noFindingPhotoUrl &&
                                setPreviewImage({
                                  url: row.noFindingPhotoUrl,
                                  title: `Foto Bukti Kondisi Area (Baris ${idx + 1} - ${row.area || 'Area'})`,
                                })
                              }
                              onCaptureClick={() =>
                                setCameraTarget({ rowIndex: idx, field: 'noFindingPhotoUrl' })
                              }
                              onUpload={(file) =>
                                handleFileUpload(idx, 'noFindingPhotoUrl', file)
                              }
                              onRemove={() => updateRow(idx, 'noFindingPhotoUrl', '')}
                            />
                          </td>
                        )}

                        {/* Delete Row Button */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeEntry(idx)}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Hapus Baris"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Entry Button */}
            <div className="p-3.5 bg-white border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEntry}
                className="h-8.5 border-slate-900 bg-[#0f172a] text-white hover:bg-slate-800 text-xs font-semibold tracking-wider shadow-sm"
              >
                <Plus className="mr-1.5 size-3.5" />
                ADD ENTRY
              </Button>
            </div>

            {/* Note Guideline */}
            <div className="border-t border-slate-100 bg-slate-50/70 p-3.5 text-[11px] text-slate-500">
              <div className="space-y-1">
                <p className="font-semibold text-slate-700">
                  – Add Entry Untuk 1 Foto – Menambahkan Foto Add Entry Lagi –
                </p>
                <p>
                  Untuk temuan 5R mohon melampirkan bukti foto berikut : – (Area Small) Lampirkan Min. 2 Foto – (Area Medium) Lampirkan Min. 4 Foto – (Area Large) Lampirkan Min. 6 Foto
                </p>
              </div>
            </div>
          </div>

          {/* Tanda Tangan Digital Auditor */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-2.5">
              <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <PenTool className="size-4 text-emerald-600" />
                Tanda Tangan Digital Auditor <span className="text-rose-500 font-normal italic text-xs">(Wajib Dibubuhkan)</span>
              </Label>
              <p className="text-xs text-slate-500 mt-0.5">
                Bubuhkan tanda tangan Anda sebagai pengesahan dokumen 5R resmi yang akan dicantumkan pada lembar cetak A4.
              </p>
            </div>

            <div className="max-w-md">
              <SignaturePad
                onDataUrlChange={(url) => setAuditorSignature(url)}
                height={160}
              />
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="border-t border-border/70 pt-6 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push(returnUrl)}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              Batal
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 bg-slate-900 px-8 font-semibold text-white hover:bg-slate-800 shadow cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Submit Laporan 5R'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* A4 Document Preview Dialog after Submission */}
      {createdReportId && (
        <FiveRDetailDialog
          reportId={createdReportId}
          onClose={() => {
            setCreatedReportId(null)
            router.push(returnUrl)
          }}
          onActionComplete={() => {
            setCreatedReportId(null)
            router.push(returnUrl)
          }}
        />
      )}

      {/* Camera Capture Modal */}
      <FiveRCameraModal
        isOpen={Boolean(cameraTarget)}
        onClose={() => setCameraTarget(null)}
        onCapture={(dataUrl) => {
          if (cameraTarget) {
            updateRow(cameraTarget.rowIndex, cameraTarget.field, dataUrl)
            setCameraTarget(null)
            toast.success('Foto dari kamera berhasil diambil!')
          }
        }}
        title={
          cameraTarget?.field === 'findingPhotoUrl'
            ? 'Foto Temuan 5R'
            : cameraTarget?.field === 'actionPhotoUrl'
            ? 'Foto Tindakan Perbaikan'
            : 'Foto Bukti Kondisi Area'
        }
      />

      {/* Lightbox / Zoom Image Preview Modal */}
      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-4 bg-slate-950/95 border-slate-800 text-white shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-emerald-400" />
              <h3 className="text-xs font-semibold tracking-wide text-slate-200">
                {previewImage?.title || 'Preview Foto 5R'}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-center p-2 max-h-[75vh] overflow-hidden">
            {previewImage?.url && (
              <img
                src={previewImage.url}
                alt="Full Preview"
                className="max-h-[70vh] w-auto max-w-full rounded object-contain shadow-2xl border border-slate-800"
              />
            )}
          </div>
          <div className="flex items-center justify-end pt-2 border-t border-slate-800 text-right">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPreviewImage(null)}
              className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Subkomponen Upload / Kamera / Preview Foto di Baris Tabel
 */
function PhotoCell({
  photoUrl,
  onCaptureClick,
  onUpload,
  onRemove,
  onPreview,
}: {
  photoUrl?: string
  onCaptureClick: () => void
  onUpload: (file: File) => void
  onRemove: () => void
  onPreview?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (photoUrl) {
    return (
      <div className="flex items-center gap-2">
        {/* Clickable Image Thumbnail with Zoom Icon on Hover */}
        <button
          type="button"
          onClick={onPreview}
          className="relative group size-10 rounded border border-slate-300 overflow-hidden bg-slate-100 shrink-0 hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer shadow-sm"
          title="Klik untuk melihat foto ukuran penuh"
        >
          <img src={photoUrl} alt="Preview" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
            <Eye className="size-4 drop-shadow" />
          </div>
        </button>

        {/* Text Action to View */}
        <button
          type="button"
          onClick={onPreview}
          className="text-left text-[11px] text-emerald-700 font-medium hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          title="Klik untuk melihat foto"
        >
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
          <span>Lihat Foto</span>
        </button>

        {/* Remove Photo Button */}
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
          title="Hapus foto ini"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
        }}
        className="hidden"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="h-7 px-2 text-[11px] border-slate-300 hover:bg-slate-100"
        title="Upload File Foto"
      >
        <Upload className="size-3 mr-1" />
        File
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onCaptureClick}
        className="h-7 px-2 text-[11px] border-slate-300 hover:bg-slate-100 text-emerald-700"
        title="Buka Kamera HP/Tablet"
      >
        <Camera className="size-3 mr-1" />
        Kamera
      </Button>
    </div>
  )
}
