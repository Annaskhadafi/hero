'use client'

import SignatureCanvas from 'react-signature-canvas'
import {
  ArrowLeft,
  ChevronRight,
  Disc,
  Download,
  Fuel,
  Gauge,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  getSites,
  getManualTorqueAssets,
  getServiceFormUserContext,
  type ServiceFormUserContext,
} from '@/app/dashboard/360-service/service-form/actions'
import { ChangeTireForm } from '@/components/service-forms/change-tire-form'
import { TireInflationForm } from '@/components/service-forms/tire-inflation-form'
import { TyreHandlerInspectionForm } from '@/components/service-forms/tyre-handler-inspection-form'
import { SiapHadirForm } from '@/components/service-forms/siap-hadir-form'
import { RefuelingForm } from '@/components/service-forms/refueling-form'

const SERVICE_FORM_MODULES = [
  {
    id: 'retorque',
    title: 'Retorque DT & OHT',
    subtitle: 'Pemeriksaan Torsi Baut',
    description: 'Pencatatan torsi baut roda pertama & kedua unit DT / OHT',
    icon: Wrench,
    badge: 'Torque Spec',
    color: 'bg-blue-500/10 text-blue-600 border-blue-200',
    badgeColor: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'change-tire',
    title: 'Change Tire',
    subtitle: 'Pergantian & Rotasi Ban',
    description: 'Pencatatan ban dicopot dan dipasang beserta data tapak (TDR)',
    icon: Disc,
    badge: 'Tire Position',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    badgeColor: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'tire-inflation',
    title: 'Pengisian Angin',
    subtitle: 'Tire Inflation Record',
    description: 'Pemeriksaan tekanan PSI dan 30 status step pengisian ban',
    icon: Gauge,
    badge: 'Pressure PSI',
    color: 'bg-sky-500/10 text-sky-600 border-sky-200',
    badgeColor: 'bg-sky-50 text-sky-700',
  },
  {
    id: 'tyre-handler',
    title: 'Tyre Handler',
    subtitle: 'Pemeriksaan Harian Unit',
    description: 'Pemeriksaan harian unit utama, attachment & log hour meter',
    icon: Truck,
    badge: 'Daily Inspection',
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
    badgeColor: 'bg-indigo-50 text-indigo-700',
  },
  {
    id: 'siap-hadir',
    title: 'Siap & Hadir',
    subtitle: 'Kesiapan Kerja & Absensi',
    description: 'Form kesiapan bekerja (fit to work) & daftar hadir sosialisasi',
    icon: Users,
    badge: 'Fit to Work',
    color: 'bg-violet-500/10 text-violet-600 border-violet-200',
    badgeColor: 'bg-violet-50 text-violet-700',
  },
  {
    id: 'refueling',
    title: 'Re-Fueling',
    subtitle: 'Pengisian BBM LV',
    description: 'Log pengisian BBM LV, foto odometer KM & flowmeter digital',
    icon: Fuel,
    badge: 'Fuel LV Log',
    color: 'bg-amber-500/10 text-amber-600 border-amber-200',
    badgeColor: 'bg-amber-50 text-amber-700',
  },
]

type RetorqueVariant = 'DT' | 'OHT'
type SignatureKey = 'first' | 'second' | 'knownBy'

type RetorqueDraft = {
  date: string
  unitType: string
  shift: string
  siteName: string
  workLocation: string
  unitNumber: string
  kilometerFirst: string
  firstTorqueStart: string
  firstTorqueEnd: string
  firstDuration: string
  firstPressure: string
  firstTorqueSpec: string
  firstSn: string
  retorqueDate: string
  kilometerSecond: string
  secondTorqueStart: string
  secondTorqueEnd: string
  secondDuration: string
  secondPressure: string
  secondTorqueSpec: string
  secondSn: string
  reason: string
  notes: string
  firstSignerName: string
  secondSignerName: string
  knownByName: string
}

type RetorqueRow = {
  condition: string
  recommendation: string
}

type RetorquePdfPayload = {
  variant: RetorqueVariant
  rowCount: number
  draft: RetorqueDraft
  rows: RetorqueRow[]
  signatures: Record<SignatureKey, string>
}

type ServiceFormRecord = RetorquePdfPayload & {
  id: string
  createdAt: string
  updatedAt: string
  createdByUserId?: string
  createdBySn?: string
  createdByName?: string
}

const DEFAULT_DRAFT: RetorqueDraft = {
  date: '',
  unitType: '',
  shift: '',
  siteName: 'BMB SITE',
  workLocation: '',
  unitNumber: '',
  kilometerFirst: '',
  firstTorqueStart: '',
  firstTorqueEnd: '',
  firstDuration: '',
  firstPressure: '',
  firstTorqueSpec: '650 / 700 lbf',
  firstSn: '',
  retorqueDate: '',
  kilometerSecond: '',
  secondTorqueStart: '',
  secondTorqueEnd: '',
  secondDuration: '',
  secondPressure: '',
  secondTorqueSpec: '650 / 700 lbf',
  secondSn: '',
  reason: '',
  notes: '',
  firstSignerName: '',
  secondSignerName: '',
  knownByName: '',
}

const MAX_RETORQUE_ROWS = 12
const LETTERHEAD_URL = '/ChitraParatama_Stationery_Letterhead_jkt.jpg'
const STORAGE_KEY = 'hero-service-form-retorque-history'

const formVariants: RetorqueVariant[] = ['DT', 'OHT']

function hasVisibleCanvasInk(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || canvas.width === 0 || canvas.height === 0) return false

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] > 0) return true
  }
  return false
}

function labelForTorqueSpec(variant: RetorqueVariant) {
  return variant === 'OHT' ? '773 / 775 / 777 / 14M' : 'Hino 700 / 500 / suppeq'
}

function defaultTorqueSpec(variant: RetorqueVariant) {
  return variant === 'OHT' ? '1000 / 1300 lbft' : '650 / 700 lbf'
}

function emptyRows() {
  return Array.from({ length: MAX_RETORQUE_ROWS }, () => ({
    condition: '',
    recommendation: '',
  }))
}

function emptySignatures(): Record<SignatureKey, string> {
  return {
    first: '',
    second: '',
    knownBy: '',
  }
}

function createBlankPayload(variant: RetorqueVariant = 'DT'): RetorquePdfPayload {
  return {
    variant,
    rowCount: variant === 'OHT' ? 6 : 8,
    draft: {
      ...DEFAULT_DRAFT,
      firstTorqueSpec: defaultTorqueSpec(variant),
      secondTorqueSpec: defaultTorqueSpec(variant),
    },
    rows: emptyRows(),
    signatures: emptySignatures(),
  }
}

function sanitizeFilePart(value: string) {
  return (
    value
      .trim()
      .replace(/[^\w-]+/g, '-')
      .replace(/-+/g, '-') || 'draft'
  )
}

function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'))
  return Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve()
      return new Promise<void>((resolve) => {
        image.onload = () => resolve()
        image.onerror = () => resolve()
      })
    })
  )
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[36mm_3mm_1fr] items-center gap-1 text-[8.5px] leading-none text-black">
      <span className="font-medium">{label}</span>
      <span>:</span>
      <span className="min-h-[5.5mm] border border-black px-1.5 flex items-center">{value}</span>
    </div>
  )
}

function PdfSignature({
  title,
  name,
  signature,
  footer,
}: {
  title: string
  name: string
  signature: string
  footer: string
}) {
  return (
    <div className="flex min-h-[34mm] flex-col justify-between text-center text-[8.5px] text-black">
      <div className="font-semibold">{title}</div>
      <div className="flex h-[18mm] items-center justify-center">
        {signature ? (
          <img src={signature} alt="" className="max-h-[16mm] max-w-[48mm] object-contain" />
        ) : null}
      </div>
      <div>
        {name ? (
          <div className="min-h-[5mm] font-bold border-b border-black inline-block px-3 pb-0.5">{name}</div>
        ) : (
          <div className="min-h-[5mm] font-medium">{footer}</div>
        )}
      </div>
    </div>
  )
}

function RetorquePdfPage({
  variant,
  rowCount,
  draft,
  rows,
  signatures,
}: {
  variant: RetorqueVariant
  rowCount: number
  draft: RetorqueDraft
  rows: RetorqueRow[]
  signatures: Record<SignatureKey, string>
}) {
  const torqueSpecLabel = labelForTorqueSpec(variant)
  const title =
    variant === 'OHT'
      ? 'FORM TORQUE AND RETORQUE WHEEL NUT TIRE OHT'
      : 'FORM TORQUE AND RETORQUE WHEEL NUT TIRE DT HAULING / SE'

  return (
    <div
      className="retorque-pdf-page relative overflow-hidden bg-white font-sans text-black"
      style={{ width: '210mm', height: '297mm' }}
    >
      <img src={LETTERHEAD_URL} alt="" className="absolute inset-0 z-0 h-full w-full object-fill" />
      <div className="relative z-10 px-[14mm] pt-[36mm] pb-[25mm] text-black">
        <div className="text-center">
          <h2 className="text-[13px] leading-tight font-black">{title}</h2>
          <p className="mt-1 text-[12px] leading-tight font-black uppercase">
            {draft.siteName || 'BMB SITE'}
          </p>
        </div>

        <div className="mt-[6mm] grid grid-cols-2 gap-[8mm]">
          <div className="space-y-[1.5mm]">
            <Field label="Tanggal" value={draft.date} />
            <Field label="Tipe Unit" value={draft.unitType} />
            <Field label="Shift" value={draft.shift} />
          </div>
          <div className="space-y-[1.5mm]">
            <Field label="Nama Site" value={draft.siteName} />
            <Field label="Lokasi Kerja" value={draft.workLocation} />
          </div>
        </div>

        <div className="my-[4mm] h-px bg-black" />

        <div className="grid grid-cols-2 gap-[8mm]">
          <div className="space-y-[1.5mm]">
            <Field label="No Unit" value={draft.unitNumber} />
            <Field label="Kilometer Unit" value={draft.kilometerFirst} />
            <Field label="Jam Torque Pertama" value={draft.firstTorqueStart} />
            <Field label="Jam Selesai Torque Pertama" value={draft.firstTorqueEnd} />
            <Field label="Waktu pengerjaan" value={draft.firstDuration} />
            <Field label="Tekanan Torque" value={draft.firstPressure} />
            <Field label={torqueSpecLabel} value={draft.firstTorqueSpec} />
            {variant === 'OHT' ? <Field label="R100 VOLVO" value="1100 lbft" /> : null}
            <Field label="SN Retorque" value={draft.firstSn} />
          </div>
          <div className="space-y-[1.5mm]">
            <Field label="Tanggal" value={draft.retorqueDate} />
            <Field label="Kilometer Unit" value={draft.kilometerSecond} />
            <Field label="Jam Re-Torque Kedua" value={draft.secondTorqueStart} />
            <Field label="Jam Selesai Re-torque Ke" value={draft.secondTorqueEnd} />
            <Field label="Waktu Pengerjaan" value={draft.secondDuration} />
            <Field label="Tekanan Torque" value={draft.secondPressure} />
            <Field label={torqueSpecLabel} value={draft.secondTorqueSpec} />
            {variant === 'OHT' ? <Field label="R100 VOLVO" value="1100 lbft" /> : null}
            <Field label="SN Retorque" value={draft.secondSn} />
          </div>
        </div>

        <div className="mt-[5mm] grid grid-cols-[28mm_1fr] gap-[4mm]">
          <div className="pt-[1mm] text-center text-black flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold">RE TORQUE</div>
              <div className="text-[8px] font-medium">Posisi Ban</div>
            </div>
            <div className="my-auto space-y-0 text-[8.5px] font-bold">
              {rows.slice(0, rowCount).map((_, index) => (
                <div key={index} className="h-[6.5mm] flex items-center justify-center">
                  {index + 1}
                </div>
              ))}
            </div>
          </div>
          <table className="w-full border-collapse text-[8.5px] leading-none text-black">
            <thead>
              <tr className="bg-slate-100/60">
                <th className="h-[6.5mm] border border-black font-bold px-2 text-center">Kondisi Bolt Stud dan Nut</th>
                <th className="h-[6.5mm] border border-black font-bold px-2 text-center">Rekomendasi</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, rowCount).map((row, index) => (
                <tr key={index}>
                  <td className="h-[6.5mm] border border-black px-2">{row.condition}</td>
                  <td className="h-[6.5mm] border border-black px-2">{row.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-[5mm] grid grid-cols-2 gap-[8mm] text-[8.5px] text-black">
          <div className="grid grid-cols-[20mm_3mm_1fr] items-center">
            <span className="font-semibold">Alasan</span>
            <span>:</span>
            <span className="min-h-[5.5mm] border-b border-black px-1 flex items-center">{draft.reason}</span>
          </div>
          <div className="grid grid-cols-[20mm_3mm_1fr] items-center">
            <span className="font-semibold">Catatan</span>
            <span>:</span>
            <span className="min-h-[5.5mm] border-b border-black px-1 flex items-center">{draft.notes}</span>
          </div>
        </div>

        <div className="mt-[6mm] grid grid-cols-3 gap-[8mm]">
          <PdfSignature
            title="Yang Melakukan Re-torque pertama"
            name={draft.firstSignerName}
            signature={signatures.first}
            footer="Nama dan Tanda Tangan Karyawan"
          />
          <PdfSignature
            title="Yang Melakukan Re-torque kedua"
            name={draft.secondSignerName}
            signature={signatures.second}
            footer="Nama dan Tanda Tangan Karyawan"
          />
          <PdfSignature
            title="Mengetahui,"
            name={draft.knownByName}
            signature={signatures.knownBy}
            footer="Customer"
          />
        </div>
      </div>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs font-bold leading-none">{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        className="h-9 text-xs"
      />
    </div>
  )
}

function SignatureBox({
  label,
  signatureRef,
  onEnd,
  onClear,
}: {
  label: string
  signatureRef: RefObject<SignatureCanvas | null>
  onEnd: () => void
  onClear: () => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs font-bold leading-none">{label}</Label>
      <div className="rounded-lg border border-slate-200 bg-white p-1.5 shadow-2xs">
        <SignatureCanvas
          ref={signatureRef}
          onEnd={onEnd}
          canvasProps={{
            className: 'h-28 w-full touch-none rounded-md bg-white',
          }}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="dense"
        onClick={onClear}
        className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-800"
      >
        Ulangi TTD
      </Button>
    </div>
  )
}

export function ServiceFormWorkspace({ mobile = false }: { mobile?: boolean }) {
  const [activeVariant, setActiveVariant] = useState<RetorqueVariant>('DT')
  const [draft, setDraft] = useState<RetorqueDraft>(DEFAULT_DRAFT)
  const [rows, setRows] = useState<RetorqueRow[]>(() => emptyRows())
  const [dtRowCount, setDtRowCount] = useState(8)
  const [isGenerating, setIsGenerating] = useState(false)
  const [signatures, setSignatures] = useState<Record<SignatureKey, string>>(() =>
    emptySignatures()
  )
  const [records, setRecords] = useState<ServiceFormRecord[]>([])
  const [hasLoadedRecords, setHasLoadedRecords] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [pdfPayload, setPdfPayload] = useState<RetorquePdfPayload>(() => createBlankPayload('DT'))
  const [siteOptions, setSiteOptions] = useState<string[]>([])
  const [snOptions, setSnOptions] = useState<string[]>([])
  const [mobileActiveForm, setMobileActiveForm] = useState<string | null>(null)
  const [retorqueTab, setRetorqueTab] = useState<'form' | 'history'>('form')

  const firstSignatureRef = useRef<SignatureCanvas | null>(null)
  const secondSignatureRef = useRef<SignatureCanvas | null>(null)
  const knownBySignatureRef = useRef<SignatureCanvas | null>(null)
  const pdfPageRef = useRef<HTMLDivElement | null>(null)

  const variant = activeVariant
  const rowCount = variant === 'OHT' ? 6 : dtRowCount
  const torqueSpecLabel = labelForTorqueSpec(variant)
  const formTitle = variant === 'OHT' ? 'Form Retorque OHT' : 'Form Retorque DT'

  const signatureRefByKey = useMemo(
    () => ({
      first: firstSignatureRef,
      second: secondSignatureRef,
      knownBy: knownBySignatureRef,
    }),
    []
  )

  const [userContext, setUserContext] = useState<ServiceFormUserContext | null>(null)

  useEffect(() => {
    getServiceFormUserContext().then((ctx) => {
      setUserContext(ctx)
    })
  }, [])

  const canEditHistory = Boolean(userContext?.isSuperAdmin || userContext?.canEdit)

  const visibleRecords = useMemo(() => {
    const isGlobal = Boolean(userContext?.isSuperAdmin || userContext?.dataScope === 'global')
    const userName = (userContext?.name || '').trim().toLowerCase()
    const userSn = (userContext?.employeeSn || '').trim().toLowerCase()
    const userId = userContext?.userId

    return records.filter((r) => {
      if (isGlobal || !userContext) return true
      const recCreator = (r.createdByName || '').trim().toLowerCase()
      const recFirstSigner = (r.draft.firstSignerName || '').trim().toLowerCase()
      const recSecondSigner = (r.draft.secondSignerName || '').trim().toLowerCase()
      const recKnownBy = (r.draft.knownByName || '').trim().toLowerCase()
      return (
        (userName &&
          (recFirstSigner.includes(userName) ||
            recSecondSigner.includes(userName) ||
            recKnownBy.includes(userName) ||
            recCreator.includes(userName))) ||
        (userSn && r.createdBySn && r.createdBySn.toLowerCase() === userSn) ||
        (userId && r.createdByUserId === userId)
      )
    })
  }, [records, userContext])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as ServiceFormRecord[]) : []
      setRecords(Array.isArray(parsed) ? parsed : [])
    } catch (error) {
      console.error('[service-form] failed to load history:', error)
    } finally {
      setHasLoadedRecords(true)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedRecords) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }, [hasLoadedRecords, records])

  useEffect(() => {
    getSites().then((res) => {
      if (res.success) setSiteOptions(res.data.map((s) => s.name))
    })
  }, [])

  useEffect(() => {
    getManualTorqueAssets(draft.siteName || undefined).then((res) => {
      if (res.success) {
        setSnOptions(
          res.data
            .filter((a) => a.serialNumber?.trim())
            .map((a) => `${a.serialNumber} — ${a.description}`)
        )
      }
    })
  }, [draft.siteName])

  function updateDraft<Key extends keyof RetorqueDraft>(key: Key, value: RetorqueDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateRow(index: number, key: keyof RetorqueRow, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row))
    )
  }

  function clearSignatureCanvases() {
    firstSignatureRef.current?.clear()
    secondSignatureRef.current?.clear()
    knownBySignatureRef.current?.clear()
  }

  function loadSignatureCanvases(nextSignatures: Record<SignatureKey, string>) {
    window.setTimeout(() => {
      ;(
        [
          [firstSignatureRef, nextSignatures.first],
          [secondSignatureRef, nextSignatures.second],
          [knownBySignatureRef, nextSignatures.knownBy],
        ] as const
      ).forEach(([signatureRef, dataUrl]) => {
        signatureRef.current?.clear()
        if (dataUrl) signatureRef.current?.fromDataURL(dataUrl)
      })
    }, 0)
  }

  function buildCurrentPayload(): RetorquePdfPayload {
    return {
      variant,
      rowCount,
      draft: { ...draft },
      rows: rows.map((row) => ({ ...row })),
      signatures: { ...signatures },
    }
  }

  function openForm(nextVariant: RetorqueVariant) {
    const payload = createBlankPayload(nextVariant)
    setEditingRecordId(null)
    setActiveVariant(nextVariant)
    setDraft(payload.draft)
    setRows(payload.rows)
    setDtRowCount(payload.rowCount)
    setSignatures(payload.signatures)
    window.setTimeout(clearSignatureCanvases, 0)
  }

  function editRecord(record: ServiceFormRecord) {
    if (!canEditHistory) {
      window.alert('Anda hanya memiliki izin melihat riwayat dan tidak dapat mengedit data.')
      return
    }
    const paddedRows = [...record.rows, ...emptyRows()].slice(0, MAX_RETORQUE_ROWS)
    setEditingRecordId(record.id)
    setActiveVariant(record.variant)
    setDraft(record.draft)
    setRows(paddedRows)
    setDtRowCount(record.variant === 'DT' ? record.rowCount : 8)
    setSignatures(record.signatures)
    loadSignatureCanvases(record.signatures)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function deleteRecord(id: string) {
    if (!canEditHistory) {
      window.alert('Anda tidak memiliki izin menghapus data riwayat.')
      return
    }
    if (window.confirm('Hapus riwayat form ini?')) {
      setRecords((current) => current.filter((r) => r.id !== id))
      if (editingRecordId === id) {
        openForm(activeVariant)
      }
    }
  }

  function saveRecord() {
    const now = new Date().toISOString()
    const payload = buildCurrentPayload()

    if (editingRecordId) {
      setRecords((current) =>
        current.map((record) =>
          record.id === editingRecordId
            ? {
                ...record,
                ...payload,
                updatedAt: now,
                createdByUserId: record.createdByUserId || userContext?.userId || undefined,
                createdBySn: record.createdBySn || userContext?.employeeSn || undefined,
                createdByName: record.createdByName || userContext?.name || undefined,
              }
            : record
        )
      )
      return
    }

    const id = crypto.randomUUID?.() ?? `retorque-${Date.now()}`
    setEditingRecordId(id)
    setRecords((current) => [
      {
        id,
        ...payload,
        createdAt: now,
        updatedAt: now,
        createdByUserId: userContext?.userId || undefined,
        createdBySn: userContext?.employeeSn || undefined,
        createdByName: userContext?.name || undefined,
      },
      ...current,
    ])
  }

  function updateSignature(key: SignatureKey) {
    const signature = signatureRefByKey[key].current
    if (!signature) return

    const canvas = signature.getCanvas()
    const dataUrl =
      hasVisibleCanvasInk(canvas) || !signature.isEmpty() ? signature.toDataURL('image/png') : ''
    setSignatures((current) => ({ ...current, [key]: dataUrl }))
  }

  function clearSignature(key: SignatureKey) {
    signatureRefByKey[key].current?.clear()
    setSignatures((current) => ({ ...current, [key]: '' }))
  }

  async function downloadPdf(payload = buildCurrentPayload()) {
    const page = pdfPageRef.current
    if (!page) return

    setIsGenerating(true)
    try {
      setPdfPayload(payload)
      await nextFrame()
      await waitForImages(page)
      await document.fonts?.ready
      const { default: html2canvas } = await import('html2canvas-pro')
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: page.scrollWidth,
        windowHeight: page.scrollHeight,
      })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      pdf.addImage(canvas.toDataURL('image/jpeg', 1), 'JPEG', 0, 0, 210, 297)
      pdf.save(
        `Service-Form-Retorque-${payload.variant}-${sanitizeFilePart(payload.draft.unitNumber)}.pdf`
      )
    } catch (error) {
      console.error('[service-form] failed to generate PDF:', error)
      window.alert('Gagal membuat PDF. Coba ulangi.')
    } finally {
      setIsGenerating(false)
    }
  }

  const retorqueFormCard = (
    <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      <CardHeader className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-3.5 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
            Form Retorque
          </CardTitle>
          {/* Segmented Control for DT / OHT */}
          <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => openForm('DT')}
              className={cn(
                'rounded-md px-3 py-1 transition-all',
                activeVariant === 'DT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              DT
            </button>
            <button
              type="button"
              onClick={() => openForm('OHT')}
              className={cn(
                'rounded-md px-3 py-1 transition-all',
                activeVariant === 'OHT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              OHT
            </button>
          </div>
          {editingRecordId ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              Mode Edit
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={() => openForm(activeVariant)}
            className="h-8 text-xs"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={saveRecord}
            className="h-8 px-3 text-xs font-semibold"
          >
            <Save className="mr-1.5 size-3.5" />
            Submit Form
          </Button>
          <Button
            type="button"
            size="dense"
            onClick={() => downloadPdf()}
            disabled={isGenerating}
            className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isGenerating ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 size-3.5" />
            )}
            Download PDF
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-3.5 sm:p-5">
        {/* Document Metadata */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FieldInput
            label="Tanggal"
            value={draft.date}
            onChange={(value) => updateDraft('date', value)}
            type="date"
          />
          <FieldInput
            label="Tipe Unit"
            value={draft.unitType}
            onChange={(value) => updateDraft('unitType', value)}
            placeholder="Contoh: Hino 700 / Cat 777"
          />
          <FieldInput
            label="Shift"
            value={draft.shift}
            onChange={(value) => updateDraft('shift', value)}
            placeholder="Contoh: Pagi / Malam"
          />
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs font-bold leading-none">Nama Site</Label>
            <Combobox
              value={draft.siteName}
              onChange={(value) => updateDraft('siteName', value)}
              options={siteOptions}
              placeholder="Pilih site..."
            />
          </div>
          <FieldInput
            label="Lokasi Kerja"
            value={draft.workLocation}
            onChange={(value) => updateDraft('workLocation', value)}
            placeholder="Contoh: Workshop Tyre"
          />
        </div>

        {/* Torque Pertama & Re-Torque Kedua */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border border-slate-200/80 shadow-none rounded-xl overflow-hidden">
            <CardHeader className="py-2.5 px-3.5 sm:px-4 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xs sm:text-sm font-bold text-slate-800">Torque Pertama</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 p-3.5 sm:p-4">
              <FieldInput
                label="No Unit"
                value={draft.unitNumber}
                onChange={(value) => updateDraft('unitNumber', value)}
                placeholder="Contoh: DT012"
              />
              <FieldInput
                label="Kilometer Unit"
                value={draft.kilometerFirst}
                onChange={(value) => updateDraft('kilometerFirst', value)}
              />
              <FieldInput
                label="Jam Torque Pertama"
                value={draft.firstTorqueStart}
                onChange={(value) => updateDraft('firstTorqueStart', value)}
                type="time"
              />
              <FieldInput
                label="Jam Selesai Torque Pertama"
                value={draft.firstTorqueEnd}
                onChange={(value) => updateDraft('firstTorqueEnd', value)}
                type="time"
              />
              <FieldInput
                label="Waktu Pengerjaan"
                value={draft.firstDuration}
                onChange={(value) => updateDraft('firstDuration', value)}
                placeholder="Contoh: 30 Menit"
              />
              <FieldInput
                label="Tekanan Torque"
                value={draft.firstPressure}
                onChange={(value) => updateDraft('firstPressure', value)}
                placeholder="Contoh: 120 Psi"
              />
              <FieldInput
                label={torqueSpecLabel}
                value={draft.firstTorqueSpec}
                onChange={(value) => updateDraft('firstTorqueSpec', value)}
              />
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-bold leading-none">SN Retorque</Label>
                <Combobox
                  value={draft.firstSn}
                  onChange={(value) => updateDraft('firstSn', value.split(' — ')[0])}
                  options={snOptions}
                  placeholder="Cari SN asset..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 shadow-none rounded-xl overflow-hidden">
            <CardHeader className="py-2.5 px-3.5 sm:px-4 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xs sm:text-sm font-bold text-slate-800">Re-Torque Kedua</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 p-3.5 sm:p-4">
              <FieldInput
                label="Tanggal"
                value={draft.retorqueDate}
                onChange={(value) => updateDraft('retorqueDate', value)}
                type="date"
              />
              <FieldInput
                label="Kilometer Unit"
                value={draft.kilometerSecond}
                onChange={(value) => updateDraft('kilometerSecond', value)}
              />
              <FieldInput
                label="Jam Re-Torque Kedua"
                value={draft.secondTorqueStart}
                onChange={(value) => updateDraft('secondTorqueStart', value)}
                type="time"
              />
              <FieldInput
                label="Jam Selesai Re-Torque Kedua"
                value={draft.secondTorqueEnd}
                onChange={(value) => updateDraft('secondTorqueEnd', value)}
                type="time"
              />
              <FieldInput
                label="Waktu Pengerjaan"
                value={draft.secondDuration}
                onChange={(value) => updateDraft('secondDuration', value)}
                placeholder="Contoh: 30 Menit"
              />
              <FieldInput
                label="Tekanan Torque"
                value={draft.secondPressure}
                onChange={(value) => updateDraft('secondPressure', value)}
                placeholder="Contoh: 120 Psi"
              />
              <FieldInput
                label={torqueSpecLabel}
                value={draft.secondTorqueSpec}
                onChange={(value) => updateDraft('secondTorqueSpec', value)}
              />
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-bold leading-none">SN Retorque</Label>
                <Combobox
                  value={draft.secondSn}
                  onChange={(value) => updateDraft('secondSn', value.split(' — ')[0])}
                  options={snOptions}
                  placeholder="Cari SN asset..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posisi Ban */}
        <Card className="border border-slate-200/80 shadow-none rounded-xl overflow-hidden">
          <CardHeader className="py-2.5 px-3.5 sm:px-4 bg-slate-50 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-bold text-slate-800">Posisi Ban</CardTitle>
              {variant === 'DT' ? (
                <label className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
                  <span>Jumlah Baris:</span>
                  <select
                    value={dtRowCount}
                    onChange={(event) => setDtRowCount(Number(event.target.value))}
                    className="bg-white text-slate-800 h-7 rounded-md px-2 border border-slate-200 text-xs font-medium"
                  >
                    <option value={8}>8 Baris</option>
                    <option value={12}>12 Baris</option>
                  </select>
                </label>
              ) : (
                <span className="text-muted-foreground text-xs font-semibold">OHT (6 Baris Ban)</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-3 sm:p-4">
            {rows.slice(0, rowCount).map((row, index) => (
              <div
                key={index}
                className="bg-slate-50/70 border border-slate-200/70 grid gap-2 rounded-lg p-2.5 sm:grid-cols-[70px_1fr_1fr] items-center"
              >
                <div className="text-primary text-xs font-bold pl-1">
                  Ban #{index + 1}
                </div>
                <Input
                  value={row.condition}
                  onChange={(event) => updateRow(index, 'condition', event.target.value)}
                  placeholder="Kondisi Bolt Stud dan Nut..."
                  className="h-9 text-xs bg-white"
                />
                <Input
                  value={row.recommendation}
                  onChange={(event) => updateRow(index, 'recommendation', event.target.value)}
                  placeholder="Rekomendasi..."
                  className="h-9 text-xs bg-white"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alasan & Catatan */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldInput
            label="Alasan Retorque"
            value={draft.reason}
            onChange={(value) => updateDraft('reason', value)}
            placeholder="Contoh: Penggantian Ban Posisi 1"
          />
          <FieldInput
            label="Catatan Khusus"
            value={draft.notes}
            onChange={(value) => updateDraft('notes', value)}
            placeholder="Catatan tambahan bila ada..."
          />
        </div>

        {/* Tanda Tangan Digital */}
        <Card className="border border-slate-200/80 shadow-none rounded-xl overflow-hidden">
          <CardHeader className="py-2.5 px-3.5 sm:px-4 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-800">Tanda Tangan Digital</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3 p-3.5 sm:p-4">
            <div className="space-y-2.5">
              <FieldInput
                label="Nama Operator Retorque Pertama"
                value={draft.firstSignerName}
                onChange={(value) => updateDraft('firstSignerName', value)}
                placeholder="Nama operator..."
              />
              <SignatureBox
                label="TTD Retorque Pertama"
                signatureRef={firstSignatureRef}
                onEnd={() => updateSignature('first')}
                onClear={() => clearSignature('first')}
              />
            </div>
            <div className="space-y-2.5">
              <FieldInput
                label="Nama Operator Retorque Kedua"
                value={draft.secondSignerName}
                onChange={(value) => updateDraft('secondSignerName', value)}
                placeholder="Nama operator..."
              />
              <SignatureBox
                label="TTD Retorque Kedua"
                signatureRef={secondSignatureRef}
                onEnd={() => updateSignature('second')}
                onClear={() => clearSignature('second')}
              />
            </div>
            <div className="space-y-2.5">
              <FieldInput
                label="Nama Customer / Mengetahui"
                value={draft.knownByName}
                onChange={(value) => updateDraft('knownByName', value)}
                placeholder="Nama customer..."
              />
              <SignatureBox
                label="TTD Mengetahui"
                signatureRef={knownBySignatureRef}
                onEnd={() => updateSignature('knownBy')}
                onClear={() => clearSignature('knownBy')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bottom Action Bar */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3.5">
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={saveRecord}
            className="h-9 px-4 text-xs font-semibold"
          >
            <Save className="mr-1.5 size-4" />
            Submit Form
          </Button>
          <Button
            type="button"
            size="dense"
            onClick={() => downloadPdf()}
            disabled={isGenerating}
            className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isGenerating ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 size-4" />
            )}
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const retorqueHistoryCard = (
    <Card className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-xs', mobile && 'p-0')}>
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Riwayat Form Retorque
          </CardTitle>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {visibleRecords.length} Data
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {/* Mobile Cards View */}
        <div className="space-y-3 sm:hidden">
          {visibleRecords.length === 0 ? (
            <p className="text-center py-6 text-xs text-muted-foreground">
              Belum ada riwayat form retorque yang tersimpan.
            </p>
          ) : (
            visibleRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                      {record.variant}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {record.draft.unitNumber || 'No Unit -'}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    {record.draft.date || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Site:</span> {record.draft.siteName || '-'}
                  </div>
                  <div className="text-right text-slate-400">
                    {formatDateTime(record.updatedAt)}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60">
                  {canEditHistory && (
                    <Button
                      type="button"
                      variant="outline"
                      size="dense"
                      onClick={() => {
                        editRecord(record)
                        if (mobile) setRetorqueTab('form')
                      }}
                      className="h-8 px-3 text-xs"
                    >
                      <Pencil className="mr-1 size-3.5" />
                      Edit
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="dense"
                    onClick={() => downloadPdf(record)}
                    disabled={isGenerating}
                    className="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Download className="mr-1 size-3.5" />
                    PDF
                  </Button>
                  {canEditHistory && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="denseIcon"
                      onClick={() => deleteRecord(record.id)}
                      className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <MinimalTableShell label="History Retorque">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>No Unit</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Diupdate</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {record.draft.date || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {record.variant}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-xs">
                      {record.draft.unitNumber || '-'}
                    </TableCell>
                    <TableCell className="text-xs">{record.draft.siteName || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(record.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {canEditHistory && (
                          <Button
                            type="button"
                            variant="outline"
                            size="dense"
                            onClick={() => editRecord(record)}
                            title="Edit Form"
                          >
                            <Pencil className="mr-1 size-3.5" />
                            Edit
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="dense"
                          onClick={() => downloadPdf(record)}
                          disabled={isGenerating}
                          title="Download PDF"
                        >
                          <Download className="mr-1 size-3.5" />
                          PDF
                        </Button>
                        {canEditHistory && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="denseIcon"
                            onClick={() => deleteRecord(record.id)}
                            title="Hapus Riwayat"
                            className="text-red-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {visibleRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-xs">
                      Belum ada riwayat form retorque yang tersimpan.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </div>
      </CardContent>
    </Card>
  )

  if (mobile) {
    return (
      <>
        <div className="space-y-4 pb-20">
          {!mobileActiveForm ? (
            <div className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Form 360 Service</h1>
                <p className="text-xs text-slate-500">
                  Pilih formulir servis mekanik ban yang ingin diisi
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {SERVICE_FORM_MODULES.map((mod) => {
                  const Icon = mod.icon
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setMobileActiveForm(mod.id)}
                      className="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-xl border',
                            mod.color
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900">{mod.title}</span>
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                                mod.badgeColor
                              )}
                            >
                              {mod.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : mobileActiveForm === 'change-tire' ? (
            <ChangeTireForm mobile onBackToHub={() => setMobileActiveForm(null)} />
          ) : mobileActiveForm === 'tire-inflation' ? (
            <TireInflationForm mobile onBackToHub={() => setMobileActiveForm(null)} />
          ) : mobileActiveForm === 'tyre-handler' ? (
            <TyreHandlerInspectionForm mobile onBackToHub={() => setMobileActiveForm(null)} />
          ) : mobileActiveForm === 'siap-hadir' ? (
            <SiapHadirForm mobile onBackToHub={() => setMobileActiveForm(null)} />
          ) : mobileActiveForm === 'refueling' ? (
            <RefuelingForm mobile onBackToHub={() => setMobileActiveForm(null)} />
          ) : (
            <div className="space-y-4">
              {/* Back to Module Hub Button */}
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="dense"
                  onClick={() => setMobileActiveForm(null)}
                  className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="size-4" />
                  Menu Hub
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    Retorque {activeVariant}
                  </span>
                </div>
              </div>

              {/* Segmented Switcher [ Isi Form | Riwayat ] */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRetorqueTab('form')}
                  className={cn(
                    'py-2 text-xs font-bold rounded-lg transition-all',
                    retorqueTab === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  ✍️ Isi Form
                </button>
                <button
                  type="button"
                  onClick={() => setRetorqueTab('history')}
                  className={cn(
                    'py-2 text-xs font-bold rounded-lg transition-all',
                    retorqueTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  📋 Riwayat ({visibleRecords.length})
                </button>
              </div>

              {retorqueTab === 'form' ? (
                <>
                  {retorqueFormCard}
                  {/* Mobile Sticky Action Bar */}
                  <div className="fixed bottom-[64px] inset-x-0 mx-auto max-w-[430px] z-50 p-2.5 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="dense"
                      onClick={saveRecord}
                      className="flex-1 h-10 text-xs font-bold border-slate-300"
                    >
                      <Save className="mr-1.5 size-4 text-slate-600" />
                      Submit Form
                    </Button>
                    <Button
                      type="button"
                      size="dense"
                      onClick={() => downloadPdf()}
                      disabled={isGenerating}
                      className="flex-1 h-10 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isGenerating ? (
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <Download className="mr-1.5 size-4" />
                      )}
                      Download PDF
                    </Button>
                  </div>
                </>
              ) : (
                retorqueHistoryCard
              )}
            </div>
          )}
        </div>

        <div className="fixed top-0 -left-[10000px] opacity-100" aria-hidden="true">
          <div ref={pdfPageRef}>
            <RetorquePdfPage
              variant={pdfPayload.variant}
              rowCount={pdfPayload.rowCount}
              draft={pdfPayload.draft}
              rows={pdfPayload.rows}
              signatures={pdfPayload.signatures}
            />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Tabs defaultValue="retorque" className="w-full gap-4">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex min-w-full sm:min-w-0 justify-start overflow-x-auto scrollbar-none flex-nowrap shrink-0 gap-1.5 p-1.5 h-auto bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-xs">
            <TabsTrigger
              value="retorque"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xs min-h-[38px]"
            >
              Retorque
            </TabsTrigger>
            <TabsTrigger
              value="change-tire"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xs min-h-[38px]"
            >
              Change Tire
            </TabsTrigger>
            <TabsTrigger
              value="tire-inflation"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xs min-h-[38px]"
            >
              Pengisian Angin
            </TabsTrigger>
            <TabsTrigger
              value="tyre-handler"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xs min-h-[38px]"
            >
              Tyre Handler
            </TabsTrigger>
            <TabsTrigger
              value="siap-hadir"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xs min-h-[38px]"
            >
              Siap dan Hadir
            </TabsTrigger>
            <TabsTrigger
              value="refueling"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xs min-h-[38px]"
            >
              Re-Fueling
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Retorque Tab */}
        <TabsContent value="retorque">
          <div className="space-y-4">
            {retorqueFormCard}
            {retorqueHistoryCard}
          </div>
        </TabsContent>

        <TabsContent value="change-tire">
          <ChangeTireForm mobile={mobile} />
        </TabsContent>
        <TabsContent value="tire-inflation">
          <TireInflationForm mobile={mobile} />
        </TabsContent>
        <TabsContent value="tyre-handler">
          <TyreHandlerInspectionForm mobile={mobile} />
        </TabsContent>
        <TabsContent value="siap-hadir">
          <SiapHadirForm mobile={mobile} />
        </TabsContent>
        <TabsContent value="refueling">
          <RefuelingForm mobile={mobile} />
        </TabsContent>
      </Tabs>

      <div className="fixed top-0 -left-[10000px] opacity-100" aria-hidden="true">
        <div ref={pdfPageRef}>
          <RetorquePdfPage
            variant={pdfPayload.variant}
            rowCount={pdfPayload.rowCount}
            draft={pdfPayload.draft}
            rows={pdfPayload.rows}
            signatures={pdfPayload.signatures}
          />
        </div>
      </div>
    </>
  )
}
