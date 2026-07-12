"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, PlusCircle, History, Send, FileText, Trash2, Edit2, AlertCircle } from "lucide-react";
import {
  createLeaderPerformanceReview,
  updateLeaderPerformanceReview,
  deleteLeaderPerformanceReview,
  submitLeaderPerformanceReview,
  getLeaderPerformanceReviews,
  getLeaderPerformanceStats,
} from "@/app/actions/leader-performance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpeechTextarea as Textarea } from "@/components/ui/speech-textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Review = {
  id: number;
  leaderId: string;
  reviewerId: string | null;
  period: string;
  surveyScore: number;
  responseTimeScore: number;
  leadershipScore: number;
  overallScore: string | null;
  feedback: string;
  status: string;
  createdAt: Date | string;
  leaderName: string | null;
  leaderEmail: string | null;
  reviewerName: string | null;
  reviewerEmail: string | null;
};

type Employee = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string | null;
};

type Stats = {
  totalReviews: number;
  avgSurvey: number;
  avgResponseTime: number;
  avgLeadership: number;
};

export function MobileLeaderPerformanceClientPage({
  initialReviews,
  initialStats,
  allowedLeaders,
  employees,
  currentUserEmail,
  currentReviewerId,
  currentReviewerName,
  isReviewerAdminOrManager,
}: {
  initialReviews: Review[];
  initialStats: Stats;
  allowedLeaders: any[];
  employees: Employee[];
  currentUserEmail: string;
  currentReviewerId: string | null;
  currentReviewerName: string;
  isReviewerAdminOrManager: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [activeTab, setActiveTab] = useState<"survey" | "history">("survey");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [leaderId, setLeaderId] = useState(allowedLeaders[0]?.id ? String(allowedLeaders[0].id) : "");
  const [reviewerId, setReviewerId] = useState(currentReviewerId ? String(currentReviewerId) : "");
  const [period, setPeriod] = useState("2026 Q1");
  const [surveyScore, setSurveyScore] = useState<number>(3);
  const [responseTimeScore, setResponseTimeScore] = useState<number>(3);
  const [leadershipScore, setLeadershipScore] = useState<number>(3);
  const [feedback, setFeedback] = useState("");

  const selectedLeaderObj = allowedLeaders.find((emp) => String(emp.id) === leaderId);
  const isPjoApplicable = selectedLeaderObj
    ? (() => {
        const loc = (selectedLeaderObj.workLocation || "").trim().toLowerCase();
        const dept = (selectedLeaderObj.departmentName || "").trim().toLowerCase();
        if (loc.includes("balikpapan") || loc.includes("jakarta")) return false;
        return dept.includes("central service") || dept.includes("central services");
      })()
    : true;

  // Detail Modal
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const newReviews = await getLeaderPerformanceReviews();
      const filtered = isReviewerAdminOrManager
        ? newReviews
        : newReviews.filter((r) => r.reviewerEmail === currentUserEmail);
      setReviews(filtered as Review[]);
    } catch (e) {
      toast.error("Gagal menyegarkan data.");
    }
  }, [currentUserEmail, isReviewerAdminOrManager]);

  const handleScoreSelect = (metric: "survey" | "response" | "leadership", score: number) => {
    if (metric === "survey") setSurveyScore(score);
    if (metric === "response") setResponseTimeScore(score);
    if (metric === "leadership") setLeadershipScore(score);
  };

  const handleSave = async (submitDirectly = false) => {
    if (!leaderId) {
      toast.error("Silakan pilih leader.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        leaderId: leaderId,
        reviewerId: reviewerId || null,
        period,
        surveyScore: isPjoApplicable ? surveyScore : 0,
        responseTimeScore,
        leadershipScore,
        feedback,
        status: submitDirectly ? "submitted" : "draft",
      };

      if (editingId) {
        await updateLeaderPerformanceReview(editingId, payload);
        toast.success(submitDirectly ? "Evaluasi disubmit!" : "Draf disimpan!");
        setEditingId(null);
      } else {
        await createLeaderPerformanceReview(payload);
        toast.success(submitDirectly ? "Evaluasi berhasil disubmit!" : "Draf berhasil disimpan!");
      }

      await refreshData();
      resetForm();
      setActiveTab("history");
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan survey.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLeaderId(allowedLeaders[0]?.id ? String(allowedLeaders[0].id) : "");
    setPeriod("2026 Q1");
    setSurveyScore(3);
    setResponseTimeScore(3);
    setLeadershipScore(3);
    setFeedback("");
    setEditingId(null);
  };

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setLeaderId(String(review.leaderId));
    setReviewerId(review.reviewerId ? String(review.reviewerId) : "");
    setPeriod(review.period);
    setSurveyScore(review.surveyScore);
    setResponseTimeScore(review.responseTimeScore);
    setLeadershipScore(review.leadershipScore);
    setFeedback(review.feedback);
    setActiveTab("survey");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus draf penilaian ini?")) return;
    try {
      await deleteLeaderPerformanceReview(id);
      toast.success("Draf dihapus.");
      await refreshData();
    } catch (e) {
      toast.error("Gagal menghapus.");
    }
  };

  // 1-5 Score pills component builder
  const renderPills = (metric: "survey" | "response" | "leadership", currentVal: number) => {
    return (
      <div className="grid grid-cols-5 gap-2.5">
        {[1, 2, 3, 4, 5].map((score) => {
          const isSelected = currentVal === score;
          const bgClass = isSelected
            ? score === 5
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : score === 4
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : score === 3
              ? "bg-slate-600 text-white border-slate-600 shadow-sm"
              : score === 2
              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
              : "bg-rose-600 text-white border-rose-600 shadow-sm"
            : "bg-slate-50 text-[#003461] hover:bg-slate-100 border-slate-200/80";

          return (
            <button
              key={score}
              type="button"
              onClick={() => handleScoreSelect(metric, score)}
              className={`flex h-12 flex-col items-center justify-center rounded-2xl border text-sm font-black transition-all active:scale-95 ${bgClass}`}
            >
              <span>{score}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-16 space-y-4">
      {/* Header Area */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full bg-white/50 shadow-sm">
          <Link href="/mobile">
            <ArrowLeft className="size-5 text-[#003461]" />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Survei Kinerja</p>
          <h1 className="truncate text-xl font-black tracking-tight text-[#003461]">Leader Performance</h1>
        </div>
      </div>

      {/* Tabs list */}
      <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-white p-1.5 shadow-[0_4px_24px_rgba(8,32,51,0.04)] border">
        <button
          onClick={() => setActiveTab("survey")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "survey" ? "bg-[#003461] text-white shadow-sm" : "text-[#486275] active:bg-slate-50"
          }`}
        >
          <PlusCircle className="size-4" />
          {editingId ? "Edit Survei" : "Mulai Survei"}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "history" ? "bg-[#003461] text-white shadow-sm" : "text-[#486275] active:bg-slate-50"
          }`}
        >
          <History className="size-4" />
          Riwayat ({reviews.length})
        </button>
      </div>

      {/* Tab Survey */}
      {activeTab === "survey" && (
        <div className="space-y-4 rounded-3xl bg-white p-5 shadow-[0_16px_36px_rgba(8,32,51,0.05)] border border-slate-100/60">
          {editingId && (
            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800 font-semibold border border-amber-200">
              <AlertCircle className="size-4 shrink-0 text-amber-600" />
              <span>Mode Ubah Draf Aktif. Klik Batal untuk membatalkan.</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Selection of Leader */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#003461]">Leader Yang Dinilai</Label>
              {editingId ? (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                  <p className="text-sm font-black text-[#003461]">
                    {reviews.find((r) => r.id === editingId)?.leaderName || "Leader"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Mode Ubah Penilaian
                  </p>
                </div>
              ) : allowedLeaders.length === 1 ? (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                  <p className="text-sm font-black text-[#003461]">
                    {allowedLeaders[0].fullName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {allowedLeaders[0].positionName || "Leader"} • Section: {allowedLeaders[0].section || "N/A"}
                  </p>
                </div>
              ) : (
                <Select value={leaderId} onValueChange={setLeaderId}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-offset-0 focus:ring-0">
                    <SelectValue placeholder="Pilih Leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedLeaders.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Tidak ada leader yang dapat Anda nilai
                      </SelectItem>
                    ) : (
                      allowedLeaders.map((emp) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {emp.fullName} ({emp.positionName || "No Title"})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Period */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#003461]">Periode Penilaian</Label>
              <Select value={period} onValueChange={setPeriod} disabled={!!editingId}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-offset-0 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026 Q1">2026 Q1</SelectItem>
                  <SelectItem value="2026 Q2">2026 Q2</SelectItem>
                  <SelectItem value="2026 Q3">2026 Q3</SelectItem>
                  <SelectItem value="2026 Q4">2026 Q4</SelectItem>
                  <SelectItem value="2026 Annual">2026 Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reviewer Display */}
            <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200/40">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Penilai (Evaluator)</p>
              <p className="text-xs font-bold text-[#003461]">{currentReviewerName}</p>
            </div>

            <hr className="border-slate-100" />

            {/* Survey Score */}
            {isPjoApplicable ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-black uppercase text-[#003461]">Nilai Survey PJO</Label>
                  <span className="text-xs font-black text-slate-400">{surveyScore}/5</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">Matrik Survey PJO / Prosedur Standar</p>
                {renderPills("survey", surveyScore)}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/60 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-slate-500 font-bold">
                  <AlertCircle className="size-4 shrink-0 text-slate-400" />
                  <span>Nilai Survey PJO: Tidak Berlaku</span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Tidak berlaku untuk lokasi <strong>{selectedLeaderObj?.workLocation || "N/A"}</strong> atau departemen <strong>{selectedLeaderObj?.departmentName || "N/A"}</strong>.
                </p>
              </div>
            )}

            {/* Response Time Score */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-black uppercase text-[#003461]">Nilai Respon Time</Label>
                <span className="text-xs font-black text-slate-400">{responseTimeScore}/5</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">Kecepatan respon dan resolusi masalah</p>
              {renderPills("response", responseTimeScore)}
            </div>

            {/* Leadership Score */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-black uppercase text-[#003461]">Nilai Leadership</Label>
                <span className="text-xs font-black text-slate-400">{leadershipScore}/5</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">Kepemimpinan tim dan manajemen keselamatan</p>
              {renderPills("leadership", leadershipScore)}
            </div>

            <hr className="border-slate-100" />

            {/* Qualitative Feedback */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#003461]">Komentar & Masukan Lapangan</Label>
              <Textarea
                rows={3}
                placeholder="Tulis masukan atau feedback kualitatif untuk leader..."
                className="rounded-2xl border-slate-200 text-sm focus:ring-0 focus:ring-offset-0"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>

            {/* Form actions */}
            <div className="grid grid-cols-2 gap-3 pt-3">
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="h-12 rounded-2xl text-xs font-black text-slate-500 active:scale-95 transition-transform"
                >
                  Batal
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => handleSave(false)}
                  className="h-12 rounded-2xl text-xs font-black text-[#003461] border-slate-200 active:scale-95 transition-transform"
                >
                  Simpan Draf
                </Button>
              )}

              <Button
                type="button"
                disabled={loading || !leaderId}
                onClick={() => handleSave(true)}
                className="h-12 rounded-2xl text-xs font-black bg-[#003461] text-white hover:bg-[#003461]/90 active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/10"
              >
                <Send className="size-3.5" />
                Submit Nilai
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab History */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-[0_16px_36px_rgba(8,32,51,0.05)] border">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 mb-3">
                <FileText className="size-5 text-[#94a3b8]" />
              </div>
              <h4 className="text-sm font-bold text-[#003461]">Belum Ada Riwayat</h4>
              <p className="text-xs text-[#486275] mt-1 leading-relaxed">
                Anda belum melakukan penilaian leader dalam periode ini.
              </p>
            </div>
          ) : (
            reviews.map((review) => {
              const overall = Number(review.overallScore || 0);
              const scoreColor =
                overall >= 4.5
                  ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                  : overall >= 3.5
                  ? "text-blue-600 bg-blue-50 border-blue-100"
                  : overall >= 2.5
                  ? "text-slate-600 bg-slate-50 border-slate-100"
                  : "text-amber-600 bg-amber-50 border-amber-100";

              return (
                <div
                  key={review.id}
                  className="rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgba(8,32,51,0.04)] border border-slate-100 flex flex-col gap-3 active:scale-[0.99] transition-transform"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-[#003461] text-base leading-tight">
                        {review.leaderName}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Periode: {review.period}
                      </p>
                    </div>
                    {/* Score circle badge */}
                    <div
                      className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-2xl border text-xs font-black ${scoreColor}`}
                    >
                      {overall.toFixed(1)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-2 border-t border-slate-50">
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[8px] px-2 py-0.5 rounded-md font-bold uppercase ${
                          review.status === "reviewed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : review.status === "submitted"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        {review.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {review.status === "draft" && (
                        <>
                          <button
                            onClick={() => startEdit(review)}
                            className="p-2 bg-slate-50 rounded-xl border text-[#003461] hover:bg-slate-100"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="p-2 bg-rose-50 rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedReview(review);
                          setDetailOpen(true);
                        }}
                        className="text-[10px] font-black uppercase text-[#003461] tracking-wider px-2 h-7 bg-slate-50 hover:bg-slate-100 rounded-xl"
                      >
                        Detail
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        {selectedReview && (
          <DialogContent className="max-w-[92vw] rounded-3xl border-0 p-5 shadow-2xl">
            <DialogHeader className="text-left">
              <DialogTitle className="text-base font-black text-[#003461]">
                Detail Evaluasi Leader
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Laporan Hasil Penilaian
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-sm text-[#003461]">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Nama Leader (Dianalisis)
                </span>
                <p className="font-black text-[#003461] text-base leading-tight">
                  {selectedReview.leaderName}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Periode: {selectedReview.period}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Evaluator (Penilai)
                </span>
                <p className="font-bold text-xs">{selectedReview.reviewerName}</p>
              </div>

              <hr className="border-slate-100" />

              {/* Score matrix layout */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Matrik Nilai Metrik (1-5)
                </span>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/40">
                    <span className="block text-base font-black">
                      {selectedReview.surveyScore === 0 ? "N/A" : selectedReview.surveyScore}
                    </span>
                    <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">
                      Survey PJO
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/40">
                    <span className="block text-base font-black">
                      {selectedReview.responseTimeScore}
                    </span>
                    <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">
                      Respon
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/40">
                    <span className="block text-base font-black">
                      {selectedReview.leadershipScore}
                    </span>
                    <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">
                      Leadership
                    </span>
                  </div>
                </div>
              </div>

              {/* Cumulative average */}
              <div className="bg-[#e9f6fd] p-3 rounded-2xl border border-[#d7ecf9]/40 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Nilai Rata-rata Akhir
                  </p>
                  <p className="text-xs font-black text-[#003f78]">Overall Rating</p>
                </div>
                <span className="text-lg font-black text-[#003f78]">
                  {Number(selectedReview.overallScore || 0).toFixed(2)}
                </span>
              </div>

              {/* Feedback text */}
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Feedback & Masukan Lapangan
                </span>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/40">
                  <p className="text-xs leading-relaxed text-[#486275] whitespace-pre-wrap">
                    {selectedReview.feedback || "Tidak ada masukan kualitatif."}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  onClick={() => setDetailOpen(false)}
                  className="h-10 rounded-xl text-xs font-black bg-[#003461] text-white active:scale-95 transition-transform px-4"
                >
                  Tutup Laporan
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
