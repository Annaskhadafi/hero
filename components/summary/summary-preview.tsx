'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FilePenLine,
  Loader2,
  Maximize2,
  Printer,
  Trash2,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { submitSummaryAction, deleteSummaryDraftAction } from '@/app/dashboard/summary/actions';
import { downloadElementAsPdf } from '@/lib/pdf-download';
import { SummaryApprovalDialog } from './summary-approval-dialog';
import { QTY_ONLY_COLUMNS, SAFETY_SHOES_COL } from '@/lib/summary-constants';

type SummaryData = {
  id: number;
  summaryNumber: string;
  status: string;
  generatedAt: Date | null;
  approvedAt: Date | null;
  sectionName: string;
  departmentName: string;
  generatedByName: string;
  generatedByJobTitle?: string;
  targetSite?: string;
  submitterSignatureUrl: string | null;
  items: Array<{
    employeeName: string;
    employeeSn: string;
    siteName: string;
    itemName: string;
    quantity: number;
    requestType: string;
    remarks?: string;
  }>;
  approvals: Array<{
    id?: number;
    level: number;
    approverEmployeeId?: number;
    approverName: string;
    approverJobTitle?: string;
    approverSectionName?: string | null;
    status: string;
    signatureUrl: string | null;
    decisionNote: string | null;
    reviewedAt: Date | null;
  }>;
};

export function SummaryPreview({ data }: { data: SummaryData }) {
  const router = useRouter();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const exportRef = useRef<HTMLDivElement>(null);

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

  const handleDeleteDraft = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus draft summary ini? Pengajuan yang terkait akan dikembalikan ke antrean.')) {
      return;
    }
    setDeleting(true);
    const toastId = toast.loading('Menghapus draft summary...');
    try {
      const res = await deleteSummaryDraftAction(data.id);
      if (res.success) {
        toast.success('Summary berhasil dihapus', { id: toastId });
        router.push('/dashboard/summary');
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal menghapus draft summary', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem', { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  const formatSiteName = (site?: string | null) => {
    if (!site) return '';
    const trimmed = site.trim();
    if (/^vale/i.test(trimmed)) return 'Vale';
    return trimmed;
  };

  // Group items by employee
  const groupedByEmployee = data.items.reduce((acc, item) => {
    if (!acc[item.employeeName]) {
      acc[item.employeeName] = {
        name: item.employeeName,
        sn: item.employeeSn,
        site: formatSiteName(item.siteName),
        remarks: item.remarks || '',
        items: {} as Record<string, any>,
      };
    }
    if (item.remarks && !acc[item.employeeName].remarks) {
      acc[item.employeeName].remarks = item.remarks;
    }
    if (item.itemName === 'Safety Shoes Size') {
      acc[item.employeeName].items[item.itemName] = item.remarks || item.requestType || '';
    } else {
      acc[item.employeeName].items[item.itemName] = (Number(acc[item.employeeName].items[item.itemName]) || 0) + item.quantity;
    }
    return acc;
  }, {} as Record<string, { name: string; sn: string; site: string; remarks: string; items: Record<string, any> }>);

  const employees = Object.values(groupedByEmployee);
  const sites = [...new Set(employees.map(e => e.site))];

  const allCols = [...QTY_ONLY_COLUMNS, SAFETY_SHOES_COL];
  const totals: Record<string, number> = {};
  for (const col of allCols) {
    totals[col] = employees.reduce((s, e) => s + (Number(e.items[col]) || 0), 0);
  }

  const deptHead = data.approvals.find(a => a.level === 2);

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

  const getStatusBadge = () => {
    switch (data.status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="size-3.5 text-amber-600" />
            Draft (Belum Disubmit)
          </span>
        );
      case 'pending':
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="size-3.5 text-blue-600" />
            Menunggu Persetujuan
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Disetujui (Approved)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {data.status}
          </span>
        );
    }
  };

  const th: React.CSSProperties = { border: '1px solid #000', padding: '3px 2px', fontSize: '7pt', background: '#f2f4f7', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.15' };
  const td: React.CSSProperties = { border: '1px solid #000', padding: '3px 2px', fontSize: '7pt', textAlign: 'center', lineHeight: '1.2' };
  const tdL: React.CSSProperties = { ...td, textAlign: 'left', paddingLeft: '4px' };
  const thVert: React.CSSProperties = { ...th, fontSize: '5.8pt', padding: '2px 0px', whiteSpace: 'nowrap', overflow: 'hidden', height: '90px' };

  const fmtDate = (d: Date) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Standard total rows: 10 rows
  const targetTotalRows = 10;
  const displayLimit = Math.max(employees.length, targetTotalRows);
  const emptyRowCount = Math.max(0, targetTotalRows - employees.length);

  // Renders the document sheet (identical to print document)
  const renderDocumentContent = (isForExport = false) => (
    <div className={`w-full bg-white text-black select-none ${isForExport ? 'w-[1050px] p-8' : 'p-6 sm:p-8 min-w-[950px]'}`} style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" style={{ height: '38px', width: 'auto' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.2' }}>
            Summary Permintaan Barang Safety
            {data.targetSite === 'VALE' && <span style={{ color: '#ea580c' }}> (Vale)</span>}
            {data.targetSite === 'GABUNGAN' && <span style={{ color: '#2563eb' }}> (Gabungan Site)</span>}
          </div>
          <div style={{ fontSize: '9pt', fontWeight: 'bold', marginTop: '2px', color: '#333' }}>{data.sectionName}</div>
        </div>
      </div>

      <div style={{ fontSize: '7.5pt', marginBottom: '8px', lineHeight: '1.3', color: '#111' }}>
        <div><strong>Tanggal Pengajuan:</strong> {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</div>
        <div><strong>Department &amp; Lokasi:</strong> {data.departmentName} — {sites.join(', ')}</div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '24px' }} rowSpan={2}>No</th>
            <th style={{ ...th, width: '110px' }} rowSpan={2}>Nama Karyawan</th>
            <th style={{ ...th, width: '42px' }} rowSpan={2}>SN</th>
            <th style={{ ...th, width: '46px' }} rowSpan={2}>Site</th>
            {QTY_ONLY_COLUMNS.map(c => (
              <th key={c} style={thVert} rowSpan={2}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: 'auto', maxHeight: '86px', fontSize: '5.8pt', whiteSpace: 'nowrap', lineHeight: '1' }}>
                  {c}
                </div>
              </th>
            ))}
            <th style={th} colSpan={2}>{SAFETY_SHOES_COL}</th>
            <th style={{ ...th, width: '85px' }} rowSpan={2}>Remarks</th>
          </tr>
          <tr>
            <th style={{ ...th, width: '22px' }}>QTY</th>
            <th style={{ ...th, width: '26px' }}>Size</th>
          </tr>
        </thead>
        <tbody>
          {employees.slice(0, displayLimit).map((e, i) => (
            <tr key={i} style={{ height: '18px' }}>
              <td style={td}>{i + 1}</td>
              <td style={{ ...tdL, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</td>
              <td style={td}>{e.sn}</td>
              <td style={{ ...td, fontSize: '6.5pt', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.site}</td>
              {QTY_ONLY_COLUMNS.map(c => (
                <td key={c} style={td}>{e.items[c] || ''}</td>
              ))}
              <td style={td}>{e.items['Safety Shoes'] || ''}</td>
              <td style={td}>{e.items['Safety Shoes Size'] || ''}</td>
              <td style={{ ...tdL, fontSize: '6pt', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>{e.remarks || '—'}</td>
            </tr>
          ))}
          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <tr key={`e${i}`} style={{ height: '18px' }}>
              <td style={td}>{employees.length + i + 1}</td>
              {Array.from({ length: QTY_ONLY_COLUMNS.length + 6 }).map((_, j) => (
                <td key={j} style={td}></td>
              ))}
            </tr>
          ))}
          <tr style={{ background: '#e5e7eb', fontWeight: 'bold', height: '19px' }}>
            <td style={td} colSpan={4}>Total Qty</td>
            {QTY_ONLY_COLUMNS.map(c => (
              <td key={c} style={td}>{totals[c] || ''}</td>
            ))}
            <td style={td}>{totals['Safety Shoes'] || ''}</td>
            <td style={td}>—</td>
            <td style={td}>—</td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      {(() => {
        const level1Approvals = data.approvals.filter(a => a.level === 1);
        const hasMultipleL1 = level1Approvals.length > 1;
        const colCount = hasMultipleL1 ? 4 : 3;

        const isAutoDefaultNote = (msg?: string | null) => {
          if (!msg) return true;
          const lower = msg.trim().toLowerCase();
          return (
            lower === '' ||
            lower === '-' ||
            lower === '—' ||
            lower === 'keputusan approve' ||
            lower === 'keputusan approve.' ||
            lower === 'apd disetujui.' ||
            lower === 'apd disetujui' ||
            lower === 'pengajuan disetujui.' ||
            lower === 'pengajuan disetujui' ||
            lower === 'approved' ||
            lower === 'disetujui' ||
            lower === 'ok' ||
            (lower.startsWith('keputusan ') && lower.endsWith('approve'))
          );
        };

        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: '12px', textAlign: 'center', marginTop: '6px' }}>
            {/* Diajukan Oleh */}
            <div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '3px' }}>Diajukan Oleh,</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '44px' }}>
                <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}>
                  {data.submitterSignatureUrl && <img src={data.submitterSignatureUrl} alt="TTD" style={{ maxHeight: '40px', maxWidth: '120px' }} />}
                </div>
              </div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold' }}>{data.generatedByName}</div>
              <div style={{ fontSize: '6.5pt', color: '#444' }}>Pembuat Dokumen ({data.sectionName})</div>
              {data.generatedAt && (
                <div style={{ fontSize: '5.5pt', color: '#777', marginTop: '1px' }}>{fmtDate(data.generatedAt)}</div>
              )}
            </div>

            {/* Diperiksa Oleh (Parallel Level 1 Approvers) */}
            {level1Approvals.length > 0 ? (
              level1Approvals.map((appr, idx) => {
                const roleDisplay = (() => {
                  if (appr.approverJobTitle?.toLowerCase().includes('mvc') || appr.approverSectionName?.toLowerCase().includes('mvc')) {
                    return 'Section Head Service MVC';
                  }
                  if (appr.approverJobTitle?.toLowerCase().includes('others') || appr.approverSectionName?.toLowerCase().includes('others')) {
                    return 'Section Head Service Others';
                  }
                  const isServiceRole =
                    appr.approverJobTitle?.toLowerCase().includes('section head service') ||
                    appr.approverJobTitle?.toLowerCase().includes('head section service');
                  return isServiceRole
                    ? appr.approverJobTitle
                    : `${appr.approverJobTitle || 'Section Head'}${appr.approverSectionName ? ` (${appr.approverSectionName})` : ` (${data.sectionName})`}`;
                })();
                return (
                  <div key={appr.id || idx}>
                    <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '3px' }}>Diperiksa Oleh,</div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '44px' }}>
                      <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}>
                        {appr.signatureUrl && <img src={appr.signatureUrl} alt="TTD" style={{ maxHeight: '40px', maxWidth: '120px' }} />}
                      </div>
                    </div>
                    <div style={{ fontSize: '7.5pt', fontWeight: 'bold' }}>{appr.approverName || '.............'}</div>
                    <div style={{ fontSize: '6.5pt', color: '#444' }}>{roleDisplay}</div>
                    {appr.reviewedAt && (
                      <div style={{ fontSize: '5.5pt', color: '#777', marginTop: '1px' }}>{fmtDate(appr.reviewedAt)}</div>
                    )}
                    {appr.decisionNote && !isAutoDefaultNote(appr.decisionNote) && (
                      <div style={{ fontSize: '5.5pt', color: '#777', marginTop: '1px', fontStyle: 'italic' }}>Catatan: {appr.decisionNote}</div>
                    )}
                  </div>
                );
              })
            ) : (
              <div>
                <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '3px' }}>Diperiksa Oleh,</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '44px' }}>
                  <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}></div>
                </div>
                <div style={{ fontSize: '7.5pt', fontWeight: 'bold' }}>.............</div>
                <div style={{ fontSize: '6.5pt', color: '#444' }}>(Section Head — {data.sectionName})</div>
              </div>
            )}

            {/* Disetujui Oleh (Department Head) */}
            <div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '3px' }}>Disetujui Oleh,</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '44px' }}>
                <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}>
                  {deptHead?.signatureUrl && <img src={deptHead.signatureUrl} alt="TTD" style={{ maxHeight: '40px', maxWidth: '120px' }} />}
                </div>
              </div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold' }}>{deptHead?.approverName || '.............'}</div>
              <div style={{ fontSize: '6.5pt', color: '#444' }}>({deptHead?.approverJobTitle || 'Department Head'} — {data.departmentName})</div>
              {deptHead?.reviewedAt && (
                <div style={{ fontSize: '5.5pt', color: '#777', marginTop: '1px' }}>{fmtDate(deptHead.reviewedAt)}</div>
              )}
              {deptHead?.decisionNote && !isAutoDefaultNote(deptHead.decisionNote) && (
                <div style={{ fontSize: '5.5pt', color: '#777', marginTop: '1px', fontStyle: 'italic' }}>Catatan: {deptHead.decisionNote}</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/summary')}
            className="h-9 gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Daftar Summary</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-slate-900">{data.summaryNumber}</span>
            {getStatusBadge()}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cetak PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintInPlace}
            disabled={printing}
            className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer shadow-2xs"
          >
            {printing ? (
              <Loader2 className="size-3.5 animate-spin text-emerald-600" />
            ) : (
              <Printer className="size-3.5 text-emerald-600" />
            )}
            <span>Cetak PDF</span>
          </Button>

          {/* Download PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="h-9 gap-1.5 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl shadow-2xs cursor-pointer"
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin text-blue-600" />
            ) : (
              <Download className="size-3.5 text-blue-600" />
            )}
            <span>Download PDF</span>
          </Button>

          {/* Hapus Draft / Pending */}
          {(data.status === 'draft' || data.status === 'pending' || data.status === 'pending_approval') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteDraft}
              disabled={deleting}
              className="h-9 gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-xl shadow-2xs cursor-pointer"
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              <span>Hapus Summary</span>
            </Button>
          )}

          {/* Submit Approval */}
          {data.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => setShowApprovalDialog(true)}
              className="h-9 gap-1.5 text-xs font-bold bg-[#003461] text-white hover:bg-[#00274a] rounded-xl shadow-xs cursor-pointer"
            >
              <FilePenLine className="size-3.5" />
              <span>Tanda Tangan &amp; Submit</span>
            </Button>
          )}

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setZoomLevel(1);
              setIsZoomModalOpen(true);
            }}
            className="h-9 px-2.5 text-slate-500 hover:text-slate-900 rounded-xl"
            title="Tampilkan Ukuran Penuh"
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Main Document Paper Sheet */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-x-auto">
        {renderDocumentContent(false)}
      </div>

      {/* Fullscreen Zoom Lightbox Dialog */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-900/90 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Preview Dokumen</span>
              <span className="text-xs font-mono font-bold">{data.summaryNumber}</span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoomLevel((z: number) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                className="flex size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="size-4" />
              </button>
              <span className="min-w-12 text-center text-xs font-mono font-bold">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z: number) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
                className="flex size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
              >
                100%
              </button>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => setIsZoomModalOpen(false)}
              className="flex size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-rose-600 text-white transition cursor-pointer"
              title="Tutup"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Scrollable Viewport */}
          <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                width: '1050px',
                transition: 'transform 0.1s ease-out',
              }}
              className="rounded-xl shadow-2xl bg-white overflow-hidden my-4"
            >
              {renderDocumentContent(true)}
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

      {/* High-res off-screen container for crisp PDF capture */}
      <div style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -9999, overflow: 'hidden' }}>
        <div ref={exportRef} className="w-[1050px] bg-white">
          {renderDocumentContent(true)}
        </div>
      </div>
    </div>
  );
}
