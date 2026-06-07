"use client";

import { useState, useEffect } from "react";
import {
  IconBriefcase,
  IconUsers,
  IconCopy,
  IconSettings,
  IconBrain,
  IconFileText,
  IconEye,
  IconPlus,
  IconTrash,
  IconExternalLink,
  IconMail,
  IconBuilding,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { updateRecruitment, createRecruitment, deleteRecruitment, deleteCandidate, deleteMultipleCandidates, getCandidatesPaginated, updateCandidateStage, getCandidateEmailStatuses, getCvDownloadUrl } from "@/app/actions/recruitment";
import { bulkAssignTestToCandidates } from "@/app/actions/recruitment-tests";
import { getBatchesByRecruitment, createBatch, updateBatch, deleteBatch } from "@/app/actions/hc-recruitment-batches";
import Link from "next/link";

import { AdminPageShell } from "@/components/admin-page-shell";
import { HcWorkspaceBanner, hcPrimaryActionClassName, hcTableRowClassName, hcMutedPanelClassName } from "@/components/hc/hc-workspace-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { KanbanBoard } from "./kanban-board";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Types ────────────────────────────────────────────────────────────────

type Recruitment = {
  id: number;
  jobTitle: string;
  department: string;
  section: string;
  location: string;
  totalRequested: number;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  candidateCount: number;
  isPublic?: boolean;
  jobDescription?: string;
  requirements?: string;
  qualifications?: string[] | null;
  mandatoryFields?: string[] | null;
  emailTemplateId?: number | null;
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
  cvUrl: string;
  aiScore: number | null;
  aiSummary: string;
  rejectionReason: string;
  createdAt: Date;
};

type RecruitmentStats = {
  activeMPR: number;
  totalCandidates: number;
  hired: number;
  overdue: number;
};

interface RecruitmentClientPageProps {
  recruitments: Recruitment[];
  initialCandidates: {
    data: Candidate[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  stats: RecruitmentStats;
  formOptions: {
    departments: { id: number; name: string }[];
    sections: { id: number; name: string; departmentId: number | null }[];
  };
}

export function RecruitmentClientPage({
  recruitments: initialRecruitments,
  initialCandidates: paginatedCandidates,
  stats,
  formOptions,
}: RecruitmentClientPageProps) {
  const [candidates, setCandidates] = useState<Candidate[]>(paginatedCandidates.data);
  const [candidatePage, setCandidatePage] = useState(paginatedCandidates);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [activeView, setActiveView] = useState<"vacancies" | "pipeline">("vacancies");
  const [pipelineJobIdFilter, setPipelineJobIdFilter] = useState<number | null>(null);
  const [pipelineViewMode, setPipelineViewMode] = useState<"list" | "kanban">("list");
  const [recruitments, setRecruitments] = useState(initialRecruitments);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [emailStatuses, setEmailStatuses] = useState<Record<number, { status: string; lastSentAt: Date | null; templateName: string | null }>>({});
  const [cvViewerUrl, setCvViewerUrl] = useState<string | null>(null);
  const [cvViewerName, setCvViewerName] = useState("");
  const [cvLoadingId, setCvLoadingId] = useState<number | null>(null);

  // Test Invitation Dialog
  const [isTestInviteOpen, setIsTestInviteOpen] = useState(false);
  const [testInviteForm, setTestInviteForm] = useState({ testId: "", scheduledDate: "", scheduledTime: "", expiresInDays: 7, batchId: "" });
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [availableTests, setAvailableTests] = useState<Array<{ id: number; title: string; isApplicationForm: boolean; timeLimitMinutes: number; passingScore: number }>>([]);
  const [availableBatches, setAvailableBatches] = useState<Array<{ id: number; batchName: string; batchType: string; scheduledAt: Date }>>([]);

  // Batch Management
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchJobId, setBatchJobId] = useState<number | null>(null);
  const [batches, setBatches] = useState<Array<{ id: number; batchName: string; batchType: string; scheduledAt: Date; recruitmentId: number }>>([]);
  const [batchForm, setBatchForm] = useState({ batchName: "", batchType: "psikotes_1", scheduledDate: "", scheduledTime: "" });
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const openBatches = async (jobId: number) => {
    setBatchJobId(jobId);
    setIsBatchOpen(true);
    setEditingBatchId(null);
    setBatchForm({ batchName: "", batchType: "psikotes_1", scheduledDate: "", scheduledTime: "" });
    try {
      const list = await getBatchesByRecruitment(jobId);
      setBatches(list);
    } catch (e) { setBatches([]); }
  };

  const handleSaveBatch = async () => {
    if (!batchForm.batchName || !batchForm.scheduledDate || !batchForm.scheduledTime || !batchJobId) {
      toast.error("Isi semua field batch");
      return;
    }
    setBatchLoading(true);
    const scheduledAt = new Date(`${batchForm.scheduledDate}T${batchForm.scheduledTime}`);
    try {
      if (editingBatchId) {
        await updateBatch(editingBatchId, { batchName: batchForm.batchName, batchType: batchForm.batchType, scheduledAt });
        setBatches(prev => prev.map(b => b.id === editingBatchId ? { ...b, batchName: batchForm.batchName, batchType: batchForm.batchType, scheduledAt } : b));
        toast.success("Batch updated");
      } else {
        const created = await createBatch({ recruitmentId: batchJobId, batchName: batchForm.batchName, batchType: batchForm.batchType, scheduledAt });
        setBatches(prev => [...prev, created]);
        toast.success("Batch created");
      }
      setEditingBatchId(null);
      setBatchForm({ batchName: "", batchType: "psikotes_1", scheduledDate: "", scheduledTime: "" });
    } catch (e: any) {
      toast.error(e.message || "Failed to save batch");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleDeleteBatch = async (id: number) => {
    if (!confirm("Delete batch ini?")) return;
    await deleteBatch(id);
    setBatches(prev => prev.filter(b => b.id !== id));
    toast.success("Batch deleted");
  };

  const handleEditBatch = (batch: any) => {
    setEditingBatchId(batch.id);
    const d = new Date(batch.scheduledAt);
    const dateStr = d.toISOString().split("T")[0];
    const timeStr = d.toTimeString().slice(0, 5);
    setBatchForm({ batchName: batch.batchName, batchType: batch.batchType, scheduledDate: dateStr, scheduledTime: timeStr });
  };

  const openTestInvite = async () => {
    try {
      const { getOnlineTests } = await import("@/app/actions/recruitment-tests");
      const tests = await getOnlineTests();
      setAvailableTests(tests.filter((t: any) => t.isActive && !t.isApplicationForm));
    } catch (e) {
      toast.error("Failed to load tests");
    }
    // Load batches for the first selected candidate's job
    if (selectedIds.size > 0) {
      const firstCand = candidates.find(c => selectedIds.has(c.id));
      if (firstCand?.recruitmentId) {
        try {
          const list = await getBatchesByRecruitment(firstCand.recruitmentId);
          setAvailableBatches(list);
        } catch { setAvailableBatches([]); }
      } else { setAvailableBatches([]); }
    }
    setTestInviteForm({ testId: "", scheduledDate: "", scheduledTime: "", expiresInDays: 7, batchId: "" });
    setIsTestInviteOpen(true);
  };

  const handleSendTestInvitation = async () => {
    if (!testInviteForm.testId || selectedIds.size === 0) {
      toast.error("Pilih test dan minimal 1 kandidat");
      return;
    }
    setIsSendingTest(true);
    try {
      let scheduledAt: Date | null = null;
      if (testInviteForm.scheduledDate && testInviteForm.scheduledTime) {
        scheduledAt = new Date(`${testInviteForm.scheduledDate}T${testInviteForm.scheduledTime}`);
      }
      const result = await bulkAssignTestToCandidates(
        parseInt(testInviteForm.testId),
        Array.from(selectedIds),
        testInviteForm.expiresInDays,
        scheduledAt,
      );
      const successCount = result.results.filter(r => r.success).length;
      toast.success(`Test invitation sent to ${successCount} candidates${result.results.find(r => !r.success) ? `, ${result.results.filter(r => !r.success).length} failed` : ""}`);
      setIsTestInviteOpen(false);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message || "Failed to send invitation");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleViewCv = async (cvUrl: string, candidateName: string) => {
    setCvLoadingId(-1);
    try {
      const url = await getCvDownloadUrl(cvUrl);
      setCvViewerUrl(url);
      setCvViewerName(candidateName);
    } catch {
      toast.error("Failed to load CV");
    } finally {
      setCvLoadingId(null);
    }
  };

  const refreshEmailStatuses = async (candList: Candidate[]) => {
    const ids = candList.map(c => c.id);
    if (ids.length === 0) return;
    try {
      const statuses = await getCandidateEmailStatuses(ids);
      setEmailStatuses(prev => {
        const next = { ...prev };
        for (const s of statuses) next[s.candidateId] = s;
        return next;
      });
    } catch {}
  };

  useEffect(() => {
    refreshEmailStatuses(candidates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleCandidates = pipelineJobIdFilter
    ? candidates.filter(c => c.recruitmentId === pipelineJobIdFilter)
    : candidates;

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (visibleCandidates.every(c => selectedIds.has(c.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleCandidates.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} kandidat? Aksi ini tidak bisa dibatalkan.`)) return;
    try {
      await deleteMultipleCandidates(Array.from(selectedIds));
      setCandidates(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} kandidat dihapus.`);
    } catch (e: any) {
      toast.error(e.message || "Gagal hapus");
    }
  };

  // Settings Dialog State
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Candidate List Dialog State
  const [isCandidateListOpen, setIsCandidateListOpen] = useState(false);
  const [selectedCandidateListJobId, setSelectedCandidateListJobId] = useState<number | null>(null);
  const [dialogCandidates, setDialogCandidates] = useState<Candidate[]>([]);
  const [dialogCandidatesLoading, setDialogCandidatesLoading] = useState(false);
  const [dialogCandidatePage, setDialogCandidatePage] = useState({ page: 1, total: 0, totalPages: 0 });
  const [settingsForm, setSettingsForm] = useState({
    isPublic: false,
    jobTitle: "",
    department: "",
    section: "",
    location: "",
    totalRequested: 1,
    startDate: "",
    endDate: "",
    jobDescription: "",
    requirements: "",
    qualifications: [] as string[],
    mandatoryFields: [] as string[],
    emailTemplateId: null as number | null,
  });

  const candidateFilters = (
    <div className="flex flex-col sm:flex-row gap-2">
      <select
        className="flex h-9 w-[200px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        data-table-filter-key="job"
      >
        <option value="">Semua Lowongan</option>
        {recruitments.map(r => (
          <option key={r.id} value={r.jobTitle}>{r.jobTitle}</option>
        ))}
      </select>
      <select
        className="flex h-9 w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        data-table-filter-key="stage"
      >
        <option value="">Semua Tahapan</option>
        <option value="Sourcing">Sourcing</option>
        <option value="Screening">Screening</option>
        <option value="Psikotes">Psikotes</option>
        <option value="Interview">Interview</option>
        <option value="Offering">Offering</option>
        <option value="Hired">Hired</option>
      </select>
    </div>
  );

  const availableSections = formOptions.sections.filter(
    (s) => !settingsForm.department || 
    s.departmentId === formOptions.departments.find(d => d.name === settingsForm.department)?.id
  );

  const openSettings = (job: Recruitment) => {
    setSelectedJobId(job.id);
    setSettingsForm({
      isPublic: job.isPublic || false,
      jobTitle: job.jobTitle || "",
      department: job.department || "",
      section: job.section || "",
      location: job.location || "",
      totalRequested: job.totalRequested || 1,
      startDate: job.startDate ? new Date(job.startDate).toISOString().split('T')[0] : "",
      endDate: job.endDate ? new Date(job.endDate).toISOString().split('T')[0] : "",
      jobDescription: job.jobDescription || "",
      requirements: job.requirements || "",
      qualifications: job.qualifications || [],
      mandatoryFields: job.mandatoryFields || ["ktp", "cv"],
      emailTemplateId: job.emailTemplateId || null,
    });
    setIsSettingsOpen(true);
  };

  const handleCreateVacancy = async () => {
    try {
      const newJob = await createRecruitment({
        jobTitle: "New Vacancy",
        department: "-",
        section: "-",
        location: "-",
        totalRequested: 1,
      });
      setRecruitments([newJob as any, ...recruitments]);
      toast.success("New Vacancy created! Click settings to configure.");
      openSettings(newJob as any);
    } catch (e: any) {
      toast.error(e.message || "Failed to create vacancy.");
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedJobId) return;
    setIsSubmitting(true);
    try {
      const updated = await updateRecruitment(selectedJobId, {
        isPublic: settingsForm.isPublic,
        jobTitle: settingsForm.jobTitle,
        department: settingsForm.department,
        section: settingsForm.section,
        location: settingsForm.location,
        totalRequested: settingsForm.totalRequested,
        startDate: settingsForm.startDate || null,
        endDate: settingsForm.endDate || null,
        jobDescription: settingsForm.jobDescription,
        requirements: settingsForm.requirements,
        qualifications: settingsForm.qualifications,
        mandatoryFields: settingsForm.mandatoryFields,
        emailTemplateId: settingsForm.emailTemplateId,
      } as any);
      
      setRecruitments((prev) =>
        prev.map((r) => (r.id === selectedJobId ? { ...r, ...updated } : r))
      );
      toast.success("Job settings saved successfully.");
      setIsSettingsOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPublicLink = (job: Recruitment) => {
    if (!job.isPublic) {
      toast.error("You must set the status to Published in Settings before sharing the link.");
      return;
    }
    const link = `${window.location.origin}/careers/${job.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Public link copied to clipboard!");
  };

  const handleDeleteCandidate = async (candidateId: number) => {
    if (confirm("Are you sure you want to delete this candidate? This action cannot be undone and will delete all related records (interviews, MCU).")) {
      try {
        await deleteCandidate(candidateId);
        setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
        toast.success("Candidate deleted successfully.");
      } catch (e: any) {
        toast.error(e.message || "Failed to delete candidate.");
      }
    }
  };

  const loadCandidatesPage = async (page: number) => {
    setIsLoadingCandidates(true);
    try {
      const result = await getCandidatesPaginated({
        page,
        pageSize: 25,
        jobId: pipelineJobIdFilter || undefined,
      });
      setCandidates(prev => page === 1 ? result.data : [...prev, ...result.data]);
      setCandidatePage(result);
      refreshEmailStatuses(result.data);
    } catch (e: any) {
      toast.error("Failed to load candidates");
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleDeleteVacancy = async (id: number) => {
    if (!confirm("Are you sure you want to delete this vacancy?")) return;
    try {
      await deleteRecruitment(id);
      setRecruitments(recruitments.filter(r => r.id !== id));
      toast.success("Vacancy deleted successfully.");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete vacancy.");
    }
  };

  return (
    <AdminPageShell
      eyebrow="Human Capital"
      title="Recruitment Management"
      description="Manage open job vacancies, candidate pipeline, and AI assessments"
    >
      <div className="space-y-8 pb-12 animate-in fade-in duration-500">
        <HcWorkspaceBanner
          title="Recruitment Studio"
          description="AI-Powered Talent Acquisition & Candidate Pipeline"
        />

        {/* View Toggle & Stats */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-end px-2">
          <div className="flex bg-muted/30 p-1.5 rounded-2xl border backdrop-blur-sm shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent pointer-events-none" />
            <button
              onClick={() => { setActiveView("vacancies"); setPipelineJobIdFilter(null); }}
              className={cn(
                "relative z-10 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                activeView === "vacancies"
                  ? "bg-background text-foreground shadow-md ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <IconBriefcase className="w-4 h-4" />
              Job Vacancies
            </button>
            <button
              onClick={() => setActiveView("pipeline")}
              className={cn(
                "relative z-10 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                activeView === "pipeline"
                  ? "bg-background text-foreground shadow-md ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <IconUsers className="w-4 h-4" />
              Candidate Pipeline
            </button>
            <Link
              href="/dashboard/hc/recruitment/tests"
              className={cn(
                "relative z-10 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <IconFileText className="w-4 h-4" />
              Online Tests
            </Link>
            <Link
              href="/dashboard/hc/settings/email-templates"
              className={cn(
                "relative z-10 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <IconMail className="w-4 h-4" />
              Email Templates
            </Link>
            <Link
              href="/dashboard/hc/settings/mcu-clinics"
              className={cn(
                "relative z-10 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <IconBuilding className="w-4 h-4" />
              Clinics
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {[
              { label: "Active", value: stats.activeMPR, color: "text-primary" },
              { label: "Candidates", value: stats.totalCandidates, color: "text-blue-600" },
              { label: "Hired", value: stats.hired, color: "text-green-600" },
              { label: "Overdue", value: stats.overdue, color: "text-amber-600" },
            ].map((kpi) => (
              <div key={kpi.label} className="flex flex-col min-w-[80px] bg-white rounded-xl border border-border/60 px-4 py-2.5 shadow-sm">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                <span className={`text-2xl font-bold tracking-tight ${kpi.color}`}>{kpi.value}</span>
              </div>
            ))}
            <div className="ml-auto">
              <Button className={hcPrimaryActionClassName} onClick={handleCreateVacancy}>
                <IconPlus className="w-4 h-4 mr-2" />
                New Vacancy
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-2">
          {activeView === "vacancies" ? (
             <div className={hcMutedPanelClassName}>
               <MinimalTableShell label="Job Vacancies">
                 <Table>
                   <TableHeader>
                     <TableRow className="hover:bg-transparent border-border/50">
                       <TableHead className="w-16 text-center">NO</TableHead>
                       <TableHead>JOB TITLE</TableHead>
                       <TableHead>SECTION</TableHead>
                       <TableHead>DATE RANGE</TableHead>
                       <TableHead>DAYS LEFT</TableHead>
                       <TableHead className="text-center">QUOTA</TableHead>
                       <TableHead className="text-center">APPLIED</TableHead>
                       <TableHead>PUBLIC STATUS</TableHead>
                       <TableHead className="text-right">ACTIONS</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {recruitments.map((job, idx) => (
                       <TableRow key={job.id} className={hcTableRowClassName}>
                         <TableCell className="text-center text-muted-foreground font-medium">{idx + 1}</TableCell>
                         <TableCell className="font-semibold">{job.jobTitle}</TableCell>
                         <TableCell>{job.section || "-"}</TableCell>
                         <TableCell className="whitespace-nowrap">
                           {job.startDate ? format(new Date(job.startDate), "dd MMM yyyy") : "?"} -{" "}
                           {job.endDate ? format(new Date(job.endDate), "dd MMM yyyy") : "?"}
                         </TableCell>
                         <TableCell>
                           {(() => {
                             if (!job.endDate) return "-";
                             const diff = differenceInDays(new Date(job.endDate), new Date());
                             if (diff < 0) return <span className="text-destructive font-semibold">Expired</span>;
                             if (diff === 0) return <span className="text-destructive font-semibold">Ends Today</span>;
                             return <span className={diff <= 3 ? "text-amber-500 font-semibold" : ""}>{diff} Days</span>;
                           })()}
                         </TableCell>
                         <TableCell className="text-center">
                           <span className="font-medium">{job.totalRequested}</span>
                         </TableCell>
                         <TableCell className="text-center">
                           <span className="font-bold text-accent">{job.candidateCount}</span>
                         </TableCell>
                         <TableCell>
                           <Badge variant={job.isPublic ? "default" : "secondary"} className="rounded-full">
                             {job.isPublic ? "Published" : "Draft"}
                           </Badge>
                         </TableCell>
                         <TableCell className="text-right">
                             <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={async () => {
                                  setSelectedCandidateListJobId(job.id);
                                  setDialogCandidatesLoading(true);
                                  setIsCandidateListOpen(true);
                                  try {
                                    const res = await getCandidatesPaginated({ page: 1, pageSize: 50, jobId: job.id });
                                    setDialogCandidates(res.data);
                                    setDialogCandidatePage({ page: res.page, total: res.total, totalPages: res.totalPages });
                                  } catch { setDialogCandidates([]); }
                                  finally { setDialogCandidatesLoading(false); }
                                }} title="View Candidates">
                                 <IconUsers className="w-4 h-4 text-blue-500" />
                               </Button>
                               <Button variant="ghost" size="icon" onClick={() => openBatches(job.id)} title="Schedule Batches">
                                 <IconCalendarEvent className="w-4 h-4 text-amber-600" />
                               </Button>
                               {job.isPublic ? (
                                 <a
                                   href={`/careers/${job.id}`}
                                   target="_blank"
                                   rel="noreferrer"
                                   className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 rounded-md text-muted-foreground"
                                 >
                                   <IconExternalLink className="w-4 h-4" />
                                 </a>
                               ) : null}
                               <Button variant="ghost" size="icon" onClick={() => copyPublicLink(job)}>
                                 <IconCopy className="w-4 h-4 text-muted-foreground" />
                               </Button>
                               <Button variant="ghost" size="icon" onClick={() => openSettings(job)}>
                                 <IconSettings className="w-4 h-4 text-muted-foreground" />
                               </Button>
                               <Button variant="ghost" size="icon" onClick={() => handleDeleteVacancy(job.id)}>
                                 <IconTrash className="w-4 h-4 text-destructive" />
                               </Button>
                             </div>
                         </TableCell>
                       </TableRow>
                     ))}
                     {recruitments.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                           No Job Vacancies found.
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </MinimalTableShell>
             </div>
          ) : (
            <div className="space-y-6">
              {/* Kanban / Pipeline View */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex bg-muted/30 p-1 rounded-lg border w-fit">
                  <button
                    onClick={() => setPipelineViewMode("list")}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                      pipelineViewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    List Table
                  </button>
                  <button
                    onClick={() => setPipelineViewMode("kanban")}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                      pipelineViewMode === "kanban" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Kanban Board
                  </button>
                </div>
                {pipelineJobIdFilter && (
                  <div className="flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-xl border border-dashed">
                    <span className="text-sm text-muted-foreground">Filtered by Job:</span>
                    <Badge variant="secondary">{recruitments.find(r => r.id === pipelineJobIdFilter)?.jobTitle}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setPipelineJobIdFilter(null)} className="h-6 px-2 ml-2">
                      Clear Filter
                    </Button>
                  </div>
                )}
              </div>
              
               {pipelineViewMode === "list" ? (
                <MinimalTableShell label="Kandidat" filters={candidateFilters}>
                   {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-accent/5 border border-accent/20 rounded-lg mb-3">
                      <span className="text-sm font-medium">{selectedIds.size} selected</span>
                      <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                        <IconTrash className="w-4 h-4 mr-1" /> Delete Selected
                      </Button>
                      <Button variant="default" size="sm" onClick={openTestInvite}>
                        <IconMail className="w-4 h-4 mr-1" /> Send Test Invitation
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                        Clear
                      </Button>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="w-10 text-center">
                          <Checkbox
                            checked={visibleCandidates.length > 0 && visibleCandidates.every(c => selectedIds.has(c.id))}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="w-12 text-center">NO</TableHead>
                        <TableHead>NAMA LENGKAP</TableHead>
                        <TableHead>LOWONGAN</TableHead>
                        <TableHead>EMAIL</TableHead>
                        <TableHead>PHONE</TableHead>
                        <TableHead>STAGE</TableHead>
                        <TableHead>AI MATCH</TableHead>
                        <TableHead className="text-center w-20">EMAIL STATUS</TableHead>
                        <TableHead className="text-right">ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleCandidates.map((candidate, idx) => (
                        <TableRow key={candidate.id} className={hcTableRowClassName} data-filter-stage={candidate.currentStage} data-filter-job={candidate.jobTitle || ""}>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedIds.has(candidate.id)}
                              onCheckedChange={() => toggleSelect(candidate.id)}
                            />
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-semibold">{candidate.fullName}</TableCell>
                          <TableCell className="text-muted-foreground">{candidate.jobTitle || "-"}</TableCell>
                          <TableCell>{candidate.email}</TableCell>
                          <TableCell>{candidate.phone}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{candidate.currentStage}</Badge>
                          </TableCell>
                          <TableCell>
                            {candidate.aiScore !== null ? (
                              <div className="flex items-center gap-2">
                                <Progress value={candidate.aiScore} className="w-16 h-2 [&>div]:bg-accent" />
                                <span className="text-xs font-medium">{candidate.aiScore}%</span>
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {emailStatuses[candidate.id] && emailStatuses[candidate.id].status !== "none" ? (
                              <span title={`Email ${emailStatuses[candidate.id].status}`}>
                                <IconMail className={cn("w-4 h-4 mx-auto", emailStatuses[candidate.id].status === "sent" ? "text-green-600" : "text-destructive")} />
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {candidate.cvUrl ? (
                                <Button variant="outline" size="sm" onClick={() => handleViewCv(candidate.cvUrl, candidate.fullName)} disabled={cvLoadingId === candidate.id}>
                                  {cvLoadingId === candidate.id ? "Loading..." : "View CV"}
                                </Button>
                              ) : null}
                              <Button variant="default" size="sm" asChild>
                                <Link href={`/dashboard/hc/recruitment/candidates/${candidate.id}`}>View Details</Link>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive border border-transparent hover:border-destructive hover:bg-destructive/10" onClick={() => handleDeleteCandidate(candidate.id)} title="Delete Dummy Data">
                                <IconTrash className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {visibleCandidates.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                            Belum ada kandidat.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {candidatePage.totalPages > 1 && (
                    <div className="flex items-center justify-between px-1 py-2">
                      <span className="text-xs text-muted-foreground">
                        {candidatePage.total} total — page {candidatePage.page} of {candidatePage.totalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={candidatePage.page <= 1}
                          onClick={() => loadCandidatesPage(1)}>
                          First
                        </Button>
                        <Button variant="outline" size="sm" disabled={candidatePage.page >= candidatePage.totalPages}
                          onClick={() => loadCandidatesPage(candidatePage.page + 1)}>
                          Load More
                        </Button>
                      </div>
                    </div>
                  )}
                </MinimalTableShell>
               ) : (
                 <KanbanBoard
                   candidates={visibleCandidates}
                   jobFilter={pipelineJobIdFilter}
                   onCandidateUpdate={(id, stage) => setCandidates(prev => prev.map(c => c.id === id ? { ...c, currentStage: stage } : c))}
                   emailStatuses={emailStatuses}
                 />
               )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Job Vacancy Settings</DialogTitle>
            <DialogDescription>
              Configure the public link and application form settings for this recruitment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="flex items-center justify-between rounded-lg border p-4 bg-accent/5">
              <div className="space-y-0.5">
                <Label className="text-base text-accent font-semibold">Publish to Careers Page</Label>
                <div className="text-sm text-muted-foreground">
                  Allow candidates to apply using the public link.
                </div>
              </div>
              <Switch
                checked={settingsForm.isPublic}
                onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, isPublic: checked })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Job Title</Label>
                <Input
                  value={settingsForm.jobTitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, jobTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Quota</Label>
                <Input
                  type="number"
                  min="1"
                  value={settingsForm.totalRequested}
                  onChange={(e) => setSettingsForm({ ...settingsForm, totalRequested: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={settingsForm.department}
                  onValueChange={(val) => setSettingsForm({ ...settingsForm, department: val, section: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.departments.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select
                  value={settingsForm.section}
                  onValueChange={(val) => setSettingsForm({ ...settingsForm, section: val })}
                  disabled={!settingsForm.department}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={settingsForm.department ? "Select Section" : "Select Dept First"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="e.g. Head Office, Bintaro"
                  value={settingsForm.location}
                  onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Open Date</Label>
                <Input
                  type="date"
                  value={settingsForm.startDate}
                  onChange={(e) => setSettingsForm({ ...settingsForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={settingsForm.endDate}
                  onChange={(e) => setSettingsForm({ ...settingsForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Job Description</Label>
              <Textarea
                placeholder="Describe the responsibilities and scope of this role..."
                rows={3}
                value={settingsForm.jobDescription}
                onChange={(e) => setSettingsForm({ ...settingsForm, jobDescription: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Requirements (General Text)</Label>
              <Textarea
                placeholder="General description of what you are looking for..."
                rows={3}
                value={settingsForm.requirements}
                onChange={(e) => setSettingsForm({ ...settingsForm, requirements: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>AI Assessment Qualifications (Checklist)</Label>
              <div className="grid grid-cols-2 gap-3 bg-muted/20 p-4 rounded-lg border">
                {[
                  "Pendidikan Min. SMA/SMK",
                  "Pendidikan Min. D3",
                  "Pendidikan Min. S1",
                  "Pengalaman Min. 1 Tahun",
                  "Pengalaman Min. 2 Tahun",
                  "Pengalaman Min. 3 Tahun",
                  "Bahasa Inggris Aktif",
                  "Menguasai Microsoft Office",
                  "Memiliki SIM A",
                  "Memiliki SIM C",
                ].map((qual) => (
                  <div key={qual} className="flex items-center space-x-2">
                    <Checkbox
                      id={qual}
                      checked={settingsForm.qualifications.includes(qual)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSettingsForm({ ...settingsForm, qualifications: [...settingsForm.qualifications, qual] });
                        } else {
                          setSettingsForm({ ...settingsForm, qualifications: settingsForm.qualifications.filter((q) => q !== qual) });
                        }
                      }}
                    />
                    <Label htmlFor={qual} className="font-normal text-sm cursor-pointer">{qual}</Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                AI will strictly check the candidate's CV and Form against these specific points. 
                (Checked points will be analyzed).
              </p>
            </div>

            <div className="space-y-3">
              <Label>Form Builder: Mandatory Fields</Label>
              <div className="grid grid-cols-2 gap-3 bg-muted/20 p-4 rounded-lg border">
                {[
                  { id: "dateOfBirth", label: "Date of Birth" },
                  { id: "address", label: "Full Address" },
                  { id: "gender", label: "Gender" },
                  { id: "drivingLicenses", label: "Driving Licenses (SIM)" },
                  { id: "certificates", label: "Certifications" },
                  { id: "workExperience", label: "Detailed Work Experience" },
                  { id: "education", label: "Detailed Education History" },
                ].map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`mandatory-${field.id}`}
                      checked={settingsForm.mandatoryFields?.includes(field.id) || false}
                      onCheckedChange={(checked) => {
                        const current = settingsForm.mandatoryFields || [];
                        if (checked) {
                          setSettingsForm({ ...settingsForm, mandatoryFields: [...current, field.id] });
                        } else {
                          setSettingsForm({ ...settingsForm, mandatoryFields: current.filter((q) => q !== field.id) });
                        }
                      }}
                    />
                    <Label htmlFor={`mandatory-${field.id}`} className="font-normal text-sm cursor-pointer">{field.label}</Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Selected fields will be required when candidates fill out the public application form.
                Name, Email, Phone, and CV are always required.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <Dialog open={isCandidateListOpen} onOpenChange={(open) => { if (!open) setIsCandidateListOpen(false); }}>
      <DialogContent className="w-[90vw] h-[85vh] max-w-none flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
        <DialogHeader>
          <DialogTitle>Daftar Kandidat</DialogTitle>
          <DialogDescription>
            Pelamar untuk lowongan {recruitments.find(r => r.id === selectedCandidateListJobId)?.jobTitle}
            {dialogCandidatesLoading ? " — Memuat..." : ` — ${dialogCandidatePage.total} total`}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex-1 overflow-auto min-h-0">
          {dialogCandidatesLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">Memuat data...</div>
          ) : (
            <>
              <MinimalTableShell label="Kandidat">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">NO</TableHead>
                      <TableHead>NAMA LENGKAP</TableHead>
                      <TableHead>EMAIL</TableHead>
                      <TableHead>PHONE</TableHead>
                      <TableHead>STAGE</TableHead>
                      <TableHead>AI MATCH</TableHead>
                      <TableHead className="text-right">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dialogCandidates.map((candidate, idx) => (
                      <TableRow key={candidate.id}>
                        <TableCell className="text-center">{idx + 1}</TableCell>
                        <TableCell className="font-semibold">{candidate.fullName}</TableCell>
                        <TableCell>{candidate.email}</TableCell>
                        <TableCell>{candidate.phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{candidate.currentStage}</Badge>
                        </TableCell>
                        <TableCell>
                          {candidate.aiScore !== null ? (
                            <div className="flex items-center gap-2">
                              <Progress value={candidate.aiScore} className="w-16 h-2 [&>div]:bg-accent" />
                              <span className="text-xs font-medium">{candidate.aiScore}%</span>
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {candidate.cvUrl ? (
                              <Button variant="outline" size="sm" onClick={() => handleViewCv(candidate.cvUrl, candidate.fullName)} disabled={cvLoadingId === candidate.id}>
                                {cvLoadingId === candidate.id ? "Loading..." : "View CV"}
                              </Button>
                            ) : null}
                            <Button variant="default" size="sm" onClick={() => window.location.href = `/dashboard/hc/recruitment/candidates/${candidate.id}`}>
                              View Details
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive border border-transparent hover:border-destructive hover:bg-destructive/10" onClick={() => handleDeleteCandidate(candidate.id)}>
                              <IconTrash className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {dialogCandidates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          Belum ada kandidat yang mendaftar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
              {dialogCandidatePage.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    Page {dialogCandidatePage.page} of {dialogCandidatePage.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={dialogCandidatePage.page <= 1}
                      onClick={async () => {
                        const prev = dialogCandidatePage.page - 1;
                        const res = await getCandidatesPaginated({ page: prev, pageSize: 50, jobId: selectedCandidateListJobId! });
                        setDialogCandidates(res.data);
                        setDialogCandidatePage({ page: res.page, total: res.total, totalPages: res.totalPages });
                      }}>
                      Prev
                    </Button>
                    <Button variant="outline" size="sm" disabled={dialogCandidatePage.page >= dialogCandidatePage.totalPages}
                      onClick={async () => {
                        const next = dialogCandidatePage.page + 1;
                        const res = await getCandidatesPaginated({ page: next, pageSize: 50, jobId: selectedCandidateListJobId! });
                        setDialogCandidates(res.data);
                        setDialogCandidatePage({ page: res.page, total: res.total, totalPages: res.totalPages });
                      }}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* CV Viewer Dialog */}
    <Dialog open={!!cvViewerUrl} onOpenChange={(open) => { if (!open) setCvViewerUrl(null); }}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-none p-0 gap-0 overflow-hidden flex flex-col" style={{ maxHeight: '95vh' }}>
        <DialogHeader className="px-6 py-3 border-b shrink-0">
          <DialogTitle>CV / Resume — {cvViewerName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted/20" style={{ minHeight: 0, flex: '1 1 0%' }}>
          {cvViewerUrl ? (
            <iframe
              src={cvViewerUrl}
              className="w-full h-full border-0"
              style={{ height: '100%', minHeight: 0 }}
              title={`CV of ${cvViewerName}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          )}
        </div>
        <DialogFooter className="px-6 py-3 border-t shrink-0">
          <Button variant="outline" onClick={() => setCvViewerUrl(null)}>Close</Button>
          {cvViewerUrl && (
            <Button asChild variant="default">
              <a href={cvViewerUrl} target="_blank" rel="noreferrer">Open in New Tab</a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Test Invitation Dialog */}
    <Dialog open={isTestInviteOpen} onOpenChange={setIsTestInviteOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Test Invitation</DialogTitle>
          <DialogDescription>
            Send online test invitations to {selectedIds.size} selected candidates.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Select Test <span className="text-destructive">*</span></Label>
            <Select value={testInviteForm.testId} onValueChange={(val) => setTestInviteForm({ ...testInviteForm, testId: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih test..." />
              </SelectTrigger>
              <SelectContent>
                {availableTests.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Schedule Test (optional)</Label>
            {availableBatches.length > 0 && (
              <div className="space-y-2 mb-2 p-3 rounded-lg border bg-muted/10">
                <span className="text-xs font-medium text-muted-foreground">Pilih Batch (jadwal otomatis terisi)</span>
                <div className="grid grid-cols-2 gap-2">
                  {["psikotes_1", "psikotes_2", "interview", "mcu"].map((type) => {
                    const typeBatches = availableBatches.filter((b) => b.batchType === type);
                    if (typeBatches.length === 0) return null;
                    const typeLabel = type === "psikotes_1" ? "Psikotes 1" : type === "psikotes_2" ? "Psikotes 2" : type === "interview" ? "Interview" : "MCU";
                    return (
                      <div key={type} className="col-span-2 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">{typeLabel}</span>
                        <div className="flex flex-wrap gap-1">
                          {typeBatches.map((b) => {
                            const isSelected = testInviteForm.batchId === String(b.id);
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  const d = new Date(b.scheduledAt);
                                  setTestInviteForm({
                                    ...testInviteForm,
                                    batchId: String(b.id),
                                    scheduledDate: d.toISOString().split("T")[0],
                                    scheduledTime: d.toTimeString().slice(0, 5),
                                  });
                                }}
                                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-foreground"}`}
                              >
                                {b.batchName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {testInviteForm.batchId && (
                    <button
                      type="button"
                      onClick={() => setTestInviteForm({ ...testInviteForm, batchId: "", scheduledDate: "", scheduledTime: "" })}
                      className="px-2 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 col-span-2"
                    >
                      Clear Batch Selection
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={testInviteForm.scheduledDate} onChange={(e) => setTestInviteForm({ ...testInviteForm, scheduledDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Time</Label>
                <Input type="time" value={testInviteForm.scheduledTime} onChange={(e) => setTestInviteForm({ ...testInviteForm, scheduledTime: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave empty for immediate access. If set, the test link will only work after this time.</p>
          </div>

          <div className="space-y-2">
            <Label>Expiry (days)</Label>
            <Input type="number" min={1} max={30} value={testInviteForm.expiresInDays} onChange={(e) => setTestInviteForm({ ...testInviteForm, expiresInDays: parseInt(e.target.value) || 7 })} />
            <p className="text-xs text-muted-foreground">Test link will expire after this many days.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsTestInviteOpen(false)}>Cancel</Button>
          <Button onClick={handleSendTestInvitation} disabled={isSendingTest || !testInviteForm.testId}>
            {isSendingTest ? "Sending..." : `Send to ${selectedIds.size} Candidates`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Batch Management Dialog */}
    <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
        <DialogHeader className="shrink-0">
          <DialogTitle>Schedule Batches</DialogTitle>
          <DialogDescription>
            Kelola batch jadwal untuk {recruitments.find(r => r.id === batchJobId)?.jobTitle || "lowongan ini"}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-0 space-y-6 py-2">
          {/* Add / Edit Batch Form */}
          <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
            <Label className="font-semibold">{editingBatchId ? "Edit Batch" : "Tambah Batch Baru"}</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nama Batch (cth: Batch 1)" value={batchForm.batchName} onChange={(e) => setBatchForm({ ...batchForm, batchName: e.target.value })} />
              <Select value={batchForm.batchType} onValueChange={(v) => setBatchForm({ ...batchForm, batchType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="psikotes_1">Psikotes 1</SelectItem>
                  <SelectItem value="psikotes_2">Psikotes 2</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="mcu">Medical Checkup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={batchForm.scheduledDate} onChange={(e) => setBatchForm({ ...batchForm, scheduledDate: e.target.value })} />
              <Input type="time" value={batchForm.scheduledTime} onChange={(e) => setBatchForm({ ...batchForm, scheduledTime: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              {editingBatchId && (
                <Button variant="ghost" size="sm" onClick={() => { setEditingBatchId(null); setBatchForm({ batchName: "", batchType: "psikotes_1", scheduledDate: "", scheduledTime: "" }); }}>
                  Cancel Edit
                </Button>
              )}
              <Button onClick={handleSaveBatch} disabled={batchLoading} size="sm">
                {batchLoading ? "Saving..." : editingBatchId ? "Update" : "Tambah"}
              </Button>
            </div>
          </div>

          {/* Batch List — Grouped by Type */}
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">Belum ada batch. Tambah batch di atas.</p>
          ) : (
            <div className="space-y-4">
              {["psikotes_1", "psikotes_2", "interview", "mcu"].map((type) => {
                const typeBatches = batches.filter((b) => b.batchType === type);
                if (typeBatches.length === 0) return null;
                const typeLabel = type === "psikotes_1" ? "Psikotes 1" : type === "psikotes_2" ? "Psikotes 2" : type === "interview" ? "Interview" : "Medical Checkup";
                return (
                  <div key={type}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 border-b pb-2">{typeLabel}</h4>
                    <div className="space-y-2">
                      {typeBatches.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div>
                            <div className="font-medium">{b.batchName}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(b.scheduledAt), "dd MMM yyyy HH:mm")}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEditBatch(b)}>Edit</Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteBatch(b.id)}>Delete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    </AdminPageShell>
  );
}
