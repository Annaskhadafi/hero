'use client'

import React, { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Car, Shield, Calendar, Wrench, Building2, UserCheck } from 'lucide-react'
import type { HeroVehicle, HeroVehicleServiceLog } from '@/db/schema/vehicles'

interface VehiclePrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: (HeroVehicle & { serviceLogs?: HeroVehicleServiceLog[] }) | null
}

export function VehiclePrintDialog({
  open,
  onOpenChange,
  vehicle,
}: VehiclePrintDialogProps) {
  const printContentRef = useRef<HTMLDivElement>(null)

  if (!vehicle) return null

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (val?: string | null) => {
    if (!val) return '-'
    try {
      return new Date(val).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return val
    }
  }

  const formatNumber = (num?: number | null) => {
    if (num === null || num === undefined) return '-'
    return new Intl.NumberFormat('id-ID').format(num)
  }

  const formatCurrency = (amount?: string | number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(amount))
  }

  const plate = vehicle.plateNumber || (vehicle as any).policeNumber || '-'
  const holder = vehicle.holderName || (vehicle as any).assignedEmployeeName || 'Pool Kendaraan'
  const site = (vehicle as any).siteNameFallback || (vehicle as any).siteName || vehicle.locationName || '-'
  const year = vehicle.manufactureYear || (vehicle as any).year || '-'
  const vin = vehicle.vinNumber || (vehicle as any).chassisNumber || '-'
  const odo = vehicle.lastServiceOdometer || (vehicle as any).currentOdometer
  const isRented = (vehicle.ownership || '').toLowerCase() === 'rented'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 border-b bg-slate-50 flex flex-row items-center justify-between no-print sticky top-0 z-10">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-800">
              Cetak Dokumen Kendaraan — {plate}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Format cetak standar A4 (.pdf-wrapper, WYSIWYG)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Print Styles */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 12mm;
              }
              body * {
                visibility: hidden;
              }
              .pdf-wrapper, .pdf-wrapper * {
                visibility: visible;
              }
              .pdf-wrapper {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                font-size: 10pt !important;
                font-family: Arial, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `
        }} />

        <div className="p-6 md:p-8 bg-slate-100/60 dark:bg-slate-900 flex justify-center">
          <div
            ref={printContentRef}
            className="pdf-wrapper bg-white text-slate-900 border border-slate-300 rounded-lg shadow-md w-full max-w-[210mm] min-h-[297mm] p-8 text-[10pt] leading-normal flex flex-col justify-between"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Document Header */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-900 text-white flex items-center justify-center font-black rounded text-xl tracking-wider">
                    CP
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-slate-950 uppercase tracking-wide">
                      PT CHITRA PARATAMA
                    </h1>
                    <p className="text-[9pt] text-slate-600">
                      General Affairs & Operations Support | Hero Management System
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-400 font-bold text-xs uppercase tracking-wider rounded">
                    KARTU KENDARAAN OPERASIONAL
                  </div>
                  <p className="text-[8pt] text-slate-500 mt-1">
                    No. Ref: GA-VEH-{plate.replace(/\s+/g, '')}
                  </p>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center mb-6 bg-slate-50 border border-slate-200 py-3 rounded">
                <h2 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">
                  LEMBAR DATA KENDARAAN & STATUS KELAYAKAN SURAT
                </h2>
                <p className="text-xs text-slate-600">
                  Kepemilikan: <strong className="font-bold text-slate-900">{(vehicle.ownership || '').toUpperCase()}</strong> | Kategori: <strong>{vehicle.category}</strong> | Status: <strong>{vehicle.status}</strong>
                </p>
              </div>

              {/* Section 1: Vehicle Identity & Assignment */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Column 1: Unit Identification */}
                <div className="border border-slate-200 rounded p-3 bg-white">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-2.5">
                    <Car className="w-4 h-4 text-blue-700" />
                    <h3 className="font-bold text-[10pt] text-slate-900 uppercase">
                      1. Identitas Unit Kendaraan
                    </h3>
                  </div>
                  <table className="w-full text-[9pt]">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500 w-36">Nomor Polisi</td>
                        <td className="py-1 font-extrabold text-blue-900 text-[10.5pt]">{plate}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Merk / Tipe</td>
                        <td className="py-1 font-semibold">{vehicle.brand || '-'} / {vehicle.vehicleType}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Tahun Pembuatan</td>
                        <td className="py-1 font-semibold">{year}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Warna</td>
                        <td className="py-1">{vehicle.color || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Nomor Rangka (VIN)</td>
                        <td className="py-1 font-mono text-[8.5pt]">{vin}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-500">Nomor Mesin</td>
                        <td className="py-1 font-mono text-[8.5pt]">{vehicle.engineNumber || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Column 2: Operation & Holder */}
                <div className="border border-slate-200 rounded p-3 bg-white">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-2.5">
                    <UserCheck className="w-4 h-4 text-blue-700" />
                    <h3 className="font-bold text-[10pt] text-slate-900 uppercase">
                      2. Lokasi & Pemegang Unit
                    </h3>
                  </div>
                  <table className="w-full text-[9pt]">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500 w-36">Lokasi / Site</td>
                        <td className="py-1 font-bold text-slate-900">{site}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Departemen</td>
                        <td className="py-1 font-semibold">{vehicle.department || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Pemegang / Pengguna</td>
                        <td className="py-1 font-bold text-blue-900">{holder}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Kontak Pemegang</td>
                        <td className="py-1">{vehicle.assignedEmployeePhone || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Odometer Terakhir</td>
                        <td className="py-1 font-bold font-mono">{formatNumber(odo)} KM</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-500">Kondisi / Status</td>
                        <td className="py-1 font-bold text-emerald-700">{vehicle.status}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Legal Document Validity */}
              <div className="border border-slate-200 rounded p-3 mb-6 bg-white">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-3">
                  <Shield className="w-4 h-4 text-blue-700" />
                  <h3 className="font-bold text-[10pt] text-slate-900 uppercase">
                    3. Masa Berlaku Dokumen Kendaraan (STNK, Pajak, KIR)
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* STNK 5-Tahunan */}
                  <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
                    <p className="text-[8.5pt] font-bold text-slate-600 uppercase mb-1">STNK (5 Tahunan)</p>
                    <p className="text-xs font-bold text-slate-900">{formatDate(vehicle.stnkExpiryDate)}</p>
                    <p className="text-[8pt] text-slate-500 mt-0.5">Surat Tanda Nomor Kendaraan</p>
                  </div>

                  {/* Pajak 1-Tahunan */}
                  <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
                    <p className="text-[8.5pt] font-bold text-slate-600 uppercase mb-1">Pajak (1 Tahunan)</p>
                    <p className="text-xs font-bold text-slate-900">{formatDate(vehicle.taxExpiryDate)}</p>
                    <p className="text-[8pt] text-slate-500 mt-0.5">Pajak Kendaraan Bermotor (PKB)</p>
                  </div>

                  {/* Uji KIR */}
                  <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
                    <p className="text-[8.5pt] font-bold text-slate-600 uppercase mb-1">Uji Berkala (KIR)</p>
                    <p className="text-xs font-bold text-slate-900">{formatDate(vehicle.kirExpiryDate)}</p>
                    <p className="text-[8pt] text-slate-500 mt-0.5">Kelayakan Teknis & Uji Dishub</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Rental or Ownership Details */}
              {isRented ? (
                <div className="border border-slate-200 rounded p-3 mb-6 bg-amber-50/30">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-2.5">
                    <Building2 className="w-4 h-4 text-amber-700" />
                    <h3 className="font-bold text-[10pt] text-slate-900 uppercase">
                      4. Data Perjanjian Sewa (Rental)
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-[9pt]">
                    <div>
                      <p className="text-slate-500 text-[8.5pt]">Vendor / Rekanan Rental</p>
                      <p className="font-bold text-slate-900">{vehicle.rentalVendor || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[8.5pt]">Biaya Sewa / Bulan</p>
                      <p className="font-bold text-slate-900">{formatCurrency(vehicle.rentalMonthlyCost)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[8.5pt]">Masa Kontrak Sewa</p>
                      <p className="font-bold text-slate-900">
                        {formatDate(vehicle.rentalStartDate)} s/d {formatDate(vehicle.rentalEndDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Section 4: Maintenance Schedule */}
              <div className="border border-slate-200 rounded p-3 mb-6 bg-white">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-2.5">
                  <Wrench className="w-4 h-4 text-blue-700" />
                  <h3 className="font-bold text-[10pt] text-slate-900 uppercase">
                    {isRented ? '5' : '4'}. Jadwal Perawatan & Servis Berkala
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-[9pt]">
                  <div>
                    <p className="text-slate-500 text-[8.5pt]">Odometer Saat Ini</p>
                    <p className="font-bold text-slate-900">{formatNumber(vehicle.currentOdometer)} KM</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[8.5pt]">Jadwal Servis Berikutnya (KM)</p>
                    <p className="font-bold text-blue-900">
                      {vehicle.nextServiceOdometer ? `${formatNumber(vehicle.nextServiceOdometer)} KM` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[8.5pt]">Jadwal Servis Tanggal</p>
                    <p className="font-bold text-blue-900">{formatDate(vehicle.nextServiceDate)}</p>
                  </div>
                </div>
              </div>

              {/* Remarks / Notes */}
              {vehicle.notes && (
                <div className="border border-slate-200 rounded p-2.5 mb-6 text-[8.5pt] bg-slate-50">
                  <strong className="font-bold">Catatan / Keterangan:</strong> {vehicle.notes}
                </div>
              )}
            </div>

            {/* Document Signatures Footer */}
            <div className="mt-8 pt-4 border-t border-slate-300">
              <div className="grid grid-cols-3 gap-6 text-center text-[9pt]">
                <div>
                  <p className="text-slate-500 mb-16">Disiapkan oleh,</p>
                  <div className="border-b border-slate-900 mx-6 mb-1"></div>
                  <p className="font-bold text-slate-900 uppercase">General Affairs (GA)</p>
                  <p className="text-[8pt] text-slate-500">Fleet & Facility Admin</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-16">Pemegang Unit,</p>
                  <div className="border-b border-slate-900 mx-6 mb-1"></div>
                  <p className="font-bold text-slate-900 uppercase">
                    {vehicle.assignedEmployeeName || '( Belum Ditugaskan )'}
                  </p>
                  <p className="text-[8pt] text-slate-500">Penanggung Jawab Kendaraan</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-16">Mengetahui,</p>
                  <div className="border-b border-slate-900 mx-6 mb-1"></div>
                  <p className="font-bold text-slate-900 uppercase">Project Manager / Dept Head</p>
                  <p className="text-[8pt] text-slate-500">PT Chitra Paratama</p>
                </div>
              </div>

              <div className="mt-6 pt-2 border-t border-dashed border-slate-200 flex justify-between text-[7.5pt] text-slate-400">
                <span>Dokumen dicetak dari HERO One Chitra System</span>
                <span>Dicetak pada: {new Date().toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
