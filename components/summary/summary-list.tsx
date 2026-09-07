'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
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

export type SectionWithSummary = {
  id: number;
  name: string;
  code: string;
  departmentId: number;
  headEmployeeId: number | null;
  targetSite: string;
  approvedCount: number;
  summaryStatus: string | null;
  summaryId: number | null;
};

interface SummaryListProps {
  sections: SectionWithSummary[];
  currentEmployeeId?: number;
}

export function SummaryList({ sections, currentEmployeeId = 0 }: SummaryListProps) {
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
      if (result.success && 'summaryId' in result && result.summaryId) {
        toast.success(`Summary untuk section ${section.name} berhasil dibuat!`);
        router.push(`/dashboard/summary?preview=${result.summaryId}`);
      } else {
        toast.error(result.error || 'Gagal generate summary');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem saat generate summary');
    } finally {
      setGenerating(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          <AlertCircle className="size-3 text-slate-400" />
          Belum Dibuat
        </span>
      );
    }

    switch (status.toLowerCase()) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="size-3 text-emerald-600" />
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="size-3 text-blue-600" />
            Menunggu Approval
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="size-3 text-amber-600" />
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
            {status}
          </span>
        );
    }
  };

  // Filtered dataset
  const filtered = sections.filter((s) => {
    if (selectedSite !== 'all' && s.targetSite !== selectedSite) return false;
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'uncreated' && s.summaryStatus !== null) return false;
      if (selectedStatus === 'draft' && s.summaryStatus !== 'draft') return false;
      if (selectedStatus === 'pending' && s.summaryStatus !== 'pending') return false;
      if (selectedStatus === 'approved' && s.summaryStatus !== 'approved') return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // KPI calculations
  const totalSections = sections.length;
  const totalApprovedRequests = sections.reduce((acc, s) => acc + s.approvedCount, 0);
  const pendingCount = sections.filter((s) => s.summaryStatus === 'pending' || s.summaryStatus === 'draft').length;
  const approvedCount = sections.filter((s) => s.summaryStatus === 'approved').length;

  function exportToExcel() {
    const exportData = filtered.map((s, idx) => ({
      No: idx + 1,
      Section: s.name,
      Kode: s.code || '-',
      'Target Site': s.targetSite === 'VALE' ? 'Khusus VALE' : 'Gabungan Site Lain',
      'Approved Request': `${s.approvedCount} Permintaan`,
      'Status Summary': s.summaryStatus ? s.summaryStatus.toUpperCase() : 'BELUM DIBUAT',
      'Summary ID': s.summaryId ?? '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary APD');
    XLSX.writeFile(
      workbook,
      `Summary_Permintaan_Safety_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Summary Permintaan Barang Safety
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rekapitulasi dan monitoring permohonan APD per section dan site, generate form summary pemesanan, dan persetujuan Department Head.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            className="h-9 border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="mr-1.5 size-4 text-emerald-600" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* KPI Header Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Section Terdata</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{totalSections}</div>
          <div className="mt-1 text-[11px] text-slate-400">Seluruh area operasional</div>
        </div>

        <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Request Approved</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{totalApprovedRequests}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">Permintaan siap diproses</div>
        </div>

        <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Menunggu Approval</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">Verifikasi Dept Head</div>
        </div>

        <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Disetujui (Approved)</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{approvedCount}</div>
          <div className="mt-1 text-[11px] text-blue-700 font-medium">Siap proses vendor</div>
        </div>
      </div>

      {/* Command Bar & Filters */}
      <div className="rounded-xl border border-border/70 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
              <Input
                placeholder="Cari section atau kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-50/70"
              />
            </div>

            {/* Target Site Filter */}
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value as any)}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="all">Semua Target Site</option>
              <option value="GABUNGAN">Gabungan Site Lain</option>
              <option value="VALE">Khusus VALE</option>
            </select>

            {/* Status Summary Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="all">Semua Status Summary</option>
              <option value="uncreated">Belum Dibuat</option>
              <option value="draft">Draft</option>
              <option value="pending">Menunggu Approval</option>
              <option value="approved">Disetujui (Approved)</option>
            </select>

            {(search || selectedSite !== 'all' || selectedStatus !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedSite('all');
                  setSelectedStatus('all');
                }}
                className="h-8 text-xs text-slate-500 hover:text-slate-900"
              >
                Reset Filter
              </Button>
            )}
          </div>

          <div className="text-xs font-medium text-slate-500">
            Menampilkan <span className="font-semibold text-slate-800">{filtered.length}</span> dari {sections.length} record
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/70 bg-slate-50/90 text-slate-700">
              <tr>
                <th className="w-12 px-3.5 py-3 text-center font-semibold">No.</th>
                <th className="px-4 py-3 font-semibold">Section</th>
                <th className="px-4 py-3 font-semibold">Target Site</th>
                <th className="px-4 py-3 text-center font-semibold">Approved Request</th>
                <th className="px-4 py-3 font-semibold">Status Summary</th>
                <th className="px-4 py-3 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileText className="size-8 text-slate-300" />
                      <p className="font-medium text-slate-600">Tidak ada record summary yang sesuai</p>
                      <p className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau filter status</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((section, idx) => {
                  const isVale = section.targetSite === 'VALE';
                  const isGenerating = generating === `${section.id}-${section.targetSite}`;
                  const isPrinting = printingId === section.summaryId;

                  return (
                    <tr
                      key={`${section.id}-${section.targetSite}`}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-3.5 py-3 text-center font-medium text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{section.name}</div>
                        {section.code && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Kode: {section.code}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                            isVale
                              ? 'bg-orange-50 text-orange-800 border-orange-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {isVale ? 'Khusus VALE' : 'Gabungan Site Lain'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {section.approvedCount} request
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(section.summaryStatus)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Generate button if no summary created yet */}
                          {section.approvedCount > 0 && !section.summaryStatus && (
                            <Button
                              size="sm"
                              onClick={() => handleGenerate(section)}
                              disabled={isGenerating}
                              className="h-7 px-2.5 text-xs bg-slate-900 text-white hover:bg-slate-800 shadow-xs cursor-pointer gap-1 font-medium"
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="size-3 animate-spin" />
                                  Proses...
                                </>
                              ) : (
                                <>
                                  <Plus className="size-3.5" />
                                  Generate
                                </>
                              )}
                            </Button>
                          )}

                          {/* View Detail button */}
                          {section.summaryId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/summary?preview=${section.summaryId}`)}
                              className="h-7 px-2.5 text-xs border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs cursor-pointer gap-1 font-medium"
                            >
                              <Eye className="size-3.5 text-slate-500" />
                              Lihat
                            </Button>
                          )}

                          {/* Print PDF button */}
                          {section.summaryId && section.summaryStatus === 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintInPlace(section.summaryId!)}
                              disabled={isPrinting}
                              className="h-7 px-2.5 text-xs border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shadow-xs cursor-pointer gap-1 font-medium"
                            >
                              {isPrinting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Printer className="size-3.5 text-emerald-600" />
                              )}
                              Print
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
