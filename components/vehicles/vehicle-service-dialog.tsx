'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addVehicleServiceLog } from '@/app/actions/vehicles'
import { toast } from 'sonner'
import { Wrench, Loader2 } from 'lucide-react'
import type { HeroVehicle } from '@/db/schema/vehicles'

interface VehicleServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: HeroVehicle | null
  onSuccess: () => void
}

export function VehicleServiceDialog({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: VehicleServiceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [serviceType, setServiceType] = useState('Rutin Berkala')
  const [odometer, setOdometer] = useState(vehicle?.currentOdometer ? String(vehicle.currentOdometer) : '')
  const [workshopName, setWorkshopName] = useState('')
  const [cost, setCost] = useState('')
  const [nextServiceOdometer, setNextServiceOdometer] = useState('')
  const [nextServiceDate, setNextServiceDate] = useState('')
  const [description, setDescription] = useState('')

  if (!vehicle) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceDate) {
      toast.error('Tanggal servis wajib diisi')
      return
    }

    setLoading(true)
    try {
      const res = await addVehicleServiceLog({
        vehicleId: vehicle.id,
        serviceDate,
        serviceType,
        odometer: odometer ? Number(odometer) : undefined,
        workshopName: workshopName.trim() || undefined,
        cost: cost ? Number(cost) : undefined,
        nextServiceOdometer: nextServiceOdometer ? Number(nextServiceOdometer) : undefined,
        nextServiceDate: nextServiceDate || undefined,
        description: description.trim() || undefined,
      })

      if (res.success) {
        toast.success('Catatan servis kendaraan berhasil disimpan')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message || 'Gagal menyimpan catatan servis')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Wrench className="w-5 h-5 text-blue-600" />
            Catat Servis — {vehicle.policeNumber} ({vehicle.brand} {vehicle.vehicleType})
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="srvDate" className="text-xs">Tanggal Servis *</Label>
              <Input
                id="srvDate"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="srvType" className="text-xs">Jenis Servis</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger id="srvType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rutin Berkala">Rutin Berkala</SelectItem>
                  <SelectItem value="Ganti Oli & Filter">Ganti Oli & Filter</SelectItem>
                  <SelectItem value="Tune Up & Spooring">Tune Up & Spooring</SelectItem>
                  <SelectItem value="Penggantian Ban">Penggantian Ban</SelectItem>
                  <SelectItem value="Rem & Kaki-kaki">Rem & Kaki-kaki</SelectItem>
                  <SelectItem value="Perbaikan Mesin">Perbaikan Mesin</SelectItem>
                  <SelectItem value="Emergency Breakdown">Emergency Breakdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="srvOdo" className="text-xs">Odometer Servis (KM)</Label>
              <Input
                id="srvOdo"
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="45000"
              />
            </div>
            <div>
              <Label htmlFor="srvWorkshop" className="text-xs">Nama Bengkel / Rekanan</Label>
              <Input
                id="srvWorkshop"
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                placeholder="Auto2000, Hino Authorised"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="srvCost" className="text-xs">Biaya Servis (Rp)</Label>
            <Input
              id="srvCost"
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="1500000"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Jadwal Servis Berikutnya (Otomatis Update Unit)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="srvNextOdo" className="text-[11px]">Next Servis (KM)</Label>
                <Input
                  id="srvNextOdo"
                  type="number"
                  value={nextServiceOdometer}
                  onChange={(e) => setNextServiceOdometer(e.target.value)}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label htmlFor="srvNextDate" className="text-[11px]">Next Servis (Tgl)</Label>
                <Input
                  id="srvNextDate"
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => setNextServiceDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="srvDesc" className="text-xs">Keterangan / Rincian Pekerjaan</Label>
            <Textarea
              id="srvDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ganti oli Shell Rimula 15W-40, filter solar, cek kampas rem."
              rows={2}
            />
          </div>

          <DialogFooter className="border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Servis
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
