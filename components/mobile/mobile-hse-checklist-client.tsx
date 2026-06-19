'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  createChecklistTemplate,
  createDailyChecklistFromTemplate,
  deleteChecklistTemplate,
  deleteDailyChecklist,
  getChecklistAuditLogs,
  getChecklistTemplatesWithLatestRevision,
  getChecklistTemplateRevisionDetail,
  getDailyChecklistHistory,
  getDailyChecklistReportData,
  logDailyChecklistAccess,
  saveDailyChecklistAnswers,
  updateChecklistTemplate,
  type ChecklistInputType,
} from '@/app/actions/hse-checklists'
import { uploadFile } from '@/app/actions/upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type ChecklistAccess = {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll?: boolean
}

type TemplateRow = Awaited<ReturnType<typeof getChecklistTemplatesWithLatestRevision>>[number]
type HistoryRow = Awaited<ReturnType<typeof getDailyChecklistHistory>>[number]
type AuditLogRow = Awaited<ReturnType<typeof getChecklistAuditLogs>>[number]

type ChecklistItem = {
  id: number
  orderIndex: number
  prompt: string
  inputType: ChecklistInputType
  isRequired: boolean
}

type ChecklistAnswerState =
  | { inputType: 'yes_no_na'; valueChoice: 'yes' | 'no' | 'na' | ''; attachments: string[] }
  | { inputType: 'scale_1_5'; valueNumber: number | null; attachments: string[] }
  | { inputType: 'free_text'; valueText: string; attachments: string[] }

type ActiveChecklist = {
  checklistId: number
  title: string
  area: string
  status: string
  scorePercent: number | null
  items: ChecklistItem[]
  answers: Record<number, ChecklistAnswerState>
}

type TemplateDraft = {
  templateId: number | null
  mode: 'create' | 'edit' | 'view'
  title: string
  description: string
  items: Array<{ prompt: string; inputType: ChecklistInputType; isRequired: boolean }>
}

type ReportData = Awaited<ReturnType<typeof getDailyChecklistReportData>>

function formatDate(value: Date | string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function buildInitialAnswer(item: ChecklistItem): ChecklistAnswerState {
  if (item.inputType === 'yes_no_na') return { inputType: 'yes_no_na', valueChoice: '', attachments: [] }
  if (item.inputType === 'scale_1_5') return { inputType: 'scale_1_5', valueNumber: null, attachments: [] }
  return { inputType: 'free_text', valueText: '', attachments: [] }
}

function toChecklistAnswerState(
  itemType: string,
  raw: { valueChoice: string; valueText: string; valueNumber: number | null; attachments?: string[] } | null
): ChecklistAnswerState {
  const attachments = raw?.attachments ?? []
  if (itemType === 'yes_no_na') {
    return { inputType: 'yes_no_na', valueChoice: (raw?.valueChoice ?? '') as 'yes' | 'no' | 'na' | '', attachments }
  }
  if (itemType === 'scale_1_5') {
    return { inputType: 'scale_1_5', valueNumber: raw?.valueNumber ?? null, attachments }
  }
  return { inputType: 'free_text', valueText: raw?.valueText ?? '', attachments }
}

function getAnswerProgress(checklist: ActiveChecklist | null) {
  if (!checklist) return { done: 0, total: 0, percent: 0 }

  const total = checklist.items.length
  const done = checklist.items.filter((item) => {
    const answer = checklist.answers[item.id]
    if (!answer) return false
    if (answer.inputType === 'yes_no_na') return Boolean(answer.valueChoice)
    if (answer.inputType === 'scale_1_5') return answer.valueNumber != null
    return Boolean(answer.valueText.trim())
  }).length

  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

export function MobileHseChecklistClient({
  currentUserName,
  templates,
  history,
  auditLogs,
  access,
}: {
  currentUserName: string
  templates: TemplateRow[]
  history: HistoryRow[]
  auditLogs: AuditLogRow[]
  access: ChecklistAccess
}) {
  const router = useRouter()
  const reportDocumentRef = React.useRef<HTMLDivElement>(null)
  const [activeView, setActiveView] = React.useState<'templates' | 'history' | 'logs'>('templates')
  const [query, setQuery] = React.useState('')
  const [area, setArea] = React.useState('')
  const [areaError, setAreaError] = React.useState('')
  const [activeTemplate, setActiveTemplate] = React.useState<TemplateRow | null>(null)
  const [checklist, setChecklist] = React.useState<ActiveChecklist | null>(null)
  const [templateDraft, setTemplateDraft] = React.useState<TemplateDraft | null>(null)
  const [reportData, setReportData] = React.useState<ReportData | null>(null)
  const [isStarting, setIsStarting] = React.useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = React.useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false)
  const [isPrintingPdf, setIsPrintingPdf] = React.useState(false)
  const [uploadingItemId, setUploadingItemId] = React.useState<number | null>(null)

  const filteredTemplates = templates.filter((template) => {
    const target = `${template.templateTitle} ${template.templateDescription ?? ''}`.toLowerCase()
    return target.includes(query.trim().toLowerCase())
  })
  const openCount = history.filter((row) => row.status !== 'completed').length
  const completedCount = history.filter((row) => row.status === 'completed').length
  const progress = getAnswerProgress(checklist)

  function openCreateTemplate() {
    if (!access.canEdit) {
      toast.error('Role Anda tidak punya akses membuat template.')
      return
    }
    setTemplateDraft({
      templateId: null,
      mode: 'create',
      title: '',
      description: '',
      items: [{ prompt: '', inputType: 'yes_no_na', isRequired: true }],
    })
  }

  async function openTemplate(template: TemplateRow, mode: 'view' | 'edit') {
    if (mode === 'edit' && !access.canEdit) {
      toast.error('Role Anda tidak punya akses edit template.')
      return
    }
    try {
      const detail = await getChecklistTemplateRevisionDetail(template.latestRevisionId)
      setTemplateDraft({
        templateId: template.templateId,
        mode,
        title: detail.revision.title,
        description: detail.revision.description ?? '',
        items: detail.items.map((item) => ({
          prompt: item.prompt,
          inputType: item.inputType as ChecklistInputType,
          isRequired: item.isRequired ?? true,
        })),
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuka template.')
    }
  }

  async function saveTemplateDraft() {
    if (!templateDraft || templateDraft.mode === 'view') return
    if (!access.canEdit) {
      toast.error('Role Anda tidak punya akses menyimpan template.')
      return
    }

    const payload = {
      title: templateDraft.title,
      description: templateDraft.description,
      items: templateDraft.items,
    }

    setIsSavingTemplate(true)
    try {
      if (templateDraft.mode === 'create') {
        await createChecklistTemplate(payload)
        toast.success('Template dibuat.')
      } else {
        if (!templateDraft.templateId) throw new Error('Template tidak ditemukan.')
        await updateChecklistTemplate({ templateId: templateDraft.templateId, ...payload })
        toast.success('Template diperbarui.')
      }
      setTemplateDraft(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan template.')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  async function removeTemplate(templateId: number) {
    if (!access.canDelete) {
      toast.error('Role Anda tidak punya akses hapus template.')
      return
    }
    if (!confirm('Hapus template ini? Template akan dinonaktifkan.')) return
    try {
      await deleteChecklistTemplate(templateId)
      toast.success('Template dinonaktifkan.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus template.')
    }
  }

  async function startChecklist(template: TemplateRow) {
    if (!access.canEdit) {
      toast.error('Role Anda tidak punya akses membuat checklist.')
      return
    }
    if (!area.trim()) {
      setAreaError('Wajib isi lokasi/area sebelum menggunakan template.')
      return
    }

    setIsStarting(true)
    try {
      const created = await createDailyChecklistFromTemplate({
        templateId: template.templateId,
        templateRevisionId: template.latestRevisionId,
        area: area.trim(),
      })
      const detail = await getChecklistTemplateRevisionDetail(template.latestRevisionId)
      const items = detail.items.map((item) => ({
        id: item.id,
        orderIndex: item.orderIndex,
        prompt: item.prompt,
        inputType: item.inputType as ChecklistInputType,
        isRequired: item.isRequired ?? true,
      }))

      setChecklist({
        checklistId: created.id,
        title: created.titleSnapshot,
        area: created.area,
        status: created.status,
        scorePercent: created.scorePercent ?? null,
        items,
        answers: Object.fromEntries(items.map((item) => [item.id, buildInitialAnswer(item)])),
      })
      setActiveTemplate(template)
      toast.success('Checklist dibuat. Mulai isi item.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat checklist.')
    } finally {
      setIsStarting(false)
    }
  }

  async function openHistoryChecklist(row: HistoryRow) {
    if (!access.canView) {
      toast.error('Role Anda tidak punya akses melihat checklist.')
      return
    }
    setIsLoadingHistory(true)
    try {
      const report = await getDailyChecklistReportData(row.id)
      const items = report.items.map((item) => ({
        id: item.id,
        orderIndex: item.orderIndex,
        prompt: item.prompt,
        inputType: item.inputType as ChecklistInputType,
        isRequired: item.isRequired ?? true,
      }))
      setArea(report.header.area)
      setActiveTemplate(null)
      setChecklist({
        checklistId: report.header.id,
        title: report.header.titleSnapshot,
        area: report.header.area,
        status: report.header.status,
        scorePercent: report.header.scorePercent ?? null,
        items,
        answers: Object.fromEntries(
          items.map((item) => [
            item.id,
            toChecklistAnswerState(item.inputType, report.items.find((entry) => entry.id === item.id)?.answer ?? null),
          ])
        ),
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuka checklist.')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  async function openChecklistReport(row: HistoryRow) {
    if (!access.canView) {
      toast.error('Role Anda tidak punya akses melihat riwayat checklist.')
      return
    }
    setIsLoadingHistory(true)
    try {
      const report = await getDailyChecklistReportData(row.id)
      setReportData(report)
      await logDailyChecklistAccess({ checklistId: row.id, event: 'viewed' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuka laporan.')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  async function removeChecklist(id: number) {
    if (!access.canDelete) {
      toast.error('Role Anda tidak punya akses hapus checklist.')
      return
    }
    if (!confirm('Hapus checklist harian ini? Data akan dinonaktifkan.')) return
    try {
      await deleteDailyChecklist(id)
      toast.success('Checklist dinonaktifkan.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus checklist.')
    }
  }

  async function renderReportCanvas() {
    const element = reportDocumentRef.current
    if (!element) return null

    const clone = element.cloneNode(true) as HTMLDivElement
    clone.style.position = 'fixed'
    clone.style.left = '0'
    clone.style.top = '-10000px'
    clone.style.width = '794px'
    clone.style.maxWidth = '794px'
    clone.style.zIndex = '-1'
    clone.style.pointerEvents = 'none'
    clone.style.backgroundColor = '#ffffff'
    document.body.appendChild(clone)

    const images = Array.from(clone.querySelectorAll('img'))
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve()
        return new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        })
      })
    )

    try {
      await document.fonts?.ready
      const { default: html2canvas } = await import('html2canvas-pro')
      return await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      })
    } finally {
      clone.remove()
    }
  }

  async function downloadReportPdf() {
    if (!reportData) return
    setIsDownloadingPdf(true)
    try {
      const canvas = await renderReportCanvas()
      if (!canvas) return

      const { default: jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pdfWidth) / canvas.width
      const imgData = canvas.toDataURL('image/png')
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
      heightLeft -= pdfHeight
      while (heightLeft > 0) {
        position -= pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      pdf.save(`Checklist_${reportData.header.id}_${new Date().toISOString().slice(0, 10)}.pdf`)
      await logDailyChecklistAccess({ checklistId: reportData.header.id, event: 'pdf_downloaded' })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  async function printReportPdf() {
    if (!reportData) return
    setIsPrintingPdf(true)
    try {
      const canvas = await renderReportCanvas()
      if (!canvas) return
      const imgData = canvas.toDataURL('image/png')
      const printWindow = window.open('', '_blank', 'width=900,height=1200')
      if (!printWindow) {
        alert('Popup diblokir. Izinkan popup untuk mencetak dokumen.')
        return
      }

      printWindow.document.write(`<!doctype html><html><head><title>Checklist_${reportData.header.id}</title><style>@page{size:A4;margin:10mm}html,body{margin:0;padding:0}img{display:block;width:100%;height:auto}</style></head><body><img src="${imgData}" /></body></html>`)
      printWindow.document.close()

      const triggerPrint = async () => {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
        await logDailyChecklistAccess({ checklistId: reportData.header.id, event: 'printed' })
      }

      const img = printWindow.document.querySelector('img')
      if (img && !img.complete) {
        img.addEventListener('load', () => void triggerPrint(), { once: true })
        img.addEventListener('error', () => void triggerPrint(), { once: true })
      } else {
        setTimeout(() => void triggerPrint(), 200)
      }
    } finally {
      setIsPrintingPdf(false)
    }
  }

  function updateAnswer(item: ChecklistItem, answer: ChecklistAnswerState) {
    setChecklist((current) => {
      if (!current) return current
      return { ...current, answers: { ...current.answers, [item.id]: answer } }
    })
  }

  function buildPayloadAnswers() {
    if (!checklist) return []

    return checklist.items.map((item) => {
      const answer = checklist.answers[item.id] ?? buildInitialAnswer(item)
      if (answer.inputType === 'yes_no_na') {
        return {
          revisionItemId: item.id,
          inputType: 'yes_no_na' as const,
          valueChoice: answer.valueChoice,
          attachments: answer.attachments,
        }
      }
      if (answer.inputType === 'scale_1_5') {
        return {
          revisionItemId: item.id,
          inputType: 'scale_1_5' as const,
          valueNumber: answer.valueNumber,
          attachments: answer.attachments,
        }
      }
      return {
        revisionItemId: item.id,
        inputType: 'free_text' as const,
        valueText: answer.valueText,
        attachments: answer.attachments,
      }
    })
  }

  async function saveChecklist(status: 'in_progress' | 'completed') {
    if (!checklist) return
    if (!access.canEdit) {
      toast.error('Role Anda tidak punya akses mengubah checklist.')
      return
    }
    setIsSaving(true)
    try {
      const result = await saveDailyChecklistAnswers({
        checklistId: checklist.checklistId,
        area: checklist.area,
        status,
        answers: buildPayloadAnswers(),
      })
      setChecklist((current) => current ? { ...current, status, scorePercent: result.scorePercent ?? null } : current)
      toast.success(status === 'completed' ? 'Checklist selesai.' : 'Checklist tersimpan.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan checklist.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpload(item: ChecklistItem, files: FileList | null) {
    if (!checklist || !files?.length) return
    setUploadingItemId(item.id)
    const toastId = toast.loading('Mengunggah foto...')
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        const result = await uploadFile(formData)
        if (result.success && result.url) uploadedUrls.push(result.readableUrl || result.url)
      }
      const answer = checklist.answers[item.id] ?? buildInitialAnswer(item)
      updateAnswer(item, { ...answer, attachments: [...answer.attachments, ...uploadedUrls] } as ChecklistAnswerState)
      toast.success('Foto ditambahkan.', { id: toastId })
    } catch {
      toast.error('Gagal mengunggah foto.', { id: toastId })
    } finally {
      setUploadingItemId(null)
    }
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200">Digital Checklist</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">Mobile Generator</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-blue-200">
              Pilih template, isi area, lalu jalankan checklist langsung dari HP.
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/10">
            <ClipboardCheck className="size-5 text-blue-200" />
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/10 px-3 py-3">
            <p className="text-xl font-bold text-white">{templates.length}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-blue-200">Template</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-3">
            <p className="text-xl font-bold text-white">{openCount}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-blue-200">Open</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-3">
            <p className="text-xl font-bold text-white">{completedCount}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-blue-200">Done</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 rounded-xl border border-gray-100 bg-white p-1">
        {([
          ['templates', 'Template'],
          ['history', 'Riwayat'],
          ['logs', 'Log'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveView(value)}
            className={cn(
              'h-9 rounded-lg text-xs font-medium',
              activeView === value ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600'
            )}
          >
            {label}
          </button>
        ))}
      </section>

      {templateDraft ? (
        <section className="space-y-4 rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Template Builder</p>
              <h2 className="mt-1 text-base font-semibold text-gray-900">
                {templateDraft.mode === 'create' ? 'Buat template' : templateDraft.mode === 'edit' ? 'Edit template' : 'Lihat template'}
              </h2>
            </div>
            <button type="button" onClick={() => setTemplateDraft(null)} className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400" aria-label="Tutup template builder">
              <X className="size-4" />
            </button>
          </div>

          <Label className="block space-y-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Nama Template</span>
            <Input
              value={templateDraft.title}
              disabled={templateDraft.mode === 'view'}
              onChange={(event) => setTemplateDraft((current) => current ? { ...current, title: event.target.value } : current)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900"
            />
          </Label>

          <Label className="block space-y-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Deskripsi</span>
            <Textarea
              value={templateDraft.description}
              disabled={templateDraft.mode === 'view'}
              onChange={(event) => setTemplateDraft((current) => current ? { ...current, description: event.target.value } : current)}
              className="min-h-[84px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900"
            />
          </Label>

          <div className="space-y-3">
            {templateDraft.items.map((item, index) => (
              <article key={index} className="space-y-3 rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Poin {index + 1}</span>
                  {templateDraft.mode !== 'view' && templateDraft.items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setTemplateDraft((current) => current ? { ...current, items: current.items.filter((_, i) => i !== index) } : current)}
                      className="text-orange-700"
                      aria-label="Hapus poin"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
                <Textarea
                  value={item.prompt}
                  disabled={templateDraft.mode === 'view'}
                  onChange={(event) => setTemplateDraft((current) => current ? { ...current, items: current.items.map((entry, i) => i === index ? { ...entry, prompt: event.target.value } : entry) } : current)}
                  placeholder="Pertanyaan / poin pemeriksaan"
                  className="min-h-[76px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900"
                />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select
                    value={item.inputType}
                    disabled={templateDraft.mode === 'view'}
                    onChange={(event) => setTemplateDraft((current) => current ? { ...current, items: current.items.map((entry, i) => i === index ? { ...entry, inputType: event.target.value as ChecklistInputType } : entry) } : current)}
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900"
                  >
                    <option value="yes_no_na">YES / NO / N/A</option>
                    <option value="scale_1_5">Skala 1-5</option>
                    <option value="free_text">Catatan Bebas</option>
                  </select>
                  <button
                    type="button"
                    disabled={templateDraft.mode === 'view'}
                    onClick={() => setTemplateDraft((current) => current ? { ...current, items: current.items.map((entry, i) => i === index ? { ...entry, isRequired: !entry.isRequired } : entry) } : current)}
                    className={cn('h-8 rounded-lg px-3 text-[10px] font-medium uppercase', item.isRequired ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-500')}
                  >
                    Wajib
                  </button>
                </div>
              </article>
            ))}
          </div>

          {templateDraft.mode !== 'view' ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setTemplateDraft((current) => current ? { ...current, items: [...current.items, { prompt: '', inputType: 'yes_no_na', isRequired: true }] } : current)}
              >
                <Plus className="size-4" />
                Tambah Poin
              </Button>
              <Button type="button" className="h-11 rounded-xl bg-blue-600 text-white" disabled={isSavingTemplate} onClick={() => void saveTemplateDraft()}>
                {isSavingTemplate ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Simpan
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {checklist ? (
        <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Active Checklist</p>
              <h2 className="mt-1 text-base font-semibold text-gray-900">{checklist.title}</h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="size-3.5" />
                {checklist.area} • {currentUserName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setChecklist(null)}
              className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400"
              aria-label="Tutup checklist aktif"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>{progress.done}/{progress.total} terisi</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>

          <div className="grid gap-3">
            {checklist.items.map((item, index) => {
              const answer = checklist.answers[item.id] ?? buildInitialAnswer(item)
              const isCompleted = checklist.status === 'completed'
              const canAnswer = access.canEdit && !isCompleted
              return (
                <article key={item.id} className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Item {index + 1}</p>
                      <h3 className="mt-1 text-sm font-semibold leading-5 text-gray-900">{item.prompt}</h3>
                    </div>
                    {item.isRequired ? (
                      <span className="rounded-md bg-white px-2.5 py-1 text-[10px] font-medium text-gray-500">Wajib</span>
                    ) : null}
                  </div>

                  {item.inputType === 'yes_no_na' && answer.inputType === 'yes_no_na' ? (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {(['yes', 'no', 'na'] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          disabled={!canAnswer}
                          onClick={() => updateAnswer(item, { ...answer, valueChoice: value })}
                          className={cn(
                            'h-11 rounded-xl text-sm font-medium uppercase',
                            answer.valueChoice === value ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-500'
                          )}
                        >
                          {value === 'na' ? 'N/A' : value}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {item.inputType === 'scale_1_5' && answer.inputType === 'scale_1_5' ? (
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          disabled={!canAnswer}
                          onClick={() => updateAnswer(item, { ...answer, valueNumber: value })}
                          className={cn(
                            'h-10 rounded-lg text-sm font-medium',
                            answer.valueNumber === value ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-500'
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {item.inputType === 'free_text' && answer.inputType === 'free_text' ? (
                    <Textarea
                      value={answer.valueText}
                      onChange={(event) => updateAnswer(item, { ...answer, valueText: event.target.value })}
                      disabled={!canAnswer}
                      placeholder="Tulis catatan kondisi / temuan..."
                      className="mt-4 min-h-[96px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900"
                    />
                  ) : null}

                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {answer.attachments.map((url, attachmentIndex) => (
                        <div key={`${url}-${attachmentIndex}`} className="relative size-16 overflow-hidden rounded-lg bg-white">
                          <img src={url} alt="Lampiran checklist" className="h-full w-full object-cover" />
                          {canAnswer ? (
                            <button
                              type="button"
                              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/55 text-white"
                              onClick={() => updateAnswer(item, { ...answer, attachments: answer.attachments.filter((_, i) => i !== attachmentIndex) } as ChecklistAnswerState)}
                              aria-label="Hapus foto"
                            >
                              <X className="size-3" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      {canAnswer ? (
                        <label className="flex size-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-500">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="hidden"
                            onChange={(event) => void handleUpload(item, event.target.files)}
                          />
                          {uploadingItemId === item.id ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                        </label>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="sticky bottom-20 z-[1] grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-white/95 p-2 backdrop-blur">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={!access.canEdit || isSaving || checklist.status === 'completed'}
              onClick={() => void saveChecklist('in_progress')}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Simpan
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl bg-blue-600 text-white"
              disabled={!access.canEdit || isSaving || checklist.status === 'completed'}
              onClick={() => void saveChecklist('completed')}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Selesai
            </Button>
          </div>
        </section>
      ) : activeView === 'templates' ? (
        <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Start Checklist</p>
              <h2 className="mt-1 text-base font-semibold text-gray-900">Pilih template inspeksi</h2>
            </div>
            {access.canEdit ? (
              <Button type="button" size="icon" className="size-10 rounded-xl bg-blue-600 text-white" onClick={openCreateTemplate}>
                <Plus className="size-4" />
              </Button>
            ) : null}
          </div>

          <Label className="block space-y-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Lokasi / Area <span className="text-orange-500">*</span></span>
            <Input
              value={area}
              onChange={(event) => { setArea(event.target.value); setAreaError('') }}
              placeholder="Contoh: Workshop tire bay"
              className={cn('h-11 rounded-xl border bg-white px-3 text-sm text-gray-900', areaError ? 'border-orange-400' : 'border-gray-200')}
            />
            {areaError ? <p className="text-xs text-orange-600 mt-1">{areaError}</p> : null}
          </Label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari template..."
              className="h-11 rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900"
            />
          </div>

          <div className="grid gap-3">
            {filteredTemplates.map((template) => (
              <article key={template.templateId} className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-blue-600">
                    <ClipboardList className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{template.templateTitle}</h3>
                    {template.templateDescription ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{template.templateDescription}</p>
                    ) : null}
                    <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      Rev {template.latestRevisionNumber} • {template.itemCount} poin
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-4 h-11 w-full rounded-xl bg-blue-600 text-white"
                  disabled={!access.canEdit || (isStarting && activeTemplate?.templateId === template.templateId)}
                  onClick={() => void startChecklist(template)}
                >
                  {isStarting && activeTemplate?.templateId === template.templateId ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Gunakan Template
                </Button>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => void openTemplate(template, 'view')}>
                    <Eye className="size-4" />
                  </Button>
                  {access.canEdit ? (
                    <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => void openTemplate(template, 'edit')}>
                      <Pencil className="size-4" />
                    </Button>
                  ) : null}
                  {access.canDelete ? (
                    <Button type="button" variant="outline" className="h-9 rounded-xl text-orange-700" onClick={() => void removeTemplate(template.templateId)}>
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
            {filteredTemplates.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-5 text-center text-sm font-medium text-gray-500">
                Template tidak ditemukan.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {reportData ? (
        <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Report Preview</p>
              <h2 className="mt-1 text-base font-semibold text-gray-900">{reportData.header.titleSnapshot}</h2>
              <p className="mt-1 text-xs text-gray-500">{reportData.header.area} • Score {reportData.header.scorePercent ?? '-'}</p>
            </div>
            <button type="button" onClick={() => setReportData(null)} className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400" aria-label="Tutup report">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={isDownloadingPdf || isPrintingPdf} onClick={() => void downloadReportPdf()}>
              {isDownloadingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              PDF
            </Button>
            <Button type="button" className="h-11 rounded-xl bg-blue-600 text-white" disabled={isDownloadingPdf || isPrintingPdf} onClick={() => void printReportPdf()}>
              {isPrintingPdf ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
              Cetak
            </Button>
          </div>

          <div ref={reportDocumentRef} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <img src="/cp_logo-removebg-preview.png" alt="Logo" className="h-9 w-auto object-contain" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">PT. CHITRA PARATAMA</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Official HSE System</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Score</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.header.scorePercent ?? 0}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 text-xs text-gray-500">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider">Lokasi</p>
                <p className="mt-1 text-gray-900">{reportData.header.area}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider">Status</p>
                <p className="mt-1 text-gray-900">{reportData.header.status}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider">Tanggal</p>
                <p className="mt-1 text-gray-900">{formatDate(reportData.header.completedAt ?? reportData.header.createdAt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider">PIC</p>
                <p className="mt-1 text-gray-900">{reportData.header.responsibleName ?? '-'}</p>
              </div>
            </div>

            <div className="grid gap-2 p-4">
            {reportData.items.map((item, index) => (
              <article key={item.id} className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Item {index + 1}</p>
                <h3 className="mt-1 text-sm font-semibold text-gray-900">{item.prompt}</h3>
                <p className="mt-2 text-xs text-gray-500">
                  {item.inputType === 'yes_no_na'
                    ? `Jawaban: ${item.answer?.valueChoice || '-'}`
                    : item.inputType === 'scale_1_5'
                      ? `Nilai: ${item.answer?.valueNumber ?? '-'}`
                      : item.answer?.valueText || '-'}
                </p>
                {item.answer?.attachments?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.answer.attachments.map((url, index) => (
                      <img key={`${url}-${index}`} src={url} alt="Lampiran laporan" className="size-16 rounded-lg object-cover" />
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            </div>

            <div className="grid grid-cols-2 gap-8 border-t border-gray-200 p-4 text-center">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Dilaporkan Oleh</p>
                <div className="h-10" />
                <p className="border-t border-gray-200 pt-2 text-xs font-semibold text-gray-900">{reportData.header.responsibleName ?? '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Diverifikasi Sistem</p>
                <div className="h-10" />
                <p className="border-t border-gray-200 pt-2 text-xs font-semibold text-blue-600">DIGITAL SIGNATURE</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeView === 'history' ? <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Riwayat</p>
            <h2 className="mt-1 text-base font-semibold text-gray-900">Checklist terbaru</h2>
          </div>
          {isLoadingHistory ? <Loader2 className="size-4 animate-spin text-gray-500" /> : null}
        </div>
        <div className="grid gap-3">
          {history.slice(0, 8).map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-gray-100 bg-white p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{row.titleSnapshot}</h3>
                  <p className="mt-1 text-xs text-gray-500">{row.area} • {formatDate(row.createdAt)}</p>
                </div>
                <span className={cn('rounded-md px-2.5 py-1 text-[10px] font-medium', row.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                  {row.status}
                </span>
              </div>
              <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Score {row.scorePercent ?? '-'} • PIC {row.responsibleName ?? '-'}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => void openHistoryChecklist(row)}>
                  <Pencil className="size-4" />
                </Button>
                <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => void openChecklistReport(row)}>
                  <FileText className="size-4" />
                </Button>
                {access.canDelete ? (
                  <Button type="button" variant="outline" className="h-9 rounded-xl text-orange-700" onClick={() => void removeChecklist(row.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
          {history.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-5 text-center text-sm font-medium text-gray-500">
              Belum ada riwayat checklist.
            </div>
          ) : null}
        </div>
      </section> : null}

      {activeView === 'logs' ? (
        <section className="space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Log Aktivitas</p>
            <h2 className="mt-1 text-base font-semibold text-gray-900">Audit checklist</h2>
          </div>
          <div className="grid gap-3">
            {auditLogs.slice(0, 25).map((log) => (
              <article key={log.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{log.action}</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{log.description}</p>
                  </div>
                  <span className="rounded-md bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-500">{log.severity}</span>
                </div>
                <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                  {formatDate(log.createdAt)} • {log.actorName ?? 'System'}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
