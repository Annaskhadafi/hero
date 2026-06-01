'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Eye, Pencil, Play, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { EnterpriseActionButtons } from '@/components/ui/enterprise-table-kit'
import { AdminImportDialog } from '@/components/admin/admin-import-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { TableMultiFilter } from '@/components/ui/table-multi-filter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  createChecklistTemplate,
  createDailyChecklistFromTemplate,
  deleteChecklistTemplate,
  deleteDailyChecklist,
  getChecklistTemplateRevisionDetail,
  getDailyChecklistReportData,
  importChecklistTemplates,
  updateChecklistTemplate,
} from '@/app/actions/hse-checklists'
import type { ChecklistInputType } from '@/app/actions/hse-checklists'
import { ChecklistTemplateBuilderDialog } from '@/components/hse-checklists/checklist-template-builder-dialog'
import { DailyChecklistRunDialog } from '@/components/hse-checklists/daily-checklist-run-dialog'
import { DailyChecklistReportDialog } from '@/components/hse-checklists/daily-checklist-report-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type TemplateRow = Awaited<
  ReturnType<typeof import('@/app/actions/hse-checklists').getChecklistTemplatesWithLatestRevision>
>[number]
type HistoryRow = Awaited<
  ReturnType<typeof import('@/app/actions/hse-checklists').getDailyChecklistHistory>
>[number]
type AuditLogRow = Awaited<
  ReturnType<typeof import('@/app/actions/hse-checklists').getChecklistAuditLogs>
>[number]

type LoadedTemplate = {
  templateId: number
  revisionId: number
  title: string
  description: string
  items: Array<{
    id: number
    orderIndex: number
    prompt: string
    inputType: ChecklistInputType
    isRequired: boolean
  }>
}

type LoadedChecklist = {
  checklistId: number
  title: string
  area: string
  status: string
  scorePercent: number | null
  items: Array<{
    id: number
    orderIndex: number
    prompt: string
    inputType: ChecklistInputType
    isRequired: boolean
  }>
  answers: Record<
    number,
    | { inputType: 'yes_no_na'; valueChoice: 'yes' | 'no' | 'na' | ''; attachments: string[] }
    | { inputType: 'scale_1_5'; valueNumber: number | null; attachments: string[] }
    | { inputType: 'free_text'; valueText: string; attachments: string[] }
  >
}

function toChecklistAnswerState(
  itemType: string,
  raw: { valueChoice: string; valueText: string; valueNumber: number | null; attachments?: string[] } | null
) {
  const attachments = raw?.attachments ?? []
  if (itemType === 'yes_no_na') {
    const value = (raw?.valueChoice ?? '') as 'yes' | 'no' | 'na' | ''
    return { inputType: 'yes_no_na' as const, valueChoice: value, attachments }
  }
  if (itemType === 'scale_1_5') {
    return { inputType: 'scale_1_5' as const, valueNumber: raw?.valueNumber ?? null, attachments }
  }
  return { inputType: 'free_text' as const, valueText: raw?.valueText ?? '', attachments }
}

export function ChecklistGeneratorClient({
  templates,
  history,
  auditLogs,
  currentUserName,
  areaOptions,
  statusOptions,
}: {
  templates: TemplateRow[]
  history: HistoryRow[]
  auditLogs: AuditLogRow[]
  currentUserName: string
  areaOptions: string[]
  statusOptions: string[]
}) {
  const router = useRouter()
  const access = { canView: true, canEdit: true, canDelete: true, canSelectAll: true }

  const [activeTab, setActiveTab] = React.useState<'templates' | 'history' | 'logs'>('templates')

  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [builderMode, setBuilderMode] = React.useState<'create' | 'edit' | 'view'>('create')
  const [builderTemplateId, setBuilderTemplateId] = React.useState<number | null>(null)
  const [builderInitial, setBuilderInitial] = React.useState<{
    title: string
    description: string
    items: Array<{ prompt: string; inputType: ChecklistInputType; isRequired: boolean }>
  } | null>(null)

  const [runOpen, setRunOpen] = React.useState(false)
  const [runChecklist, setRunChecklist] = React.useState<LoadedChecklist | null>(null)

  const [reportOpen, setReportOpen] = React.useState(false)
  const [reportData, setReportData] = React.useState<Awaited<
    ReturnType<typeof getDailyChecklistReportData>
  > | null>(null)

  const [startOpen, setStartOpen] = React.useState(false)
  const [startTemplate, setStartTemplate] = React.useState<TemplateRow | null>(null)
  const [startArea, setStartArea] = React.useState('')

  const openCreateTemplate = () => {
    setBuilderMode('create')
    setBuilderTemplateId(null)
    setBuilderInitial({
      title: '',
      description: '',
      items: [{ prompt: '', inputType: 'yes_no_na', isRequired: true }],
    })
    setBuilderOpen(true)
  }

  const openViewOrEditTemplate = async (row: TemplateRow, mode: 'view' | 'edit') => {
    const detail = await getChecklistTemplateRevisionDetail(row.latestRevisionId)
    setBuilderMode(mode)
    setBuilderTemplateId(row.templateId)
    setBuilderInitial({
      title: detail.revision.title,
      description: detail.revision.description ?? '',
      items: detail.items.map((item) => ({
        prompt: item.prompt,
        inputType: item.inputType as ChecklistInputType,
        isRequired: item.isRequired ?? true,
      })),
    })
    setBuilderOpen(true)
  }

  const handleSubmitTemplate = async (payload: {
    title: string
    description: string
    items: Array<{ prompt: string; inputType: ChecklistInputType; isRequired: boolean }>
  }) => {
    try {
      if (builderMode === 'create') {
        await createChecklistTemplate(payload)
        toast.success('Template berhasil dibuat dan tersimpan.')
      } else {
        if (!builderTemplateId) {
          throw new Error('Template tidak ditemukan.')
        }
        await updateChecklistTemplate({ templateId: builderTemplateId, ...payload })
        toast.success('Template berhasil diperbarui.')
      }
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan template.')
      throw error
    }
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Hapus template ini? Template akan dinonaktifkan dan tidak bisa dipakai lagi.'))
      return
    try {
      await deleteChecklistTemplate(templateId)
      toast.success('Template berhasil dinonaktifkan.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus template.')
    }
  }

  const openStartChecklist = (row: TemplateRow) => {
    setStartTemplate(row)
    setStartArea('')
    setStartOpen(true)
  }

  const startChecklist = async () => {
    if (!startTemplate) return
    if (!startArea.trim()) return

    try {
      const created = await createDailyChecklistFromTemplate({
        templateId: startTemplate.templateId,
        templateRevisionId: startTemplate.latestRevisionId,
        area: startArea.trim(),
      })

      const detail = await getChecklistTemplateRevisionDetail(startTemplate.latestRevisionId)
      const items: LoadedTemplate['items'] = detail.items.map((item) => ({
        id: item.id,
        orderIndex: item.orderIndex,
        prompt: item.prompt,
        inputType: item.inputType as ChecklistInputType,
        isRequired: item.isRequired ?? true,
      }))

      setRunChecklist({
        checklistId: created.id,
        title: created.titleSnapshot,
        area: created.area,
        status: created.status,
        scorePercent: created.scorePercent ?? null,
        items,
        answers: Object.fromEntries(
          items.map((item) => [item.id, toChecklistAnswerState(item.inputType, null)])
        ),
      })
      setRunOpen(true)
      setActiveTab('history')
      setStartOpen(false)
      toast.success('Checklist harian berhasil dibuat.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat checklist harian.')
    }
  }

  const openEditChecklist = async (row: HistoryRow) => {
    try {
      const report = await getDailyChecklistReportData(row.id)
      const items = report.items.map((item) => ({
        id: item.id,
        orderIndex: item.orderIndex,
        prompt: item.prompt,
        inputType: item.inputType as ChecklistInputType,
        isRequired: item.isRequired ?? true,
      }))
      const answers = Object.fromEntries(
        items.map((item) => [
          item.id,
          toChecklistAnswerState(
            item.inputType,
            report.items.find((x) => x.id === item.id)?.answer ?? null
          ),
        ])
      )

      setRunChecklist({
        checklistId: report.header.id,
        title: report.header.titleSnapshot,
        area: report.header.area,
        status: report.header.status,
        scorePercent: report.header.scorePercent ?? null,
        items,
        answers,
      })
      setRunOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat checklist.')
    }
  }

  const openChecklistReport = async (row: HistoryRow) => {
    try {
      const report = await getDailyChecklistReportData(row.id)
      setReportData(report)
      setReportOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat laporan.')
    }
  }

  const handleDeleteChecklist = async (id: number) => {
    if (!confirm('Hapus checklist harian ini? Data akan dinonaktifkan.')) return
    try {
      await deleteDailyChecklist(id)
      toast.success('Checklist berhasil dinonaktifkan.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus checklist.')
    }
  }

  const TemplateImport = (
    <AdminImportDialog
      title="Import Template Checklist"
      description="Format: setiap baris adalah 1 poin checklist. Kolom wajib: template_title, item_prompt, item_type."
      fields={[
        { key: 'template_title', label: 'Template Title', required: true },
        { key: 'template_description', label: 'Template Description' },
        { key: 'item_prompt', label: 'Item Prompt', required: true },
        { key: 'item_type', label: 'Item Type (yes_no_na|scale_1_5|free_text)', required: true },
        { key: 'item_order', label: 'Item Order' },
      ]}
      onConfirm={async (payload) => {
        try {
          const headerIndex = new Map(payload.headers.map((header, index) => [header, index]))
          const getCell = (row: string[], key: string) => {
            const mappedHeader = payload.mapping[key]
            if (!mappedHeader) return ''
            const index = headerIndex.get(mappedHeader)
            if (index == null) return ''
            return row[index] ?? ''
          }

          const parsedRows = payload.rows.map((row) => ({
            templateTitle: getCell(row, 'template_title'),
            templateDescription: getCell(row, 'template_description'),
            itemPrompt: getCell(row, 'item_prompt'),
            itemType: getCell(row, 'item_type'),
            itemOrder: (() => {
              const raw = getCell(row, 'item_order').trim()
              if (!raw) return null
              const parsed = Number(raw)
              return Number.isFinite(parsed) ? parsed : null
            })(),
          }))

          await importChecklistTemplates({ rows: parsedRows })
          toast.success('Import template checklist berhasil.')
          router.refresh()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Gagal mengimpor template.')
        }
      }}
    />
  )

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'templates' | 'history' | 'logs')}
        className="space-y-4"
      >
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="templates">Template Form</TabsTrigger>
          <TabsTrigger value="history">Riwayat Inspeksi</TabsTrigger>
          <TabsTrigger value="logs">Log Aktivitas</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <MinimalTableShell
            label="template"
            fileName="checklist-templates"
            searchPlaceholder="Cari template..."
            showImport
            importAction={TemplateImport}
            access={access}
            primaryAction={
              <Button type="button" size="dense" onClick={openCreateTemplate}>
                + Buat Template Baru
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Template</TableHead>
                  <TableHead>Jumlah Poin</TableHead>
                  <TableHead>Dibuat Pada</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                      Belum ada template checklist.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((row) => (
                    <TableRow
                      key={row.templateId}
                      data-date-value={new Date(row.latestRevisionCreatedAt).toISOString()}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-foreground font-semibold">{row.templateTitle}</div>
                          {row.templateDescription ? (
                            <div className="text-muted-foreground text-xs">
                              {row.templateDescription}
                            </div>
                          ) : null}
                          <div className="text-muted-foreground text-[11px]">
                            Rev {row.latestRevisionNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {row.itemCount} points
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(row.latestRevisionCreatedAt), 'd/M/yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="dense"
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => openStartChecklist(row)}
                          >
                            <Play className="size-4" />
                            Gunakan Form
                          </Button>
                          <EnterpriseActionButtons
                            access={access}
                            onView={() => void openViewOrEditTemplate(row, 'view')}
                            onEdit={() => void openViewOrEditTemplate(row, 'edit')}
                            onDelete={() => void handleDeleteTemplate(row.templateId)}
                            labels={{
                              view: 'Lihat template',
                              edit: 'Edit template',
                              delete: 'Hapus template',
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <MinimalTableShell
            label="riwayat"
            fileName="daily-checklist-history"
            searchPlaceholder="Cari inspeksi..."
            dateFilter
            showImport={false}
            access={access}
            filters={
              <>
                <TableMultiFilter
                  label="status"
                  filterKey="status"
                  options={statusOptions.map((option) => ({ value: option, label: option }))}
                />
                <TableMultiFilter
                  label="area"
                  filterKey="area"
                  options={areaOptions.map((option) => ({ value: option, label: option }))}
                />
              </>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspeksi</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                      Belum ada riwayat checklist.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((row) => (
                    <TableRow
                      key={row.id}
                      data-date-value={(row.completedAt ?? row.createdAt).toISOString()}
                      data-filter-status={row.status}
                      data-filter-area={row.area}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-foreground font-semibold">{row.titleSnapshot}</div>
                          <div className="text-muted-foreground text-xs">
                            {row.responsibleName ?? currentUserName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{row.area}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full">
                          {row.scorePercent ?? 0}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(row.completedAt ?? row.createdAt, 'd/M/yyyy, HH.mm.ss')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="denseIcon"
                            onClick={() => void openChecklistReport(row)}
                            aria-label="Preview laporan"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="denseIcon"
                            onClick={() => void openEditChecklist(row)}
                            aria-label="Edit checklist"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="denseIcon"
                            onClick={() => void handleDeleteChecklist(row.id)}
                            aria-label="Hapus checklist"
                          >
                            <Trash2 className="text-destructive size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <MinimalTableShell
            label="log"
            fileName="checklist-activity-logs"
            searchPlaceholder="Cari aktivitas..."
            dateFilter
            showImport={false}
            access={access}
            filters={
              <>
                <TableMultiFilter
                  label="entitas"
                  filterKey="entityType"
                  options={Array.from(new Set(auditLogs.map((row) => row.entityType)))
                    .sort()
                    .map((option) => ({ value: option, label: option }))}
                />
                <TableMultiFilter
                  label="severity"
                  filterKey="severity"
                  options={Array.from(new Set(auditLogs.map((row) => row.severity)))
                    .sort()
                    .map((option) => ({ value: option, label: option }))}
                />
              </>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Entitas</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Risiko</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                      Belum ada log aktivitas.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((row) => (
                    <TableRow
                      key={row.id}
                      data-date-value={row.createdAt.toISOString()}
                      data-filter-entity-type={row.entityType}
                      data-filter-severity={row.severity}
                    >
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full">
                          {row.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.entityType}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.actorName ?? 'System'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {row.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(row.createdAt, 'd/M/yyyy, HH.mm.ss')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>
      </Tabs>

      <ChecklistTemplateBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        access={access}
        mode={builderMode}
        initialTitle={builderInitial?.title}
        initialDescription={builderInitial?.description}
        initialItems={builderInitial?.items}
        onSubmit={handleSubmitTemplate}
      />

      {runChecklist ? (
        <DailyChecklistRunDialog
          open={runOpen}
          onOpenChange={setRunOpen}
          access={access}
          checklistId={runChecklist.checklistId}
          title={runChecklist.title}
          area={runChecklist.area}
          status={runChecklist.status}
          scorePercent={runChecklist.scorePercent}
          items={runChecklist.items}
          initialAnswers={runChecklist.answers}
          responsibleName={currentUserName}
          onAfterSave={() => router.refresh()}
        />
      ) : null}

      <DailyChecklistReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        report={reportData}
      />

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mulai Checklist</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <div className="text-foreground text-sm font-medium">
              {startTemplate?.templateTitle ?? '-'}
            </div>
            <Input
              value={startArea}
              onChange={(event) => setStartArea(event.target.value)}
              placeholder="Lokasi / area inspeksi..."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={() => setStartOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="dense"
              onClick={() => void startChecklist()}
              disabled={!startArea.trim()}
            >
              Mulai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
