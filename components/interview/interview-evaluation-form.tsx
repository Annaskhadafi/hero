"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Copy, Printer, Send, UserCheck, Building2, Calendar, Clock, MapPin, Award } from "lucide-react";
import { submitInterviewEvaluation } from "@/app/actions/interviews";
import { InterviewFormPdf } from "./interview-form-pdf";

interface EmployeeOption {
  id: number;
  name: string;
  email: string;
  employeeSn: string;
}

interface EvaluationFormProps {
  token: string;
  interview: any;
  candidate: any;
  existingEvaluations: any[];
  availableInterviewers: EmployeeOption[];
}

export function InterviewEvaluationForm({
  token,
  interview,
  candidate,
  existingEvaluations,
  availableInterviewers,
}: EvaluationFormProps) {
  const [panelistMode, setPanelistMode] = useState<"select" | "custom">("select");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [panelistName, setPanelistName] = useState<string>("");
  const [panelistEmail, setPanelistEmail] = useState<string>("");
  const [panelistRole, setPanelistRole] = useState<string>("User / Interviewer");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // 12 Dimensions state
  const [scores, setScores] = useState({
    dayaTangkapScore: 3,
    dayaTangkapComment: "",
    problemSolvingScore: 3,
    problemSolvingComment: "",
    motivationalFitScore: 3,
    motivationalFitComment: "",
    adaptabilityScore: 3,
    adaptabilityComment: "",
    interpersonalSkillsScore: 3,
    interpersonalSkillsComment: "",
    communicationSkillScore: 3,
    communicationSkillComment: "",

    fundamentalUnderstandingScore: 3,
    fundamentalUnderstandingComment: "",
    experienceRelatedScore: 3,
    experienceRelatedComment: "",
    technicalSkillScore: 3,
    technicalSkillComment: "",

    managerialSkillsScore: 3,
    managerialSkillsComment: "",
    leadershipScore: 3,
    leadershipComment: "",
    teamWorkScore: 3,
    teamWorkComment: "",

    overallRecommendation: "RECOMMENDED" as "RECOMMENDED" | "NOT_RECOMMENDED",
    jobMatchComment: "",
    recommendationOtherPosition: "",
  });

  const handleSelectEmployee = (empIdStr: string) => {
    setSelectedEmployeeId(empIdStr);
    const emp = availableInterviewers.find((e) => e.id.toString() === empIdStr);
    if (emp) {
      setPanelistName(emp.name);
      setPanelistEmail(emp.email);
    }
  };

  const handleScoreChange = (field: string, val: number) => {
    setScores((prev) => ({ ...prev, [field]: val }));
  };

  const handleCommentChange = (field: string, val: string) => {
    setScores((prev) => ({ ...prev, [field]: val }));
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link form penilaian berhasil di-copy!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelistName.trim()) {
      toast.error("Nama Pewawancara wajib diisi / dipilih.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitInterviewEvaluation({
        interviewId: interview.id,
        candidateId: candidate.id,
        stageName: interview.stageName || "Interview 1",
        panelistName: panelistName.trim(),
        panelistRole,
        panelistEmail: panelistEmail.trim(),

        dayaTangkapScore: scores.dayaTangkapScore,
        dayaTangkapComment: scores.dayaTangkapComment,
        problemSolvingScore: scores.problemSolvingScore,
        problemSolvingComment: scores.problemSolvingComment,
        motivationalFitScore: scores.motivationalFitScore,
        motivationalFitComment: scores.motivationalFitComment,
        adaptabilityScore: scores.adaptabilityScore,
        adaptabilityComment: scores.adaptabilityComment,
        interpersonalSkillsScore: scores.interpersonalSkillsScore,
        interpersonalSkillsComment: scores.interpersonalSkillsComment,
        communicationSkillScore: scores.communicationSkillScore,
        communicationSkillComment: scores.communicationSkillComment,

        fundamentalUnderstandingScore: scores.fundamentalUnderstandingScore,
        fundamentalUnderstandingComment: scores.fundamentalUnderstandingComment,
        experienceRelatedScore: scores.experienceRelatedScore,
        experienceRelatedComment: scores.experienceRelatedComment,
        technicalSkillScore: scores.technicalSkillScore,
        technicalSkillComment: scores.technicalSkillComment,

        managerialSkillsScore: scores.managerialSkillsScore,
        managerialSkillsComment: scores.managerialSkillsComment,
        leadershipScore: scores.leadershipScore,
        leadershipComment: scores.leadershipComment,
        teamWorkScore: scores.teamWorkScore,
        teamWorkComment: scores.teamWorkComment,

        overallRecommendation: scores.overallRecommendation,
        jobMatchComment: scores.jobMatchComment,
        recommendationOtherPosition: scores.recommendationOtherPosition,
      });

      toast.success("Penilaian interview berhasil disimpan! Terima kasih.");
      setSubmittedSuccess(true);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan penilaian interview.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    {
      title: "1. PERSONAL QUALITIES",
      items: [
        {
          key: "dayaTangkap",
          label: "DAYA TANGKAP",
          desc: "Kemampuan menangkap dan memahami informasi dengan cepat dan tepat",
        },
        {
          key: "problemSolving",
          label: "PROBLEM SOLVING / ANALYTICAL ABILITY",
          desc: "Kemampuan menganalisa permasalahan yang dihadapi dan mencari alternatif solusi yang tepat",
        },
        {
          key: "motivationalFit",
          label: "MOTIVATIONAL FIT",
          desc: "Memiliki kemauan untuk maju dan berkembang",
        },
        {
          key: "adaptability",
          label: "ADAPTABILITY",
          desc: "Mampu menyesuaikan diri dan memberikan kontribusi positif di dalam lingkungan kerja dengan berbagai situasi, kondisi perubahan yang terjadi",
        },
        {
          key: "interpersonalSkills",
          label: "INTERPERSONAL SKILLS",
          desc: "Kemampuan untuk membina hubungan dengan orang lain, bekerjasama, luwes, memenuhi & memahami nilai-nilai sosial yang berlaku",
        },
        {
          key: "communicationSkill",
          label: "COMMUNICATION SKILL",
          desc: "Mampu menjelaskan ide atau memberikan informasi secara jelas dan sistematis",
        },
      ],
    },
    {
      title: "2. PROFESSIONAL SKILL & KNOWLEDGE",
      items: [
        {
          key: "fundamentalUnderstanding",
          label: "FUNDAMENTAL UNDERSTANDING ABOUT JOB FUNCTION FOR THIS POSITION",
          desc: "Memiliki pemahaman tentang posisi kerja yang dilamarnya",
        },
        {
          key: "experienceRelated",
          label: "EXPERIENCE IN THE RELATED FIELD",
          desc: "Pengalaman yang sesuai dengan bidang kerja",
        },
        {
          key: "technicalSkill",
          label: "TECHNICAL SKILL IN THE RELATED FIELD",
          desc: "Kemampuan teknis yang berhubungan dengan bidang kerja",
        },
      ],
    },
    {
      title: "3. MANAGERIAL & LEADERSHIP",
      items: [
        {
          key: "managerialSkills",
          label: "MANAGERIAL SKILLS",
          desc: "Kemampuan untuk mengelola atau melakukan pengaturan pekerjaan",
        },
        {
          key: "leadership",
          label: "LEADERSHIP",
          desc: "Kemampuan untuk menciptakan dan memelihara kesamaan visi dan misi organisasi dengan memberikan arahan dan prioritas yang jelas",
        },
        {
          key: "teamWork",
          label: "TEAM WORK",
          desc: "Kemampuan membangun dan memelihara kerjasama kelompok secara efektif dan melibatkan pihak terkait dalam mengatasi masalah serta memiliki komitmen terhadap pencapaian tujuan bersama",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white overflow-hidden">
          <CardHeader className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center font-bold text-cyan-300">
                  CP
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">PT CHITRA PARATAMA</h1>
                  <p className="text-xs text-slate-300">FORM PENILAIAN INTERVIEW (F.HR.STD.010.00)</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? "Link Copied!" : "Copy Link Form"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPdfPreview(!showPdfPreview)}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-400/30 text-xs"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  {showPdfPreview ? "Kembali ke Form" : "Preview PDF"}
                </Button>
              </div>
            </div>

            {/* Candidate Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="text-slate-400 uppercase text-[10px] tracking-wider mb-1">Nama Pelamar</div>
                <div className="font-bold text-sm text-white">{candidate.fullName}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="text-slate-400 uppercase text-[10px] tracking-wider mb-1">Posisi Dilamar</div>
                <div className="font-bold text-sm text-cyan-300">{candidate.vacancyTitle}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="text-slate-400 uppercase text-[10px] tracking-wider mb-1">Umur & Pendidikan</div>
                <div className="font-semibold text-white">{candidate.ageStr} · {candidate.educationStr}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="text-slate-400 uppercase text-[10px] tracking-wider mb-1">Tahap Interview</div>
                <div className="font-bold text-amber-300">{interview.stageName || "Interview 1"}</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {showPdfPreview ? (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm">Preview Dokumen Cetak Standar PDF</h3>
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Cetak / Download PDF
              </Button>
            </div>
            <InterviewFormPdf
              candidateName={candidate.fullName}
              age={candidate.ageStr}
              education={candidate.educationStr}
              positionAppliedFor={candidate.vacancyTitle}
              evaluations={[
                {
                  ...scores,
                  id: 999,
                  panelistName: panelistName || "Pewawancara",
                  panelistRole,
                  stageName: interview.stageName,
                },
                ...existingEvaluations,
              ]}
              stageName={interview.stageName}
            />
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Interviewer Identity Section */}
            <Card className="border shadow-sm">
              <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b py-3 px-6">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-600" />
                  Identitas Pewawancara (Interviewer)
                </CardTitle>
                <CardDescription className="text-xs">
                  Pilih nama Anda dari User Management atau masukkan nama jika Anda pewawancara tambahan di Hari-H.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4 mb-2">
                  <button
                    type="button"
                    onClick={() => setPanelistMode("select")}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium border transition-colors ${
                      panelistMode === "select"
                        ? "bg-cyan-600 text-white border-cyan-600"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Pilih Karyawan (User Management)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelistMode("custom")}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium border transition-colors ${
                      panelistMode === "custom"
                        ? "bg-cyan-600 text-white border-cyan-600"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Input Manual (Pewawancara Tambahan / External)
                  </button>
                </div>

                {panelistMode === "select" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Nama Pewawancara *</Label>
                      <Select value={selectedEmployeeId} onValueChange={handleSelectEmployee}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="-- Pilih Pewawancara --" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {availableInterviewers.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.name} ({emp.employeeSn || "Emp"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Jabatan / Role dalam Interview</Label>
                      <Input
                        className="mt-1"
                        placeholder="Misal: Manager Dept, User, HR"
                        value={panelistRole}
                        onChange={(e) => setPanelistRole(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Nama Pewawancara *</Label>
                      <Input
                        className="mt-1"
                        placeholder="Masukkan nama lengkap"
                        value={panelistName}
                        onChange={(e) => setPanelistName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Email Pewawancara (Opsional)</Label>
                      <Input
                        className="mt-1"
                        placeholder="email@company.com"
                        value={panelistEmail}
                        onChange={(e) => setPanelistEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Jabatan / Role</Label>
                      <Input
                        className="mt-1"
                        placeholder="Misal: Manager / Panelist 3"
                        value={panelistRole}
                        onChange={(e) => setPanelistRole(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rating Legend Header */}
            <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4 text-xs text-cyan-900 dark:text-cyan-200">
              <div className="font-bold text-sm mb-1">Skala Penilaian (1 - 5):</div>
              <div className="grid grid-cols-5 gap-2 text-center font-medium">
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded border">1: Very Weak</div>
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded border">2: Weak</div>
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded border">3: Capable</div>
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded border">4: Strong</div>
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded border">5: Very Strong</div>
              </div>
            </div>

            {/* 12 Dimensions Form Categories */}
            {categories.map((cat, cIdx) => (
              <Card key={cIdx} className="border shadow-sm">
                <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b py-3 px-6">
                  <CardTitle className="text-sm font-bold tracking-wide uppercase text-slate-800 dark:text-slate-200">
                    {cat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 divide-y divide-slate-200 dark:divide-slate-800">
                  {cat.items.map((item) => {
                    const scoreKey = `${item.key}Score`;
                    const commentKey = `${item.key}Comment`;
                    const currentScore = (scores as any)[scoreKey] || 3;
                    const currentComment = (scores as any)[commentKey] || "";

                    return (
                      <div key={item.key} className="py-4 first:pt-0 last:pb-0 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="md:w-1/2">
                            <h4 className="font-bold text-xs uppercase text-slate-900 dark:text-white">
                              {item.label}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic leading-relaxed">
                              "{item.desc}"
                            </p>
                          </div>

                          {/* 1 - 5 Rating Radios */}
                          <div className="md:w-1/2 flex items-center justify-between md:justify-end gap-1.5 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleScoreChange(scoreKey, num)}
                                className={`flex-1 py-1.5 px-2 rounded font-bold text-xs transition-all ${
                                  currentScore === num
                                    ? "bg-cyan-600 text-white shadow-sm scale-105"
                                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Evidence Comments Box */}
                        <div>
                          <Textarea
                            placeholder="Evidence Comments (Catatan bukti perilaku/jawaban kandidat)..."
                            className="text-xs h-16 resize-none"
                            value={currentComment}
                            onChange={(e) => handleCommentChange(commentKey, e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}

            {/* Overall Decision Section */}
            <Card className="border shadow-md">
              <CardHeader className="bg-slate-900 text-white py-3 px-6">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  Keputusan & Rekomendasi Akhir Interview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div>
                  <Label className="text-xs font-bold uppercase mb-2 block">
                    REKOMENDASI AKHIR HASIL INTERVIEW *
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleScoreChange("overallRecommendation", "RECOMMENDED" as any)}
                      className={`p-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        scores.overallRecommendation === "RECOMMENDED"
                          ? "bg-emerald-500/10 border-emerald-600 text-emerald-600 dark:text-emerald-400 shadow"
                          : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Check className="w-5 h-5" />
                      RECOMMENDED (Disarankan)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScoreChange("overallRecommendation", "NOT_RECOMMENDED" as any)}
                      className={`p-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        scores.overallRecommendation === "NOT_RECOMMENDED"
                          ? "bg-rose-500/10 border-rose-600 text-rose-600 dark:text-rose-400 shadow"
                          : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      NOT RECOMMENDED (Tidak Disarankan)
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">
                    Job Match Between Experience, Knowledge Candidate With Job Requirement
                  </Label>
                  <Textarea
                    className="mt-1 text-xs h-20"
                    placeholder="Catatan kesesuaian antara latar belakang kandidat dengan syarat pekerjaan..."
                    value={scores.jobMatchComment}
                    onChange={(e) => handleCommentChange("jobMatchComment", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">
                    Recommendation for Other Position (Rekomendasi Posisi Lain jika Ada)
                  </Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="Misal: Disarankan untuk posisi Staff Supervisor Admin / Operational Specialist"
                    value={scores.recommendationOtherPosition}
                    onChange={(e) => handleCommentChange("recommendationOtherPosition", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Action Bar */}
            <div className="flex justify-end items-center gap-4">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 font-bold text-sm shadow-lg"
              >
                {isSubmitting ? (
                  "Menyimpan..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Simpan Penilaian Interview
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
