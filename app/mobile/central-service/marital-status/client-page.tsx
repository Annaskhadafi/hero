'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableEmployeeSelect } from '@/components/searchable-employee-select';
import { SignaturePad } from '@/components/signature-pad';
import { MARITAL_STATUS_OPTIONS } from '@/lib/marital-status-constants';
import { submitMaritalStatusRequestAction } from '@/app/dashboard/central-service/marital-status/actions';
import { toast } from 'sonner';
import { Heart, Loader2, Send, ShieldCheck, UserCheck, FileText, Eye, Printer, Download } from 'lucide-react';
import type { ApproverOption } from '@/lib/apd-status';

interface MobileMaritalStatusClientProps {
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
  approverOptions: ApproverOption[];
}

export function MobileMaritalStatusClient({
  employeeProfile,
  approverOptions,
}: MobileMaritalStatusClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'form' | 'preview'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [approver1Id, setApprover1Id] = useState<string>('');
  const [approver2Id, setApprover2Id] = useState<string>('');
  const [approver3Id, setApprover3Id] = useState<string>('');
  const [signatureUrl, setSignatureUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentStatusDisplay =
    !employeeProfile.maritalStatus ||
    employeeProfile.maritalStatus === 'none' ||
    employeeProfile.maritalStatus === 'Belum Diisi'
      ? 'Single On Site'
      : employeeProfile.maritalStatus;

  const sendLiveDraftUpdate = (overrides: Record<string, any> = {}) => {
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
        ...overrides,
      }, '*');
    }
  };

  const handlePrintDraft = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (e) {
        toast.error('Gagal memicu pencetakan dokumen');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!targetStatus) {
      const msg = 'Pilih status pernikahan tujuan terlebih dahulu';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!reason.trim()) {
      const msg = 'Alasan perubahan status wajib diisi';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!approver1Id || !approver2Id || !approver3Id) {
      const msg = 'Pemeriksa (Level 1), Atasan Langsung (Level 2), dan Human Resources (Level 3) wajib dipilih';
      setErrorMessage(msg);
      toast.error(msg);
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
        router.push('/mobile/menu');
      } else {
        const errorText = res.error || 'Gagal mengajukan permohonan';
        setErrorMessage(errorText);
        toast.error(errorText);
      }
    } catch (error: any) {
      const errorText = error.message || 'Terjadi kesalahan sistem';
      setErrorMessage(errorText);
      toast.error(errorText);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 space-y-3 max-w-lg mx-auto pb-8">
      {/* Segmented View Mode Switcher */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setViewMode('form')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'form'
              ? 'bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          <span>Isi Formulir</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode('preview');
            setTimeout(() => sendLiveDraftUpdate(), 100);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'preview'
              ? 'bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-emerald-600" />
          <span>Live Dokumen PDF</span>
        </button>
      </div>

      {/* Header Banner & Employee Info */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-linear-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 shadow-xs">
        <CardHeader className="pb-2 pt-3.5 px-3.5">
          <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
            <Heart className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Permohonan Pergantian Status Pernikahan</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1.5 text-emerald-950 dark:text-emerald-200 px-3.5 pb-3.5">
          <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800/40 pb-1.5">
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Pemohon:</span>
            <span className="font-semibold text-right">{employeeProfile.name} ({employeeProfile.employeeSn})</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
            <div>
              <span className="text-emerald-700 dark:text-emerald-400 block">Jabatan / Section:</span>
              <span className="font-medium">{employeeProfile.jobTitle} • {employeeProfile.sectionName}</span>
            </div>
            <div>
              <span className="text-emerald-700 dark:text-emerald-400 block">Lokasi Kerja:</span>
              <span className="font-medium">{employeeProfile.siteName}</span>
            </div>
          </div>
          <div className="pt-1.5 flex items-center justify-between bg-white/70 dark:bg-emerald-900/30 p-2 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 mt-1">
            <span className="text-emerald-800 dark:text-emerald-300 font-medium">Status Saat Ini:</span>
            <span className="font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-[11px]">
              {currentStatusDisplay}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Form View */}
      <form onSubmit={handleSubmit} className={`space-y-3.5 ${viewMode === 'preview' ? 'hidden' : 'block'}`}>
        {/* Detail Perubahan Card */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Detail Perubahan Status</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">F.HR.STD.001 00</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Status Pernikahan Tujuan <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {MARITAL_STATUS_OPTIONS.map((opt) => {
                  const isSelected = targetStatus === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      suppressHydrationWarning
                      onClick={() => {
                        setTargetStatus(opt);
                        setErrorMessage(null);
                        sendLiveDraftUpdate({ targetMaritalStatus: opt });
                      }}
                      className={`flex flex-col p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-0.5" suppressHydrationWarning>
                        <span className="text-xs font-bold">{opt}</span>
                        <span className={`size-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                          isSelected ? 'border-emerald-600 bg-emerald-600 text-white font-bold' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected ? '✓' : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Alasan Perubahan Status <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => {
                  const val = e.target.value;
                  setReason(val);
                  setErrorMessage(null);
                  sendLiveDraftUpdate({ reason: val });
                }}
                placeholder="Contoh: Ingin membawa keluarga ke lokasi kerja agar bisa dekat keluarga dan menambah semangat bekerja."
                rows={3}
                className="bg-white dark:bg-slate-900 text-xs resize-none rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Approvers Card */}
        <Card className="shadow-xs border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10">
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <CardTitle className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Pemeriksa & Atasan (3-Step Approvers)</span>
              </div>
              <span className="text-[10px] font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                Required
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Step 1: PJO / HSE / Leader <span className="text-red-500">*</span>
              </Label>
              <SearchableEmployeeSelect
                employees={approverOptions}
                value={approver1Id}
                onValueChange={(val) => {
                  setApprover1Id(val);
                  setErrorMessage(null);
                  const appName = approverOptions.find((a) => String(a.id) === String(val))?.name || '';
                  sendLiveDraftUpdate({ approver1Name: appName });
                }}
                placeholder="Cari & Pilih PJO / HSE / Leader..."
                showLabel={false}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Step 2: Atasan Langsung <span className="text-red-500">*</span>
              </Label>
              <SearchableEmployeeSelect
                employees={approverOptions}
                value={approver2Id}
                onValueChange={(val) => {
                  setApprover2Id(val);
                  setErrorMessage(null);
                  const appName = approverOptions.find((a) => String(a.id) === String(val))?.name || '';
                  sendLiveDraftUpdate({ approver2Name: appName });
                }}
                placeholder="Cari & Pilih Atasan Langsung..."
                showLabel={false}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Step 3: Human Resources (HR) <span className="text-red-500">*</span>
              </Label>
              <SearchableEmployeeSelect
                employees={approverOptions}
                value={approver3Id}
                onValueChange={(val) => {
                  setApprover3Id(val);
                  setErrorMessage(null);
                  const appName = approverOptions.find((a) => String(a.id) === String(val))?.name || '';
                  sendLiveDraftUpdate({ approver3Name: appName });
                }}
                placeholder="Cari & Pilih Representative Human Resources..."
                showLabel={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Signature Pad */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tanda Tangan Pemohon</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5">
            <SignaturePad
              defaultDataUrl={signatureUrl}
              onDataUrlChange={(url) => {
                const cleanUrl = url || '';
                setSignatureUrl(cleanUrl);
                sendLiveDraftUpdate({ signatureUrl: cleanUrl });
              }}
              height={120}
            />
          </CardContent>
        </Card>

        {/* Inline Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#003461] hover:bg-[#00284d] text-white font-bold h-11 text-sm shadow-sm rounded-lg transition-colors cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Mengajukan Permohonan...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Kirim Permohonan Perubahan Status
            </>
          )}
        </Button>
      </form>

      {/* Live Document Preview Viewer Container */}
      <Card className={`shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden ${viewMode === 'form' ? 'mt-4' : 'block'}`}>
        <CardHeader className="py-2.5 px-3.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pratinjau Dokumen Real-Time (F.HR.STD.001 00)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                Live Update
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrintDraft}
                className="h-7 px-2 text-[11px] text-slate-700 hover:bg-slate-200 dark:text-slate-200"
                title="Unduh Dokumen PDF"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Unduh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            ref={iframeRef}
            src="/print/central-service/marital-status/draft?embed=true"
            onLoad={() => sendLiveDraftUpdate()}
            className={`w-full bg-white border-0 transition-all ${
              viewMode === 'preview' ? 'h-[80vh] min-h-[580px]' : 'h-[440px] sm:h-[540px]'
            }`}
            title="Pratinjau Dokumen PDF Real-Time"
          />
        </CardContent>
      </Card>
    </div>
  );
}


