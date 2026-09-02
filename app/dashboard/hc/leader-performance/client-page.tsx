"use client";

import { useCallback, useMemo, useState } from "react";
import {
  IconChartBar,
  IconClock,
  IconCopy,
  IconFileCheck,
  IconPlus,
  IconTarget,
  IconUsers,
} from "@tabler/icons-react";
import {
  createLeaderPerformanceReview,
  updateLeaderPerformanceReview,
  deleteLeaderPerformanceReview,
  submitLeaderPerformanceReview,
  acknowledgeLeaderPerformanceReview,
  getLeaderPerformanceReviews,
  getLeaderPerformanceStats,
} from "@/app/actions/leader-performance";
import { AdminPageShell } from "@/components/admin-page-shell";
import { hcPrimaryActionClassName, hcTableRowClassName } from "@/components/hc/hc-workspace-banner";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import {
  EnterpriseActionButtons,
  EnterpriseFormGrid,
  EnterpriseRecordDialog,
  EnterpriseScorecards,
} from "@/components/ui/enterprise-table-kit";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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

type Stats = {
  totalReviews: number;
  avgSurvey: number;
  avgResponseTime: number;
  avgLeadership: number;
};

type Employee = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string | null;
};

const STATUSES = ["draft", "submitted", "reviewed"];
const SCORE_OPTIONS = [
  { value: "1", label: "1 - Kurang" },
  { value: "2", label: "2 - Cukup" },
  { value: "3", label: "3 - Baik" },
  { value: "4", label: "4 - Sangat Baik" },
  { value: "5", label: "5 - Istimewa" },
];

function scoreBadge(score: number | string | null) {
  if (!score) return "-";
  const num = Number(score);
  const className =
    num >= 4.5
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 font-bold"
      : num >= 3.5
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : num >= 2.5
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : num >= 1.5
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700";
  return (
    <Badge variant="outline" className={`rounded-full px-2 text-[11px] ${className}`}>
      {num.toFixed(2)}
    </Badge>
  );
}

function matrixBadge(score: number | null) {
  if (score === null) return "-";
  if (score === 0) {
    return (
      <Badge variant="outline" className="rounded-md px-1.5 py-0.5 text-[10px] border-slate-200 bg-slate-50 text-slate-400">
        N/A
      </Badge>
    );
  }
  const className =
    score === 5
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : score === 4
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : score === 3
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : score === 2
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700";
  return (
    <Badge variant="outline" className={`rounded-md px-1.5 py-0.5 text-[10px] ${className}`}>
      {score}
    </Badge>
  );
}

function statusBadge(status: string) {
  const className =
    status === "reviewed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "submitted"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <Badge variant="outline" className={`rounded-full text-[10px] uppercase ${className}`}>
      {status}
    </Badge>
  );
}

export function LeaderPerformanceClientPage({
  initialReviews,
  initialStats,
  allowedLeaders,
  employees,
  currentUserEmail,
  isReviewerAdminOrManager,
}: {
  initialReviews: Review[];
  initialStats: Stats;
  allowedLeaders: any[];
  employees: Employee[];
  currentUserEmail: string;
  isReviewerAdminOrManager: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  // Auto-resolve current reviewer employee details
  const reviewerEmployee = useMemo(() => {
    return employees.find((emp) => emp.email === currentUserEmail) || null;
  }, [employees, currentUserEmail]);

  // Grouped charts data
  const leaderChartData = useMemo(() => {
    const groups: Record<string, { total: number; count: number }> = {};
    reviews.forEach((r) => {
      if (!r.leaderName) return;
      const score = Number(r.overallScore || 0);
      if (!groups[r.leaderName]) {
        groups[r.leaderName] = { total: 0, count: 0 };
      }
      groups[r.leaderName].total += score;
      groups[r.leaderName].count += 1;
    });
    return Object.entries(groups || {}).map(([name, val]) => ({
      name,
      score: Number((val.total / val.count).toFixed(2)),
    })).sort((a, b) => b.score - a.score);
  }, [reviews]);

  const metricChartData = useMemo(() => {
    if (reviews.length === 0) return [];
    let totalSurvey = 0, totalResponse = 0, totalLeadership = 0;
    reviews.forEach((r) => {
      totalSurvey += r.surveyScore;
      totalResponse += r.responseTimeScore;
      totalLeadership += r.leadershipScore;
    });
    const count = reviews.length;
    return [
      { name: "Survey PJO", score: Number((totalSurvey / count).toFixed(2)), fill: "#3b82f6" },
      { name: "Respon Time", score: Number((totalResponse / count).toFixed(2)), fill: "#6366f1" },
      { name: "Leadership", score: Number((totalLeadership / count).toFixed(2)), fill: "#10b981" },
    ];
  }, [reviews]);

  const statusChartData = useMemo(() => {
    const counts = { draft: 0, submitted: 0, reviewed: 0 };
    reviews.forEach((r) => {
      const s = r.status as keyof typeof counts;
      if (counts[s] !== undefined) {
        counts[s] += 1;
      }
    });
    return [
      { name: "DRAFT", value: counts.draft, color: "#64748b" },
      { name: "SUBMITTED", value: counts.submitted, color: "#3b82f6" },
      { name: "REVIEWED", value: counts.reviewed, color: "#10b981" },
    ].filter(c => c.value > 0);
  }, [reviews]);

  // Form State
  const [form, setForm] = useState({
    leaderId: "",
    reviewerId: "",
    period: "2026 Q1",
    surveyScore: "3",
    responseTimeScore: "3",
    leadershipScore: "3",
    feedback: "",
    status: "draft",
  });

  const selectedLeaderObj = useMemo(() => {
    return allowedLeaders.find((emp) => String(emp.id) === form.leaderId) || null;
  }, [allowedLeaders, form.leaderId]);

  const isPjoApplicable = useMemo(() => {
    if (!selectedLeaderObj) return true;
    const loc = (selectedLeaderObj.workLocation || "").trim().toLowerCase();
    const dept = (selectedLeaderObj.departmentName || "").trim().toLowerCase();
    if (loc.includes("balikpapan") || loc.includes("jakarta")) return false;
    return dept.includes("central service") || dept.includes("central services");
  }, [selectedLeaderObj]);

  const scorecards = useMemo(
    () => [
      {
        label: "Total Evaluasi",
        value: stats.totalReviews,
        description: "Jumlah penilaian terdaftar",
        icon: <IconUsers className="size-5 text-blue-600" />,
        tone: "info" as const,
      },
      {
        label: "Rata-rata Survey PJO",
        value: stats.avgSurvey.toFixed(2),
        description: "Matrik Survey PJO (1-5)",
        icon: <IconChartBar className="size-5 text-amber-600" />,
        tone: "warning" as const,
      },
      {
        label: "Rata-rata Respon Time",
        value: stats.avgResponseTime.toFixed(2),
        description: "Kecepatan Respon (1-5)",
        icon: <IconClock className="size-5 text-indigo-600" />,
        tone: "default" as const,
      },
      {
        label: "Rata-rata Leadership",
        value: stats.avgLeadership.toFixed(2),
        description: "Matrik Kepemimpinan (1-5)",
        icon: <IconFileCheck className="size-5 text-emerald-600" />,
        tone: "success" as const,
      },
    ],
    [stats]
  );

  const refreshData = useCallback(async () => {
    try {
      const [newReviews, newStats] = await Promise.all([
        getLeaderPerformanceReviews(),
        getLeaderPerformanceStats(),
      ]);
      setReviews(newReviews as Review[]);
      setStats(newStats);
    } catch (error) {
      console.error("Failed to refresh leader performance data", error);
    }
  }, []);

  const openAddDialog = () => {
    setEditingReview(null);
    setForm({
      leaderId: allowedLeaders[0]?.id ? String(allowedLeaders[0].id) : "",
      reviewerId: reviewerEmployee ? String(reviewerEmployee.id) : "",
      period: "2026 Q1",
      surveyScore: "3",
      responseTimeScore: "3",
      leadershipScore: "3",
      feedback: "",
      status: "draft",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (review: Review) => {
    setEditingReview(review);
    setForm({
      leaderId: String(review.leaderId),
      reviewerId: review.reviewerId ? String(review.reviewerId) : "",
      period: review.period,
      surveyScore: String(review.surveyScore),
      responseTimeScore: String(review.responseTimeScore),
      leadershipScore: String(review.leadershipScore),
      feedback: review.feedback,
      status: review.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.leaderId || !form.period) {
      toast.error("Leader dan Periode wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        leaderId: form.leaderId,
        reviewerId: form.reviewerId || null,
        period: form.period,
        surveyScore: isPjoApplicable ? Number(form.surveyScore) : 0,
        responseTimeScore: Number(form.responseTimeScore),
        leadershipScore: Number(form.leadershipScore),
        feedback: form.feedback,
        status: form.status,
      };

      if (editingReview) {
        await updateLeaderPerformanceReview(editingReview.id, payload);
        toast.success("Evaluasi berhasil diperbarui.");
      } else {
        await createLeaderPerformanceReview(payload);
        toast.success("Evaluasi berhasil dibuat.");
      }

      await refreshData();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan evaluasi.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus evaluasi ini?")) return;
    try {
      await deleteLeaderPerformanceReview(id);
      toast.success("Evaluasi berhasil dihapus.");
      await refreshData();
    } catch (error: any) {
      toast.error("Gagal menghapus evaluasi.");
    }
  };

  const handleStatusChange = async (review: Review, newStatus: string) => {
    try {
      if (newStatus === "submitted") {
        await submitLeaderPerformanceReview(review.id);
      } else if (newStatus === "reviewed") {
        await acknowledgeLeaderPerformanceReview(review.id);
      } else {
        await updateLeaderPerformanceReview(review.id, { status: newStatus });
      }
      toast.success(`Status berhasil diubah menjadi ${newStatus}.`);
      await refreshData();
    } catch (error) {
      toast.error("Gagal memperbarui status.");
    }
  };

  const viewDetails = (review: Review) => {
    setSelectedReview(review);
    setDetailOpen(true);
  };

  return (
    <AdminPageShell
      eyebrow="HC - Performance"
      title="Leader Performance"
      description="Evaluasi kinerja leaders (PJO, Technical Engineer, Section Head Central Service) dengan matrix nilai 1-5."
    >
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="mb-4 h-auto justify-start rounded-2xl bg-slate-100/80 p-1">
          <TabsTrigger value="list">Daftar Evaluasi</TabsTrigger>
          <TabsTrigger value="charts">Dashboard Analisis</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* KPI Grid */}
          <EnterpriseScorecards items={scorecards} />

          {/* Table View */}
          <MinimalTableShell
            label="Evaluasi Leader"
            fileName="Data-Evaluasi-Leader"
            searchPlaceholder="Cari nama leader atau reviewer..."
            filters={
              <TableMultiFilter
                label="Status"
                filterKey="status"
                options={STATUSES.map((s) => ({ value: s, label: s.toUpperCase() }))}
              />
            }
            primaryAction={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/mobile/leader-performance`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link broadcast mobile berhasil disalin ke clipboard!");
                  }}
                  className="rounded-xl border-slate-200 font-semibold"
                >
                  <IconCopy className="mr-2 size-4 text-slate-500" /> Salin Link Broadcast
                </Button>
                <Button onClick={openAddDialog} className={hcPrimaryActionClassName}>
                  <IconPlus className="mr-2 size-4" /> Tambah Evaluasi
                </Button>
              </div>
            }
          >
            <Table suppressHydrationWarning>
              <TableHeader>
                <TableRow>
                  <TableHead>Leader (Evaluated)</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-center">Survey</TableHead>
                  <TableHead className="text-center">Respon</TableHead>
                  <TableHead className="text-center">Leadership</TableHead>
                  <TableHead className="text-center">Overall</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      Belum ada data evaluasi leader.
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((review) => (
                    <TableRow
                      key={review.id}
                      className={hcTableRowClassName}
                      data-filter-status={review.status}
                    >
                      <TableCell className="font-semibold text-foreground">
                        {review.leaderName || "-"}
                      </TableCell>
                      <TableCell>{review.reviewerName || "-"}</TableCell>
                      <TableCell>{review.period}</TableCell>
                      <TableCell className="text-center">
                        {matrixBadge(review.surveyScore)}
                      </TableCell>
                      <TableCell className="text-center">
                        {matrixBadge(review.responseTimeScore)}
                      </TableCell>
                      <TableCell className="text-center">
                        {matrixBadge(review.leadershipScore)}
                      </TableCell>
                      <TableCell className="text-center">
                        {scoreBadge(review.overallScore)}
                      </TableCell>
                      <TableCell>
                        {/* Inline Status Change */}
                        <Select
                          value={review.status}
                          onValueChange={(val) => handleStatusChange(review, val)}
                        >
                          <SelectTrigger className="h-7 w-28 rounded-full border-0 bg-transparent p-0 shadow-none focus:ring-0">
                            <SelectValue>{statusBadge(review.status)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">DRAFT</SelectItem>
                            <SelectItem value="submitted">SUBMITTED</SelectItem>
                            <SelectItem value="reviewed">REVIEWED</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <EnterpriseActionButtons
                          access={{
                            canView: true,
                            canEdit: review.status === "draft",
                            canDelete: true,
                          }}
                          onView={() => viewDetails(review)}
                          onEdit={() => openEditDialog(review)}
                          onDelete={() => handleDelete(review.id)}
                          labels={{
                            view: "Lihat",
                            edit: "Ubah",
                            delete: "Hapus",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Chart 1: Leader score comparison */}
            <div className="rounded-[1.25rem] border bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-foreground text-sm tracking-tight">Rata-rata Skor per Leader</h3>
              <div className="h-[300px]">
                {leaderChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Belum ada data visualisasi</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaderChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 5]} stroke="#94a3b8" fontSize={11} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                      <RechartsTooltip />
                      <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Matrix score breakdown */}
            <div className="rounded-[1.25rem] border bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-foreground text-sm tracking-tight">Perbandingan Skor Metrik</h3>
              <div className="h-[300px]">
                {reviews.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Belum ada data visualisasi</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={11} />
                      <RechartsTooltip />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={36}>
                        {metricChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={(entry as any).fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 3: Evaluation status breakdown */}
            <div className="rounded-[1.25rem] border bg-white p-5 shadow-sm md:col-span-2">
              <h3 className="mb-4 font-semibold text-foreground text-sm tracking-tight">Distribusi Status Evaluasi</h3>
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 h-[250px]">
                {statusChartData.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Belum ada data status</div>
                ) : (
                  <>
                    <div className="w-[180px] h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2.5">
                      {statusChartData.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 text-xs">
                          <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold text-[#0f172a]">{item.name}</span>
                          <span className="text-muted-foreground">({item.value} evaluasi)</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Dialog */}
      <EnterpriseRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingReview ? "Ubah Evaluasi Leader" : "Tambah Evaluasi Leader"}
        description="Pilih leader yang akan dievaluasi dan input skor matrix nilai 1-5."
        mode="form"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button disabled={loading || !form.leaderId} onClick={handleSave}>
              Simpan
            </Button>
          </>
        }
      >
        <EnterpriseFormGrid>
          {/* Target Leader */}
          <div className="space-y-2">
            <Label>Leader (Yang Dinilai)</Label>
            {allowedLeaders.length === 1 ? (
              <div className="rounded-xl border bg-slate-50/50 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {allowedLeaders[0].fullName}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {allowedLeaders[0].positionName || "Leader"}
                </p>
              </div>
            ) : (
              <Select
                value={form.leaderId}
                onValueChange={(val) => setForm({ ...form, leaderId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Leader" />
                </SelectTrigger>
                <SelectContent>
                  {allowedLeaders.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Tidak ada leader yang memenuhi syarat untuk Anda nilai
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
            <Label>Periode</Label>
            <Select
              value={form.period}
              onValueChange={(val) => setForm({ ...form, period: val })}
            >
              <SelectTrigger>
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

          {/* Reviewer Selection (restricted override for admins) */}
          <div className="space-y-2 md:col-span-2">
            <Label>Reviewer (Penilai)</Label>
            {isReviewerAdminOrManager ? (
              <Select
                value={form.reviewerId}
                onValueChange={(val) => setForm({ ...form, reviewerId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Penilai" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={reviewerEmployee?.fullName || "Resolving Penilai..."} disabled />
            )}
          </div>

          {/* Survey Score */}
          <div className="space-y-2">
            <Label>Nilai Survey PJO (1-5)</Label>
            {isPjoApplicable ? (
              <Select
                value={form.surveyScore}
                onValueChange={(val) => setForm({ ...form, surveyScore: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCORE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-lg border bg-slate-50 p-2.5 text-xs text-slate-500 leading-relaxed">
                Tidak berlaku untuk lokasi <strong>{selectedLeaderObj?.workLocation || "N/A"}</strong> atau departemen <strong>{selectedLeaderObj?.departmentName || "N/A"}</strong>.
              </div>
            )}
          </div>

          {/* Response Time Score */}
          <div className="space-y-2">
            <Label>Nilai Respon Time (1-5)</Label>
            <Select
              value={form.responseTimeScore}
              onValueChange={(val) => setForm({ ...form, responseTimeScore: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCORE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Leadership Score */}
          <div className="space-y-2 md:col-span-2">
            <Label>Nilai Leadership (1-5)</Label>
            <Select
              value={form.leadershipScore}
              onValueChange={(val) => setForm({ ...form, leadershipScore: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCORE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Feedback/Comments */}
          <div className="space-y-2 md:col-span-2">
            <Label>Masukan & Komentar Kualitatif</Label>
            <Textarea
              rows={4}
              placeholder="Berikan masukan konstruktif untuk pimpinan terkait..."
              value={form.feedback}
              onChange={(e) => setForm({ ...form, feedback: e.target.value })}
            />
          </div>

          {/* Status */}
          <div className="space-y-2 md:col-span-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(val) => setForm({ ...form, status: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">DRAFT</SelectItem>
                <SelectItem value="submitted">SUBMITTED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </EnterpriseFormGrid>
      </EnterpriseRecordDialog>

      {/* Details View Dialog (Official Document layout) */}
      <EnterpriseRecordDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detail Evaluasi Leader"
        description="Hasil lembar penilaian pimpinan resmi."
        mode="view"
      >
        {selectedReview && (
          <div className="space-y-6">
            {/* Header/Info Card */}
            <div className="rounded-2xl border bg-slate-50/50 p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Leader (Yang Dinilai)
                  </span>
                  <h4 className="text-base font-bold text-foreground">
                    {selectedReview.leaderName || "-"}
                  </h4>
                  <p className="text-xs text-muted-foreground">{selectedReview.leaderEmail || ""}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Reviewer (Penilai)
                  </span>
                  <h4 className="text-base font-bold text-foreground">
                    {selectedReview.reviewerName || "-"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {selectedReview.reviewerEmail || ""}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Periode
                  </span>
                  <p className="text-sm font-semibold">{selectedReview.period}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status Dokumen
                  </span>
                  <div>{statusBadge(selectedReview.status)}</div>
                </div>
              </div>
            </div>

            {/* Matrix Scores list */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Matrik Skor Evaluasi</h4>
              <div className="divide-y rounded-2xl border">
                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-semibold">Survey PJO</p>
                    <p className="text-xs text-muted-foreground">
                      Kualitas survei dan kepatuhan standar operational PJO
                    </p>
                  </div>
                  {matrixBadge(selectedReview.surveyScore)}
                </div>
                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-semibold">Respon Time</p>
                    <p className="text-xs text-muted-foreground">
                      Kecepatan tanggapan dan resolusi isu lapangan
                    </p>
                  </div>
                  {matrixBadge(selectedReview.responseTimeScore)}
                </div>
                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-semibold">Leadership</p>
                    <p className="text-xs text-muted-foreground">
                      Kemampuan menggerakkan tim dan menjaga disiplin K3
                    </p>
                  </div>
                  {matrixBadge(selectedReview.leadershipScore)}
                </div>
                <div className="flex items-center justify-between bg-slate-50/50 p-4 font-bold text-foreground">
                  <div>
                    <p className="text-sm">Nilai Rata-rata Akhir (Overall)</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Kumulatif pembagian rata-rata skor metrik
                    </p>
                  </div>
                  {scoreBadge(selectedReview.overallScore)}
                </div>
              </div>
            </div>

            {/* Qualitative Feedback */}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Masukan & Komentar Kualitatif</h4>
              <div className="rounded-2xl border bg-white p-4">
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {selectedReview.feedback || "Tidak ada komentar kualitatif yang diberikan."}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setDetailOpen(false)}>Tutup</Button>
            </div>
          </div>
        )}
      </EnterpriseRecordDialog>
    </AdminPageShell>
  );
}
