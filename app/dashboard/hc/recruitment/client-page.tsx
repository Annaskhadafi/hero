"use client";

import { useCallback, useMemo, useState } from "react";
import {
  IconClipboardCheck,
  IconClock,
  IconFileCheck,
  IconFileX,
  IconPlus,
  IconUsers,
  IconUserCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import {
  CheckCircle2,
  Eye,
  Star,
  Trash2,
  XCircle,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

import {
  createRecruitment,
  updateRecruitment,
  deleteRecruitment,
  getCandidates,
  getCandidateById,
  createCandidate,
  updateCandidateStage,
  rejectCandidate,
  hireCandidate,
  deleteCandidate,
} from "@/app/actions/recruitment";

import { AdminPageShell } from "@/components/admin-page-shell";
import { HcWorkspaceBanner, hcPrimaryActionClassName } from "@/components/hc/hc-workspace-banner";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import {
  EnterpriseScorecards,
  EnterpriseRecordDialog,
  EnterpriseFormGrid,
  EnterpriseActionButtons,
} from "@/components/ui/enterprise-table-kit";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────────────

type Recruitment = {
  id: number;
  jobTitle: string;
  totalRequested: number;
  section: string;
  status: string;
  requestDate: Date;
  dueDate: Date;
  candidateCount: number;
};

type Candidate = {
  id: number;
  recruitmentId: number | null;
  jobTitle: string | null;
  fullName: string;
  email: string;
  phone: string;
  source: string;
  currentStage: string;
  rating: number | null;
  notes: string;
  rejectionReason: string;
  createdAt: Date;
};

type StageRecord = {
  id: number;
  candidateId: number;
  stage: string;
  enteredAt: Date;
  exitedAt: Date | null;
  result: string;
  evaluator: string;
  notes: string;
  score: number | null;
  createdAt: Date;
};

type CandidateDetail = Candidate & {
  rejectedAtStage: string;
  cvUrl: string;
  stages: StageRecord[];
};

type Stats = {
  activeMPR: number;
  totalCandidates: number;
  hired: number;
  overdue: number;
};

// ─── Pipeline Statuses ────────────────────────────────────────────────────

const MPR_STATUSES = [
  "Draft",
  "Approved",
  "Sourcing",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;

const SOURCE_OPTIONS = [
  { value: "Direct", label: "Direct" },
  { value: "Jobstreet", label: "Jobstreet" },
  { value: "LinkedIn", label: "LinkedIn" },
  { value: "Referral", label: "Referral" },
  { value: "Agency", label: "Agency" },
];

const STAGE_OPTIONS = [
  "Sourcing",
  "Screening",
  "Psikotes",
  "Interview",
  "Offering",
  "Medical Checkup",
  "Hired",
  "Rejected",
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | Date | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stageBadge(stage: string) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    Sourcing: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    Screening: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    Psikotes: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
    Interview: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    Offering: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    "Medical Checkup": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    MCU: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    Hired: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    Rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  };

  const c = config[stage] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
  return (
    <Badge variant="outline" className={`rounded-full border ${c.border} ${c.bg} ${c.text} px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider`}>
      {stage}
    </Badge>
  );
}

function mprStatusBadge(status: string) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    Draft: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
    Approved: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
    Sourcing: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    "In Progress": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    Completed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    Cancelled: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  };

  const c = config[status] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
  return (
    <Badge variant="outline" className={`rounded-full border ${c.border} ${c.bg} ${c.text} px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider`}>
      {status}
    </Badge>
  );
}

function renderStars(rating: number | null) {
  if (!rating) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function getNextStage(currentStage: string): string | null {
  const idx = STAGE_OPTIONS.indexOf(currentStage);
  if (idx === -1 || idx >= 5) return null;
  return STAGE_OPTIONS[idx + 1];
}

// ─── Pipeline Visual ──────────────────────────────────────────────────────

function PipelineVisual({ status }: { status: string }) {
  const steps = ["Draft", "Approved", "Sourcing", "In Progress", "Selesai"];
  const mappedStatus = status === "Completed" ? "Selesai" : status;
  const currentIdx = steps.indexOf(mappedStatus);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isActive = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step} className="flex items-center">
            <div
              className={`h-2 w-6 rounded-full transition-colors ${
                isActive
                  ? isCurrent
                    ? "bg-blue-500"
                    : "bg-blue-300"
                  : "bg-gray-200"
              }`}
              title={step}
            />
            {i < steps.length - 1 && (
              <ChevronRight className="size-3 text-gray-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function RecruitmentClientPage({
  recruitments: initialRecruitments,
  candidates: initialCandidates,
  stats: initialStats,
}: {
  recruitments: Recruitment[];
  candidates: Candidate[];
  stats: Stats;
}) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [recruitments, setRecruitments] = useState<Recruitment[]>(initialRecruitments);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [activeTab, setActiveTab] = useState("mpr");

  // MPR dialog state
  const [isMprFormOpen, setIsMprFormOpen] = useState(false);
  const [editingMpr, setEditingMpr] = useState<Recruitment | null>(null);
  const [isDeleteMprOpen, setIsDeleteMprOpen] = useState(false);
  const [deleteMprTarget, setDeleteMprTarget] = useState<Recruitment | null>(null);
  const [mprForm, setMprForm] = useState({
    jobTitle: "",
    section: "",
    totalRequested: "1",
    dueDate: "",
    status: "Draft",
  });

  // Candidate dialog state
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    source: "Direct",
    recruitmentId: "",
    notes: "",
  });

  // View candidate detail
  const [viewCandidate, setViewCandidate] = useState<CandidateDetail | null>(null);
  const [isViewCandidateOpen, setIsViewCandidateOpen] = useState(false);

  // Advance stage dialog
  const [advanceTarget, setAdvanceTarget] = useState<Candidate | null>(null);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    evaluator: "",
    notes: "",
    score: "",
  });

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<Candidate | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Delete candidate
  const [isDeleteCandidateOpen, setIsDeleteCandidateOpen] = useState(false);
  const [deleteCandidateTarget, setDeleteCandidateTarget] = useState<Candidate | null>(null);

  // Filter by recruitment (clicking MPR shows its candidates)
  const [filterRecruitmentId, setFilterRecruitmentId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // ── Computed ──────────────────────────────────────────────────────────────

  const inProcessCount = useMemo(
    () =>
      candidates.filter(
        (c) => c.currentStage !== "Rejected" && c.currentStage !== "Hired"
      ).length,
    [candidates]
  );

  const hiredCount = useMemo(
    () => candidates.filter((c) => c.currentStage === "Hired").length,
    [candidates]
  );

  const rejectedCount = useMemo(
    () => candidates.filter((c) => c.currentStage === "Rejected").length,
    [candidates]
  );

  const filteredCandidates = useMemo(() => {
    if (!filterRecruitmentId) return candidates;
    return candidates.filter((c) => c.recruitmentId === filterRecruitmentId);
  }, [candidates, filterRecruitmentId]);

  const filterRecruitmentName = useMemo(() => {
    if (!filterRecruitmentId) return null;
    return recruitments.find((r) => r.id === filterRecruitmentId)?.jobTitle ?? null;
  }, [filterRecruitmentId, recruitments]);

  // ── MPR Handlers ──────────────────────────────────────────────────────────

  const resetMprForm = useCallback(() => {
    setMprForm({
      jobTitle: "",
      section: "",
      totalRequested: "1",
      dueDate: "",
      status: "Draft",
    });
    setEditingMpr(null);
  }, []);

  const handleOpenAddMpr = useCallback(() => {
    resetMprForm();
    setIsMprFormOpen(true);
  }, [resetMprForm]);

  const handleOpenEditMpr = useCallback((mpr: Recruitment) => {
    setEditingMpr(mpr);
    setMprForm({
      jobTitle: mpr.jobTitle,
      section: mpr.section,
      totalRequested: mpr.totalRequested.toString(),
      dueDate: new Date(mpr.dueDate).toISOString().split("T")[0],
      status: mpr.status,
    });
    setIsMprFormOpen(true);
  }, []);

  const handleSaveMpr = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = {
        jobTitle: mprForm.jobTitle,
        section: mprForm.section,
        totalRequested: parseInt(mprForm.totalRequested, 10) || 1,
        dueDate: mprForm.dueDate,
        status: mprForm.status,
      };

      if (editingMpr) {
        await updateRecruitment(editingMpr.id, payload);
      } else {
        await createRecruitment(payload);
      }

      // Refresh data
      const [newRecruitments, newStats] = await Promise.all([
        import("@/app/actions/recruitment").then((m) => m.getRecruitments()),
        import("@/app/actions/recruitment").then((m) => m.getRecruitmentStats()),
      ]);
      setRecruitments(newRecruitments);
      setStats(newStats);
      setIsMprFormOpen(false);
      resetMprForm();
    } catch {
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsLoading(false);
    }
  }, [mprForm, editingMpr, resetMprForm]);

  const handleDeleteMpr = useCallback(async () => {
    if (!deleteMprTarget) return;
    setIsLoading(true);
    try {
      await deleteRecruitment(deleteMprTarget.id);
      const [newRecruitments, newCandidates, newStats] = await Promise.all([
        import("@/app/actions/recruitment").then((m) => m.getRecruitments()),
        import("@/app/actions/recruitment").then((m) => m.getCandidates()),
        import("@/app/actions/recruitment").then((m) => m.getRecruitmentStats()),
      ]);
      setRecruitments(newRecruitments);
      setCandidates(newCandidates);
      setStats(newStats);
      setIsDeleteMprOpen(false);
      setDeleteMprTarget(null);
    } catch {
      alert("Terjadi kesalahan saat menghapus data.");
    } finally {
      setIsLoading(false);
    }
  }, [deleteMprTarget]);

  // ── Candidate Handlers ────────────────────────────────────────────────────

  const resetCandidateForm = useCallback(() => {
    setCandidateForm({
      fullName: "",
      email: "",
      phone: "",
      source: "Direct",
      recruitmentId: "",
      notes: "",
    });
  }, []);

  const handleOpenAddCandidate = useCallback(() => {
    resetCandidateForm();
    setIsAddCandidateOpen(true);
  }, [resetCandidateForm]);

  const handleSaveCandidate = useCallback(async () => {
    if (!candidateForm.recruitmentId || !candidateForm.fullName) return;
    setIsLoading(true);
    try {
      await createCandidate({
        recruitmentId: parseInt(candidateForm.recruitmentId, 10),
        fullName: candidateForm.fullName,
        email: candidateForm.email,
        phone: candidateForm.phone,
        source: candidateForm.source,
        notes: candidateForm.notes,
      });

      const [newCandidates, newStats] = await Promise.all([
        import("@/app/actions/recruitment").then((m) => m.getCandidates()),
        import("@/app/actions/recruitment").then((m) => m.getRecruitmentStats()),
      ]);
      setCandidates(newCandidates);
      setStats(newStats);
      setIsAddCandidateOpen(false);
      resetCandidateForm();
    } catch {
      alert("Terjadi kesalahan saat menambahkan kandidat.");
    } finally {
      setIsLoading(false);
    }
  }, [candidateForm, resetCandidateForm]);

  const handleViewCandidate = useCallback(async (cand: Candidate) => {
    const detail = await getCandidateById(cand.id);
    if (detail) {
      setViewCandidate(detail as CandidateDetail);
      setIsViewCandidateOpen(true);
    }
  }, []);

  const handleOpenAdvance = useCallback((cand: Candidate) => {
    setAdvanceTarget(cand);
    setAdvanceForm({ evaluator: "", notes: "", score: "" });
    setIsAdvanceOpen(true);
  }, []);

  const handleAdvanceStage = useCallback(async () => {
    if (!advanceTarget) return;
    const nextStage = getNextStage(advanceTarget.currentStage);
    if (!nextStage) return;

    setIsLoading(true);
    try {
      await updateCandidateStage(advanceTarget.id, nextStage, {
        evaluator: advanceForm.evaluator,
        notes: advanceForm.notes,
        score: advanceForm.score ? parseInt(advanceForm.score, 10) : undefined,
      });

      const [newCandidates, newStats] = await Promise.all([
        import("@/app/actions/recruitment").then((m) => m.getCandidates()),
        import("@/app/actions/recruitment").then((m) => m.getRecruitmentStats()),
      ]);
      setCandidates(newCandidates);
      setStats(newStats);
      setIsAdvanceOpen(false);
      setAdvanceTarget(null);
    } catch {
      alert("Terjadi kesalahan saat memajukan tahap kandidat.");
    } finally {
      setIsLoading(false);
    }
  }, [advanceTarget, advanceForm]);

  const handleOpenReject = useCallback((cand: Candidate) => {
    setRejectTarget(cand);
    setRejectReason("");
    setIsRejectOpen(true);
  }, []);

  const handleReject = useCallback(async () => {
    if (!rejectTarget || !rejectReason.trim()) return;

    setIsLoading(true);
    try {
      await rejectCandidate(rejectTarget.id, rejectTarget.currentStage, rejectReason);

      const [newCandidates, newStats] = await Promise.all([
        import("@/app/actions/recruitment").then((m) => m.getCandidates()),
        import("@/app/actions/recruitment").then((m) => m.getRecruitmentStats()),
      ]);
      setCandidates(newCandidates);
      setStats(newStats);
      setIsRejectOpen(false);
      setRejectTarget(null);
    } catch {
      alert("Terjadi kesalahan saat menolak kandidat.");
    } finally {
      setIsLoading(false);
    }
  }, [rejectTarget, rejectReason]);

  const handleHire = useCallback(async (cand: Candidate) => {
    if (!confirm(`Tandai ${cand.fullName} sebagai HIRED?`)) return;

    setIsLoading(true);
    try {
      await hireCandidate(cand.id);
      const [newCandidates, newStats] = await Promise.all([
        import("@/app/actions/recruitment").then((m) => m.getCandidates()),
        import("@/app/actions/recruitment").then((m) => m.getRecruitmentStats()),
      ]);
      setCandidates(newCandidates);
      setStats(newStats);
    } catch {
      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDeleteCandidate = useCallback(async () => {
    if (!deleteCandidateTarget) return;
    setIsLoading(true);
    try {
      await deleteCandidate(deleteCandidateTarget.id);
      const [newCandidates, newStats] = await Promise.all([
        import("@/app/actions/recruitment").then((m) => m.getCandidates()),
        import("@/app/actions/recruitment").then((m) => m.getRecruitmentStats()),
      ]);
      setCandidates(newCandidates);
      setStats(newStats);
      setIsDeleteCandidateOpen(false);
      setDeleteCandidateTarget(null);
    } catch {
      alert("Terjadi kesalahan saat menghapus kandidat.");
    } finally {
      setIsLoading(false);
    }
  }, [deleteCandidateTarget]);

  const handleFilterByRecruitment = useCallback((recruitmentId: number) => {
    setFilterRecruitmentId(recruitmentId);
    setActiveTab("candidates");
  }, []);

  // ── Scorecards ────────────────────────────────────────────────────────────

  const mprScorecards: React.ComponentProps<typeof EnterpriseScorecards>["items"] = [
    {
      label: "MPR Aktif",
      value: stats.activeMPR,
      description: "Permintaan tenaga kerja aktif",
      icon: <IconClipboardCheck className="size-5 text-sky-600" />,
      tone: "info",
    },
    {
      label: "Total Kandidat",
      value: stats.totalCandidates,
      description: "Semua kandidat dalam pipeline",
      icon: <IconUsers className="size-5 text-foreground" />,
      tone: "default",
    },
    {
      label: "Diterima (Hired)",
      value: stats.hired,
      description: "Kandidat yang berhasil di-hire",
      icon: <IconFileCheck className="size-5 text-emerald-600" />,
      tone: "success",
    },
    {
      label: "Terlambat",
      value: stats.overdue,
      description: "MPR melewati batas waktu",
      icon: <IconAlertTriangle className="size-5 text-rose-600" />,
      tone: "danger",
    },
  ];

  const candidateScorecards: React.ComponentProps<typeof EnterpriseScorecards>["items"] = [
    {
      label: "Total Kandidat",
      value: candidates.length,
      description: "Semua kandidat terdaftar",
      icon: <IconUsers className="size-5 text-foreground" />,
      tone: "default",
    },
    {
      label: "Dalam Proses",
      value: inProcessCount,
      description: "Sedang menjalani rekrutmen",
      icon: <IconClock className="size-5 text-sky-600" />,
      tone: "info",
    },
    {
      label: "Diterima",
      value: hiredCount,
      description: "Berhasil di-hire",
      icon: <IconUserCheck className="size-5 text-emerald-600" />,
      tone: "success",
    },
    {
      label: "Ditolak",
      value: rejectedCount,
      description: "Tidak lolos seleksi",
      icon: <IconFileX className="size-5 text-rose-600" />,
      tone: "danger",
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminPageShell
      eyebrow="HC - Recruitment"
      title="Recruitment"
      description="Kelola Man Power Request dan kandidat rekrutmen."
    >
      <HcWorkspaceBanner
        title="Recruitment Pipeline Desk"
        description="MPR dan kandidat dipisah rapi, tapi tetap terasa satu alur kerja: kebutuhan tenaga kerja, pipeline, stage, dan keputusan."
        items={[
          { label: "MPR", value: recruitments.length, tone: "slate" },
          { label: "Kandidat", value: candidates.length, tone: "sky" },
          { label: "Aktif", value: candidates.filter((candidate) => candidate.currentStage !== "Rejected" && candidate.currentStage !== "Hired").length, tone: "emerald" },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto rounded-2xl bg-slate-100/80 p-1">
          <TabsTrigger value="mpr">Man Power Request</TabsTrigger>
          <TabsTrigger value="candidates">Kandidat</TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: MPR ─────────────────────────────────────────────────── */}
        <TabsContent value="mpr" className="space-y-5">
          <EnterpriseScorecards items={mprScorecards} />

          <MinimalTableShell
            label="MPR"
            fileName="Data-MPR"
            searchPlaceholder="Cari MPR..."
            primaryAction={
              <Button onClick={handleOpenAddMpr} className={hcPrimaryActionClassName}>
                <IconPlus className="size-4 mr-2" />
                Tambah MPR
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Kandidat</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recruitments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Belum ada data MPR.
                    </TableCell>
                  </TableRow>
                ) : (
                  recruitments.map((mpr, index) => (
                    <TableRow key={mpr.id} data-filter-stage={mpr.status}>
                      <TableCell className="font-medium tabular-nums">{index + 1}</TableCell>
                      <TableCell className="font-semibold">{mpr.jobTitle}</TableCell>
                      <TableCell>{mpr.section}</TableCell>
                      <TableCell className="tabular-nums">{mpr.totalRequested} Orang</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold tabular-nums"
                          onClick={() => handleFilterByRecruitment(mpr.id)}
                        >
                          {mpr.candidateCount}
                          <ArrowRight className="size-3" />
                        </button>
                      </TableCell>
                      <TableCell>
                        <PipelineVisual status={mpr.status} />
                      </TableCell>
                      <TableCell data-date-value={new Date(mpr.dueDate).toISOString()}>
                        {formatDate(mpr.dueDate)}
                      </TableCell>
                      <TableCell>{mprStatusBadge(mpr.status)}</TableCell>
                      <TableCell className="text-right">
                        <EnterpriseActionButtons
                          access={{ canView: true, canEdit: true, canDelete: true }}
                          onView={() => handleFilterByRecruitment(mpr.id)}
                          onEdit={() => handleOpenEditMpr(mpr)}
                          onDelete={() => {
                            setDeleteMprTarget(mpr);
                            setIsDeleteMprOpen(true);
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

        {/* ─── Tab 2: Candidates ──────────────────────────────────────────── */}
        <TabsContent value="candidates" className="space-y-5">
          <EnterpriseScorecards items={candidateScorecards} />

          {filterRecruitmentId && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm">
              <span className="text-blue-700 font-medium">
                Menampilkan kandidat dari:
              </span>
              <Badge variant="outline" className="border-blue-300 bg-white text-blue-700">
                {filterRecruitmentName}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-blue-600 hover:text-blue-800"
                onClick={() => setFilterRecruitmentId(null)}
              >
                Tampilkan Semua
              </Button>
            </div>
          )}

          <MinimalTableShell
            label="Kandidat"
            fileName="Data-Kandidat"
            searchPlaceholder="Cari kandidat..."
            filters={
              <>
                <TableMultiFilter
                  label="Tahap"
                  filterKey="stage"
                  options={STAGE_OPTIONS.map((s) => ({ value: s, label: s }))}
                  widthClassName="w-[180px]"
                />
                <TableMultiFilter
                  label="Sumber"
                  filterKey="source"
                  options={SOURCE_OPTIONS}
                  widthClassName="w-[160px]"
                />
              </>
            }
            primaryAction={
              <Button onClick={handleOpenAddCandidate}>
                <IconPlus className="size-4 mr-2" />
                Tambah Kandidat
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead>Tahap</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {filterRecruitmentId
                        ? "Belum ada kandidat untuk posisi ini."
                        : "Belum ada data kandidat."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((cand, index) => {
                    const nextStage = getNextStage(cand.currentStage);
                    const canAdvance = nextStage !== null;
                    const canReject = cand.currentStage !== "Rejected" && cand.currentStage !== "Hired";
                    const canHire = cand.currentStage === "Medical Checkup";

                    return (
                      <TableRow
                        key={cand.id}
                        data-filter-stage={cand.currentStage}
                        data-filter-source={cand.source}
                      >
                        <TableCell className="font-medium tabular-nums">{index + 1}</TableCell>
                        <TableCell className="font-semibold">{cand.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{cand.email || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{cand.phone || "-"}</TableCell>
                        <TableCell>{cand.jobTitle ?? "-"}</TableCell>
                        <TableCell>
                          {cand.source ? (
                            <Badge variant="outline" className="rounded-full text-[10px]">
                              {cand.source}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{stageBadge(cand.currentStage)}</TableCell>
                        <TableCell>{renderStars(cand.rating)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="denseIcon"
                              onClick={() => handleViewCandidate(cand)}
                              aria-label="Lihat detail"
                            >
                              <Eye className="size-4" />
                            </Button>
                            {canAdvance && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="denseIcon"
                                onClick={() => handleOpenAdvance(cand)}
                                aria-label="Majukan tahap"
                                title={`Lanjut ke ${nextStage}`}
                              >
                                <ArrowRight className="size-4 text-blue-600" />
                              </Button>
                            )}
                            {canHire && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="denseIcon"
                                onClick={() => handleHire(cand)}
                                aria-label="Hire kandidat"
                              >
                                <CheckCircle2 className="size-4 text-emerald-600" />
                              </Button>
                            )}
                            {canReject && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="denseIcon"
                                onClick={() => handleOpenReject(cand)}
                                aria-label="Tolak kandidat"
                              >
                                <XCircle className="size-4 text-destructive" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="denseIcon"
                              onClick={() => {
                                setDeleteCandidateTarget(cand);
                                setIsDeleteCandidateOpen(true);
                              }}
                              aria-label="Hapus kandidat"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>
      </Tabs>

      {/* ─── Add/Edit MPR Dialog ──────────────────────────────────────────── */}
      <EnterpriseRecordDialog
        open={isMprFormOpen}
        onOpenChange={setIsMprFormOpen}
        title={editingMpr ? "Ubah MPR" : "Tambah MPR Baru"}
        description="Isi data permintaan tenaga kerja."
        mode="form"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsMprFormOpen(false)}>
              Batal
            </Button>
            <Button type="button" disabled={isLoading} onClick={handleSaveMpr}>
              {isLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </>
        }
      >
        <EnterpriseFormGrid>
          <div className="space-y-2 md:col-span-2">
            <Label>Posisi / Job Title</Label>
            <Input
              value={mprForm.jobTitle}
              onChange={(e) => setMprForm({ ...mprForm, jobTitle: e.target.value })}
              placeholder="Contoh: Mekanik Senior"
            />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Input
              value={mprForm.section}
              onChange={(e) => setMprForm({ ...mprForm, section: e.target.value })}
              placeholder="Contoh: Operation"
            />
          </div>
          <div className="space-y-2">
            <Label>Jumlah Dibutuhkan</Label>
            <Input
              type="number"
              min={1}
              value={mprForm.totalRequested}
              onChange={(e) => setMprForm({ ...mprForm, totalRequested: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Jatuh Tempo</Label>
            <Input
              type="date"
              value={mprForm.dueDate}
              onChange={(e) => setMprForm({ ...mprForm, dueDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={mprForm.status}
              onValueChange={(val) => setMprForm({ ...mprForm, status: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MPR_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </EnterpriseFormGrid>
      </EnterpriseRecordDialog>

      {/* ─── Delete MPR Confirmation ──────────────────────────────────────── */}
      <EnterpriseRecordDialog
        open={isDeleteMprOpen}
        onOpenChange={setIsDeleteMprOpen}
        title="Hapus MPR"
        description="Tindakan ini akan menghapus MPR dan semua kandidat terkait."
        mode="delete"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsDeleteMprOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isLoading}
              onClick={handleDeleteMpr}
            >
              {isLoading ? "Menghapus..." : "Hapus"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Apakah Anda yakin ingin menghapus MPR &ldquo;{deleteMprTarget?.jobTitle}&rdquo;?
          Semua data kandidat yang terkait juga akan dihapus.
        </p>
      </EnterpriseRecordDialog>

      {/* ─── Add Candidate Dialog ─────────────────────────────────────────── */}
      <EnterpriseRecordDialog
        open={isAddCandidateOpen}
        onOpenChange={setIsAddCandidateOpen}
        title="Tambah Kandidat"
        description="Tambahkan kandidat baru ke pipeline rekrutmen."
        mode="form"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddCandidateOpen(false)}>
              Batal
            </Button>
            <Button type="button" disabled={isLoading} onClick={handleSaveCandidate}>
              {isLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </>
        }
      >
        <EnterpriseFormGrid>
          <div className="space-y-2 md:col-span-2">
            <Label>Nama Lengkap</Label>
            <Input
              value={candidateForm.fullName}
              onChange={(e) => setCandidateForm({ ...candidateForm, fullName: e.target.value })}
              placeholder="Nama lengkap kandidat"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={candidateForm.email}
              onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Telepon</Label>
            <Input
              value={candidateForm.phone}
              onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
              placeholder="08xxx"
            />
          </div>
          <div className="space-y-2">
            <Label>Sumber</Label>
            <Select
              value={candidateForm.source}
              onValueChange={(val) => setCandidateForm({ ...candidateForm, source: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Posisi (MPR)</Label>
            <Select
              value={candidateForm.recruitmentId}
              onValueChange={(val) => setCandidateForm({ ...candidateForm, recruitmentId: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih posisi..." />
              </SelectTrigger>
              <SelectContent>
                {recruitments.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    {r.jobTitle} - {r.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Catatan</Label>
            <Textarea
              value={candidateForm.notes}
              onChange={(e) => setCandidateForm({ ...candidateForm, notes: e.target.value })}
              placeholder="Catatan tambahan..."
              rows={3}
            />
          </div>
        </EnterpriseFormGrid>
      </EnterpriseRecordDialog>

      {/* ─── View Candidate Detail Dialog ─────────────────────────────────── */}
      <EnterpriseRecordDialog
        open={isViewCandidateOpen}
        onOpenChange={setIsViewCandidateOpen}
        title={`Detail Kandidat: ${viewCandidate?.fullName ?? ""}`}
        description={viewCandidate?.jobTitle ? `Posisi: ${viewCandidate.jobTitle}` : undefined}
        mode="view"
      >
        {viewCandidate && (
          <div className="space-y-5">
            {/* Profile section */}
            <EnterpriseFormGrid>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
                <p className="text-sm">{viewCandidate.email || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telepon</p>
                <p className="text-sm">{viewCandidate.phone || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sumber</p>
                <p className="text-sm">{viewCandidate.source || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tahap Saat Ini</p>
                <div>{stageBadge(viewCandidate.currentStage)}</div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rating</p>
                <div>{renderStars(viewCandidate.rating)}</div>
              </div>
              {viewCandidate.currentStage === "Rejected" && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alasan Ditolak</p>
                  <p className="text-sm text-rose-600">
                    {viewCandidate.rejectionReason} (di tahap {viewCandidate.rejectedAtStage})
                  </p>
                </div>
              )}
            </EnterpriseFormGrid>

            {viewCandidate.notes && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan</p>
                <p className="text-sm whitespace-pre-wrap">{viewCandidate.notes}</p>
              </div>
            )}

            {/* Stage timeline */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Riwayat Tahapan</h4>
              {viewCandidate.stages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada riwayat tahapan.</p>
              ) : (
                <div className="relative space-y-0">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                  {viewCandidate.stages.map((stage) => (
                    <div key={stage.id} className="relative flex gap-3 pb-4">
                      <div className={`relative z-10 mt-1.5 size-[22px] shrink-0 rounded-full border-2 ${
                        stage.result === "fail"
                          ? "border-rose-400 bg-rose-100"
                          : stage.result === "pass"
                            ? "border-emerald-400 bg-emerald-100"
                            : "border-blue-400 bg-blue-100"
                      }`} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {stageBadge(stage.stage)}
                          {stage.result && (
                            <Badge
                              variant="outline"
                              className={`rounded-full text-[10px] ${
                                stage.result === "fail"
                                  ? "border-rose-300 bg-rose-50 text-rose-700"
                                  : stage.result === "pass"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-gray-300 bg-gray-50 text-gray-700"
                              }`}
                            >
                              {stage.result === "pass" ? "Lulus" : stage.result === "fail" ? "Gagal" : stage.result}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Masuk: {formatDateTime(stage.enteredAt)}
                          {stage.exitedAt && <> | Keluar: {formatDateTime(stage.exitedAt)}</>}
                        </p>
                        {stage.evaluator && (
                          <p className="text-xs text-muted-foreground">
                            Evaluator: {stage.evaluator}
                          </p>
                        )}
                        {stage.score != null && (
                          <p className="text-xs text-muted-foreground">
                            Skor: {stage.score}
                          </p>
                        )}
                        {stage.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            {stage.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </EnterpriseRecordDialog>

      {/* ─── Advance Stage Dialog ──────────────────────────────────────────── */}
      <EnterpriseRecordDialog
        open={isAdvanceOpen}
        onOpenChange={setIsAdvanceOpen}
        title="Majukan Tahap"
        description={
          advanceTarget
            ? `${advanceTarget.fullName}: ${advanceTarget.currentStage} -> ${getNextStage(advanceTarget.currentStage) ?? "-"}`
            : undefined
        }
        mode="form"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAdvanceOpen(false)}>
              Batal
            </Button>
            <Button type="button" disabled={isLoading} onClick={handleAdvanceStage}>
              {isLoading ? "Memproses..." : "Majukan"}
            </Button>
          </>
        }
      >
        <EnterpriseFormGrid>
          <div className="space-y-2">
            <Label>Evaluator</Label>
            <Input
              value={advanceForm.evaluator}
              onChange={(e) => setAdvanceForm({ ...advanceForm, evaluator: e.target.value })}
              placeholder="Nama evaluator"
            />
          </div>
          <div className="space-y-2">
            <Label>Skor (opsional)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={advanceForm.score}
              onChange={(e) => setAdvanceForm({ ...advanceForm, score: e.target.value })}
              placeholder="0-100"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Catatan</Label>
            <Textarea
              value={advanceForm.notes}
              onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
              placeholder="Catatan evaluasi..."
              rows={3}
            />
          </div>
        </EnterpriseFormGrid>
      </EnterpriseRecordDialog>

      {/* ─── Reject Dialog ────────────────────────────────────────────────── */}
      <EnterpriseRecordDialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Tolak Kandidat"
        description={
          rejectTarget
            ? `Tolak ${rejectTarget.fullName} pada tahap ${rejectTarget.currentStage}`
            : undefined
        }
        mode="delete"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsRejectOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isLoading || !rejectReason.trim()}
              onClick={handleReject}
            >
              {isLoading ? "Memproses..." : "Tolak Kandidat"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label>Alasan Penolakan</Label>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Jelaskan alasan penolakan..."
            rows={4}
          />
        </div>
      </EnterpriseRecordDialog>

      {/* ─── Delete Candidate Confirmation ────────────────────────────────── */}
      <EnterpriseRecordDialog
        open={isDeleteCandidateOpen}
        onOpenChange={setIsDeleteCandidateOpen}
        title="Hapus Kandidat"
        description="Tindakan ini tidak dapat dibatalkan."
        mode="delete"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsDeleteCandidateOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isLoading}
              onClick={handleDeleteCandidate}
            >
              {isLoading ? "Menghapus..." : "Hapus"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Apakah Anda yakin ingin menghapus kandidat &ldquo;{deleteCandidateTarget?.fullName}&rdquo;?
          Semua riwayat tahapan juga akan dihapus.
        </p>
      </EnterpriseRecordDialog>
    </AdminPageShell>
  );
}
