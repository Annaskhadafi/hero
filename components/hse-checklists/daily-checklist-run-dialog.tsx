'use client'

import * as React from 'react'
import { CheckCircle2, Camera, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import type { ChecklistInputType } from '@/app/actions/hse-checklists'
import { saveDailyChecklistAnswers } from '@/app/actions/hse-checklists'
import { uploadFile } from '@/app/actions/upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EnterpriseRecordDialog, type TableRbacAccess } from '@/components/ui/enterprise-table-kit'
import { cn } from '@/lib/utils'

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

function buildInitialAnswer(item: ChecklistItem): ChecklistAnswerState {
  if (item.inputType === 'yes_no_na') return { inputType: 'yes_no_na', valueChoice: '', attachments: [] }
  if (item.inputType === 'scale_1_5') return { inputType: 'scale_1_5', valueNumber: null, attachments: [] }
  return { inputType: 'free_text', valueText: '', attachments: [] }
}

export function DailyChecklistRunDialog({
  open,
  onOpenChange,
  access,
  checklistId,
  title,
  area,
  status,
  scorePercent,
  items,
  initialAnswers,
  responsibleName,
  onAfterSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  access: TableRbacAccess
  checklistId: number
  title: string
  area: string
  status: string
  scorePercent: number | null
  items: ChecklistItem[]
  initialAnswers?: Record<number, ChecklistAnswerState>
  responsibleName: string
  onAfterSave?: () => void
}) {
  const canEdit = access.canEdit ?? false
  const isCompleted = status === 'completed'

  const [localArea, setLocalArea] = React.useState(area)
  const [answers, setAnswers] = React.useState<Record<number, ChecklistAnswerState>>(() => {
    const next: Record<number, ChecklistAnswerState> = {}
    for (const item of items) {
      next[item.id] = initialAnswers?.[item.id] ?? buildInitialAnswer(item)
    }
    return next
  })
  const [isSaving, setIsSaving] = React.useState(false)
  const [isCompleting, setIsCompleting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setLocalArea(area)
    const next: Record<number, ChecklistAnswerState> = {}
    for (const item of items) {
      next[item.id] = initialAnswers?.[item.id] ?? buildInitialAnswer(item)
    }
    setAnswers(next)
  }, [area, initialAnswers, items, open])

  const buildPayloadAnswers = React.useCallback(() => {
    return items.map((item) => {
      const answer = answers[item.id] ?? buildInitialAnswer(item)
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
  }, [answers, items])

  const handleSave = async () => {
    if (!canEdit) return
    setIsSaving(true)
    try {
      await saveDailyChecklistAnswers({
        checklistId,
        area: localArea,
        status: 'in_progress',
        answers: buildPayloadAnswers(),
      })
      onAfterSave?.()
      toast.success('Checklist tersimpan.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan checklist.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!canEdit) return
    setIsCompleting(true)
    try {
      await saveDailyChecklistAnswers({
        checklistId,
        area: localArea,
        status: 'completed',
        answers: buildPayloadAnswers(),
      })
      onAfterSave?.()
      onOpenChange(false)
      toast.success('Checklist berhasil diselesaikan.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyelesaikan checklist.')
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <EnterpriseRecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`${localArea}${scorePercent != null ? ` • Score ${scorePercent}%` : ''}`}
      mode="form"
      access={access}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="dense" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={handleSave}
              disabled={!canEdit || isSaving || isCompleting || isCompleted}
            >
              {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button
              type="button"
              size="dense"
              onClick={handleComplete}
              disabled={!canEdit || isSaving || isCompleting || isCompleted}
              className={cn(isCompleted ? 'opacity-60' : '')}
            >
              {isCompleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {isCompleted ? 'Selesai' : isCompleting ? 'Memproses...' : 'Selesaikan'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="border-border/70 grid gap-2 rounded-[1rem] border bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <div className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
                Lokasi / Area
              </div>
              <Input
                value={localArea}
                onChange={(event) => setLocalArea(event.target.value)}
                disabled={!canEdit || isCompleted}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
                Pemeriksa / PIC
              </div>
              <div className="bg-muted/30 text-foreground border-border/70 flex h-9 items-center rounded-lg border px-3 text-sm font-medium">
                {responsibleName}
              </div>
            </div>
            <div className="grid gap-2">
              <div className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
                Status
              </div>
              <div className="text-foreground font-medium">{status}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {items.map((item, index) => {
            const answer = answers[item.id] ?? buildInitialAnswer(item)
            return (
              <div key={item.id} className="border-border/70 rounded-[1rem] border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
                      {index + 1}
                    </div>
                    <div className="text-foreground text-sm font-semibold">{item.prompt}</div>
                  </div>
                  {item.isRequired ? (
                    <span className="bg-surface-container-low text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
                      Required
                    </span>
                  ) : null}
                </div>

                <div className="mt-3">
                  {item.inputType === 'yes_no_na' ? (
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      value={answer.inputType === 'yes_no_na' ? answer.valueChoice : ''}
                      onValueChange={(value) =>
                        setAnswers((current) => ({
                          ...current,
                          [item.id]: {
                            inputType: 'yes_no_na',
                            valueChoice: (value as 'yes' | 'no' | 'na' | '') ?? '',
                            attachments: current[item.id]?.attachments ?? [],
                          },
                        }))
                      }
                      disabled={!canEdit || isCompleted}
                      className="w-full"
                    >
                      <ToggleGroupItem value="yes" className="flex-1 justify-center">
                        YES
                      </ToggleGroupItem>
                      <ToggleGroupItem value="no" className="flex-1 justify-center">
                        NO
                      </ToggleGroupItem>
                      <ToggleGroupItem value="na" className="flex-1 justify-center">
                        N/A
                      </ToggleGroupItem>
                    </ToggleGroup>
                  ) : null}

                  {item.inputType === 'scale_1_5' ? (
                    <div className="grid gap-2">
                      <Label className="text-muted-foreground text-xs">Skala penilaian (1-5)</Label>
                      <RadioGroup
                        value={
                          answer.inputType === 'scale_1_5' && answer.valueNumber != null
                            ? String(answer.valueNumber)
                            : ''
                        }
                        onValueChange={(value) =>
                          setAnswers((current) => ({
                            ...current,
                            [item.id]: {
                              inputType: 'scale_1_5',
                              valueNumber: value ? Number(value) : null,
                              attachments: current[item.id]?.attachments ?? [],
                            },
                          }))
                        }
                        className="flex flex-wrap gap-2"
                        disabled={!canEdit || isCompleted}
                      >
                        {[1, 2, 3, 4, 5].map((option) => (
                          <Label
                            key={option}
                            className="border-border/70 bg-muted/20 text-foreground hover:bg-muted/30 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
                          >
                            <RadioGroupItem value={String(option)} />
                            {option}
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                  ) : null}

                  {item.inputType === 'free_text' ? (
                    <div className="grid gap-2">
                      <Label className="text-muted-foreground text-xs">Catatan</Label>
                      <Textarea
                        value={answer.inputType === 'free_text' ? answer.valueText : ''}
                        onChange={(event) =>
                          setAnswers((current) => ({
                            ...current,
                            [item.id]: { 
                              inputType: 'free_text', 
                              valueText: event.target.value,
                              attachments: current[item.id]?.attachments ?? [],
                            },
                          }))
                        }
                        placeholder="Tulis catatan kondisi / temuan..."
                        disabled={!canEdit || isCompleted}
                        className="min-h-[92px]"
                      />
                    </div>
                  ) : null}

                  <div className="border-t border-border/70 mt-4 pt-4">
                    <Label className="text-muted-foreground text-xs font-medium mb-2 block">Lampiran Foto</Label>
                    <div className="flex flex-wrap gap-2">
                      {answer.attachments.map((url, i) => (
                        <div key={i} className="relative group size-16 rounded-md overflow-hidden border border-border/70">
                          <img src={url} className="w-full h-full object-cover" alt="Attachment" />
                          {!isCompleted && canEdit && (
                            <button
                              type="button"
                              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setAnswers(curr => ({
                                  ...curr,
                                  [item.id]: {
                                    ...curr[item.id],
                                    attachments: curr[item.id].attachments.filter((_, index) => index !== i)
                                  } as ChecklistAnswerState
                                }))
                              }}
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      {!isCompleted && canEdit && (
                        <label className="flex size-16 cursor-pointer items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 hover:bg-muted/30">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={async (e) => {
                              const files = Array.from(e.target.files ?? [])
                              if (!files.length) return
                              const toastId = toast.loading('Mengunggah foto...')
                              try {
                                const uploadedUrls: string[] = []
                                for (const file of files) {
                                  const fd = new FormData()
                                  fd.append('file', file)
                                  const result = await uploadFile(fd)
                                  if (result.success && result.url) {
                                    uploadedUrls.push(result.readableUrl || result.url)
                                  }
                                }
                                setAnswers(curr => ({
                                  ...curr,
                                  [item.id]: {
                                    ...curr[item.id],
                                    attachments: [...curr[item.id].attachments, ...uploadedUrls]
                                  } as ChecklistAnswerState
                                }))
                                toast.success('Foto berhasil diunggah.', { id: toastId })
                              } catch (error) {
                                toast.error('Gagal mengunggah foto.', { id: toastId })
                              }
                            }}
                          />
                          <Camera className="text-muted-foreground size-4" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </EnterpriseRecordDialog>
  )
}
