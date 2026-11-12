'use client'

import * as React from 'react'
import {
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  ImagePlus,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteTwibbonTemplateAction,
  toggleTwibbonTemplateStatusAction,
} from '@/app/actions/twibbon'
import { AdminPageShell } from '@/components/admin-page-shell'
import {
  HeroConfirmDialog,
  HeroDataTable,
  HeroDetailModal,
  HeroEmptyState,
  HeroKpiCard,
  HeroStatusBadge,
  type HeroColumnDef,
  type HeroTableFilter,
} from '@/components/templates'
import { TwibbonMergeStudio } from '@/components/twibbon/twibbon-merge-studio'
import { TwibbonTemplateFormDialog } from '@/components/twibbon/twibbon-template-form-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import {
  getAvailableRatios,
  TWIBBON_ASPECT_RATIOS,
  TWIBBON_CATEGORY_OPTIONS,
  type TwibbonTemplateDTO,
} from '@/lib/twibbon'
import { cn } from '@/lib/utils'

interface TwibbonDesktopClientProps {
  initialTemplates: TwibbonTemplateDTO[]
  initialSelectedSlug?: string | null
}

export function TwibbonDesktopClient({
  initialTemplates,
  initialSelectedSlug,
}: TwibbonDesktopClientProps) {
  const [templates, setTemplates] = React.useState<TwibbonTemplateDTO[]>(initialTemplates)
  const [activeTab, setActiveTab] = React.useState<'studio' | 'manage'>('studio')
  const [selectedId, setSelectedId] = React.useState<number | null>(() => {
    if (initialSelectedSlug) {
      const matched = initialTemplates.find((t) => t.slug === initialSelectedSlug)
      if (matched) return matched.id
    }
    const firstActive = initialTemplates.find((t) => t.status === 'active')
    return firstActive?.id ?? initialTemplates[0]?.id ?? null
  })

  const [formOpen, setFormOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<TwibbonTemplateDTO | null>(null)
  const [detailTemplate, setDetailTemplate] = React.useState<TwibbonTemplateDTO | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<TwibbonTemplateDTO | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const activeTemplates = React.useMemo(
    () => templates.filter((t) => t.status === 'active'),
    [templates]
  )

  const selectedTemplate = React.useMemo(
    () => templates.find((t) => t.id === selectedId) ?? activeTemplates[0] ?? null,
    [templates, selectedId, activeTemplates]
  )

  const totalUsage = React.useMemo(
    () => templates.reduce((acc, t) => acc + Number(t.usageCount || 0), 0),
    [templates]
  )

  const multiRatioCount = React.useMemo(
    () => templates.filter((t) => getAvailableRatios(t).length >= 2).length,
    [templates]
  )

  const handleSavedTemplate = (saved: TwibbonTemplateDTO) => {
    setTemplates((prev) => {
      const exists = prev.some((item) => item.id === saved.id)
      if (exists) {
        return prev.map((item) => (item.id === saved.id ? saved : item))
      }
      return [saved, ...prev]
    })
    setSelectedId(saved.id)
  }

  const handleInlineStatusChange = async (
    row: TwibbonTemplateDTO,
    nextStatus: 'active' | 'inactive'
  ) => {
    const res = await toggleTwibbonTemplateStatusAction(row.id, nextStatus)
    if (!res.success || !res.data) {
      toast.error(res.error || 'Gagal memperbarui status template.')
      return
    }
    setTemplates((prev) => prev.map((item) => (item.id === row.id ? res.data! : item)))
    toast.success(`Status template "${row.title}" diperbarui.`)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await deleteTwibbonTemplateAction(deleteTarget.id)
      if (!res.success) {
        toast.error(res.error || 'Gagal menghapus template.')
        return
      }
      setTemplates((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      if (selectedId === deleteTarget.id) {
        setSelectedId(null)
      }
      toast.success('Template Twibbon berhasil dihapus.')
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopyShareLink = async (row: TwibbonTemplateDTO) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const mobileLink = `${origin}/mobile/twibbon?template=${encodeURIComponent(row.slug)}`
    try {
      await navigator.clipboard.writeText(mobileLink)
      toast.success('Link Mobile Twibbon disalin ke clipboard!')
    } catch {
      toast.error('Gagal menyalin link.')
    }
  }

  const handleUsageIncremented = (templateId: number) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, usageCount: (t.usageCount || 0) + 1 } : t))
    )
  }

  const columns: HeroColumnDef<TwibbonTemplateDTO>[] = [
    {
      key: 'title',
      header: 'Campaign Template',
      sortable: true,
      render: (row) => {
        const previewSrc = row.squareUrl || row.portraitUrl || row.storyUrl
        return (
          <div className="flex items-center gap-3 min-w-[180px] max-w-[260px]">
            <div
              className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                backgroundSize: '10px 10px',
              }}
            >
              {previewSrc ? (
                <img
                  src={resolveUploadUrl(previewSrc)}
                  alt={row.title}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImagePlus className="size-4 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{row.title}</p>
              <p className="truncate text-[11px] text-slate-500">
                {row.description || 'Tanpa deskripsi'}
              </p>
            </div>
          </div>
        )
      },
      exportValue: (row) => row.title,
    },
    {
      key: 'category',
      header: 'Kategori',
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="font-medium text-slate-700">
          {row.category}
        </Badge>
      ),
      exportValue: (row) => row.category,
    },
    {
      key: 'ratios',
      header: 'Ukuran IG',
      render: (row) => {
        const ratios = getAvailableRatios(row)
        return (
          <div className="flex items-center gap-1 whitespace-nowrap">
            {ratios.map((r) => (
              <span
                key={r}
                className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/70"
              >
                {r}
              </span>
            ))}
          </div>
        )
      },
      exportValue: (row) => getAvailableRatios(row).join(', '),
    },
    {
      key: 'usageCount',
      header: 'Pemakaian',
      sortable: true,
      align: 'center',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {row.usageCount}×
        </span>
      ),
      exportValue: (row) => row.usageCount,
    },
    {
      key: 'createdByName',
      header: 'Pembuat',
      sortable: true,
      render: (row) => <span className="text-xs text-slate-700">{row.createdByName}</span>,
      exportValue: (row) => row.createdByName,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <HeroStatusBadge
          status={row.status}
          editable={row.canManage}
          options={[
            { value: 'active', label: 'Aktif' },
            { value: 'inactive', label: 'Nonaktif' },
          ]}
          onChange={(val) =>
            handleInlineStatusChange(row, val === 'inactive' ? 'inactive' : 'active')
          }
        />
      ),
      exportValue: (row) => row.status,
    },
  ]

  const filters: HeroTableFilter[] = [
    {
      key: 'category',
      title: 'Kategori',
      options: TWIBBON_CATEGORY_OPTIONS,
      isMulti: true,
    },
    {
      key: 'status',
      title: 'Status',
      options: [
        { value: 'active', label: 'Aktif' },
        { value: 'inactive', label: 'Nonaktif' },
      ],
    },
  ]

  return (
    <AdminPageShell
      title="Twibbon Studio"
      actions={
        <Button
          type="button"
          size="dense"
          className="h-9 gap-1.5 bg-[#0753e7] text-white hover:bg-[#0645c2]"
          onClick={() => {
            setEditingTemplate(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          <span>Buat Template Twibbon</span>
        </Button>
      }
    >
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroKpiCard
          title="Total Template"
          value={templates.length}
          tone="blue"
          icon={<Layers className="size-5" />}
          watermarkIcon={<Layers className="size-16" />}
          description="Campaign frame PNG tersimpan"
        />
        <HeroKpiCard
          title="Template Aktif"
          value={activeTemplates.length}
          tone="emerald"
          icon={<CheckCircle2 className="size-5" />}
          watermarkIcon={<CheckCircle2 className="size-16" />}
          description="Siap pakai di Desktop & Mobile"
        />
        <HeroKpiCard
          title="Total Pemakaian"
          value={totalUsage}
          tone="purple"
          icon={<TrendingUp className="size-5" />}
          watermarkIcon={<TrendingUp className="size-16" />}
          description="Foto & video berhasil di-merge"
        />
        <HeroKpiCard
          title="Multi-Format IG"
          value={multiRatioCount}
          tone="amber"
          icon={<Sparkles className="size-5" />}
          watermarkIcon={<Sparkles className="size-16" />}
          description="Mendukung 2–3 rasio Instagram"
        />
      </div>

      {/* Main Tabs: Use Studio vs Manage Templates */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v === 'manage' ? 'manage' : 'studio')}
        className="space-y-4"
      >
        <TabsList className="h-10 bg-slate-100 p-1">
          <TabsTrigger value="studio" className="h-8 gap-1.5 px-4 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>Gunakan Twibbon</span>
          </TabsTrigger>
          <TabsTrigger value="manage" className="h-8 gap-1.5 px-4 text-xs font-semibold">
            <Layers className="size-3.5" />
            <span>Kelola Template ({templates.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="space-y-4 m-0">
          {activeTemplates.length === 0 ? (
            <HeroEmptyState
              icon={<ImagePlus className="size-8 text-blue-600" />}
              title="Belum ada template Twibbon aktif"
              description="Buat template PNG pertama untuk ukuran Square (1:1), Portrait (4:5), atau Story/Reels (9:16)."
              actionLabel="Buat Template Twibbon"
              onAction={() => {
                setEditingTemplate(null)
                setFormOpen(true)
              }}
            />
          ) : (
            <div className="space-y-4">
              {/* Template Horizontal Picker */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Pilih Campaign Twibbon ({activeTemplates.length})
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    Klik kartu untuk mengganti frame
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {activeTemplates.map((item) => {
                    const isSelected = selectedTemplate?.id === item.id
                    const previewUrl = item.squareUrl || item.portraitUrl || item.storyUrl
                    const ratios = getAvailableRatios(item)

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all',
                          isSelected
                            ? 'border-[#0753e7] bg-blue-50/50 ring-2 ring-[#0753e7]/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        )}
                      >
                        <div
                          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200"
                          style={{
                            backgroundImage:
                              'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                            backgroundSize: '10px 10px',
                          }}
                        >
                          {previewUrl ? (
                            <img
                              src={resolveUploadUrl(previewUrl)}
                              alt={item.title}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <ImagePlus className="size-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-900">{item.title}</p>
                          <p className="truncate text-[11px] text-slate-500">
                            {item.category} &bull; {item.usageCount}× dipakai
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {ratios.map((r) => (
                              <span
                                key={r}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Merge Studio */}
              <TwibbonMergeStudio
                template={selectedTemplate}
                onUsageIncremented={handleUsageIncremented}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="manage" className="m-0 min-w-0 overflow-hidden">
          <HeroDataTable
            data={templates}
            columns={columns}
            idField="id"
            searchPlaceholder="Cari judul, kategori, pembuat..."
            searchKeys={['title', 'category', 'createdByName', 'description']}
            filters={filters}
            exportFileName="twibbon-templates"
            pdfTitle="Daftar Template Twibbon Studio HERO"
            showSelection={false}
            emptyTitle="Belum ada template Twibbon"
            emptyDescription="Klik Buat Template Twibbon untuk mengunggah frame PNG pertama."
            renderRowActions={(row) => (
              <TooltipProvider delayDuration={150}>
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="dense"
                        className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedId(row.id)
                          setActiveTab('studio')
                        }}
                      >
                        <Sparkles className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Gunakan di Studio</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="dense"
                        className="h-9 w-9 p-0 text-slate-600 hover:bg-slate-100"
                        onClick={() => setDetailTemplate(row)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Preview Template</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="dense"
                        className="h-9 w-9 p-0 text-slate-600 hover:bg-slate-100"
                        onClick={() => handleCopyShareLink(row)}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Salin Link Mobile</TooltipContent>
                  </Tooltip>

                  {row.canManage && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="dense"
                            className="h-9 w-9 p-0 text-amber-600 hover:bg-amber-50"
                            onClick={() => {
                              setEditingTemplate(row)
                              setFormOpen(true)
                            }}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Template</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="dense"
                            className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Hapus Template</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              </TooltipProvider>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Create / Edit Template Dialog */}
      <TwibbonTemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialTemplate={editingTemplate}
        onSaved={handleSavedTemplate}
      />

      {/* Detail Preview Modal */}
      <HeroDetailModal
        open={Boolean(detailTemplate)}
        onOpenChange={(open) => {
          if (!open) setDetailTemplate(null)
        }}
        title={detailTemplate?.title || 'Detail Template'}
        subtitle={
          detailTemplate
            ? `Slug: ${detailTemplate.slug} • Pembuat: ${detailTemplate.createdByName}`
            : undefined
        }
        statusBadge={
          detailTemplate ? <HeroStatusBadge status={detailTemplate.status} /> : undefined
        }
        onEdit={
          detailTemplate?.canManage
            ? () => {
                const target = detailTemplate
                setDetailTemplate(null)
                setEditingTemplate(target)
                setFormOpen(true)
              }
            : undefined
        }
        actions={
          detailTemplate ? (
            <Button
              type="button"
              size="dense"
              className="h-9 gap-1.5 bg-[#0753e7] text-white hover:bg-[#0645c2]"
              onClick={() => {
                setSelectedId(detailTemplate.id)
                setDetailTemplate(null)
                setActiveTab('studio')
              }}
            >
              <Sparkles className="size-3.5" />
              <span>Pakai di Studio</span>
            </Button>
          ) : undefined
        }
      >
        {detailTemplate && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(['1:1', '4:5', '9:16'] as const).map((ratio) => {
                const spec = TWIBBON_ASPECT_RATIOS[ratio]
                const url = detailTemplate[spec.field]
                return (
                  <div
                    key={ratio}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>{spec.label}</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        {spec.width}×{spec.height}
                      </span>
                    </div>
                    <div
                      className="flex h-48 items-center justify-center overflow-hidden rounded-lg border border-slate-200"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                        backgroundSize: '14px 14px',
                      }}
                    >
                      {url ? (
                        <img
                          src={resolveUploadUrl(url)}
                          alt={`${detailTemplate.title} ${ratio}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">Tidak tersedia</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {detailTemplate.description && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Deskripsi Campaign
                </p>
                <p className="mt-1 text-sm text-slate-800">{detailTemplate.description}</p>
              </div>
            )}

            {detailTemplate.captionText && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Caption Instagram
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-800">
                  {detailTemplate.captionText}
                </p>
              </div>
            )}
          </div>
        )}
      </HeroDetailModal>

      {/* Delete Confirm Dialog */}
      <HeroConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Hapus Template Twibbon"
        description={
          <>
            Apakah Anda yakin ingin menghapus template{' '}
            <strong className="text-slate-900">{deleteTarget?.title}</strong>? Tindakan ini tidak
            dapat dibatalkan.
          </>
        }
        confirmLabel="Hapus Permanen"
        tone="destructive"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </AdminPageShell>
  )
}
