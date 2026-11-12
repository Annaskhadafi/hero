'use client'

import * as React from 'react'
import { Edit2, ImagePlus, Layers, Plus, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteTwibbonTemplateAction } from '@/app/actions/twibbon'
import { HeroConfirmDialog, HeroEmptyState } from '@/components/templates'
import { TwibbonMergeStudio } from '@/components/twibbon/twibbon-merge-studio'
import { TwibbonTemplateFormDialog } from '@/components/twibbon/twibbon-template-form-dialog'
import { Button } from '@/components/ui/button'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { getAvailableRatios, type TwibbonTemplateDTO } from '@/lib/twibbon'
import { cn } from '@/lib/utils'

interface MobileTwibbonViewProps {
  initialTemplates: TwibbonTemplateDTO[]
  initialSelectedSlug?: string | null
}

export function MobileTwibbonView({
  initialTemplates,
  initialSelectedSlug,
}: MobileTwibbonViewProps) {
  const [templates, setTemplates] = React.useState<TwibbonTemplateDTO[]>(initialTemplates)
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
  const [deleteTarget, setDeleteTarget] = React.useState<TwibbonTemplateDTO | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [mode, setMode] = React.useState<'studio' | 'my-templates'>('studio')

  const activeTemplates = React.useMemo(
    () => templates.filter((t) => t.status === 'active'),
    [templates]
  )

  const manageableTemplates = React.useMemo(
    () => templates.filter((t) => t.canManage),
    [templates]
  )

  const selectedTemplate = React.useMemo(
    () => templates.find((t) => t.id === selectedId) ?? activeTemplates[0] ?? null,
    [templates, selectedId, activeTemplates]
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
    setMode('studio')
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
      if (selectedId === deleteTarget.id) setSelectedId(null)
      toast.success('Template berhasil dihapus.')
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUsageIncremented = (templateId: number) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, usageCount: (t.usageCount || 0) + 1 } : t))
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Mobile Header Hero Card */}
      <section className="rounded-2xl bg-gradient-to-br from-[#003461] via-[#0753e7] to-[#0ea5e9] p-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-200">
              HERO &bull; TWIBBON STUDIO
            </p>
            <h1 className="mt-1 text-lg font-extrabold tracking-tight">
              Twibbon Foto &amp; Video IG
            </h1>
            <p className="mt-0.5 text-xs text-sky-100/90">
              Upload foto/video Anda untuk otomatis digabung dengan frame IG (1:1, 4:5, 9:16).
            </p>
          </div>
          <Button
            type="button"
            size="dense"
            onClick={() => {
              setEditingTemplate(null)
              setFormOpen(true)
            }}
            className="h-9 shrink-0 gap-1 rounded-xl bg-white px-3 text-xs font-bold text-[#003461] hover:bg-sky-50"
          >
            <Plus className="size-3.5" />
            <span>Buat PNG</span>
          </Button>
        </div>

        {/* Mode Switcher */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-white/15 p-1">
          <button
            type="button"
            onClick={() => setMode('studio')}
            className={cn(
              'flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors',
              mode === 'studio' ? 'bg-white text-[#003461]' : 'text-white/90 hover:bg-white/10'
            )}
          >
            <Sparkles className="size-3.5" />
            <span>Pakai Twibbon</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('my-templates')}
            className={cn(
              'flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors',
              mode === 'my-templates' ? 'bg-white text-[#003461]' : 'text-white/90 hover:bg-white/10'
            )}
          >
            <Layers className="size-3.5" />
            <span>Template Saya ({manageableTemplates.length})</span>
          </button>
        </div>
      </section>

      {mode === 'studio' ? (
        activeTemplates.length === 0 ? (
          <HeroEmptyState
            icon={<ImagePlus className="size-8 text-blue-600" />}
            title="Belum ada template Twibbon"
            description="Jadilah yang pertama mengunggah frame PNG Twibbon untuk dipakai seluruh tim."
            actionLabel="Buat Template PNG"
            onAction={() => {
              setEditingTemplate(null)
              setFormOpen(true)
            }}
          />
        ) : (
          <div className="space-y-4">
            {/* Horizontal Template Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Pilih Campaign ({activeTemplates.length})
                </span>
                <span className="text-[11px] text-slate-400">Geser ke samping</span>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
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
                        'flex w-52 shrink-0 items-center gap-2.5 rounded-xl border bg-white p-2.5 text-left transition-all',
                        isSelected
                          ? 'border-[#0753e7] ring-2 ring-[#0753e7]/20 bg-blue-50/40'
                          : 'border-slate-200'
                      )}
                    >
                      <div
                        className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200"
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
                          <ImagePlus className="size-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">{item.title}</p>
                        <p className="truncate text-[10px] text-slate-500">
                          {item.usageCount}× dipakai
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {ratios.map((r) => (
                            <span
                              key={r}
                              className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-700"
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

            {/* Mobile Merge Studio */}
            <TwibbonMergeStudio
              template={selectedTemplate}
              compact
              onUsageIncremented={handleUsageIncremented}
            />
          </div>
        )
      ) : (
        <div className="space-y-3">
          {manageableTemplates.length === 0 ? (
            <HeroEmptyState
              icon={<Layers className="size-8 text-slate-400" />}
              title="Anda belum membuat template"
              description="Buat template PNG dengan latar transparan agar bisa dipakai seluruh karyawan."
              actionLabel="Upload Template PNG"
              onAction={() => {
                setEditingTemplate(null)
                setFormOpen(true)
              }}
            />
          ) : (
            manageableTemplates.map((item) => {
              const previewUrl = item.squareUrl || item.portraitUrl || item.storyUrl
              const ratios = getAvailableRatios(item)

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200"
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
                        <ImagePlus className="size-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {ratios.join(' • ')} &bull; {item.usageCount}×
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="dense"
                      className="h-9 w-9 p-0"
                      onClick={() => {
                        setEditingTemplate(item)
                        setFormOpen(true)
                      }}
                    >
                      <Edit2 className="size-3.5 text-amber-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="dense"
                      className="h-9 w-9 p-0"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="size-3.5 text-rose-600" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      <TwibbonTemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialTemplate={editingTemplate}
        onSaved={handleSavedTemplate}
      />

      <HeroConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Hapus Template Twibbon"
        description={
          <>
            Yakin menghapus template <strong>{deleteTarget?.title}</strong>?
          </>
        }
        confirmLabel="Hapus"
        tone="destructive"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
