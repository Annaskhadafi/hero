'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { TireRepairInspectionRecord } from '@/lib/tire-repair-constants';
import { resolveUploadUrl } from '@/lib/resolve-upload-url';

interface TireInspectionPrintReportProps {
  record: TireRepairInspectionRecord | null;
}

export function TireInspectionPrintReport({ record }: TireInspectionPrintReportProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!record || !mounted) return null;

  const formatDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  // Only include photos that have a valid photoUrl
  const validPhotos = (record.photos || []).filter(
    (p) => p && typeof p.photoUrl === 'string' && p.photoUrl.trim() !== ''
  );

  const isReject = (record.status || '').toLowerCase().includes('reject');

  return createPortal(
    <div id="tire-inspection-print-container" className="tire-inspection-print-wrapper text-black bg-white font-sans">
      <style jsx global>{`
        @media screen {
          #tire-inspection-print-container {
            display: none !important;
          }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          html, body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
          }

          /* Hide ALL top-level body children EXCEPT the print portal container */
          body > *:not(#tire-inspection-print-container) {
            display: none !important;
          }

          /* Position print container clean at top-left of page */
          #tire-inspection-print-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            background: #ffffff !important;
            z-index: 99999999 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-page {
            width: 297mm !important;
            height: 209.5mm !important;
            box-sizing: border-box !important;
            padding: 8mm 10mm !important;
            position: relative !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
          }

          /* Page 3 full-bleed layout without any outer padding */
          .print-page-full {
            width: 297mm !important;
            height: 209.5mm !important;
            box-sizing: border-box !important;
            padding: 0 !important;
            margin: 0 !important;
            position: relative !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #081a2b !important;
          }

          .print-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* ================= PAGE 1 ================= */}
      <div className="print-page border border-[#0070c0] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-2">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cp_logo-removebg-preview.png"
                alt="Chitra Paratama"
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <h1 className="text-xl font-bold text-black tracking-wide text-right uppercase">
              TIRE REPAIR INSPECTION REPORT
            </h1>
          </div>

          {/* Content Grid (Meta Data + Dynamic Photos) */}
          <div className="grid grid-cols-12 gap-6 mt-2">
            {/* Left Meta Data Column */}
            <div className="col-span-5 space-y-1.5 text-xs text-black leading-snug">
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Date Inspect</span>
                <span>:</span>
                <span className="font-normal text-black">{formatDate(record.dateInspect)}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Customer</span>
                <span>:</span>
                <span className="font-normal text-black">{record.customer || '-'}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Site</span>
                <span>:</span>
                <span className="font-normal text-black">{record.customerSite || '-'}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Report By</span>
                <span>:</span>
                <span className="font-normal text-black">{record.reportBy || '-'}</span>
              </div>

              {/* Thick Black Divider Line */}
              <div className="h-[3px] bg-black my-3" />

              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Tire Size</span>
                <span>:</span>
                <span className="font-normal text-black">{record.tireSize || '-'}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Serial Number</span>
                <span>:</span>
                <span className="font-normal text-black">{record.serialNumber || '-'}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Brand</span>
                <span>:</span>
                <span className="font-normal text-black">{record.brand || '-'}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Type Construction</span>
                <span>:</span>
                <span className="font-normal text-black">{record.typeConstruction || 'RADIAL'}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Pattern</span>
                <span>:</span>
                <span className="font-normal text-black">{record.pattern || '-'}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">RTD ( mm )</span>
                <span>:</span>
                <span className="font-normal text-black">
                  {(record.rtd1 || record.rtd2) ? `${record.rtd1 || '-'}/${record.rtd2 || '-'}` : '-'}
                </span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">No. Cargo Manifest</span>
                <span>:</span>
                <span className="font-normal text-black">{record.cargoManifestNo || ''}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Date Received</span>
                <span>:</span>
                <span className="font-normal text-black">{formatDate(record.dateReceived)}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Status</span>
                <span>:</span>
                <span className="font-normal uppercase text-black">{record.status || 'REPAIR'}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Remarks</span>
                <span>:</span>
                <span className="font-normal text-black whitespace-pre-line">{record.remarks || '-'}</span>
              </div>
              <div className="grid grid-cols-[135px_12px_1fr] items-baseline">
                <span className="font-normal text-black">Category</span>
                <span>:</span>
                <span className="font-normal text-black">{record.repairDuration || '-'}</span>
              </div>
            </div>

            {/* Right Dynamic Photo Grid */}
            <div className="col-span-7 grid grid-cols-2 gap-4">
              {validPhotos.length > 0 ? (
                validPhotos.map((photo, index) => (
                  <div key={index} className="border border-black flex flex-col justify-between h-[240px] bg-white overflow-hidden">
                    <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveUploadUrl(photo.photoUrl)}
                        alt={photo.photoArea || `Photo ${index + 1}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="border-t border-black bg-white py-1.5 text-center font-normal text-xs text-black shrink-0">
                      {photo.photoArea || (index === 0 ? 'Serial Number' : 'Area Sidewall')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 border border-black flex items-center justify-center h-[240px] bg-white text-slate-400 text-xs italic">
                  Tidak ada foto inspeksi
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= PAGE 2 ================= */}
      <div className="print-page border border-[#0070c0] flex flex-col justify-between">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-1">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cp_logo-removebg-preview.png"
                alt="Chitra Paratama"
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <h1 className="text-xl font-bold text-black tracking-wide text-right uppercase">
              TIRE REPAIR INSPECTION REPORT
            </h1>
          </div>

          {/* Team Repairman Table */}
          <div className="border border-black">
            <div className="bg-white py-1.5 text-center font-bold text-sm border-b border-black text-black">
              Team Repairman
            </div>
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="border-b border-black font-bold">
                  <th className="w-16 py-1.5 border-r border-black font-bold text-black">No</th>
                  <th className="py-1.5 border-r border-black font-bold text-black">Nama</th>
                  <th className="w-40 py-1.5 border-r border-black font-bold text-black">B/N</th>
                  <th className="w-52 py-1.5 font-bold text-black">E-Sign</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black h-9">
                  <td className="border-r border-black text-black">1</td>
                  <td className="border-r border-black text-black"></td>
                  <td className="border-r border-black text-black"></td>
                  <td className="text-black"></td>
                </tr>
                <tr className="border-b border-black h-9">
                  <td className="border-r border-black text-black">2</td>
                  <td className="border-r border-black text-black"></td>
                  <td className="border-r border-black text-black"></td>
                  <td className="text-black"></td>
                </tr>
                <tr className="h-9">
                  <td className="border-r border-black text-black">3</td>
                  <td className="border-r border-black text-black"></td>
                  <td className="border-r border-black text-black"></td>
                  <td className="text-black"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Declaration Statement */}
          <div className="text-xs leading-relaxed text-black my-2">
            Berdasarkan spesifikasi dan hasil inspeksi kondisi luka pada tire tersebut, maka kami menyatakan{' '}
            <span className="font-bold underline">
              {isReject ? 'tidak layak' : 'layak dan aman'}
            </span>{' '}
            untuk di lanjutkan proses <span className="font-bold underline">repair</span> . Kami mohon approval untuk kelengkapan berkas sebagai proses repair selanjutnya.
          </div>

          {/* Approval Section */}
          <div className="border border-black text-xs">
            {/* Box 1 */}
            <div className="grid grid-cols-[150px_1fr] border-b border-black">
              <div className="p-2 font-bold flex items-center justify-center border-r border-black bg-white text-xs text-black">
                Approval
              </div>
              <div className="p-2.5 flex flex-col justify-between h-[135px] bg-white">
                <div className="flex-1"></div>
                <div className="border-t border-black pt-1 text-black text-[11px] font-normal">
                  Responsible Person: Inspector Repairman
                </div>
              </div>
            </div>

            {/* Box 2 */}
            <div className="grid grid-cols-[150px_1fr] border-b border-black">
              <div className="p-2 font-bold flex items-center justify-center border-r border-black bg-white text-xs text-black">
                Approval
              </div>
              <div className="p-2.5 flex flex-col justify-between h-[135px] bg-white">
                <div className="flex-1"></div>
                <div className="border-t border-black pt-1 text-black text-[11px] font-normal">
                  Responsible Person: Approval PJO Chitra Paratama Site
                </div>
              </div>
            </div>

            {/* Box 3 */}
            <div className="grid grid-cols-[150px_1fr]">
              <div className="p-2 font-bold flex items-center justify-center border-r border-black bg-white text-xs text-black">
                Approval
              </div>
              <div className="p-2.5 flex flex-col justify-between h-[135px] bg-white">
                <div className="flex-1"></div>
                <div className="border-t border-black pt-1 text-black text-[11px] font-normal">
                  Responsible Person: Approval Customers
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Document Code */}
        <div className="text-right text-xs font-normal text-black mt-1">
          F.RPR.REM - 002.00 Tire Inspection Report
        </div>
      </div>

      {/* ================= PAGE 3 (FULL BLEED HD POSTER WITH ZERO WHITE MARGINS) ================= */}
      <div className="print-page-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/14-luka-ban.png"
          alt="14 Luka Ban Yang Tidak Bisa Diperbaiki"
          className="w-full h-full object-fill block"
        />
      </div>
    </div>,
    document.body
  );
}
