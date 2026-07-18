'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react'
import { createUnitAction, updateUnitAction, deleteUnitAction } from '../../ewh/actions'

const UNIT_TYPES = [
  { value: 'dump_truck', label: 'Dump Truck' },
  { value: 'excavator', label: 'Excavator' },
  { value: 'grader', label: 'Grader / Motor Grader' },
  { value: 'compactor', label: 'Compactor / Vibro' },
  { value: 'bulldozer', label: 'Bulldozer' },
  { value: 'crane', label: 'Crane' },
  { value: 'truck', label: 'Truck / Pickup' },
  { value: 'other', label: 'Lainnya' },
]

interface Unit {
  id: number
  unitCode: string
  unitName: string
  unitType: string
  unitModel: string
  unitYear: number | null
  licensePlate: string
  capacity: string
  capacityUnit: string
  department: string
  isActive: boolean
  notes: string
}

interface Props {
  units: Unit[]
  siteId: number
}

const EMPTY_FORM = {
  unitCode: '',
  unitName: '',
  unitType: 'dump_truck',
  unitModel: '',
  unitYear: '',
  licensePlate: '',
  capacity: '',
  capacityUnit: 'ton',
  department: '',
  notes: '',
}

export function UnitMasterClient({ units: initialUnits, siteId }: Props) {
  const router = useRouter()
  const [units, setUnits] = useState(initialUnits)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  function openCreate() {
    setEditingUnit(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(unit: Unit) {
    setEditingUnit(unit)
    setForm({
      unitCode: unit.unitCode,
      unitName: unit.unitName,
      unitType: unit.unitType,
      unitModel: unit.unitModel,
      unitYear: unit.unitYear?.toString() ?? '',
      licensePlate: unit.licensePlate,
      capacity: unit.capacity,
      capacityUnit: unit.capacityUnit,
      department: unit.department,
      notes: unit.notes,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.unitCode.trim() || !form.unitName.trim()) {
      toast.error('Unit Code dan Unit Name wajib diisi')
      return
    }
    setSaving(true)
    try {
      if (editingUnit) {
        await updateUnitAction(editingUnit.id, {
          unitName: form.unitName,
          unitType: form.unitType,
          unitModel: form.unitModel,
          unitYear: form.unitYear ? parseInt(form.unitYear, 10) : undefined,
          licensePlate: form.licensePlate,
          capacity: form.capacity,
          capacityUnit: form.capacityUnit,
          department: form.department,
          notes: form.notes,
        })
        toast.success('Unit berhasil diupdate')
      } else {
        const result = await createUnitAction({
          siteId,
          unitCode: form.unitCode,
          unitName: form.unitName,
          unitType: form.unitType,
          unitModel: form.unitModel,
          unitYear: form.unitYear ? parseInt(form.unitYear, 10) : undefined,
          licensePlate: form.licensePlate,
          capacity: form.capacity,
          capacityUnit: form.capacityUnit,
          department: form.department,
          notes: form.notes,
        })
        toast.success(`Unit ${result.unit?.unitCode} berhasil ditambahkan`)
      }
      setDialogOpen(false)
      router.refresh()
    } catch (err) {
      toast.error('Gagal menyimpan unit', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteUnitAction(id)
      toast.success('Unit berhasil dihapus')
      setDeleteConfirm(null)
      router.refresh()
    } catch {
      toast.error('Gagal menghapus unit')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{units.length} unit terdaftar</p>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Unit
        </Button>
      </div>

      {units.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Belum ada unit yang terdaftar. Tambahkan unit untuk mulai tracking utilisasi.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold">Unit Code</th>
                <th className="px-4 py-3 text-left font-semibold">Nama</th>
                <th className="px-4 py-3 text-left font-semibold">Tipe</th>
                <th className="px-4 py-3 text-left font-semibold">Model</th>
                <th className="px-4 py-3 text-left font-semibold">Plat</th>
                <th className="px-4 py-3 text-left font-semibold">Kapasitas</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold">{unit.unitCode}</td>
                  <td className="px-4 py-3">{unit.unitName}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {UNIT_TYPES.find((t) => t.value === unit.unitType)?.label ?? unit.unitType}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{unit.unitModel || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{unit.licensePlate || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {unit.capacity ? `${unit.capacity} ${unit.capacityUnit}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        unit.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {unit.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(unit)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(unit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {editingUnit ? 'Edit Unit' : 'Tambah Unit Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <Label>Unit Code *</Label>
              <Input
                placeholder="DT001"
                value={form.unitCode}
                onChange={(e) => setForm({ ...form, unitCode: e.target.value })}
                disabled={!!editingUnit}
                className="font-mono uppercase"
              />
            </div>
            <div className="col-span-1">
              <Label>Tipe Unit *</Label>
              <Select
                value={form.unitType}
                onValueChange={(v) => setForm({ ...form, unitType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Nama Unit *</Label>
              <Input
                placeholder="Dump Truck 001"
                value={form.unitName}
                onChange={(e) => setForm({ ...form, unitName: e.target.value })}
              />
            </div>
            <div className="col-span-1">
              <Label>Model</Label>
              <Input
                placeholder="CAT 785C"
                value={form.unitModel}
                onChange={(e) => setForm({ ...form, unitModel: e.target.value })}
              />
            </div>
            <div className="col-span-1">
              <Label>Tahun</Label>
              <Input
                type="number"
                placeholder="2022"
                value={form.unitYear}
                onChange={(e) => setForm({ ...form, unitYear: e.target.value })}
              />
            </div>
            <div className="col-span-1">
              <Label>No Plat</Label>
              <Input
                placeholder="KB 1234 AB"
                value={form.licensePlate}
                onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
              />
            </div>
            <div className="col-span-1">
              <Label>Kapasitas</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="60"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
                <Select
                  value={form.capacityUnit}
                  onValueChange={(v) => setForm({ ...form, capacityUnit: v })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ton">ton</SelectItem>
                    <SelectItem value="m3">m³</SelectItem>
                    <SelectItem value="other">lain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="col-span-2">
              <Label>Departemen</Label>
              <Input
                placeholder="Mining / Hauling"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Catatan</Label>
              <Input
                placeholder="Catatan tambahan…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan…' : editingUnit ? 'Simpan Perubahan' : 'Tambah Unit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Unit?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Unit yang dihapus tidak dapat dikembalikan. Data utilitas yang sudah tersimpan tetap
            ada, namun tidak lagi terhubung ke unit master ini.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
            >
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
