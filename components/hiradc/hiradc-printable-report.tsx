"use client"

import * as React from "react"
import Image from "next/image"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { HiradcEntryRow, HiradcRegisterRow } from "@/lib/hiradc/queries"

interface HiradcPrintableReportProps {
  register: HiradcRegisterRow
  entries: HiradcEntryRow[]
}

export function HiradcPrintableReport({ register, entries }: HiradcPrintableReportProps) {


  return (
    <div className="pdf-wrapper bg-white text-black min-h-screen">
      {/* 
        Print styling ensures it looks good on paper.
        We hide standard navbars using .no-print classes applied in the global layout 
        or via AdminPageShell (if needed, but usually we just want to print this component).
      */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .admin-sidebar, .admin-header, .no-print { display: none !important; }
          .pdf-wrapper { padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
          .page-break { page-break-inside: avoid; }
        }
      `}} />

      <div className="max-w-[210mm] mx-auto bg-white p-8 shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
        
        {/* Header Logo & Title */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <Image 
                src="/cp_logo-removebg-preview.png" 
                alt="PT Chitra Paratama Logo" 
                width={120} 
                height={60} 
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#1a2332] tracking-tight uppercase">PT. CHITRA PARATAMA</h1>
              <p className="text-blue-700 font-bold text-sm tracking-wide">SAFETY FIRST | COLLABORATE -INNOVATE - DOMINATE</p>
              <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-1">
                <span className="font-bold">OFFICIAL HSE SYSTEM</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-center justify-center">
            <div className="w-20 h-20 border-[3px] border-slate-800 rounded-full flex flex-col items-center justify-center rotate-12">
              <span className="text-[12px] font-black text-slate-800 leading-tight">VERIFIED</span>
              <span className="text-[8px] font-bold text-slate-800 uppercase">Document</span>
            </div>
          </div>
        </div>

        {/* Document Meta Table */}
        <table className="w-full border-collapse border border-black text-xs mb-6 font-medium">
          <tbody>
            <tr>
              <td className="border border-black p-2 font-bold w-1/4">No. Dokumen</td>
              <td className="border border-black p-2 w-1/4">{register.documentNo || `HSE/HIRADC/00${register.id}`}</td>
              <td className="border border-black p-2 font-bold w-1/4">Revisi: {register.revision || "00"}</td>
              <td className="border border-black p-2 font-bold w-1/4 text-right">
                Tanggal Terbit: {register.effectiveDate ? new Date(register.effectiveDate).toLocaleDateString("id-ID") : new Date().toLocaleDateString("id-ID")}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold">Formulir</td>
              <td colSpan={3} className="border border-black p-2 text-center text-sm font-black uppercase tracking-wider">
                TABEL IDENTIFIKASI BAHAYA DAN PENILAIAN RESIKO
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2">
                <span className="text-slate-500 mr-2 text-[10px]">Pelaksana:</span><br/>
                <strong>{register.preparedBy || "Tim HSE"}</strong>
              </td>
              <td className="border border-black p-2">
                <span className="text-slate-500 mr-2 text-[10px]">Departemen:</span><br/>
                <strong>{register.department}</strong>
              </td>
              <td colSpan={2} className="border border-black p-2">
                <span className="text-slate-500 mr-2 text-[10px]">Lokasi Penilaian:</span><br/>
                <strong>{register.location}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Main Data Table */}
        <table className="w-full border-collapse border border-black text-xs mb-6 text-center">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <td rowSpan={2} className="border border-black p-2 w-48">Aktivitas / Kegiatan</td>
              <td rowSpan={2} className="border border-black p-2 w-48">Potensi Bahaya</td>
              <td rowSpan={2} className="border border-black p-2 w-48">Resiko (Dampak)</td>
              <td colSpan={2} className="border border-black p-1">Penilaian Resiko</td>
              <td rowSpan={2} className="border border-black p-2 w-16">Tingkat Resiko</td>
              <td rowSpan={2} className="border border-black p-2">Pengendalian Resiko</td>
            </tr>
            <tr className="bg-slate-100 font-bold">
              <td className="border border-black p-1 w-12">Peluang</td>
              <td className="border border-black p-1 w-12">Akibat</td>
            </tr>
          </thead>
          <tbody className="text-left align-top">
            {entries.length === 0 ? (
              <tr><td colSpan={7} className="text-center p-4">Tidak ada data.</td></tr>
            ) : entries.map((entry) => {
              const riskColor = entry.riskLevelBefore === 'EXTREME' ? 'text-slate-900 bg-slate-200' :
                                entry.riskLevelBefore === 'HIGH' ? 'text-red-700 font-bold' :
                                entry.riskLevelBefore === 'MODERATE' ? 'text-yellow-700 font-bold' : 'text-green-700 font-bold';
              return (
                <tr key={entry.id} className="page-break">
                  <td className="border border-black p-2 font-bold">{entry.activityName}</td>
                  <td className="border border-black p-2 font-medium">{entry.hazardDetails || entry.hazardCategory}</td>
                  <td className="border border-black p-2 italic text-slate-700">{entry.riskConsequence}</td>
                  <td className="border border-black p-2 text-center font-bold text-lg">{entry.likelihoodBefore}</td>
                  <td className="border border-black p-2 text-center font-bold text-lg">{entry.severityBefore}</td>
                  <td className={`border border-black p-2 text-center ${riskColor}`}>
                    {entry.riskLevelBefore?.charAt(0) || "-"}
                  </td>
                  <td className="border border-black p-2 text-[11px] leading-snug whitespace-pre-wrap text-slate-800">
                    {entry.existingControl || "Belum ada tindakan pengendalian."}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Legend Table */}
        <div className="page-break">
          <table className="w-full border-collapse border border-black text-[10px] mb-6 text-center">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <td colSpan={5} className="border border-black p-1">Akibat</td>
                <td rowSpan={2} className="border border-black p-1 w-24">Nilai Tingkat Resiko</td>
                <td colSpan={3} className="border border-black p-1">PENJELASAN</td>
              </tr>
              <tr className="bg-slate-100 font-bold text-center">
                <td className="border border-black p-1">1</td>
                <td className="border border-black p-1">2</td>
                <td className="border border-black p-1">3</td>
                <td className="border border-black p-1">4</td>
                <td className="border border-black p-1">5</td>
                <td className="border border-black p-1 w-32">Peluang</td>
                <td className="border border-black p-1 w-32">Akibat: Keselamatan</td>
                <td className="border border-black p-1 w-32">Akibat: Kesehatan</td>
              </tr>
            </thead>
            <tbody className="text-left align-top">
              <tr>
                <td className="border border-black p-1 text-center font-bold">A</td>
                <td className="border border-black p-1 text-center bg-yellow-100 text-yellow-700 font-bold">M</td>
                <td className="border border-black p-1 text-center bg-red-100 text-red-700 font-bold">H</td>
                <td className="border border-black p-1 text-center bg-slate-800 text-white font-bold">E</td>
                <td className="border border-black p-1 text-center bg-slate-800 text-white font-bold">E</td>
                <td className="border border-black p-1 font-bold pl-2 whitespace-nowrap">E : Extreme Risk</td>
                <td className="border border-black p-1">A : Hampir Pasti akan terjadi</td>
                <td className="border border-black p-1">1 : Tdk ada cidera, kerugian kecil</td>
                <td className="border border-black p-1">1 : Tdk berpotensi gangguan</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-bold">B</td>
                <td className="border border-black p-1 text-center bg-green-100 text-green-700 font-bold">L</td>
                <td className="border border-black p-1 text-center bg-yellow-100 text-yellow-700 font-bold">M</td>
                <td className="border border-black p-1 text-center bg-red-100 text-red-700 font-bold">H</td>
                <td className="border border-black p-1 text-center bg-slate-800 text-white font-bold">E</td>
                <td className="border border-black p-1 font-bold pl-2 whitespace-nowrap">H : High Risk</td>
                <td className="border border-black p-1">B : Cenderung untuk terjadi</td>
                <td className="border border-black p-1">2 : Cedera ringan, kerugian sedang</td>
                <td className="border border-black p-1">2 : Gangguan medik &lt; 7 hr</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-bold">C</td>
                <td className="border border-black p-1 text-center bg-green-100 text-green-700 font-bold">L</td>
                <td className="border border-black p-1 text-center bg-green-100 text-green-700 font-bold">L</td>
                <td className="border border-black p-1 text-center bg-yellow-100 text-yellow-700 font-bold">M</td>
                <td className="border border-black p-1 text-center bg-red-100 text-red-700 font-bold">H</td>
                <td className="border border-black p-1 font-bold pl-2 whitespace-nowrap">M : Moderate Risk</td>
                <td className="border border-black p-1">C : Mungkin dapat terjadi</td>
                <td className="border border-black p-1">3 : Hilang hari kerja, cukup besar</td>
                <td className="border border-black p-1">3 : Gangguan medik 1-4 mgg</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-center font-bold">D</td>
                <td className="border border-black p-1 text-center bg-green-100 text-green-700 font-bold">L</td>
                <td className="border border-black p-1 text-center bg-green-100 text-green-700 font-bold">L</td>
                <td className="border border-black p-1 text-center bg-green-100 text-green-700 font-bold">L</td>
                <td className="border border-black p-1 text-center bg-yellow-100 text-yellow-700 font-bold">M</td>
                <td className="border border-black p-1 font-bold pl-2 whitespace-nowrap">L : Low Risk</td>
                <td className="border border-black p-1">D : Kecil kemungkinan terjadi</td>
                <td className="border border-black p-1">4 : Cacat, material besar</td>
                <td className="border border-black p-1">4 : Gangguan medik 1-3 bln</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <table className="w-full border-collapse border border-black text-xs text-center mt-8 page-break">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <td className="border border-black p-2 w-1/3">Pelaksana</td>
              <td className="border border-black p-2 w-1/3">Diperiksa</td>
              <td className="border border-black p-2 w-1/3">Disetujui</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black h-24 align-bottom p-4">
                <div className="flex flex-col items-center justify-end h-full">
                  <span className="text-slate-300 italic mb-4 font-serif block">Digital Sign</span>
                  <strong className="block uppercase">{register.preparedBy || "PIC"}</strong>
                  <span className="text-[10px] text-slate-500">Incharge</span>
                </div>
              </td>
              <td className="border border-black h-24 align-bottom p-4">
                <div className="flex flex-col items-center justify-end h-full">
                  <span className="text-slate-300 italic mb-4 font-serif block">Verified</span>
                  <strong className="block uppercase">{register.reviewedBy || "HSE COORDINATOR"}</strong>
                  <span className="text-[10px] text-slate-500">Koordinator</span>
                </div>
              </td>
              <td className="border border-black h-24 align-bottom p-4">
                <div className="flex flex-col items-center justify-end h-full">
                  <span className="text-slate-300 italic mb-4 font-serif block">Approved</span>
                  <strong className="block uppercase">{register.approvedBy || "DEPARTMENT HEAD"}</strong>
                  <span className="text-[10px] text-slate-500">Department Head</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  )
}
