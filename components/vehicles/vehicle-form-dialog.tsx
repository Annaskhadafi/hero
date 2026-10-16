'use client'

import React, { useState, useEffect } from 'react'
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
import { createVehicle, updateVehicle } from '@/app/actions/vehicles'
import { toast } from 'sonner'
import { Car, Building2, Shield, Wrench, UserCheck, Loader2 } from 'lucide-react'
import type { HeroVehicle } from '@/db/schema/vehicles'

interface VehicleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicleToEdit?: HeroVehicle | null
  onSuccess: () => void
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicleToEdit,
  onSuccess,
}: VehicleFormDialogProps) {
  const isEditing = Boolean(vehicleToEdit)
  const [loading, setLoading] = useState(false)

  // Form State
  const [policeNumber, setPoliceNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState<string>('Passenger')
  const [ownership, setOwnership] = useState<'Owned' | 'Rented'>('Owned')
  const [rentalVendor, setRentalVendor] = useState('')
  const [rentalMonthlyCost, setRentalMonthlyCost] = useState('')
  const [rentalStartDate, setRentalStartDate] = useState('')
  const [rentalEndDate, setRentalEndDate] = useState('')

  const [chassisNumber, setChassisNumber] = useState('')
  const [engineNumber, setEngineNumber] = useState('')
  const [color, setColor] = useState('')
  const [year, setYear] = useState('')

  const [stnkExpiryDate, setStnkExpiryDate] = useState('')
  const [taxExpiryDate, setTaxExpiryDate] = useState('')
  const [kirExpiryDate, setKirExpiryDate] = useState('')

  const [currentOdometer, setCurrentOdometer] = useState('')
  const [nextServiceOdometer, setNextServiceOdometer] = useState('')
  const [nextServiceDate, setNextServiceDate] = useState('')

  const [siteName, setSiteName] = useState('')
  const [department, setDepartment] = useState('')
  const [assignedEmployeeName, setAssignedEmployeeName] = useState('')
  const [assignedEmployeePhone, setAssignedEmployeePhone] = useState('')
  const [status, setStatus] = useState<string>('Active')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (vehicleToEdit) {
      setPoliceNumber(vehicleToEdit.plateNumber || (vehicleToEdit as any).policeNumber || '')
      setVehicleType(vehicleToEdit.vehicleType || '')
      setBrand((vehicleToEdit as any).brand || '')
      setCategory(vehicleToEdit.category || 'Passenger')
      setOwnership(vehicleToEdit.ownership?.toLowerCase() === 'rented' ? 'Rented' : 'Owned')
      setRentalVendor(vehicleToEdit.rentalVendor || '')
      setRentalMonthlyCost(vehicleToEdit.rentalCostMonthly ? String(vehicleToEdit.rentalCostMonthly) : ((vehicleToEdit as any).rentalMonthlyCost ? String((vehicleToEdit as any).rentalMonthlyCost) : ''))
      setRentalStartDate(vehicleToEdit.rentalStartDate || '')
      setRentalEndDate(vehicleToEdit.rentalEndDate || '')

      setChassisNumber(vehicleToEdit.vinNumber || (vehicleToEdit as any).chassisNumber || '')
      setEngineNumber(vehicleToEdit.engineNumber || '')
      setColor(vehicleToEdit.color || '')
      setYear(vehicleToEdit.manufactureYear ? String(vehicleToEdit.manufactureYear) : ((vehicleToEdit as any).year ? String((vehicleToEdit as any).year) : ''))

      setStnkExpiryDate(vehicleToEdit.stnkExpiryDate || '')
      setTaxExpiryDate(vehicleToEdit.taxExpiryDate || '')
      setKirExpiryDate(vehicleToEdit.kirExpiryDate || '')

      setCurrentOdometer(vehicleToEdit.lastServiceOdometer ? String(vehicleToEdit.lastServiceOdometer) : ((vehicleToEdit as any).currentOdometer ? String((vehicleToEdit as any).currentOdometer) : ''))
      setNextServiceOdometer(vehicleToEdit.nextServiceOdometer ? String(vehicleToEdit.nextServiceOdometer) : '')
      setNextServiceDate(vehicleToEdit.nextServiceDate || '')

      setSiteName(vehicleToEdit.locationName || (vehicleToEdit as any).siteName || '')
      setDepartment((vehicleToEdit as any).department || '')
      setAssignedEmployeeName(vehicleToEdit.holderName || (vehicleToEdit as any).assignedEmployeeName || '')
      setAssignedEmployeePhone((vehicleToEdit as any).assignedEmployeePhone || '')
      setStatus(vehicleToEdit.status || 'Active')
      setNotes(vehicleToEdit.notes || '')
    } else {
      // Defaults
      setPoliceNumber('')
      setVehicleType('')
      setBrand('')
      setCategory('Passenger')
      setOwnership('Owned')
      setRentalVendor('')
      setRentalMonthlyCost('')
      setRentalStartDate('')
      setRentalEndDate('')

      setChassisNumber('')
      setEngineNumber('')
      setColor('')
      setYear(String(new Date().getFullYear()))

      setStnkExpiryDate('')
      setTaxExpiryDate('')
      setKirExpiryDate('')

      setCurrentOdometer('')
      setNextServiceOdometer('')
      setNextServiceDate('')

      setSiteName('')
      setDepartment('General Affairs')
      setAssignedEmployeeName('')
      setAssignedEmployeePhone('')
      setStatus('Active')
      setNotes('')
    }
  }, [vehicleToEdit, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!policeNumber.trim()) {
      toast.error('Nomor Polisi wajib diisi')
      return
    }
    if (!vehicleType.trim()) {
      toast.error('Tipe Kendaraan wajib diisi')
      return
    }

    setLoading(true)
    try {
      const payload = {
        plateNumber: policeNumber.trim().toUpperCase(),
        vehicleType: brand.trim() ? `${brand.trim()} ${vehicleType.trim()}` : vehicleType.trim(),
        category,
        manufactureYear: year ? Number(year) : new Date().getFullYear(),
        vinNumber: chassisNumber.trim() || undefined,
        engineNumber: engineNumber.trim() || undefined,
        color: color.trim() || undefined,
        ownership: (ownership.toLowerCase() === 'rented' ? 'rented' : 'owned') as 'owned' | 'rented',
        rentalVendor: ownership === 'Rented' ? rentalVendor.trim() || undefined : undefined,
        rentalCostMonthly: ownership === 'Rented' && rentalMonthlyCost ? String(rentalMonthlyCost) : undefined,
        rentalStartDate: ownership === 'Rented' ? rentalStartDate || undefined : undefined,
        rentalEndDate: ownership === 'Rented' ? rentalEndDate || undefined : undefined,
        stnkExpiryDate: stnkExpiryDate || undefined,
        taxExpiryDate: taxExpiryDate || undefined,
        kirExpiryDate: kirExpiryDate || undefined,
        lastServiceOdometer: currentOdometer ? Number(currentOdometer) : undefined,
        nextServiceOdometer: nextServiceOdometer ? Number(nextServiceOdometer) : undefined,
        nextServiceDate: nextServiceDate || undefined,
        locationName: siteName.trim() || undefined,
        holderName: assignedEmployeeName.trim() || undefined,
        status: status.toLowerCase() || 'active',
        notes: notes.trim() || undefined,
      }

      let res
      if (isEditing && vehicleToEdit) {
        res = await updateVehicle(vehicleToEdit.id, payload)
      } else {
        res = await createVehicle(payload)
      }

      if (res) {
        toast.success(isEditing ? 'Data kendaraan berhasil diperbarui' : 'Kendaraan baru berhasil didaftarkan')
        onOpenChange(false)
        onSuccess()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Car className="w-5 h-5 text-blue-600" />
            {isEditing ? `Edit Kendaraan — ${vehicleToEdit?.plateNumber || (vehicleToEdit as any)?.policeNumber}` : 'Tambah Kendaraan Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Section 1: Basic Identitas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Car className="w-4 h-4 text-blue-600" />
              <span>1. Identitas Utama Kendaraan</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="policeNumber" className="text-xs">Nomor Polisi (Plat) *</Label>
                <Input
                  id="policeNumber"
                  value={policeNumber}
                  onChange={(e) => setPoliceNumber(e.target.value)}
                  placeholder="KT 1234 XY"
                  className="font-bold uppercase tracking-wider"
                  required
                />
              </div>
              <div>
                <Label htmlFor="brand" className="text-xs">Merk Kendaraan</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Toyota, Hino, Nissan, Mercy"
                />
              </div>
              <div>
                <Label htmlFor="vehicleType" className="text-xs">Tipe / Model Kendaraan *</Label>
                <Input
                  id="vehicleType"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="Hilux DC 2.4, Avanza, FG 235"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-xs">Kategori Unit</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passenger">Passenger (Mobil Penumpang)</SelectItem>
                    <SelectItem value="Light Commercial">Light Commercial (Pickup / Double Cabin)</SelectItem>
                    <SelectItem value="Heavy Truck">Heavy Truck (Truk / Dump Truck)</SelectItem>
                    <SelectItem value="Crane Truck">Crane Truck</SelectItem>
                    <SelectItem value="Special">Special Purpose / Alat Khusus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ownership" className="text-xs">Status Kepemilikan</Label>
                <Select value={ownership} onValueChange={(val: any) => setOwnership(val)}>
                  <SelectTrigger id="ownership">
                    <SelectValue placeholder="Pilih Kepemilikan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owned">Owned (Milik Sendiri / Aset PT)</SelectItem>
                    <SelectItem value="Rented">Rented (Sewa / Rental)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status" className="text-xs">Status Operasional</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active (Beroperasi)</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance (Perbaikan)</SelectItem>
                    <SelectItem value="Inactive">Inactive (Standby / Rusak)</SelectItem>
                    <SelectItem value="Returned">Returned (Dikembalikan ke Vendor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="year" className="text-xs">Tahun Pembuatan</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2022"
                />
              </div>
              <div>
                <Label htmlFor="color" className="text-xs">Warna Kendaraan</Label>
                <Input
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Putih, Hitam, Silver"
                />
              </div>
              <div>
                <Label htmlFor="chassisNumber" className="text-xs">Nomor Rangka (VIN)</Label>
                <Input
                  id="chassisNumber"
                  value={chassisNumber}
                  onChange={(e) => setChassisNumber(e.target.value)}
                  placeholder="MHFXW..."
                  className="font-mono text-xs"
                />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="engineNumber" className="text-xs">Nomor Mesin</Label>
                <Input
                  id="engineNumber"
                  value={engineNumber}
                  onChange={(e) => setEngineNumber(e.target.value)}
                  placeholder="2GD-..."
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Detail Rental (Only shown if Rented) */}
          {ownership === 'Rented' && (
            <div className="space-y-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-400">
                <Building2 className="w-4 h-4 text-amber-700" />
                <span>2. Detail Perjanjian Sewa (Rental)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <Label htmlFor="rentalVendor" className="text-xs">Vendor Rental</Label>
                  <Input
                    id="rentalVendor"
                    value={rentalVendor}
                    onChange={(e) => setRentalVendor(e.target.value)}
                    placeholder="PT Mitra Rental Kaltim"
                  />
                </div>
                <div>
                  <Label htmlFor="rentalMonthlyCost" className="text-xs">Biaya Sewa / Bulan (Rp)</Label>
                  <Input
                    id="rentalMonthlyCost"
                    type="number"
                    value={rentalMonthlyCost}
                    onChange={(e) => setRentalMonthlyCost(e.target.value)}
                    placeholder="12000000"
                  />
                </div>
                <div>
                  <Label htmlFor="rentalStartDate" className="text-xs">Tgl Mulai Sewa</Label>
                  <Input
                    id="rentalStartDate"
                    type="date"
                    value={rentalStartDate}
                    onChange={(e) => setRentalStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="rentalEndDate" className="text-xs">Tgl Akhir Sewa (Batas)</Label>
                  <Input
                    id="rentalEndDate"
                    type="date"
                    value={rentalEndDate}
                    onChange={(e) => setRentalEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Masa Berlaku Dokumen (STNK, Pajak, KIR) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>{ownership === 'Rented' ? '3' : '2'}. Masa Berlaku Dokumen Kendaraan (Reminder)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="stnkExpiryDate" className="text-xs">Masa Berlaku STNK (5 Tahunan)</Label>
                <Input
                  id="stnkExpiryDate"
                  type="date"
                  value={stnkExpiryDate}
                  onChange={(e) => setStnkExpiryDate(e.target.value)}
                />
                <span className="text-[10px] text-muted-foreground">Tanggal jatuh tempo ganti plat / STNK</span>
              </div>

              <div>
                <Label htmlFor="taxExpiryDate" className="text-xs">Masa Berlaku Pajak (1 Tahunan)</Label>
                <Input
                  id="taxExpiryDate"
                  type="date"
                  value={taxExpiryDate}
                  onChange={(e) => setTaxExpiryDate(e.target.value)}
                />
                <span className="text-[10px] text-muted-foreground">Pajak PKB tahunan</span>
              </div>

              <div>
                <Label htmlFor="kirExpiryDate" className="text-xs">Masa Berlaku Uji KIR (Dishub)</Label>
                <Input
                  id="kirExpiryDate"
                  type="date"
                  value={kirExpiryDate}
                  onChange={(e) => setKirExpiryDate(e.target.value)}
                />
                <span className="text-[10px] text-muted-foreground">Wajib untuk Truk / Angkutan Barang</span>
              </div>
            </div>
          </div>

          {/* Section 4: Servis & Odometer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Wrench className="w-4 h-4 text-blue-600" />
              <span>{ownership === 'Rented' ? '4' : '3'}. Odometer & Jadwal Servis Berkala</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="currentOdometer" className="text-xs">Odometer Terakhir (KM)</Label>
                <Input
                  id="currentOdometer"
                  type="number"
                  value={currentOdometer}
                  onChange={(e) => setCurrentOdometer(e.target.value)}
                  placeholder="35000"
                />
              </div>

              <div>
                <Label htmlFor="nextServiceOdometer" className="text-xs">Jadwal Servis Berikutnya (KM)</Label>
                <Input
                  id="nextServiceOdometer"
                  type="number"
                  value={nextServiceOdometer}
                  onChange={(e) => setNextServiceOdometer(e.target.value)}
                  placeholder="40000"
                />
              </div>

              <div>
                <Label htmlFor="nextServiceDate" className="text-xs">Jadwal Servis Tanggal</Label>
                <Input
                  id="nextServiceDate"
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => setNextServiceDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Lokasi & Penugasan Pemegang */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>{ownership === 'Rented' ? '5' : '4'}. Lokasi & Pemegang Unit</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="siteName" className="text-xs">Lokasi / Site</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Balikpapan HO, Tabang, Berau"
                />
              </div>

              <div>
                <Label htmlFor="department" className="text-xs">Departemen</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="General Affairs, Operation, HR"
                />
              </div>

              <div>
                <Label htmlFor="assignedEmployeeName" className="text-xs">Nama Pemegang / Driver</Label>
                <Input
                  id="assignedEmployeeName"
                  value={assignedEmployeeName}
                  onChange={(e) => setAssignedEmployeeName(e.target.value)}
                  placeholder="Nama Karyawan / Pool"
                />
              </div>

              <div>
                <Label htmlFor="assignedEmployeePhone" className="text-xs">No. Telp Pemegang</Label>
                <Input
                  id="assignedEmployeePhone"
                  value={assignedEmployeePhone}
                  onChange={(e) => setAssignedEmployeePhone(e.target.value)}
                  placeholder="08123456789"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Catatan */}
          <div>
            <Label htmlFor="notes" className="text-xs">Catatan Tambahan</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan kondisi kendaraan, riwayat penggantian part, dll."
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
              {isEditing ? 'Simpan Perubahan' : 'Daftarkan Kendaraan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
