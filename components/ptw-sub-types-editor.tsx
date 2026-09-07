'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Edit3, Check, X, RotateCcw, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EQUIPMENT_CHECKLIST_PER_TYPE, normalizePermitType } from '@/lib/ptw-helpers'
import { cn } from '@/lib/utils'

interface PtwSubTypesEditorProps {
  activePermitTypes: string[]
  subTypes: Record<string, string[]>
  onChange: (updated: Record<string, string[]>) => void
  readOnly?: boolean
  className?: string
}

export function PtwSubTypesEditor({
  activePermitTypes,
  subTypes,
  onChange,
  readOnly = false,
  className,
}: PtwSubTypesEditorProps) {
  const [newInputs, setNewInputs] = useState<Record<string, string>>({})
  const [editingItem, setEditingItem] = useState<{ permitType: string; index: number; value: string } | null>(null)

  if (!activePermitTypes || activePermitTypes.length === 0) return null

  const handleAddItem = (permitType: string) => {
    const text = (newInputs[permitType] || '').trim()
    if (!text) return

    const currentList = subTypes[permitType] || EQUIPMENT_CHECKLIST_PER_TYPE[permitType]?.subTypes || []
    if (currentList.includes(text)) {
      setNewInputs((prev) => ({ ...prev, [permitType]: '' }))
      return
    }

    const updatedList = [...currentList, text]
    onChange({
      ...subTypes,
      [permitType]: updatedList,
    })
    setNewInputs((prev) => ({ ...prev, [permitType]: '' }))
  }

  const handleDeleteItem = (permitType: string, indexToRemove: number) => {
    const currentList = subTypes[permitType] || EQUIPMENT_CHECKLIST_PER_TYPE[permitType]?.subTypes || []
    const updatedList = currentList.filter((_, idx) => idx !== indexToRemove)
    onChange({
      ...subTypes,
      [permitType]: updatedList,
    })
    if (editingItem?.permitType === permitType && editingItem.index === indexToRemove) {
      setEditingItem(null)
    }
  }

  const handleSaveEdit = () => {
    if (!editingItem) return
    const { permitType, index, value } = editingItem
    const cleanVal = value.trim()
    if (!cleanVal) return

    const currentList = subTypes[permitType] || EQUIPMENT_CHECKLIST_PER_TYPE[permitType]?.subTypes || []
    const updatedList = currentList.map((item, idx) => (idx === index ? cleanVal : item))

    onChange({
      ...subTypes,
      [permitType]: updatedList,
    })
    setEditingItem(null)
  }

  const handleResetToDefault = (permitType: string) => {
    const normKey = normalizePermitType(permitType)
    const defaults = EQUIPMENT_CHECKLIST_PER_TYPE[normKey]?.subTypes || EQUIPMENT_CHECKLIST_PER_TYPE[permitType]?.subTypes || []
    onChange({
      ...subTypes,
      [permitType]: [...defaults],
    })
    if (editingItem?.permitType === permitType) {
      setEditingItem(null)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
          <Wrench className="size-3.5 text-indigo-600" />
          <span>Rincian Jenis / Sub-Pekerjaan (Aktivitas Pekerjaan)</span>
        </div>
        <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
          Dapat ditambah, diedit, atau dihapus manual
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {activePermitTypes.map((pType) => {
          const normKey = normalizePermitType(pType)
          const items =
            subTypes[pType] ||
            subTypes[normKey] ||
            EQUIPMENT_CHECKLIST_PER_TYPE[normKey]?.subTypes ||
            EQUIPMENT_CHECKLIST_PER_TYPE[pType]?.subTypes ||
            []

          return (
            <div
              key={pType}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5 flex flex-col justify-between"
            >
              <div>
                {/* Header per Permit Type */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-[11px] text-slate-900 uppercase tracking-tight">
                    {pType}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      {items.length} Item
                    </span>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetToDefault(pType)}
                        title="Reset ke daftar default"
                        className="h-6 px-1.5 text-[10px] font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md gap-1"
                      >
                        <RotateCcw className="size-2.5" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-medium italic pt-1">
                  Aktivitas & sub-pekerjaan spesifik untuk izin ini:
                </p>

                {/* Sub-Types Item List */}
                <div className="space-y-1.5 pt-2">
                  {items.length === 0 ? (
                    <div className="text-[11px] italic text-slate-400 py-2 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      Belum ada sub-pekerjaan. Silakan tambahkan di bawah.
                    </div>
                  ) : (
                    items.map((item, idx) => {
                      const isCurrentlyEditing =
                        editingItem?.permitType === pType && editingItem.index === idx

                      if (isCurrentlyEditing) {
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 p-1 bg-indigo-50/70 border border-indigo-200 rounded-lg animate-in fade-in duration-150"
                          >
                            <Input
                              value={editingItem.value}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  value: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleSaveEdit()
                                } else if (e.key === 'Escape') {
                                  setEditingItem(null)
                                }
                              }}
                              autoFocus
                              className="h-7 text-xs bg-white border-indigo-300 font-medium"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveEdit}
                              className="h-7 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shrink-0"
                            >
                              <Check className="size-3" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingItem(null)}
                              className="h-7 px-1.5 text-slate-500 hover:bg-slate-200 rounded-md shrink-0"
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={idx}
                          className="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100/80 transition-all text-xs"
                        >
                          <span className="font-medium text-slate-800 break-words flex-1 leading-tight">
                            • {item}
                          </span>

                          {!readOnly && (
                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingItem({
                                    permitType: pType,
                                    index: idx,
                                    value: item,
                                  })
                                }
                                title="Ubah nama"
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
                              >
                                <Edit3 className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(pType, idx)}
                                title="Hapus"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Add New Sub-Type Input */}
              {!readOnly && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                  <Input
                    placeholder={`Tambah ${pType.toLowerCase()} baru...`}
                    value={newInputs[pType] || ''}
                    onChange={(e) =>
                      setNewInputs((prev) => ({
                        ...prev,
                        [pType]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddItem(pType)
                      }
                    }}
                    className="h-8 text-xs bg-slate-50/70 border-slate-200"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddItem(pType)}
                    disabled={!(newInputs[pType] || '').trim()}
                    className="h-8 px-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg gap-1 shrink-0 cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline">Tambah</span>
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
