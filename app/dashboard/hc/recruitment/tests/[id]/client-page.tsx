"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addTestQuestion, assignTestToCandidate, deleteTestEntry, deleteTestQuestion, gradeTestAnswer, importTestQuestions, updateTestEntry, updateTestQuestion } from "@/app/actions/recruitment-tests";
import { uploadFile } from "@/app/actions/upload";
import { toast } from "sonner";
import { IconDownload, IconEye, IconPencil, IconPlus, IconTrash, IconPhotoUp, IconX, IconLink, IconArrowLeft } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";

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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [bulkQuestionText, setBulkQuestionText] = useState("");
  
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
      correctAnswer: question.correctAnswer || options[0]?.id || "A",
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
  const exportEntries = (targetEntries: any[], fileName: string) => { const rows = targetEntries.flatMap((entry) => (entry.answers?.length ? entry.answers : [{ questionText: "Belum ada jawaban" }]).map((answer: any, index: number) => ({ "Candidate Name": entry.candidate?.fullName || "N/A", Email: entry.candidate?.email || "N/A", Status: entry.status, "Started At": formatDateValue(entry.startedAt), "Completed At": formatDateValue(entry.completedAt), "Question No": answer.questionId ? index + 1 : "", "Question Type": answer.questionType || "", Question: plainText(answer.questionText || ""), Answer: answer.answerText || "", "Correct Answer": answer.correctAnswer || "" }))); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Answers"); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(targetEntries.map((entry) => ({ "Candidate Name": entry.candidate?.fullName || "N/A", Email: entry.candidate?.email || "N/A", Status: entry.status, Answers: entry.answers?.length || 0, "Started At": formatDateValue(entry.startedAt), "Completed At": formatDateValue(entry.completedAt) }))), "Summary"); XLSX.writeFile(workbook, `${normalizeFileName(fileName)}.xlsx`); };
  const openEditEntry = (entry: any) => { setEditingEntry(entry); setEntryEditForm({ status: entry.status || "Pending", score: entry.score == null ? "" : String(entry.score) }); };
  const handleUpdateEntry = async () => { if (!editingEntry) return; const parsedScore = entryEditForm.score.trim() === "" ? null : Number(entryEditForm.score); if (parsedScore !== null && !Number.isFinite(parsedScore)) return toast.error("Score harus angka."); await updateTestEntry(editingEntry.id, { status: entryEditForm.status, score: parsedScore }); setEntries(entries.map((entry: any) => entry.id === editingEntry.id ? { ...entry, status: entryEditForm.status, score: parsedScore } : entry)); setEditingEntry(null); toast.success("Entry updated"); };
  const handleDeleteEntry = async (entry: any) => { if (!confirm(`Hapus entry test milik ${entry.candidate?.fullName || "candidate ini"}?`)) return; await deleteTestEntry(entry.id); setEntries(entries.filter((item: any) => item.id !== entry.id)); toast.success("Entry deleted"); };
  const handleAssignCandidate = async () => { const parsedCandidateId = Number(candidateId); if (!parsedCandidateId) return toast.error("Pilih kandidat dulu."); const assignment = await assignTestToCandidate(test.id, parsedCandidateId); const candidate = initialCandidates.find((item: any) => item.id === parsedCandidateId); setEntries([{ ...assignment, candidate, answers: [] }, ...entries]); setCandidateId(""); setIsAssignOpen(false); toast.success("Test berhasil di-assign"); };
  const handleBulkImportQuestions = async () => { const rows = bulkQuestionText.split(/\r?\n/).map((row, index) => { const parts = row.split("|").map((part) => part.trim()); if (!parts[0]) return null; const rawType = (parts[1] || "multiple_choice").toLowerCase(); const questionType = rawType.includes("essay") ? "essay" : rawType.includes("checkbox") || rawType.includes("multi") ? "checkbox" : rawType.includes("dropdown") || rawType.includes("select") ? "dropdown" : rawType.includes("number") || rawType.includes("angka") ? "number" : rawType.includes("date") || rawType.includes("tanggal") ? "date" : rawType.includes("file") || rawType.includes("upload") ? "file_upload" : rawType.includes("rating") ? "rating" : rawType.includes("matching") || rawType.includes("cocok") ? "matching" : rawType.includes("ordering") || rawType.includes("urut") ? "ordering" : rawType.includes("passage") || rawType.includes("reading") ? "passage" : rawType.includes("benar") || rawType.includes("false") ? "true_false" : rawType.includes("skala") || rawType.includes("scale") ? "psychometric_scale" : rawType.includes("pribadi") || rawType.includes("personality") ? "personality" : rawType.includes("minat") || rawType.includes("bakat") ? "interest_aptitude" : rawType.includes("situasi") || rawType.includes("judgement") ? "situational_judgement" : "multiple_choice"; const options = optionBasedTypes.includes(questionType) ? (parts[2] || "").split(";").map((text, optionIndex) => ({ id: String.fromCharCode(65 + optionIndex), text: text.trim() })).filter((option) => option.text) : null; return { questionType, questionText: parts[0], options, correctAnswer: parts[3] || (options?.[0]?.id ?? ""), points: Number(parts[4] || 10) || 10, sortOrder: questions.length + index + 1 }; }).filter(Boolean) as any[]; if (!rows.length) return toast.error("Data import soal masih kosong."); const created = await importTestQuestions(test.id, rows); setQuestions([...questions, ...created]); setBulkQuestionText(""); setIsImportOpen(false); toast.success(`${created.length} soal berhasil diimport`); };
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
                <div>
                  <Label htmlFor="q-image-upload" className="cursor-pointer flex items-center gap-1 text-xs text-accent hover:underline font-medium">
                    <IconPhotoUp className="w-3 h-3" /> Add Image
                  </Label>
                  <input id="q-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'question')} disabled={isUploading} />
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
                            <Label htmlFor={`opt-img-${opt.id}`} className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-accent font-medium w-fit">
                              <IconPhotoUp className="w-3 h-3" /> Add Image to Option
                            </Label>
                            <input id={`opt-img-${opt.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, idx)} disabled={isUploading} />
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
                      {formData.options.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>Option {opt.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
      </TabsContent>

      <TabsContent value="entries">
        <MinimalTableShell
          label="test entries"
          title="Test Entries"
          fileName={`hasil-entries-${test.title}`}
          actions={(
            <>
              <Button variant="outline" onClick={() => setIsAssignOpen(true)} className="h-9 gap-2 rounded-lg border-0 bg-white px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"><IconPlus className="size-4" /> Assign</Button>
              <Button variant="outline" onClick={() => exportEntries(entries, `hasil-entries-${test.title}`)} className="h-9 gap-2 rounded-lg border-0 bg-white px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"><IconDownload className="size-4" /> Export Detail</Button>
            </>
          )}
        >
          <Table>
            <TableHeader><TableRow><TableHead>CANDIDATE NAME</TableHead><TableHead>EMAIL</TableHead><TableHead>STATUS</TableHead><TableHead>ANSWERS</TableHead><TableHead>STARTED AT</TableHead><TableHead>COMPLETED AT</TableHead><TableHead className="text-right">ACTIONS</TableHead></TableRow></TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.candidate?.fullName || "N/A"}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.candidate?.email || "N/A"}</TableCell>
                  <TableCell><Badge variant={entry.status === "Completed" || entry.status === "Graded" ? "default" : entry.status === "In Progress" ? "secondary" : "outline"}>{entry.status}</Badge></TableCell>
                  
                  <TableCell className="text-muted-foreground">{entry.answers?.length || 0} / {questions.length}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateValue(entry.startedAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateValue(entry.completedAt)}</TableCell>
                  <TableCell><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setSelectedEntry(entry)}><IconEye className="size-4" /> Detail</Button><Button variant="outline" size="sm" onClick={() => exportEntries([entry], `hasil-entry-${test.title}-${entry.candidate?.fullName || entry.id}`)}><IconDownload className="size-4" /> Excel</Button><Button variant="outline" size="sm" onClick={() => openEditEntry(entry)}><IconPencil className="size-4" /> Edit</Button><Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(entry)} className="text-destructive hover:text-destructive"><IconTrash className="size-4" /> Delete</Button></div></TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No entries found for this test yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </MinimalTableShell>

        <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}><DialogContent className="sm:max-w-[900px] max-h-[90vh]"><DialogHeader><DialogTitle>Detail Hasil Entry</DialogTitle><DialogDescription>{selectedEntry?.candidate?.fullName || "Candidate"} · {selectedEntry?.candidate?.email || "No email"} · {selectedEntry?.status}</DialogDescription></DialogHeader><div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">{questions.map((question: any, index: number) => { const answer = selectedEntry?.answers?.find((item: any) => item.questionId === question.id); return <div key={question.id} className="rounded-xl border bg-background p-4"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="secondary">Soal {index + 1}</Badge><Badge variant="outline">{question.questionType}</Badge></div><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: question.questionText }} /><div className="mt-3 grid gap-3 text-sm md:grid-cols-2"><div className="rounded-lg bg-muted/20 p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Jawaban Peserta</p><p className="mt-1 whitespace-pre-wrap">{answer?.answerText || "Belum dijawab"}</p></div><div className="rounded-lg bg-muted/20 p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Jawaban Benar / Rubrik</p><p className="mt-1 whitespace-pre-wrap">{question.correctAnswer || "-"}</p></div></div></div>; })}</div><DialogFooter>{selectedEntry ? <Button variant="outline" onClick={() => exportEntries([selectedEntry], `hasil-entry-${test.title}-${selectedEntry.candidate?.fullName || selectedEntry.id}`)}><IconDownload className="size-4" /> Export User Excel</Button> : null}<Button onClick={() => setSelectedEntry(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}><DialogContent className="sm:max-w-[460px]"><DialogHeader><DialogTitle>Edit Entry</DialogTitle><DialogDescription>Ubah status entry test kandidat.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Status</Label><Select value={entryEditForm.status} onValueChange={(value) => setEntryEditForm((prev) => ({ ...prev, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Graded">Graded</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button><Button onClick={handleUpdateEntry}>Save</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}><DialogContent><DialogHeader><DialogTitle>Assign Test ke Kandidat</DialogTitle><DialogDescription>Pilih kandidat yang akan menerima access key test.</DialogDescription></DialogHeader><Select value={candidateId} onValueChange={setCandidateId}><SelectTrigger><SelectValue placeholder="Pilih kandidat" /></SelectTrigger><SelectContent>{initialCandidates.map((candidate: any) => <SelectItem key={candidate.id} value={String(candidate.id)}>{candidate.fullName} · {candidate.email || candidate.phone || "No contact"}</SelectItem>)}</SelectContent></Select><DialogFooter><Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button><Button onClick={handleAssignCandidate}>Assign</Button></DialogFooter></DialogContent></Dialog>
      </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}

