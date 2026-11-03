"use client";

import React, { useState } from "react";
import {
  IconFileX,
  IconUpload,
  IconLoader2,
  IconPrinter,
  IconBriefcase,
  IconSchool,
  IconCertificate,
  IconId,
  IconSparkles,
  IconCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconMail,
  IconPhone,
  IconMapPin,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export interface CandidateDigitalResumeProps {
  candidate: {
    fullName: string;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    dateOfBirth?: Date | string | null;
    gender?: string | null;
    currentStage?: string | null;
    source?: string | null;
    createdAt?: Date | string | null;
    aiScore?: number | null;
    aiSummary?: string | null;
    aiDetails?: {
      recommendation?: string;
      breakdown?: Array<{ criterion: string; score: number; weight: number; reason: string }>;
      knockout?: Array<{ criterion: string; passed: boolean; reason: string }>;
    } | null;
    workExperience?: Array<{ company?: string; role?: string; yearIn?: string; yearOut?: string; description?: string }> | null;
    education?: Array<{ level?: string; institution?: string; major?: string; yearIn?: string; yearOut?: string }> | null;
    drivingLicenses?: string[] | null;
    certificates?: Array<{ name: string; year: string; publisher: string }> | null;
    notes?: string | null;
  };
  fileName?: string;
  onUploadFile?: (file: File) => Promise<void> | void;
  isUploading?: boolean;
}

const formatAiRecommendation = (recommendation?: string | null) => {
  const translations: Record<string, string> = {
    Shortlist: "Masuk Shortlist",
    Consider: "Dipertimbangkan",
    "Review Further": "Perlu Review Lanjutan",
    Review: "Perlu Review",
    "Manual Review": "Perlu Review Manual",
    Reject: "Ditolak",
    Hire: "Direkomendasikan Diterima",
    "Strong Match": "Sangat Sesuai",
  };
  return recommendation ? translations[recommendation] || recommendation : null;
};

const getAgeFromDateOfBirth = (dateOfBirth?: Date | string | null) => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) age -= 1;
  return age;
};

export function CandidateDigitalResume({
  candidate,
  fileName,
  onUploadFile,
  isUploading = false,
}: CandidateDigitalResumeProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const age = getAgeFromDateOfBirth(candidate.dateOfBirth);
  const recommendation = formatAiRecommendation(candidate.aiDetails?.recommendation);

  const handlePrint = () => {
    window.print();
  };

  const handleFormSubmit = async () => {
    if (!selectedFile || !onUploadFile) return;
    await onUploadFile(selectedFile);
  };

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 space-y-5 bg-background text-foreground">
      {/* Notice Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 text-amber-950 dark:text-amber-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400 shrink-0">
              <IconInfoCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-amber-900 dark:text-amber-100">
                  Berkas PDF Fisik Belum Tersedia di S3
                </span>
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[11px] font-medium bg-amber-500/5">
                  Menampilkan Digital Resume & AI Assessment Lengkap
                </Badge>
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                Berkas PDF fisik lama (<code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">{fileName || "CV.pdf"}</code>) tidak ditemukan di penyimpanan server (kemungkinan berkas lama hilang saat redeploy container sebelum S3 diaktifkan). Namun <strong>seluruh data profil CV dan rangkuman Smart AI Candidate tersimpan utuh</strong> dan siap ditinjau di bawah ini.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {onUploadFile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-card/80 border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
                onClick={() => setShowUploadForm(!showUploadForm)}
              >
                <IconUpload className="w-3.5 h-3.5 mr-1.5" />
                {showUploadForm ? "Tutup Form Unggah" : "Unggah PDF Pengganti"}
                {showUploadForm ? <IconChevronUp className="w-3.5 h-3.5 ml-1" /> : <IconChevronDown className="w-3.5 h-3.5 ml-1" />}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-card/80 border-border text-foreground hover:bg-muted"
              onClick={handlePrint}
            >
              <IconPrinter className="w-3.5 h-3.5 mr-1.5" />
              Cetak Resume
            </Button>
          </div>
        </div>

        {/* Collapsible Upload Form */}
        {showUploadForm && onUploadFile && (
          <div className="mt-4 pt-4 border-t border-amber-500/20">
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold text-foreground">
                Unggah Berkas PDF CV Pengganti ke S3 Cloud Storage
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  id="digital-resume-cv-upload"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                />
                <label
                  htmlFor="digital-resume-cv-upload"
                  className="flex-1 w-full flex items-center justify-between px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-border/80 text-xs"
                >
                  <span className="truncate text-muted-foreground font-medium">
                    {selectedFile ? selectedFile.name : "Pilih Berkas PDF (Maksimal 10MB)"}
                  </span>
                  <span className="text-primary font-semibold shrink-0 ml-2">Browse...</span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedFile || isUploading}
                  onClick={handleFormSubmit}
                  className="w-full sm:w-auto h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
                >
                  {isUploading ? (
                    <>
                      <IconLoader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Menyimpan ke S3...
                    </>
                  ) : (
                    <>
                      <IconUpload className="w-3.5 h-3.5 mr-1.5" />
                      Simpan & Tampilkan PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Resume Paper Card */}
      <div className="bg-card border rounded-xl shadow-xs overflow-hidden print:border-none print:shadow-none">
        {/* Candidate Header */}
        <div className="p-6 border-b bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {candidate.fullName}
              </h2>
              {candidate.currentStage && (
                <Badge variant="secondary" className="font-semibold text-xs">
                  {candidate.currentStage}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-primary mt-1">
              Melamar untuk: {candidate.jobTitle || "Posisi Belum Terhubung"}
            </p>
          </div>

          {/* AI Score Badge */}
          {candidate.aiScore !== null && candidate.aiScore !== undefined && (
            <div className="flex items-center gap-3 self-start md:self-auto bg-card border rounded-xl p-3 shadow-2xs">
              <div className="w-11 h-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-500/20">
                {candidate.aiScore}%
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <IconSparkles className="w-3 h-3 text-amber-500" />
                  Smart Assessment
                </div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {recommendation || "Telah Dinilai"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact & Biodata Bar */}
        <div className="px-6 py-3.5 bg-muted/5 border-b grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconMail className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{candidate.email || "-"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconPhone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{candidate.phone || "-"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconCalendar className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {age !== null ? `${age} Tahun` : "-"}
              {candidate.gender ? ` • ${candidate.gender}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconMapPin className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate">{candidate.address || "-"}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* AI Summary & Breakdown */}
          {candidate.aiSummary && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <IconSparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Rangkuman Penilaian Smart AI
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line bg-card/60 p-4 rounded-lg border border-border/60">
                {candidate.aiSummary}
              </p>

              {/* Criteria Breakdown Grid */}
              {Array.isArray(candidate.aiDetails?.breakdown) && candidate.aiDetails.breakdown.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    Rincian Kriteria Penilaian:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {candidate.aiDetails.breakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-card border rounded-lg p-3 space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{item.criterion}</span>
                          <span className="font-bold text-primary">
                            {item.score} <span className="text-[10px] text-muted-foreground">/ {item.weight}</span>
                          </span>
                        </div>
                        {item.reason && (
                          <p className="text-[11px] text-muted-foreground leading-normal line-clamp-3">
                            {item.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Work Experience */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <IconBriefcase className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Pengalaman Kerja
              </h3>
            </div>
            {Array.isArray(candidate.workExperience) && candidate.workExperience.length > 0 ? (
              <div className="space-y-4">
                {candidate.workExperience.map((work, idx) => (
                  <div key={idx} className="relative pl-4 border-l-2 border-primary/30 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="font-semibold text-sm text-foreground">
                        {work.role || "Role Tidak Dicantumkan"}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {work.yearIn || "-"} — {work.yearOut || "Saat Ini"}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-primary">
                      {work.company || "-"}
                    </div>
                    {work.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed pt-1">
                        {work.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Tidak ada data pengalaman kerja yang terdaftar.
              </p>
            )}
          </div>

          {/* Education */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <IconSchool className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Pendidikan Terakhir
              </h3>
            </div>
            {Array.isArray(candidate.education) && candidate.education.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {candidate.education.map((edu, idx) => (
                  <div key={idx} className="bg-muted/15 border rounded-lg p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>{edu.level || "Pendidikan"} • {edu.major || "-"}</span>
                      <span className="text-muted-foreground font-normal">
                        {edu.yearIn || "-"} — {edu.yearOut || "Saat Ini"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {edu.institution || "-"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Tidak ada data pendidikan yang terdaftar.
              </p>
            )}
          </div>

          {/* Licenses & Certificates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Driving Licenses */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <IconId className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Surat Izin Mengemudi (SIM)
                </h3>
              </div>
              {Array.isArray(candidate.drivingLicenses) && candidate.drivingLicenses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.drivingLicenses.map((lic, idx) => (
                    <Badge key={idx} variant="outline" className="px-2.5 py-1 text-xs font-semibold bg-muted/20">
                      {lic}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Tidak memiliki lisensi khusus.
                </p>
              )}
            </div>

            {/* Certificates */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <IconCertificate className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Sertifikasi & Pelatihan
                </h3>
              </div>
              {Array.isArray(candidate.certificates) && candidate.certificates.length > 0 ? (
                <div className="space-y-2">
                  {candidate.certificates.map((cert, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-muted/15 border rounded-md px-3 py-2">
                      <span className="font-semibold text-foreground">{cert.name}</span>
                      <span className="text-muted-foreground">
                        {cert.publisher ? `${cert.publisher} ` : ""}({cert.year || "-"})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Tidak ada sertifikat terdaftar.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
