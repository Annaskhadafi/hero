"use client";

import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export type IncidentPrintRecord = {
  id: number;
  title: string;
  category: string;
  severity: string;
  description: string;
  siteName: string;
  investigationStatus: string;
  incidentDate: string;
  picName: string;
  rootCauseAnalysis: string;
  immediateCorrectiveAction: string;
  documentationUrl: string;
  createdAt: string;
};

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="min-h-10 border-b border-slate-200 px-2 py-1.5"><p className="text-[7px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="text-[10px] font-bold leading-snug text-slate-900">{value || "-"}</p></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="break-inside-avoid border border-slate-300"><h3 className="border-b border-slate-300 bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-800">{title}</h3><div className="p-3 text-[11px] font-semibold leading-relaxed text-slate-900">{children}</div></section>;
}

function Signature({ title }: { title: string }) {
  return <div className="h-28 border border-slate-300 p-2 text-center"><p className="text-[8px] font-black uppercase tracking-wide text-slate-500">{title}</p><div className="h-16" /><p className="border-t border-slate-300 pt-1 text-[9px] font-bold text-slate-900">Nama / Tanda Tangan</p></div>;
}

export function IncidentReportPrintPage() {
  const [record, setRecord] = useState<IncidentPrintRecord | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("hero-incident-print-record");
    if (raw) setRecord(JSON.parse(raw));
  }, []);

  if (!record) {
    return <div className="p-8 font-semibold text-slate-700">Dokumen Incident Report tidak ditemukan. Buka dari tombol Cetak Dokumen di menu Incident Report.</div>;
  }

  return (
    <main className="min-h-screen bg-slate-200 text-slate-900 print:bg-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .incident-a4-sheet { width: 194mm !important; min-height: 281mm !important; max-width: 194mm !important; margin: 0 auto !important; padding: 7mm !important; border: none !important; box-shadow: none !important; }
          .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      ` }} />
      <div className="no-print sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div><p className="text-sm font-black uppercase text-slate-900">HSE Incident Report</p><p className="text-xs font-semibold text-slate-500">{record.title}</p></div>
        <Button className="gap-2 bg-[#1a2332] text-white hover:bg-[#1a2332]/90" onClick={() => window.print()}><Printer className="size-4" /> Cetak / Save PDF</Button>
      </div>

      <div className="py-6 print:py-0">
        <article className="incident-a4-sheet mx-auto bg-white p-8 shadow-xl">
          <header className="grid grid-cols-[120px_1fr_84px] items-center border-2 border-slate-900">
            <div className="flex h-20 items-center justify-center border-r-2 border-slate-900 p-2">
              <Image src="/cp_logo-removebg-preview.png" alt="PT Chitra Paratama Logo" width={96} height={48} className="object-contain" />
            </div>
            <div className="h-20 px-4 py-3 text-center">
              <h1 className="font-display text-lg font-black uppercase tracking-tight text-slate-950">PT. CHITRA PARATAMA</h1>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">HSE Incident Report</p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-slate-500">Safety First | Collaborate - Innovate - Dominate</p>
            </div>
            <div className="flex h-20 flex-col justify-center border-l-2 border-slate-900 text-center text-[8px] font-black uppercase text-slate-900">
              <span>Official</span><span>HSE</span><span>System</span>
            </div>
          </header>

          <div className="grid grid-cols-4 border-x-2 border-b-2 border-slate-900">
            <Field label="Report ID" value={`INC-${String(record.id).padStart(4, "0")}`} />
            <Field label="Status" value={record.investigationStatus} />
            <Field label="Severity" value={record.severity} />
            <Field label="Category" value={record.category} />
          </div>

          <div className="mt-4 border-2 border-slate-900">
            <div className="border-b-2 border-slate-900 bg-slate-900 px-3 py-2 text-white">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Judul Insiden</p>
              <h2 className="mt-1 text-lg font-black uppercase leading-tight">{record.title}</h2>
            </div>
            <div className="grid grid-cols-4">
              <Field label="Lokasi / Site" value={record.siteName} />
              <Field label="Tanggal Kejadian" value={formatDate(record.incidentDate)} />
              <Field label="PIC Investigator" value={record.picName} />
              <Field label="Dokumen Dibuat" value={formatDate(record.createdAt)} />
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <Section title="Deskripsi Kronologi Kejadian"><div className="whitespace-pre-wrap">{record.description || "-"}</div></Section>
            <div className="grid grid-cols-2 gap-4">
              <Section title="Root Cause Analysis (RCA)"><div className="whitespace-pre-wrap">{record.rootCauseAnalysis || "-"}</div></Section>
              <Section title="Tindakan Perbaikan & Pencegahan"><div className="whitespace-pre-wrap">{record.immediateCorrectiveAction || "-"}</div></Section>
            </div>
            <Section title="Lampiran Dokumen / Bukti"><div className="whitespace-pre-wrap">{record.documentationUrl || "Tidak ada lampiran"}</div></Section>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Signature title="Pelapor / PIC" />
            <Signature title="HSE Officer" />
            <Signature title="Management / Approver" />
          </div>
        </article>
      </div>
    </main>
  );
}