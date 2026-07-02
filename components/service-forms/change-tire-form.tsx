'use client'

import { Download, Loader2, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getSites } from '@/app/dashboard/360-service/service-form/actions'

type TireData = {
  position: string
  serialNo: string
  tyreSize: string
  manufacturer: string
  pattern: string
  treadDepth1: string
  treadDepth2: string
  rimNumber: string
  pressure: string
  reasonForSpareMatching: boolean
  reasonForLeakSmg: boolean
  reasonForLeakShc: boolean
  reasonForLeakImpact: boolean
  reasonForToBeSwapped: boolean
  reasonForAccident: boolean
  commentsNewTyre: boolean
  commentsSpareTyre: boolean
  commentsSwappedFrom: string
  tireRepairForSpare: string
}

type TireChangeBlock = {
  removed: TireData
  installed: TireData
}

type TireChangeHeader = {
  date: string
  wo: string
  unitNumber: string
  smu: string
  startTime: string
  finishTime: string
}

type TireChangeDraft = {
  header: TireChangeHeader
  siteName: string
  blocks: TireChangeBlock[]
}

type TireChangePdfPayload = {
  header: TireChangeHeader
  siteName: string
  blocks: TireChangeBlock[]
}

type TireChangeRecord = TireChangePdfPayload & {
  id: string
  createdAt: string
  updatedAt: string
}

const LETTERHEAD_URL = '/ChitraParatama_Stationery_Letterhead_jkt.jpg'
const STORAGE_KEY = 'hero-service-form-change-tire-history'
const CB_PREFIX = 'hero-ct-combobox'

function loadCbOptions(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`${CB_PREFIX}-${key}`) || '[]')
  } catch { return [] }
}

function saveCbOption(key: string, value: string) {
  if (!value.trim()) return
  const existing = loadCbOptions(key)
  if (existing.includes(value)) return
  localStorage.setItem(`${CB_PREFIX}-${key}`, JSON.stringify([...existing, value]))
}

function removeCbOption(key: string, value: string) {
  const existing = loadCbOptions(key).filter((v) => v !== value)
  localStorage.setItem(`${CB_PREFIX}-${key}`, JSON.stringify(existing))
}

function emptyTireData(): TireData {
  return {
    position: '',
    serialNo: '',
    tyreSize: '',
    manufacturer: '',
    pattern: '',
    treadDepth1: '',
    treadDepth2: '',
    rimNumber: '',
    pressure: '',
    reasonForSpareMatching: false,
    reasonForLeakSmg: false,
    reasonForLeakShc: false,
    reasonForLeakImpact: false,
    reasonForToBeSwapped: false,
    reasonForAccident: false,
    commentsNewTyre: false,
    commentsSpareTyre: false,
    commentsSwappedFrom: '',
    tireRepairForSpare: '',
  }
}

function emptyBlock(): TireChangeBlock {
  return { removed: emptyTireData(), installed: emptyTireData() }
}

function emptyHeader(): TireChangeHeader {
  return { date: '', wo: '', unitNumber: '', smu: '', startTime: '', finishTime: '' }
}

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function PdfField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[28mm_1mm_1fr] items-center gap-[0.5mm] text-[6px] leading-none text-black">
      <span>{label}</span>
      <span>:</span>
      <span className="min-h-[3.5mm] border border-black px-[0.5mm] leading-[3.5mm]">
        {value}
      </span>
    </div>
  )
}

function PdfCheck({ label, checked }: { label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-[0.5mm] text-[6px] text-black">
      <span className="inline-flex h-[2.5mm] w-[2.5mm] items-center justify-center border border-black text-[5px]">
        {checked ? '✓' : ''}
      </span>
      {label}
    </label>
  )
}

function PdfTireSection({
  title,
  data,
  showPressure,
  showComments,
  showReason,
}: {
  title: string
  data: TireData
  showPressure?: boolean
  showComments?: boolean
  showReason?: boolean
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="bg-[#c4d0dc] px-[2mm] py-[1mm] text-center text-[8px] font-black text-black">
        {title}
      </div>
      <div className="border border-t-0 border-black px-[2mm] py-[1.5mm]">
        <div className="space-y-[1.5mm]">
          <PdfField label="Position" value={data.position} />
          <PdfField label="Serial No" value={data.serialNo} />
          <PdfField label="Tyre Size" value={data.tyreSize} />
          <PdfField label="Manufacturer" value={data.manufacturer} />
          <PdfField label="Pattern / Type" value={data.pattern} />
          <div className="grid grid-cols-[28mm_1mm_1fr] items-center gap-[0.5mm] text-[6px] leading-none text-black">
            <span>Tread Depth (TDR)</span>
            <span>:</span>
            <span className="flex items-center gap-[0.5mm]">
              <span className="inline-block min-h-[3.5mm] w-[8mm] border border-black px-[0.5mm] leading-[3.5mm]">
                {data.treadDepth1}
              </span>
              / <span className="inline-block min-h-[3.5mm] w-[8mm] border border-black px-[0.5mm] leading-[3.5mm]">
                {data.treadDepth2}
              </span>
              mm
            </span>
          </div>
          <PdfField label="Rim Number" value={data.rimNumber} />
          {showReason && (
            <div className="space-y-[0.5mm]">
              <div className="text-[6px] font-semibold">Reason for Removal</div>
              <div className="grid grid-cols-1 gap-[0.3mm]">
                <PdfCheck label="For Spare / Matching" checked={data.reasonForSpareMatching} />
                <PdfCheck label="Leak (SMG / SHC / IMPACT)" checked={data.reasonForLeakSmg || data.reasonForLeakShc || data.reasonForLeakImpact} />
                <PdfCheck label="To Be Swapped" checked={data.reasonForToBeSwapped} />
                <PdfCheck label="Accident" checked={data.reasonForAccident} />
              </div>
            </div>
          )}
          {showPressure && (
            <PdfField label="Pressure (Psi)" value={data.pressure} />
          )}
          {showComments && (
            <div className="space-y-[0.5mm]">
              <div className="text-[6px] font-semibold">Comments</div>
              <div className="grid grid-cols-1 gap-[0.3mm]">
                <PdfCheck label="New Tyre" checked={data.commentsNewTyre} />
                <PdfCheck label="Spare Tyre" checked={data.commentsSpareTyre} />
                <div className="flex items-center gap-[0.5mm] text-[6px] text-black">
                  <span className="inline-flex h-[2.5mm] w-[2.5mm] items-center justify-center border border-black text-[5px]">
                    {data.commentsSwappedFrom ? '✓' : ''}
                  </span>
                  Swapped From
                  <span className="inline-block min-h-[3.5mm] flex-1 border-b border-black px-[0.5mm]">
                    {data.commentsSwappedFrom}
                  </span>
                </div>
              </div>
              <PdfField label="Tire Repair for Spare" value={data.tireRepairForSpare} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PdfPage({
  header,
  siteName,
  blocks,
}: {
  header: TireChangeHeader
  siteName: string
  blocks: TireChangeBlock[]
}) {
  return (
    <div
      className="change-tire-pdf-page relative overflow-hidden bg-white font-sans text-black"
      style={{ width: '210mm', minHeight: '297mm' }}
    >
      <img src={LETTERHEAD_URL} alt="" className="absolute inset-0 z-0 h-full w-full object-fill" />
      <div className="relative z-10 px-[10mm] pt-[8mm] text-black">
        <h2 className="text-center text-[12px] font-black">
          FORM CHANGE OUT & ROTATION RECORD SHEET
        </h2>

        <div className="mt-[5mm] grid grid-cols-2 gap-x-[10mm] gap-y-[1.5mm] text-[7px]">
          <PdfField label="Date" value={header.date} />
          <div />
          <PdfField label="WO / Work Order" value={header.wo} />
          <PdfField label="Unit Number" value={header.unitNumber} />
          <PdfField label="SMU (Service Meter Unit)" value={header.smu} />
          <div className="grid grid-cols-[28mm_1mm_1fr] items-center gap-[0.5mm] text-[6px] leading-none text-black">
            <span>Start Time</span>
            <span>:</span>
            <span className="flex items-center gap-[0.5mm]">
              <span className="inline-block min-h-[3.5mm] w-[15mm] border border-black px-[0.5mm] leading-[3.5mm]">
                {header.startTime}
              </span>
              hrs
            </span>
          </div>
          <div className="grid grid-cols-[28mm_1mm_1fr] items-center gap-[0.5mm] text-[6px] leading-none text-black">
            <span>Finish Time</span>
            <span>:</span>
            <span className="flex items-center gap-[0.5mm]">
              <span className="inline-block min-h-[3.5mm] w-[15mm] border border-black px-[0.5mm] leading-[3.5mm]">
                {header.finishTime}
              </span>
              hrs
            </span>
          </div>
        </div>

        {siteName && (
          <div className="mt-[2mm] text-center text-[9px] font-black">{siteName}</div>
        )}

        <div className="mt-[4mm] space-y-[4mm]">
          {blocks.map((block, i) => (
            <div key={i} className="flex gap-[2mm]">
              <PdfTireSection
                title="TYRE BEING REMOVED"
                data={block.removed}
                showReason
              />
              <PdfTireSection
                title="TYRE BEING INSTALLED"
                data={block.installed}
                showPressure
                showComments
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChangeTireField({
  label,
  value,
  onChange,
  type = 'text',
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  className?: string
}) {
  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <Label className="text-muted-foreground block truncate text-[10px] font-bold leading-none sm:text-[11px]">
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        className="h-8 w-full text-xs"
      />
    </div>
  )
}

function TireSection({
  title,
  data,
  onUpdate,
  showPressure,
  showComments,
  showReason,
}: {
  title: string
  data: TireData
  onUpdate: (patch: Partial<TireData>) => void
  showPressure?: boolean
  showComments?: boolean
  showReason?: boolean
}) {
  const [positionOpts, setPositionOpts] = useState<string[]>([])
  const [tyreSizeOpts, setTyreSizeOpts] = useState<string[]>([])
  const [manufacturerOpts, setManufacturerOpts] = useState<string[]>([])
  const [patternOpts, setPatternOpts] = useState<string[]>([])

  useEffect(() => {
    setPositionOpts(loadCbOptions('position'))
    setTyreSizeOpts(loadCbOptions('tyreSize'))
    setManufacturerOpts(loadCbOptions('manufacturer'))
    setPatternOpts(loadCbOptions('pattern'))
  }, [])

  function saveAndSet(
    key: string,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    field: keyof TireData
  ) {
    saveCbOption(key, value)
    setter(loadCbOptions(key))
    onUpdate({ [field]: value })
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="bg-muted/50 truncate rounded-md px-3 py-1.5 text-xs font-black text-foreground">
        {title}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <Label className="text-muted-foreground block truncate text-[10px] font-bold leading-none sm:text-[11px]">Position</Label>
          <Combobox
            value={data.position}
            onChange={(v) => saveAndSet('position', v, setPositionOpts, 'position')}
            options={positionOpts}
            placeholder="Select position..."
          />
        </div>
        <ChangeTireField
          label="Serial No"
          value={data.serialNo}
          onChange={(v) => onUpdate({ serialNo: v })}
        />
        <div className="min-w-0 space-y-1">
          <Label className="text-muted-foreground block truncate text-[10px] font-bold leading-none sm:text-[11px]">Tyre Size</Label>
          <Combobox
            value={data.tyreSize}
            onChange={(v) => saveAndSet('tyreSize', v, setTyreSizeOpts, 'tyreSize')}
            options={tyreSizeOpts}
            placeholder="Select size..."
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-muted-foreground block truncate text-[10px] font-bold leading-none sm:text-[11px]">Manufacturer</Label>
          <Combobox
            value={data.manufacturer}
            onChange={(v) => saveAndSet('manufacturer', v, setManufacturerOpts, 'manufacturer')}
            options={manufacturerOpts}
            placeholder="Select manufacturer..."
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-muted-foreground block truncate text-[10px] font-bold leading-none sm:text-[11px]">Pattern</Label>
          <Combobox
            value={data.pattern}
            onChange={(v) => saveAndSet('pattern', v, setPatternOpts, 'pattern')}
            options={patternOpts}
            placeholder="Select pattern..."
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-muted-foreground block truncate text-[10px] font-bold leading-none sm:text-[11px]">
            Tread Depth (TDR) mm
          </Label>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Input
              value={data.treadDepth1}
              onChange={(e) => onUpdate({ treadDepth1: e.target.value })}
              className="h-8 min-w-0 flex-1 text-xs sm:w-20 sm:flex-none"
              placeholder="..."
            />
            <span className="shrink-0 text-xs">/</span>
            <Input
              value={data.treadDepth2}
              onChange={(e) => onUpdate({ treadDepth2: e.target.value })}
              className="h-8 min-w-0 flex-1 text-xs sm:w-20 sm:flex-none"
              placeholder="..."
            />
            <span className="shrink-0 text-xs">mm</span>
          </div>
        </div>
        <ChangeTireField
          label="Rim Number"
          value={data.rimNumber}
          onChange={(v) => onUpdate({ rimNumber: v })}
        />
        {showPressure && (
          <ChangeTireField
            label="Pressure (Psi)"
            value={data.pressure}
            onChange={(v) => onUpdate({ pressure: v })}
            type="number"
          />
        )}
      </div>
      {showReason && (
        <div className="space-y-1.5">
          <Label className="text-muted-foreground block truncate text-[10px] font-bold leading-none sm:text-[11px]">
            Reason for Removal
          </Label>
          <div className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2 md:grid-cols-3">
            {(
              [
                ['reasonForSpareMatching', 'For Spare / Matching'],
                ['reasonForLeakSmg', 'Leak (SMG)'],
                ['reasonForLeakShc', 'Leak (SHC)'],
                ['reasonForLeakImpact', 'Leak (IMPACT)'],
                ['reasonForToBeSwapped', 'To Be Swapped'],
                ['reasonForAccident', 'Accident'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                <Checkbox
                  checked={data[key]}
                  onCheckedChange={(checked) => onUpdate({ [key]: Boolean(checked) })}
                  className="size-3.5"
                />
                <span className="truncate">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {showComments && (
        <div className="space-y-1.5">
          <Label className="text-muted-foreground block truncate text-[10px] font-bold leading-none sm:text-[11px]">
            Comments
          </Label>
          <div className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2 md:grid-cols-3">
            <label className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <Checkbox
                checked={data.commentsNewTyre}
                onCheckedChange={(checked) => onUpdate({ commentsNewTyre: Boolean(checked) })}
                className="size-3.5"
              />
              New Tyre
            </label>
            <label className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <Checkbox
                checked={data.commentsSpareTyre}
                onCheckedChange={(checked) => onUpdate({ commentsSpareTyre: Boolean(checked) })}
                className="size-3.5"
              />
              Spare Tyre
            </label>
            <ChangeTireField
              label="Swapped From"
              value={data.commentsSwappedFrom}
              onChange={(v) => onUpdate({ commentsSwappedFrom: v })}
            />
          </div>
          <ChangeTireField
            label="Tire Repair for Spare"
            value={data.tireRepairForSpare}
            onChange={(v) => onUpdate({ tireRepairForSpare: v })}
          />
        </div>
      )}
    </div>
  )
}

export function ChangeTireForm({ mobile }: { mobile?: boolean }) {
  const [siteOptions, setSiteOptions] = useState<string[]>([])
  const [records, setRecords] = useState<TireChangeRecord[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [draft, setDraft] = useState<TireChangeDraft>({
    header: emptyHeader(),
    siteName: '',
    blocks: [emptyBlock()],
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const pdfPageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    getSites().then((res) => {
      if (res.success) setSiteOptions(res.data.map((s) => s.name))
    })
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as TireChangeRecord[]) : []
      setRecords(Array.isArray(parsed) ? parsed : [])
    } catch {
      /* ignore */
    } finally {
      setHasLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!hasLoaded) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }, [hasLoaded, records])

  function updateHeader(patch: Partial<TireChangeHeader>) {
    setDraft((d) => ({ ...d, header: { ...d.header, ...patch } }))
  }

  function updateBlockTire(
    blockIndex: number,
    side: 'removed' | 'installed',
    patch: Partial<TireData>
  ) {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b, i) =>
        i === blockIndex ? { ...b, [side]: { ...b[side], ...patch } } : b
      ),
    }))
  }

  function addBlock() {
    setDraft((d) => ({ ...d, blocks: [...d.blocks, emptyBlock()] }))
  }

  function removeBlock(index: number) {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.length > 1 ? d.blocks.filter((_, i) => i !== index) : d.blocks,
    }))
  }

  function newForm() {
    setDraft({ header: emptyHeader(), siteName: '', blocks: [emptyBlock()] })
    setEditingId(null)
  }

  function saveRecord() {
    const now = new Date().toISOString()
    const payload: TireChangePdfPayload = {
      header: { ...draft.header },
      siteName: draft.siteName,
      blocks: draft.blocks.map((b) => ({
        removed: { ...b.removed },
        installed: { ...b.installed },
      })),
    }

    if (editingId) {
      setRecords((c) =>
        c.map((r) => (r.id === editingId ? { ...r, ...payload, updatedAt: now } : r))
      )
      return
    }

    const id = crypto.randomUUID?.() ?? `change-tire-${Date.now()}`
    setEditingId(id)
    setRecords((c) => [{ id, ...payload, createdAt: now, updatedAt: now }, ...c])
  }

  function editRecord(record: TireChangeRecord) {
    setEditingId(record.id)
    setDraft({
      header: { ...record.header },
      siteName: record.siteName,
      blocks: record.blocks.map((b) => ({
        removed: { ...b.removed },
        installed: { ...b.installed },
      })),
    })
  }

  async function downloadPdf() {
    const page = pdfPageRef.current
    if (!page) return
    setIsGenerating(true)
    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const images = Array.from(page.querySelectorAll('img'))
      await Promise.all(
        images.map((img) =>
          img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r() })
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
        windowWidth: page.scrollWidth,
        windowHeight: page.scrollHeight,
      })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      pdf.addImage(canvas.toDataURL('image/jpeg', 1), 'JPEG', 0, 0, 210, 297)
      pdf.save(
        `Change-Tire-${draft.header.unitNumber || 'draft'}.pdf`
      )
    } catch (error) {
      console.error('[change-tire] PDF error:', error)
      window.alert('Gagal membuat PDF.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="dense" onClick={newForm}>
            + New Form
          </Button>
        </div>

        <div className="space-y-3">
          <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-[11px] font-bold leading-none">Site Name</Label>
              <Combobox
                value={draft.siteName}
                onChange={(v) => setDraft((d) => ({ ...d, siteName: v }))}
                options={siteOptions}
                placeholder="Select site..."
              />
            </div>
            <ChangeTireField
              label="Date"
              value={draft.header.date}
              onChange={(v) => updateHeader({ date: v })}
              type="date"
            />
            <ChangeTireField
              label="WO / Work Order"
              value={draft.header.wo}
              onChange={(v) => updateHeader({ wo: v })}
            />
            <ChangeTireField
              label="Unit Number"
              value={draft.header.unitNumber}
              onChange={(v) => updateHeader({ unitNumber: v })}
            />
            <ChangeTireField
              label="SMU (Service Meter Unit)"
              value={draft.header.smu}
              onChange={(v) => updateHeader({ smu: v })}
            />
            <ChangeTireField
              label="Start Time"
              value={draft.header.startTime}
              onChange={(v) => updateHeader({ startTime: v })}
              type="time"
            />
            <ChangeTireField
              label="Finish Time"
              value={draft.header.finishTime}
              onChange={(v) => updateHeader({ finishTime: v })}
              type="time"
            />
          </div>

          {draft.blocks.map((block, blockIndex) => (
            <div
              key={blockIndex}
              className="bg-surface-container-low rounded-xl border border-black/5 p-2 sm:p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-black text-foreground">
                  Block {blockIndex + 1}
                </span>
                {draft.blocks.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="dense"
                    onClick={() => removeBlock(blockIndex)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="space-y-3 sm:space-y-4">
                <TireSection
                  title="TYRE BEING REMOVED"
                  data={block.removed}
                  onUpdate={(patch) => updateBlockTire(blockIndex, 'removed', patch)}
                  showReason
                />
                <TireSection
                  title="TYRE BEING INSTALLED"
                  data={block.installed}
                  onUpdate={(patch) => updateBlockTire(blockIndex, 'installed', patch)}
                  showPressure
                  showComments
                />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="dense" onClick={addBlock}>
            <Plus className="size-3.5" />
            Tambah Block
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-black/5 pt-3">
          <Button type="button" size="dense" onClick={saveRecord}>
            Save History
          </Button>
          <Button type="button" size="dense" onClick={downloadPdf} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Download PDF
          </Button>
        </div>

        {records.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-black">Change Tire History</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Unit No</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap">
                        {record.header.date || '-'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {record.header.unitNumber || '-'}
                      </TableCell>
                      <TableCell>{record.siteName || '-'}</TableCell>
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
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="dense"
                            onClick={() => {
                              editRecord(record)
                              window.setTimeout(downloadPdf, 200)
                            }}
                            disabled={isGenerating}
                          >
                            <Download className="size-3.5" />
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <div className="fixed top-0 -left-[10000px] opacity-100" aria-hidden="true">
        <div ref={pdfPageRef}>
          <PdfPage
            header={draft.header}
            siteName={draft.siteName}
            blocks={draft.blocks}
          />
        </div>
      </div>
    </>
  )
}
