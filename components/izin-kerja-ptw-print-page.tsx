"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPermitSubTypes, cleanPtwDescription, extractCheckedEquipment } from "@/lib/ptw-helpers";
import { PtwChecklistTable } from "@/components/ptw-checklist-table";

export type PtwPrintRecord = {
  id: string;
  projectName: string;
  permitType: string;
  location: string;
  area: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  applicant: string;
  fieldPic: string;
  authorizedBy: string;
  status: string;
  risk: string;
  description: string;
  controlSteps: string;
  ppe: string[];
  subTypes?: Record<string, string[]> | string[];
  additionalNotes?: string;
  gasTestRequired: boolean;
  isolationRequired: boolean;
  attachmentName: string;
  workOrderNo?: string;
  signatures?: {
    step1?: string | null;
    step2?: string | null;
    step3?: string | null;
  };
};

function formatDate(value: string) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch (_) {
    return value;
  }
}

export function IzinKerjaPtwPrintPage() {
  const [record, setRecord] = useState<PtwPrintRecord | null>(null);
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const raw = window.localStorage.getItem("hero-ptw-print-record");
    if (raw) {
      try {
        setRecord(JSON.parse(raw));
      } catch (err) {
        console.error("Error parsing print record:", err);
      }
    }
  }, []);

  if (!record) {
    return (
      <div className="p-8 font-semibold text-slate-700">
        Dokumen PTW tidak ditemukan. Buka dari tombol Download PDF / Cetak Dokumen di menu Izin Kerja PTW.
      </div>
    );
  }

  const ppeList = Array.isArray(record.ppe) ? record.ppe : [];
  const activePermitType = (record.permitType || "").toUpperCase();

  return (
    <main className="min-h-screen bg-slate-200 text-slate-900 print:bg-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page { size: A4 landscape; margin: 5mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .ptw-landscape-sheet {
            width: 100% !important;
            max-width: 1122px !important;
            min-height: 793px !important;
            margin: 0 auto !important;
            padding: 5mm !important;
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          @media print {
            .ptw-landscape-sheet {
              width: 297mm !important;
              min-height: 210mm !important;
              max-width: 297mm !important;
            }
          }
          .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `,
        }}
      />

      <div className="no-print sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-sm font-black uppercase text-slate-900">Official Form: IJIN KERJA BERBAHAYA (Work Permit)</p>
          <p className="text-xs font-semibold text-slate-500">{record.projectName} — Format Official Landscape</p>
        </div>
        <Button className="gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b]" onClick={() => window.print()}>
          <Printer className="size-4" /> Cetak / Save Landscape PDF
        </Button>
      </div>

      <div className="py-6 print:py-0">
        <article className="ptw-landscape-sheet mx-auto w-full max-w-[1122px] min-h-[793px] bg-white p-6 shadow-xl border-2 border-slate-900 text-slate-900 font-sans text-[8.5pt]">
          {/* ── HEADER TABLE ── */}
          <div className="grid grid-cols-[180px_1fr] border-b-2 border-slate-900">
            <div className="flex items-center justify-center p-2 border-r-2 border-slate-900 bg-white">
              <Image src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" width={150} height={50} className="object-contain" />
            </div>
            <div className="bg-[#bfe6ff] flex items-center justify-center font-bold text-base tracking-wider uppercase py-2.5 text-slate-900">
              IJIN KERJA BERBAHAYA ( Work Permit )
            </div>
          </div>

          {/* ── FORM META FIELDS ── */}
          <div className="grid grid-cols-12 border-b-2 border-slate-900 text-[8pt]">
            <div className="col-span-4 border-r border-slate-900 p-1.5 bg-slate-50">
              <span className="font-bold">No. Ijin Kerja Berbahaya :</span> <span className="font-mono font-semibold">{record.id}</span>
            </div>
            <div className="col-span-8 p-1.5 bg-slate-50">
              <span className="font-bold">No. Work Order :</span> <span className="font-mono font-semibold">{record.workOrderNo || record.id}</span>
            </div>

            <div className="col-span-4 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
              <span className="font-bold block text-[7.5pt] text-slate-500">Nama Pekerja :</span>
              <span className="font-semibold text-slate-900">{record.applicant || "-"}</span>
            </div>
            <div className="col-span-3 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
              <span className="font-bold block text-[7.5pt] text-slate-500">Lokasi :</span>
              <span className="font-semibold text-slate-900">{record.location} ({record.area})</span>
            </div>
            <div className="col-span-5 border-t border-slate-900 p-1.5 min-h-[44px]">
              <span className="font-bold block text-[7.5pt] text-slate-500">Uraian Pekerjaan :</span>
              <span className="font-semibold text-slate-900">{record.projectName || record.description || "-"}</span>
            </div>

            <div className="col-span-6 border-r border-slate-900 border-t border-slate-900 p-1.5 bg-blue-50/50">
              <span className="font-bold text-slate-800">Referensi HIRADC :</span>{" "}
              <span className="font-semibold text-blue-900">
                {(record as any).hiradcReference || (record.description?.match(/\[Referensi HIRADC:\s*(.*?)\]/)?.[1]) || "—"}
              </span>
            </div>
            <div className="col-span-6 border-t border-slate-900 p-1.5 bg-blue-50/50">
              <span className="font-bold text-slate-800">Tipe Izin Kerja Terpilih :</span>{" "}
              <span className="font-semibold uppercase text-slate-900">{record.permitType || "Cold Permit"}</span>
            </div>
          </div>

          {/* ── TABLE TITLE: JENIS PEKERJAAN ── */}
          <div className="bg-[#e2e8f0] text-center font-bold uppercase text-[8.5pt] py-1 border-b-2 border-slate-900">
            JENIS PEKERJAAN
          </div>

          {/* ── UNIFIED TABLE FOR PERMIT TYPES (PERFECT HORIZONTAL & BOTTOM ALIGNMENT) ── */}
          <PtwChecklistTable
            permitType={record.permitType}
            subTypes={record.subTypes as any}
            checkedEquipment={extractCheckedEquipment(record.controlSteps, (record as any).checkedEquipment, record.permitType)}
          />

          {/* ── ALAT PELINDUNG DIRI (APD) WAJIB ── */}
          <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-slate-50/80">
            <span className="font-bold block text-[7.5pt] text-slate-900">ALAT PELINDUNG DIRI (APD) WAJIB :</span>
            <div className="flex flex-wrap gap-1.5 mt-1 font-semibold text-slate-800">
              {ppeList.length > 0 ? (
                ppeList.map((apd) => (
                  <span key={apd} className="inline-block bg-white border border-slate-400 rounded px-2 py-0.5 text-[7.5pt] shadow-2xs">
                    ☑ {apd}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 italic">Standard K3 APD (Helmet, Safety Shoes, Glasses)</span>
              )}
            </div>
          </div>

          {/* ── DESKRIPSI PEKERJAAN ── */}
          <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-white">
            <span className="font-bold block text-[7.5pt] text-slate-900 uppercase tracking-wide">
              DESKRIPSI PEKERJAAN :
            </span>
            <div className="text-[7.5pt] text-slate-700 mt-0.5 leading-relaxed whitespace-pre-wrap font-medium">
              {cleanPtwDescription(record.description) || record.description || record.additionalNotes || (record as any).controlSteps || <span className="text-slate-400 italic text-[7pt]">— Tidak ada deskripsi pekerjaan —</span>}
            </div>
          </div>

          {/* ── LAMPIRAN DOKUMEN PENDUKUNG & QR CODE ── */}
          <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-slate-50/90 grid grid-cols-12 gap-3 items-center">
            <div className="col-span-9 space-y-0.5">
              <span className="font-bold text-[8.5pt] text-slate-900 block uppercase tracking-wide">
                LAMPIRAN DOKUMEN PENDUKUNG (JSA / WORK PLAN)
              </span>
              <p className="text-[7.5pt] text-slate-700 leading-snug">
                Dokumen JSA & Prosedur Keselamatan Kerja K3 terintegrasi secara digital. Scan QR Code di samping atau buka tautan publik di bawah ini untuk mengunduh/melihat berkas lampiran.
              </p>
              <div className="text-[6.5pt] font-mono text-slate-600 pt-0.5 break-all" suppressHydrationWarning>
                URL Publik: {origin ? `${origin}/review/ptw/${record.id}` : `/review/ptw/${record.id}`}
              </div>
            </div>
            {(() => {
              const qrBaseUrl = typeof window !== 'undefined' && window.location?.origin
                ? window.location.origin
                : origin || 'https://hero.chitraparatama.com'
              const qrTargetUrl = `${qrBaseUrl}/review/ptw/${encodeURIComponent(record.id)}`
              return (
                <a
                  href={qrTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-3 flex flex-col items-center justify-center border-l border-slate-900 pl-2 cursor-pointer no-underline text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Klik / Scan untuk membuka lampiran PTW"
                >
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrTargetUrl)}`}
                    alt="QR Code Lampiran PTW"
                    className="size-14 object-contain border border-slate-900 p-0.5 bg-white rounded hover:scale-105 transition-transform"
                  />
                  <span className="text-[6pt] font-bold text-slate-900 mt-1 uppercase text-center underline underline-offset-1">
                    Klik / Scan QR
                  </span>
                </a>
              )
            })()}
          </div>

          {/* ── MASA BERLAKU IKB ── */}
          <div className="border-b-2 border-slate-900 text-[8pt]">
            <div className="bg-slate-100 text-center font-bold uppercase py-0.5 border-b border-slate-900 text-[8pt]">
              MASA BERLAKU IKB (IJIN KERJA BERBAHAYA)
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-900">
              <div className="grid grid-cols-2 divide-x divide-slate-900 border-r border-slate-900">
                <div className="p-1 text-center">
                  <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL MULAI</span>
                  <span className="font-semibold">{formatDate(record.startDate)}</span>
                </div>
                <div className="p-1 text-center">
                  <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU MULAI</span>
                  <span className="font-semibold">{record.startTime || "08:00"}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-900">
                <div className="p-1 text-center">
                  <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL BERAKHIR</span>
                  <span className="font-semibold">{formatDate(record.endDate)}</span>
                </div>
                <div className="p-1 text-center">
                  <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU BERAKHIR</span>
                  <span className="font-semibold">{record.endTime || "17:00"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── VERIFIKASI & TANDA TANGAN (3 COLUMNS: Pemberi Kerja -> Pelaksana Kerja -> Safety Dept) ── */}
          <div className="grid grid-cols-3 divide-x-2 divide-slate-900 border-b-2 border-slate-900 text-[8pt]">
            {/* 1. PEMBERI KERJA */}
            <div className="p-1.5 text-center flex flex-col justify-between">
              <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PEMBERI KERJA</div>
              <div className="h-14 flex items-center justify-center my-1">
                {record.signatures?.step1 ? (
                  <img src={record.signatures.step1} alt="TTD" className="max-h-12 object-contain" />
                ) : (
                  <span className="text-[7pt] text-slate-400 italic">Ditandatangani Digital</span>
                )}
              </div>
              <div className="border-t border-slate-900 pt-1 font-bold">{record.fieldPic || "NAMA & TANDA TANGAN"}</div>
            </div>

            {/* 2. PELAKSANA PEKERJAAN */}
            <div className="p-1.5 text-center flex flex-col justify-between">
              <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PELAKSANA PEKERJAAN</div>
              <div className="h-14 flex items-center justify-center my-1">
                {record.signatures?.step2 ? (
                  <img src={record.signatures.step2} alt="TTD" className="max-h-12 object-contain" />
                ) : (
                  <span className="text-[7pt] text-slate-400 italic">Ditandatangani Digital</span>
                )}
              </div>
              <div className="border-t border-slate-900 pt-1 font-bold">{record.applicant || "NAMA & TANDA TANGAN"}</div>
            </div>

            {/* 3. VERIFIKASI (SAFETY DEPT) */}
            <div className="p-1.5 text-center flex flex-col justify-between">
              <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">VERIFIKASI (SAFETY DEPT)</div>
              <div className="h-14 flex items-center justify-center my-1">
                {record.signatures?.step3 ? (
                  <img src={record.signatures.step3} alt="TTD" className="max-h-12 object-contain" />
                ) : (
                  <span className="text-[7pt] text-slate-400 italic">Ditandatangani Digital</span>
                )}
              </div>
              <div className="border-t border-slate-900 pt-1 font-bold">{record.authorizedBy || "NAMA & TANDA TANGAN"}</div>
            </div>
          </div>

          {/* ── CATATAN FOOTER ── */}
          <div className="p-2 text-[7pt] space-y-0.5 bg-slate-50 flex items-start justify-between">
            <div>
              <span className="font-bold block text-slate-900">CATATAN :</span>
              <div>1. Ijin kerja ini hanya berlaku untuk satu area kerja saja.</div>
              <div>2. Ijin kerja ini selalu berada ditempat kerja</div>
              <div>3. Dilarang melakukan pekerjaan sebelum ada ijin kerja</div>
            </div>
            <div className="text-right text-slate-500 font-mono text-[6.5pt] pt-1 shrink-0">
              No. Form: CP-F-SHE-026 / P-HSE-SOP-031.00
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}