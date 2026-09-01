'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, FilePenLine, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { submitSummaryAction } from '@/app/dashboard/summary/actions';
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

  const totalQty = Object.values(totals).reduce((sum, v) => sum + v, 0);

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

  return (
    <div className="space-y-4">
      {/* Top bar with back and actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-border/70 shadow-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/summary')}
          className="h-8 gap-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Daftar Summary
        </Button>

        <div className="flex items-center gap-2">
          {data.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => setShowApprovalDialog(true)}
              className="h-8 gap-1.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm cursor-pointer"
            >
              <FilePenLine className="size-4" />
              Tanda Tangan &amp; Submit Approval
            </Button>
          )}

          {data.status === 'approved' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintInPlace}
              disabled={printing}
              className="h-8 gap-1.5 text-xs font-semibold border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-xs cursor-pointer"
            >
              {printing ? (
                <Loader2 className="size-4 animate-spin text-emerald-700" />
              ) : (
                <Printer className="size-4 text-emerald-700" />
              )}
              Cetak PDF Summary
            </Button>
          )}
        </div>
      </div>

      {/* Preview card - matches print format */}
      <div className="bg-white rounded-lg shadow-lg border overflow-hidden">
        {/* Header */}
        <div className="bg-white px-8 pt-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-14 w-auto" />
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 uppercase">
                Summary Permintaan Barang Safety
                {data.targetSite === 'VALE' && <span className="text-orange-600"> (Khusus VALE)</span>}
                {data.targetSite === 'GABUNGAN' && <span className="text-blue-600"> (Gabungan Site)</span>}
              </div>
              <div className="text-sm font-semibold text-gray-700 mt-1">{data.sectionName}</div>
            </div>
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            <div><span className="font-semibold">Tanggal Pengajuan:</span> {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : today}</div>
            <div><span className="font-semibold">Department &amp; Lokasi:</span> {data.departmentName} — {sites.join(', ')}</div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full border-collapse border border-gray-800 text-xs">
            <thead>
              {/* Row 1: Main headers */}
              <tr className="bg-gray-100">
                <th className="border border-gray-800 px-2 py-2 text-center font-bold" rowSpan={2} style={{width: 35}}>No</th>
                <th className="border border-gray-800 px-2 py-2 text-left font-bold" rowSpan={2} style={{width: 150}}>Nama Karyawan</th>
                <th className="border border-gray-800 px-2 py-2 text-center font-bold" rowSpan={2} style={{width: 60}}>SN</th>
                <th className="border border-gray-800 px-2 py-2 text-center font-bold" rowSpan={2} style={{width: 85}}>Site</th>
                {QTY_ONLY_COLUMNS.map((col) => (
                  <th key={col} className="border border-gray-800 px-1 py-1 text-center font-bold" rowSpan={2} style={{minWidth: 42, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', maxHeight: 110}}>
                    {col}
                  </th>
                ))}
                {/* Safety Shoes: parent header */}
                <th className="border border-gray-800 px-1 py-1 text-center font-bold" colSpan={3}>{SAFETY_SHOES_COL}</th>
              </tr>
              {/* Row 2: Safety Shoes sub-headers */}
              <tr className="bg-gray-100">
                <th className="border border-gray-800 px-1 py-1 text-center font-bold" style={{minWidth: 35}}>QTY</th>
                <th className="border border-gray-800 px-1 py-1 text-center font-bold" style={{minWidth: 35}}>Size</th>
                <th className="border border-gray-800 px-1 py-1 text-center font-bold" style={{minWidth: 45}}>Masa Pakai</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-800 px-2 py-3 text-center">{idx + 1}</td>
                  <td className="border border-gray-800 px-2 py-3 whitespace-nowrap">{emp.name}</td>
                  <td className="border border-gray-800 px-2 py-3 text-center text-[10px]">{emp.sn}</td>
                  <td className="border border-gray-800 px-2 py-3 text-center text-[10px]">{emp.site}</td>
                  {QTY_ONLY_COLUMNS.map((col) => (
                    <td key={col} className="border border-gray-800 px-1 py-3 text-center">
                      {emp.items[col] || ''}
                    </td>
                  ))}
                  {/* Safety Shoes: QTY */}
                  <td className="border border-gray-800 px-1 py-3 text-center">{emp.items['Safety Shoes'] || ''}</td>
                  {/* Safety Shoes: SIZE */}
                  <td className="border border-gray-800 px-1 py-3 text-center text-[10px]">{emp.items['Safety Shoes Size'] || ''}</td>
                  {/* Safety Shoes: Masa Pakai */}
                  <td className="border border-gray-800 px-1 py-3 text-center text-[10px]">{emp.items['Safety Shoes Masa Pakai'] || ''}</td>
                </tr>
              ))}
              {/* Empty rows to fill 10 */}
              {Array.from({ length: Math.max(0, 10 - employees.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-gray-800 px-2 py-3 text-center">{employees.length + i + 1}</td>
                  {Array.from({ length: QTY_ONLY_COLUMNS.length + 6 }).map((_, j) => (
                    <td key={j} className="border border-gray-800 px-2 py-3">&nbsp;</td>
                  ))}
                </tr>              ))}
              {/* Total Qty row */}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-800 px-2 py-3 text-center" colSpan={4}>Total Qty</td>
                {QTY_ONLY_COLUMNS.map((col) => (
                  <td key={col} className="border border-gray-800 px-1 py-3 text-center font-bold">
                    {totals[col] || ''}
                  </td>
                ))}
                <td className="border border-gray-800 px-1 py-3 text-center font-bold">{totals['Safety Shoes'] || ''}</td>
                <td className="border border-gray-800 px-1 py-3 text-center">—</td>
                <td className="border border-gray-800 px-2 py-3 text-center">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature section */}
        <div className="px-8 py-8 border-t">
          <div className="grid grid-cols-3 gap-12">
            {/* Diajukan Oleh */}
            <div className="text-center">
              <div className="text-sm font-bold mb-3">Diajukan Oleh,</div>
              <div className="mb-3 flex items-end justify-center" style={{ minHeight: '80px' }}>
                <div className="w-48 border-b border-gray-400 pb-1">
                  {data.submitterSignatureUrl && (
                    <img src={data.submitterSignatureUrl} alt="TTD" className="h-16 w-auto mx-auto" />
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-600">({data.sectionName})</div>
              <div className="text-xs font-medium text-gray-800 mt-1">{data.generatedByName}</div>
              {data.generatedAt && (
                <div className="text-[10px] text-gray-500 mt-1">{new Date(data.generatedAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              )}
            </div>

            {/* Diperiksa Oleh */}
            <div className="text-center">
              <div className="text-sm font-bold mb-3">Diperiksa Oleh,</div>
              <div className="mb-3 flex items-end justify-center" style={{ minHeight: '80px' }}>
                <div className="w-48 border-b border-gray-400 pb-1">
                  {data.approvals.find(a => a.level === 1)?.signatureUrl && (
                    <img src={data.approvals.find(a => a.level === 1)!.signatureUrl!} alt="TTD" className="h-16 w-auto mx-auto" />
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-600">(Section Head — {data.sectionName})</div>
              <div className="text-xs font-medium text-gray-800 mt-1">{data.approvals.find(a => a.level === 1)?.approverName || '...'}</div>
              {data.approvals.find(a => a.level === 1)?.reviewedAt && (
                <div className="text-[10px] text-gray-500 mt-1">{new Date(data.approvals.find(a => a.level === 1)!.reviewedAt!).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              )}
              {data.approvals.find(a => a.level === 1)?.decisionNote && (
                <div className="text-[10px] text-gray-500 mt-1 italic">Catatan: {data.approvals.find(a => a.level === 1)!.decisionNote}</div>
              )}
            </div>

            {/* Disetujui Oleh */}
            <div className="text-center">
              <div className="text-sm font-bold mb-3">Disetujui Oleh,</div>
              <div className="mb-3 flex items-end justify-center" style={{ minHeight: '80px' }}>
                <div className="w-48 border-b border-gray-400 pb-1">
                  {data.approvals.find(a => a.level === 2)?.signatureUrl && (
                    <img src={data.approvals.find(a => a.level === 2)!.signatureUrl!} alt="TTD" className="h-16 w-auto mx-auto" />
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-600">(Department Head — {data.departmentName})</div>
              <div className="text-xs font-medium text-gray-800 mt-1">{data.approvals.find(a => a.level === 2)?.approverName || '...'}</div>
              {data.approvals.find(a => a.level === 2)?.reviewedAt && (
                <div className="text-[10px] text-gray-500 mt-1">{new Date(data.approvals.find(a => a.level === 2)!.reviewedAt!).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              )}
              {data.approvals.find(a => a.level === 2)?.decisionNote && (
                <div className="text-[10px] text-gray-500 mt-1 italic">Catatan: {data.approvals.find(a => a.level === 2)!.decisionNote}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <SummaryApprovalDialog
          summaryId={data.id}
          summaryNumber={data.summaryNumber}
          onSubmit={handleSubmit}
          onClose={() => setShowApprovalDialog(false)}
        />
      )}
    </div>
  );
}
