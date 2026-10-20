"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  addTestQuestion,
  assignTestToCandidate,
  deleteTestEntry,
  bulkDeleteTestEntries,
  bulkUpdateTestEntriesStatus,
  deleteTestQuestion,
  gradeTestAnswer,
  importTestQuestions,
  updateTestEntry,
  updateTestQuestion,
  resendTestAssignmentEmail,
} from "@/app/actions/recruitment-tests";
import { uploadFile, uploadImageFromUrl } from "@/app/actions/upload";
import { toast } from "sonner";
import {
  IconDownload,
  IconEye,
  IconPencil,
  IconPlus,
  IconTrash,
  IconPhotoUp,
  IconX,
  IconLink,
  IconArrowLeft,
  IconMailForward,
  IconDotsVertical,
  IconFileTypePdf,
  IconFileSpreadsheet,
  IconArrowsSort,
  IconChevronUp,
  IconChevronDown,
  IconSearch,
  IconFilter,
  IconCalendar,
  IconRefresh,
  IconCheck,
  IconChecklist,
  IconLoader2,
  IconUserCheck,
} from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApplicationFormPreviewDialog } from "@/components/candidate/application-form-preview-dialog";
import { ScheduleInterviewModal } from "@/components/interview/schedule-interview-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isBefore, isAfter, startOfDay, endOfDay, subDays } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { type DateRange } from "react-day-picker";
import { ScrollArea } from "@/components/ui/scroll-area";

function ValueDisplay({ value }: { value: any }) {
  if (value === null || value === undefined) return <span>-</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return <span>{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span>-</span>;
    if (value.every((v) => typeof v === "string" || typeof v === "number")) return <span>{value.join(", ")}</span>;
    return (
      <div className="space-y-2">
        {value.map((item, idx) => (
          <div key={idx} className="rounded border border-border/50 bg-muted/20 px-2 py-1">
            {typeof item === "object" && item !== null ? (
              <div className="space-y-0.5">
                {Object.entries(item || {}).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 text-xs">
                    <span className="min-w-[100px] shrink-0 text-muted-foreground">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                    <ValueDisplay value={v} />
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs">{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="space-y-0.5">
        {Object.entries(value || {}).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2 text-xs">
            <span className="min-w-[100px] shrink-0 text-muted-foreground">{k.replace(/([A-Z])/g, " $1").trim()}</span>
            <ValueDisplay value={v} />
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

function AnswerDisplay({ text }: { text?: string }) {
  if (!text) return <p className="mt-1 text-muted-foreground">Belum dijawab</p>;

  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) parsed = null;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return <p className="mt-1 whitespace-pre-wrap">{text}</p>;
  }

  if (Array.isArray(parsed)) {
    return <ValueDisplay value={parsed} />;
  }

  return (
    <div className="mt-1 space-y-1 text-sm">
      {Object.entries(parsed || {}).map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 border-b border-border/40 py-1 last:border-0">
          <span className="min-w-[140px] shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">{key.replace(/([A-Z])/g, " $1").trim()}</span>
          <div className="font-medium flex-1"><ValueDisplay value={value} /></div>
        </div>
      ))}
    </div>
  );
}

export function RecruitmentTestDetailsClientPage({ initialTest, initialQuestions, initialEntries = [], initialCandidates = [] }: { initialTest: any, initialQuestions: any[], initialEntries?: any[], initialCandidates?: any[] }) {
  const [test, setTest] = useState(initialTest);
  const [questions, setQuestions] = useState(initialQuestions);
  const [entries, setEntries] = useState(initialEntries);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [entryEditForm, setEntryEditForm] = useState({ status: "Pending", score: "" });
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [assignTime, setAssignTime] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [bulkQuestionText, setBulkQuestionText] = useState("");
  const [previewPdfEntry, setPreviewPdfEntry] = useState<any | null>(null);

  // Multi-select & Batch Actions State
  const [selectedEntryIds, setSelectedEntryIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false);
  const [isBulkResendingEmail, setIsBulkResendingEmail] = useState(false);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [scheduleInterviewCandidate, setScheduleInterviewCandidate] = useState<{ id: number; name: string; jobTitle?: string } | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dateField, setDateField] = useState<"createdAt" | "completedAt" | "scheduledAt">("createdAt");

  // Sorting State
  const [sortKey, setSortKey] = useState<string | null>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Computed Filtered Entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry: any) => {
      // 1. Search query (matches candidate fullName, email, phone, accessKey)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (entry.candidate?.fullName || "").toLowerCase();
        const email = (entry.candidate?.email || "").toLowerCase();
        const phone = (entry.candidate?.phone || "").toLowerCase();
        const key = (entry.accessKey || "").toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !key.includes(q)) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== "ALL") {
        if (entry.status !== statusFilter) return false;
      }

      // 3. Result filter
      if (resultFilter !== "ALL") {
        const ansList = entry.answers || [];
        const correctCount = ansList.filter((a: any) => a.isCorrect === true).length;
        const ansPct = ansList.length > 0 ? Math.round((correctCount / ansList.length) * 100) : null;
        const allManual = ansList.length > 0 && ansList.every((a: any) => a.isCorrect === null || a.isCorrect === undefined);
        const isDone = entry.status === "Completed" || entry.status === "Graded";

        if (test.isApplicationForm || allManual) {
          if (resultFilter === "FILLED" && (!isDone || !ansList.length)) return false;
          if (resultFilter === "UNFILLED" && isDone && ansList.length > 0) return false;
        } else {
          if (resultFilter === "PASSED") {
            if (!isDone || ansPct === null || ansPct < (test.passingScore || 0)) return false;
          } else if (resultFilter === "FAILED") {
            if (!isDone || ansPct === null || ansPct >= (test.passingScore || 0)) return false;
          } else if (resultFilter === "UNGRADED") {
            if (isDone && ansPct !== null) return false;
          }
        }
      }

      // 4. Date range filter
      if (dateRange?.from || dateRange?.to) {
        const val = entry[dateField];
        if (!val) return false;
        const d = new Date(val);
        if (dateRange.from && isBefore(d, startOfDay(dateRange.from))) return false;
        if (dateRange.to && isAfter(d, endOfDay(dateRange.to))) return false;
      }

      return true;
    });
  }, [entries, searchQuery, statusFilter, resultFilter, dateRange, dateField, test]);

  // Computed Sorted Entries
  const sortedEntries = useMemo(() => {
    if (!sortKey) return filteredEntries;

    return [...filteredEntries].sort((a: any, b: any) => {
      let valA: any = null;
      let valB: any = null;

      switch (sortKey) {
        case "no":
          valA = a.id;
          valB = b.id;
          break;
        case "candidate":
          valA = (a.candidate?.fullName || "").toLowerCase();
          valB = (b.candidate?.fullName || "").toLowerCase();
          break;
        case "email":
          valA = (a.candidate?.email || "").toLowerCase();
          valB = (b.candidate?.email || "").toLowerCase();
          break;
        case "createdAt":
          valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case "status":
          valA = (a.status || "").toLowerCase();
          valB = (b.status || "").toLowerCase();
          break;
        case "score": {
          const aAns = a.answers || [];
          const bAns = b.answers || [];
          const aCorrect = aAns.filter((ans: any) => ans.isCorrect === true).length;
          const bCorrect = bAns.filter((ans: any) => ans.isCorrect === true).length;
          valA = aAns.length ? Math.round((aCorrect / aAns.length) * 100) : (a.score ?? -1);
          valB = bAns.length ? Math.round((bCorrect / bAns.length) * 100) : (b.score ?? -1);
          break;
        }
        case "schedule":
          valA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          valB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          break;
        case "answers":
          valA = a.answers?.length || 0;
          valB = b.answers?.length || 0;
          break;
        case "completedAt":
          valA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          valB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredEntries, sortKey, sortOrder]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const isAllSelected = sortedEntries.length > 0 && sortedEntries.every((e: any) => selectedEntryIds.includes(e.id));
  const isPartiallySelected = selectedEntryIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEntryIds([]);
    } else {
      setSelectedEntryIds(sortedEntries.map((e: any) => e.id));
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedEntryIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      await bulkDeleteTestEntries(selectedEntryIds);
      setEntries((prev: any[]) => prev.filter((e) => !selectedEntryIds.includes(e.id)));
      toast.success(`${selectedEntryIds.length} entries berhasil dihapus`);
      setSelectedEntryIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus entries");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (selectedEntryIds.length === 0) return;
    try {
      setIsBulkUpdatingStatus(true);
      await bulkUpdateTestEntriesStatus(selectedEntryIds, newStatus);
      setEntries((prev: any[]) =>
        prev.map((e) => (selectedEntryIds.includes(e.id) ? { ...e, status: newStatus } : e))
      );
      toast.success(`Status ${selectedEntryIds.length} entries berhasil diubah menjadi ${newStatus}`);
      setSelectedEntryIds([]);
    } catch (e: any) {
      toast.error(e.message || "Gagal mengubah status entries");
    } finally {
      setIsBulkUpdatingStatus(false);
    }
  };

  const handleBulkResendEmail = async () => {
    if (selectedEntryIds.length === 0) return;
    try {
      setIsBulkResendingEmail(true);
      let successCount = 0;
      let failCount = 0;
      for (const id of selectedEntryIds) {
        try {
          const res = await resendTestAssignmentEmail(id);
          if (res.success) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }
      if (successCount > 0) {
        toast.success(`${successCount} email undangan berhasil dikirim ulang`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} email gagal terkirim`);
      }
      setSelectedEntryIds([]);
    } catch (e: any) {
      toast.error(e.message || "Gagal memproses pengiriman email");
    } finally {
      setIsBulkResendingEmail(false);
    }
  };

  const handleBulkExportExcel = () => {
    const selected = entries.filter((e: any) => selectedEntryIds.includes(e.id));
    if (selected.length === 0) return;
    exportEntries(selected, `hasil-terpilih-${test.title}-${selected.length}-kandidat`);
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setResultFilter("ALL");
    setDateRange(undefined);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusFilter !== "ALL" ||
    resultFilter !== "ALL" ||
    dateRange?.from
  );

  const activeFiltersCount = [
    Boolean(searchQuery.trim()),
    statusFilter !== "ALL",
    resultFilter !== "ALL",
    Boolean(dateRange?.from),
  ].filter(Boolean).length;

  const totalCount = entries.length;
  const completedCount = entries.filter((e: any) => e.status === "Completed" || e.status === "Graded").length;
  const inProgressCount = entries.filter((e: any) => e.status === "In Progress").length;
  const pendingCount = entries.filter((e: any) => e.status === "Pending").length;
  const expiredCount = entries.filter((e: any) => e.status === "Expired").length;
  
  const defaultQuestionForm = () => ({
    questionType: "multiple_choice",
    questionText: "",
    imageUrl: "",
    correctAnswer: "A",
    points: 10,
    sortOrder: questions.length + 1,
    options: [
      { id: "A", text: "", imageUrl: "", readableImageUrl: "" },
      { id: "B", text: "", imageUrl: "", readableImageUrl: "" },
      { id: "C", text: "", imageUrl: "", readableImageUrl: "" },
      { id: "D", text: "", imageUrl: "", readableImageUrl: "" },
    ],
    readableImageUrl: "",
  });
  const [formData, setFormData] = useState(defaultQuestionForm());
  const [previewQuestionId, setPreviewQuestionId] = useState<number | null>(null);
  const previewQ = previewQuestionId ? questions.find((q: any) => q.id === previewQuestionId) : null;


  const getDefaultOptionsForType = (type: string) => {
    if (type === "true_false") return [{ id: "A", text: "Benar", imageUrl: "", readableImageUrl: "" }, { id: "B", text: "Salah", imageUrl: "", readableImageUrl: "" }];
    if (normalizeQuestionType(type) === "checkbox") return [{ id: "A", text: "Pilihan A", imageUrl: "", readableImageUrl: "" }, { id: "B", text: "Pilihan B", imageUrl: "", readableImageUrl: "" }, { id: "C", text: "Pilihan C", imageUrl: "", readableImageUrl: "" }];
    if (type === "dropdown") return [{ id: "A", text: "Opsi 1", imageUrl: "", readableImageUrl: "" }, { id: "B", text: "Opsi 2", imageUrl: "", readableImageUrl: "" }];
    if (type === "rating") return [{ id: "1", text: "1", imageUrl: "", readableImageUrl: "" }, { id: "2", text: "2", imageUrl: "", readableImageUrl: "" }, { id: "3", text: "3", imageUrl: "", readableImageUrl: "" }, { id: "4", text: "4", imageUrl: "", readableImageUrl: "" }, { id: "5", text: "5", imageUrl: "", readableImageUrl: "" }];
    if (type === "matching") return [{ id: "A", text: "Istilah A = Jawaban A", imageUrl: "", readableImageUrl: "" }, { id: "B", text: "Istilah B = Jawaban B", imageUrl: "", readableImageUrl: "" }];
    if (type === "ordering") return [{ id: "1", text: "Langkah pertama", imageUrl: "", readableImageUrl: "" }, { id: "2", text: "Langkah kedua", imageUrl: "", readableImageUrl: "" }, { id: "3", text: "Langkah ketiga", imageUrl: "", readableImageUrl: "" }];
    if (type === "psychometric_scale") return [{ id: "1", text: "Sangat Tidak Setuju", imageUrl: "", readableImageUrl: "" }, { id: "2", text: "Tidak Setuju", imageUrl: "", readableImageUrl: "" }, { id: "3", text: "Netral", imageUrl: "", readableImageUrl: "" }, { id: "4", text: "Setuju", imageUrl: "", readableImageUrl: "" }, { id: "5", text: "Sangat Setuju", imageUrl: "", readableImageUrl: "" }];
    if (type === "personality") return [{ id: "A", text: "Sangat sesuai dengan saya", imageUrl: "", readableImageUrl: "" }, { id: "B", text: "Cukup sesuai", imageUrl: "", readableImageUrl: "" }, { id: "C", text: "Kurang sesuai", imageUrl: "", readableImageUrl: "" }, { id: "D", text: "Tidak sesuai", imageUrl: "", readableImageUrl: "" }];
    if (type === "interest_aptitude") return [{ id: "A", text: "Administrasi", imageUrl: "", readableImageUrl: "" }, { id: "B", text: "Pelayanan lapangan", imageUrl: "", readableImageUrl: "" }, { id: "C", text: "Analitis", imageUrl: "", readableImageUrl: "" }, { id: "D", text: "Komunikasi", imageUrl: "", readableImageUrl: "" }];
    if (type === "situational_judgement") return [{ id: "A", text: "Mengikuti SOP dan eskalasi ke atasan", imageUrl: "", readableImageUrl: "" }, { id: "B", text: "Mengambil keputusan sendiri", imageUrl: "", readableImageUrl: "" }, { id: "C", text: "Menunda sampai instruksi berikutnya", imageUrl: "", readableImageUrl: "" }];
    return formData.options;
  };
  const handleQuestionTypeChange = (type: string) => {
    const nextOptions = getDefaultOptionsForType(type);
    setFormData((prev) => ({ ...prev, questionType: type, options: nextOptions, correctAnswer: nextOptions[0]?.id || prev.correctAnswer }));
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setFormData({ ...defaultQuestionForm(), sortOrder: questions.length + 1 });
  };

  const openCreateQuestion = () => {
    resetQuestionForm();
    setIsCreateOpen(true);
  };

  const openEditQuestion = (question: any) => {
    const options = Array.isArray(question.options) && question.options.length ? question.options : getDefaultOptionsForType(question.questionType);
    setEditingQuestion(question);
    setFormData({
      questionType: question.questionType || "multiple_choice",
      questionText: question.questionText || "",
      imageUrl: question.imageUrl || "",
      correctAnswer: question.correctAnswer != null ? question.correctAnswer : (options[0]?.id || "A"),
      points: question.points || 10,
      sortOrder: question.sortOrder || questions.findIndex((item: any) => item.id === question.id) + 1,
      options: options.map((option: any, index: number) => ({ id: option.id || String.fromCharCode(65 + index), text: option.text || "", imageUrl: option.imageUrl || "", readableImageUrl: option.readableImageUrl || "" })),
      readableImageUrl: question.readableImageUrl || "",
    });
    setIsCreateOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'question' | number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await uploadFile(data);
      if (res.success && res.url) {
        const readableUrl = res.readableUrl || res.url;
        if (target === 'question') {
          setFormData(prev => ({ ...prev, imageUrl: res.url, readableImageUrl: readableUrl }));
        } else {
          const newOpts = [...formData.options];
          newOpts[target as number].imageUrl = res.url;
          newOpts[target as number].readableImageUrl = readableUrl;
          setFormData(prev => ({ ...prev, options: newOpts }));
        }
        toast.success("Image uploaded!");
      } else {
        toast.error("Upload failed");
      }
    } catch (err: any) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUrlUpload = async (target: 'question' | number) => {
    const url = window.prompt("Masukkan Image URL yang ingin diupload ke S3:");
    if (!url) return;

    setIsUploading(true);
    try {
      const res = await uploadImageFromUrl(url);
      if (res.success && res.url) {
        const readableUrl = res.readableUrl || res.url;
        if (target === 'question') {
          setFormData(prev => ({ ...prev, imageUrl: res.url, readableImageUrl: readableUrl }));
        } else {
          const newOpts = [...formData.options];
          newOpts[target as number].imageUrl = res.url;
          newOpts[target as number].readableImageUrl = readableUrl;
          setFormData(prev => ({ ...prev, options: newOpts }));
        }
        toast.success("Image fetched and uploaded!");
      } else {
        toast.error("Upload failed: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Failed to upload image from URL");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddOption = () => {
    const nextChar = String.fromCharCode(65 + formData.options.length); // A, B, C, D...
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { id: nextChar, text: "", imageUrl: "", readableImageUrl: "" }]
    }));
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) return toast.error("Minimum 2 options required");
    const newOpts = formData.options.filter((_, i) => i !== index);
    // Re-assign IDs (A, B, C...)
    const normalizedOpts = newOpts.map((opt, i) => ({ ...opt, id: String.fromCharCode(65 + i) }));
    
    setFormData(prev => ({
      ...prev,
      options: normalizedOpts,
      // Reset correct answer if it was the removed option, default to A
      correctAnswer: normalizedOpts.some(o => o.id === prev.correctAnswer) ? prev.correctAnswer : "A"
    }));
  };

  const handleSaveQuestion = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        questionType: formData.questionType,
        questionText: formData.questionText,
        imageUrl: formData.imageUrl,
        options: optionBasedTypes.includes(formData.questionType) ? formData.options.filter((option) => option.text.trim() || option.imageUrl) : null,
        correctAnswer: formData.correctAnswer,
        points: formData.points,
        sortOrder: formData.sortOrder,
      };
      const savedQuestion = editingQuestion ? await updateTestQuestion(editingQuestion.id, payload) : await addTestQuestion(test.id, payload);
      
      const optimisticQuestion = {
        ...savedQuestion,
        readableImageUrl: formData.readableImageUrl,
        options: savedQuestion.options ? (savedQuestion.options as any[]).map((opt) => ({
          ...opt,
          readableImageUrl: formData.options.find((option) => option.id === opt.id)?.readableImageUrl || ""
        })) : null
      };

      setQuestions(editingQuestion ? questions.map((question: any) => question.id === editingQuestion.id ? optimisticQuestion as any : question) : [...questions, optimisticQuestion as any]);
      toast.success(editingQuestion ? "Question updated!" : "Question added!");
      setIsCreateOpen(false);
      setEditingQuestion(null);
      setFormData({ ...defaultQuestionForm(), sortOrder: questions.length + (editingQuestion ? 1 : 2) });
    } catch (e: any) {
      toast.error(e.message || (editingQuestion ? "Failed to update question" : "Failed to add question"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteTestQuestion(id);
      setQuestions(questions.filter((q) => q.id !== id));
      toast.success("Question deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete question");
    }
  };

  const copyPublicLink = () => {
    const link = `${window.location.origin}/test/public/${test.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Public link copied to clipboard!");
  };

  const formatDateValue = (value: string | Date | null | undefined) => value ? format(new Date(value), "dd MMM yyyy, HH:mm") : "-";
  const plainText = (value: string) => value ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
  const normalizeFileName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "online-test";
  const normalizeQuestionType = (type: string) => type === "multi_select" || type === "checkbox_multi_select" ? "checkbox" : type;
  const formatQuestionType = (type: string) => ({ multiple_choice: "Multiple Choice", true_false: "Benar / Salah", checkbox: "Checkbox / Multi Select", multi_select: "Checkbox / Multi Select", checkbox_multi_select: "Checkbox / Multi Select", dropdown: "Dropdown Select", number: "Number Input", date: "Date Input", file_upload: "Upload File", rating: "Rating", matching: "Matching", ordering: "Ordering", passage: "Passage / Reading", psychometric_scale: "Skala Psikotes", personality: "Psikotes Kepribadian", interest_aptitude: "Minat & Bakat", situational_judgement: "Situational Judgement", essay: "Essay / Short Answer" }[type] || type);
  const optionBasedTypes = ["multiple_choice", "true_false", "checkbox", "multi_select", "checkbox_multi_select", "dropdown", "rating", "matching", "ordering", "psychometric_scale", "personality", "interest_aptitude", "situational_judgement"];
  const formatValueForExcel = (value: any, depth = 0): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      if (value.length === 0) return "";
      const items = value.map((v) => formatValueForExcel(v, depth + 1));
      if (items.every((i) => !i.includes("\n"))) return items.join(", ");
      return items.map((item, idx) => `${idx + 1}. ${item.replace(/\n/g, "\n   ")}`).join("\n");
    }
    if (typeof value === "object") {
      return Object.entries(value || {})
        .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").trim()}: ${formatValueForExcel(v, depth + 1)}`)
        .join("\n");
    }
    return String(value);
  };

  const formatAnswerForExcel = (answerText?: string) => {
    if (!answerText) return "";
    try {
      const parsed = JSON.parse(answerText);
      if (typeof parsed === "object" && parsed !== null) {
        return formatValueForExcel(parsed);
      }
    } catch {
      // not JSON
    }
    return answerText;
  };

  const exportEntries = async (targetEntries: any[], fileName: string) => {
    const XLSX = await import("xlsx");
    const rows = targetEntries.flatMap((entry) => (entry.answers?.length ? entry.answers : [{ questionText: "Belum ada jawaban" }]).map((answer: any, index: number) => ({
      "Candidate Name": entry.candidate?.fullName || "N/A",
      Email: entry.candidate?.email || "N/A",
      Status: entry.status,
      "Started At": formatDateValue(entry.startedAt),
      "Completed At": formatDateValue(entry.completedAt),
      "Question No": answer.questionId ? index + 1 : "",
      "Question Type": answer.questionType || "",
      Question: plainText(answer.questionText || ""),
      Answer: formatAnswerForExcel(answer.answerText),
      "Correct Answer": answer.correctAnswer || "",
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Answers");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(targetEntries.map((entry) => ({
      "Candidate Name": entry.candidate?.fullName || "N/A",
      Email: entry.candidate?.email || "N/A",
      Status: entry.status,
      Answers: entry.answers?.length || 0,
      "Started At": formatDateValue(entry.startedAt),
      "Completed At": formatDateValue(entry.completedAt),
    }))), "Summary");
    XLSX.writeFile(workbook, `${normalizeFileName(fileName)}.xlsx`);
  };
  const openEditEntry = (entry: any) => { setEditingEntry(entry); setEntryEditForm({ status: entry.status || "Pending", score: entry.score == null ? "" : String(entry.score) }); };
  const handleUpdateEntry = async () => { if (!editingEntry) return; const parsedScore = entryEditForm.score.trim() === "" ? null : Number(entryEditForm.score); if (parsedScore !== null && !Number.isFinite(parsedScore)) return toast.error("Score harus angka."); await updateTestEntry(editingEntry.id, { status: entryEditForm.status, score: parsedScore }); setEntries(entries.map((entry: any) => entry.id === editingEntry.id ? { ...entry, status: entryEditForm.status, score: parsedScore } : entry)); setEditingEntry(null); toast.success("Entry updated"); };
  const handleDeleteEntry = async (entry: any) => { if (!confirm(`Hapus entry test milik ${entry.candidate?.fullName || "candidate ini"}?`)) return; await deleteTestEntry(entry.id); setEntries(entries.filter((item: any) => item.id !== entry.id)); toast.success("Entry deleted"); };
  const handleAssignCandidate = async () => { const parsedCandidateId = Number(candidateId); if (!parsedCandidateId) return toast.error("Pilih kandidat dulu."); let scheduledAt: Date | null = null; if (assignDate && assignTime) scheduledAt = new Date(`${assignDate}T${assignTime}`); const assignment = await assignTestToCandidate(test.id, parsedCandidateId, 7, scheduledAt); const candidate = initialCandidates.find((item: any) => item.id === parsedCandidateId); setEntries([{ ...assignment, candidate, answers: [] }, ...entries]); setCandidateId(""); setAssignDate(""); setAssignTime(""); setIsAssignOpen(false); toast.success("Test berhasil di-assign"); };
  const handleBulkImportQuestions = async () => { const rows = bulkQuestionText.split(/\r?\n/).map((row, index) => { const parts = row.split("|").map((part) => part.trim()); if (!parts[0]) return null; const rawType = (parts[1] || "multiple_choice").toLowerCase(); const questionType = rawType.includes("essay") ? "essay" : rawType.includes("checkbox") || rawType.includes("multi") ? "checkbox" : rawType.includes("dropdown") || rawType.includes("select") ? "dropdown" : rawType.includes("number") || rawType.includes("angka") ? "number" : rawType.includes("date") || rawType.includes("tanggal") ? "date" : rawType.includes("file") || rawType.includes("upload") ? "file_upload" : rawType.includes("rating") ? "rating" : rawType.includes("matching") || rawType.includes("cocok") ? "matching" : rawType.includes("ordering") || rawType.includes("urut") ? "ordering" : rawType.includes("passage") || rawType.includes("reading") ? "passage" : rawType.includes("benar") || rawType.includes("false") ? "true_false" : rawType.includes("skala") || rawType.includes("scale") ? "psychometric_scale" : rawType.includes("pribadi") || rawType.includes("personality") ? "personality" : rawType.includes("minat") || rawType.includes("bakat") ? "interest_aptitude" : rawType.includes("situasi") || rawType.includes("judgement") ? "situational_judgement" : "multiple_choice"; const options = optionBasedTypes.includes(questionType) ? (parts[2] || "").split(";").map((text, optionIndex) => ({ id: String.fromCharCode(65 + optionIndex), text: text.trim() })).filter((option) => option.text) : null; return { questionType, questionText: parts[0], options, correctAnswer: parts[3] || (options?.[0]?.id ?? ""), points: Number(parts[4] || 10) || 10, sortOrder: questions.length + index + 1 }; }).filter(Boolean) as any[]; if (!rows.length) return toast.error("Data import soal masih kosong."); const created = await importTestQuestions(test.id, rows); setQuestions([...questions, ...created]); setBulkQuestionText(""); setIsImportOpen(false); toast.success(`${created.length} soal berhasil diimport`); };
  const handleResendEntryEmail = async (entry: any) => {
    try {
      const res = await resendTestAssignmentEmail(entry.id);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Gagal mengirim ulang email tes.");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal mengirim ulang email tes.");
    }
  };

  const handleGradeAnswer = async (entry: any, answer: any) => { const raw = prompt("Masukkan poin untuk jawaban ini", String(answer.pointsAwarded ?? 0)); if (raw === null) return; const pointsAwarded = Number(raw); if (!Number.isFinite(pointsAwarded)) return toast.error("Poin harus angka."); await gradeTestAnswer(answer.id, pointsAwarded, pointsAwarded > 0); const updatedEntries = entries.map((item: any) => { if (item.id !== entry.id) return item; const updatedAnswers = (item.answers || []).map((existing: any) => existing.id === answer.id ? { ...existing, pointsAwarded, isCorrect: pointsAwarded > 0 } : existing); return { ...item, answers: updatedAnswers, score: updatedAnswers.reduce((total: number, current: any) => total + (current.pointsAwarded || 0), 0), status: "Graded" }; }); setEntries(updatedEntries); setSelectedEntry(updatedEntries.find((item: any) => item.id === entry.id) || null); toast.success("Nilai jawaban diupdate"); };

  return (
    <AdminPageShell
      eyebrow="Human Capital"
      title={`Test Editor: ${test.title}`}
      description="Manage the questions and answers for this online test."
    >
      <div className="mb-4">
        <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:text-foreground -ml-4">
          <Link href="/dashboard/hc/recruitment/tests">
            <IconArrowLeft className="w-4 h-4" /> Back to Test Banks
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="entries">Hasil Entries ({entries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <div className="flex justify-between items-center mb-6 bg-muted/10 p-4 rounded-xl border border-muted/30">
            <div>
              <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
              <p className="text-sm text-muted-foreground">Time Limit: {test.timeLimitMinutes} Mins</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyPublicLink} className="gap-2">
                <IconLink className="w-4 h-4" /> Copy Public Link
              </Button>
              {!test.isApplicationForm && (
                <Button onClick={openCreateQuestion} className="gap-2">
                  <IconPlus className="w-4 h-4" /> Add Question
                </Button>
              )}
            </div>
          </div>

          {test.isApplicationForm ? (
            <div className="p-12 border rounded-lg bg-muted/10 text-center text-muted-foreground flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <IconLink className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Application Form</h3>
                <p>This is a predefined application form. Questions and input fields are rendered automatically.<br/>No manual question building is required.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 items-start">
            {questions.map((q, i) => (
          <div key={q.id} className="bg-card border rounded-lg p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-3 items-start">
                <Badge variant="secondary">{i + 1}</Badge>
                <div className="max-w-3xl overflow-hidden">
                  {(q.readableImageUrl || q.imageUrl) && (
                    <img src={q.readableImageUrl || q.imageUrl} alt="Question Attachment" className="max-h-40 rounded-md border mb-3 object-contain" />
                  )}
                  {/* Safely render HTML from Rich Text Editor */}
                  <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">{formatQuestionType(q.questionType)}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setPreviewQuestionId(q.id)} title="Preview question">
                  <IconEye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEditQuestion(q)} title="Edit question">
                  <IconPencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} title="Delete question">
                  <IconTrash className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                </Button>
              </div>
            </div>
            
            {optionBasedTypes.includes(normalizeQuestionType(q.questionType)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pl-10">
                {(q.options?.length ? q.options : getDefaultOptionsForType(normalizeQuestionType(q.questionType))).map((opt: any) => (
                  <div key={opt.id} className="p-3 rounded-lg border text-sm flex flex-col gap-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="font-bold opacity-50 w-5">{opt.id}.</span> 
                      <span>{opt.text}</span>
                    </div>
                    {(opt.readableImageUrl || opt.imageUrl) && (
                      <div className="pl-7">
                        <img src={opt.readableImageUrl || opt.imageUrl} alt={`Option ${opt.id}`} className="h-16 rounded border object-contain bg-background" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {q.questionType === "essay" && (
              <div className="mt-4 pl-10 text-sm text-muted-foreground bg-muted/20 p-3 rounded-md inline-block">
                <span className="font-semibold text-foreground">Expected Keyword / Reference:</span> {q.correctAnswer}
              </div>
            )}
            {q.questionType === "number" && <div className="mt-4 pl-10"><input type="number" disabled placeholder="Number input preview" className="w-full max-w-sm rounded-lg border bg-muted/20 p-3 text-sm" /></div>}
            {q.questionType === "date" && <div className="mt-4 pl-10"><input type="date" disabled className="w-full max-w-sm rounded-lg border bg-muted/20 p-3 text-sm" /></div>}
            {q.questionType === "file_upload" && <div className="mt-4 pl-10"><input type="file" disabled className="w-full max-w-sm rounded-lg border bg-muted/20 p-3 text-sm" /></div>}
            {q.questionType === "passage" && <div className="mt-4 pl-10"><Textarea rows={4} disabled placeholder="Reading / passage answer preview" className="max-w-xl bg-muted/20" /></div>}
          </div>
        ))}
        {questions.length === 0 && (
          <div className="text-center p-12 border border-dashed rounded-lg text-muted-foreground">
            No questions yet. Click "Add Question" to start building your test.
          </div>
        )}
      </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setEditingQuestion(null); }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add New Question"}</DialogTitle>
            <DialogDescription>{editingQuestion ? "Update question content, type, options, and images." : "Create a new question with formatted text and images."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-accent">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={formData.questionType} onValueChange={handleQuestionTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">Benar / Salah</SelectItem>
                    <SelectItem value="checkbox">Checkbox / Multi Select</SelectItem>
                    <SelectItem value="dropdown">Dropdown Select</SelectItem>
                    <SelectItem value="number">Number Input</SelectItem>
                    <SelectItem value="date">Date Input</SelectItem>
                    <SelectItem value="file_upload">Upload File</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="matching">Matching</SelectItem>
                    <SelectItem value="ordering">Ordering</SelectItem>
                    <SelectItem value="passage">Passage / Reading</SelectItem>
                    <SelectItem value="psychometric_scale">Skala Psikotes</SelectItem>
                    <SelectItem value="personality">Psikotes Kepribadian</SelectItem>
                    <SelectItem value="interest_aptitude">Minat & Bakat</SelectItem>
                    <SelectItem value="situational_judgement">Situational Judgement</SelectItem>
                    <SelectItem value="essay">Essay / Short Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label>Question Content</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Label htmlFor="q-image-upload" className="cursor-pointer flex items-center gap-1 text-xs text-accent hover:underline font-medium">
                    <IconPhotoUp className="w-3 h-3" /> Add Image
                  </Label>
                  <input id="q-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'question')} disabled={isUploading} />
                  <button type="button" onClick={() => handleImageUrlUpload('question')} className="flex items-center gap-1 text-xs text-accent hover:underline font-medium" disabled={isUploading}>
                    <IconLink className="w-3 h-3" /> Image by URL
                  </button>
                </div>
              </div>
              
              {formData.readableImageUrl && (
                <div className="relative inline-block border rounded-md bg-muted/30 p-2 mb-2">
                  <img src={formData.readableImageUrl} className="max-h-32 object-contain" alt="Question Preview" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 rounded-full" onClick={() => setFormData({...formData, imageUrl: "", readableImageUrl: ""})}>
                    <IconX className="w-3 h-3" />
                  </Button>
                </div>
              )}

              <RichTextEditor 
                value={formData.questionText} 
                onChange={(val) => setFormData({ ...formData, questionText: val })} 
                placeholder="Type your question here..." 
              />
            </div>

            {optionBasedTypes.includes(normalizeQuestionType(formData.questionType)) ? (
              <div className="space-y-3 bg-muted/10 p-4 rounded-lg border mt-6">
                <div className="flex justify-between items-center mb-2">
                  <Label className="font-semibold text-base">Options / Skala Jawaban</Label>
                  <Button variant="outline" size="sm" onClick={handleAddOption} className="h-8 gap-1">
                    <IconPlus className="w-3 h-3" /> Add Option
                  </Button>
                </div>

                <div className="grid gap-3">
                  {formData.options.map((opt, idx) => (
                    <div key={opt.id} className="flex gap-2 items-start bg-background p-2 rounded border">
                      <div className="pt-2 font-bold w-6 text-center">{opt.id}</div>
                      <div className="flex-1 space-y-2">
                        <Input value={opt.text} onChange={(e) => {
                          const newOpts = [...formData.options];
                          newOpts[idx].text = e.target.value;
                          setFormData({ ...formData, options: newOpts });
                        }} placeholder={`Option text...`} />
                        
                        {opt.readableImageUrl || opt.imageUrl ? (
                          <div className="relative inline-block border rounded bg-muted/30 p-1">
                            <img src={opt.readableImageUrl || opt.imageUrl} className="h-12 object-contain" alt={`Opt ${opt.id}`} />
                            <button type="button" className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5" onClick={() => {
                              const newOpts = [...formData.options];
                              newOpts[idx].imageUrl = "";
                              newOpts[idx].readableImageUrl = "";
                              setFormData({ ...formData, options: newOpts });
                            }}>
                              <IconX className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor={`opt-img-${opt.id}`} className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-accent hover:underline font-medium ml-2">
                              <IconPhotoUp className="w-3 h-3" /> Add Image
                            </Label>
                            <input id={`opt-img-${opt.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, idx)} disabled={isUploading} />
                            
                            <button type="button" onClick={() => handleImageUrlUpload(idx)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent hover:underline font-medium ml-2" disabled={isUploading}>
                              <IconLink className="w-3 h-3" /> Image URL
                            </button>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleRemoveOption(idx)} disabled={formData.options.length <= 2}>
                        <IconX className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2 mt-4 pt-4 border-t">
                  <Label>Correct Answer</Label>
                  <Select value={formData.correctAnswer} onValueChange={(val) => setFormData({ ...formData, correctAnswer: val })}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-</SelectItem>
                      {formData.options.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>Option {opt.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Pilih "-" jika soal tidak punya kunci jawaban (psikotes).</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-muted/10 p-4 rounded-lg border mt-6">
                <Label>Expected Answer / Keyword</Label>
                <Input value={formData.correctAnswer} onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })} placeholder="e.g. JavaScript" />
                <p className="text-xs text-muted-foreground">Untuk essay, sistem akan mencari keyword ini untuk auto-score awal; HR tetap bisa edit nilai manual.</p>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 mt-2 border-t">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveQuestion} disabled={!formData.questionText || isSubmitting || isUploading}>
              {isSubmitting ? "Saving..." : isUploading ? "Uploading..." : editingQuestion ? "Update Question" : "Save Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewQuestionId} onOpenChange={(open) => !open && setPreviewQuestionId(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Preview Soal</DialogTitle>
            <DialogDescription>{previewQ ? formatQuestionType(previewQ.questionType) : ''}</DialogDescription>
          </DialogHeader>
          {previewQ && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 pr-4">
                <div className="text-base font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: previewQ.questionText }} />
                {previewQ.imageUrl && <img src={previewQ.imageUrl} alt="" className="max-h-60 w-full rounded-lg border object-contain" />}
                {(() => {
                  const type = normalizeQuestionType(previewQ.questionType);
                  const options = Array.isArray(previewQ.options) && previewQ.options.length ? previewQ.options : [];
                  if (type === "disc") {
                    return (
                      <>
                        <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-center gap-2">
                          <span className="font-medium">⚠</span> Wajib pilih satu <strong>Mirip</strong> dan satu <strong>Tidak Mirip</strong> per nomor.
                        </div>
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full border-collapse min-w-[350px]">
                            <thead><tr className="bg-muted/50"><th className="p-2 border-b border-r text-center text-xs font-medium w-20">Mirip</th><th className="p-2 border-b border-r text-center text-xs font-medium w-20">Tidak Mirip</th><th className="p-2 border-b text-left text-xs font-medium">Pernyataan</th></tr></thead>
                            <tbody>{options.map((opt: any, i: number) => (
                              <tr key={opt.id} className={i !== options.length - 1 ? 'border-b' : ''}>
                                <td className="p-2 border-r text-center"><input type="radio" disabled className="accent-primary" /></td>
                                <td className="p-2 border-r text-center"><input type="radio" disabled className="accent-primary" /></td>
                                <td className="p-2 text-sm"><span className="font-semibold mr-1">{opt.id}.</span>{opt.text}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      </>
                    );
                  }
                  if (["multiple_choice", "true_false", "rating", "matching", "ordering", "psychometric_scale", "personality", "interest_aptitude", "situational_judgement"].includes(type)) {
                    return (
                      <div className="space-y-2">
                        {options.map((opt: any) => (
                          <div key={opt.id} className="flex items-start gap-3 border p-3 rounded-lg bg-muted/10">
                            <input type="radio" disabled className="mt-0.5 accent-primary shrink-0" />
                            <span className="text-sm"><span className="font-bold mr-1">{opt.id}.</span> {opt.text}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  if (type === "checkbox") {
                    return (
                      <div className="space-y-2">
                        {options.map((opt: any) => (
                          <label key={opt.id} className="flex items-start gap-3 border p-3 rounded-lg bg-muted/10 cursor-pointer">
                            <input type="checkbox" disabled className="mt-0.5 accent-primary shrink-0" />
                            <span className="text-sm"><span className="font-bold mr-1">{opt.id}.</span> {opt.text}</span>
                          </label>
                        ))}
                      </div>
                    );
                  }
                  if (type === "dropdown") return <select className="w-full rounded-lg border bg-muted/10 p-2.5 text-sm" disabled><option>{options[0]?.text || '-'}</option></select>;
                  if (type === "number") return <input type="number" disabled placeholder="Input angka..." className="w-full rounded-lg border bg-muted/10 p-2.5 text-sm" />;
                  if (type === "date") return <input type="date" disabled className="w-full rounded-lg border bg-muted/10 p-2.5 text-sm" />;
                  if (type === "file_upload") return <input type="file" disabled className="w-full rounded-lg border bg-muted/10 p-2.5 text-sm" />;
                  if (type === "passage" || previewQ.questionType === "essay") return <textarea disabled rows={4} placeholder="Jawaban..." className="w-full rounded-lg border bg-muted/10 p-2.5 text-sm" />;
                  return <p className="text-sm text-muted-foreground">Preview tidak tersedia untuk tipe soal ini.</p>;
                })()}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="entries" className="space-y-4">
        {/* Quick Status Scorecard Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                : "bg-background text-muted-foreground border-border hover:bg-muted/60"
            }`}
          >
            <span>Semua</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              statusFilter === "ALL" ? "bg-white/20 text-white dark:bg-black/20 dark:text-slate-900" : "bg-muted text-muted-foreground"
            }`}>
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "Completed" ? "ALL" : "Completed")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === "Completed"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-emerald-50/60 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            }`}
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>Selesai / Completed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
              {completedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "In Progress" ? "ALL" : "In Progress")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === "In Progress"
                ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                : "bg-amber-50/60 text-amber-700 border-amber-200 hover:bg-amber-100/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            }`}
          >
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span>Sedang Mengerjakan</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
              {inProgressCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "Pending" ? "ALL" : "Pending")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === "Pending"
                ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
            }`}
          >
            <span className="size-1.5 rounded-full bg-slate-400" />
            <span>Belum Mulai</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {pendingCount}
            </span>
          </button>

          {expiredCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "Expired" ? "ALL" : "Expired")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === "Expired"
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
              }`}
            >
              <span className="size-1.5 rounded-full bg-rose-500" />
              <span>Kedaluwarsa</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                {expiredCount}
              </span>
            </button>
          )}
        </div>

        {/* Toolbar: Search, Filters, and Primary Actions */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border border-border/60">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] sm:min-w-[260px] flex-1 sm:flex-initial">
              <IconSearch className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kandidat, email, nomor..."
                className="h-9 pl-8 pr-7 text-xs rounded-lg bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <IconX className="size-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 min-w-[130px] w-auto text-xs rounded-lg bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="Completed">Completed (Selesai)</SelectItem>
                <SelectItem value="Graded">Graded (Dinilai)</SelectItem>
                <SelectItem value="In Progress">In Progress (Mengerjakan)</SelectItem>
                <SelectItem value="Pending">Pending (Belum Mulai)</SelectItem>
                <SelectItem value="Expired">Expired (Kedaluwarsa)</SelectItem>
              </SelectContent>
            </Select>

            {/* Result Filter */}
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="h-9 min-w-[130px] w-auto text-xs rounded-lg bg-background">
                <SelectValue placeholder="Hasil" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="ALL">Semua Hasil</SelectItem>
                {test.isApplicationForm ? (
                  <>
                    <SelectItem value="FILLED">Formulir Terisi</SelectItem>
                    <SelectItem value="UNFILLED">Belum Mengisi</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="PASSED">Lulus (≥ {test.passingScore || 0}%)</SelectItem>
                    <SelectItem value="FAILED">Gagal (&lt; {test.passingScore || 0}%)</SelectItem>
                    <SelectItem value="UNGRADED">Belum Dinilai</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Date Range Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 gap-1.5 text-xs rounded-lg border-border/80 bg-background ${
                    dateRange?.from ? "border-primary/60 text-primary font-medium bg-primary/5" : "text-muted-foreground"
                  }`}
                >
                  <IconCalendar className="size-3.5" />
                  <span>
                    {dateRange?.from
                      ? dateRange.to
                        ? `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`
                        : format(dateRange.from, "dd/MM/yyyy")
                      : "Filter Tanggal"}
                  </span>
                  {dateRange?.from && (
                    <span
                      className="ml-1 rounded-full p-0.5 hover:bg-muted cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateRange(undefined);
                      }}
                      title="Reset rentang tanggal"
                    >
                      <IconX className="size-3" />
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-3 space-y-3">
                <div className="flex items-center justify-between border-b pb-2 gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Filter Kolom:</span>
                  <div className="flex gap-1">
                    <Button
                      variant={dateField === "createdAt" ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setDateField("createdAt")}
                    >
                      Tgl Daftar
                    </Button>
                    <Button
                      variant={dateField === "completedAt" ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setDateField("completedAt")}
                    >
                      Tgl Selesai
                    </Button>
                    <Button
                      variant={dateField === "scheduledAt" ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setDateField("scheduledAt")}
                    >
                      Jadwal
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })}
                  >
                    Hari ini
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDateRange({ from: subDays(new Date(), 7), to: endOfDay(new Date()) })}
                  >
                    7 Hari
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDateRange({ from: subDays(new Date(), 30), to: endOfDay(new Date()) })}
                  >
                    30 Hari
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setDateRange(undefined)}
                  >
                    Reset
                  </Button>
                </div>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Reset semua filter"
              >
                <IconRefresh className="size-3.5" />
                <span>Reset</span>
                <Badge variant="secondary" className="size-4 p-0 flex items-center justify-center text-[10px]">
                  {activeFiltersCount}
                </Badge>
              </Button>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssignOpen(true)}
              className="h-9 gap-1.5 rounded-lg text-xs font-semibold bg-background shadow-xs hover:bg-muted"
            >
              <IconPlus className="size-4 text-primary" />
              <span>Assign Kandidat</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportEntries(sortedEntries, `hasil-entries-${test.title}`)}
              className="h-9 gap-1.5 rounded-lg text-xs font-semibold bg-background shadow-xs hover:bg-muted"
              title="Export hasil entries yang sedang tampil ke Excel"
            >
              <IconDownload className="size-4 text-emerald-600" />
              <span>Export Excel ({sortedEntries.length})</span>
            </Button>
          </div>
        </div>

        {/* Multi-Select Floating / Sticky Bulk Action Bar */}
        {selectedEntryIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-2.5 shadow-xs animate-in fade-in-50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 font-medium text-xs sm:text-sm text-foreground">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {selectedEntryIds.length}
                </span>
                <span>kandidat terpilih dari {sortedEntries.length} data</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEntryIds([])}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Batal Pilih
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Export Selected */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExportExcel}
                className="h-8 gap-1.5 text-xs font-medium bg-background shadow-xs hover:bg-muted"
              >
                <IconFileSpreadsheet className="size-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export Excel</span> ({selectedEntryIds.length})
              </Button>

              {/* Resend Email Selected */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkResendEmail}
                disabled={isBulkResendingEmail}
                className="h-8 gap-1.5 text-xs font-medium bg-background shadow-xs hover:bg-muted"
              >
                {isBulkResendingEmail ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconMailForward className="size-3.5 text-sky-600" />
                )}
                <span className="hidden sm:inline">Kirim Email</span> ({selectedEntryIds.length})
              </Button>

              {/* Update Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBulkUpdatingStatus}
                    className="h-8 gap-1.5 text-xs font-medium bg-background shadow-xs hover:bg-muted"
                  >
                    {isBulkUpdatingStatus ? (
                      <IconLoader2 className="size-3.5 animate-spin" />
                    ) : (
                      <IconPencil className="size-3.5 text-amber-600" />
                    )}
                    <span>Ubah Status</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 text-xs">
                  <DropdownMenuItem onClick={() => handleBulkUpdateStatus("Completed")}>
                    Set: Completed (Selesai)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkUpdateStatus("Graded")}>
                    Set: Graded (Dinilai)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkUpdateStatus("In Progress")}>
                    Set: In Progress (Mengerjakan)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkUpdateStatus("Pending")}>
                    Set: Pending (Belum Mulai)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkUpdateStatus("Expired")}>
                    Set: Expired (Kedaluwarsa)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Bulk Delete Button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsConfirmBulkDeleteOpen(true)}
                className="h-8 gap-1.5 text-xs font-medium shadow-xs"
              >
                <IconTrash className="size-3.5" />
                <span>Hapus Terpilih</span> ({selectedEntryIds.length})
              </Button>
            </div>
          </div>
        )}

        {/* Entries Table Container */}
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {/* Multi-select Header Checkbox */}
                  <TableHead className="w-10 text-center px-3">
                    <Checkbox
                      checked={isAllSelected ? true : isPartiallySelected ? "indeterminate" : false}
                      onCheckedChange={handleToggleSelectAll}
                      aria-label="Pilih semua data"
                    />
                  </TableHead>

                  {/* Sortable Column Headers */}
                  <TableHead
                    className="w-12 text-center cursor-pointer select-none group hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("no")}
                    title="Urutkan No"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className={sortKey === "no" ? "text-foreground font-bold" : ""}>NO</span>
                      {sortKey === "no" ? (
                        sortOrder === "asc" ? <IconChevronUp className="size-3 text-primary shrink-0" /> : <IconChevronDown className="size-3 text-primary shrink-0" />
                      ) : (
                        <IconArrowsSort className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer select-none group hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("candidate")}
                    title="Urutkan Nama Kandidat"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortKey === "candidate" ? "text-foreground font-bold" : ""}>CANDIDATE NAME</span>
                      {sortKey === "candidate" ? (
                        sortOrder === "asc" ? <IconChevronUp className="size-3 text-primary shrink-0" /> : <IconChevronDown className="size-3 text-primary shrink-0" />
                      ) : (
                        <IconArrowsSort className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer select-none group hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("email")}
                    title="Urutkan Email"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortKey === "email" ? "text-foreground font-bold" : ""}>EMAIL</span>
                      {sortKey === "email" ? (
                        sortOrder === "asc" ? <IconChevronUp className="size-3 text-primary shrink-0" /> : <IconChevronDown className="size-3 text-primary shrink-0" />
                      ) : (
                        <IconArrowsSort className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer select-none group hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("createdAt")}
                    title="Urutkan Tanggal Daftar"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortKey === "createdAt" ? "text-foreground font-bold" : ""}>TGL DAFTAR</span>
                      {sortKey === "createdAt" ? (
                        sortOrder === "asc" ? <IconChevronUp className="size-3 text-primary shrink-0" /> : <IconChevronDown className="size-3 text-primary shrink-0" />
                      ) : (
                        <IconArrowsSort className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer select-none group hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("status")}
                    title="Urutkan Status"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortKey === "status" ? "text-foreground font-bold" : ""}>STATUS</span>
                      {sortKey === "status" ? (
                        sortOrder === "asc" ? <IconChevronUp className="size-3 text-primary shrink-0" /> : <IconChevronDown className="size-3 text-primary shrink-0" />
                      ) : (
                        <IconArrowsSort className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    className="text-right cursor-pointer select-none group hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("score")}
                    title="Urutkan Skor / Hasil"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={sortKey === "score" ? "text-foreground font-bold" : ""}>SCORE</span>
                      {sortKey === "score" ? (
                        sortOrder === "asc" ? <IconChevronUp className="size-3 text-primary shrink-0" /> : <IconChevronDown className="size-3 text-primary shrink-0" />
                      ) : (
                        <IconArrowsSort className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer select-none group hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("schedule")}
                    title="Urutkan Jadwal Tes"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortKey === "schedule" ? "text-foreground font-bold" : ""}>SCHEDULE</span>
                      {sortKey === "schedule" ? (
                        sortOrder === "asc" ? <IconChevronUp className="size-3 text-primary shrink-0" /> : <IconChevronDown className="size-3 text-primary shrink-0" />
                      ) : (
                        <IconArrowsSort className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    className="text-center cursor-pointer select-none group hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("answers")}
                    title="Urutkan Jumlah Terjawab"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={sortKey === "answers" ? "text-foreground font-bold" : ""}>ANSWERS</span>
                      {sortKey === "answers" ? (
                        sortOrder === "asc" ? <IconChevronUp className="size-3 text-primary shrink-0" /> : <IconChevronDown className="size-3 text-primary shrink-0" />
                      ) : (
                        <IconArrowsSort className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer select-none group hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("completedAt")}
                    title="Urutkan Tanggal Selesai"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortKey === "completedAt" ? "text-foreground font-bold" : ""}>COMPLETED AT</span>
                      {sortKey === "completedAt" ? (
                        sortOrder === "asc" ? <IconChevronUp className="size-3 text-primary shrink-0" /> : <IconChevronDown className="size-3 text-primary shrink-0" />
                      ) : (
                        <IconArrowsSort className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead className="text-center w-44">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry, index) => {
                  const ansList = entry.answers || [];
                  const correctCount = ansList.filter((a: any) => a.isCorrect === true).length;
                  const ansPct = ansList.length > 0 ? Math.round((correctCount / ansList.length) * 100) : null;
                  const allManual = ansList.length > 0 && ansList.every((a: any) => a.isCorrect === null || a.isCorrect === undefined);
                  const isSelected = selectedEntryIds.includes(entry.id);

                  return (
                    <TableRow
                      key={entry.id}
                      className={`transition-colors text-xs ${
                        isSelected ? "bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Row Checkbox */}
                      <TableCell className="text-center px-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelectRow(entry.id)}
                          aria-label={`Pilih kandidat ${entry.candidate?.fullName || entry.id}`}
                        />
                      </TableCell>

                      <TableCell className="text-center font-mono text-muted-foreground text-[11px]">
                        {index + 1}
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {entry.candidate?.fullName || "N/A"}
                        </div>
                        {entry.candidate?.phone && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {entry.candidate.phone}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-muted-foreground font-mono text-[11px]">
                        {entry.candidate?.email || "-"}
                      </TableCell>

                      <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap">
                        {entry.createdAt ? format(new Date(entry.createdAt), "dd MMM yyyy, HH:mm") : "-"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            entry.status === "Completed" || entry.status === "Graded"
                              ? "default"
                              : entry.status === "In Progress"
                              ? "secondary"
                              : "outline"
                          }
                          className={
                            entry.status === "Completed" || entry.status === "Graded"
                              ? "bg-emerald-600 text-white font-medium text-[10px]"
                              : "text-[10px]"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {(entry.status === "Completed" || entry.status === "Graded") && ansPct !== null ? (
                          allManual || test.isApplicationForm ? (
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-300">
                                Formulir Terisi
                              </Badge>
                              {entry.testScores && (entry.testScores.apm !== null || entry.testScores.amr !== null) && (
                                <div className="flex items-center gap-1 font-mono text-[9.5px]">
                                  {entry.testScores.apm !== null && (
                                    <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800" title="Skor APM (Tes 8)">
                                      APM: {entry.testScores.apm}
                                    </span>
                                  )}
                                  {entry.testScores.amr !== null && (
                                    <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800" title="Skor AMR (Tes 10)">
                                      AMR: {entry.testScores.amr}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="text-sm font-bold text-primary">{ansPct}%</span>
                              {test.passingScore > 0 && (
                                <Badge
                                  variant={ansPct >= test.passingScore ? "default" : "destructive"}
                                  className={ansPct >= test.passingScore ? "bg-emerald-600 text-[10px] ml-1" : "text-[10px] ml-1"}
                                >
                                  {ansPct >= test.passingScore ? "LULUS" : "GAGAL"}
                                </Badge>
                              )}
                              <div className="text-[10px] text-muted-foreground">{correctCount}/{ansList.length} benar</div>
                            </div>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap">
                        {entry.scheduledAt ? format(new Date(entry.scheduledAt), "dd/MM/yy HH:mm") : "-"}
                      </TableCell>

                      <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                        {ansList.length} / {questions.length}
                      </TableCell>

                      <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap">
                        {formatDateValue(entry.completedAt)}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Primary Action: Preview PDF (khusus Application Form atau jika sudah ada jawaban) */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewPdfEntry(entry)}
                            className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-teal-700 bg-teal-50/70 border-teal-200/80 hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/80 shadow-xs"
                            title="Preview & Cetak Dokumen PDF Resmi"
                          >
                            <IconFileTypePdf className="size-3.5 text-teal-600 dark:text-teal-400" />
                            <span>PDF</span>
                          </Button>

                          {/* 2. Detail Action */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEntry(entry)}
                            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            title="Lihat Detail Jawaban"
                          >
                            <IconEye className="size-3.5" />
                            <span className="hidden sm:inline">Detail</span>
                          </Button>

                          {/* 3. More Actions Dropdown Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Aksi Lainnya"
                              >
                                <IconDotsVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem
                                onClick={() => setScheduleInterviewCandidate({
                                  id: entry.candidateId,
                                  name: entry.candidate?.fullName || "Kandidat",
                                  jobTitle: test.title,
                                })}
                                className="gap-2 cursor-pointer text-primary font-medium"
                              >
                                <IconUserCheck className="size-4" />
                                <span>Jadwalkan Wawancara</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => exportEntries([entry], `hasil-entry-${test.title}-${entry.candidate?.fullName || entry.id}`)}
                                className="gap-2 cursor-pointer"
                              >
                                <IconFileSpreadsheet className="size-4 text-emerald-600" />
                                <span>Export Excel</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleResendEntryEmail(entry)}
                                className="gap-2 cursor-pointer"
                              >
                                <IconMailForward className="size-4 text-sky-600" />
                                <span>Kirim Ulang Email</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEditEntry(entry)}
                                className="gap-2 cursor-pointer"
                              >
                                <IconPencil className="size-4 text-amber-600" />
                                <span>Edit Status & Skor</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteEntry(entry)}
                                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                              >
                                <IconTrash className="size-4" />
                                <span>Hapus Entry</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {sortedEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center h-32 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <IconSearch className="size-6 text-muted-foreground/50" />
                        <p className="text-sm font-medium">
                          {entries.length === 0
                            ? "Belum ada entry hasil tes untuk modul ini."
                            : "Tidak ada entry kandidat yang cocok dengan filter yang dipilih."}
                        </p>
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetAllFilters}
                            className="h-8 text-xs gap-1.5 mt-1"
                          >
                            <IconRefresh className="size-3.5" />
                            <span>Reset Semua Filter</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer Summary */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 bg-muted/20 border-t border-border/60 text-xs text-muted-foreground">
            <div>
              Menampilkan <span className="font-semibold text-foreground">{sortedEntries.length}</span> dari{" "}
              <span className="font-semibold text-foreground">{entries.length}</span> total entries
              {selectedEntryIds.length > 0 && (
                <span className="ml-2 font-medium text-primary">
                  ({selectedEntryIds.length} dipilih)
                </span>
              )}
            </div>
            {sortKey && (
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span>Diurutkan:</span>
                <span className="font-semibold text-foreground uppercase">{sortKey}</span>
                <span>({sortOrder === "asc" ? "Naik / ASC" : "Turun / DESC"})</span>
                <button
                  type="button"
                  onClick={() => setSortKey(null)}
                  className="ml-1 text-muted-foreground hover:text-foreground underline text-[10px]"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal: Bulk Delete */}
        <Dialog open={isConfirmBulkDeleteOpen} onOpenChange={setIsConfirmBulkDeleteOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <IconTrash className="size-5" />
                <span>Hapus {selectedEntryIds.length} Entry Terpilih?</span>
              </DialogTitle>
              <DialogDescription className="pt-2 text-xs leading-relaxed">
                Tindakan ini akan menghapus data pengerjaan tes dan jawaban dari{" "}
                <strong>{selectedEntryIds.length} kandidat</strong> secara permanen dari sistem.
                Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmBulkDeleteOpen(false)}
                disabled={isBulkDeleting}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="gap-1.5"
              >
                {isBulkDeleting && <IconLoader2 className="size-3.5 animate-spin" />}
                <span>Ya, Hapus {selectedEntryIds.length} Data</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Preview PDF Dokumen Resmi Chitra Paratama (F.HR.STD.006.00) */}
        <ApplicationFormPreviewDialog
          open={!!previewPdfEntry}
          onOpenChange={(open) => !open && setPreviewPdfEntry(null)}
          entry={previewPdfEntry}
          testTitle={test.title}
        />

        {/* Dialog Detail Entry */}
        <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
            <DialogHeader>
              <div className="flex items-center justify-between gap-4 pr-6">
                <div>
                  <DialogTitle>Detail Hasil Entry: {selectedEntry?.candidate?.fullName || "Candidate"}</DialogTitle>
                  <DialogDescription>
                    {selectedEntry?.candidate?.email || "No email"} · Status: {selectedEntry?.status}
                  </DialogDescription>
                </div>
                {selectedEntry && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setPreviewPdfEntry(selectedEntry);
                    }}
                    className="h-8 text-xs gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-xs"
                  >
                    <IconFileTypePdf className="w-3.5 h-3.5" /> Buka Preview PDF
                  </Button>
                )}
              </div>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {questions.map((question: any, index: number) => {
                const answer = selectedEntry?.answers?.find((item: any) => item.questionId === question.id);
                return (
                  <div key={question.id} className="rounded-xl border bg-background p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">Soal {index + 1}</Badge>
                      <Badge variant="outline">{question.questionType}</Badge>
                      {answer && answer.isCorrect !== null && answer.isCorrect !== undefined ? (
                        <Badge variant={answer.isCorrect ? "default" : "destructive"} className={answer.isCorrect ? "bg-emerald-600" : ""}>
                          {answer.isCorrect ? "Benar" : "Salah"} · {answer.pointsAwarded}/{question.points || 1} pts
                        </Badge>
                      ) : answer && !test.isApplicationForm ? (
                        <button className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs hover:bg-muted" onClick={() => handleGradeAnswer(selectedEntry!, answer)}>
                          Nilai
                        </button>
                      ) : null}
                    </div>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: question.questionText }} />
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-lg bg-muted/20 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Jawaban Peserta</p>
                        <AnswerDisplay text={answer?.answerText} />
                      </div>
                      <div className="rounded-lg bg-muted/20 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Jawaban Benar / Rubrik</p>
                        <p className="mt-1 whitespace-pre-wrap">{question.correctAnswer || "-"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              {selectedEntry && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewPdfEntry(selectedEntry);
                    }}
                    className="gap-1.5 text-teal-700 dark:text-teal-300 border-teal-300/60"
                  >
                    <IconFileTypePdf className="size-4 text-teal-600" /> Preview PDF Dokumen
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportEntries([selectedEntry], `hasil-entry-${test.title}-${selectedEntry.candidate?.fullName || selectedEntry.id}`)}
                  >
                    <IconDownload className="size-4" /> Export Excel
                  </Button>
                </>
              )}
              <Button onClick={() => setSelectedEntry(null)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}><DialogContent className="sm:max-w-[460px]"><DialogHeader><DialogTitle>Edit Entry</DialogTitle><DialogDescription>Ubah status dan score entry test kandidat.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Status</Label><Select value={entryEditForm.status} onValueChange={(value) => setEntryEditForm((prev) => ({ ...prev, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Graded">Graded</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Score (poin)</Label><Input type="number" value={entryEditForm.score} onChange={(e) => setEntryEditForm((prev) => ({ ...prev, score: e.target.value }))} placeholder="Kosongkan jika tidak ada" /></div></div><DialogFooter><Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button><Button onClick={handleUpdateEntry}>Save</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Test ke Kandidat</DialogTitle>
              <DialogDescription>Pilih kandidat dan atur jadwal (opsional).</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Kandidat</Label>
                <Select value={candidateId} onValueChange={setCandidateId}>
                  <SelectTrigger><SelectValue placeholder="Pilih kandidat" /></SelectTrigger>
                  <SelectContent>
                    {initialCandidates.map((candidate: any) => (
                      <SelectItem key={candidate.id} value={String(candidate.id)}>{candidate.fullName} · {candidate.email || candidate.phone || "No contact"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jadwal (opsional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} />
                  <Input type="time" value={assignTime} onChange={(e) => setAssignTime(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">Kosongkan agar test langsung bisa diakses. Jika diisi, test hanya bisa dibuka setelah waktu tersebut.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignCandidate}>Assign & Send Email</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>

      {scheduleInterviewCandidate && (
        <ScheduleInterviewModal
          open={!!scheduleInterviewCandidate}
          onOpenChange={(open) => !open && setScheduleInterviewCandidate(null)}
          candidateId={scheduleInterviewCandidate.id}
          candidateName={scheduleInterviewCandidate.name}
          jobTitle={scheduleInterviewCandidate.jobTitle}
          onSuccess={() => {
            toast.success("Wawancara berhasil dijadwalkan!");
          }}
        />
      )}
      </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}


