'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateSummaryAction } from '@/app/dashboard/summary/actions';
import type { SectionWithSummary } from '@/components/summary/summary-list';

interface MobileSummaryClientProps {
  sections: SectionWithSummary[];
  currentEmployeeId?: number;
}

export function MobileSummaryClient({ sections, currentEmployeeId = 0 }: MobileSummaryClientProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState<'all' | 'GABUNGAN' | 'VALE'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'uncreated' | 'draft' | 'pending' | 'approved'>('all');
  const [printingId, setPrintingId] = useState<number | null>(null);

  const handlePrintInPlace = (summaryId: number) => {
    setPrintingId(summaryId);
    const existing = document.getElementById('summary-print-iframe');
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'summary-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.src = `/print/summary/${summaryId}`;

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error('Failed to print iframe:', err);
        } finally {
          setPrintingId(null);
        }
      }, 500);
    };

    document.body.appendChild(iframe);
  };

  const handleGenerate = async (section: SectionWithSummary) => {
    const generateId = `${section.id}-${section.targetSite}`;
    setGenerating(generateId);
    try {
      const empId = currentEmployeeId || 5;
      const result = await generateSummaryAction(section.id, empId, section.targetSite);
      if (result.success && result.summaryId) {
        toast.success(`Summary untuk section ${section.name} berhasil dibuat!`);
        router.push(`/mobile/summary?preview=${result.summaryId}`);
      } else {
        toast.error(result.error || 'Gagal generate summary');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem saat generate summary');
    } finally {
      setGenerating(null);
    }
  };

  const exportToExcel = () => {
    const excelRows = filtered.map((sec, idx) => ({
      No: idx + 1,
      Section: sec.name,
      'Kode Section': sec.code || '-',
      'Target Site': sec.targetSite === 'VALE' ? 'Khusus VALE' : 'Gabungan Site Lain',
      'Approved Requests': sec.approvedCount,
      'Status Summary': sec.summaryStatus
        ? sec.summaryStatus.toUpperCase()
        : sec.approvedCount > 0
        ? 'BELUM DIGENERATE'
        : 'TIDAK ADA REQUEST',
      'Summary ID': sec.summaryId || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary APD');

    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 12 },
    ];

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Summary_APD_Sections_${today}.xlsx`);
    toast.success('Data summary APD berhasil diexport ke Excel!');
  };

  const filtered = sections.filter((section) => {
    if (selectedSite !== 'all' && section.targetSite !== selectedSite) return false;

    if (selectedStatus === 'uncreated') {
      if (section.summaryStatus !== null || section.approvedCount === 0) return false;
    } else if (selectedStatus === 'draft') {
      if (section.summaryStatus !== 'draft') return false;
    } else if (selectedStatus === 'pending') {
      if (section.summaryStatus !== 'pending_approval') return false;
    } else if (selectedStatus === 'approved') {
      if (section.summaryStatus !== 'approved') return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = section.name.toLowerCase().includes(q);
      const matchCode = section.code ? section.code.toLowerCase().includes(q) : false;
      if (!matchName && !matchCode) return false;
    }

    return true;
  });

  const totalSections = sections.length;
  const totalApprovedRequests = sections.reduce((acc, curr) => acc + curr.approvedCount, 0);
  const pendingCount = sections.filter((s) => s.summaryStatus === 'pending_approval').length;
  const approvedCount = sections.filter((s) => s.summaryStatus === 'approved').length;

  const getStatusBadge = (status: string | null, approvedReqCount: number) => {
    if (!status) {
      if (approvedReqCount > 0) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="size-3" />
            Siap Generate
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
          Tidak Ada Request
        </span>
      );
    }

    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            Draft
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="size-3" />
            Review Dept Head
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="size-3" />
            Disetujui
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header Banner */}
      <section className="rounded-xl bg-gradient-to-br from-[#003461] to-[#001f3d] p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/mobile/apd"
                className="flex size-8 items-center justify-center rounded-lg bg-white/10 active:scale-95 transition-transform"
              >
                <ArrowLeft className="size-4 text-blue-200" />
              </Link>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">HSE &bull; SUMMARY APD</p>
            </div>
            <h1 className="mt-2 text-xl font-black tracking-tight">Summary Permintaan APD</h1>
            <p className="mt-1 text-xs text-blue-100/80 leading-relaxed">
              Rekap batch APD per section &amp; site untuk proses PO &amp; persetujuan Dept Head.
            </p>
          </div>
          <Button
            onClick={exportToExcel}
            size="sm"
            className="shrink-0 h-9 bg-white/15 hover:bg-white/25 text-white text-xs border border-white/20 active:scale-95 transition-transform"
          >
            <FileSpreadsheet className="size-3.5 mr-1.5 text-emerald-300" />
            Excel
          </Button>
        </div>

        {/* Quick KPI Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/10 p-2.5 text-center">
            <p className="text-[10px] font-medium text-blue-200">Total Approved</p>
            <p className="mt-0.5 text-base font-bold text-emerald-300">{totalApprovedRequests}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-2.5 text-center">
            <p className="text-[10px] font-medium text-blue-200">Review Dept Head</p>
            <p className="mt-0.5 text-base font-bold text-amber-300">{pendingCount}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-2.5 text-center">
            <p className="text-[10px] font-medium text-blue-200">Disetujui</p>
            <p className="mt-0.5 text-base font-bold text-sky-300">{approvedCount}</p>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            placeholder="Cari nama section atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-white border-slate-200 text-xs shadow-xs"
          />
        </div>

        {/* Site Segmented Buttons */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-[11px] font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setSelectedSite('all')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              selectedSite === 'all' ? 'bg-white text-[#003461] shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Semua Site
          </button>
          <button
            type="button"
            onClick={() => setSelectedSite('VALE')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              selectedSite === 'VALE' ? 'bg-white text-orange-700 shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Khusus VALE
          </button>
          <button
            type="button"
            onClick={() => setSelectedSite('GABUNGAN')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              selectedSite === 'GABUNGAN' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Site Lain
          </button>
        </div>

        {/* Status Filter Badges */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { key: 'all', label: 'Semua Status' },
            { key: 'uncreated', label: 'Siap Generate' },
            { key: 'draft', label: 'Draft' },
            { key: 'pending', label: 'Review' },
            { key: 'approved', label: 'Approved' },
          ].map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setSelectedStatus(st.key as any)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                selectedStatus === st.key
                  ? 'bg-[#003461] text-white border-[#003461]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </section>

      {/* Cards List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Daftar Section ({filtered.length})
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white p-8 text-center shadow-xs">
            <FileText className="mx-auto size-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Tidak ada record summary</p>
            <p className="text-xs text-slate-400 mt-0.5">Coba sesuaikan kata kunci pencarian atau filter status.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((section) => {
              const isVale = section.targetSite === 'VALE';
              const isGenerating = generating === `${section.id}-${section.targetSite}`;
              const isPrinting = printingId === section.summaryId;

              return (
                <article
                  key={`${section.id}-${section.targetSite}`}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 leading-tight">{section.name}</h2>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {section.code && (
                          <span className="text-[10px] text-slate-400 font-mono">Kode: {section.code}</span>
                        )}
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            isVale
                              ? 'bg-orange-50 text-orange-800 border-orange-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {isVale ? 'VALE' : 'GABUNGAN'}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(section.summaryStatus, section.approvedCount)}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-xs text-slate-600">
                    <div>
                      <span className="text-[11px] text-slate-400">Approved: </span>
                      <span className="font-bold text-emerald-700">{section.approvedCount} request</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Generate button if no summary created yet */}
                      {section.approvedCount > 0 && !section.summaryStatus && (
                        <Button
                          onClick={() => handleGenerate(section)}
                          disabled={!!isGenerating}
                          size="sm"
                          className="h-8 bg-[#003461] hover:bg-[#00274a] text-white text-xs font-semibold px-3 active:scale-95 transition-transform"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                              Membuat...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-1.5 size-3.5 text-amber-300" />
                              Generate
                            </>
                          )}
                        </Button>
                      )}

                      {/* Preview button if summary exists */}
                      {section.summaryId && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 border-slate-200 text-xs font-semibold px-3 text-[#003461] active:scale-95 transition-transform"
                        >
                          <Link href={`/mobile/summary?preview=${section.summaryId}`}>
                            <Eye className="mr-1.5 size-3.5" />
                            Preview
                          </Link>
                        </Button>
                      )}

                      {/* Print button if summary exists */}
                      {section.summaryId && (
                        <Button
                          onClick={() => handlePrintInPlace(section.summaryId!)}
                          disabled={isPrinting}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-slate-500 hover:text-slate-900 active:scale-95"
                          title="Cetak Dokumen"
                        >
                          {isPrinting ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Printer className="size-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
