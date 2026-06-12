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
  IconStack2,
  IconStethoscope,
  IconArrowsExchange,
  IconUpload,
} from "@tabler/icons-react";
import { format, differenceInDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
const WITA_TZ = "Asia/Makassar";
import { toast } from "sonner";
import { updateRecruitment, createRecruitment, deleteRecruitment, deleteCandidate, deleteMultipleCandidates, getCandidatesPaginated, updateCandidateStage, getCandidateEmailStatuses, getCvDownloadUrl, getCandidateComparisonData, sendStartDateEmails, previewStartDateEmail, adminCreateCandidate, bulkImportCandidates, sendBulkCustomEmail } from "@/app/actions/recruitment";
import { bulkAssignTestToCandidates } from "@/app/actions/recruitment-tests";
import { getAllTestGroups, bulkAssignTestGroupToCandidates, previewTestGroupEmail } from "@/app/actions/test-group";
import { bulkScheduleInterviews, previewInterviewEmail } from "@/app/actions/interviews";
import { bulkScheduleMcus, previewMcuEmail } from "@/app/actions/mcu";
import { sendOfferingEmail, saveOffering } from "@/app/actions/offering";
import { getNextLetterNumber, getActiveEmployees } from "@/app/actions/surat";
import { getBatchesByRecruitment, createBatch, updateBatch, deleteBatch } from "@/app/actions/hc-recruitment-batches";
import { uploadFile } from "@/app/actions/upload";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminPageShell } from "@/components/admin-page-shell";
import { hcPrimaryActionClassName, hcTableRowClassName, hcMutedPanelClassName } from "@/components/hc/hc-workspace-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { KanbanBoard } from "./kanban-board";
import { RecruitmentTabBar } from "@/components/hc/recruitment-tab-bar";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  scoringCriteria?: Array<{ id: string; label: string; weight: number; description?: string }> | null;
  knockoutCriteria?: Array<{ id: string; label: string; enabled: boolean; description?: string }> | null;
  emailTemplateId?: number | null;
};

const DEFAULT_SCORING_CRITERIA = [
  { id: "education", label: "Education", weight: 20, description: "Minimum education and major relevance" },
  { id: "experience", label: "Experience", weight: 30, description: "Relevant role and years of experience" },
  { id: "certification", label: "Certification", weight: 15, description: "Required or relevant certificates" },
  { id: "license", label: "License", weight: 10, description: "Required driving or operating licenses" },
  { id: "skill", label: "Skill Match", weight: 20, description: "Technical and practical skill fit" },
  { id: "availability", label: "Availability", weight: 5, description: "Location, schedule, and readiness" },
];

const DEFAULT_KNOCKOUT_CRITERIA = [
  { id: "education", label: "Minimum education met", enabled: false, description: "Candidate must meet the stated minimum education" },
  { id: "experience", label: "Minimum experience met", enabled: false, description: "Candidate must meet the stated minimum years of experience" },
  { id: "license", label: "Required license available", enabled: false, description: "Candidate must hold required SIM/operator license" },
  { id: "certification", label: "Required certificate available", enabled: false, description: "Candidate must hold required certificate" },
];

const CANDIDATE_STAGES = ["Sourcing", "Screening", "Psikotes", "Interview", "Medical Checkup", "Offering", "Hired", "Rejected"];

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

const MCU_SIGNERS = [
  { name: "Muhammad Iqbal", title: "HR-GA Supervisor", signatureUrl: "/ttd Muhammad Iqbal.png" },
  { name: "Adila Tri Arizona", title: "HR-GA Admin", signatureUrl: "/ttd Adila Tri Arizona.png" },
  { name: "Kesuma Bagaskara", title: "HR-GA Admin", signatureUrl: "/ttd Kesuma Bagaskara.png" },
  { name: "Rendra Rachman", title: "Human Capital Manager", signatureUrl: "" },
];

type Candidate = {
  id: number;
  recruitmentId: number | null;
  jobTitle: string | null;
  location: string | null;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: Date | string | null;
  source: string;
  currentStage: string;
  rating: number | null;
  notes: string;
  cvUrl: string;
  workExperience?: Array<{ company?: string; role?: string; yearIn?: string; yearOut?: string; description?: string }>;
  education?: Array<{ level?: string; institution?: string; major?: string; yearIn?: string; yearOut?: string }>;
  aiScore: number | null;
  aiSummary: string;
  aiDetails?: { recommendation?: string; breakdown?: Array<{ criterion: string; score: number; weight: number; reason: string }>; knockout?: Array<{ criterion: string; passed: boolean; reason: string }> } | null;
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
  clinics: { id: number; name: string; email: string; address: string; city: string }[];
  sectionTemplates: Array<{
    id: number;
    sectionId: number | null;
    sectionName: string;
    jobDescription: string;
    requirements: string;
    qualifications: string[];
    mandatoryFields: string[];
  }>;
}

export function RecruitmentClientPage({
  recruitments: initialRecruitments,
  initialCandidates: paginatedCandidates,
  stats,
  formOptions,
  clinics,
  sectionTemplates,
}: RecruitmentClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const [candidates, setCandidates] = useState<Candidate[]>(paginatedCandidates.data as Candidate[]);
  const [candidatePage, setCandidatePage] = useState(paginatedCandidates);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [activeView, setActiveView] = useState<"vacancies" | "pipeline">(viewParam === "pipeline" ? "pipeline" : "vacancies");
  const [pipelineJobIdFilter, setPipelineJobIdFilter] = useState<number | null>(null);
  const [pipelineJobTitleFilter, setPipelineJobTitleFilter] = useState("");
  const [pipelineStageFilter, setPipelineStageFilter] = useState("");
  const [pipelineViewMode, setPipelineViewMode] = useState<"list" | "kanban">("list");
  const [recruitments, setRecruitments] = useState(initialRecruitments);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStageTarget, setBulkStageTarget] = useState("");
  const [isBulkStageUpdating, setIsBulkStageUpdating] = useState(false);

  // Vacancy Search & Filter State
  const [vacancySearch, setVacancySearch] = useState("");
  const [vacancyStatusFilter, setVacancyStatusFilter] = useState("all");
  const [vacancyDepartmentFilter, setVacancyDepartmentFilter] = useState("all");
  const [vacancySortBy, setVacancySortBy] = useState<"date" | "candidates" | "daysLeft">("date");
  const [selectedVacancyIds, setSelectedVacancyIds] = useState<Set<number>>(new Set());
  const [emailStatuses, setEmailStatuses] = useState<Record<number, { status: string; lastSentAt: Date | null; templateName: string | null }>>({});
  const [cvViewerUrl, setCvViewerUrl] = useState<string | null>(null);
  const [cvViewerName, setCvViewerName] = useState("");
  const [cvLoadingId, setCvLoadingId] = useState<number | null>(null);
  const [profileDrawerCandidate, setProfileDrawerCandidate] = useState<Candidate | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    setActiveView(viewParam === "pipeline" ? "pipeline" : "vacancies");
  }, [viewParam]);

  const setRecruitmentView = (view: "vacancies" | "pipeline") => {
    setActiveView(view);
    if (view === "vacancies") setPipelineJobIdFilter(null);
    router.replace(`/dashboard/hc/recruitment?view=${view}`, { scroll: false });
  };
  const [compareRows, setCompareRows] = useState<any[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const profileDrawerRadarData = Array.isArray(profileDrawerCandidate?.aiDetails?.breakdown)
    ? profileDrawerCandidate.aiDetails.breakdown.map((item: any) => ({
        criterion: String(item?.criterion || "Kriteria"),
        score: Math.max(0, Math.min(100, Number(item?.score) || 0)),
      }))
    : [];

  // Test Invitation Dialog
  const [isTestInviteOpen, setIsTestInviteOpen] = useState(false);
  const [testInviteForm, setTestInviteForm] = useState({ testId: "", scheduledDate: "", scheduledTime: "", scheduledEndDate: "", scheduledEndTime: "", batchId: "" });
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{ subject: string; html?: string | null; text?: string | null }>({ subject: "", html: "", text: "" });
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);

  // Bulk Interview State
  const [isBulkInterviewOpen, setIsBulkInterviewOpen] = useState(false);
  const [bulkInterviewForm, setBulkInterviewForm] = useState({ date: "", time: "", duration: 60, type: "Online", location: "", interviewer: "", notes: "" });
  const [isBulkInterviewSending, setIsBulkInterviewSending] = useState(false);

  // Bulk MCU State
  const [isBulkMcuOpen, setIsBulkMcuOpen] = useState(false);
  const [bulkMcuForm, setBulkMcuForm] = useState({ clinicId: "", clinicName: "", clinicEmail: "", paket: "", date: "", signatoryName: MCU_SIGNERS[0].name, signatoryTitle: MCU_SIGNERS[0].title, signatureUrl: MCU_SIGNERS[0].signatureUrl });
  const [isBulkMcuSending, setIsBulkMcuSending] = useState(false);

  const [isMulaiKerjaOpen, setIsMulaiKerjaOpen] = useState(false);
  const [mulaiKerjaDate, setMulaiKerjaDate] = useState("");
  const [mulaiKerjaPosisi, setMulaiKerjaPosisi] = useState("");
  const [isMulaiKerjaSending, setIsMulaiKerjaSending] = useState(false);

  // Bulk Offering State
  const [isBulkOfferingOpen, setIsBulkOfferingOpen] = useState(false);
  const [isBulkOfferingSending, setIsBulkOfferingSending] = useState(false);
  const [isOfferingPreviewOpen, setIsOfferingPreviewOpen] = useState(false);
  const [offeringLetterNo, setOfferingLetterNo] = useState("");
  const [offeringEmployees, setOfferingEmployees] = useState<Array<{ id: number; name: string; section: string; jobTitle: string }>>([]);
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [bulkOfferingForm, setBulkOfferingForm] = useState({
    position: "",
    directSupervisor: "",
    salary: "",
    contractDurationMonths: 12,
    startDate: "",
    outpatientBenefit: "Penusahaan memberikan bantuan biaya pengobatan rawat jalan sebesar Rp 3.500.000,-",
    inpatientBenefit: "Penusahaan akan memberikan biaya penggatan/Pengobatan sepengetahuan bagi karyawan beserta istri & 3 (tiga) anak yang sah secara hukum, apabila telah ditanggung menjadi tanggungan karyawan tetap",
    maternityBenefit: "Penusahaan akan memberikan bantuan sebesar Rp 8.000.000,-. Dan apabila dilakukan operasi caesar perusahaan akan mengganti biaya peralatan sebesar Rp 15.000.000, setelah ditanggung menjadi tanggungan karyawan tetap",
    accidentInsurance: "Penusahaan akan menanggung premi asuransi sepengetahuannya",
    bpjsEmployment: "Wajib berdasarkan Peraturan Pemerintah",
    bpjsHealth: "Wajib berdasarkan Peraturan Pemerintah",
    thr: "Penusahaan akan memberikan THR setahun upah, dan apabila Saudara belum mencapai masa kerja 1 (satu) tahun tetapi sudah lebih dari 1 (satu) bulan, maka akan dihitung secara proporsional.",
    otherTerms: "Ketentuan-ketentuan lain yang tidak secara khusus diatur dalam penawaran diatas (Biaya Perjalanan Dinas, Bantuan dan fasilitas lain dan perusahaan) akan tunduk pada peraturan/perjanjian karyawan yang berlaku. Pokok-pokok Musyawarah serta tetapkan pelaksanaan perusahaan",
    signatoryName: MCU_SIGNERS[0].name,
    signatoryTitle: MCU_SIGNERS[0].title,
    signatureUrl: MCU_SIGNERS[0].signatureUrl,
  });
  const [availableTests, setAvailableTests] = useState<Array<{ id: number; title: string; isApplicationForm: boolean; timeLimitMinutes: number; passingScore: number }>>([]);
  const [availableTestGroups, setAvailableTestGroups] = useState<Array<{ id: number; name: string }>>([]);
  const [availableBatches, setAvailableBatches] = useState<Array<{ id: number; batchName: string; batchType: string; scheduledAt: Date; scheduledEndAt?: Date | null }>>([]);

  // Manual Add Dialog
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualAddForm, setManualAddForm] = useState({ recruitmentId: "", fullName: "", email: "", phone: "", source: "Manual" });
  const [manualAddCvFile, setManualAddCvFile] = useState<File | null>(null);
  const [isManualAddSubmitting, setIsManualAddSubmitting] = useState(false);

  // Import Dialog
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<Array<{ fullName: string; email: string; success: boolean; error?: string }> | null>(null);

  // Bulk Email Dialog
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailMessage, setBulkEmailMessage] = useState("");
  const [isBulkEmailSending, setIsBulkEmailSending] = useState(false);
  const [bulkEmailResult, setBulkEmailResult] = useState<null | { sent: number; failed: number; results: any[] }>(null);

  // Batch Management
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchJobId, setBatchJobId] = useState<number | null>(null);
  const [batches, setBatches] = useState<Array<{ id: number; batchName: string; batchType: string; scheduledAt: Date; scheduledEndAt?: Date | null; recruitmentId: number }>>([]);
  const [batchForm, setBatchForm] = useState({ batchName: "", batchType: "psikotes_1", scheduledDate: "", scheduledTime: "", scheduledEndDate: "", scheduledEndTime: "" });
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const openBatches = async (jobId: number) => {
    setBatchJobId(jobId);
    setIsBatchOpen(true);
    setEditingBatchId(null);
    setBatchForm({ batchName: "", batchType: "psikotes_1", scheduledDate: "", scheduledTime: "", scheduledEndDate: "", scheduledEndTime: "" });
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
    let scheduledEndAt: Date | null = null;
    if (batchForm.scheduledEndDate && batchForm.scheduledEndTime) {
      scheduledEndAt = new Date(`${batchForm.scheduledEndDate}T${batchForm.scheduledEndTime}`);
    }
    try {
      if (editingBatchId) {
        await updateBatch(editingBatchId, { batchName: batchForm.batchName, batchType: batchForm.batchType, scheduledAt, scheduledEndAt });
        setBatches(prev => prev.map(b => b.id === editingBatchId ? { ...b, batchName: batchForm.batchName, batchType: batchForm.batchType, scheduledAt, scheduledEndAt: scheduledEndAt || b.scheduledEndAt } : b));
        toast.success("Batch updated");
      } else {
        const created = await createBatch({ recruitmentId: batchJobId, batchName: batchForm.batchName, batchType: batchForm.batchType, scheduledAt, scheduledEndAt });
        setBatches(prev => [...prev, created]);
        toast.success("Batch created");
      }
      setEditingBatchId(null);
      setBatchForm({ batchName: "", batchType: "psikotes_1", scheduledDate: "", scheduledTime: "", scheduledEndDate: "", scheduledEndTime: "" });
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
    const endDate = batch.scheduledEndAt ? new Date(batch.scheduledEndAt) : null;
    const endDateStr = endDate ? endDate.toISOString().split("T")[0] : "";
    const endTimeStr = endDate ? endDate.toTimeString().slice(0, 5) : "";
    setBatchForm({ batchName: batch.batchName, batchType: batch.batchType, scheduledDate: dateStr, scheduledTime: timeStr, scheduledEndDate: endDateStr, scheduledEndTime: endTimeStr });
  };

  const openTestInvite = () => {
    setTestInviteForm({ testId: "", scheduledDate: "", scheduledTime: "", scheduledEndDate: "", scheduledEndTime: "", batchId: "" });
    setAvailableTestGroups([]);
    setAvailableBatches([]);
    setIsTestInviteOpen(true);
    
    // Load test groups
    getAllTestGroups().then(groups => setAvailableTestGroups(groups)).catch(() => toast.error("Failed to load test groups"));
    
    // Load batches
    if (selectedIds.size > 0) {
      const firstCand = candidates.find(c => selectedIds.has(c.id));
      if (firstCand?.recruitmentId) {
        getBatchesByRecruitment(firstCand.recruitmentId).then(setAvailableBatches).catch(() => setAvailableBatches([]));
      }
    }
  };

  const handleBulkInterview = async () => {
    if (!bulkInterviewForm.date || !bulkInterviewForm.time || !bulkInterviewForm.location) {
      toast.error("Isi semua field"); return;
    }
    setIsBulkInterviewSending(true);
    try {
      const d = new Date(`${bulkInterviewForm.date}T${bulkInterviewForm.time}`);
      const result = await bulkScheduleInterviews(Array.from(selectedIds), {
        scheduledAt: d, durationMinutes: bulkInterviewForm.duration,
        interviewType: bulkInterviewForm.type, locationOrLink: bulkInterviewForm.location,
        interviewerName: bulkInterviewForm.interviewer, notes: bulkInterviewForm.notes,
      });
      const ok = result.results.filter(r => r.success).length;
      toast.success(`Interview scheduled for ${ok} candidates`);
      setIsBulkInterviewOpen(false);
      setSelectedIds(new Set());
    } catch (e: any) { toast.error(e.message); }
    finally { setIsBulkInterviewSending(false); }
  };

  const handleBulkMcu = async () => {
    if (!bulkMcuForm.clinicName || !bulkMcuForm.clinicEmail || !bulkMcuForm.paket || !bulkMcuForm.date) {
      toast.error("Isi semua field"); return;
    }
    setIsBulkMcuSending(true);
    try {
      const d = new Date(bulkMcuForm.date);
      const result = await bulkScheduleMcus(Array.from(selectedIds), {
        klinikName: bulkMcuForm.clinicName, klinikEmail: bulkMcuForm.clinicEmail,
        paketMcu: bulkMcuForm.paket, scheduledDate: d,
        clinicId: bulkMcuForm.clinicId ? parseInt(bulkMcuForm.clinicId) : null,
        signatoryName: bulkMcuForm.signatoryName,
        signatoryTitle: bulkMcuForm.signatoryTitle,
        signatureUrl: bulkMcuForm.signatureUrl,
      });
      const ok = result.results.filter(r => r.success).length;
      toast.success(`MCU scheduled for ${ok} candidates`);
      setIsBulkMcuOpen(false);
      setSelectedIds(new Set());
    } catch (e: any) { toast.error(e.message); }
    finally { setIsBulkMcuSending(false); }
  };

  const handleMulaiKerja = async () => {
    if (!mulaiKerjaPosisi) { toast.error("Isi posisi dulu"); return; }
    if (!mulaiKerjaDate) { toast.error("Isi tanggal mulai kerja dulu"); return; }
    setIsMulaiKerjaSending(true);
    try {
      const result = await sendStartDateEmails(Array.from(selectedIds), mulaiKerjaDate, mulaiKerjaPosisi);
      const ok = result.results.filter((r: any) => r.success).length;
      toast.success(`Mulai kerja email sent to ${ok} candidates`);
      setIsMulaiKerjaOpen(false);
      setMulaiKerjaDate("");
      setMulaiKerjaPosisi("");
      setSelectedIds(new Set());
    } catch (e: any) { toast.error(e.message); }
    finally { setIsMulaiKerjaSending(false); }
  };

  const handleBulkOffering = async () => {
    setIsBulkOfferingSending(true);
    try {
      let sent = 0;
      for (const cid of selectedIds) {
        try {
          await saveOffering(cid, bulkOfferingForm);
          await sendOfferingEmail(cid);
          sent++;
        } catch {}
      }
      toast.success(`Offering email sent to ${sent} candidates`);
      setIsBulkOfferingOpen(false);
      setSelectedIds(new Set());
      window.location.reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setIsBulkOfferingSending(false); }
  };

  const handlePreviewBulkInterview = async () => {
    if (!bulkInterviewForm.date || !bulkInterviewForm.time) { toast.error("Isi tanggal dan waktu dulu"); return; }
    setEmailPreviewLoading(true);
    try {
      const d = new Date(`${bulkInterviewForm.date}T${bulkInterviewForm.time}`);
      const { format } = await import("date-fns");
      const firstSelected = candidates.find(c => selectedIds.has(c.id));
      const preview = await previewInterviewEmail({
        candidateName: "[Candidate Name]",
        jobTitle: firstSelected?.jobTitle || "Lowongan terpilih",
        scheduledDate: format(d, "EEEE, dd MMMM yyyy"),
        scheduledTime: format(d, "HH:mm"),
        interviewType: bulkInterviewForm.type,
        locationOrLink: bulkInterviewForm.location || "-",
        interviewerName: bulkInterviewForm.interviewer || "-",
        durationMinutes: bulkInterviewForm.duration,
      });
      setEmailPreview(preview);
      setIsEmailPreviewOpen(true);
    } catch (e: any) { toast.error("Gagal preview"); }
    finally { setEmailPreviewLoading(false); }
  };

  const handlePreviewBulkMcu = async () => {
    if (!bulkMcuForm.clinicName || !bulkMcuForm.date) { toast.error("Isi klinik dan tanggal dulu"); return; }
    setEmailPreviewLoading(true);
    try {
      const d = new Date(bulkMcuForm.date);
      const { format } = await import("date-fns");
      const firstSelected = candidates.find(c => selectedIds.has(c.id));
      const preview = await previewMcuEmail({
        candidateName: "[Candidate Name]",
        jobTitle: firstSelected?.jobTitle || "Lowongan terpilih",
        klinikName: bulkMcuForm.clinicName,
        paketMcu: bulkMcuForm.paket || "-",
        scheduledDate: format(d, "dd MMMM yyyy"),
      });
      setEmailPreview(preview);
      setIsEmailPreviewOpen(true);
    } catch (e: any) { toast.error("Gagal preview"); }
    finally { setEmailPreviewLoading(false); }
  };

  const handleSendTestInvitation = async () => {
    if (!testInviteForm.testId || selectedIds.size === 0) {
      toast.error("Pilih test dan minimal 1 kandidat");
      return;
    }
    setIsSendingTest(true);
    try {
      let scheduledAt: Date | null = null;
      let scheduledEndAt: Date | null = null;
      if (testInviteForm.scheduledDate && testInviteForm.scheduledTime) {
        scheduledAt = new Date(`${testInviteForm.scheduledDate}T${testInviteForm.scheduledTime}`);
      }
      if (testInviteForm.scheduledEndDate && testInviteForm.scheduledEndTime) {
        scheduledEndAt = new Date(`${testInviteForm.scheduledEndDate}T${testInviteForm.scheduledEndTime}`);
      }
      const result = await bulkAssignTestGroupToCandidates(
        parseInt(testInviteForm.testId),
        Array.from(selectedIds),
        scheduledAt,
        scheduledEndAt,
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

  const handlePreviewEmail = async () => {
    if (!testInviteForm.testId) {
      toast.error("Pilih test group dulu");
      return;
    }
    setEmailPreviewLoading(true);
    try {
      let scheduledAt: Date | null = null;
      let scheduledEndAt: Date | null = null;
      if (testInviteForm.scheduledDate && testInviteForm.scheduledTime) {
        scheduledAt = new Date(`${testInviteForm.scheduledDate}T${testInviteForm.scheduledTime}`);
      }
      if (testInviteForm.scheduledEndDate && testInviteForm.scheduledEndTime) {
        scheduledEndAt = new Date(`${testInviteForm.scheduledEndDate}T${testInviteForm.scheduledEndTime}`);
      }
      const preview = await previewTestGroupEmail(parseInt(testInviteForm.testId), scheduledAt, scheduledEndAt);
      setEmailPreview({ subject: preview.subject, text: preview.text, html: null });
      setIsEmailPreviewOpen(true);
    } catch (e: any) {
      toast.error("Failed to generate preview");
    } finally {
      setEmailPreviewLoading(false);
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

  const visibleCandidates = candidates.filter(c => {
    if (pipelineJobIdFilter && c.recruitmentId !== pipelineJobIdFilter) return false;
    if (pipelineJobTitleFilter && c.jobTitle !== pipelineJobTitleFilter) return false;
    if (pipelineStageFilter && c.currentStage !== pipelineStageFilter) return false;
    return true;
  });

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

  const handleBulkStageUpdate = async () => {
    if (!bulkStageTarget || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const previousCandidates = candidates;

    setIsBulkStageUpdating(true);
    setCandidates(prev => prev.map(candidate => ids.includes(candidate.id) ? { ...candidate, currentStage: bulkStageTarget } : candidate));
    try {
      const results = await Promise.allSettled(ids.map(id => updateCandidateStage(id, bulkStageTarget as any)));
      const failedCount = results.filter(result => result.status === "rejected").length;

      if (failedCount > 0) {
        setCandidates(previousCandidates);
        toast.error(`${failedCount} dari ${ids.length} kandidat gagal update stage.`);
        return;
      }

      toast.success(`${ids.length} kandidat dipindah ke ${bulkStageTarget}.`);
      setSelectedIds(new Set());
      setBulkStageTarget("");
    } finally {
      setIsBulkStageUpdating(false);
    }
  };

  const openCandidateComparison = async () => {
    if (selectedIds.size < 2 || selectedIds.size > 5) {
      toast.error("Pilih 2-5 kandidat untuk compare.");
      return;
    }
    setCompareLoading(true);
    setIsCompareOpen(true);
    try {
      const rows = await getCandidateComparisonData(Array.from(selectedIds));
      setCompareRows(rows as any[]);
    } catch (e: any) {
      toast.error(e.message || "Gagal load comparison");
      setCompareRows([]);
    } finally {
      setCompareLoading(false);
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
    scoringCriteria: DEFAULT_SCORING_CRITERIA,
    knockoutCriteria: DEFAULT_KNOCKOUT_CRITERIA,
    emailTemplateId: null as number | null,
  });

  const candidateFilters = (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
      <select
        className="flex h-9 w-[200px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={pipelineJobTitleFilter}
        onChange={(e) => setPipelineJobTitleFilter(e.target.value)}
      >
        <option value="">Semua Lowongan</option>
        {recruitments.map(r => (
          <option key={r.id} value={r.jobTitle}>{r.jobTitle}</option>
        ))}
      </select>
      <select
        className="flex h-9 w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={pipelineStageFilter}
        onChange={(e) => setPipelineStageFilter(e.target.value)}
      >
        <option value="">Semua Tahapan</option>
        <option value="Sourcing">Sourcing</option>
        <option value="Screening">Screening</option>
        <option value="Psikotes">Psikotes</option>
        <option value="Interview">Interview</option>
        <option value="Medical Checkup">Medical Checkup</option>
        <option value="Offering">Offering</option>
        <option value="Hired">Hired</option>
        <option value="Rejected">Rejected</option>
      </select>
      <div className="flex items-center gap-1.5 ml-auto">
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => { setImportResults(null); setIsImportOpen(true); }}>
          <IconUpload className="w-3 h-3 mr-1" /> Import
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setIsManualAddOpen(true)}>
          <IconPlus className="w-3 h-3 mr-1" /> Tambah
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
          const headers = ["NO", "NAMA LENGKAP", "EMAIL", "PHONE", "LOWONGAN", "LOKASI", "STAGE", "SMART SCORE", "TGL MELAMAR"];
          const rows = visibleCandidates.map((c, i) => [
            i + 1, c.fullName, c.email, c.phone, c.jobTitle || "-", c.location || "-", c.currentStage, c.aiScore ?? "-",
            format(new Date(c.createdAt), "dd MMM yyyy")
          ]);
          const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = `candidates-${format(new Date(), "yyyyMMdd")}.csv`; a.click();
          URL.revokeObjectURL(url);
        }}>
          <IconFileText className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>
    </div>
  );

  const availableSections = formOptions.sections.filter(
    (s) => !settingsForm.department || 
    s.departmentId === formOptions.departments.find(d => d.name === settingsForm.department)?.id
  );

  // Get effective status (auto-close expired)
  const getVacancyStatus = (job: Recruitment): string => {
    if (job.status === "Completed" || job.status === "Cancelled") return job.status;
    if (job.endDate && differenceInDays(new Date(job.endDate), new Date()) < 0) return "Closed";
    if (job.isPublic) return "Published";
    return job.status || "Draft";
  };

  // Filter & Sort Vacancies
  const filteredVacancies = recruitments
    .filter((job) => {
      const searchLower = vacancySearch.toLowerCase();
      const matchesSearch = !searchLower || 
        job.jobTitle.toLowerCase().includes(searchLower) ||
        job.department.toLowerCase().includes(searchLower) ||
        job.section.toLowerCase().includes(searchLower);
      const matchesStatus = vacancyStatusFilter === "all" || getVacancyStatus(job) === vacancyStatusFilter;
      const matchesDept = vacancyDepartmentFilter === "all" || job.department === vacancyDepartmentFilter;
      return matchesSearch && matchesStatus && matchesDept;
    })
    .sort((a, b) => {
      if (vacancySortBy === "candidates") return (b.candidateCount || 0) - (a.candidateCount || 0);
      if (vacancySortBy === "daysLeft") {
        const daysA = a.endDate ? differenceInDays(new Date(a.endDate), new Date()) : Infinity;
        const daysB = b.endDate ? differenceInDays(new Date(b.endDate), new Date()) : Infinity;
        return daysA - daysB;
      }
      // date default: newest first
      return (b.startDate ? new Date(b.startDate).getTime() : 0) - (a.startDate ? new Date(a.startDate).getTime() : 0);
    });

  const toggleVacancySelect = (id: number) => {
    setSelectedVacancyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleVacancySelectAll = () => {
    if (filteredVacancies.every(j => selectedVacancyIds.has(j.id))) {
      setSelectedVacancyIds(new Set());
    } else {
      setSelectedVacancyIds(new Set(filteredVacancies.map(j => j.id)));
    }
  };

  const handleBulkPublish = async () => {
    if (selectedVacancyIds.size === 0) return;
    const ids = Array.from(selectedVacancyIds);
    let updated = 0;
    for (const id of ids) {
      try {
        const res = await updateRecruitment(id, { isPublic: true, status: "Published" });
        setRecruitments(prev => prev.map(r => r.id === id ? { ...r, ...res } : r));
        updated++;
      } catch {}
    }
    toast.success(`${updated} vacancy published`);
    setSelectedVacancyIds(new Set());
  };

  const handleBulkClose = async () => {
    if (selectedVacancyIds.size === 0) return;
    const ids = Array.from(selectedVacancyIds);
    let updated = 0;
    for (const id of ids) {
      try {
        const res = await updateRecruitment(id, { status: "Closed" });
        setRecruitments(prev => prev.map(r => r.id === id ? { ...r, ...res } : r));
        updated++;
      } catch {}
    }
    toast.success(`${updated} vacancy closed`);
    setSelectedVacancyIds(new Set());
  };

  const handleBulkDeleteVacancies = async () => {
    if (selectedVacancyIds.size === 0) return;
    if (!confirm(`Delete ${selectedVacancyIds.size} vacancies? This cannot be undone.`)) return;
    const ids = Array.from(selectedVacancyIds);
    let deleted = 0;
    for (const id of ids) {
      try {
        await deleteRecruitment(id);
        setRecruitments(prev => prev.filter(r => r.id !== id));
        deleted++;
      } catch {}
    }
    toast.success(`${deleted} vacancies deleted`);
    setSelectedVacancyIds(new Set());
  };

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
      mandatoryFields: job.mandatoryFields || ["dateOfBirth", "address", "gender", "cv"],
      scoringCriteria: (job.scoringCriteria?.length ? job.scoringCriteria : DEFAULT_SCORING_CRITERIA).map((criterion) => ({ ...criterion, description: criterion.description || "" })),
      knockoutCriteria: (job.knockoutCriteria?.length ? job.knockoutCriteria : DEFAULT_KNOCKOUT_CRITERIA).map((criterion) => ({ ...criterion, description: criterion.description || "" })),
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
        scoringCriteria: settingsForm.scoringCriteria,
        knockoutCriteria: settingsForm.knockoutCriteria,
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
    if (getVacancyStatus(job) !== "Published") {
      toast.error("You must set the status to Published before sharing the link.");
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
      setCandidates(prev => page === 1 ? result.data as Candidate[] : [...prev, ...result.data as Candidate[]]);
      setCandidatePage(result as any);
      refreshEmailStatuses(result.data as Candidate[]);
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

  const getLatestTestSummary = (testResults: any[]) => {
    if (!testResults?.length) return "-";
    const completed = testResults.find((test) => test.status === "Completed") || testResults[0];
    const passLabel = completed.passed === true ? "Pass" : completed.passed === false ? "Fail" : completed.status;
    return `${completed.testTitle || "Test"}: ${completed.percentage ?? completed.score ?? "-"}% (${passLabel})`;
  };

  const getLatestInterviewSummary = (interviews: any[]) => {
    if (!interviews?.length) return "-";
    const latest = interviews[0];
    const date = latest.scheduledAt ? format(new Date(latest.scheduledAt), "dd MMM yyyy") : "-";
    return `${latest.result || latest.status || "-"} · ${latest.interviewerName || "-"} · ${date}`;
  };

  const getLatestMcuSummary = (mcuRecords: any[]) => {
    if (!mcuRecords?.length) return "-";
    const latest = mcuRecords[0];
    const date = latest.scheduledDate ? format(new Date(latest.scheduledDate), "dd MMM yyyy") : "-";
    return `${latest.status || "-"} · ${latest.klinikName || "-"} · ${date}`;
  };

  return (
    <AdminPageShell
      eyebrow="Human Capital"
      title="Recruitment Management"
      description="Manage open job vacancies, candidate pipeline, and Smart assessments"
    >
      <div className="space-y-8 pb-12">

        {/* Navigation Tab Bar */}
        <RecruitmentTabBar />

        {/* View Toggle & Stats */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-end px-2 mt-6">
          <div className="flex bg-muted/30 p-1.5 rounded-2xl border backdrop-blur-sm shadow-sm">
            <button
              onClick={() => setRecruitmentView("vacancies")}
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
              onClick={() => setRecruitmentView("pipeline")}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCandidateComparison}
              disabled={activeView !== "pipeline" || selectedIds.size < 2 || selectedIds.size > 5}
              className="ml-1 h-10 rounded-xl bg-background/80 px-4 text-sm shadow-sm"
            >
              <IconArrowsExchange className="w-4 h-4 mr-2" />
              Compare
            </Button>
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
                 {/* Search & Filter Toolbar */}
                 <div className="flex flex-col lg:flex-row gap-3 mb-4 px-1">
                   <div className="flex-1 min-w-0">
                     <Input
                       placeholder="Search by job title, department, or section..."
                       value={vacancySearch}
                       onChange={(e) => setVacancySearch(e.target.value)}
                       className="h-9"
                     />
                   </div>
                   <div className="flex flex-wrap gap-2">
                     <Select value={vacancyStatusFilter} onValueChange={setVacancyStatusFilter}>
                       <SelectTrigger className="h-9 w-[150px]">
                         <SelectValue placeholder="All Status" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Status</SelectItem>
                         <SelectItem value="Draft">Draft</SelectItem>
                         <SelectItem value="Published">Published</SelectItem>
                         <SelectItem value="Closed">Closed</SelectItem>
                         <SelectItem value="Completed">Completed</SelectItem>
                       </SelectContent>
                     </Select>
                     <Select value={vacancyDepartmentFilter} onValueChange={setVacancyDepartmentFilter}>
                       <SelectTrigger className="h-9 w-[160px]">
                         <SelectValue placeholder="All Departments" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Departments</SelectItem>
                         {formOptions.departments.map((d) => (
                           <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <Select value={vacancySortBy} onValueChange={(v: any) => setVacancySortBy(v)}>
                       <SelectTrigger className="h-9 w-[140px]">
                         <SelectValue placeholder="Sort by" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="date">Newest</SelectItem>
                         <SelectItem value="candidates">Most Candidates</SelectItem>
                         <SelectItem value="daysLeft">Days Left</SelectItem>
                       </SelectContent>
                     </Select>
                     {(vacancySearch || vacancyStatusFilter !== "all" || vacancyDepartmentFilter !== "all") && (
                       <Button variant="ghost" size="sm" className="h-9" onClick={() => {
                         setVacancySearch("");
                         setVacancyStatusFilter("all");
                         setVacancyDepartmentFilter("all");
                       }}>
                         Reset
                       </Button>
                     )}
                   </div>
                 </div>

                 {/* Bulk Action Bar */}
                 {selectedVacancyIds.size > 0 && (
                   <div className="flex items-center gap-3 px-4 py-2 bg-accent/5 border border-accent/20 rounded-lg mb-3">
                     <span className="text-sm font-medium">{selectedVacancyIds.size} selected</span>
                     <Button variant="default" size="sm" onClick={handleBulkPublish}>
                       <IconExternalLink className="w-4 h-4 mr-1" /> Publish
                     </Button>
                     <Button variant="outline" size="sm" onClick={handleBulkClose}>
                       <IconBriefcase className="w-4 h-4 mr-1" /> Close
                     </Button>
                     <Button variant="destructive" size="sm" onClick={handleBulkDeleteVacancies}>
                       <IconTrash className="w-4 h-4 mr-1" /> Delete
                     </Button>
                     <Button variant="ghost" size="sm" onClick={() => setSelectedVacancyIds(new Set())}>
                       Clear
                     </Button>
                   </div>
                 )}

                 <Table>
                   <TableHeader>
                     <TableRow className="hover:bg-transparent border-border/50">
                       <TableHead className="w-10 text-center">
                         <Checkbox
                           checked={filteredVacancies.length > 0 && filteredVacancies.every(j => selectedVacancyIds.has(j.id))}
                           onCheckedChange={toggleVacancySelectAll}
                         />
                       </TableHead>
                       <TableHead className="w-12 text-center">NO</TableHead>
                       <TableHead>JOB TITLE</TableHead>
                       <TableHead>SECTION</TableHead>
                       <TableHead>DATE RANGE</TableHead>
                       <TableHead>DAYS LEFT</TableHead>
                       <TableHead className="text-center">QUOTA</TableHead>
                       <TableHead className="text-center">APPLIED</TableHead>
                       <TableHead>STATUS</TableHead>
                       <TableHead className="text-right">ACTIONS</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredVacancies.map((job, idx) => {
                       const status = getVacancyStatus(job);
                        const statusBadge = {
                          Draft: { color: "bg-gray-100 text-gray-700 border-gray-200" },
                          Published: { color: "bg-green-100 text-green-700 border-green-200" },
                          Closed: { color: "bg-red-50 text-red-600 border-red-200" },
                          Completed: { color: "bg-blue-50 text-blue-700 border-blue-200" },
                        }[status] || { color: "bg-gray-100 text-gray-700 border-gray-200" };
                       return (
                        <TableRow key={job.id} className={hcTableRowClassName}>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedVacancyIds.has(job.id)}
                              onCheckedChange={() => toggleVacancySelect(job.id)}
                            />
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground font-medium">{idx + 1}</TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-semibold">{job.jobTitle}</p>
                              <div className="flex flex-wrap gap-1">
                                {job.qualifications && job.qualifications.length > 0 && (
                                  <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                    {job.qualifications.length} qualifications
                                  </span>
                                )}
                                {job.knockoutCriteria && job.knockoutCriteria.filter(c => c.enabled).length > 0 && (
                                  <span className="text-[10px] font-medium bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                                    {job.knockoutCriteria.filter(c => c.enabled).length} knockouts
                                  </span>
                                )}
                                {job.mandatoryFields && job.mandatoryFields.length > 0 && (
                                  <span className="text-[10px] font-medium bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">
                                    {job.mandatoryFields.length} mandatory fields
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
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
                            <span className="font-bold text-foreground">{job.candidateCount}</span>
                         </TableCell>
                         <TableCell>
                            <Badge variant="outline" className={`rounded-full ${statusBadge.color}`}>
                              {status}
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
                                    setDialogCandidates(res.data as Candidate[]);
                                    setDialogCandidatePage({ page: res.page, total: res.total, totalPages: res.totalPages });
                                  } catch { setDialogCandidates([]); }
                                  finally { setDialogCandidatesLoading(false); }
                                }} title="View Candidates">
                                 <IconUsers className="w-4 h-4 text-blue-500" />
                               </Button>
                               <Button variant="ghost" size="icon" onClick={() => openBatches(job.id)} title="Schedule Batches">
                                 <IconCalendarEvent className="w-4 h-4 text-amber-600" />
                               </Button>
                               {status === "Published" ? (
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
                     );
                     })}
                     {filteredVacancies.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                           {recruitments.length === 0 ? "No Job Vacancies found." : "No vacancies match your filters."}
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
                     <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/5 border border-accent/20 rounded-lg mb-3">
                       <span className="text-xs font-medium mr-1">{selectedIds.size}</span>
                       <Button variant="destructive" size="icon" className="h-7 w-7" onClick={handleBulkDelete} title="Delete Selected">
                         <IconTrash className="w-3.5 h-3.5" />
                       </Button>
                       <Button variant="outline" size="icon" className="h-7 w-7" onClick={openTestInvite} title="Send Test Invitation">
                         <IconBrain className="w-3.5 h-3.5" />
                       </Button>
                       <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setIsBulkInterviewOpen(true)} title="Send Interview Email">
                         <IconCalendarEvent className="w-3.5 h-3.5" />
                       </Button>
                       <Button variant="outline" size="icon" className="h-7 w-7" onClick={async () => {
                         const num = await getNextLetterNumber('surat_penawaran_kerja');
                         setOfferingLetterNo(num);
                         try {
                           const emps = await getActiveEmployees();
                           setOfferingEmployees(emps.map((e: any) => ({ id: e.id, name: e.fullName || e.name, section: e.section || '-', jobTitle: e.jobTitle || '-' })));
                         } catch {}
                         setIsBulkOfferingOpen(true);
                       }} title="Send Offering">
                         <IconFileText className="w-3.5 h-3.5" />
                       </Button>
                       <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setIsBulkMcuOpen(true)} title="Send MCU Email">
                         <IconStethoscope className="w-3.5 h-3.5" />
                       </Button>
                       <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { setBulkEmailSubject(""); setBulkEmailMessage(""); setBulkEmailResult(null); setIsBulkEmailOpen(true); }} title="Send Custom Email">
                         <IconMail className="w-3.5 h-3.5" />
                       </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setIsMulaiKerjaOpen(true)} title="Send Mulai Kerja">
                          <IconBriefcase className="w-3.5 h-3.5" />
                        </Button>
                        <div className="mx-1 h-6 w-px bg-border" />
                        <select
                          className="h-7 w-36 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
                          value={bulkStageTarget}
                          onChange={(event) => setBulkStageTarget(event.target.value)}
                          title="Pilih stage bulk"
                        >
                          <option value="">Ganti stage...</option>
                          {CANDIDATE_STAGES.map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={handleBulkStageUpdate}
                          disabled={!bulkStageTarget || isBulkStageUpdating}
                          title="Apply stage ke kandidat terpilih"
                        >
                          {isBulkStageUpdating ? "Updating..." : "Apply"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedIds(new Set())} title="Clear selection">
                         Clear
                       </Button>
                    </div>
                  )}
                  <Table className="table-fixed text-xs">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="w-9 px-2 text-center">
                          <Checkbox
                            checked={visibleCandidates.length > 0 && visibleCandidates.every(c => selectedIds.has(c.id))}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="w-10 px-2 text-center">NO</TableHead>
                        <TableHead className="w-24 px-2">TGL</TableHead>
                        <TableHead className="w-40 px-2">NAMA</TableHead>
                        <TableHead className="w-36 px-2">LOWONGAN</TableHead>
                        <TableHead className="w-24 px-2">LOKASI</TableHead>
                        <TableHead className="w-44 px-2">EMAIL</TableHead>
                        <TableHead className="w-28 px-2">PHONE</TableHead>
                        <TableHead className="w-32 px-2">STAGE</TableHead>
                        <TableHead className="w-24 px-2 text-center">HASIL</TableHead>
                        <TableHead className="w-36 px-2">Smart</TableHead>
                        <TableHead className="w-16 px-2 text-center">MAIL</TableHead>
                        <TableHead className="sticky right-0 z-10 w-28 bg-muted/95 px-2 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleCandidates.map((candidate, idx) => (
                        <TableRow key={candidate.id} className={hcTableRowClassName} data-filter-stage={candidate.currentStage} data-filter-job={candidate.jobTitle || ""}>
                          <TableCell className="px-2 text-center">
                            <Checkbox
                              checked={selectedIds.has(candidate.id)}
                              onCheckedChange={() => toggleSelect(candidate.id)}
                            />
                          </TableCell>
                          <TableCell className="px-2 text-center text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="px-2 text-muted-foreground text-xs whitespace-nowrap">{format(new Date(candidate.createdAt), "dd MMM yyyy")}</TableCell>
                          <TableCell className="px-2 font-semibold">
                            <button
                              type="button"
                              onClick={() => setProfileDrawerCandidate(candidate)}
                              className="line-clamp-2 break-words text-left text-slate-900 underline-offset-4 hover:text-primary hover:underline"
                              title="Buka drawer profile kandidat"
                            >
                              {candidate.fullName}
                              {getAgeFromDateOfBirth(candidate.dateOfBirth) !== null ? (
                                <span className="ml-1 whitespace-nowrap rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {getAgeFromDateOfBirth(candidate.dateOfBirth)} th
                                </span>
                              ) : null}
                            </button>
                          </TableCell>
                          <TableCell className="px-2 text-muted-foreground"><div className="line-clamp-2 break-words" title={candidate.jobTitle || "-"}>{candidate.jobTitle || "-"}</div></TableCell>
                          <TableCell className="px-2 text-muted-foreground"><div className="truncate" title={candidate.location || "-"}>{candidate.location || "-"}</div></TableCell>
                          <TableCell className="px-2"><div className="truncate" title={candidate.email}>{candidate.email}</div></TableCell>
                          <TableCell className="px-2"><div className="truncate" title={candidate.phone}>{candidate.phone}</div></TableCell>
                          <TableCell className="px-2">
                            <select
                              className="flex h-8 w-full rounded-md border border-input bg-background px-1.5 py-1 text-xs shadow-sm cursor-pointer"
                              value={candidate.currentStage}
                              onChange={async (e) => {
                                const newStage = e.target.value;
                                const oldStage = candidate.currentStage;
                                if (newStage === oldStage) return;
                                setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, currentStage: newStage } : c));
                                try {
                                  await updateCandidateStage(candidate.id, newStage as any);
                                  toast.success(`${candidate.fullName} → ${newStage}`);
                                } catch (err: any) {
                                  setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, currentStage: oldStage } : c));
                                  toast.error(err.message || "Failed");
                                }
                              }}
                            >
                              {CANDIDATE_STAGES.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="px-2 text-center">
                            {candidate.currentStage === "Hired" ? (
                              <Badge className="bg-green-600 text-white font-bold">Lolos</Badge>
                            ) : candidate.currentStage === "Rejected" ? (
                              <Badge className="bg-red-600 text-white font-bold">Tidak Lolos</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-2">
                            {candidate.aiScore !== null ? (
                              <div className="flex flex-col gap-1">
                                <Badge variant="secondary" className="w-fit border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                  Smart sudah diproses
                                </Badge>
                                <div className="flex items-center gap-2">
                                  <Progress value={candidate.aiScore} className="w-16 h-2 [&>div]:bg-accent" />
                                  <span className="text-xs font-medium">{candidate.aiScore}%</span>
                                </div>
                                {formatAiRecommendation(candidate.aiDetails?.recommendation) && (
                                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    {formatAiRecommendation(candidate.aiDetails?.recommendation)}
                                  </span>
                                )}
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="px-2 text-center">
                            {emailStatuses[candidate.id] && emailStatuses[candidate.id].status !== "none" ? (
                              <span title={`Email ${emailStatuses[candidate.id].status}`}>
                                <IconMail className={cn("w-4 h-4 mx-auto", emailStatuses[candidate.id].status === "sent" ? "text-green-600" : "text-destructive")} />
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="sticky right-0 bg-white px-2 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                            <div className="flex justify-end gap-1">
                              {candidate.cvUrl ? (
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleViewCv(candidate.cvUrl, candidate.fullName)} disabled={cvLoadingId === candidate.id} title="View CV">
                                  {cvLoadingId === candidate.id ? <span className="w-3 h-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <IconFileText className="w-3.5 h-3.5" />}
                                </Button>
                              ) : null}
                              <Button variant="default" size="icon" className="h-7 w-7" asChild title="View Details">
                                <Link href={`/dashboard/hc/recruitment/candidates/${candidate.id}`}><IconEye className="w-3.5 h-3.5" /></Link>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive border border-transparent hover:border-destructive hover:bg-destructive/10" onClick={() => handleDeleteCandidate(candidate.id)} title="Delete">
                                <IconTrash className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {visibleCandidates.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={13} className="h-32 text-center text-muted-foreground">
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

      <Sheet open={Boolean(profileDrawerCandidate)} onOpenChange={(open) => !open && setProfileDrawerCandidate(null)}>
        <SheetContent side="right" className="h-dvh max-h-dvh w-[95vw] sm:max-w-lg p-0 flex flex-col gap-0 overflow-hidden">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="text-lg font-semibold">Profile Kandidat</SheetTitle>
            <SheetDescription>Ringkasan cepat tanpa pindah halaman.</SheetDescription>
          </SheetHeader>
          {profileDrawerCandidate && (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xl font-bold leading-tight text-slate-900">{profileDrawerCandidate.fullName}</div>
                  {getAgeFromDateOfBirth(profileDrawerCandidate.dateOfBirth) !== null ? (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      {getAgeFromDateOfBirth(profileDrawerCandidate.dateOfBirth)} tahun
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{profileDrawerCandidate.jobTitle || "-"}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{profileDrawerCandidate.currentStage}</Badge>
                  {profileDrawerCandidate.aiScore !== null ? (
                    <Badge className="bg-emerald-600 text-white">Smart {profileDrawerCandidate.aiScore}%</Badge>
                  ) : (
                    <Badge variant="secondary">Belum Smart</Badge>
                  )}
                  {formatAiRecommendation(profileDrawerCandidate.aiDetails?.recommendation) ? (
                    <Badge variant="secondary" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      {formatAiRecommendation(profileDrawerCandidate.aiDetails?.recommendation)}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 text-sm">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kontak</div>
                  <div className="mt-2 space-y-1">
                    <div className="break-words">{profileDrawerCandidate.email || "-"}</div>
                    <div>{profileDrawerCandidate.phone || "-"}</div>
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lamaran</div>
                  <div className="mt-2 space-y-1">
                    <div>Lokasi: {profileDrawerCandidate.location || "-"}</div>
                    <div>Sumber: {profileDrawerCandidate.source || "-"}</div>
                    <div>Tanggal: {format(new Date(profileDrawerCandidate.createdAt), "dd MMM yyyy")}</div>
                  </div>
                </div>
                {profileDrawerCandidate.aiSummary ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Ringkasan Smart</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{profileDrawerCandidate.aiSummary}</div>
                  </div>
                ) : null}
                {profileDrawerRadarData.length > 0 ? (
                  <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Radar Smart</div>
                        <div className="text-xs text-muted-foreground">Score per kriteria assessment</div>
                      </div>
                      {profileDrawerCandidate.aiScore !== null ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{profileDrawerCandidate.aiScore}%</Badge> : null}
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={profileDrawerRadarData} margin={{ top: 12, right: 28, bottom: 12, left: 28 }}>
                          <PolarGrid stroke="#cbd5e1" radialLines />
                          <PolarAngleAxis dataKey="criterion" tick={{ fill: "#334155", fontSize: 9, fontWeight: 600 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 8 }} tickCount={5} />
                          <Radar name="Score Smart" dataKey="score" stroke="#059669" fill="#10b981" fillOpacity={0.34} strokeWidth={2.5} dot={{ r: 2.5, fill: "#0f766e", strokeWidth: 1 }} />
                          <RechartsTooltip
                            contentStyle={{ borderRadius: 12, border: "1px solid #d1fae5", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.14)" }}
                            formatter={(value: number, name: string) => [`${value}%`, name]}
                            labelFormatter={(label) => `Kriteria: ${label}`}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : null}
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pengalaman Kerja</div>
                  {(profileDrawerCandidate.workExperience?.length ?? 0) > 0 ? (
                    <div className="mt-2 space-y-2">
                      {profileDrawerCandidate.workExperience?.map((work: any, idx: number) => (
                        <div key={`${work.role}-${idx}`} className="rounded-lg bg-white p-2 text-sm shadow-sm">
                          <div className="font-semibold text-slate-900">{work.role || "-"}</div>
                          <div className="text-xs text-muted-foreground">{work.company || "-"} · {work.yearIn || "-"}-{work.yearOut || "-"}</div>
                          {work.description ? <div className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{work.description}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-muted-foreground">Belum ada pengalaman kerja.</div>
                  )}
                </div>
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pendidikan / Sekolah</div>
                  {(profileDrawerCandidate.education?.length ?? 0) > 0 ? (
                    <div className="mt-2 space-y-2">
                      {profileDrawerCandidate.education?.map((edu: any, idx: number) => (
                        <div key={`${edu.institution}-${idx}`} className="rounded-lg bg-white p-2 text-sm shadow-sm">
                          <div className="font-semibold text-slate-900">{edu.institution || "-"}</div>
                          <div className="text-xs text-muted-foreground">{edu.level || "-"} · {edu.major || "-"}</div>
                          <div className="text-xs text-muted-foreground">{edu.yearIn || "-"}-{edu.yearOut || "-"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-muted-foreground">Belum ada data pendidikan.</div>
                  )}
                </div>
                {profileDrawerCandidate.notes ? (
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{profileDrawerCandidate.notes}</div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
          <SheetFooter className="border-t px-6 py-4">
            {profileDrawerCandidate ? (
              <Button asChild className="w-full">
                <Link href={`/dashboard/hc/recruitment/candidates/${profileDrawerCandidate.id}`}>Buka Detail Lengkap</Link>
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="h-dvh max-h-dvh w-[95vw] sm:max-w-xl lg:max-w-2xl p-0 flex flex-col gap-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b">
            <SheetTitle className="text-lg font-semibold">Job Vacancy Settings</SheetTitle>
            <SheetDescription>
              Configure the public link and application form settings for this recruitment.
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="info" className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <TabsList className="mx-6 mt-4 w-auto self-start">
              <TabsTrigger value="info">Basic Info</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="scoring">Scoring</TabsTrigger>
              <TabsTrigger value="knockout">Knockout</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              <TabsContent value="info" className="space-y-5 mt-0">
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
              </TabsContent>

              <TabsContent value="requirements" className="space-y-5 mt-0">
                <div className="rounded-lg border bg-surface-container-lowest p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Quick Template</Label>
                    <span className="text-xs text-muted-foreground">Apply preset to auto-fill below</span>
                  </div>
                  <Select
                    onValueChange={(val) => {
                      if (val === "clear") {
                        setSettingsForm((prev) => ({
                          ...prev,
                          jobDescription: "",
                          requirements: "",
                          qualifications: [],
                          mandatoryFields: ["dateOfBirth", "address", "gender", "cv"],
                        }));
                        return;
                      }
                      const template = sectionTemplates.find((t) => t.id.toString() === val);
                      if (template) {
                        setSettingsForm((prev) => ({
                          ...prev,
                          jobDescription: template.jobDescription,
                          requirements: template.requirements,
                          qualifications: template.qualifications,
                          mandatoryFields: template.mandatoryFields,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {sectionTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.sectionName}</SelectItem>
                      ))}
                      <SelectItem value="clear">Clear All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Requirements (General Text)</Label>
                  <Textarea
                    placeholder="General description of what you are looking for..."
                    rows={4}
                    value={settingsForm.requirements}
                    onChange={(e) => setSettingsForm({ ...settingsForm, requirements: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Smart Assessment Qualifications</Label>
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
                  <p className="text-xs text-muted-foreground">
                    Smart will strictly check the candidate's CV and Form against these specific points.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Form Builder: Mandatory Fields</Label>
                  <div className="grid grid-cols-2 gap-3 bg-muted/20 p-4 rounded-lg border">
                    {[
                      { id: "cv", label: "Curriculum Vitae (CV)" },
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
                  <p className="text-xs text-muted-foreground">
                    Selected fields will be required when candidates fill out the public application form.
                    Name, Email, and Phone are always required.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="scoring" className="space-y-5 mt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Smart Scoring Matrix</Label>
                    <span className="text-xs text-muted-foreground">Keep total near 100</span>
                  </div>
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                    {settingsForm.scoringCriteria.map((criterion, idx) => (
                      <div key={criterion.id} className="grid grid-cols-[1fr_88px] gap-3 items-center rounded-md bg-background/70 p-3">
                        <div>
                          <div className="text-sm font-medium">{criterion.label}</div>
                          <div className="text-xs text-muted-foreground">{criterion.description}</div>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={criterion.weight}
                          onChange={(e) => {
                            const next = [...settingsForm.scoringCriteria];
                            next[idx] = { ...criterion, weight: parseInt(e.target.value, 10) || 0 };
                            setSettingsForm({ ...settingsForm, scoringCriteria: next });
                          }}
                        />
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground text-right">
                      Total weight: {settingsForm.scoringCriteria.reduce((sum, item) => sum + item.weight, 0)}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="knockout" className="space-y-5 mt-0">
                <div className="space-y-2">
                  <Label>Knockout Criteria</Label>
                  <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/20 p-4">
                    {settingsForm.knockoutCriteria.map((criterion, idx) => (
                      <div key={criterion.id} className="flex items-start gap-3 rounded-md bg-background/70 p-3">
                        <Checkbox
                          id={`knockout-${criterion.id}`}
                          checked={criterion.enabled}
                          onCheckedChange={(checked) => {
                            const next = [...settingsForm.knockoutCriteria];
                            next[idx] = { ...criterion, enabled: checked === true };
                            setSettingsForm({ ...settingsForm, knockoutCriteria: next });
                          }}
                        />
                        <div>
                          <Label htmlFor={`knockout-${criterion.id}`} className="cursor-pointer text-sm font-medium">
                            {criterion.label}
                          </Label>
                          <div className="text-xs text-muted-foreground">{criterion.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <SheetFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
                      <TableHead>SMART MATCH</TableHead>
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
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex items-center gap-2">
                                <Progress value={candidate.aiScore} className="w-16 h-2 [&>div]:bg-accent" />
                                <span className="text-xs font-medium">{candidate.aiScore}%</span>
                              </div>
                              {formatAiRecommendation(candidate.aiDetails?.recommendation) && (
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {formatAiRecommendation(candidate.aiDetails?.recommendation)}
                                </span>
                              )}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {candidate.cvUrl ? (
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleViewCv(candidate.cvUrl, candidate.fullName)} disabled={cvLoadingId === candidate.id} title="View CV">
                                {cvLoadingId === candidate.id ? <span className="w-3 h-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <IconFileText className="w-3.5 h-3.5" />}
                              </Button>
                            ) : null}
                            <Button variant="default" size="icon" className="h-7 w-7" onClick={() => window.location.href = `/dashboard/hc/recruitment/candidates/${candidate.id}`} title="View Details">
                              <IconEye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive border border-transparent hover:border-destructive hover:bg-destructive/10" onClick={() => handleDeleteCandidate(candidate.id)} title="Delete">
                              <IconTrash className="w-3.5 h-3.5" />
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
                        setDialogCandidates(res.data as Candidate[]);
                        setDialogCandidatePage({ page: res.page, total: res.total, totalPages: res.totalPages });
                      }}>
                      Prev
                    </Button>
                    <Button variant="outline" size="sm" disabled={dialogCandidatePage.page >= dialogCandidatePage.totalPages}
                      onClick={async () => {
                        const next = dialogCandidatePage.page + 1;
                        const res = await getCandidatesPaginated({ page: next, pageSize: 50, jobId: selectedCandidateListJobId! });
                        setDialogCandidates(res.data as Candidate[]);
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

    <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
      <DialogContent className="w-[80vw] h-[88vh] max-w-6xl flex flex-col overflow-hidden" style={{ maxHeight: '88vh' }}>
        <DialogHeader className="shrink-0">
          <DialogTitle>Candidate Comparison</DialogTitle>
          <DialogDescription>
            Compare 2-5 selected candidates before offering decision.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-0 rounded-xl border bg-muted/20 p-3">
          {compareLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading comparison...</div>
          ) : compareRows.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No comparison data.</div>
          ) : (
            <div className="grid gap-3 min-w-max" style={{ gridTemplateColumns: `repeat(${compareRows.length}, minmax(240px, 320px))` }}>
              {compareRows.map((row) => {
                const candidate = row.candidate;
                const breakdown = candidate.aiDetails?.breakdown || [];
                const knockout = candidate.aiDetails?.knockout || [];
                const aiRecommendation = formatAiRecommendation(candidate.aiDetails?.recommendation);
                const aiRadarData = breakdown.map((item: any) => ({
                  criterion: String(item?.criterion || "Kriteria"),
                  score: Math.max(0, Math.min(100, Number(item?.score) || 0)),
                  weight: Number(item?.weight) || 0,
                }));
                return (
                  <div key={candidate.id} className="space-y-3 rounded-xl border bg-background p-3 text-xs shadow-sm">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold leading-tight">{candidate.fullName}</div>
                      <div className="text-xs text-muted-foreground">{candidate.jobTitle || "-"} · {candidate.currentStage}</div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {candidate.aiScore !== null ? <Badge>{candidate.aiScore}% Smart</Badge> : <Badge variant="secondary">No Smart score</Badge>}
                        {aiRecommendation ? <Badge variant="outline">{aiRecommendation}</Badge> : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Smart Score Breakdown</div>
                      {aiRadarData.length > 0 && (
                        <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-2">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-slate-800">Radar Smart</div>
                            {candidate.aiScore !== null ? <Badge variant="secondary" className="border-emerald-200 bg-emerald-100 text-[10px] text-emerald-700">{candidate.aiScore}%</Badge> : null}
                          </div>
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={aiRadarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                                <PolarGrid stroke="#cbd5e1" radialLines />
                                <PolarAngleAxis dataKey="criterion" tick={{ fill: "#334155", fontSize: 9, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 8 }} tickCount={5} />
                                <Radar name="Score Smart" dataKey="score" stroke="#059669" fill="#10b981" fillOpacity={0.34} strokeWidth={2} dot={{ r: 2, fill: "#0f766e", strokeWidth: 1 }} />
                                <RechartsTooltip
                                  contentStyle={{ borderRadius: 12, border: "1px solid #d1fae5", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.14)" }}
                                  formatter={(value: number, name: string) => [`${value}%`, name]}
                                  labelFormatter={(label) => `Kriteria: ${label}`}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                      {breakdown.length > 0 ? breakdown.map((item: any, idx: number) => (
                        <div key={`${item.criterion}-${idx}`} className="space-y-1 rounded-md bg-muted/30 p-2">
                          <div className="flex items-start justify-between gap-2 text-xs">
                            <span className="min-w-0 break-words font-medium leading-snug">{item.criterion}</span>
                            <span className="shrink-0 whitespace-nowrap text-muted-foreground">{item.score}% / w{item.weight}</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, Number(item.score) || 0))}%` }} />
                          </div>
                          <div className="whitespace-normal break-words text-[11px] leading-snug text-muted-foreground">{item.reason}</div>
                        </div>
                      )) : <div className="text-xs text-muted-foreground">No Smart breakdown.</div>}
                      {knockout.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {knockout.map((item: any, idx: number) => (
                            <div key={`${item.criterion}-${idx}`} className="flex items-start justify-between gap-2 text-xs">
                              <span>{item.criterion}</span>
                              <Badge variant={item.passed ? "default" : "destructive"} className="text-[10px]">{item.passed ? "Pass" : "Fail"}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Education</div>
                      {candidate.education?.length > 0 ? candidate.education.map((edu: any, idx: number) => (
                        <div key={idx} className="text-xs rounded-md bg-muted/30 p-2">
                          <div className="font-medium">{edu.level || edu.jenjang || "-"} · {edu.major || "-"}</div>
                          <div className="text-muted-foreground">{edu.institution || "-"} · {edu.yearIn || "-"}-{edu.yearOut || "-"}</div>
                        </div>
                      )) : <div className="text-xs text-muted-foreground">-</div>}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Experience</div>
                      {candidate.workExperience?.length > 0 ? candidate.workExperience.map((work: any, idx: number) => (
                        <div key={idx} className="text-xs rounded-md bg-muted/30 p-2">
                          <div className="font-medium">{work.role || "-"}</div>
                          <div className="text-muted-foreground">{work.company || "-"} · {work.yearIn || "-"}-{work.yearOut || "-"}</div>
                        </div>
                      )) : <div className="text-xs text-muted-foreground">-</div>}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Certifications</div>
                      {candidate.certificates?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {candidate.certificates.map((cert: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-[10px]">{cert.name || "Certificate"}</Badge>
                          ))}
                        </div>
                      ) : <div className="text-xs text-muted-foreground">-</div>}
                    </div>

                    <div className="grid gap-2 text-xs">
                      <div className="rounded-md bg-muted/30 p-2">
                        <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Test Result</div>
                        <div>{getLatestTestSummary(row.testResults)}</div>
                      </div>
                      <div className="rounded-md bg-muted/30 p-2">
                        <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Interview Result</div>
                        <div>{getLatestInterviewSummary(row.interviews)}</div>
                      </div>
                      <div className="rounded-md bg-muted/30 p-2">
                        <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Panelist Evaluation</div>
                        <div>
                          {row.panelSummary?.count
                            ? `${row.panelSummary.averageScore}/5 · ${row.panelSummary.recommendation} (${row.panelSummary.count} panelis)`
                            : "-"}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/30 p-2">
                        <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">MCU Result</div>
                        <div>{getLatestMcuSummary(row.mcuRecords)}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</div>
                      <div className="min-h-16 rounded-md bg-muted/30 p-2 text-xs whitespace-pre-wrap">{candidate.notes || candidate.aiSummary || "-"}</div>
                    </div>

                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href={`/dashboard/hc/recruitment/candidates/${candidate.id}`}>Open Details</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => setIsCompareOpen(false)}>Close</Button>
        </DialogFooter>
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
            <Label>Select Test Group <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {availableTestGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setTestInviteForm({ ...testInviteForm, testId: String(g.id) })}
                  className={`p-3 rounded-lg border text-center font-medium transition-colors ${testInviteForm.testId === String(g.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted/50 border-border"}`}
                >
                  {g.name}
                </button>
              ))}
              {availableTestGroups.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2">No test groups found. Create test groups first.</p>
              )}
            </div>
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
                              const endDate = b.scheduledEndAt ? new Date(b.scheduledEndAt) : null;
                              setTestInviteForm({
                                ...testInviteForm,
                                batchId: String(b.id),
                                scheduledDate: d.toISOString().split("T")[0],
                                scheduledTime: d.toTimeString().slice(0, 5),
                                scheduledEndDate: endDate ? endDate.toISOString().split("T")[0] : "",
                                scheduledEndTime: endDate ? endDate.toTimeString().slice(0, 5) : "",
                              });
                            }}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-foreground"}`}
                            title={`${formatInTimeZone(new Date(b.scheduledAt), WITA_TZ, "dd/MM/yy HH:mm") + " WITA"}${b.scheduledEndAt ? ` → ${formatInTimeZone(new Date(b.scheduledEndAt), WITA_TZ, "HH:mm") + " WITA"}` : ""}`}
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
                      onClick={() => setTestInviteForm({ ...testInviteForm, batchId: "", scheduledDate: "", scheduledTime: "", scheduledEndDate: "", scheduledEndTime: "" })}
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
                <Label className="text-xs text-muted-foreground">Mulai (WITA)</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input type="date" value={testInviteForm.scheduledDate} onChange={(e) => setTestInviteForm({ ...testInviteForm, scheduledDate: e.target.value })} />
                  <Input type="time" value={testInviteForm.scheduledTime} onChange={(e) => setTestInviteForm({ ...testInviteForm, scheduledTime: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Selesai (optional, WITA)</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input type="date" value={testInviteForm.scheduledEndDate} onChange={(e) => setTestInviteForm({ ...testInviteForm, scheduledEndDate: e.target.value })} />
                  <Input type="time" value={testInviteForm.scheduledEndTime} onChange={(e) => setTestInviteForm({ ...testInviteForm, scheduledEndTime: e.target.value })} />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Kosongkan agar test langsung bisa diakses. Jika diisi, test hanya bisa dibuka dalam rentang waktu tersebut.</p>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsTestInviteOpen(false)}>Cancel</Button>
          <Button variant="outline" onClick={handlePreviewEmail} disabled={emailPreviewLoading || !testInviteForm.testId}>
            {emailPreviewLoading ? "Loading..." : "Preview Email"}
          </Button>
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
              <div>
                <Label className="text-xs text-muted-foreground">Mulai</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input type="date" value={batchForm.scheduledDate} onChange={(e) => setBatchForm({ ...batchForm, scheduledDate: e.target.value })} />
                  <Input type="time" value={batchForm.scheduledTime} onChange={(e) => setBatchForm({ ...batchForm, scheduledTime: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Selesai (optional)</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input type="date" value={batchForm.scheduledEndDate} onChange={(e) => setBatchForm({ ...batchForm, scheduledEndDate: e.target.value })} />
                  <Input type="time" value={batchForm.scheduledEndTime} onChange={(e) => setBatchForm({ ...batchForm, scheduledEndTime: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              {editingBatchId && (
                <Button variant="ghost" size="sm" onClick={() => { setEditingBatchId(null); setBatchForm({ batchName: "", batchType: "psikotes_1", scheduledDate: "", scheduledTime: "", scheduledEndDate: "", scheduledEndTime: "" }); }}>
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
                            <div className="text-xs text-muted-foreground">
                              {formatInTimeZone(new Date(b.scheduledAt), WITA_TZ, "dd MMM yyyy HH:mm") + " WITA"}
                              {b.scheduledEndAt && ` — ${formatInTimeZone(new Date(b.scheduledEndAt), WITA_TZ, "HH:mm") + " WITA"}`}
                            </div>
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

    {/* Email Preview Dialog */}
    <Dialog open={isEmailPreviewOpen} onOpenChange={setIsEmailPreviewOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
        <DialogHeader className="shrink-0">
          <DialogTitle>Email Preview</DialogTitle>
          <DialogDescription>
            Subject: {emailPreview.subject}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-0 space-y-2">
          {emailPreview.html && (
            <div className="rounded-lg bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1">HTML Preview</div>
              <iframe srcDoc={emailPreview.html} className="w-full border-0" style={{ height: '400px' }} title="Email Preview" />
            </div>
          )}
          {emailPreview.text && (
            <div className="rounded-lg bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1">Plain Text</div>
              <pre className="whitespace-pre-wrap break-words p-4 pt-0 font-mono text-sm leading-7 text-left text-slate-900">{emailPreview.text}</pre>
            </div>
          )}
          {!emailPreview.html && !emailPreview.text && (
            <div className="p-6 text-sm text-muted-foreground">No preview content.</div>
          )}
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => setIsEmailPreviewOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Bulk Interview Dialog */}
    <Dialog open={isBulkInterviewOpen} onOpenChange={setIsBulkInterviewOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Interview Email to {selectedIds.size} Candidates</DialogTitle>
          <DialogDescription>Jadwal interview akan dikirim via email ke semua kandidat terpilih.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={bulkInterviewForm.date} onChange={e => setBulkInterviewForm({...bulkInterviewForm, date: e.target.value})} /></div>
            <div className="space-y-2"><Label>Time *</Label><Input type="time" value={bulkInterviewForm.time} onChange={e => setBulkInterviewForm({...bulkInterviewForm, time: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Duration (mins)</Label><Input type="number" min={15} value={bulkInterviewForm.duration} onChange={e => setBulkInterviewForm({...bulkInterviewForm, duration: parseInt(e.target.value)||60})} /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={bulkInterviewForm.type} onValueChange={v => setBulkInterviewForm({...bulkInterviewForm, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Online">Online</SelectItem><SelectItem value="Offline">Offline</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Location/Link *</Label><Input placeholder="Google Meet link or office address" value={bulkInterviewForm.location} onChange={e => setBulkInterviewForm({...bulkInterviewForm, location: e.target.value})} /></div>
          <div className="space-y-2"><Label>Interviewer</Label><Input placeholder="Nama pewawancara" value={bulkInterviewForm.interviewer} onChange={e => setBulkInterviewForm({...bulkInterviewForm, interviewer: e.target.value})} /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Catatan tambahan" value={bulkInterviewForm.notes} onChange={e => setBulkInterviewForm({...bulkInterviewForm, notes: e.target.value})} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsBulkInterviewOpen(false)}>Cancel</Button>
          <Button variant="outline" onClick={handlePreviewBulkInterview} disabled={emailPreviewLoading}>
            {emailPreviewLoading ? "Loading..." : "Preview Email"}
          </Button>
          <Button onClick={handleBulkInterview} disabled={isBulkInterviewSending}>
            {isBulkInterviewSending ? "Sending..." : `Send to ${selectedIds.size} Candidates`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Bulk MCU Dialog */}
    <Dialog open={isBulkMcuOpen} onOpenChange={setIsBulkMcuOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send MCU Email to {selectedIds.size} Candidates</DialogTitle>
          <DialogDescription>Jadwal Medical Check Up akan dikirim via email ke semua kandidat terpilih.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Select Clinic</Label>
            <Select value={bulkMcuForm.clinicId || "manual"} onValueChange={v => {
              if (v === "manual") {
                setBulkMcuForm(prev => ({ ...prev, clinicId: "", clinicName: "", clinicEmail: "" }));
              } else {
                const clinic = clinics.find(c => c.id.toString() === v);
                setBulkMcuForm(prev => ({ ...prev, clinicId: v, clinicName: clinic?.name ?? "", clinicEmail: clinic?.email ?? "" }));
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Pilih klinik atau isi manual" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual (isi sendiri)</SelectItem>
                {clinics.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name} — {c.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Clinic Name *</Label><Input placeholder="Nama klinik" value={bulkMcuForm.clinicName} disabled={!!bulkMcuForm.clinicId && bulkMcuForm.clinicId !== "manual"} onChange={e => setBulkMcuForm({...bulkMcuForm, clinicName: e.target.value})} /></div>
          <div className="space-y-2"><Label>Clinic Email *</Label><Input type="email" placeholder="Email klinik" value={bulkMcuForm.clinicEmail} disabled={!!bulkMcuForm.clinicId && bulkMcuForm.clinicId !== "manual"} onChange={e => setBulkMcuForm({...bulkMcuForm, clinicEmail: e.target.value})} /></div>
          <div className="space-y-2"><Label>MCU Package *</Label><Input placeholder="cth: Paket Executive" value={bulkMcuForm.paket} onChange={e => setBulkMcuForm({...bulkMcuForm, paket: e.target.value})} /></div>
          <div className="space-y-2"><Label>Date *</Label><Input type="date" value={bulkMcuForm.date} onChange={e => setBulkMcuForm({...bulkMcuForm, date: e.target.value})} /></div>
          <div className="space-y-2">
            <Label>Penandatangan</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={bulkMcuForm.signatoryName} onChange={e => {
              const signer = MCU_SIGNERS.find(s => s.name === e.target.value) || MCU_SIGNERS[0];
              setBulkMcuForm({...bulkMcuForm, signatoryName: signer.name, signatoryTitle: signer.title, signatureUrl: signer.signatureUrl});
            }}>
              {MCU_SIGNERS.map(s => <option key={s.name} value={s.name}>{s.name} — {s.title}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsBulkMcuOpen(false)}>Cancel</Button>
          <Button variant="outline" onClick={handlePreviewBulkMcu} disabled={emailPreviewLoading}>
            {emailPreviewLoading ? "Loading..." : "Preview Email"}
          </Button>
          <Button onClick={handleBulkMcu} disabled={isBulkMcuSending}>
            {isBulkMcuSending ? "Sending..." : `Send to ${selectedIds.size} Candidates`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Mulai Kerja Dialog */}
    <Dialog open={isMulaiKerjaOpen} onOpenChange={setIsMulaiKerjaOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Send Mulai Kerja to {selectedIds.size} Candidates</DialogTitle>
          <DialogDescription>Kirim email selamat datang + link onboarding ke kandidat yang sudah hired.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="space-y-2">
            <Label>Posisi *</Label>
            <Input placeholder="Isi manual posisi, ex: HSE Officer" value={mulaiKerjaPosisi} onChange={e => setMulaiKerjaPosisi(e.target.value)} className="h-10 text-base" />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Mulai Kerja *</Label>
            <Input type="date" value={mulaiKerjaDate} onChange={e => setMulaiKerjaDate(e.target.value)} className="h-10 text-base" />
            <p className="text-xs text-muted-foreground">Tanggal akan disimpan ke kandidat dan dikirim via email.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setIsMulaiKerjaOpen(false)}>Cancel</Button>
          <Button variant="outline" onClick={async () => {
            if (!mulaiKerjaPosisi) { toast.error("Isi posisi dulu"); return; }
            if (!mulaiKerjaDate) { toast.error("Isi tanggal mulai kerja dulu"); return; }
            const startDateLabel = new Date(mulaiKerjaDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
            const preview = await previewStartDateEmail({
              candidateName: "John Doe",
              jobTitle: mulaiKerjaPosisi,
              startDate: startDateLabel,
              onboardingUrl: "https://hero.chitraparatama.com/onboarding/EXAMPLE",
            });
            setEmailPreview({ subject: preview.subject, html: preview.html || null, text: preview.text });
            setIsEmailPreviewOpen(true);
          }}>
            Preview
          </Button>
          <Button onClick={handleMulaiKerja} disabled={isMulaiKerjaSending} className="min-w-[160px]">
            {isMulaiKerjaSending ? "Sending..." : `Send to ${selectedIds.size} Candidates`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Bulk Email Dialog */}
    <Dialog open={isBulkEmailOpen} onOpenChange={(open) => { if (!open) { setIsBulkEmailOpen(false); setBulkEmailResult(null); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Email to {selectedIds.size} Candidates</DialogTitle>
          <DialogDescription>Gunakan {`{name}`} untuk menyisipkan nama kandidat.</DialogDescription>
        </DialogHeader>
        {bulkEmailResult ? (
          <div className="space-y-4 py-4">
            <p className="text-sm font-medium">{bulkEmailResult.sent} terkirim, {bulkEmailResult.failed} gagal.</p>
            {bulkEmailResult.failed > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {bulkEmailResult.results.filter((r: any) => !r.success).map((r: any, i: number) => (
                  <div key={i} className="px-3 py-2 text-sm text-destructive border-b">{r.fullName}: {r.error}</div>
                ))}
              </div>
            )}
            <DialogFooter><Button onClick={() => { setBulkEmailResult(null); setIsBulkEmailOpen(false); }}>Tutup</Button></DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input placeholder="Subject email" value={bulkEmailSubject} onChange={e => setBulkEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea rows={8} placeholder="Tulis pesan... Gunakan {name} untuk nama kandidat" value={bulkEmailMessage} onChange={e => setBulkEmailMessage(e.target.value)} />
            </div>
          </div>
        )}
        {!bulkEmailResult && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEmailOpen(false)}>Batal</Button>
            <Button onClick={async () => {
              if (!bulkEmailSubject || !bulkEmailMessage) { toast.error("Isi subject dan message"); return; }
              setIsBulkEmailSending(true);
              try {
                const result = await sendBulkCustomEmail(Array.from(selectedIds), bulkEmailSubject, bulkEmailMessage);
                setBulkEmailResult(result);
                toast.success(`${result.sent} email terkirim`);
                setSelectedIds(new Set());
              } catch (e: any) { toast.error(e.message); }
              finally { setIsBulkEmailSending(false); }
            }} disabled={isBulkEmailSending}>
              {isBulkEmailSending ? "Sending..." : `Send to ${selectedIds.size} Candidates`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>

    {/* Bulk Offering Dialog */}
    <Dialog open={isBulkOfferingOpen} onOpenChange={setIsBulkOfferingOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Offering Email to {selectedIds.size} Candidates</DialogTitle>
          <DialogDescription>Isi data penawaran kerja, lalu kirim email + PDF ke kandidat.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jabatan / Level / POH *</Label>
              <Input placeholder="HSE Officer / Staff / Balikpapan" value={bulkOfferingForm.position} onChange={e => setBulkOfferingForm({...bulkOfferingForm, position: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Atasan Langsung</Label>
              <Input placeholder="Ketik nama karyawan..." value={supervisorSearch || bulkOfferingForm.directSupervisor} onChange={e => { setSupervisorSearch(e.target.value); setBulkOfferingForm({...bulkOfferingForm, directSupervisor: ""}); }} />
              {supervisorSearch && !bulkOfferingForm.directSupervisor && (
                <div className="border rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto">
                  {offeringEmployees.filter(emp => emp.name.toLowerCase().includes(supervisorSearch.toLowerCase())).slice(0, 8).length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">Tidak ada karyawan ditemukan</div>
                  ) : (
                    offeringEmployees.filter(emp => emp.name.toLowerCase().includes(supervisorSearch.toLowerCase())).slice(0, 8).map(emp => (
                      <button key={emp.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0 text-sm" onClick={() => {
                        setBulkOfferingForm({...bulkOfferingForm, directSupervisor: emp.name});
                        setSupervisorSearch("");
                      }}>
                        <span className="font-medium">{emp.name}</span>
                        <span className="text-muted-foreground ml-2">— {emp.section || emp.jobTitle}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Gaji Pokok *</Label>
              <Input placeholder="Rp. 8.000.000,-" value={bulkOfferingForm.salary} onChange={e => setBulkOfferingForm({...bulkOfferingForm, salary: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Masa Kontrak (bulan)</Label>
              <Input type="number" value={bulkOfferingForm.contractDurationMonths} onChange={e => setBulkOfferingForm({...bulkOfferingForm, contractDurationMonths: parseInt(e.target.value) || 12})} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Mulai Kerja</Label>
              <Input type="date" value={bulkOfferingForm.startDate} onChange={e => setBulkOfferingForm({...bulkOfferingForm, startDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Penandatangan</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={bulkOfferingForm.signatoryName} onChange={e => {
                const signer = MCU_SIGNERS.find(s => s.name === e.target.value) || MCU_SIGNERS[0];
                setBulkOfferingForm({...bulkOfferingForm, signatoryName: signer.name, signatoryTitle: signer.title, signatureUrl: signer.signatureUrl});
              }}>
                {MCU_SIGNERS.map(s => <option key={s.name} value={s.name}>{s.name} — {s.title}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>5. Biaya Rawat Jalan</Label>
            <Textarea rows={2} value={bulkOfferingForm.outpatientBenefit} onChange={e => setBulkOfferingForm({...bulkOfferingForm, outpatientBenefit: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>6. Biaya Rawat Inap</Label>
            <Textarea rows={2} value={bulkOfferingForm.inpatientBenefit} onChange={e => setBulkOfferingForm({...bulkOfferingForm, inpatientBenefit: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>7. Biaya Melahirkan</Label>
            <Textarea rows={2} value={bulkOfferingForm.maternityBenefit} onChange={e => setBulkOfferingForm({...bulkOfferingForm, maternityBenefit: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>8. Asuransi Kecelakaan</Label>
            <Textarea rows={2} value={bulkOfferingForm.accidentInsurance} onChange={e => setBulkOfferingForm({...bulkOfferingForm, accidentInsurance: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>9. BPJS Ketenagakerjaan</Label>
              <Input value={bulkOfferingForm.bpjsEmployment} onChange={e => setBulkOfferingForm({...bulkOfferingForm, bpjsEmployment: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>10. BPJS Kesehatan</Label>
              <Input value={bulkOfferingForm.bpjsHealth} onChange={e => setBulkOfferingForm({...bulkOfferingForm, bpjsHealth: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>11. THR</Label>
            <Textarea rows={2} value={bulkOfferingForm.thr} onChange={e => setBulkOfferingForm({...bulkOfferingForm, thr: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>12. Ketentuan-ketentuan Lain</Label>
            <Textarea rows={3} value={bulkOfferingForm.otherTerms} onChange={e => setBulkOfferingForm({...bulkOfferingForm, otherTerms: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsBulkOfferingOpen(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => setIsOfferingPreviewOpen(true)}>Preview Surat</Button>
          <Button onClick={handleBulkOffering} disabled={isBulkOfferingSending}>
            {isBulkOfferingSending ? "Sending..." : `Save & Send to ${selectedIds.size} Candidates`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Offering Letter Preview Dialog */}
    <Dialog open={isOfferingPreviewOpen} onOpenChange={setIsOfferingPreviewOpen}>
      <DialogContent className="sm:max-w-[210mm] h-[95vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-3 border-b shrink-0">
          <DialogTitle>Preview Surat Penawaran Kerja</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
          <div
            className="mx-auto w-[210mm] max-w-full bg-white bg-[length:210mm_297mm] bg-top bg-no-repeat shadow-sm"
            style={{ backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)', minHeight: '297mm' }}
          >
            <div className="relative z-10" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', lineHeight: '1.3', color: 'black', paddingTop: '45mm', paddingBottom: '15mm', paddingLeft: '22mm', paddingRight: '22mm' }}>
              <table className="mb-2 w-full"><tbody><tr><td className="w-24 align-top font-semibold">No.</td><td className="w-3 align-top">:</td><td className="align-top font-bold">{offeringLetterNo || '________'}</td></tr></tbody></table>
              <div className="mb-2"><p>Kepada Yth.</p><p className="font-bold underline">{selectedIds.size === 1 ? candidates.find(c => selectedIds.has(c.id))?.fullName || '________' : `[${selectedIds.size} Kandidat terpilih]`}</p><p>Di Tempat</p></div>
              <p className="mb-2 underline font-semibold">Perihal : Penawaran Kerja</p>
              <p className="mb-2 text-justify">Dengan hormat,</p>
              <p className="mb-2 text-justify">Bersama ini kami sampaikan penawaran kerja untuk saudara sebagai berikut :</p>
              <table className="mb-3 w-full text-[9pt]"><tbody>
                {[
                  ["Jabatan/Level/POH", bulkOfferingForm.position],
                  ["Atasan langsung", bulkOfferingForm.directSupervisor],
                  ["Gaji Pokok", bulkOfferingForm.salary],
                  ["Masa kontrak", `${bulkOfferingForm.contractDurationMonths} (dua belas) bulan`],
                  ["Biaya Rawat Jalan", bulkOfferingForm.outpatientBenefit],
                  ["Biaya Rawat Inap", bulkOfferingForm.inpatientBenefit],
                  ["Biaya Melahirkan", bulkOfferingForm.maternityBenefit],
                  ["Asuransi Kecelakaan", bulkOfferingForm.accidentInsurance],
                  ["BPJS Ketenagakerjaan", bulkOfferingForm.bpjsEmployment],
                  ["BPJS Kesehatan", bulkOfferingForm.bpjsHealth],
                  ["THR", bulkOfferingForm.thr],
                  ["Ketentuan-ketentuan lain", bulkOfferingForm.otherTerms],
                ].map(([label, val], i) => (
                  <tr key={i} className="align-top">
                    <td className="w-6 py-0.5">{i + 1}.</td>
                    <td className="w-40 py-0.5 font-semibold">{label}</td>
                    <td className="w-3 py-0.5">:</td>
                    <td className="py-0.5 text-justify">{val || '________'}</td>
                  </tr>
                ))}
              </tbody></table>
              <p className="mb-2 text-justify">Bila saudara menyepakati penawaran tersebut diatas dan juga hasil medical check-up yang memenuhi syarat maka perusahaan akan menyiapkan perjanjian kerja untuk ditandatangani kedua pihak dan mulai bekerja tanggal <span className="font-bold underline">{bulkOfferingForm.startDate ? new Date(bulkOfferingForm.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '___'}</span></p>
              <p className="mb-6 text-justify">Demikianlah surat penawaran kami, atas perhatian Saudara kami ucapkan terima kasih.</p>
              <div className="flex justify-between" style={{ marginTop: '10mm' }}>
                <div>
                  <p className="mb-1">Balikpapan, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  {bulkOfferingForm.signatureUrl ? (
                    <img src={bulkOfferingForm.signatureUrl} alt={`TTD ${bulkOfferingForm.signatoryName}`} className="h-12 object-contain mb-1" />
                  ) : (
                    <div className="h-12 mb-1" />
                  )}
                  <p className="font-bold underline text-[9pt]">{bulkOfferingForm.signatoryName}</p>
                  <p className="text-[8pt]">{bulkOfferingForm.signatoryTitle}</p>
                </div>
                <div className="text-center">
                  <p className="mb-16">Menerima/Menyetujui,</p>
                  <p className="font-bold text-[9pt]">{selectedIds.size === 1 ? candidates.find(c => selectedIds.has(c.id))?.fullName || '________' : '________'}</p>
                  <p className="font-bold text-[9pt]">Calon Karyawan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-3 border-t shrink-0">
          <Button variant="outline" onClick={() => setIsOfferingPreviewOpen(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Manual Add Dialog */}
    <Dialog open={isManualAddOpen} onOpenChange={setIsManualAddOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Kandidat Manual</DialogTitle>
          <DialogDescription>Isi data kandidat untuk ditambahkan ke pipeline.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Lowongan *</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={manualAddForm.recruitmentId}
              onChange={(e) => setManualAddForm({ ...manualAddForm, recruitmentId: e.target.value })}
            >
              <option value="">Pilih Lowongan</option>
              {recruitments.map((r) => (
                <option key={r.id} value={r.id}>{r.jobTitle}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Nama Lengkap *</Label>
            <Input
              placeholder="Nama kandidat"
              value={manualAddForm.fullName}
              onChange={(e) => setManualAddForm({ ...manualAddForm, fullName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={manualAddForm.email}
              onChange={(e) => setManualAddForm({ ...manualAddForm, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>No. Telepon</Label>
            <Input
              placeholder="08123456789"
              value={manualAddForm.phone}
              onChange={(e) => setManualAddForm({ ...manualAddForm, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Upload CV (PDF)</Label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => setManualAddCvFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsManualAddOpen(false)}>Batal</Button>
          <Button onClick={async () => {
            if (!manualAddForm.recruitmentId || !manualAddForm.fullName || !manualAddForm.email) {
              toast.error("Isi lowongan, nama, dan email");
              return;
            }
            setIsManualAddSubmitting(true);
            try {
              let cvUrl = "";
              if (manualAddCvFile) {
                const formData = new FormData();
                formData.append("file", manualAddCvFile);
                const uploadResult = await uploadFile(formData);
                if (uploadResult.success) cvUrl = uploadResult.url || "";
                else toast.warning("CV gagal diupload, data tetap disimpan.");
              }
              const created = await adminCreateCandidate({
                recruitmentId: parseInt(manualAddForm.recruitmentId),
                fullName: manualAddForm.fullName,
                email: manualAddForm.email,
                phone: manualAddForm.phone,
                cvUrl,
                source: manualAddForm.source,
              });
              setCandidates(prev => [{ ...created, jobTitle: recruitments.find(r => r.id === parseInt(manualAddForm.recruitmentId))?.jobTitle || null, location: null, rating: null, aiScore: null, aiSummary: "", aiDetails: null, rejectionReason: "", createdAt: created.createdAt } as Candidate, ...prev]);
              toast.success("Kandidat berhasil ditambahkan");
              setIsManualAddOpen(false);
              setManualAddForm({ recruitmentId: "", fullName: "", email: "", phone: "", source: "Manual" });
              setManualAddCvFile(null);
            } catch (e: any) {
              toast.error(e.message || "Gagal tambah kandidat");
            } finally {
              setIsManualAddSubmitting(false);
            }
          }} disabled={isManualAddSubmitting}>
            {isManualAddSubmitting ? "Menyimpan..." : "Tambah Kandidat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Import Data Dialog */}
    <Dialog open={isImportOpen} onOpenChange={(open) => { if (!open) setImportResults(null); setIsImportOpen(open); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Kandidat</DialogTitle>
          <DialogDescription>Upload file Excel (.xlsx) atau CSV dengan kolom: fullName, email, phone, recruitmentId.</DialogDescription>
        </DialogHeader>
        {importResults ? (
          <div className="space-y-4 py-4">
            <div className="text-sm font-medium">
              Import selesai: {importResults.filter(r => r.success).length} berhasil, {importResults.filter(r => !r.success).length} gagal dari {importResults.length} data.
            </div>
            {importResults.filter(r => !r.success).length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {importResults.filter(r => !r.success).map((r, i) => (
                  <div key={i} className="px-3 py-2 text-sm text-destructive border-b last:border-0">
                    {r.fullName} ({r.email}): {r.error}
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => { setImportResults(null); setIsImportOpen(false); }}>Tutup</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pilih Lowongan</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="import-recruitment-id"
              >
                <option value="">Pilih Lowongan</option>
                {recruitments.map((r) => (
                  <option key={r.id} value={r.id}>{r.jobTitle}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>File Excel / CSV</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                id="import-file-input"
              />
              <p className="text-xs text-muted-foreground">
                Format: fullName, email, phone (opsional). Baris pertama adalah header.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>Batal</Button>
              <Button onClick={async () => {
                const select = document.getElementById("import-recruitment-id") as HTMLSelectElement;
                const fileInput = document.getElementById("import-file-input") as HTMLInputElement;
                if (!select?.value) { toast.error("Pilih lowongan dulu"); return; }
                if (!fileInput?.files?.length) { toast.error("Pilih file dulu"); return; }

                setIsImporting(true);
                try {
                  const XLSX = await import("xlsx");
                  const file = fileInput.files[0];
                  const buffer = await file.arrayBuffer();
                  const workbook = XLSX.read(buffer, { type: "array" });
                  const sheet = workbook.Sheets[workbook.SheetNames[0]];
                  const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

                  if (jsonData.length === 0) {
                    toast.error("File kosong atau format tidak sesuai");
                    setIsImporting(false);
                    return;
                  }

                  const recruitmentId = parseInt(select.value);
                  const candidates = jsonData.map((row: any) => ({
                    recruitmentId,
                    fullName: row.fullName || row.full_name || row.nama || row.Nama || row["Nama Lengkap"] || row["Nama"] || "",
                    email: row.email || row.Email || row["Alamat Email"] || "",
                    phone: row.phone || row.Phone || row.telepon || row.Telepon || row["No Telepon"] || "",
                    source: "Import",
                  })).filter(c => c.fullName && c.email);

                  if (candidates.length === 0) {
                    toast.error("Tidak ada data valid ditemukan di file");
                    setIsImporting(false);
                    return;
                  }

                  const result = await bulkImportCandidates(candidates);
                  setImportResults(result.results);
                  toast.success(`${result.imported} kandidat diimport`);

                  // Refresh candidate list
                  const refreshed = await getCandidatesPaginated({ page: 1, pageSize: 25 });
                  setCandidates(refreshed.data as Candidate[]);
                  setCandidatePage(refreshed as any);
                } catch (e: any) {
                  toast.error(e.message || "Gagal import data");
                } finally {
                  setIsImporting(false);
                }
              }} disabled={isImporting}>
                {isImporting ? "Importing..." : "Import Data"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>

    </AdminPageShell>
  );
}
