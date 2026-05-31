'use client'

import * as React from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  EnterpriseFormGrid,
  EnterpriseRecordDialog,
  type TableRbacAccess,
} from '@/components/ui/enterprise-table-kit'
import type { ChecklistInputType } from '@/app/actions/hse-checklists'
import { cn } from '@/lib/utils'

type BuilderItem = {
  clientId: string
  prompt: string
  inputType: ChecklistInputType
  isRequired: boolean
}

function SortableQuestionRow({
  id,
  disabled,
  children,
}: {
  id: string
  disabled: boolean
  children: (props: {
    attributes: any
    listeners: any
    style: React.CSSProperties
  }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners, style })}
    </div>
  )
}

function buildEmptyItem(): BuilderItem {
  return {
    clientId: crypto.randomUUID(),
    prompt: '',
    inputType: 'yes_no_na',
    isRequired: true,
  }
}

export function ChecklistTemplateBuilderDialog({
  open,
  onOpenChange,
  access,
  mode,
  initialTitle,
  initialDescription,
  initialItems,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  access: TableRbacAccess
  mode: 'create' | 'edit' | 'view'
  initialTitle?: string
  initialDescription?: string
  initialItems?: Array<{ prompt: string; inputType: ChecklistInputType; isRequired?: boolean }>
  onSubmit: (payload: {
    title: string
    description: string
    items: Array<{ prompt: string; inputType: ChecklistInputType; isRequired: boolean }>
  }) => Promise<void>
}) {
  const isReadOnly = mode === 'view' || !(access.canEdit ?? false)

  const [title, setTitle] = React.useState(initialTitle ?? '')
  const [description, setDescription] = React.useState(initialDescription ?? '')
  const [items, setItems] = React.useState<BuilderItem[]>(
    () =>
      initialItems?.map((item) => ({
        clientId: crypto.randomUUID(),
        prompt: item.prompt,
        inputType: item.inputType,
        isRequired: item.isRequired ?? true,
      })) ?? [buildEmptyItem()]
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  )

  React.useEffect(() => {
    if (!open) return
    setTitle(initialTitle ?? '')
    setDescription(initialDescription ?? '')
    setItems(
      initialItems?.map((item) => ({
        clientId: crypto.randomUUID(),
        prompt: item.prompt,
        inputType: item.inputType,
        isRequired: item.isRequired ?? true,
      })) ?? [buildEmptyItem()]
    )
  }, [open, initialDescription, initialItems, initialTitle])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.clientId === active.id)
      const newIndex = current.findIndex((item) => item.clientId === over.id)
      if (oldIndex < 0 || newIndex < 0) return current
      return arrayMove(current, oldIndex, newIndex)
    })
  }

  const handleSubmit = async () => {
    if (isReadOnly) {
      onOpenChange(false)
      return
    }

    setIsSaving(true)
    try {
      await onSubmit({
        title,
        description,
        items: items.map((item) => ({
          prompt: item.prompt,
          inputType: item.inputType,
          isRequired: item.isRequired,
        })),
      })
      onOpenChange(false)
    } catch {
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EnterpriseRecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Checklist Template Builder"
      description="Rancang form inspeksi kustom sesuai kebutuhan audit."
      mode={mode === 'view' ? 'view' : 'form'}
      access={access}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button type="button" variant="outline" size="dense" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            size="dense"
            onClick={handleSubmit}
            disabled={isSaving || isReadOnly}
          >
            {isSaving ? 'Menyimpan...' : mode === 'edit' ? 'Simpan Template' : 'Simpan Template'}
          </Button>
        </div>
      }
    >
      <EnterpriseFormGrid className="items-start">
        <div className="grid gap-2">
          <div className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
            Nama Checklist
          </div>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Contoh: Checklist Scaffolding Bulanan"
            disabled={isReadOnly}
          />
        </div>
        <div className="grid gap-2">
          <div className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
            Deskripsi Singkat
          </div>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Tujuan inspeksi ini..."
            disabled={isReadOnly}
          />
        </div>
      </EnterpriseFormGrid>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
            Daftar Pertanyaan ({items.length})
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="dense"
          onClick={() => setItems((current) => [...current, buildEmptyItem()])}
          disabled={isReadOnly}
        >
          <Plus className="size-4" />
          Tambah Poin Pemeriksaan
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.clientId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-3 grid gap-3">
            {items.map((item, index) => (
              <SortableQuestionRow key={item.clientId} id={item.clientId} disabled={isReadOnly}>
                {({ attributes, listeners }) => (
                  <div className="border-border/70 rounded-[1rem] border bg-white p-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="denseIcon"
                        className={cn(
                          'text-muted-foreground mt-0.5',
                          isReadOnly && 'pointer-events-none opacity-40'
                        )}
                        {...attributes}
                        {...listeners}
                      >
                        <GripVertical className="size-4" />
                      </Button>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            value={item.prompt}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.clientId === item.clientId
                                    ? { ...row, prompt: event.target.value }
                                    : row
                                )
                              )
                            }
                            placeholder={`Pertanyaan #${index + 1}`}
                            disabled={isReadOnly}
                            className="h-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="denseIcon"
                            className="text-destructive"
                            onClick={() =>
                              setItems((current) =>
                                current.filter((row) => row.clientId !== item.clientId)
                              )
                            }
                            disabled={isReadOnly || items.length <= 1}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {(
                            [
                              { key: 'yes_no_na', label: 'YES/NO/NA' },
                              { key: 'scale_1_5', label: 'SCALE 1-5' },
                              { key: 'free_text', label: 'FREE TEXT' },
                            ] as const
                          ).map((option) => {
                            const active = item.inputType === option.key
                            return (
                              <Button
                                key={option.key}
                                type="button"
                                variant={active ? 'default' : 'outline'}
                                size="dense"
                                className={cn(
                                  'h-8 px-3 text-[11px] font-semibold tracking-[0.08em] uppercase',
                                  active ? 'shadow-[0_10px_18px_rgba(0,52,97,0.10)]' : ''
                                )}
                                onClick={() =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.clientId === item.clientId
                                        ? { ...row, inputType: option.key }
                                        : row
                                    )
                                  )
                                }
                                disabled={isReadOnly}
                              >
                                {option.label}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </SortableQuestionRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {mode === 'view' ? (
        <div className="border-border/70 bg-surface-container-low text-muted-foreground mt-4 rounded-xl border p-3 text-sm">
          Mode view: template tidak bisa diubah.
        </div>
      ) : null}
    </EnterpriseRecordDialog>
  )
}
