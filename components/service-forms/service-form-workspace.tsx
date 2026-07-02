'use client'

import SignatureCanvas from 'react-signature-canvas'
import { Download, Loader2, PenLine, Pencil, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

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
    <div className="grid grid-cols-[30mm_3mm_1fr] items-center gap-1 text-[7px] leading-none text-black">
      <span>{label}</span>
      <span>:</span>
      <span className="min-h-[4mm] border border-black px-1 leading-[4mm]">{value}</span>
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
    <div className="flex min-h-[28mm] flex-col justify-between text-center text-[7px] text-black">
      <div>{title}</div>
      <div className="flex h-[13mm] items-center justify-center">
        {signature ? (
          <img src={signature} alt="" className="max-h-[12mm] max-w-[42mm] object-contain" />
        ) : null}
      </div>
      <div>
        <div className="min-h-[4mm] font-semibold">{name}</div>
        <div>{footer}</div>
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
      <div className="relative z-10 px-[15mm] pt-[55mm] text-black">
        <div className="mr-[10mm] ml-[30mm] text-center">
          <h2 className="text-[14px] leading-tight font-black">{title}</h2>
          <p className="mt-1 text-[14px] leading-tight font-black">
            {draft.siteName || 'BMB SITE'}
          </p>
        </div>

        <div className="mt-[10mm] grid grid-cols-2 gap-[10mm]">
          <div className="space-y-[1mm]">
            <Field label="Tanggal" value={draft.date} />
            <Field label="Tipe Unit" value={draft.unitType} />
            <Field label="Shift" value={draft.shift} />
          </div>
          <div className="space-y-[1mm]">
            <Field label="Nama Site" value={draft.siteName} />
            <Field label="Lokasi Kerja" value={draft.workLocation} />
          </div>
        </div>

        <div className="my-[5mm] h-px bg-black" />

        <div className="grid grid-cols-2 gap-[10mm]">
          <div className="space-y-[1mm]">
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
          <div className="space-y-[1mm]">
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

        <div className="mt-[7mm] grid grid-cols-[25mm_1fr] gap-[5mm]">
          <div className="pt-[1mm] text-center text-black">
            <div className="text-[11px] font-bold">RE TORQUE</div>
            <div className="text-[7px]">Posisi Ban</div>
            <div className="mt-[1mm] space-y-[1.2mm] text-[7px] leading-none">
              {rows.slice(0, rowCount).map((_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
          </div>
          <table className="w-full border-collapse text-[7px] leading-none text-black">
            <thead>
              <tr>
                <th className="h-[5mm] border border-black font-bold">Kondisi Bolt Stud dan Nut</th>
                <th className="h-[5mm] border border-black font-bold">Rekomendasi</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, rowCount).map((row, index) => (
                <tr key={index}>
                  <td className="h-[5mm] border border-black px-1">{row.condition}</td>
                  <td className="h-[5mm] border border-black px-1">{row.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-[8mm] grid grid-cols-2 gap-[10mm] text-[7px] text-black">
          <div className="grid grid-cols-[30mm_3mm_1fr]">
            <span>Alasan</span>
            <span>:</span>
            <span>{draft.reason}</span>
          </div>
          <div className="grid grid-cols-[30mm_3mm_1fr]">
            <span>Catatan</span>
            <span>:</span>
            <span>{draft.notes}</span>
          </div>
        </div>

        <div className="mt-[4mm] grid grid-cols-3 gap-[10mm]">
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
            footer="Nama dan Tanda Tangan karyawan"
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs font-bold">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} type={type} />
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
  const [activeVariant, setActiveVariant] = useState<RetorqueVariant | null>(null)
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
  const [pdfPayload, setPdfPayload] = useState<RetorquePdfPayload>(() => createBlankPayload())
  const [siteOptions, setSiteOptions] = useState<string[]>([])
  const [snOptions, setSnOptions] = useState<string[]>([])

  const firstSignatureRef = useRef<SignatureCanvas | null>(null)
  const secondSignatureRef = useRef<SignatureCanvas | null>(null)
  const knownBySignatureRef = useRef<SignatureCanvas | null>(null)
  const pdfPageRef = useRef<HTMLDivElement | null>(null)

  const variant = activeVariant ?? 'DT'
  const rowCount = variant === 'OHT' ? 6 : dtRowCount
  const torqueSpecLabel = labelForTorqueSpec(variant)
  const dialogTitle = variant === 'OHT' ? 'Form Retorque OHT' : 'Form Retorque DT'

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
        </TabsList>
        <TabsContent value="retorque">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {formVariants.map((v) => (
                <Button key={v} type="button" size="dense" onClick={() => openForm(v)}>
                  <PenLine className="size-4" />
                  Form Retorque {v}
                </Button>
              ))}
            </div>

            <Card className={cn(mobile && 'rounded-2xl bg-white shadow-sm')}>
              <CardHeader>
                <CardTitle>History Service Form</CardTitle>
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
                          <TableCell className="whitespace-nowrap">
                            {record.draft.date || '-'}
                          </TableCell>
                          <TableCell>{record.variant}</TableCell>
                          <TableCell className="font-semibold">
                            {record.draft.unitNumber || '-'}
                          </TableCell>
                          <TableCell>{record.draft.siteName || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(record.updatedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="dense"
                                onClick={() => editRecord(record)}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="dense"
                                onClick={() => downloadPdf(record)}
                                disabled={isGenerating}
                              >
                                <Download className="size-4" />
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                            Belum ada history form.
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
      </Tabs>

      <Dialog
        open={Boolean(activeVariant)}
        onOpenChange={(open) => !open && setActiveVariant(null)}
      >
        <DialogContent className="max-w-[min(1120px,calc(100vw-1rem))] gap-0 p-0">
          <DialogHeader className="border-b border-black/5 px-5 py-4">
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Input data, tanda tangan digital, lalu download PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(100vh-10rem)] space-y-5 overflow-y-auto px-5 py-5">
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
              />
              <FieldInput
                label="Shift"
                value={draft.shift}
                onChange={(value) => updateDraft('shift', value)}
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
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Torque Pertama</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <FieldInput
                    label="No Unit"
                    value={draft.unitNumber}
                    onChange={(value) => updateDraft('unitNumber', value)}
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
                  />
                  <FieldInput
                    label="Tekanan Torque"
                    value={draft.firstPressure}
                    onChange={(value) => updateDraft('firstPressure', value)}
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

              <Card>
                <CardHeader>
                  <CardTitle>Re-Torque Kedua</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
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
                  />
                  <FieldInput
                    label="Tekanan Torque"
                    value={draft.secondPressure}
                    onChange={(value) => updateDraft('secondPressure', value)}
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

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Posisi Ban</CardTitle>
                  {variant === 'DT' ? (
                    <label className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
                      Baris DT
                      <select
                        value={dtRowCount}
                        onChange={(event) => setDtRowCount(Number(event.target.value))}
                        className="bg-surface-container-low text-foreground h-9 rounded-md px-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
                      >
                        <option value={8}>8</option>
                        <option value={12}>12</option>
                      </select>
                    </label>
                  ) : (
                    <span className="text-muted-foreground text-sm font-semibold">OHT 6 baris</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {rows.slice(0, rowCount).map((row, index) => (
                  <div
                    key={index}
                    className="bg-surface-container-low grid gap-3 rounded-lg p-3 md:grid-cols-[64px_1fr_1fr]"
                  >
                    <div className="text-primary flex items-center text-sm font-black">
                      Ban {index + 1}
                    </div>
                    <Input
                      value={row.condition}
                      onChange={(event) => updateRow(index, 'condition', event.target.value)}
                      placeholder="Kondisi Bolt Stud dan Nut"
                    />
                    <Input
                      value={row.recommendation}
                      onChange={(event) => updateRow(index, 'recommendation', event.target.value)}
                      placeholder="Rekomendasi"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldInput
                label="Alasan"
                value={draft.reason}
                onChange={(value) => updateDraft('reason', value)}
              />
              <FieldInput
                label="Catatan"
                value={draft.notes}
                onChange={(value) => updateDraft('notes', value)}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tanda Tangan Digital</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-3">
                  <FieldInput
                    label="Nama Operator Retorque Pertama"
                    value={draft.firstSignerName}
                    onChange={(value) => updateDraft('firstSignerName', value)}
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
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-black/5 px-5 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setActiveVariant(null)}>
              Tutup
            </Button>
            <Button type="button" variant="outline" onClick={saveRecord}>
              <Save className="size-4" />
              Simpan History
            </Button>
            <Button type="button" onClick={() => downloadPdf()} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
