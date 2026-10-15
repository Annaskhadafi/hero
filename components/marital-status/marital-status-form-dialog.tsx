'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableEmployeeSelect } from '@/components/searchable-employee-select';
import { SignaturePad } from '@/components/signature-pad';
import { uploadFile } from '@/app/actions/upload';
import { MARITAL_STATUS_OPTIONS, formatMaritalStatus } from '@/lib/marital-status-constants';
import {
  submitMaritalStatusRequestAction,
  type SubmitMaritalStatusInput,
} from '@/app/dashboard/central-service/marital-status/actions';
import type { ApproverOption } from '@/lib/apd-status';
import type { MaritalPickerEmployee } from '@/lib/marital-status-data';
import { getUserSignatureAction } from '@/app/actions/user-signature';
import { toast } from 'sonner';
import {
  Heart,
  Upload,
  FileText,
  User,
  Users,
  Building2,
  MapPin,
  Calendar,
  Home,
  CheckCircle2,
  Loader2,
  Trash2,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface MaritalStatusFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  approverOptions: ApproverOption[];
  pickerEmployees: MaritalPickerEmployee[];
  onSuccess?: () => void;
}

export function MaritalStatusFormDialog({
  open,
  onOpenChange,
  currentEmployeeId,
  employeeProfile,
  approverOptions,
  pickerEmployees,
  onSuccess,
}: MaritalStatusFormDialogProps) {
  // Mode: Self vs Representative
  const [submissionMode, setSubmissionMode] = useState<'self' | 'representative'>('self');
  const [selectedTargetEmployeeId, setSelectedTargetEmployeeId] = useState<number | null>(null);

  // Form Fields
  const [targetStatus, setTargetStatus] = useState<string>('Married On Site');
  const [marriageDate, setMarriageDate] = useState<string>('');
  const [spouseName, setSpouseName] = useState<string>('');
  const [residenceStatus, setResidenceStatus] = useState<string>('Mess Perusahaan On Site');
  const [dependentsCount, setDependentsCount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Attachment
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Approvers
  const [approver1Id, setApprover1Id] = useState<string>('');
  const [approver2Id, setApprover2Id] = useState<string>('');
  const [approver3Id, setApprover3Id] = useState<string>('');

  // Signature
  const [signatureUrl, setSignatureUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Employee Info derived
  const activeEmployee =
    submissionMode === 'representative' && selectedTargetEmployeeId
      ? pickerEmployees.find((e) => e.id === selectedTargetEmployeeId) || null
      : null;

  const currentMaritalStatusDisplay = activeEmployee
    ? formatMaritalStatus(activeEmployee.maritalStatus)
    : formatMaritalStatus(employeeProfile.maritalStatus);

  // Auto-fill direct manager for Level 2 approver
  useEffect(() => {
    if (submissionMode === 'representative' && activeEmployee?.directManagerId) {
      setApprover2Id(String(activeEmployee.directManagerId));
    }
  }, [submissionMode, activeEmployee]);

  // Load existing profile signature if available
  useEffect(() => {
    if (open && !signatureUrl) {
      getUserSignatureAction().then((res) => {
        if (res.success && res.signatureUrl) {
          setSignatureUrl(res.signatureUrl);
        }
      });
    }
  }, [open, signatureUrl]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Ukuran berkas maksimal 15MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prefix', 'marital-status');

      const res = await uploadFile(formData);
      if (res.success && res.url) {
        setAttachmentUrl(res.url);
        setAttachmentName(file.name);
        setAttachmentFile(file);
        toast.success('Berkas pendukung berhasil diunggah');
      } else {
        toast.error(res.error || 'Gagal mengunggah berkas');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah berkas');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentUrl('');
    setAttachmentName('');
    setAttachmentFile(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetStatus.trim()) {
      toast.error('Pilih status pernikahan tujuan');
      return;
    }

    if (!reason.trim()) {
      toast.error('Isi alasan perubahan status pernikahan');
      return;
    }

    if (!approver1Id || !approver2Id) {
      toast.error('Pemeriksa (Level 1) dan Atasan Langsung (Level 2) wajib dipilih');
      return;
    }

    if (!signatureUrl.trim()) {
      toast.error('Tanda tangan pemohon wajib dibubuhkan');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: SubmitMaritalStatusInput = {
        targetEmployeeId:
          submissionMode === 'representative' && selectedTargetEmployeeId
            ? selectedTargetEmployeeId
            : undefined,
        targetMaritalStatus: targetStatus.trim(),
        reason: reason.trim(),
        marriageDate: marriageDate || undefined,
        spouseName: spouseName.trim() || undefined,
        residenceStatus: residenceStatus.trim() || undefined,
        dependentsCount: Number(dependentsCount) || 0,
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
        approver1Id: parseInt(approver1Id, 10),
        approver2Id: parseInt(approver2Id, 10),
        approver3Id: approver3Id ? parseInt(approver3Id, 10) : undefined,
        signatureUrl,
        notes: notes.trim(),
        siteId: activeEmployee ? activeEmployee.siteId ?? undefined : employeeProfile.siteId ?? undefined,
      };

      const res = await submitMaritalStatusRequestAction(payload);
      if (res.success) {
        toast.success(`Pengajuan status ${res.data?.requestNumber || ''} berhasil dibuat!`);
        onOpenChange(false);
        // Reset state
        setReason('');
        setSpouseName('');
        setMarriageDate('');
        setAttachmentUrl('');
        setAttachmentName('');
        onSuccess?.();
      } else {
        toast.error(res.error || 'Gagal mengirim pengajuan');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat memproses pengajuan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Heart className="w-5 h-5 fill-rose-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Formulir Pengajuan Pergantian Status Pernikahan On Site
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Perubahan status ke Married On Site / Single On Site dengan kelengkapan data pasangan & dokumen pendukung.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2 text-xs">
          {/* Section 1: Submission Mode Selector */}
          <div className="p-3 bg-muted/40 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-bold text-gray-800">Ajukan Permohonan Untuk:</Label>
              <p className="text-[11px] text-muted-foreground">
                Pilih apakah pengajuan untuk diri sendiri atau diajukan HR/Admin mewakili karyawan lain.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white p-1 rounded-md border shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setSubmissionMode('self');
                  setSelectedTargetEmployeeId(null);
                }}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                  submissionMode === 'self'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Diri Sendiri
              </button>
              <button
                type="button"
                onClick={() => setSubmissionMode('representative')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                  submissionMode === 'representative'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Mewakili Karyawan
              </button>
            </div>
          </div>

          {/* Section 2: Employee Profile Card */}
          {submissionMode === 'representative' ? (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-3">
              <div>
                <Label className="text-xs font-bold text-blue-950">
                  Pilih Karyawan yang Diajukan <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={selectedTargetEmployeeId ? String(selectedTargetEmployeeId) : ''}
                  onValueChange={(val) => setSelectedTargetEmployeeId(Number(val))}
                >
                  <SelectTrigger className="h-9 text-xs bg-white mt-1">
                    <SelectValue placeholder="-- Ketik / Pilih Nama Karyawan Aktif --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {pickerEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name} ({emp.employeeSn}) - {emp.jobTitle} [{emp.siteName}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeEmployee && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-200/60 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Departemen:</span>
                    <p className="font-semibold text-gray-800">{activeEmployee.departmentName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lokasi Site:</span>
                    <p className="font-semibold text-gray-800">{activeEmployee.siteName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status Saat Ini:</span>
                    <Badge variant="outline" className="font-semibold text-[10px] mt-0.5">
                      {formatMaritalStatus(activeEmployee.maritalStatus)}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Atasan Langsung:</span>
                    <p className="font-semibold text-gray-800">{activeEmployee.directManagerName || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border rounded-lg">
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">{employeeProfile.name}</h4>
                  <p className="text-[11px] font-mono text-muted-foreground">SN: {employeeProfile.employeeSn}</p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  Status Saat Ini: {currentMaritalStatusDisplay}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Jabatan:</span>
                  <p className="font-semibold text-gray-800">{employeeProfile.jobTitle}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Departemen:</span>
                  <p className="font-semibold text-gray-800">{employeeProfile.departmentName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Site Kerja:</span>
                  <p className="font-semibold text-gray-800">{employeeProfile.siteName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Marital Status & Marriage Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg bg-card">
            {/* Target Status */}
            <div>
              <Label className="text-xs font-bold text-gray-900">
                Status Pernikahan Tujuan <span className="text-rose-500">*</span>
              </Label>
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue placeholder="Pilih status tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Marriage Date */}
            <div>
              <Label className="text-xs font-bold text-gray-900">
                Tanggal Menikah / Tanggal Efektif
              </Label>
              <Input
                type="date"
                value={marriageDate}
                onChange={(e) => setMarriageDate(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>

            {/* Spouse Name */}
            <div>
              <Label className="text-xs font-bold text-gray-900">
                Nama Pasangan (Suami / Istri)
              </Label>
              <Input
                placeholder="Masukkan nama lengkap pasangan..."
                value={spouseName}
                onChange={(e) => setSpouseName(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>

            {/* Residence Status */}
            <div>
              <Label className="text-xs font-bold text-gray-900">
                Status Tempat Tinggal di Site
              </Label>
              <Select value={residenceStatus} onValueChange={setResidenceStatus}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue placeholder="Pilih status hunian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mess Perusahaan On Site">Mess Perusahaan On Site</SelectItem>
                  <SelectItem value="Perumahan Karyawan On Site">Perumahan Karyawan On Site</SelectItem>
                  <SelectItem value="Rumah Pribadi / Sewa di Luar Site">Rumah Pribadi / Sewa di Luar Site</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dependents Count */}
            <div>
              <Label className="text-xs font-bold text-gray-900">
                Jumlah Tanggungan / Anak
              </Label>
              <Input
                type="number"
                min="0"
                max="20"
                value={dependentsCount}
                onChange={(e) => setDependentsCount(parseInt(e.target.value, 10) || 0)}
                className="h-9 text-xs mt-1"
              />
            </div>

            {/* Reason */}
            <div className="sm:col-span-2">
              <Label className="text-xs font-bold text-gray-900">
                Alasan Pengajuan Perubahan Status <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                placeholder="Jelaskan alasan perubahan status (contoh: Melangsungkan pernikahan pada tanggal..., pasangan ikut tinggal di site mess karyawan, dsb.)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="text-xs mt-1"
                required
              />
            </div>
          </div>

          {/* Section 4: File Attachment Upload (S3 Proxy) */}
          <div className="p-4 border rounded-lg bg-card space-y-2">
            <Label className="text-xs font-bold text-gray-900 flex items-center justify-between">
              <span>Lampiran Berkas Pendukung (Buku Nikah / Akta Nikah / Kartu Keluarga)</span>
              <span className="text-[11px] text-muted-foreground font-normal">PDF / Foto (Maks 15MB)</span>
            </Label>

            {attachmentUrl ? (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50/50 border-emerald-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-bold text-xs text-gray-900">{attachmentName || 'Dokumen Terlampir'}</p>
                    <p className="text-[11px] text-emerald-700">Tersimpan persisten via S3 upload proxy</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAttachment}
                  className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Hapus
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:bg-muted/30 transition-colors">
                <input
                  type="file"
                  id="maritalAttachmentInput"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <label
                  htmlFor="maritalAttachmentInput"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="font-semibold text-xs text-gray-800">
                    {isUploading ? 'Sedang mengunggah berkas...' : 'Klik untuk memilih berkas Buku Nikah / KK / Akta'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Format didukung: PDF, PNG, JPG, WebP
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Section 5: Approval Hierarchy */}
          <div className="p-4 border rounded-lg bg-card space-y-3">
            <Label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Alur Persetujuan Berjenjang (3 Level Approval)
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Level 1: Pemeriksa / HR Site */}
              <div>
                <Label className="text-[11px] font-semibold text-gray-700">
                  Level 1: Pemeriksa / HR Site <span className="text-rose-500">*</span>
                </Label>
                <SearchableEmployeeSelect
                  options={approverOptions}
                  value={approver1Id}
                  onChange={setApprover1Id}
                  placeholder="Pilih Pemeriksa L1"
                  className="mt-1"
                />
              </div>

              {/* Level 2: Atasan Langsung */}
              <div>
                <Label className="text-[11px] font-semibold text-gray-700">
                  Level 2: Atasan Langsung <span className="text-rose-500">*</span>
                </Label>
                <SearchableEmployeeSelect
                  options={approverOptions}
                  value={approver2Id}
                  onChange={setApprover2Id}
                  placeholder="Pilih Atasan L2"
                  className="mt-1"
                />
              </div>

              {/* Level 3: Central Service / HR Management */}
              <div>
                <Label className="text-[11px] font-semibold text-gray-700">
                  Level 3: Central Service / HC (Opsional)
                </Label>
                <SearchableEmployeeSelect
                  options={approverOptions}
                  value={approver3Id}
                  onChange={setApprover3Id}
                  placeholder="Pilih HC / CS L3"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Digital Signature Pad */}
          <div className="p-4 border rounded-lg bg-card space-y-2">
            <Label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              Tanda Tangan Pemohon <span className="text-rose-500">*</span>
            </Label>
            <SignaturePad
              value={signatureUrl}
              onChange={setSignatureUrl}
              title="Tanda Tangan Pemohon"
              className="border rounded-md bg-white"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Mengirim Permohonan...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Kirim Pengajuan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
