'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FilePenLine,
  Loader2,
  Maximize2,
  Minimize2,
  Printer,
  Search,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { submitSummaryAction } from '@/app/dashboard/summary/actions';
import { downloadElementAsPdf } from '@/lib/pdf-download';
import { SummaryApprovalDialog } from './summary-approval-dialog';

type SummaryData = {
  id: number;
  summaryNumber: string;
  status: string;
  generatedAt: Date | null;
  approvedAt: Date | null;
  sectionName: string;
  departmentName: string;
  generatedByName: string;
  targetSite?: string;
  submitterSignatureUrl: string | null;
  items: Array<{
    employeeName: string;
    employeeSn: string;
    siteName: string;
    itemName: string;
    quantity: number;
    requestType: string;
  }>;
  approvals: Array<{
    level: number;
    approverName: string;
    approverJobTitle?: string;
    status: string;
    signatureUrl: string | null;
    decisionNote: string | null;
    reviewedAt: Date | null;
  }>;
};

// Columns that are just QTY
const QTY_ONLY_COLUMNS = [
  'Helmet', 'Safety Glasses', 'Masker Kain', 'Ear Plug',
  '3M Cartridge', 'Hand Glove (Kabel)', 'Hand Glove (Knit)',
  'Respirator Fullset', 'Hand Glove (Cotton)', 'Tool Box', 'Neck Guard',
  'Head Gear', 'Hard Helmet',
];

// Safety Shoes has QTY + SIZE + Masa Pakai
const SAFETY_SHOES_COL = 'Safety Shoes';

const APD_COLUMNS = [...QTY_ONLY_COLUMNS, SAFETY_SHOES_COL];

export function SummaryPreview({ data }: { data: SummaryData }) {
  const router = useRouter();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Measure container and scale down document to fit mobile / small screens
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth;
        const targetWidth = 1000; // base width of summary sheet
        if (availableWidth < targetWidth) {
          setScale(availableWidth / targetWidth);
        } else {
          setScale(1);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handlePrintInPlace = () => {
    setPrinting(true);
    const existing = document.getElementById('summary-print-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'summary-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.src = `/print/summary/${data.id}`;

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error('Failed to print iframe:', err);
        } finally {
          setPrinting(false);
        }
      }, 500);
    };

    document.body.appendChild(iframe);
  };

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    const toastId = toast.loading('Menyiapkan file PDF...');
    try {
      if (exportRef.current) {
        const safeSummaryNum = (data.summaryNumber || `summary-${data.id}`).replace(/[^a-zA-Z0-9-_]/g, '_');
        await downloadElementAsPdf(
          exportRef.current,
          `Summary_APD_${safeSummaryNum}.pdf`,
          { orientation: 'landscape' }
        );
        toast.success('File PDF berhasil didownload!', { id: toastId });
      } else {
        window.open(`/print/summary/${data.id}`, '_blank');
        toast.dismiss(toastId);
      }
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      toast.error('Gagal generate PDF langsung, membuka halaman cetak...', { id: toastId });
      window.open(`/print/summary/${data.id}`, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  // Group items by employee
  const groupedByEmployee = data.items.reduce((acc, item) => {
    if (!acc[item.employeeName]) {
      acc[item.employeeName] = {
        name: item.employeeName,
        sn: item.employeeSn,
        site: item.siteName,
        items: {} as Record<string, number>,
      };
    }
    acc[item.employeeName].items[item.itemName] = (acc[item.employeeName].items[item.itemName] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, { name: string; sn: string; site: string; items: Record<string, number> }>);

  const employees = Object.values(groupedByEmployee);

  // Get unique sites
  const sites = [...new Set(employees.map(e => e.site))];

  // Calculate totals per column
  const totals = APD_COLUMNS.reduce((acc, col) => {
    acc[col] = employees.reduce((sum, emp) => sum + (emp.items[col] || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const handleSubmit = async (signatureUrl: string) => {
    try {
      const result = await submitSummaryAction(data.id, signatureUrl);
      if (result.success) {
        toast.success('Summary berhasil disubmit ke approval flow!');
        router.push('/dashboard/summary');
      } else {
        toast.error(result.error || 'Gagal submit summary');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal submit summary');
    }
  };

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Renders the exact A4 Landscape document content
  const renderDocumentContent = () => (
    <div className="w-[1000px] bg-white border border-slate-300 shadow-sm text-slate-800 select-none overflow-hidden" style={{ minHeight: '620px' }}>
      {/* Header */}
      <div className="bg-white px-8 pt-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-14 w-auto object-contain" />
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-gray-900 uppercase">
              Summary Permintaan Barang Safety
              {data.targetSite === 'VALE' && <span className="text-orange-600"> (Khusus VALE)</span>}
              {data.targetSite === 'GABUNGAN' && <span className="text-blue-600"> (Gabungan Site)</span>}
            </div>
            <div className="text-sm font-semibold text-gray-700 mt-0.5">{data.sectionName}</div>
          </div>
        </div>
        <div className="text-xs text-gray-700 space-y-0.5">
          <div><span className="font-semibold">Tanggal Pengajuan:</span> {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : today}</div>
          <div><span className="font-semibold">Department &amp; Lokasi:</span> {data.departmentName} — {sites.join(', ')}</div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pb-4">
        <table className="w-full border-collapse border border-gray-800 text-[11px]">
          <thead>
            {/* Row 1: Main headers */}
            <tr className="bg-gray-100">
              <th className="border border-gray-800 px-1 py-1.5 text-center font-bold" rowSpan={2} style={{ width: 30 }}>No</th>
              <th className="border border-gray-800 px-2 py-1.5 text-left font-bold" rowSpan={2} style={{ width: 140 }}>Nama Karyawan</th>
              <th className="border border-gray-800 px-1 py-1.5 text-center font-bold" rowSpan={2} style={{ width: 55 }}>SN</th>
              <th className="border border-gray-800 px-1 py-1.5 text-center font-bold" rowSpan={2} style={{ width: 75 }}>Site</th>
              {QTY_ONLY_COLUMNS.map((col) => (
                <th key={col} className="border border-gray-800 px-0.5 py-1 text-center font-bold text-[9px]" rowSpan={2} style={{ minWidth: 36, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', maxHeight: 100 }}>
                  {col}
                </th>
              ))}
              {/* Safety Shoes: parent header */}
              <th className="border border-gray-800 px-1 py-1 text-center font-bold text-[10px]" colSpan={3}>{SAFETY_SHOES_COL}</th>
            </tr>
            {/* Row 2: Safety Shoes sub-headers */}
            <tr className="bg-gray-100 text-[9px]">
              <th className="border border-gray-800 px-0.5 py-1 text-center font-bold" style={{ minWidth: 28 }}>QTY</th>
              <th className="border border-gray-800 px-0.5 py-1 text-center font-bold" style={{ minWidth: 28 }}>Size</th>
              <th className="border border-gray-800 px-0.5 py-1 text-center font-bold" style={{ minWidth: 40 }}>Masa Pakai</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border border-gray-800 px-1 py-2 text-center">{idx + 1}</td>
                <td className="border border-gray-800 px-2 py-2 whitespace-nowrap font-medium">{emp.name}</td>
                <td className="border border-gray-800 px-1 py-2 text-center text-[9px] font-mono">{emp.sn}</td>
                <td className="border border-gray-800 px-1 py-2 text-center text-[9px]">{emp.site}</td>
                {QTY_ONLY_COLUMNS.map((col) => (
                  <td key={col} className="border border-gray-800 px-0.5 py-2 text-center font-semibold">
                    {emp.items[col] || ''}
                  </td>
                ))}
                {/* Safety Shoes: QTY */}
                <td className="border border-gray-800 px-0.5 py-2 text-center font-semibold">{emp.items['Safety Shoes'] || ''}</td>
                {/* Safety Shoes: SIZE */}
                <td className="border border-gray-800 px-0.5 py-2 text-center text-[9px]">{emp.items['Safety Shoes Size'] || ''}</td>
                {/* Safety Shoes: Masa Pakai */}
                <td className="border border-gray-800 px-0.5 py-2 text-center text-[9px]">{emp.items['Safety Shoes Masa Pakai'] || ''}</td>
              </tr>
            ))}
            {/* Empty rows to fill 8 */}
            {Array.from({ length: Math.max(0, 8 - employees.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-gray-800 px-1 py-2 text-center">{employees.length + i + 1}</td>
                {Array.from({ length: QTY_ONLY_COLUMNS.length + 6 }).map((_, j) => (
                  <td key={j} className="border border-gray-800 px-1 py-2">&nbsp;</td>
                ))}
              </tr>
            ))}
            {/* Total Qty row */}
            <tr className="bg-gray-100 font-bold">
              <td className="border border-gray-800 px-2 py-2 text-center" colSpan={4}>Total Qty</td>
              {QTY_ONLY_COLUMNS.map((col) => (
                <td key={col} className="border border-gray-800 px-0.5 py-2 text-center font-bold">
                  {totals[col] || ''}
                </td>
              ))}
              <td className="border border-gray-800 px-0.5 py-2 text-center font-bold">{totals['Safety Shoes'] || ''}</td>
              <td className="border border-gray-800 px-0.5 py-2 text-center">—</td>
              <td className="border border-gray-800 px-1 py-2 text-center">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature section */}
      <div className="px-8 py-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-8">
          {/* Diajukan Oleh */}
          <div className="text-center">
            <div className="text-xs font-bold mb-2 text-gray-800">Diajukan Oleh,</div>
            <div className="mb-2 flex items-end justify-center" style={{ minHeight: '65px' }}>
              <div className="w-40 border-b border-gray-400 pb-1">
                {data.submitterSignatureUrl ? (
                  <img src={data.submitterSignatureUrl} alt="TTD" className="h-14 w-auto mx-auto object-contain" />
                ) : (
                  <div className="h-14 flex items-center justify-center text-[10px] text-gray-400 italic">Belum ditandatangani</div>
                )}
              </div>
            </div>
            <div className="text-[11px] text-gray-600 font-medium">({data.sectionName})</div>
            <div className="text-xs font-bold text-gray-900 mt-0.5">{data.generatedByName}</div>
            {data.generatedAt && (
              <div className="text-[9px] text-gray-500 mt-0.5">{new Date(data.generatedAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            )}
          </div>

          {/* Diperiksa Oleh */}
          <div className="text-center">
            <div className="text-xs font-bold mb-2 text-gray-800">Diperiksa Oleh,</div>
            <div className="mb-2 flex items-end justify-center" style={{ minHeight: '65px' }}>
              <div className="w-40 border-b border-gray-400 pb-1">
                {data.approvals.find(a => a.level === 1)?.signatureUrl ? (
                  <img src={data.approvals.find(a => a.level === 1)!.signatureUrl!} alt="TTD" className="h-14 w-auto mx-auto object-contain" />
                ) : (
                  <div className="h-14 flex items-center justify-center text-[10px] text-amber-600/70 italic font-semibold">Menunggu Approval</div>
                )}
              </div>
            </div>
            <div className="text-[11px] text-gray-600 font-medium">(Section Head — {data.sectionName})</div>
            <div className="text-xs font-bold text-gray-900 mt-0.5">{data.approvals.find(a => a.level === 1)?.approverName || '...'}</div>
            {data.approvals.find(a => a.level === 1)?.reviewedAt && (
              <div className="text-[9px] text-gray-500 mt-0.5">{new Date(data.approvals.find(a => a.level === 1)!.reviewedAt!).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            )}
            {data.approvals.find(a => a.level === 1)?.decisionNote && (
              <div className="text-[9px] text-slate-600 mt-0.5 italic">"{data.approvals.find(a => a.level === 1)!.decisionNote}"</div>
            )}
          </div>

          {/* Disetujui Oleh */}
          <div className="text-center">
            <div className="text-xs font-bold mb-2 text-gray-800">Disetujui Oleh,</div>
            <div className="mb-2 flex items-end justify-center" style={{ minHeight: '65px' }}>
              <div className="w-40 border-b border-gray-400 pb-1">
                {data.approvals.find(a => a.level === 2)?.signatureUrl ? (
                  <img src={data.approvals.find(a => a.level === 2)!.signatureUrl!} alt="TTD" className="h-14 w-auto mx-auto object-contain" />
                ) : (
                  <div className="h-14 flex items-center justify-center text-[10px] text-amber-600/70 italic font-semibold">Menunggu Approval</div>
                )}
              </div>
            </div>
            <div className="text-[11px] text-gray-600 font-medium">(Department Head — {data.departmentName})</div>
            <div className="text-xs font-bold text-gray-900 mt-0.5">{data.approvals.find(a => a.level === 2)?.approverName || '...'}</div>
            {data.approvals.find(a => a.level === 2)?.reviewedAt && (
              <div className="text-[9px] text-gray-500 mt-0.5">{new Date(data.approvals.find(a => a.level === 2)!.reviewedAt!).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            )}
            {data.approvals.find(a => a.level === 2)?.decisionNote && (
              <div className="text-[9px] text-slate-600 mt-0.5 italic">"{data.approvals.find(a => a.level === 2)!.decisionNote}"</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const computeFitScale = () => {
    if (typeof window === 'undefined') return 1;
    const padding = window.innerWidth < 640 ? 16 : 48;
    const availableWidth = window.innerWidth - padding;
    return Math.min(1, Math.max(0.25, Number((availableWidth / 1000).toFixed(3))));
  };

  const openZoomModal = () => {
    const fit = computeFitScale();
    setZoomLevel(fit);
    setIsZoomModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/summary')}
          className="hidden sm:inline-flex h-8.5 gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl"
        >
          <ArrowLeft className="size-3.5" />
          <span>Kembali ke Daftar Summary</span>
        </Button>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
          {/* Download PDF Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex-1 sm:flex-initial h-8.5 gap-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border-slate-200/80 rounded-xl shadow-2xs cursor-pointer"
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin text-blue-600" />
            ) : (
              <Download className="size-3.5 text-blue-600" />
            )}
            <span>{downloading ? 'Mengunduh...' : 'Download PDF'}</span>
          </Button>

          {/* Cetak PDF (Hanya di Desktop) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintInPlace}
            disabled={printing}
            className="hidden sm:inline-flex h-8.5 gap-1.5 text-xs font-bold border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 rounded-xl shadow-2xs"
          >
            {printing ? (
              <Loader2 className="size-3.5 animate-spin text-emerald-600" />
            ) : (
              <Printer className="size-3.5 text-emerald-600" />
            )}
            <span>Cetak PDF</span>
          </Button>

          {/* Tanda Tangan Submit (Draft) */}
          {data.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => setShowApprovalDialog(true)}
              className="h-8.5 gap-1.5 text-xs font-bold bg-[#003461] text-white hover:bg-[#00274a] rounded-xl shadow-xs"
            >
              <FilePenLine className="size-3.5" />
              <span>Tanda Tangan &amp; Submit</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Preview Container with Scaled Viewport & Click-to-Zoom */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2 sm:p-4 shadow-xs overflow-hidden">
        {/* Helper Badge / Bar */}
        <div className="mb-2 flex items-center justify-between px-1 text-xs text-slate-500">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            Pratinjau Dokumen Summary ({data.summaryNumber})
          </span>
          <button
            type="button"
            onClick={openZoomModal}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#003461] border border-slate-200 shadow-2xs hover:bg-blue-50/50 transition cursor-pointer"
          >
            <Maximize2 className="size-3" />
            <span>Klik untuk Perbesar</span>
          </button>
        </div>

        {/* Scaled Preview Area */}
        <div
          ref={containerRef}
          onClick={openZoomModal}
          className="relative w-full cursor-zoom-in rounded-xl bg-white shadow-sm overflow-hidden flex justify-center border border-slate-200/70 hover:ring-2 hover:ring-[#003461]/30 transition group"
          style={{ height: scale < 1 ? `${630 * scale + 20}px` : 'auto' }}
        >
          {/* Overlay on hover */}
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors pointer-events-none">
            <div className="rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-md border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
              <Maximize2 className="size-3.5 text-[#003461]" />
              <span>Ketuk untuk Memperbesar</span>
            </div>
          </div>

          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              width: '1000px',
              transition: 'transform 0.15s ease-out',
            }}
          >
            {renderDocumentContent()}
          </div>
        </div>
      </div>

      {/* Fullscreen Zoom Lightbox Dialog */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
          {/* Top Bar - Ultra-compact on mobile to prevent clipping */}
          <div className="flex items-center justify-between gap-1.5 border-b border-white/10 bg-slate-900/90 px-2.5 py-2 sm:px-4 sm:py-3 text-white">
            {/* Left: Summary Number */}
            <div className="flex items-center gap-1.5 min-w-0 shrink">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 hidden xs:inline">Preview</span>
              <span className="text-xs font-mono font-bold truncate max-w-[85px] sm:max-w-none">{data.summaryNumber}</span>
            </div>

            {/* Center: Zoom Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.25, Number((z - 0.1).toFixed(2))))}
                className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer active:scale-95"
                title="Zoom Out"
              >
                <ZoomOut className="size-3.5 sm:size-4" />
              </button>
              <span className="min-w-9 sm:min-w-12 text-center text-[10px] sm:text-xs font-mono font-bold">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer active:scale-95"
                title="Zoom In"
              >
                <ZoomIn className="size-3.5 sm:size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const fit = computeFitScale();
                  setZoomLevel((z) => (Math.abs(z - 1) < 0.05 ? fit : 1));
                }}
                className="rounded-lg bg-white/10 px-2 py-1 text-[10px] sm:text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer active:scale-95"
                title="Toggle Fit / 100%"
              >
                {Math.abs(zoomLevel - 1) < 0.05 ? 'Fit' : '100%'}
              </button>
            </div>

            {/* Right: Actions & Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="h-7 sm:h-8 px-2 sm:px-3 gap-1 text-[11px] sm:text-xs font-bold bg-white text-slate-900 border-0 rounded-lg cursor-pointer active:scale-95"
              >
                {downloading ? (
                  <Loader2 className="size-3.5 animate-spin text-slate-900" />
                ) : (
                  <Download className="size-3.5 text-[#003461]" />
                )}
                <span className="hidden sm:inline">{downloading ? 'Mengunduh...' : 'Download'}</span>
              </Button>
              <button
                type="button"
                onClick={() => setIsZoomModalOpen(false)}
                className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-rose-600 text-white transition cursor-pointer active:scale-95"
                title="Tutup Preview"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Viewport with auto-centering & full-bleed document container */}
          <div className="flex-1 overflow-auto p-2 sm:p-6 flex items-start justify-center">
            <div
              style={{
                width: `${1000 * zoomLevel}px`,
                height: `${630 * zoomLevel}px`,
                minWidth: `${1000 * zoomLevel}px`,
                minHeight: `${630 * zoomLevel}px`,
                position: 'relative',
                transition: 'width 0.12s ease-out, height 0.12s ease-out',
              }}
            >
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top left',
                  width: '1000px',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transition: 'transform 0.12s ease-out',
                }}
                className="rounded-lg shadow-2xl bg-white"
              >
                {renderDocumentContent()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <SummaryApprovalDialog
          summaryId={data.id}
          summaryNumber={data.summaryNumber}
          onSubmit={handleSubmit}
          onClose={() => setShowApprovalDialog(false)}
        />
      )}

      {/* Dedicated high-res off-screen container for crisp A4 Landscape PDF capture */}
      <div style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -9999, overflow: 'hidden' }}>
        <div ref={exportRef} className="w-[1000px] bg-white">
          {renderDocumentContent()}
        </div>
      </div>
    </div>
  );
}

