'use client'

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { manageSioCertAction } from "@/app/dashboard/admin-actions"

interface EmployeeOption {
  id: number
  name: string
  employeeSn: string | null
}

interface SioRow {
  id: number
  employeeId: number
  employeeName: string | null
  employeeSn: string | null
  certType: string
  certName: string
  certNumber: string | null
  issuingBody: string | null
  certDate: Date | string | null
  expiryDate: Date | string | null
  status: string
  notes: string | null
}

const CERT_TYPE_OPTIONS = ['SIO', 'POP', 'POM']
const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'expiring_soon', label: 'Segera Expired' },
  { value: 'expired', label: 'Expired' },
]

const INITIAL_STATE = { status: '', message: '' } as const

function formatDateInput(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().split('T')[0]
}

export function SioCreateDialog({
  employees,
  onSuccess,
}: {
  employees: EmployeeOption[]
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(manageSioCertAction, INITIAL_STATE)
  const { toast } = useToast()

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Berhasil', description: state.message })
      setOpen(false)
      onSuccess()
    } else if (state.status === 'error') {
      toast({ title: 'Gagal', description: state.message })
    }
  }, [state.status])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 rounded-xl text-xs gap-1.5">
          <Plus className="size-4" />
          Tambah SIO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Sertifikasi SIO/POP/POM</DialogTitle>
          <DialogDescription>Isi data sertifikasi baru untuk karyawan.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="intent" value="create" />
          <div className="space-y-2">
            <Label>Karyawan</Label>
            <select name="employeeId" required className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm">
              <option value="">Pilih karyawan...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name} {emp.employeeSn ? `(${emp.employeeSn})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipe Sertifikat</Label>
              <select name="certType" required className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm">
                {CERT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nama Sertifikat</Label>
              <Input name="certName" required placeholder="Forklift Kelas 2" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nomor Sertifikat</Label>
              <Input name="certNumber" placeholder="Opsional" />
            </div>
            <div className="space-y-2">
              <Label>Penerbit</Label>
              <Input name="issuingBody" placeholder="KEMENAKER, BNSP" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tanggal Sertifikat</Label>
              <Input name="certDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label>Masa Berlaku</Label>
              <Input name="expiryDate" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select name="status" className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="awardPoints" id="awardPoints-create" value="true" className="size-4" />
            <Label htmlFor="awardPoints-create" className="text-xs">Beri poin produktivitas (+50 SIO, +25 POP/POM)</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SioEditDialog({
  row,
  employees,
  onSuccess,
  open,
  onOpenChange,
}: {
  row: SioRow | null
  employees: EmployeeOption[]
  onSuccess: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [state, formAction, isPending] = useActionState(manageSioCertAction, INITIAL_STATE)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Berhasil', description: state.message })
      onOpenChange(false)
      onSuccess()
    } else if (state.status === 'error') {
      toast({ title: 'Gagal', description: state.message })
    }
  }, [state.status])

  if (!row) return null

  if (confirmDelete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Sertifikasi</DialogTitle>
            <DialogDescription>Yakin hapus {row.certName} untuk {row.employeeName}?</DialogDescription>
          </DialogHeader>
          <form action={formAction}>
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={row.id} />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>Batal</Button>
              <Button type="submit" variant="destructive" disabled={isPending}>{isPending ? 'Menghapus...' : 'Hapus'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Sertifikasi</DialogTitle>
          <DialogDescription>Ubah data sertifikasi {row.certName}.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="intent" value="update" />
          <input type="hidden" name="id" value={row.id} />
          <div className="space-y-2">
            <Label>Karyawan</Label>
            <select name="employeeId" required className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm" defaultValue={row.employeeId}>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <select name="certType" required className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm" defaultValue={row.certType}>
                {CERT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nama Sertifikat</Label>
              <Input name="certName" required defaultValue={row.certName} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nomor</Label>
              <Input name="certNumber" defaultValue={row.certNumber ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Penerbit</Label>
              <Input name="issuingBody" defaultValue={row.issuingBody ?? ''} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tgl Sertifikat</Label>
              <Input name="certDate" type="date" defaultValue={formatDateInput(row.certDate)} />
            </div>
            <div className="space-y-2">
              <Label>Masa Berlaku</Label>
              <Input name="expiryDate" type="date" defaultValue={formatDateInput(row.expiryDate)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select name="status" className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm" defaultValue={row.status}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <DialogFooter className="flex justify-between">
            <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4 mr-1" /> Hapus
            </Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
