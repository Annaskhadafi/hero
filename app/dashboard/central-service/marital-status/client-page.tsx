'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdminTableCard } from '@/components/admin-table-card';
import { SearchableEmployeeSelect } from '@/components/searchable-employee-select';
import { SignaturePad } from '@/components/signature-pad';
import { MARITAL_STATUS_OPTIONS, formatMaritalStatus } from '@/lib/marital-status-constants';
import type { fetchMaritalStatusRequests, fetchMaritalStatusRequestById } from '@/lib/marital-status-data';
import {
  submitMaritalStatusRequestAction,
  approveMaritalStatusStepAction,
  rejectMaritalStatusStepAction,
  deleteMaritalStatusRequestAction,
} from './actions';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Heart,
  Loader2,
  Plus,
  Printer,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { ApproverOption } from '@/lib/apd-status';

type MaritalStatusRequestRow = Awaited<ReturnType<typeof fetchMaritalStatusRequests>>[number];
type RequestDetailData = NonNullable<Awaited<ReturnType<typeof fetchMaritalStatusRequestById>>>;

interface MaritalStatusDashboardClientProps {
  currentEmployeeId: number;
  employeeProfile: {
    id: number;
    name: string;
    employeeSn: string;
    jobTitle: string;
    maritalStatus: string;
    departmentName: string;
    sectionName: string;
    siteId: number | null;
    siteName: string;
  };
  initialRequests: MaritalStatusRequestRow[];
  approverOptions: ApproverOption[];
}

export function MaritalStatusDashboardClient({
  currentEmployeeId,
  employeeProfile,
  initialRequests,
  approverOptions,
}: MaritalStatusDashboardClientProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<MaritalStatusRequestRow[]>(initialRequests);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [approver1Id, setApprover1Id] = useState<string>('');
  const [approver2Id, setApprover2Id] = useState<string>('');
  const [approver3Id, setApprover3Id] = useState<string>('');
  const [signatureUrl, setSignatureUrl] = useState<string>('');

  // Detail / Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<RequestDetailData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [approverSignatureUrl, setApproverSignatureUrl] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrintDoc = (requestId?: number) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {
        // Fallback to hidden iframe
      }
    }
    const targetId = requestId || selectedRequest?.id;
    if (!targetId) return;

    const hiddenFrame = document.createElement('iframe');
    hiddenFrame.style.position = 'fixed';
    hiddenFrame.style.right = '0';
    hiddenFrame.style.bottom = '0';
    hiddenFrame.style.width = '0';
    hiddenFrame.style.height = '0';
    hiddenFrame.style.border = '0';
    hiddenFrame.src = `/print/central-service/marital-status/${targetId}?embed=true`;
    document.body.appendChild(hiddenFrame);

    hiddenFrame.onload = () => {
      setTimeout(() => {
        try {
          hiddenFrame.contentWindow?.focus();
          hiddenFrame.contentWindow?.print();
        } catch (err) {
          console.error('Failed to trigger print on iframe:', err);
        }
        setTimeout(() => {
          document.body.removeChild(hiddenFrame);
        }, 1500);
      }, 300);
    };
  };

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    const matchSearch =
      r.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      (r.employeeSn && r.employeeSn.toLowerCase().includes(search.toLowerCase())) ||
      (r.siteName && r.siteName.toLowerCase().includes(search.toLowerCase()));

    if (!matchSearch) return false;

    if (activeTab === 'pending') return r.status === 'pending_approval';
    if (activeTab === 'approved') return r.status === 'approved';
    if (activeTab === 'rejected') return r.status === 'rejected';
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending_approval').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetStatus) {
      toast.error('Pilih status pernikahan tujuan terlebih dahulu');
      return;
    }

    if (!reason.trim()) {
      toast.error('Alasan perubahan status wajib diisi');
      return;
    }

    if (!approver1Id || !approver2Id || !approver3Id) {
      toast.error('Pemeriksa (Level 1), Atasan Langsung (Level 2), dan Human Resources (Level 3) wajib dipilih');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitMaritalStatusRequestAction({
        targetMaritalStatus: targetStatus,
        reason,
        approver1Id: parseInt(approver1Id, 10),
        approver2Id: parseInt(approver2Id, 10),
        approver3Id: parseInt(approver3Id, 10),
        signatureUrl,
        siteId: employeeProfile.siteId ?? undefined,
      });

      if (res.success) {
        toast.success(`Permohonan ${res.requestNumber} berhasil diajukan!`);
        setIsCreateOpen(false);
        setTargetStatus('');
        setReason('');
        setApprover1Id('');
        setApprover2Id('');
        setApprover3Id('');
        setSignatureUrl('');
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal mengajukan permohonan');
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = async (requestId: number) => {
    setIsDetailOpen(true);
    setLoadingDetail(true);
    setReviewNote('');
    setApproverSignatureUrl('');
    try {
      const res = await fetch(`/api/central-service/marital-status/${requestId}`).then((r) => r.json());
      if (res.data) {
        setSelectedRequest(res.data);
      } else {
        // Fallback server action call if route not created
        const { fetchMaritalStatusRequestById } = await import('@/lib/marital-status-data');
        const detail = await fetchMaritalStatusRequestById(requestId);
        setSelectedRequest(detail);
      }
    } catch (e) {
      const { fetchMaritalStatusRequestById } = await import('@/lib/marital-status-data');
      const detail = await fetchMaritalStatusRequestById(requestId);
      setSelectedRequest(detail);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApproveStep = async (stepId: number) => {
    if (!selectedRequest) return;
    setIsReviewing(true);
    try {
      const res = await approveMaritalStatusStepAction(
        selectedRequest.id,
        stepId,
        reviewNote,
        approverSignatureUrl
      );
      if (res.success) {
        toast.success('Persetujuan berhasil diproses');
        setIsDetailOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal menyetujui');
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRejectStep = async (stepId: number) => {
    if (!selectedRequest) return;
    if (!reviewNote.trim()) {
      toast.error('Catatan alasan penolakan wajib diisi');
      return;
    }
    setIsReviewing(true);
    try {
      const res = await rejectMaritalStatusStepAction(selectedRequest.id, stepId, reviewNote);
      if (res.success) {
        toast.success('Permohonan berhasil ditolak');
        setIsDetailOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal menolak');
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleDeleteRequest = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus permohonan ini?')) return;
    try {
      const res = await deleteMaritalStatusRequestAction(id);
      if (res.success) {
        toast.success('Permohonan berhasil dihapus');
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error(res.error || 'Gagal menghapus permohonan');
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghapus');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">Disetujui</Badge>;
    }
    if (status === 'rejected') {
      return <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold">Ditolak</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Permohonan</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-900">{requests.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Menunggu Approval</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-900">{pendingCount}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-full text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Disetujui (Approved)</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-900">{approvedCount}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-600 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Ditolak (Rejected)</p>
              <h3 className="text-2xl font-bold mt-1 text-rose-900">{rejectedCount}</h3>
            </div>
            <div className="p-3 bg-rose-50 rounded-full text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <AdminTableCard
        title="Daftar Permohonan Status Pernikahan"
        description="Monitoring dan persetujuan perubahan status pernikahan di lokasi karyawan."
        columns={[
          'No Tiket',
          'Karyawan',
          'Section / Site',
          'Status Awal',
          'Status Tujuan',
          'Status Request',
          'Pending With',
          'Tanggal',
          'Aksi',
        ]}
        rows={filteredRequests.map((row) => [
          <span key="reqNum" className="font-mono font-bold text-emerald-950">{row.requestNumber}</span>,
          <div key="emp">
            <div className="font-semibold text-gray-900">{row.employeeName}</div>
            <div className="text-[11px] text-muted-foreground font-mono">SN: {row.employeeSn}</div>
          </div>,
          <div key="sec">
            <div>{row.sectionName || row.departmentName || '-'}</div>
            <div className="text-[11px] text-muted-foreground">{row.siteName || '-'}</div>
          </div>,
          <span key="curr" className="text-gray-600">{formatMaritalStatus(row.currentMaritalStatus)}</span>,
          <span key="targ" className="font-semibold text-gray-900">{row.targetMaritalStatus}</span>,
          <span key="stat">{getStatusBadge(row.status)}</span>,
          <span key="pend" className="text-muted-foreground italic">
            {row.status === 'pending_approval' ? row.pendingWith || 'Approver' : '-'}
          </span>,
          <span key="date" className="text-muted-foreground">
            {row.requestDate
              ? new Date(row.requestDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '-'}
          </span>,
          <div key="acts" className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDetail(row.id)}
              className="h-8 px-2 text-xs"
              title="Lihat Detail & Persetujuan"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Detail
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => handlePrintDoc(row.id)}
              className="h-8 px-2 text-xs"
              title="Cetak Dokumen PDF"
            >
              <Printer className="w-3.5 h-3.5" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteRequest(row.id)}
              className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              title="Hapus Pengajuan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>,
        ])}
        actions={
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Buat Pengajuan Baru
          </Button>
        }
        filters={
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Cari Tiket / Karyawan / Site..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'all' ? 'bg-white shadow-xs font-semibold text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'pending' ? 'bg-white shadow-xs font-semibold text-amber-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'approved' ? 'bg-white shadow-xs font-semibold text-emerald-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Disetujui ({approvedCount})
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'rejected' ? 'bg-white shadow-xs font-semibold text-rose-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Ditolak ({rejectedCount})
              </button>
            </div>
          </div>
        }
      />

      {/* Create Modal Dialog with Hero Design System & Live PDF Document Preview */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-7xl w-[98vw] sm:w-[95vw] h-[95vh] sm:h-[92vh] flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 bg-surface-container-lowest overflow-hidden">
          <DialogHeader className="pb-2 border-b shrink-0">
            <DialogTitle className="text-sm sm:text-lg font-bold leading-tight flex items-center justify-between gap-2 text-slate-800">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-600" />
                <span>Permohonan Perubahan Status Pernikahan Di Lokasi</span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-[10px]">
                F.HR.STD.001 00
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_460px] gap-3 sm:gap-4 min-h-0 overflow-hidden">
            {/* Form Column (Left - Scrollable) */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3 overflow-y-auto min-h-0 p-1">
              {/* Card 1: Auto-Filled Employee Info Badge */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                  <span className="font-bold text-emerald-950 text-xs">Informasi Pemohon</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Auto-Filled HERO Profile
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 pt-0.5">
                  <p><span className="text-slate-400 block text-[10px]">Nama Karyawan:</span> <span className="font-semibold text-slate-900">{employeeProfile.name} (SN: {employeeProfile.employeeSn})</span></p>
                  <p><span className="text-slate-400 block text-[10px]">Jabatan / Section:</span> <span className="font-medium text-slate-900">{employeeProfile.jobTitle} • {employeeProfile.sectionName}</span></p>
                  <p><span className="text-slate-400 block text-[10px]">Dept / Site:</span> <span className="font-medium text-slate-900">{employeeProfile.departmentName} ({employeeProfile.siteName})</span></p>
                  <p><span className="text-slate-400 block text-[10px]">Status Saat Ini:</span> <span className="font-bold text-emerald-800 underline">{formatMaritalStatus(employeeProfile.maritalStatus)}</span></p>
                </div>
              </div>

              {/* Card 2: Interactive Target Marital Status Cards */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2 shadow-2xs">
                <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Status Pernikahan Tujuan <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Pilih salah satu status resmi</span>
                </Label>

                <div className="grid grid-cols-2 gap-2.5">
                  {MARITAL_STATUS_OPTIONS.map((opt) => {
                    const isSelected = targetStatus === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        suppressHydrationWarning
                        onClick={() => {
                          setTargetStatus(opt);
                          setTimeout(() => {
                            if (iframeRef.current?.contentWindow) {
                              iframeRef.current.contentWindow.postMessage({
                                type: 'previewLiveDraft',
                                targetMaritalStatus: opt,
                              }, '*');
                            }
                          }, 50);
                        }}
                        className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-0.5" suppressHydrationWarning>
                          <span className={`text-xs font-bold ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                            {opt}
                          </span>
                          <span className={`size-4 rounded-full border flex items-center justify-center text-[10px] ${
                            isSelected ? 'border-emerald-600 bg-emerald-600 text-white font-extrabold' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected ? '✓' : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Reason Textarea */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2 shadow-2xs">
                <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Alasan Perubahan Status Pernikahan <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">{reason.length}/200 Karakter</span>
                </Label>
                <Textarea
                  value={reason}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReason(val);
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage({
                        type: 'previewLiveDraft',
                        reason: val,
                      }, '*');
                    }
                  }}
                  placeholder="Contoh: Ingin membawa keluarga ke lokasi kerja agar bisa dekat keluarga dan menambah semangat bekerja."
                  rows={3}
                  className="text-xs rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white resize-none"
                />
              </div>

              {/* Card 4: 3-Step Approval Pathway Visualizer */}
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Alur Persetujuan 3-Step (Approvers)</span>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                    Routing Engine Active
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                      <span>Step 1: PJO / HSE / Leader <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">Pemeriksa Lokasi</span>
                    </Label>
                    <SearchableEmployeeSelect
                      employees={approverOptions}
                      value={approver1Id}
                      onValueChange={(val) => {
                        setApprover1Id(val);
                        const selectedApp = approverOptions.find((a) => String(a.id) === String(val));
                        const appName = selectedApp?.name || '';
                        const appJob = selectedApp?.jobTitle || 'PJO / HSE / Leader';
                        if (iframeRef.current?.contentWindow) {
                          iframeRef.current.contentWindow.postMessage({
                            type: 'previewLiveDraft',
                            approver1Name: appName,
                            approver1Job: appJob,
                          }, '*');
                        }
                      }}
                      placeholder="Cari & Pilih PJO / HSE / Leader..."
                      showLabel={false}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                      <span>Step 2: Atasan Langsung <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">Section Head / Manager</span>
                    </Label>
                    <SearchableEmployeeSelect
                      employees={approverOptions}
                      value={approver2Id}
                      onValueChange={(val) => {
                        setApprover2Id(val);
                        const selectedApp = approverOptions.find((a) => String(a.id) === String(val));
                        const appName = selectedApp?.name || '';
                        const appJob = selectedApp?.jobTitle || 'Atasan Langsung';
                        if (iframeRef.current?.contentWindow) {
                          iframeRef.current.contentWindow.postMessage({
                            type: 'previewLiveDraft',
                            approver2Name: appName,
                            approver2Job: appJob,
                          }, '*');
                        }
                      }}
                      placeholder="Cari & Pilih Atasan Langsung..."
                      showLabel={false}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                      <span>Step 3: Human Resources (HR) <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">Otorisasi HC Site / HO</span>
                    </Label>
                    <SearchableEmployeeSelect
                      employees={approverOptions}
                      value={approver3Id}
                      onValueChange={(val) => {
                        setApprover3Id(val);
                        const selectedApp = approverOptions.find((a) => String(a.id) === String(val));
                        const appName = selectedApp?.name || '';
                        const appJob = selectedApp?.jobTitle || 'Human Resources';
                        if (iframeRef.current?.contentWindow) {
                          iframeRef.current.contentWindow.postMessage({
                            type: 'previewLiveDraft',
                            approver3Name: appName,
                            approver3Job: appJob,
                          }, '*');
                        }
                      }}
                      placeholder="Cari & Pilih Representative Human Resources..."
                      showLabel={false}
                    />
                  </div>
                </div>
              </div>

              {/* Card 5: Signature Canvas */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2 shadow-2xs">
                <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Tanda Tangan Pemohon (Karyawan)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Wajib diisi sebelum kirim</span>
                </Label>
                <SignaturePad
                  defaultDataUrl={signatureUrl}
                  onDataUrlChange={(url) => {
                    const cleanUrl = url || '';
                    setSignatureUrl(cleanUrl);
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage({
                        type: 'previewLiveDraft',
                        signatureUrl: cleanUrl,
                      }, '*');
                    }
                  }}
                  height={110}
                />
              </div>

              <DialogFooter className="pt-2 mt-auto shrink-0 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="h-10 text-xs rounded-xl">
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 bg-[#003461] hover:bg-[#00284d] text-white font-bold text-xs rounded-xl shadow-xs gap-2 cursor-pointer px-5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      KIRIM PERMOHONAN PERUBAHAN STATUS
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>

            {/* Live PDF Document Preview Column (Right Column) */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs flex flex-col min-h-0 h-full">
              <div className="bg-slate-100 px-3 py-2 border-b font-medium text-xs text-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-1.5 font-bold">
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pratinjau Dokumen Real-Time (F.HR.STD.001 00)</span>
                </div>
                <span className="text-[10px] text-slate-500 italic">Live Update</span>
              </div>
              <iframe
                ref={iframeRef}
                src="/print/central-service/marital-status/draft?embed=true"
                onLoad={() => {
                  if (iframeRef.current?.contentWindow) {
                    const selectedApp1 = approverOptions.find((a) => String(a.id) === String(approver1Id));
                    const selectedApp2 = approverOptions.find((a) => String(a.id) === String(approver2Id));
                    const selectedApp3 = approverOptions.find((a) => String(a.id) === String(approver3Id));

                    iframeRef.current.contentWindow.postMessage({
                      type: 'previewLiveDraft',
                      employeeName: employeeProfile.name,
                      employeeSn: employeeProfile.employeeSn,
                      employeeJobTitle: employeeProfile.jobTitle,
                      submitterJob: employeeProfile.jobTitle,
                      departmentSection: `${employeeProfile.departmentName} / ${employeeProfile.sectionName}`,
                      siteName: employeeProfile.siteName,
                      currentMaritalStatus: employeeProfile.maritalStatus || 'Single On Site',
                      targetMaritalStatus: targetStatus || 'Married On Site',
                      reason: reason || '',
                      approver1Name: selectedApp1?.name || 'PJO / HSE / Leader',
                      approver1Job: selectedApp1?.jobTitle || 'PJO / HSE / Leader',
                      approver2Name: selectedApp2?.name || 'Atasan Langsung',
                      approver2Job: selectedApp2?.jobTitle || 'Atasan Langsung',
                      approver3Name: selectedApp3?.name || 'Human Resources',
                      approver3Job: selectedApp3?.jobTitle || 'Human Resources',
                      signatureUrl: signatureUrl || '',
                    }, '*');
                  }
                }}
                className="w-full flex-1 min-h-[250px] h-full bg-white border-0"
                title="Pratinjau Dokumen PDF Real-Time"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail / Review Dialog Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-7xl w-[98vw] sm:w-[95vw] h-[95vh] sm:h-[92vh] flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 overflow-hidden">
          <DialogHeader className="pb-2 border-b shrink-0">
            <DialogTitle className="text-sm sm:text-lg font-bold leading-tight flex items-center justify-between gap-2 pr-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Detail & Preview Dokumen: {selectedRequest?.requestNumber}</span>
              </div>
              {selectedRequest && getStatusBadge(selectedRequest.status)}
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-12 flex justify-center items-center flex-1">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : selectedRequest ? (
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-3 sm:gap-4 min-h-0 overflow-hidden">
              {/* Document Preview (Left Column) */}
              <div className="rounded-lg border bg-card overflow-hidden shadow-xs flex flex-col min-h-0 h-full">
                <div className="bg-muted px-3 py-1.5 border-b font-medium text-xs text-muted-foreground flex justify-between items-center shrink-0">
                  <span>Dokumen Resmi F.CS.MS-01.00|1</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePrintDoc(selectedRequest.id)}
                    className="h-6 text-[10px] px-2 text-gray-700 hover:bg-gray-200"
                  >
                    <Printer className="w-3 h-3 mr-1" /> Cetak Dokumen PDF
                  </Button>
                </div>
                <iframe
                  ref={iframeRef}
                  src={`/print/central-service/marital-status/${selectedRequest.id}?embed=true`}
                  className="w-full flex-1 min-h-[250px] h-full bg-white border-0"
                  title="Preview Dokumen Status Pernikahan"
                />
              </div>

              {/* Request Summary & Approval Timeline (Right Column) */}
              <div className="flex flex-col gap-3 overflow-y-auto min-h-0 p-1">
                {/* Employee Summary Card */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-xs space-y-1.5">
                  <div><strong>Nama Karyawan:</strong> {selectedRequest.employeeName} (SN: {selectedRequest.employeeSn})</div>
                  <div><strong>Jabatan:</strong> {selectedRequest.employeeJobTitle || '-'}</div>
                  <div><strong>Dept / Section:</strong> {selectedRequest.departmentName || 'Central Services'} / {selectedRequest.sectionName || 'Service Operation'}</div>
                  <div><strong>Lokasi:</strong> {selectedRequest.siteName}</div>
                  <div className="pt-1.5 border-t border-emerald-200/60 font-medium">
                    Status Pernikahan: <span className="text-gray-700">{formatMaritalStatus(selectedRequest.currentMaritalStatus)}</span> ➔ <span className="font-bold text-emerald-950 underline">{selectedRequest.targetMaritalStatus}</span>
                  </div>
                  <div className="pt-1 italic text-gray-700 bg-white/60 p-2 rounded border border-emerald-100">
                    Alasan: "{selectedRequest.reason || '-'}"
                  </div>
                </div>

                {/* Approval Timeline History */}
                <div className="space-y-2 flex-1">
                  <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Alur &amp; Riwayat Persetujuan
                  </div>
                  <div className="border rounded-lg divide-y bg-white text-xs">
                    {selectedRequest.approvalHistory.map((step) => {
                      const isPending = step.status === 'pending';
                      const isApproved = step.status === 'approved';
                      const isRejected = step.status === 'rejected';
                      const isCurrentApprover = isPending && step.approverEmployeeId === currentEmployeeId;

                      return (
                        <div key={step.id} className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-gray-900">{step.approverName}</span>
                              <div className="text-[11px] text-muted-foreground font-medium">{step.approverJobTitle}</div>
                            </div>
                            <div>
                              {isApproved && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                  Disetujui
                                </Badge>
                              )}
                              {isRejected && (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-300">Ditolak</Badge>
                              )}
                              {isPending && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                  Menunggu Review
                                </Badge>
                              )}
                            </div>
                          </div>

                          {step.decisionNote && (
                            <div className="text-gray-700 italic bg-muted/30 p-2 rounded text-[11px]">
                              Catatan: {step.decisionNote}
                            </div>
                          )}

                          {isApproved && step.signatureUrl && (
                            <div className="pt-1">
                              <img src={step.signatureUrl} alt="TTD Approver" className="h-9 w-auto object-contain" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-2 border-t shrink-0 flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrintDoc(selectedRequest?.id)}
            >
              <Printer className="w-4 h-4 mr-2" />
              Cetak Dokumen PDF
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
