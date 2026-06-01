"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

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
  gasTestRequired: boolean;
  isolationRequired: boolean;
  attachmentName: string;
};

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="min-h-10 border-b border-slate-200 px-2 py-1.5"><p className="text-[7px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="text-[10px] font-bold leading-snug text-slate-900">{value || "-"}</p></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="break-inside-avoid border border-slate-300"><h3 className="border-b border-slate-300 bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-800">{title}</h3><div className="p-3 text-[11px] font-semibold leading-relaxed text-slate-900">{children}</div></section>;
}

function Signature({ title, name }: { title: string; name: string }) {
  return <div className="h-28 border border-slate-300 p-2 text-center"><p className="text-[8px] font-black uppercase tracking-wide text-slate-500">{title}</p><div className="h-14" /><p className="border-t border-slate-300 pt-1 text-[9px] font-bold text-slate-900">{name || "-"}</p></div>;
}

export function IzinKerjaPtwPrintPage() {
  const [record, setRecord] = useState<PtwPrintRecord | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("hero-ptw-print-record");
    if (raw) setRecord(JSON.parse(raw));
  }, []);

  if (!record) {
    return <div className="p-8 font-semibold text-slate-700">Dokumen PTW tidak ditemukan. Buka dari tombol Download PDF / Cetak Dokumen di menu Izin Kerja PTW.</div>;
  }

  return (
    <main className="min-h-screen bg-slate-200 text-slate-900 print:bg-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .ptw-a4-sheet { width: 194mm !important; min-height: 281mm !important; max-width: 194mm !important; margin: 0 auto !important; padding: 7mm !important; border: none !important; box-shadow: none !important; }
          .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      ` }} />
      <div className="no-print sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div><p className="text-sm font-black uppercase text-slate-900">Izin Kerja PTW</p><p className="text-xs font-semibold text-slate-500">{record.projectName}</p></div>
        <Button className="gap-2 bg-[#1a2332] text-white hover:bg-[#1a2332]/90" onClick={() => window.print()}><Printer className="size-4" /> Cetak / Save PDF</Button>
      </div>

      <div className="py-6 print:py-0">
        <article className="ptw-a4-sheet mx-auto bg-white p-8 shadow-xl">
          <header className="grid grid-cols-[120px_1fr_84px] items-center border-2 border-slate-900">
            <div className="flex h-20 items-center justify-center border-r-2 border-slate-900 p-2">
              <Image src="/cp_logo-removebg-preview.png" alt="PT Chitra Paratama Logo" width={96} height={48} className="object-contain" />
            </div>
            <div className="h-20 px-4 py-3 text-center">
              <h1 className="font-display text-lg font-black uppercase tracking-tight text-slate-950">PT. CHITRA PARATAMA</h1>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">Permit To Work / Izin Kerja Aman</p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-slate-500">Safety First | Collaborate - Innovate - Dominate</p>
            </div>
            <div className="flex h-20 flex-col justify-center border-l-2 border-slate-900 text-center text-[8px] font-black uppercase text-slate-900">
              <span>Official</span><span>HSE</span><span>System</span>
            </div>
          </header>

          <div className="grid grid-cols-4 border-x-2 border-b-2 border-slate-900">
            <Field label="Document ID" value={record.id} />
            <Field label="Status" value={record.status} />
            <Field label="Risk Level" value={record.risk} />
            <Field label="Permit Type" value={record.permitType} />
          </div>

          <div className="mt-4 border-2 border-slate-900">
            <div className="border-b-2 border-slate-900 bg-slate-900 px-3 py-2 text-white">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Judul Pekerjaan</p>
              <h2 className="mt-1 text-lg font-black uppercase leading-tight">{record.projectName}</h2>
            </div>
            <div className="grid grid-cols-4">
              <Field label="Lokasi" value={record.location} />
              <Field label="Area" value={record.area} />
              <Field label="Mulai" value={`${formatDate(record.startDate)} ${record.startTime}`} />
              <Field label="Selesai" value={`${formatDate(record.endDate)} ${record.endTime}`} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Section title="Pemohon"><p>{record.applicant}</p></Section>
            <Section title="PIC Lapangan"><p>{record.fieldPic}</p></Section>
            <Section title="Disetujui Oleh"><p>{record.authorizedBy}</p></Section>
          </div>

          <div className="mt-4 grid gap-4">
            <Section title="Deskripsi Pekerjaan"><div className="whitespace-pre-wrap">{record.description || "-"}</div></Section>
            <Section title="Kontrol Risiko / Checklist Keamanan"><div className="whitespace-pre-wrap">{record.controlSteps || "-"}</div></Section>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_1fr] gap-4">
            <Section title="APD Wajib"><div className="flex flex-wrap gap-1.5">{record.ppe.map((item) => <span key={item} className="border border-slate-300 px-2 py-1 text-[9px] font-bold uppercase">{item}</span>)}</div></Section>
            <Section title="Critical Checks"><div className="grid grid-cols-2 gap-2 text-[10px]"><p><b>Gas Test:</b> {record.gasTestRequired ? "Required" : "Optional"}</p><p><b>Isolation / LOTO:</b> {record.isolationRequired ? "Required" : "Optional"}</p><p className="col-span-2"><b>Attachment:</b> {record.attachmentName || "-"}</p></div></Section>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Signature title="Pemohon" name={record.applicant} />
            <Signature title="HSE Officer" name={record.authorizedBy} />
            <Signature title="Supervisor Lapangan" name={record.fieldPic} />
          </div>
        </article>
      </div>
    </main>
  );
}