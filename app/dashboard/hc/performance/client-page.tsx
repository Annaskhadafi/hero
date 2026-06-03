"use client";

import { useCallback, useMemo, useState } from "react";
import { IconChartBar, IconClock, IconFileCheck, IconPlus, IconTarget } from "@tabler/icons-react";
import {
  acknowledgePerformanceReview,
  createPerformanceCycle,
  createPerformanceReview,
  deletePerformanceCycle,
  getPerformanceReviewById,
  getPerformanceReviews,
  getPerformanceStats,
  submitPerformanceReview,
  updatePerformanceCycle,
} from "@/app/actions/performance";
import { AdminPageShell } from "@/components/admin-page-shell";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { EnterpriseActionButtons, EnterpriseFormGrid, EnterpriseRecordDialog, EnterpriseScorecards } from "@/components/ui/enterprise-table-kit";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Cycle = { id: number; name: string; cycleType: string; year: number; periodStart: Date | string; periodEnd: Date | string; status: string; isActive: boolean; createdAt: Date | string; updatedAt: Date | string };
type Employee = { id: number; employeeId: string; fullName: string; email: string | null };
type Stats = { activeCycles: number; pendingReviews: number; averageScore: number; completedThisMonth: number };
type Review = { id: number; cycleId: number; employeeId: number; reviewerId: number | null; employeeName: string | null; employeeCode: string | null; reviewerName: string | null; cycleName: string | null; cycleType: string | null; cycleYear: number | null; overallScore: string | null; overallRating: string; strengths: string; improvements: string; comments: string; employeeComments: string; status: string; createdAt: Date | string };
type Kpi = { id?: number; kpiName: string; kpiDescription: string; targetValue: string; actualValue: string; weight: number; score: string; comments: string };
type Detail = Review & { kpis: (Kpi & { id: number; sortOrder: number })[] };

const REVIEW_STATUSES = ["draft", "submitted", "reviewed", "acknowledged"];
const CYCLE_STATUSES = ["draft", "active", "review", "closed"];
const CYCLE_TYPES = ["annual", "semi_annual", "quarterly"];
const RATINGS = ["Exceeds", "Meets", "Below", "Unsatisfactory"];

function formatDate(value: Date | string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(status: string) {
  const className = status === "acknowledged" || status === "closed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "active" || status === "submitted"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : status === "review" || status === "reviewed"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return <Badge variant="outline" className={`rounded-full text-[10px] uppercase ${className}`}>{status}</Badge>;
}

function emptyKpi(): Kpi {
  return { kpiName: "", kpiDescription: "", targetValue: "", actualValue: "", weight: 0, score: "", comments: "" };
}

export function PerformanceClientPage({ cycles, reviews, stats, employees }: { cycles: Cycle[]; reviews: Review[]; stats: Stats; employees: Employee[] }) {
  const [cycleRows, setCycleRows] = useState(cycles);
  const [reviewRows, setReviewRows] = useState(reviews);
  const [statRows, setStatRows] = useState(stats);
  const [tab, setTab] = useState("reviews");
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [cycleForm, setCycleForm] = useState({ name: "", cycleType: "annual", year: new Date().getFullYear().toString(), periodStart: "", periodEnd: "", status: "draft" });
  const [reviewForm, setReviewForm] = useState({ employeeId: "", cycleId: "", reviewerId: "", overallScore: "", overallRating: "Meets", strengths: "", improvements: "", comments: "" });
  const [kpis, setKpis] = useState<Kpi[]>([emptyKpi()]);

  const scorecards = useMemo(() => [
    { label: "Siklus Aktif", value: statRows.activeCycles, description: "Cycle penilaian aktif", icon: <IconTarget className="size-5 text-blue-600" />, tone: "info" as const },
    { label: "Review Pending", value: statRows.pendingReviews, description: "Belum selesai/diakui", icon: <IconClock className="size-5 text-amber-600" />, tone: "warning" as const },
    { label: "Rata-rata Skor", value: statRows.averageScore.toFixed(1), description: "Skor keseluruhan", icon: <IconChartBar className="size-5 text-foreground" />, tone: "default" as const },
    { label: "Selesai Bulan Ini", value: statRows.completedThisMonth, description: "Review acknowledged", icon: <IconFileCheck className="size-5 text-emerald-600" />, tone: "success" as const },
  ], [statRows]);

  const refresh = useCallback(async () => {
    const [newReviews, newStats] = await Promise.all([getPerformanceReviews(), getPerformanceStats()]);
    setReviewRows(newReviews as Review[]);
    setStatRows(newStats);
  }, []);

  const resetReview = useCallback(() => {
    setReviewForm({ employeeId: "", cycleId: "", reviewerId: "", overallScore: "", overallRating: "Meets", strengths: "", improvements: "", comments: "" });
    setKpis([emptyKpi()]);
  }, []);

  const openCycle = useCallback((cycle?: Cycle) => {
    setEditingCycle(cycle ?? null);
    setCycleForm(cycle ? {
      name: cycle.name,
      cycleType: cycle.cycleType,
      year: String(cycle.year),
      periodStart: new Date(cycle.periodStart).toISOString().split("T")[0],
      periodEnd: new Date(cycle.periodEnd).toISOString().split("T")[0],
      status: cycle.status,
    } : { name: "", cycleType: "annual", year: String(new Date().getFullYear()), periodStart: "", periodEnd: "", status: "draft" });
    setCycleOpen(true);
  }, []);

  const saveCycle = useCallback(async () => {
    setLoading(true);
    try {
      const payload = { ...cycleForm, year: Number(cycleForm.year) };
      const saved = editingCycle ? await updatePerformanceCycle(editingCycle.id, payload) : await createPerformanceCycle(payload);
      setCycleRows((rows) => editingCycle ? rows.map((row) => row.id === editingCycle.id ? saved as Cycle : row) : [saved as Cycle, ...rows]);
      setCycleOpen(false);
    } finally { setLoading(false); }
  }, [cycleForm, editingCycle]);

  const saveReview = useCallback(async () => {
    setLoading(true);
    try {
      await createPerformanceReview({
        cycleId: Number(reviewForm.cycleId),
        employeeId: Number(reviewForm.employeeId),
        reviewerId: reviewForm.reviewerId ? Number(reviewForm.reviewerId) : null,
        overallScore: reviewForm.overallScore,
        overallRating: reviewForm.overallRating,
        strengths: reviewForm.strengths,
        improvements: reviewForm.improvements,
        comments: reviewForm.comments,
        kpis: kpis.filter((kpi) => kpi.kpiName.trim()),
      });
      await refresh();
      resetReview();
      setReviewOpen(false);
    } finally { setLoading(false); }
  }, [kpis, refresh, resetReview, reviewForm]);

  const viewReview = useCallback(async (review: Review) => {
    const data = await getPerformanceReviewById(review.id);
    setDetail(data as Detail | null);
  }, []);

  const updateKpi = useCallback((index: number, patch: Partial<Kpi>) => {
    setKpis((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  }, []);

  return <AdminPageShell eyebrow="HC - Performance" title="Performance Management" description="Kelola review kinerja, KPI, dan siklus penilaian karyawan.">
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4"><TabsTrigger value="reviews">Performance Reviews</TabsTrigger><TabsTrigger value="cycles">Review Cycles</TabsTrigger></TabsList>
      <TabsContent value="reviews" className="space-y-5"><EnterpriseScorecards items={scorecards} />
        <MinimalTableShell label="Performance Reviews" fileName="Data-Performance-Reviews" searchPlaceholder="Cari review..." filters={<><TableMultiFilter label="Status" filterKey="status" options={REVIEW_STATUSES.map((s) => ({ value: s, label: s }))} /><Input type="date" className="h-9 w-[160px]" aria-label="Filter tanggal" /></>} primaryAction={<Button onClick={() => setReviewOpen(true)}><IconPlus className="mr-2 size-4" />Tambah Review</Button>}>
          <Table><TableHeader><TableRow><TableHead>Karyawan</TableHead><TableHead>Cycle</TableHead><TableHead>Reviewer</TableHead><TableHead>Overall Score</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{reviewRows.map((review) => <TableRow key={review.id} data-filter-status={review.status} data-date-value={new Date(review.createdAt).toISOString()}><TableCell className="font-semibold">{review.employeeName ?? "-"}</TableCell><TableCell>{review.cycleName ?? "-"}</TableCell><TableCell>{review.reviewerName ?? "-"}</TableCell><TableCell>{review.overallScore ?? "-"}</TableCell><TableCell>{review.overallRating || "-"}</TableCell><TableCell>{statusBadge(review.status)}</TableCell><TableCell className="text-right"><EnterpriseActionButtons access={{ canView: true, canEdit: true, canDelete: false }} onView={() => viewReview(review)} onEdit={() => submitPerformanceReview(review.id).then(refresh)} onDelete={() => acknowledgePerformanceReview(review.id).then(refresh)} labels={{ view: "Lihat", edit: "Submit", delete: "Acknowledge" }} /></TableCell></TableRow>)}</TableBody></Table>
        </MinimalTableShell></TabsContent>
      <TabsContent value="cycles" className="space-y-5"><MinimalTableShell label="Review Cycles" fileName="Data-Review-Cycles" searchPlaceholder="Cari cycle..." filters={<TableMultiFilter label="Status" filterKey="status" options={CYCLE_STATUSES.map((s) => ({ value: s, label: s }))} />} primaryAction={<Button onClick={() => openCycle()}><IconPlus className="mr-2 size-4" />Tambah Cycle</Button>}>
          <Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Tipe</TableHead><TableHead>Tahun</TableHead><TableHead>Period Start</TableHead><TableHead>Period End</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{cycleRows.map((cycle) => <TableRow key={cycle.id} data-filter-status={cycle.status}><TableCell className="font-semibold">{cycle.name}</TableCell><TableCell>{cycle.cycleType}</TableCell><TableCell>{cycle.year}</TableCell><TableCell>{formatDate(cycle.periodStart)}</TableCell><TableCell>{formatDate(cycle.periodEnd)}</TableCell><TableCell>{statusBadge(cycle.status)}</TableCell><TableCell className="text-right"><EnterpriseActionButtons access={{ canView: true, canEdit: true, canDelete: true }} onView={() => openCycle(cycle)} onEdit={() => openCycle(cycle)} onDelete={() => deletePerformanceCycle(cycle.id).then(() => setCycleRows((rows) => rows.filter((row) => row.id !== cycle.id)))} /></TableCell></TableRow>)}</TableBody></Table>
        </MinimalTableShell></TabsContent>
    </Tabs>

    <EnterpriseRecordDialog open={reviewOpen} onOpenChange={setReviewOpen} title="Tambah Performance Review" description="Isi penilaian kinerja dan KPI awal." mode="form" footer={<><Button variant="outline" onClick={() => setReviewOpen(false)}>Batal</Button><Button disabled={loading || !reviewForm.employeeId || !reviewForm.cycleId} onClick={saveReview}>Simpan</Button></>}>
      <EnterpriseFormGrid>
        <div className="space-y-2"><Label>Karyawan</Label><Select value={reviewForm.employeeId} onValueChange={(v) => setReviewForm({ ...reviewForm, employeeId: v })}><SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger><SelectContent>{employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Cycle</Label><Select value={reviewForm.cycleId} onValueChange={(v) => setReviewForm({ ...reviewForm, cycleId: v })}><SelectTrigger><SelectValue placeholder="Pilih cycle" /></SelectTrigger><SelectContent>{cycleRows.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Reviewer</Label><Select value={reviewForm.reviewerId} onValueChange={(v) => setReviewForm({ ...reviewForm, reviewerId: v })}><SelectTrigger><SelectValue placeholder="Pilih reviewer" /></SelectTrigger><SelectContent>{employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Rating</Label><Select value={reviewForm.overallRating} onValueChange={(v) => setReviewForm({ ...reviewForm, overallRating: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RATINGS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Overall Score</Label><Input type="number" value={reviewForm.overallScore} onChange={(e) => setReviewForm({ ...reviewForm, overallScore: e.target.value })} /></div>
        <div className="space-y-2 md:col-span-2"><Label>Strengths</Label><Textarea value={reviewForm.strengths} onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })} /></div>
        <div className="space-y-2 md:col-span-2"><Label>Improvements</Label><Textarea value={reviewForm.improvements} onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })} /></div>
        <div className="space-y-2 md:col-span-2"><Label>Comments</Label><Textarea value={reviewForm.comments} onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })} /></div>
      </EnterpriseFormGrid>
      <div className="mt-5 space-y-3"><div className="flex items-center justify-between"><Label>KPI Items</Label><Button type="button" variant="outline" size="sm" onClick={() => setKpis([...kpis, emptyKpi()])}>Tambah KPI</Button></div>{kpis.map((kpi, i) => <div key={i} className="grid gap-2 rounded-xl border p-3 md:grid-cols-5"><Input placeholder="Nama KPI" value={kpi.kpiName} onChange={(e) => updateKpi(i, { kpiName: e.target.value })} /><Input placeholder="Target" value={kpi.targetValue} onChange={(e) => updateKpi(i, { targetValue: e.target.value })} /><Input placeholder="Aktual" value={kpi.actualValue} onChange={(e) => updateKpi(i, { actualValue: e.target.value })} /><Input type="number" placeholder="Bobot" value={kpi.weight} onChange={(e) => updateKpi(i, { weight: Number(e.target.value) })} /><Input type="number" placeholder="Skor" value={kpi.score} onChange={(e) => updateKpi(i, { score: e.target.value })} /></div>)}</div>
    </EnterpriseRecordDialog>

    <EnterpriseRecordDialog open={!!detail} onOpenChange={() => setDetail(null)} title={`Detail Review: ${detail?.employeeName ?? ""}`} description={detail?.cycleName ?? undefined} mode="view">{detail && <div className="space-y-4"><EnterpriseFormGrid><p><b>Reviewer:</b> {detail.reviewerName ?? "-"}</p><p><b>Skor:</b> {detail.overallScore ?? "-"}</p><p><b>Rating:</b> {detail.overallRating || "-"}</p><p><b>Status:</b> {detail.status}</p></EnterpriseFormGrid><div><h4 className="mb-2 text-sm font-semibold">Daftar KPI</h4><div className="space-y-2">{detail.kpis.map((kpi) => <div key={kpi.id} className="rounded-lg border p-3 text-sm"><b>{kpi.kpiName}</b><p>Target: {kpi.targetValue || "-"} | Aktual: {kpi.actualValue || "-"} | Bobot: {kpi.weight}% | Skor: {kpi.score || "-"}</p></div>)}</div></div></div>}</EnterpriseRecordDialog>

    <EnterpriseRecordDialog open={cycleOpen} onOpenChange={setCycleOpen} title={editingCycle ? "Ubah Review Cycle" : "Tambah Review Cycle"} description="Atur periode dan status siklus penilaian." mode="form" footer={<><Button variant="outline" onClick={() => setCycleOpen(false)}>Batal</Button><Button disabled={loading} onClick={saveCycle}>Simpan</Button></>}><EnterpriseFormGrid><div className="space-y-2 md:col-span-2"><Label>Nama Cycle</Label><Input value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} /></div><div className="space-y-2"><Label>Tipe</Label><Select value={cycleForm.cycleType} onValueChange={(v) => setCycleForm({ ...cycleForm, cycleType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CYCLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Tahun</Label><Input type="number" value={cycleForm.year} onChange={(e) => setCycleForm({ ...cycleForm, year: e.target.value })} /></div><div className="space-y-2"><Label>Period Start</Label><Input type="date" value={cycleForm.periodStart} onChange={(e) => setCycleForm({ ...cycleForm, periodStart: e.target.value })} /></div><div className="space-y-2"><Label>Period End</Label><Input type="date" value={cycleForm.periodEnd} onChange={(e) => setCycleForm({ ...cycleForm, periodEnd: e.target.value })} /></div><div className="space-y-2"><Label>Status</Label><Select value={cycleForm.status} onValueChange={(v) => setCycleForm({ ...cycleForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CYCLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div></EnterpriseFormGrid></EnterpriseRecordDialog>
  </AdminPageShell>;
}
