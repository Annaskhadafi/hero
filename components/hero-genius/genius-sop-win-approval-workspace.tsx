"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  FileText,
  Sparkles,
  GitFork,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Rocket,
  ShieldCheck,
  Layers,
  Clock,
  UserCheck,
  ChevronRight,
  Search,
  Building2,
  BookOpen,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Check,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateSopWinApprovalAction,
  getAvailableSopWinDocumentsAction,
  getSavedSopApprovalSystemsAction,
  publishSopWinApprovalToWorkflowStudioAction,
  deleteSopApprovalSystemAction,
  STANDARD_SOP_PRESETS,
  type SopApprovalStepInput,
} from "@/app/dashboard/hero-genius/sop-approval-actions";

type ModeType = "preset" | "library" | "manual";

export function GeniusSopWinApprovalWorkspace() {
  const [isPending, startTransition] = useTransition();

  // Mode Selection
  const [activeMode, setActiveMode] = useState<ModeType>("preset");
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("ptw_safety");

  // Document Library
  const [sopDocs, setSopDocs] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [docSearchQuery, setDocSearchQuery] = useState<string>("");

  // Manual Input
  const [manualTitle, setManualTitle] = useState<string>("");
  const [manualText, setManualText] = useState<string>("");

  // Active Generated System
  const [activeSystem, setActiveSystem] = useState<any | null>(null);
  const [editableSteps, setEditableSteps] = useState<SopApprovalStepInput[]>([]);
  const [publishNotes, setPublishNotes] = useState<string>("");

  // Saved Systems List
  const [savedSystems, setSavedSystems] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Initial Load
  useEffect(() => {
    loadLibraryDocuments();
    loadSavedSystems();
  }, []);

  const loadLibraryDocuments = async () => {
    const res = await getAvailableSopWinDocumentsAction();
    if (res.success && res.documents) {
      setSopDocs(res.documents);
    }
  };

  const loadSavedSystems = async () => {
    const res = await getSavedSopApprovalSystemsAction();
    if (res.success && res.systems) {
      setSavedSystems(res.systems);
    }
  };

  // Trigger AI Workflow Generation
  const handleGenerateWorkflow = () => {
    setStatusMessage(null);
    startTransition(async () => {
      let payload: any = {};
      if (activeMode === "preset") {
        payload.presetKey = selectedPresetKey;
      } else if (activeMode === "library") {
        if (!selectedDocId) {
          setStatusMessage({ type: "error", text: "Silakan pilih dokumen SOP/WIN dari daftar." });
          return;
        }
        payload.sopDocumentId = Number(selectedDocId);
      } else if (activeMode === "manual") {
        if (!manualText.trim()) {
          setStatusMessage({ type: "error", text: "Silakan masukkan teks atau instruksi kerja SOP." });
          return;
        }
        payload.rawSopContent = manualText;
        payload.customTitle = manualTitle || "Approval SOP Manual";
      }

      const res = await generateSopWinApprovalAction(payload);
      if (res.success && res.data) {
        setActiveSystem(res.data);
        setEditableSteps(res.data.approvalSteps || []);
        setStatusMessage({
          type: "success",
          text: res.message || "Sistem Approval berhasil diderivasi dari SOP/WIN!",
        });
        loadSavedSystems();
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Gagal merancang sistem approval.",
        });
      }
    });
  };

  // Step Modification Handlers
  const handleAddStep = () => {
    const newStep: SopApprovalStepInput = {
      stepOrder: editableSteps.length + 1,
      label: `Review & Sign-off Tahap ${editableSteps.length + 1}`,
      assignedRole: "Department Manager / Superintendent",
      slaHours: 24,
      isRequired: true,
      condition: "Sesuai Prosedur SOP",
    };
    setEditableSteps([...editableSteps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const filtered = editableSteps.filter((_, i) => i !== index);
    const reordered = filtered.map((step, i) => ({ ...step, stepOrder: i + 1 }));
    setEditableSteps(reordered);
  };

  const handleStepChange = (index: number, field: keyof SopApprovalStepInput, value: any) => {
    const updated = [...editableSteps];
    updated[index] = { ...updated[index], [field]: value };
    setEditableSteps(updated);
  };

  // Publish to Workflow Studio Action
  const handlePublishToStudio = () => {
    if (!activeSystem?.id) return;
    setStatusMessage(null);
    startTransition(async () => {
      const res = await publishSopWinApprovalToWorkflowStudioAction({
        systemId: activeSystem.id,
        approvalSteps: editableSteps,
        notes: publishNotes,
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: res.message || "Berhasil dipublikasikan.",
        });
        setActiveSystem({
          ...activeSystem,
          status: "published",
          publishedMatrixId: res.matrixId,
        });
        loadSavedSystems();
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Gagal mempublikasikan matriks ke Workflow Studio.",
        });
      }
    });
  };

  const handleDeleteSaved = (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus draf sistem approval ini?")) return;
    startTransition(async () => {
      const res = await deleteSopApprovalSystemAction(id);
      if (res.success) {
        if (activeSystem?.id === id) {
          setActiveSystem(null);
        }
        loadSavedSystems();
      }
    });
  };

  const filteredDocs = sopDocs.filter(
    (d) =>
      d.title?.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      d.documentNumber?.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      d.departmentCode?.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg border border-indigo-900/40">
        <div className="absolute -right-10 -bottom-10 size-60 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md border border-indigo-500/30">
              <Zap className="size-3.5 text-indigo-400" />
              AI SOP-to-Workflow Engine
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              SOP & WIN Approval System Generator
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Konversi otomatis dokumen Prosedur Operasional Standar (SOP) dan Instruksi Kerja (WIN) menjadi alur approval terstruktur, matriks hierarki persetujuan, dan aturan SLA aktif yang siap dipublikasikan ke HERO Approval Engine.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-xs text-slate-300 border-r border-slate-700/60 pr-4">
              <span className="font-semibold text-white">100% Integrated</span>
              <span>HERO Workflow Studio</span>
            </div>
            <Button
              onClick={() => {
                setActiveMode("preset");
                handleGenerateWorkflow();
              }}
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md gap-2 text-xs"
            >
              <Sparkles className="size-4" />
              {isPending ? "Menganalisis..." : "Quick Demo Generator"}
            </Button>
          </div>
        </div>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveMode("preset")}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
            activeMode === "preset"
              ? "bg-indigo-50/70 border-indigo-500 shadow-sm dark:bg-indigo-950/40 dark:border-indigo-500"
              : "bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
              <BookOpen className="size-5" />
            </div>
            {activeMode === "preset" && (
              <Badge className="bg-indigo-600 text-white text-[10px]">Aktif</Badge>
            )}
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Templat Standar HERO
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Gunakan preset SOP baku industri (PTW K3L, SPL Lembur, PR Pengadaan, Daily Activity).
          </p>
        </div>

        <div
          onClick={() => setActiveMode("library")}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
            activeMode === "library"
              ? "bg-indigo-50/70 border-indigo-500 shadow-sm dark:bg-indigo-950/40 dark:border-indigo-500"
              : "bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              <FileText className="size-5" />
            </div>
            {activeMode === "library" && (
              <Badge className="bg-indigo-600 text-white text-[10px]">Aktif</Badge>
            )}
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Library Dokumen SOP/WIN
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Pilih langsung dari file SOP/WIN yang telah terdaftar di database HERO DMS.
          </p>
        </div>

        <div
          onClick={() => setActiveMode("manual")}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
            activeMode === "manual"
              ? "bg-indigo-50/70 border-indigo-500 shadow-sm dark:bg-indigo-950/40 dark:border-indigo-500"
              : "bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Edit3 className="size-5" />
            </div>
            {activeMode === "manual" && (
              <Badge className="bg-indigo-600 text-white text-[10px]">Aktif</Badge>
            )}
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Input Teks SOP Manual
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Ketik atau salin draf teks langkah kerja SOP secara bebas untuk diekstrak AI Genius.
          </p>
        </div>
      </div>

      {/* Main Generator Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls Card */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <GitFork className="size-4 text-indigo-600" />
                Konfigurasi Sumber SOP/WIN
              </CardTitle>
              <CardDescription className="text-xs">
                Pilih parameter untuk membentuk skema hierarki approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Preset Mode View */}
              {activeMode === "preset" && (
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pilih Templat SOP Standar HERO
                  </Label>
                  <div className="space-y-2">
                    {STANDARD_SOP_PRESETS.map((preset) => (
                      <div
                        key={preset.key}
                        onClick={() => setSelectedPresetKey(preset.key)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                          selectedPresetKey === preset.key
                            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500 font-medium"
                            : "border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                          <span>{preset.title}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {preset.documentNumber}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {preset.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Library Mode View */}
              {activeMode === "library" && (
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cari Dokumen SOP / WIN dari Database
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                    <Input
                      placeholder="Cari nomor dokumen, judul, departemen..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="pl-8 text-xs"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-slate-50 dark:bg-slate-950">
                    {filteredDocs.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Tidak ada dokumen SOP/WIN yang sesuai.
                      </div>
                    ) : (
                      filteredDocs.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocId(String(doc.id))}
                          className={`p-2.5 rounded-md border text-xs cursor-pointer transition-all ${
                            selectedDocId === String(doc.id)
                              ? "border-indigo-600 bg-white shadow-sm font-semibold text-indigo-900 dark:bg-slate-900 dark:text-indigo-300"
                              : "border-transparent hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                              {doc.documentNumber}
                            </span>
                            <Badge variant="secondary" className="text-[9px]">
                              {doc.departmentCode}
                            </Badge>
                          </div>
                          <div className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                            {doc.title}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Manual Mode View */}
              {activeMode === "manual" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold">Judul Sistem / Prosedur</Label>
                    <Input
                      placeholder="Contoh: SOP-TC-010: Prosedur Penggantian Suku Cadang Ban"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">
                      Salin Teks Prosedur / Tahapan SOP
                    </Label>
                    <Textarea
                      placeholder="Tempel atau tulis urutan langkah kerja SOP di sini..."
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      rows={6}
                      className="text-xs mt-1 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Status Message */}
              {statusMessage && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                    statusMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : statusMessage.type === "error"
                      ? "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300"
                      : "bg-blue-50 text-blue-800 border border-blue-200"
                  }`}
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={handleGenerateWorkflow}
                disabled={isPending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 text-xs"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Menganalisis Prosedur via Genius AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 text-amber-400" />
                    Generasikan Sistem Approval dari SOP
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Output & Interactive Workbench */}
        <div className="lg:col-span-7 space-y-4">
          {!activeSystem ? (
            <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                <div className="flex size-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <GitFork className="size-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Siap Merancang Sistem Approval SOP
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pilih templat SOP standar atau dokumen SOP dari library di panel sebelah kiri, lalu klik tombol <strong>Generasikan Sistem Approval</strong> untuk mengekstrak alur persetujuan secara instan.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Generated Result Overview */}
              <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {activeSystem.documentNumber || "SOP"}
                      </Badge>
                      <Badge className="bg-indigo-600 text-white text-[10px]">
                        {activeSystem.departmentCode || "HR"}
                      </Badge>
                      <Badge
                        variant={activeSystem.status === "published" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {activeSystem.status === "published" ? "Aktif di Engine" : "Draf Matriks"}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {activeSystem.title}
                    </CardTitle>
                  </div>
                  <div className="text-right border-l pl-4 border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-400">Audit Score</div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {activeSystem.complianceAuditScore || 95}/100
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-1">
                      Ringkasan Ekstraksi Genius AI:
                    </span>
                    {activeSystem.summary}
                  </div>

                  {/* Interactive Step Pipeline */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Layers className="size-4 text-indigo-600" />
                        Tahapan Persetujuan Berjenjang ({editableSteps.length} Langkah)
                      </Label>
                      <Button
                        onClick={handleAddStep}
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1"
                      >
                        <Plus className="size-3" /> Tambah Tahap
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {editableSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                                {step.stepOrder}
                              </span>
                              <Input
                                value={step.label}
                                onChange={(e) => handleStepChange(idx, "label", e.target.value)}
                                className="h-7 text-xs font-bold max-w-xs"
                                placeholder="Nama Tahap Approval"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                SLA {step.slaHours || 24} Jam
                              </Badge>
                              {editableSteps.length > 1 && (
                                <Button
                                  onClick={() => handleRemoveStep(idx)}
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <Label className="text-[10px] text-slate-500">Peran / Jabatan Approver</Label>
                              <Input
                                value={step.assignedRole}
                                onChange={(e) => handleStepChange(idx, "assignedRole", e.target.value)}
                                className="h-7 text-xs mt-0.5"
                                placeholder="Contoh: Department Manager"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-slate-500">Kondisi / Trigger Rule</Label>
                              <Input
                                value={step.condition || ""}
                                onChange={(e) => handleStepChange(idx, "condition", e.target.value)}
                                className="h-7 text-xs mt-0.5"
                                placeholder="Contoh: Semua Pengajuan"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Publish & Integration Controls */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div>
                      <Label className="text-xs font-semibold">Catatan Integrasi / Catatan Rilis</Label>
                      <Input
                        placeholder="Opsional: Catatan verifikasi dipublikasikan ke Workflow Studio..."
                        value={publishNotes}
                        onChange={(e) => setPublishNotes(e.target.value)}
                        className="text-xs mt-1"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        Otomatis tersambung ke <strong>hero_approval_matrices</strong>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          onClick={handlePublishToStudio}
                          disabled={isPending}
                          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs"
                        >
                          <Rocket className="size-4" />
                          {activeSystem.status === "published"
                            ? "Perbarui Matriks Aktif"
                            : "Publikasikan ke Workflow Studio"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Saved Systems History Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="size-4 text-indigo-600" />
              Riwayat Sistem Approval SOP yang Pernah Dibuat ({savedSystems.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Daftar matriks approval SOP/WIN yang tersimpan di sistem HERO Genius.
            </CardDescription>
          </div>
          <Button onClick={loadSavedSystems} variant="ghost" size="sm" className="h-7 text-xs gap-1">
            <RefreshCw className="size-3" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500">
                  <th className="p-3 font-semibold">Dokumen / Judul SOP</th>
                  <th className="p-3 font-semibold">Dept</th>
                  <th className="p-3 font-semibold">Tipe Transaksi</th>
                  <th className="p-3 font-semibold">Jumlah Langkah</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {savedSystems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-slate-400">
                      Belum ada sistem approval SOP yang dibuat. Klik tombol di atas untuk memulai.
                    </td>
                  </tr>
                ) : (
                  savedSystems.map((sys) => (
                    <tr
                      key={sys.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {sys.title}
                        </div>
                        <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {sys.documentNumber || "SOP-GEN"}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {sys.departmentCode || "HR"}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {sys.transactionType}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {Array.isArray(sys.approvalSteps) ? sys.approvalSteps.length : 0} Langkah
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={
                            sys.status === "published"
                              ? "bg-emerald-600 text-white text-[10px]"
                              : "bg-slate-200 text-slate-700 text-[10px]"
                          }
                        >
                          {sys.status === "published" ? "Aktif di Engine" : "Draf"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => {
                              setActiveSystem(sys);
                              setEditableSteps(sys.approvalSteps || []);
                            }}
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] gap-1"
                          >
                            <Edit3 className="size-3" /> Kelola
                          </Button>
                          <Button
                            onClick={() => handleDeleteSaved(sys.id)}
                            variant="ghost"
                            size="icon"
                            className="size-7 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
