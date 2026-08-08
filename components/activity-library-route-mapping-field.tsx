'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AdminRouteFolder, AdminRouteFolderGroup, AdminRouteFolderItem } from '@/lib/daily-activity'
import { Card, CardContent } from './ui/card'

interface ActivityLibraryRouteMappingFieldProps {
  routeFolders: AdminRouteFolder[]
  initialMappedIds?: number[]
}

export function ActivityLibraryRouteMappingField({ routeFolders, initialMappedIds = [] }: ActivityLibraryRouteMappingFieldProps) {
  const [selections, setSelections] = useState<{ id: number, templateId: string, groupId: string }[]>([])
  
  useEffect(() => {
    if (initialMappedIds.length > 0 && routeFolders.length > 0) {
      const initialSelections: { id: number, templateId: string, groupId: string }[] = []
      
      initialMappedIds.forEach(mappedId => {
        for (const template of routeFolders) {
          for (const group of template.groups) {
            if (group.id === mappedId) {
              initialSelections.push({
                id: Date.now() + Math.random(),
                templateId: template.id.toString(),
                groupId: group.id.toString(),
              })
            }
          }
        }
      })
      
      if (initialSelections.length > 0) {
        setSelections(initialSelections)
      } else {
        setSelections([{ id: Date.now(), templateId: '', groupId: '' }])
      }
    } else {
      setSelections([{ id: Date.now(), templateId: '', groupId: '' }])
    }
  }, [initialMappedIds, routeFolders])

  const addSelection = () => {
    setSelections([...selections, { id: Date.now(), templateId: '', groupId: '' }])
  }

  const removeSelection = (id: number) => {
    setSelections(selections.filter(s => s.id !== id))
  }

  const updateSelection = (id: number, field: 'templateId' | 'groupId', value: string) => {
    setSelections(selections.map(s => {
      if (s.id !== id) return s
      
      const updated = { ...s, [field]: value }
      if (field === 'templateId') {
        updated.groupId = ''
      }
      return updated
    }))
  }

  const validGroupIds = selections.map(s => s.groupId).filter(id => id !== '')
  const routeGroupIdsValue = validGroupIds.join(',')

  return (
    <div className="grid gap-3 rounded-xl border border-input/50 bg-surface-container-low/30 p-3 mt-2">
      {selections.map((selection, index) => {
        const template = routeFolders.find(t => t.id.toString() === selection.templateId)
        const groups = template?.groups || []

        return (
          <div key={selection.id} className="relative grid gap-3">
            {selections.length > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Mapping {index + 1}</span>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full text-rose-500 hover:bg-rose-100 hover:text-rose-600"
                  onClick={() => removeSelection(selection.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Select 
                  value={selection.templateId}
                  onValueChange={(val) => updateSelection(selection.id, 'templateId', val)}
                >
                  <SelectTrigger className="h-10 rounded-lg border-0 bg-surface-container-low px-4 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)]">
                    <SelectValue placeholder="Pilih Template Route..." />
                  </SelectTrigger>
                  <SelectContent>
                    {routeFolders.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.routeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Select 
                  value={selection.groupId}
                  onValueChange={(val) => updateSelection(selection.id, 'groupId', val)}
                  disabled={!selection.templateId}
                >
                  <SelectTrigger className="h-10 rounded-lg border-0 bg-surface-container-low px-4 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)]">
                    <SelectValue placeholder="Pilih Route Group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id.toString()}>{g.groupName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {index < selections.length - 1 && <div className="my-1 h-px bg-border/50" />}
          </div>
        )
      })}
      
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="mt-1 h-9 w-full rounded-lg text-xs font-semibold text-primary hover:bg-primary/10"
        onClick={addSelection}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Tambah mapping lain
      </Button>

      {validGroupIds.length > 0 && (
        <input type="hidden" name="routeGroupIds" value={routeGroupIdsValue} />
      )}
    </div>
  )
}
