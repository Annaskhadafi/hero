"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  IconSearch,
  IconFilter,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconLink,
  IconUsers,
  IconUserCheck,
  IconAward,
  IconFileText,
  IconDownload,
  IconPlus,
  IconSettings,
  IconCheck,
  IconX,
  IconChevronRight,
  IconDotsVertical,
  IconStethoscope,
  IconSend,
  IconTrash,
  IconBuilding,
  IconBriefcase,
  IconEye,
  IconFileCheck,
  IconAlertCircle,
  IconSchool,
  IconUser,
  IconChecklist,
  IconSquareCheck,
  IconRefresh,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { RecruitmentTabBar } from "@/components/hc/recruitment-tab-bar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  progressCandidateFromInterview,
  deleteInterviewSession,
} from "@/app/actions/interviews";
import { ScheduleInterviewModal } from "@/components/interview/schedule-interview-modal";
import { InterviewSettingsModal } from "@/components/interview/interview-settings-modal";
import { InterviewEvaluationModal } from "@/components/interview/interview-evaluation-modal";
import { InterviewPdfPreviewDialog } from "@/components/interview/interview-pdf-preview-dialog";
import { ApplicationFormPreviewDialog } from "@/components/candidate/application-form-preview-dialog";

interface WawancaraClientPageProps {
  sessions: any[];
  settings: any;
  availableInterviewers: any[];
  candidatesList: any[];
  currentUser?: { id?: string; name?: string; email?: string };
}

export function WawancaraClientPage({
  sessions,
  settings,
  availableInterviewers,
  candidatesList,
  currentUser,
}: WawancaraClientPageProps) {
  const router = useRouter();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<string>("outstanding");

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [personaFilter, setPersonaFilter] = useState<"all" | "my">("my");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedDetailSessionId, setSelectedDetailSessionId] = useState<number | null>(
    sessions.length > 0 ? sessions[0].id : null
  );

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [appFormPreviewOpen, setAppFormPreviewOpen] = useState(false);

  const [activeSessionForModal, setActiveSessionForModal] = useState<any | null>(null);
  const [activeAppFormCandidate, setActiveAppFormCandidate] = useState<any | null>(null);

  // Quick Action Pending
  const [isProcessingAction, setIsProcessingAction] = useState<number | null>(null);

  // User checking helpers
  const isUserAssignedToSession = (session: any) => {
    if (!currentUser?.email && !currentUser?.name) return false;
    const emailMatch =
      currentUser.email &&
      session.assignedEmails?.some(
        (e: string) => e?.toLowerCase() === currentUser.email?.toLowerCase()
      );
    const nameMatch =
      currentUser.name &&
      session.assignedNames?.some(
        (n: string) => n?.toLowerCase() === currentUser.name?.toLowerCase()
      );
    return Boolean(emailMatch || nameMatch);
  };

  const hasUserEvaluatedSession = (session: any) => {
    if (!currentUser?.email && !currentUser?.name) return false;
    return session.evaluations?.some(
      (ev: any) =>
        (currentUser.email && ev.panelistEmail?.toLowerCase() === currentUser.email?.toLowerCase()) ||
        (currentUser.name && ev.panelistName?.toLowerCase() === currentUser.name?.toLowerCase())
    );
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Persona filter: "my" vs "all"
      if (personaFilter === "my") {
        const assigned = isUserAssignedToSession(session);
        if (!assigned) return false;
      }

      // Stage filter
      if (stageFilter !== "all" && session.stageName !== stageFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all" && session.interviewType !== typeFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const candidateName = session.candidate?.fullName?.toLowerCase() || "";
        const jobTitle = session.candidate?.vacancyTitle?.toLowerCase() || "";
        const department = session.candidate?.departmentName?.toLowerCase() || "";
        const panelists = session.assignedNames?.join(" ").toLowerCase() || "";

        return (
          candidateName.includes(query) ||
          jobTitle.includes(query) ||
          department.includes(query) ||
          panelists.includes(query)
        );
      }

      return true;
    });
  }, [sessions, personaFilter, stageFilter, typeFilter, searchQuery, currentUser]);

  // Outstanding vs Hasil lists
  const outstandingSessions = useMemo(() => {
    return filteredSessions.filter((s) => !s.isFullyEvaluated);
  }, [filteredSessions]);

  const hasilSessions = useMemo(() => {
    return filteredSessions.filter((s) => s.evaluatedCount > 0 || s.isFullyEvaluated);
  }, [filteredSessions]);

  // Statistics
  const stats = useMemo(() => {
    const total = sessions.length;
    const outstanding = sessions.filter((s) => !s.isFullyEvaluated).length;
    const myPending = sessions.filter(
      (s) => isUserAssignedToSession(s) && !hasUserEvaluatedSession(s)
    ).length;
    const recommended = sessions.filter(
      (s) => s.consensus === "RECOMMENDED" && s.evaluatedCount > 0
    ).length;

    return { total, outstanding, myPending, recommended };
  }, [sessions, currentUser]);

  // Handlers
  const handleOpenEvaluation = (session: any) => {
    setActiveSessionForModal(session);
    setEvaluationModalOpen(true);
  };

  const handleOpenPdf = (session: any) => {
    setActiveSessionForModal(session);
    setPdfPreviewOpen(true);
  };

  const handleOpenAppForm = (candidate: any) => {
    setActiveAppFormCandidate(candidate);
    setAppFormPreviewOpen(true);
  };

  const handleQuickProgress = async (
    candidateId: number,
    target: "mcu" | "offering" | "rejected"
  ) => {
    setIsProcessingAction(candidateId);
    try {
      const res = await progressCandidateFromInterview(candidateId, target);
      if (res.success) {
        toast.success(`Kandidat berhasil dipindahkan ke tahap ${res.newStage}!`);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses tahap kandidat.");
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleDeleteSession = async (interviewId: number) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan & menghapus sesi wawancara ini?")) return;
    try {
      await deleteInterviewSession(interviewId);
      toast.success("Sesi wawancara berhasil dihapus.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus sesi wawancara.");
    }
  };

  // Selected session for Detail tab
  const activeDetailSession = useMemo(() => {
    if (!selectedDetailSessionId) return sessions[0] || null;
    return sessions.find((s) => s.id === selectedDetailSessionId) || sessions[0] || null;
  }, [sessions, selectedDetailSessionId]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/dashboard/hc/recruitment" className="hover:underline">
              Recruitment
            </Link>
            <IconChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-primary">Wawancara</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <IconUserCheck className="w-7 h-7 text-primary" />
            Wawancara
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Halaman khusus wawancara kandidat, penilaian 12 kompetensi standar F.HR.STD.010.00, konsolidasi skor panelis, cetak PDF resmi, dan keputusan seleksi.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsModalOpen(true)}
            className="h-9 gap-1.5 rounded-xl border-dashed"
          >
            <IconSettings className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Pengaturan Default</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setScheduleModalOpen(true)}
            className="h-9 gap-1.5 rounded-xl shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="w-4 h-4" />
            <span className="text-xs font-medium">Jadwalkan Wawancara</span>
          </Button>
        </div>
      </div>

      {/* Recruitment Navigation Tab Bar */}
      <RecruitmentTabBar />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-2xl border bg-card/60 shadow-xs hover:border-blue-500/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <IconUsers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Sesi Terjadwal</p>
              <p className="text-xl font-bold tracking-tight">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs hover:border-amber-500/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IconClock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Belum Selesai (Outstanding)</p>
              <p className="text-xl font-bold tracking-tight text-amber-600">{stats.outstanding}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs hover:border-indigo-500/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <IconSquareCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Tugas Saya Belum Dinilai</p>
              <p className="text-xl font-bold tracking-tight text-indigo-600">{stats.myPending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IconAward className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Rekomendasi Lolos</p>
              <p className="text-xl font-bold tracking-tight text-emerald-600">{stats.recommended}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Persona Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-2.5 rounded-2xl border backdrop-blur-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Persona Toggle */}
          <div className="inline-flex rounded-xl bg-muted/60 p-1 border">
            <button
              type="button"
              onClick={() => setPersonaFilter("my")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                personaFilter === "my"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tugas Wawancara Saya
            </button>
            <button
              type="button"
              onClick={() => setPersonaFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                personaFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua Wawancara ({sessions.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari kandidat, posisi, panelis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 pl-9 pr-3 text-xs bg-background rounded-xl border-muted"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-8.5 text-xs bg-background rounded-xl w-[140px]">
              <SelectValue placeholder="Tahap" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahap</SelectItem>
              <SelectItem value="Interview 1">Interview 1</SelectItem>
              <SelectItem value="Interview 2">Interview 2</SelectItem>
              <SelectItem value="Interview 3">Interview 3</SelectItem>
              <SelectItem value="User Interview">User Interview</SelectItem>
              <SelectItem value="HR Interview">HR Interview</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8.5 text-xs bg-background rounded-xl w-[120px]">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="Offline">Offline</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || stageFilter !== "all" || typeFilter !== "all" || personaFilter !== "my") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStageFilter("all");
                setTypeFilter("all");
                setPersonaFilter("my");
              }}
              className="h-8.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Reset Filter"
            >
              <IconRefresh className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Workspace Tabs (Outstanding, Hasil, Detail) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/40 p-1 rounded-2xl border w-fit flex gap-1">
          <TabsTrigger
            value="outstanding"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs gap-2"
          >
            <IconClock className="w-4 h-4 text-amber-500" />
            Outstanding (Sesi Berjalan)
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] rounded-full">
              {outstandingSessions.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="hasil"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs gap-2"
          >
            <IconChecklist className="w-4 h-4 text-emerald-500" />
            Tab Hasil & Keputusan
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] rounded-full">
              {hasilSessions.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="detail"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs gap-2"
          >
            <IconAward className="w-4 h-4 text-blue-500" />
            Tab Detail (Matriks Panelis)
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: OUTSTANDING SESSIONS                                               */}
        {/* ========================================================================= */}
        <TabsContent value="outstanding" className="space-y-4 mt-2">
          {outstandingSessions.length === 0 ? (
            <div className="text-center py-16 border rounded-3xl bg-card/30">
              <IconCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
              <h3 className="font-semibold text-base">Tidak ada wawancara outstanding</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {personaFilter === "my"
                  ? "Semua sesi wawancara yang ditugaskan kepada Anda sudah selesai dinilai atau tidak ada jadwal aktif."
                  : "Seluruh jadwal wawancara aktif telah selesai dinilai oleh seluruh panelis."}
              </p>
              {personaFilter === "my" && sessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPersonaFilter("all")}
                  className="mt-4 rounded-xl text-xs"
                >
                  Lihat Semua Wawancara ({sessions.length})
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {outstandingSessions.map((session) => {
                const isAssignedToMe = isUserAssignedToSession(session);
                const hasMyEvaluation = hasUserEvaluatedSession(session);

                return (
                  <Card
                    key={session.id}
                    className="rounded-2xl border bg-card hover:border-primary/30 transition-all shadow-xs overflow-hidden"
                  >
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Candidate Info & Stage */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                          {session.candidate?.fullName?.slice(0, 2).toUpperCase() || "KD"}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/hc/recruitment/candidates/${session.candidateId}`}
                              className="font-bold text-sm text-foreground hover:text-primary transition-colors hover:underline truncate"
                            >
                              {session.candidate?.fullName}
                            </Link>
                            <Badge variant="outline" className="text-[11px] font-medium bg-muted/40">
                              {session.stageName}
                            </Badge>
                            {session.interviewType === "Online" ? (
                              <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200 text-[10px]">
                                Online
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200 text-[10px]">
                                Offline
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <IconBriefcase className="w-3.5 h-3.5" />
                              {session.candidate?.vacancyTitle}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <IconBuilding className="w-3.5 h-3.5" />
                              {session.candidate?.departmentName}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <IconSchool className="w-3.5 h-3.5" />
                              {session.candidate?.educationStr}
                            </span>
                          </div>

                          {/* Scores from Online Tests & Application Form Preview */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {session.candidate?.apmScore !== null && session.candidate?.apmScore !== undefined && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-semibold">
                                APM: {session.candidate?.apmScore}
                              </span>
                            )}
                            {session.candidate?.amrScore !== null && session.candidate?.amrScore !== undefined && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                                AMR: {session.candidate?.amrScore}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenAppForm(session.candidate)}
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              <IconFileText className="w-3.5 h-3.5" />
                              Lihat Application Form
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Schedule, Location & Panelists */}
                      <div className="flex flex-col gap-2 min-w-[240px] border-t md:border-t-0 md:border-l md:pl-4 pt-3 md:pt-0">
                        <div className="flex items-center gap-2 text-xs">
                          <IconCalendar className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-semibold text-foreground">
                            {format(new Date(session.scheduledAt), "EEEE, dd MMM yyyy", { locale: localeId })}
                          </span>
                          <span className="text-muted-foreground">
                            ({format(new Date(session.scheduledAt), "HH:mm")} WITA)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                          {session.interviewType === "Online" ? (
                            <>
                              <IconLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              {session.locationOrLink.startsWith("http") ? (
                                <a
                                  href={session.locationOrLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 hover:underline truncate"
                                >
                                  {session.locationOrLink}
                                </a>
                              ) : (
                                <span className="truncate">{session.locationOrLink}</span>
                              )}
                            </>
                          ) : (
                            <>
                              <IconMapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">{session.locationOrLink}</span>
                            </>
                          )}
                        </div>

                        {/* Panelist progress pills */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground font-medium">Progress Evaluasi Panelis:</span>
                            <span className="font-bold text-foreground">
                              {session.evaluatedCount} / {session.totalPanelistsExpected} Selesai
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {session.assignedNames.map((name: string, idx: number) => {
                              const hasEvaluated = session.evaluations.some(
                                (ev: any) => ev.panelistName?.toLowerCase() === name?.toLowerCase()
                              );
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                    hasEvaluated
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40"
                                      : "bg-muted/50 text-muted-foreground border-border"
                                  }`}
                                >
                                  {hasEvaluated ? (
                                    <IconCheck className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <IconClock className="w-3 h-3 text-amber-500" />
                                  )}
                                  {name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l md:pl-4 pt-3 md:pt-0 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleOpenEvaluation(session)}
                          className={`rounded-xl h-9 text-xs font-semibold gap-1.5 shadow-xs ${
                            hasMyEvaluation
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-primary hover:bg-primary/90 text-primary-foreground"
                          }`}
                        >
                          <IconAward className="w-4 h-4" />
                          {hasMyEvaluation ? "Ubah Nilai Saya" : "Beri Nilai (12 Aspek)"}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                              <IconDotsVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleOpenPdf(session)}>
                              <IconFileText className="w-4 h-4 mr-2" />
                              Preview PDF Hasil
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/hc/recruitment/candidates/${session.candidateId}`}>
                                <IconEye className="w-4 h-4 mr-2" />
                                Profil Kandidat
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteSession(session.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <IconTrash className="w-4 h-4 mr-2" />
                              Batalkan Sesi
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: TAB HASIL & KEPUTUSAN                                              */}
        {/* ========================================================================= */}
        <TabsContent value="hasil" className="space-y-4 mt-2">
          {hasilSessions.length === 0 ? (
            <div className="text-center py-16 border rounded-3xl bg-card/30">
              <IconAward className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="font-semibold text-base">Belum ada evaluasi wawancara</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Setelah panelis mengisi formulir penilaian 12 kompetensi, rekapitulasi nilai dan rekomendasi konsensus akan tampil di sini.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Kandidat & Posisi</th>
                      <th className="py-3 px-4 font-semibold">Panelis & Waktu</th>
                      <th className="py-3 px-3 font-semibold text-center">Personal (1-5)</th>
                      <th className="py-3 px-3 font-semibold text-center">Profesional (1-5)</th>
                      <th className="py-3 px-3 font-semibold text-center">Manajerial (1-5)</th>
                      <th className="py-3 px-3 font-semibold text-center">Rata-rata Skor</th>
                      <th className="py-3 px-4 font-semibold text-center">Rekomendasi</th>
                      <th className="py-3 px-4 font-semibold text-center">Status Tahap</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi & Keputusan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {hasilSessions.map((session) => {
                      const isRecommended = session.consensus === "RECOMMENDED";
                      const candidateStage = session.candidate?.currentStage || "Interview";

                      return (
                        <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                          {/* Candidate & Job */}
                          <td className="py-3.5 px-4 font-medium">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                                {session.candidate?.fullName?.slice(0, 2).toUpperCase() || "KD"}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/dashboard/hc/recruitment/candidates/${session.candidateId}`}
                                  className="font-bold text-foreground hover:text-primary transition-colors hover:underline truncate block"
                                >
                                  {session.candidate?.fullName}
                                </Link>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {session.candidate?.vacancyTitle}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Panelists & Date */}
                          <td className="py-3.5 px-4 text-muted-foreground">
                            <div className="space-y-0.5">
                              <p className="font-medium text-foreground">
                                {format(new Date(session.scheduledAt), "dd MMM yyyy")}
                              </p>
                              <p className="text-[11px]">
                                {session.evaluatedCount} / {session.totalPanelistsExpected} Panelis Menilai
                              </p>
                            </div>
                          </td>

                          {/* Personal Average */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-bold text-foreground">
                              {session.personalQualitiesAvg !== null ? session.personalQualitiesAvg : "-"}
                            </span>
                          </td>

                          {/* Professional Average */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-bold text-foreground">
                              {session.professionalSkillAvg !== null ? session.professionalSkillAvg : "-"}
                            </span>
                          </td>

                          {/* Managerial Average */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-bold text-foreground">
                              {session.managerialLeadershipAvg !== null ? session.managerialLeadershipAvg : "-"}
                            </span>
                          </td>

                          {/* Overall Average */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-extrabold text-xs">
                              {session.averageScore !== null ? session.averageScore : "-"}
                            </div>
                          </td>

                          {/* Recommendation */}
                          <td className="py-3.5 px-4 text-center">
                            {session.evaluatedCount === 0 ? (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Belum Ada Nilai
                              </Badge>
                            ) : isRecommended ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-bold text-[10px]">
                                RECOMMENDED
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 font-bold text-[10px]">
                                NOT RECOMMENDED
                              </Badge>
                            )}
                          </td>

                          {/* Current Stage */}
                          <td className="py-3.5 px-4 text-center">
                            <Badge variant="secondary" className="text-[10px] font-medium">
                              {candidateStage}
                            </Badge>
                          </td>

                          {/* Action & Decisions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* PDF Preview Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenPdf(session)}
                                className="h-8 px-2.5 rounded-xl text-xs gap-1 border-primary/20 hover:border-primary/50 text-primary"
                                title="Download PDF F.HR.STD.010.00"
                              >
                                <IconFileText className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </Button>

                              {/* Quick Decision Action Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    disabled={isProcessingAction === session.candidateId}
                                    className="h-8 px-2.5 rounded-xl text-xs gap-1 bg-foreground text-background hover:bg-foreground/90 font-medium"
                                  >
                                    <span>Keputusan</span>
                                    <IconDotsVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() => handleQuickProgress(session.candidateId, "mcu")}
                                    className="text-emerald-600 focus:text-emerald-700"
                                  >
                                    <IconStethoscope className="w-4 h-4 mr-2" />
                                    Loloskan ke MCU
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleQuickProgress(session.candidateId, "offering")}
                                    className="text-blue-600 focus:text-blue-700"
                                  >
                                    <IconAward className="w-4 h-4 mr-2" />
                                    Lanjut ke Offering
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleQuickProgress(session.candidateId, "rejected")}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <IconX className="w-4 h-4 mr-2" />
                                    Tolak (Reject)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: TAB DETAIL (MATRIKS KOMPARASI ANTAR PANELIS)                       */}
        {/* ========================================================================= */}
        <TabsContent value="detail" className="space-y-4 mt-2">
          {sessions.length === 0 ? (
            <div className="text-center py-16 border rounded-3xl bg-card/30">
              <IconAward className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="font-semibold text-base">Tidak ada sesi wawancara</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Left Pane: Candidate Session Selector */}
              <div className="lg:col-span-1 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Pilih Kandidat / Sesi:
                </p>
                <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                  {sessions.map((s) => {
                    const isSelected = s.id === (activeDetailSession?.id || 0);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedDetailSessionId(s.id)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground shadow-xs font-semibold"
                            : "bg-card border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground truncate">{s.candidate?.fullName}</p>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {s.stageName}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {s.candidate?.vacancyTitle}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-[10px]">
                          <span>{s.evaluatedCount} / {s.totalPanelistsExpected} Dinilai</span>
                          {s.averageScore !== null && (
                            <span className="font-bold text-primary">Skor: {s.averageScore}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Pane: Detailed Scorecard & Panelist Matrix */}
              <div className="lg:col-span-3 space-y-4">
                {activeDetailSession ? (
                  <>
                    {/* Header Banner */}
                    <Card className="rounded-2xl border bg-card/80 p-5 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-extrabold flex items-center justify-center text-base shrink-0 shadow-sm">
                            {activeDetailSession.candidate?.fullName?.slice(0, 2).toUpperCase() || "KD"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-bold text-foreground">
                                {activeDetailSession.candidate?.fullName}
                              </h2>
                              <Badge variant="outline" className="text-[10px]">
                                {activeDetailSession.stageName}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {activeDetailSession.candidate?.vacancyTitle} · {activeDetailSession.candidate?.departmentName}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              {activeDetailSession.candidate?.apmScore !== null && (
                                <Badge className="bg-purple-500/10 text-purple-700 text-[10px]">
                                  APM: {activeDetailSession.candidate?.apmScore}
                                </Badge>
                              )}
                              {activeDetailSession.candidate?.amrScore !== null && (
                                <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px]">
                                  AMR: {activeDetailSession.candidate?.amrScore}
                                </Badge>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenAppForm(activeDetailSession.candidate)}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                              >
                                <IconFileText className="w-3.5 h-3.5" />
                                Lihat Formulir Lamaran
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Top Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEvaluation(activeDetailSession)}
                            className="rounded-xl text-xs gap-1.5"
                          >
                            <IconAward className="w-3.5 h-3.5 text-primary" />
                            Input / Edit Nilai
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenPdf(activeDetailSession)}
                            className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs"
                          >
                            <IconDownload className="w-3.5 h-3.5" />
                            Cetak PDF F.HR.STD.010.00
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Matrix Comparison Table */}
                    {activeDetailSession.evaluations.length === 0 ? (
                      <div className="text-center py-12 border rounded-2xl bg-card/40">
                        <IconAward className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-xs text-muted-foreground">
                          Belum ada panelis yang memasukkan penilaian untuk sesi ini.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleOpenEvaluation(activeDetailSession)}
                          className="mt-3 rounded-xl text-xs gap-1.5"
                        >
                          <IconAward className="w-3.5 h-3.5" />
                          Mulai Penilaian Panelis Pertama
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
                          <div className="p-3 bg-muted/40 border-b flex items-center justify-between">
                            <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                              Matriks Evaluasi 12 Dimensi Kompetensi
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {activeDetailSession.evaluations.length} Panelis Telah Mengisi
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-muted/20 border-b text-[11px] font-semibold text-muted-foreground">
                                <tr>
                                  <th className="py-2.5 px-4 w-1/3">Aspek Penilaian (F.HR.STD.010.00)</th>
                                  {activeDetailSession.evaluations.map((ev: any, idx: number) => (
                                    <th key={idx} className="py-2.5 px-3 border-l text-center">
                                      <p className="font-bold text-foreground">{ev.panelistName}</p>
                                      <p className="text-[10px] text-muted-foreground font-normal">{ev.panelistRole || "Panelis"}</p>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {/* CATEGORY 1 */}
                                <tr className="bg-primary/5 font-bold text-primary text-[11px]">
                                  <td colSpan={activeDetailSession.evaluations.length + 1} className="py-2 px-4">
                                    I. PERSONAL QUALITIES (KUALITAS PRIBADI)
                                  </td>
                                </tr>
                                {[
                                  { label: "1. Daya Tangkap", key: "dayaTangkapScore", noteKey: "dayaTangkapComment" },
                                  { label: "2. Pemecahan Masalah", key: "problemSolvingScore", noteKey: "problemSolvingComment" },
                                  { label: "3. Motivational Fit", key: "motivationalFitScore", noteKey: "motivationalFitComment" },
                                  { label: "4. Adaptabilitas & Ketahanan", key: "adaptabilityScore", noteKey: "adaptabilityComment" },
                                  { label: "5. Kemampuan Hubungan Antar Pribadi", key: "interpersonalSkillsScore", noteKey: "interpersonalSkillsComment" },
                                  { label: "6. Keterampilan Komunikasi", key: "communicationSkillScore", noteKey: "communicationSkillComment" },
                                ].map((item, idx) => (
                                  <tr key={idx} className="hover:bg-muted/20">
                                    <td className="py-2.5 px-4 font-medium text-foreground">{item.label}</td>
                                    {activeDetailSession.evaluations.map((ev: any, pIdx: number) => (
                                      <td key={pIdx} className="py-2.5 px-3 border-l text-center">
                                        <span className="font-bold text-foreground text-sm">{ev[item.key] || "-"}</span>
                                        {ev[item.noteKey] && (
                                          <p className="text-[10px] text-muted-foreground italic text-left mt-0.5 bg-muted/40 p-1 rounded">
                                            "{ev[item.noteKey]}"
                                          </p>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}

                                {/* CATEGORY 2 */}
                                <tr className="bg-primary/5 font-bold text-primary text-[11px]">
                                  <td colSpan={activeDetailSession.evaluations.length + 1} className="py-2 px-4">
                                    II. PROFESSIONAL SKILL (KETERAMPILAN PROFESIONAL)
                                  </td>
                                </tr>
                                {[
                                  { label: "7. Pemahaman Mendasar", key: "fundamentalUnderstandingScore", noteKey: "fundamentalUnderstandingComment" },
                                  { label: "8. Pengalaman Terkait", key: "experienceRelatedScore", noteKey: "experienceRelatedComment" },
                                  { label: "9. Keterampilan Teknis", key: "technicalSkillScore", noteKey: "technicalSkillComment" },
                                ].map((item, idx) => (
                                  <tr key={idx} className="hover:bg-muted/20">
                                    <td className="py-2.5 px-4 font-medium text-foreground">{item.label}</td>
                                    {activeDetailSession.evaluations.map((ev: any, pIdx: number) => (
                                      <td key={pIdx} className="py-2.5 px-3 border-l text-center">
                                        <span className="font-bold text-foreground text-sm">{ev[item.key] || "-"}</span>
                                        {ev[item.noteKey] && (
                                          <p className="text-[10px] text-muted-foreground italic text-left mt-0.5 bg-muted/40 p-1 rounded">
                                            "{ev[item.noteKey]}"
                                          </p>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}

                                {/* CATEGORY 3 */}
                                <tr className="bg-primary/5 font-bold text-primary text-[11px]">
                                  <td colSpan={activeDetailSession.evaluations.length + 1} className="py-2 px-4">
                                    III. MANAGERIAL & LEADERSHIP
                                  </td>
                                </tr>
                                {[
                                  { label: "10. Kemampuan Manajerial", key: "managerialSkillsScore", noteKey: "managerialSkillsComment" },
                                  { label: "11. Kepemimpinan", key: "leadershipScore", noteKey: "leadershipComment" },
                                  { label: "12. Kerjasama Tim", key: "teamWorkScore", noteKey: "teamWorkComment" },
                                ].map((item, idx) => (
                                  <tr key={idx} className="hover:bg-muted/20">
                                    <td className="py-2.5 px-4 font-medium text-foreground">{item.label}</td>
                                    {activeDetailSession.evaluations.map((ev: any, pIdx: number) => (
                                      <td key={pIdx} className="py-2.5 px-3 border-l text-center">
                                        <span className="font-bold text-foreground text-sm">{ev[item.key] || "-"}</span>
                                        {ev[item.noteKey] && (
                                          <p className="text-[10px] text-muted-foreground italic text-left mt-0.5 bg-muted/40 p-1 rounded">
                                            "{ev[item.noteKey]}"
                                          </p>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}

                                {/* FINAL RECOMMENDATIONS */}
                                <tr className="bg-muted/50 font-bold text-foreground">
                                  <td className="py-3 px-4">REKOMENDASI AKHIR & CATATAN</td>
                                  {activeDetailSession.evaluations.map((ev: any, pIdx: number) => (
                                    <td key={pIdx} className="py-3 px-3 border-l text-center space-y-1">
                                      <Badge
                                        className={
                                          ev.overallRecommendation === "RECOMMENDED"
                                            ? "bg-emerald-500/20 text-emerald-700 border-emerald-300 font-bold text-[10px]"
                                            : "bg-rose-500/20 text-rose-700 border-rose-300 font-bold text-[10px]"
                                        }
                                      >
                                        {ev.overallRecommendation}
                                      </Badge>
                                      {ev.jobMatchComment && (
                                        <p className="text-[10px] text-muted-foreground text-left mt-1">
                                          <strong>Catatan:</strong> {ev.jobMatchComment}
                                        </p>
                                      )}
                                      {ev.recommendationOtherPosition && (
                                        <p className="text-[10px] text-amber-600 text-left">
                                          <strong>Posisi Lain:</strong> {ev.recommendationOtherPosition}
                                        </p>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Bottom Quick Decision Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border bg-muted/20">
                          <div>
                            <span className="text-xs text-muted-foreground">Konsensus Panelis: </span>
                            <Badge
                              className={`ml-1 text-xs font-bold ${
                                activeDetailSession.consensus === "RECOMMENDED"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-rose-600 text-white"
                              }`}
                            >
                              {activeDetailSession.consensus} (Rata-rata: {activeDetailSession.averageScore || "-"})
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleQuickProgress(activeDetailSession.candidateId, "mcu")}
                              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            >
                              <IconStethoscope className="w-3.5 h-3.5 mr-1" />
                              Loloskan ke MCU
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleQuickProgress(activeDetailSession.candidateId, "offering")}
                              className="rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                            >
                              <IconAward className="w-3.5 h-3.5 mr-1" />
                              Lanjut ke Offering
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleQuickProgress(activeDetailSession.candidateId, "rejected")}
                              className="rounded-xl text-xs shadow-xs"
                            >
                              <IconX className="w-3.5 h-3.5 mr-1" />
                              Tolak (Reject)
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Pilih kandidat di sebelah kiri untuk melihat detail.</p>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Global Modals */}
      <ScheduleInterviewModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        candidateList={candidatesList}
        onSuccess={() => {
          router.refresh();
        }}
      />

      <InterviewSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
      />

      {activeSessionForModal && (
        <>
          <InterviewEvaluationModal
            open={evaluationModalOpen}
            onOpenChange={setEvaluationModalOpen}
            session={activeSessionForModal}
            currentUser={currentUser}
            onSuccess={() => {
              router.refresh();
            }}
          />

          <InterviewPdfPreviewDialog
            open={pdfPreviewOpen}
            onOpenChange={setPdfPreviewOpen}
            session={activeSessionForModal}
          />
        </>
      )}

      {activeAppFormCandidate && (
        <ApplicationFormPreviewDialog
          open={appFormPreviewOpen}
          onOpenChange={setAppFormPreviewOpen}
          candidateId={activeAppFormCandidate.id}
          candidateName={activeAppFormCandidate.fullName}
        />
      )}
    </div>
  );
}
