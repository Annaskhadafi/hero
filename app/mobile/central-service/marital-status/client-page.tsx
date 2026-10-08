'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableEmployeeSelect } from '@/components/searchable-employee-select';
import { SignaturePad } from '@/components/signature-pad';
import { MARITAL_STATUS_OPTIONS } from '@/lib/marital-status-constants';
import { submitMaritalStatusRequestAction } from '@/app/dashboard/central-service/marital-status/actions';
import { toast } from 'sonner';
import { Heart, Loader2, Send, ShieldCheck, UserCheck, FileText } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [approver1Id, setApprover1Id] = useState<string>('');
  const [approver2Id, setApprover2Id] = useState<string>('');
  const [signatureUrl, setSignatureUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentStatusDisplay =
    !employeeProfile.maritalStatus ||
    employeeProfile.maritalStatus === 'none' ||
    employeeProfile.maritalStatus === 'Belum Diisi'
      ? 'Belum Menikah (TK)'
      : employeeProfile.maritalStatus;

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

    if (!approver1Id || !approver2Id) {
      const msg = 'Pemeriksa (Level 1) dan Atasan Langsung (Level 2) wajib dipilih';
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
    <div className="p-3 sm:p-4 space-y-3.5 max-w-lg mx-auto pb-8">
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

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Detail Perubahan Card */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Detail Perubahan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Status Pernikahan Tujuan <span className="text-red-500">*</span>
              </Label>
              <Select value={targetStatus} onValueChange={(val) => { setTargetStatus(val); setErrorMessage(null); }}>
                <SelectTrigger className="w-full bg-white dark:bg-slate-900 text-xs h-9">
                  <SelectValue placeholder="-- Pilih Status Tujuan --" />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Alasan Perubahan Status <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); setErrorMessage(null); }}
                placeholder="Contoh: Menikah dan ingin memperbarui data penanggungan lokasi."
                rows={3}
                className="bg-white dark:bg-slate-900 text-xs resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Approvers Card */}
        <Card className="shadow-xs border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10">
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <CardTitle className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Pemeriksa & Atasan (Approvers)</span>
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
                onValueChange={(val) => { setApprover1Id(val); setErrorMessage(null); }}
                placeholder="Cari & Pilih PJO / HSE / Leader..."
                showLabel={false}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Step 2: Section Head <span className="text-red-500">*</span>
              </Label>
              <SearchableEmployeeSelect
                employees={approverOptions}
                value={approver2Id}
                onValueChange={(val) => { setApprover2Id(val); setErrorMessage(null); }}
                placeholder="Cari & Pilih Section Head..."
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
              onDataUrlChange={(url) => setSignatureUrl(url || '')}
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
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 text-sm shadow-sm rounded-lg transition-colors cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Mengajukan Permohonan...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Kirim Permohonan
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

