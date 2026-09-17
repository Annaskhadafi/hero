'use client'

import SignatureCanvas from 'react-signature-canvas'
import { Download, Loader2, Pencil, RotateCcw, Save, Trash2 } from 'lucide-react'
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
import { getSites, getManualTorqueAssets } from '@/app/dashboard/360-service/service-form/actions'
import { ChangeTireForm } from '@/components/service-forms/change-tire-form'
import { TireInflationForm } from '@/components/service-forms/tire-inflation-form'
import { TyreHandlerInspectionForm } from '@/components/service-forms/tyre-handler-inspection-form'
import { SiapHadirForm } from '@/components/service-forms/siap-hadir-form'

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
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs font-bold">{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
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
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs font-bold">{label}</Label>
      <div className="bg-surface-container-lowest rounded-lg p-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
        <SignatureCanvas
          ref={signatureRef}
          onEnd={onEnd}
          canvasProps={{
            className: 'h-32 w-full touch-none rounded-md bg-white',
          }}
        />
      </div>
      <Button type="button" variant="outline" size="dense" onClick={onClear}>
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

  return (
    <>
      <Tabs defaultValue="retorque" className={cn('w-full', mobile ? 'gap-3' : 'gap-4')}>
        <TabsList
          className={cn(
            'w-full justify-start overflow-x-auto',
            mobile && 'min-h-11 rounded-xl bg-white'
          )}
        >
          <TabsTrigger value="retorque">Retorque</TabsTrigger>
          <TabsTrigger value="change-tire">Change Tire</TabsTrigger>
          <TabsTrigger value="tire-inflation">Pengisian Angin</TabsTrigger>
          <TabsTrigger value="tyre-handler">Tyre Handler</TabsTrigger>
          <TabsTrigger value="siap-hadir">Siap dan Hadir</TabsTrigger>
        </TabsList>

        {/* Retorque Tab - Rendered Inline just like Siap dan Hadir */}
        <TabsContent value="retorque">
          <div className="space-y-6">
            {/* Sub-tabs switcher */}
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={activeVariant === 'DT' ? 'default' : 'outline'}
                  size="dense"
                  onClick={() => openForm('DT')}
                  className={cn(
                    activeVariant === 'DT' && 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  Form Retorque DT
                </Button>
                <Button
                  type="button"
                  variant={activeVariant === 'OHT' ? 'default' : 'outline'}
                  size="dense"
                  onClick={() => openForm('OHT')}
                  className={cn(
                    activeVariant === 'OHT' && 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  Form Retorque OHT
                </Button>
              </div>
            </div>

            {/* Inline Form Card */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold">
                      {formTitle}
                    </CardTitle>
                    {editingRecordId ? (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Mode Edit
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Input data, tanda tangan digital, lalu simpan riwayat atau download PDF A4.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="dense"
                    onClick={() => openForm(activeVariant)}
                  >
                    <RotateCcw className="mr-1.5 size-4" />
                    Reset Form
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="dense"
                    onClick={saveRecord}
                  >
                    <Save className="mr-1.5 size-4" />
                    Simpan History
                  </Button>
                  <Button
                    type="button"
                    size="dense"
                    onClick={() => downloadPdf()}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="mr-1.5 size-4" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-5">
                {/* Document Metadata */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-bold">Nama Site</Label>
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
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border border-gray-100 shadow-none">
                    <CardHeader className="py-3 px-4 bg-gray-50/50 rounded-t-lg border-b">
                      <CardTitle className="text-sm font-semibold">Torque Pertama</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 p-4">
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
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs font-bold">SN Retorque</Label>
                        <Combobox
                          value={draft.firstSn}
                          onChange={(value) => updateDraft('firstSn', value.split(' — ')[0])}
                          options={snOptions}
                          placeholder="Cari SN asset MANUAL TORQUE..."
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-100 shadow-none">
                    <CardHeader className="py-3 px-4 bg-gray-50/50 rounded-t-lg border-b">
                      <CardTitle className="text-sm font-semibold">Re-Torque Kedua</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 p-4">
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
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs font-bold">SN Retorque</Label>
                        <Combobox
                          value={draft.secondSn}
                          onChange={(value) => updateDraft('secondSn', value.split(' — ')[0])}
                          options={snOptions}
                          placeholder="Cari SN asset MANUAL TORQUE..."
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Posisi Ban */}
                <Card className="border border-gray-100 shadow-none">
                  <CardHeader className="py-3 px-4 bg-gray-50/50 rounded-t-lg border-b">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <CardTitle className="text-sm font-semibold">Posisi Ban</CardTitle>
                      {variant === 'DT' ? (
                        <label className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
                          Jumlah Baris DT:
                          <select
                            value={dtRowCount}
                            onChange={(event) => setDtRowCount(Number(event.target.value))}
                            className="bg-white text-foreground h-8 rounded-md px-2.5 border text-xs"
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
                  <CardContent className="space-y-3 p-4">
                    {rows.slice(0, rowCount).map((row, index) => (
                      <div
                        key={index}
                        className="bg-gray-50/70 border border-gray-100 grid gap-3 rounded-lg p-3 md:grid-cols-[80px_1fr_1fr]"
                      >
                        <div className="text-primary flex items-center text-xs font-bold">
                          Ban #{index + 1}
                        </div>
                        <Input
                          value={row.condition}
                          onChange={(event) => updateRow(index, 'condition', event.target.value)}
                          placeholder="Kondisi Bolt Stud dan Nut..."
                          className="h-8 text-xs bg-white"
                        />
                        <Input
                          value={row.recommendation}
                          onChange={(event) => updateRow(index, 'recommendation', event.target.value)}
                          placeholder="Rekomendasi..."
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Alasan & Catatan */}
                <div className="grid gap-4 md:grid-cols-2">
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
                <Card className="border border-gray-100 shadow-none">
                  <CardHeader className="py-3 px-4 bg-gray-50/50 rounded-t-lg border-b">
                    <CardTitle className="text-sm font-semibold">Tanda Tangan Digital</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-3 p-4">
                    <div className="space-y-3">
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
                    <div className="space-y-3">
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
                    <div className="space-y-3">
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
                <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" size="dense" onClick={saveRecord}>
                    <Save className="mr-1.5 size-4" />
                    Simpan History
                  </Button>
                  <Button type="button" size="dense" onClick={() => downloadPdf()} disabled={isGenerating}>
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

            {/* Riwayat History Card */}
            <Card className={cn(mobile && 'rounded-2xl bg-white shadow-sm')}>
              <CardHeader>
                <CardTitle>History Retorque Form ({records.length})</CardTitle>
              </CardHeader>
              <CardContent>
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
                      {records.map((record) => (
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-xs">
                            Belum ada riwayat form retorque yang tersimpan.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </MinimalTableShell>
              </CardContent>
            </Card>
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
