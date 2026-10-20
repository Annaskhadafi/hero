"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  IconCheck,
  IconX,
  IconUser,
  IconFileText,
  IconDownload,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconBriefcase,
  IconSchool,
  IconLoader2,
  IconAward,
} from "@tabler/icons-react";
import { submitInterviewEvaluation } from "@/app/actions/interviews";
import { ApplicationFormPreviewDialog } from "@/components/candidate/application-form-preview-dialog";

interface InterviewEvaluationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  currentUser?: { name?: string; email?: string };
  onSuccess?: () => void;
}

export function InterviewEvaluationModal({
  open,
  onOpenChange,
  session,
  currentUser,
  onSuccess,
}: InterviewEvaluationModalProps) {
  const [panelistName, setPanelistName] = useState<string>("");
  const [panelistEmail, setPanelistEmail] = useState<string>("");
  const [panelistRole, setPanelistRole] = useState<string>("User / Interviewer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewAppFormOpen, setPreviewAppFormOpen] = useState(false);

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

  useEffect(() => {
    if (open && session) {
      // Find if current user already submitted an evaluation for this session
      const existingUserEval = session.evaluations?.find(
        (e: any) =>
          (currentUser?.email && e.panelistEmail && e.panelistEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
          (currentUser?.name && e.panelistName && e.panelistName.toLowerCase() === currentUser.name.toLowerCase())
      );

      if (existingUserEval) {
        setPanelistName(existingUserEval.panelistName);
        setPanelistEmail(existingUserEval.panelistEmail);
        setPanelistRole(existingUserEval.panelistRole || "User / Interviewer");
        setScores({
          dayaTangkapScore: existingUserEval.dayaTangkapScore || 3,
          dayaTangkapComment: existingUserEval.dayaTangkapComment || "",
          problemSolvingScore: existingUserEval.problemSolvingScore || 3,
          problemSolvingComment: existingUserEval.problemSolvingComment || "",
          motivationalFitScore: existingUserEval.motivationalFitScore || 3,
          motivationalFitComment: existingUserEval.motivationalFitComment || "",
          adaptabilityScore: existingUserEval.adaptabilityScore || 3,
          adaptabilityComment: existingUserEval.adaptabilityComment || "",
          interpersonalSkillsScore: existingUserEval.interpersonalSkillsScore || 3,
          interpersonalSkillsComment: existingUserEval.interpersonalSkillsComment || "",
          communicationSkillScore: existingUserEval.communicationSkillScore || 3,
          communicationSkillComment: existingUserEval.communicationSkillComment || "",

          fundamentalUnderstandingScore: existingUserEval.fundamentalUnderstandingScore || 3,
          fundamentalUnderstandingComment: existingUserEval.fundamentalUnderstandingComment || "",
          experienceRelatedScore: existingUserEval.experienceRelatedScore || 3,
          experienceRelatedComment: existingUserEval.experienceRelatedComment || "",
          technicalSkillScore: existingUserEval.technicalSkillScore || 3,
          technicalSkillComment: existingUserEval.technicalSkillComment || "",

          managerialSkillsScore: existingUserEval.managerialSkillsScore || 3,
          managerialSkillsComment: existingUserEval.managerialSkillsComment || "",
          leadershipScore: existingUserEval.leadershipScore || 3,
          leadershipComment: existingUserEval.leadershipComment || "",
          teamWorkScore: existingUserEval.teamWorkScore || 3,
          teamWorkComment: existingUserEval.teamWorkComment || "",

          overallRecommendation: existingUserEval.overallRecommendation || "RECOMMENDED",
          jobMatchComment: existingUserEval.jobMatchComment || "",
          recommendationOtherPosition: existingUserEval.recommendationOtherPosition || "",
        });
      } else {
        setPanelistName(currentUser?.name || "");
        setPanelistEmail(currentUser?.email || "");
        setPanelistRole("User / Interviewer");
      }
    }
  }, [open, session, currentUser]);

  if (!session) return null;

  const candidate = session.candidate;

  const handleScoreChange = (field: string, val: number) => {
    setScores((prev) => ({ ...prev, [field]: val }));
  };

  const handleCommentChange = (field: string, val: string) => {
    setScores((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async () => {
    if (!panelistName.trim()) {
      return toast.error("Nama pewawancara wajib diisi.");
    }

    try {
      setIsSubmitting(true);
      await submitInterviewEvaluation({
        interviewId: session.id,
        candidateId: session.candidateId,
        stageName: session.stageName || "Interview 1",
        panelistName: panelistName.trim(),
        panelistEmail: panelistEmail.trim(),
        panelistRole: panelistRole.trim(),
        ...scores,
      });

      toast.success("Penilaian wawancara berhasil disimpan!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan penilaian wawancara.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dimensionsData = [
    {
      category: "1. PERSONAL QUALITIES",
      description: "Kualitas pribadi, daya tangkap, kemampuan analisis & komunikasi",
      items: [
        {
          key: "dayaTangkap",
          title: "DAYA TANGKAP",
          desc: "Kemampuan menangkap dan memahami informasi dengan cepat dan tepat",
          scoreKey: "dayaTangkapScore",
          commentKey: "dayaTangkapComment",
        },
        {
          key: "problemSolving",
          title: "PROBLEM SOLVING / ANALYTICAL ABILITY",
          desc: "Kemampuan menganalisa permasalahan yang dihadapi dan mencari alternatif solusi yang tepat",
          scoreKey: "problemSolvingScore",
          commentKey: "problemSolvingComment",
        },
        {
          key: "motivationalFit",
          title: "MOTIVATIONAL FIT",
          desc: "Memiliki kemauan untuk maju dan berkembang",
          scoreKey: "motivationalFitScore",
          commentKey: "motivationalFitComment",
        },
        {
          key: "adaptability",
          title: "ADAPTABILITY",
          desc: "Mampu menyesuaikan diri dan memberikan kontribusi positif di dalam lingkungan kerja dengan berbagai situasi, kondisi perubahan yang terjadi",
          scoreKey: "adaptabilityScore",
          commentKey: "adaptabilityComment",
        },
        {
          key: "interpersonalSkills",
          title: "INTERPERSONAL SKILLS",
          desc: "Kemampuan untuk membina hubungan dengan orang lain, bekerjasama, luwes, memenuhi & memahami nilai-nilai sosial yang berlaku",
          scoreKey: "interpersonalSkillsScore",
          commentKey: "interpersonalSkillsComment",
        },
        {
          key: "communicationSkill",
          title: "COMMUNICATION SKILL",
          desc: "Mampu menjelaskan ide atau memberikan informasi secara jelas dan sistematis",
          scoreKey: "communicationSkillScore",
          commentKey: "communicationSkillComment",
        },
      ],
    },
    {
      category: "2. PROFESIONAL SKILL & KNOWLEDGE",
      description: "Pemahaman bidang kerja, kompetensi teknis, dan pengalaman relevan",
      items: [
        {
          key: "fundamentalUnderstanding",
          title: "FUNDAMENTAL UNDERSTANDING ABOUT JOB FUNCTION FOR THIS POSITION",
          desc: "Memiliki pemahaman tentang posisi kerja yang dilamarnya",
          scoreKey: "fundamentalUnderstandingScore",
          commentKey: "fundamentalUnderstandingComment",
        },
        {
          key: "experienceRelated",
          title: "EXPERIENCE IN THE RELATED FIELD",
          desc: "Pengalaman yang sesuai dengan bidang kerja",
          scoreKey: "experienceRelatedScore",
          commentKey: "experienceRelatedComment",
        },
        {
          key: "technicalSkill",
          title: "TECHNICAL SKILL IN THE RELATED FIELD",
          desc: "Kemampuan teknis yang berhubungan dengan bidang kerja",
          scoreKey: "technicalSkillScore",
          commentKey: "technicalSkillComment",
        },
      ],
    },
    {
      category: "3. MANAGERIAL & LEADERSHIP",
      description: "Pengelolaan pekerjaan, kepemimpinan, dan kerjasama kelompok",
      items: [
        {
          key: "managerialSkills",
          title: "MANAGERIAL SKILLS",
          desc: "Kemampuan untuk mengelola atau melakukan pengaturan pekerjaan",
          scoreKey: "managerialSkillsScore",
          commentKey: "managerialSkillsComment",
        },
        {
          key: "leadership",
          title: "LEADERSHIP",
          desc: "Kemampuan untuk menciptakan dan memelihara kesamaan visi dan misi organisasi dengan memberikan arahan dan prioritas yang jelas",
          scoreKey: "leadershipScore",
          commentKey: "leadershipComment",
        },
        {
          key: "teamWork",
          title: "TEAM WORK",
          desc: "Kemampuan membangun dan memelihara kerjasama kelompok secara efektif dan melibatkan pihak terkait dalam mengatasi masalah serta memiliki komitmen terhadap pencapaian tujuan bersama",
          scoreKey: "teamWorkScore",
          commentKey: "teamWorkComment",
        },
      ],
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>Lembar Penilaian Wawancara (F.HR.STD.010.00)</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {session.stageName || "Interview 1"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Isi 12 dimensi evaluasi secara objektif beserta bukti/catatan untuk kandidat ini.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {candidate.cvUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 gap-1.5 text-xs font-medium"
                  >
                    <a href={candidate.cvUrl} target="_blank" rel="noopener noreferrer">
                      <IconDownload className="size-3.5 text-primary" />
                      <span>Lihat CV</span>
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewAppFormOpen(true)}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <IconFileText className="size-3.5 text-teal-600" />
                  <span>Lihat Application Form</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Body: 2-column on large screens or scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Candidate Quick Profile Card */}
            <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-base">
                    {candidate.fullName ? candidate.fullName.charAt(0).toUpperCase() : "K"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{candidate.fullName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {candidate.email || "-"} · {candidate.phone || "-"}
                    </p>
                  </div>
                </div>

                {/* Test Results Summary Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {candidate.apmScore !== null && candidate.apmScore !== undefined && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200">
                      APM: {candidate.apmScore}
                    </Badge>
                  )}
                  {candidate.amrScore !== null && candidate.amrScore !== undefined && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200">
                      AMR: {candidate.amrScore}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    Tahap: {candidate.currentStage || "Interview"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Posisi Dilamar:</span>
                  <span className="font-semibold text-foreground">{candidate.vacancyTitle || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Usia:</span>
                  <span className="font-semibold text-foreground">{candidate.ageStr || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Pendidikan:</span>
                  <span className="font-semibold text-foreground truncate block">{candidate.educationStr || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Jadwal Sesi:</span>
                  <span className="font-semibold text-foreground">
                    {session.scheduledAt ? new Date(session.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Evaluator Identity Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border/80 bg-background text-xs">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground">Nama Pewawancara *</Label>
                <Input
                  value={panelistName}
                  onChange={(e) => setPanelistName(e.target.value)}
                  placeholder="Nama Lengkap Anda"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground">Email Pewawancara</Label>
                <Input
                  value={panelistEmail}
                  onChange={(e) => setPanelistEmail(e.target.value)}
                  placeholder="email@chitraparatama.com"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground">Peran / Jabatan</Label>
                <Input
                  value={panelistRole}
                  onChange={(e) => setPanelistRole(e.target.value)}
                  placeholder="User / HC / Dept Head"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            {/* 12 Dimensions Sections */}
            {dimensionsData.map((cat, catIdx) => (
              <div key={catIdx} className="space-y-3">
                <div className="border-b pb-1.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-primary">{cat.category}</h4>
                  <p className="text-[11px] text-muted-foreground">{cat.description}</p>
                </div>

                <div className="space-y-4">
                  {cat.items.map((item) => {
                    const currentScore = (scores as any)[item.scoreKey] || 3;
                    const currentComment = (scores as any)[item.commentKey] || "";

                    return (
                      <div key={item.key} className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-0.5 flex-1 pr-2">
                            <h5 className="font-bold text-xs text-foreground tracking-wide">{item.title}</h5>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                          </div>

                          {/* 1 to 5 Score Buttons */}
                          <div className="flex items-center gap-1 shrink-0 self-start sm:self-auto bg-muted/40 p-1 rounded-lg border border-border/50">
                            {[
                              { val: 1, label: "1 (Very Weak)" },
                              { val: 2, label: "2 (Weak)" },
                              { val: 3, label: "3 (Capable)" },
                              { val: 4, label: "4 (Strong)" },
                              { val: 5, label: "5 (Very Strong)" },
                            ].map((s) => (
                              <button
                                key={s.val}
                                type="button"
                                onClick={() => handleScoreChange(item.scoreKey, s.val)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                                  currentScore === s.val
                                    ? s.val >= 4
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : s.val === 3
                                      ? "bg-blue-600 text-white shadow-xs"
                                      : "bg-rose-600 text-white shadow-xs"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                                title={s.label}
                              >
                                {s.val}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Evidence Comments Input */}
                        <div>
                          <Textarea
                            value={currentComment}
                            onChange={(e) => handleCommentChange(item.commentKey, e.target.value)}
                            placeholder="Catatan bukti / Evidence comments untuk dimensi ini..."
                            rows={2}
                            className="text-xs bg-background/50 resize-y min-h-[48px]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Final Recommendation Box */}
            <div className="p-4 rounded-xl border-2 border-primary/40 bg-primary/5 space-y-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider block mb-2 text-foreground">
                  Job Match Between Experience, Knowledge Candidate with Job Requirement *
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleScoreChange("overallRecommendation", "RECOMMENDED" as any)}
                    className={`py-3 px-4 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      scores.overallRecommendation === "RECOMMENDED"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:border-emerald-500"
                    }`}
                  >
                    <IconCheck className="size-4" />
                    <span>RECOMMENDED (Direkomendasikan)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScoreChange("overallRecommendation", "NOT_RECOMMENDED" as any)}
                    className={`py-3 px-4 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      scores.overallRecommendation === "NOT_RECOMMENDED"
                        ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:border-rose-500"
                    }`}
                  >
                    <IconX className="size-4" />
                    <span>NOT RECOMMENDED (Tidak Direkomendasikan)</span>
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Catatan Kesesuaian / Job Match Comments
                </Label>
                <Textarea
                  value={scores.jobMatchComment}
                  onChange={(e) => handleCommentChange("jobMatchComment", e.target.value)}
                  placeholder="Berikan alasan atau kesimpulan singkat kesesuaian kandidat dengan kualifikasi jabatan..."
                  rows={2}
                  className="text-xs bg-background"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Recommendation for Other Position (Rekomendasi Jabatan Lain)
                </Label>
                <Input
                  value={scores.recommendationOtherPosition}
                  onChange={(e) => handleCommentChange("recommendationOtherPosition", e.target.value)}
                  placeholder="Misal: Posisi Tyre Technician / Service Admin..."
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-between">
            <div className="text-xs text-muted-foreground hidden sm:block">
              Format Standar PT Chitra Paratama: <strong className="font-mono">F.HR.STD.010.00</strong>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-9 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
              >
                {isSubmitting && <IconLoader2 className="size-3.5 animate-spin" />}
                <span>Simpan & Kirim Penilaian</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Form Preview Modal if candidate has test results */}
      {previewAppFormOpen && (
        <ApplicationFormPreviewDialog
          open={previewAppFormOpen}
          onOpenChange={setPreviewAppFormOpen}
          entry={{ candidate, testScores: { apm: candidate.apmScore, amr: candidate.amrScore } }}
          testTitle="Application Form (F.HR.STD.006.00)"
        />
      )}
    </>
  );
}
