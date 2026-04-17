"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, GitPullRequest, Plus, Search, Trash2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import type {
  ApprovalMatrix,
  OrgStructure,
  MasterDepartment,
  MasterPosition,
  MasterSection,
  MasterSite,
} from "@/lib/master-data";
import {
  manageApprovalMatrixAction,
  simulateApprovalRouteAction,
  type MasterDataActionState,
} from "@/app/dashboard/master-data/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const INITIAL_ACTION_STATE: MasterDataActionState = {
  status: "idle",
  message: "",
};

type Props = {
  approvalMatrices: ApprovalMatrix[];
  orgStructures: OrgStructure[];
  departments: MasterDepartment[];
  sections: MasterSection[];
  positions: MasterPosition[];
  sites: MasterSite[];
  employees: Array<{
    id: number;
    name: string;
    jobTitle: string;
    departmentId?: number | null;
    sectionId?: number | null;
    positionId?: number | null;
    orgNodeId?: number | null;
  }>;
};

type EditableStep = {
  stepOrder: number;
  label: string;
  nodeId: string;
  fallbackNodeId: string;
  escalationNodeId: string;
  approvalMode: string;
  slaHours: number;
  canDelegate: boolean;
  isRequired: boolean;
};

type EditableMatrix = {
  id?: number;
  name: string;
  structureId: string;
  transactionType: string;
  siteId: string;
  departmentId: string;
  sectionId: string;
  requesterPositionId: string;
  activityType: string;
  priority: string;
  minOvertimeMinutes: number;
  maxOvertimeMinutes: string;
  description: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
  steps: EditableStep[];
};

function toDateTimeLocalValue(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const offset = parsed.getTimezoneOffset();
  const localDate = new Date(parsed.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function buildEmptyMatrix(): EditableMatrix {
  return {
    name: "",
    structureId: "",
    transactionType: "activity",
    siteId: "",
    departmentId: "",
    sectionId: "",
    requesterPositionId: "",
    activityType: "",
    priority: "any",
    minOvertimeMinutes: 0,
    maxOvertimeMinutes: "",
    description: "",
    effectiveFrom: "",
    effectiveTo: "",
    isActive: true,
    steps: [
      {
        stepOrder: 1,
        label: "Level 1 Review",
        nodeId: "",
        fallbackNodeId: "",
        escalationNodeId: "",
        approvalMode: "sequential",
        slaHours: 24,
        canDelegate: true,
        isRequired: true,
      },
    ],
  };
}

function getNextStepOrder(steps: EditableStep[]) {
  return Math.max(0, ...steps.map((step) => step.stepOrder)) + 1;
}

function matrixToEditable(matrix: ApprovalMatrix): EditableMatrix {
  return {
    id: matrix.id,
    name: matrix.name,
    structureId: matrix.structureId?.toString() ?? "",
    transactionType: matrix.transactionType,
    siteId: matrix.siteId?.toString() ?? "",
    departmentId: matrix.departmentId?.toString() ?? "",
    sectionId: matrix.sectionId?.toString() ?? "",
    requesterPositionId: matrix.requesterPositionId?.toString() ?? "",
    activityType: matrix.activityType || "",
    priority: matrix.priority || "any",
    minOvertimeMinutes: matrix.minOvertimeMinutes,
    maxOvertimeMinutes: matrix.maxOvertimeMinutes?.toString() ?? "",
    description: matrix.description || "",
    effectiveFrom: toDateTimeLocalValue(matrix.effectiveFrom),
    effectiveTo: toDateTimeLocalValue(matrix.effectiveTo),
    isActive: matrix.isActive,
    steps:
      matrix.steps.length > 0
        ? matrix.steps.map((step) => ({
            stepOrder: step.stepOrder,
            label: step.label,
            nodeId: step.nodeId?.toString() ?? "",
            fallbackNodeId: step.fallbackNodeId?.toString() ?? "",
            escalationNodeId: step.escalationNodeId?.toString() ?? "",
            approvalMode: step.approvalMode,
            slaHours: step.slaHours,
            canDelegate: step.canDelegate,
            isRequired: step.isRequired,
          }))
        : buildEmptyMatrix().steps,
  };
}

export function ApprovalMatrixManager({
  approvalMatrices,
  orgStructures,
  departments,
  sections,
  positions,
  sites,
  employees,
}: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMatrixId, setSelectedMatrixId] = useState(approvalMatrices[0]?.id.toString() ?? "new");
  const [draftMatrix, setDraftMatrix] = useState<EditableMatrix>(
    approvalMatrices[0] ? matrixToEditable(approvalMatrices[0]) : buildEmptyMatrix(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulationForm, setSimulationForm] = useState({
    employeeId: employees[0]?.id.toString() ?? "",
    activityType: "Daily Recap",
    priority: "Normal",
    overtimeMinutes: "0",
  });
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const filteredMatrices = approvalMatrices.filter((matrix) => {
    const haystack = `${matrix.name} ${matrix.structureName ?? ""} ${matrix.requesterPositionName ?? ""} ${matrix.priority}`.toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  });

  const selectedStructureId = Number.parseInt(draftMatrix.structureId || "0", 10);
  const availableNodes = useMemo(() => {
    const structures =
      selectedStructureId > 0
        ? orgStructures.filter((structure) => structure.id === selectedStructureId)
        : orgStructures;

    return structures.flatMap((structure) =>
      structure.nodes.map((node) => ({
        id: node.id,
        label: `${structure.name} • ${node.label}`,
        canApprove: node.canApprove,
      })),
    );
  }, [orgStructures, selectedStructureId]);

  const filteredSections = draftMatrix.departmentId
    ? sections.filter((section) => section.departmentId?.toString() === draftMatrix.departmentId)
    : sections;

  const filteredPositions = draftMatrix.departmentId
    ? positions.filter((position) => position.departmentId?.toString() === draftMatrix.departmentId)
    : positions;

  useEffect(() => {
    if (selectedMatrixId === "new") {
      setDraftMatrix(buildEmptyMatrix());
      return;
    }

    const selected = approvalMatrices.find((matrix) => matrix.id.toString() === selectedMatrixId);
    if (selected) {
      setDraftMatrix(matrixToEditable(selected));
    }
  }, [approvalMatrices, selectedMatrixId]);

  const updateStep = (index: number, changes: Partial<EditableStep>) => {
    setDraftMatrix((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...changes } : step,
      ),
    }));
  };

  const addStep = () => {
    setDraftMatrix((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          stepOrder: getNextStepOrder(current.steps),
          label: `Level ${getNextStepOrder(current.steps)}`,
          nodeId: "",
          fallbackNodeId: "",
          escalationNodeId: "",
          approvalMode: "sequential",
          slaHours: 24,
          canDelegate: true,
          isRequired: true,
        },
      ],
    }));
  };

  const removeStep = (index: number) => {
    setDraftMatrix((current) => ({
      ...current,
      steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
    }));
  };

  const handleNewMatrix = () => {
    setSelectedMatrixId("new");
    setDraftMatrix(buildEmptyMatrix());
  };

  const handleSave = async () => {
    if (!draftMatrix.name.trim()) {
      toast.error("Nama approval matrix wajib diisi.");
      return;
    }

    if (draftMatrix.steps.length === 0) {
      toast.error("Approval matrix minimal memiliki satu step.");
      return;
    }

    setIsSubmitting(true);
    const form = new FormData();
    form.append("intent", draftMatrix.id ? "update" : "create");
    if (draftMatrix.id) {
      form.append("id", draftMatrix.id.toString());
    }
    form.append("name", draftMatrix.name);
    form.append("structureId", draftMatrix.structureId);
    form.append("transactionType", draftMatrix.transactionType);
    form.append("siteId", draftMatrix.siteId);
    form.append("departmentId", draftMatrix.departmentId);
    form.append("sectionId", draftMatrix.sectionId);
    form.append("requesterPositionId", draftMatrix.requesterPositionId);
    form.append("activityType", draftMatrix.activityType);
    form.append("priority", draftMatrix.priority);
    form.append("minOvertimeMinutes", draftMatrix.minOvertimeMinutes.toString());
    form.append("maxOvertimeMinutes", draftMatrix.maxOvertimeMinutes);
    form.append("description", draftMatrix.description);
    form.append("effectiveFrom", draftMatrix.effectiveFrom);
    form.append("effectiveTo", draftMatrix.effectiveTo);
    form.append("isActive", draftMatrix.isActive.toString());
    form.append(
      "stepsJson",
      JSON.stringify(
        [...draftMatrix.steps]
          .sort((left, right) => left.stepOrder - right.stepOrder)
          .map((step) => ({
          ...step,
          stepOrder: step.stepOrder,
          nodeId: step.nodeId ? Number(step.nodeId) : null,
          fallbackNodeId: step.fallbackNodeId ? Number(step.fallbackNodeId) : null,
          escalationNodeId: step.escalationNodeId ? Number(step.escalationNodeId) : null,
        })),
      ),
    );

    const result = await manageApprovalMatrixAction(INITIAL_ACTION_STATE, form);
    if (result.status === "success") {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!draftMatrix.id) {
      handleNewMatrix();
      return;
    }

    setIsSubmitting(true);
    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", draftMatrix.id.toString());
    form.append("name", draftMatrix.name);

    const result = await manageApprovalMatrixAction(INITIAL_ACTION_STATE, form);
    if (result.status === "success") {
      toast.success(result.message);
      setSelectedMatrixId("new");
      setDraftMatrix(buildEmptyMatrix());
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const handleSimulate = async () => {
    if (!simulationForm.employeeId) {
      toast.error("Pilih karyawan untuk simulasi.");
      return;
    }

    const form = new FormData();
    form.append("employeeId", simulationForm.employeeId);
    form.append("activityType", simulationForm.activityType);
    form.append("priority", simulationForm.priority);
    form.append("overtimeMinutes", simulationForm.overtimeMinutes);

    const result = await simulateApprovalRouteAction(form);
    setSimulationResult(result);
    if (result.status === "error") {
      toast.error(result.message);
    }
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Approval Matrix</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Tentukan rule approval berdasarkan struktur, requester, scope site, dan karakter aktivitas.
          </CardDescription>
        </div>
        <Button onClick={handleNewMatrix} className="bg-[#0f766e] hover:bg-[#115e59]">
          <Plus className="mr-2 size-4" />
          Matrix Baru
        </Button>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-[#d1fae5] bg-[#ecfdf5]">
          <AlertCircle className="size-4 text-[#047857]" />
          <AlertDescription className="text-[#065f46]">
            Pisahkan struktur organisasi dan matrix approval. Struktur menjawab siapa di mana, matrix menjawab transaksi tertentu harus lewat siapa.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                placeholder="Cari approval matrix..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-9"
              />
            </div>

            <div className="space-y-3 rounded-[1.2rem] bg-surface-container-low p-3">
              {filteredMatrices.length > 0 ? (
                filteredMatrices.map((matrix) => (
                  <div
                    key={matrix.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedMatrixId(matrix.id.toString())}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedMatrixId(matrix.id.toString());
                      }
                    }}
                    className={`cursor-pointer rounded-[1.05rem] px-4 py-4 transition ${
                      selectedMatrixId === matrix.id.toString()
                        ? "bg-[#ecfdf5]"
                        : "bg-surface-container-lowest hover:bg-surface-container-highest"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#1e293b]">{matrix.name}</p>
                        <p className="mt-1 text-xs text-[#64748b]">
                          {matrix.structureName ?? "Tanpa struktur"} • {matrix.requesterPositionName ?? "Semua requester"}
                        </p>
                        <p className="mt-2 text-xs text-[#94a3b8]">
                          {matrix.steps.length} step • {matrix.priority}
                          {matrix.activityType ? ` • ${matrix.activityType}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-surface-container-lowest">
                        {matrix.isActive ? "Aktif" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.05rem] bg-surface-container-lowest p-6 text-center text-sm text-muted-foreground">
                  Belum ada approval matrix.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.3rem] bg-surface-container-lowest p-5 shadow-[0_12px_24px_rgba(0,52,97,0.06)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-[#1e293b]">
                    {draftMatrix.id ? "Edit Approval Matrix" : "Buat Approval Matrix"}
                  </h3>
                  <p className="text-sm text-[#64748b]">
                    Atur scope rule, requester, step approval, fallback, dan escalation target.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {draftMatrix.id ? (
                    <Button type="button" variant="outline" onClick={handleDelete} disabled={isSubmitting}>
                      <Trash2 className="mr-2 size-4" />
                      Hapus
                    </Button>
                  ) : null}
                  <Button type="button" onClick={handleSave} disabled={isSubmitting} className="bg-[#0f766e] hover:bg-[#115e59]">
                    {isSubmitting ? "Menyimpan..." : "Simpan Matrix"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="grid gap-2">
                  <Label>Nama Matrix</Label>
                  <Input
                    value={draftMatrix.name}
                    onChange={(event) => setDraftMatrix((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Contoh: Technician Activity Standard"
                  />
                </label>
                <div className="grid gap-2">
                  <Label>Struktur Organisasi</Label>
                  <Select
                    value={draftMatrix.structureId || "none"}
                    onValueChange={(value) =>
                      setDraftMatrix((current) => ({
                        ...current,
                        structureId: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih struktur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa struktur</SelectItem>
                      {orgStructures.map((structure) => (
                        <SelectItem key={structure.id} value={structure.id.toString()}>
                          {structure.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Site</Label>
                  <Select
                    value={draftMatrix.siteId || "none"}
                    onValueChange={(value) =>
                      setDraftMatrix((current) => ({
                        ...current,
                        siteId: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Semua Site</SelectItem>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.id.toString()}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Jenis Transaksi</Label>
                  <Select
                    value={draftMatrix.transactionType}
                    onValueChange={(value) => setDraftMatrix((current) => ({ ...current, transactionType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih transaksi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity">Activity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Department Requester</Label>
                  <Select
                    value={draftMatrix.departmentId || "none"}
                    onValueChange={(value) =>
                      setDraftMatrix((current) => ({
                        ...current,
                        departmentId: value === "none" ? "" : value,
                        sectionId: "",
                        requesterPositionId: "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Semua Department</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id.toString()}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Section Requester</Label>
                  <Select
                    value={draftMatrix.sectionId || "none"}
                    onValueChange={(value) =>
                      setDraftMatrix((current) => ({
                        ...current,
                        sectionId: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Semua Section</SelectItem>
                      {filteredSections.map((section) => (
                        <SelectItem key={section.id} value={section.id.toString()}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Jabatan Requester</Label>
                  <Select
                    value={draftMatrix.requesterPositionId || "none"}
                    onValueChange={(value) =>
                      setDraftMatrix((current) => ({
                        ...current,
                        requesterPositionId: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Jabatan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Semua Jabatan</SelectItem>
                      {filteredPositions.map((position) => (
                        <SelectItem key={position.id} value={position.id.toString()}>
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="grid gap-2">
                  <Label>Activity Type</Label>
                  <Input
                    value={draftMatrix.activityType}
                    onChange={(event) =>
                      setDraftMatrix((current) => ({ ...current, activityType: event.target.value }))
                    }
                    placeholder="Kosongkan untuk semua activity"
                  />
                </label>
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select
                    value={draftMatrix.priority}
                    onValueChange={(value) => setDraftMatrix((current) => ({ ...current, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Safety">Safety</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="grid gap-2">
                  <Label>Min Overtime (menit)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draftMatrix.minOvertimeMinutes}
                    onChange={(event) =>
                      setDraftMatrix((current) => ({
                        ...current,
                        minOvertimeMinutes: Number(event.target.value || "0"),
                      }))
                    }
                  />
                </label>
                <label className="grid gap-2">
                  <Label>Max Overtime (menit)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draftMatrix.maxOvertimeMinutes}
                    onChange={(event) =>
                      setDraftMatrix((current) => ({
                        ...current,
                        maxOvertimeMinutes: event.target.value,
                      }))
                    }
                    placeholder="Kosongkan bila tanpa batas"
                  />
                </label>
                <label className="grid gap-2">
                  <Label>Effective From</Label>
                  <Input
                    type="datetime-local"
                    value={draftMatrix.effectiveFrom}
                    onChange={(event) =>
                      setDraftMatrix((current) => ({ ...current, effectiveFrom: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-2">
                  <Label>Effective To</Label>
                  <Input
                    type="datetime-local"
                    value={draftMatrix.effectiveTo}
                    onChange={(event) =>
                      setDraftMatrix((current) => ({ ...current, effectiveTo: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={draftMatrix.description}
                    onChange={(event) =>
                      setDraftMatrix((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    placeholder="Catatan rule approval ini"
                  />
                </label>
                <div className="flex items-center gap-3 rounded-[1.05rem] bg-surface-container-low px-4 py-4">
                  <Switch
                    checked={draftMatrix.isActive}
                    onCheckedChange={(checked) =>
                      setDraftMatrix((current) => ({ ...current, isActive: checked }))
                    }
                  />
                  <div>
                    <p className="font-medium text-[#1e293b]">Matrix aktif</p>
                    <p className="text-xs text-[#64748b]">Hanya matrix aktif yang ikut dipakai resolver approval.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.3rem] bg-surface-container-lowest p-5 shadow-[0_12px_24px_rgba(0,52,97,0.06)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-[#1e293b]">Approval Steps</h4>
                  <p className="text-sm text-[#64748b]">
                    Susun step approval berurutan, lengkap dengan fallback dan escalation target.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addStep}>
                  <Plus className="mr-2 size-4" />
                  Tambah Step
                </Button>
              </div>

              <div className="space-y-4">
                {draftMatrix.steps
                  .map((step, originalIndex) => ({ step, originalIndex }))
                  .sort((left, right) => left.step.stepOrder - right.step.stepOrder)
                  .map(({ step, originalIndex }, index) => (
                  <div key={`${step.stepOrder}-${originalIndex}`} className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Step {step.stepOrder}</Badge>
                        <span className="text-sm font-medium text-[#334155]">
                          {step.label || `Step ${step.stepOrder}`}
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(originalIndex)}>
                        <Trash2 className="size-4 text-[#dc2626]" />
                      </Button>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <label className="grid gap-2">
                        <Label>Level / Step Order</Label>
                        <Input
                          type="number"
                          min={1}
                          value={step.stepOrder}
                          onChange={(event) =>
                            updateStep(originalIndex, {
                              stepOrder: Number(event.target.value || "1"),
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-2">
                        <Label>Label Step</Label>
                        <Input
                          value={step.label}
                          onChange={(event) => updateStep(originalIndex, { label: event.target.value })}
                          placeholder="Contoh: Foreman Review"
                        />
                      </label>
                      <div className="grid gap-2">
                        <Label>Approval Node</Label>
                        <Select value={step.nodeId || "none"} onValueChange={(value) => updateStep(originalIndex, { nodeId: value === "none" ? "" : value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih node approver" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Tanpa node</SelectItem>
                            {availableNodes.map((node) => (
                              <SelectItem key={node.id} value={node.id.toString()}>
                                {node.label}
                                {node.canApprove ? "" : " • non-approver"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Fallback Node</Label>
                        <Select value={step.fallbackNodeId || "none"} onValueChange={(value) => updateStep(originalIndex, { fallbackNodeId: value === "none" ? "" : value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Fallback bila approver kosong" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Tanpa fallback</SelectItem>
                            {availableNodes.map((node) => (
                              <SelectItem key={node.id} value={node.id.toString()}>
                                {node.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Escalation Node</Label>
                        <Select value={step.escalationNodeId || "none"} onValueChange={(value) => updateStep(originalIndex, { escalationNodeId: value === "none" ? "" : value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escalation target" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Tanpa escalation</SelectItem>
                            {availableNodes.map((node) => (
                              <SelectItem key={node.id} value={node.id.toString()}>
                                {node.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="grid gap-2">
                        <Label>SLA (jam)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={step.slaHours}
                          onChange={(event) =>
                            updateStep(originalIndex, { slaHours: Number(event.target.value || "24") })
                          }
                        />
                      </label>
                      <div className="grid gap-2">
                        <Label>Mode</Label>
                        <Select value={step.approvalMode} onValueChange={(value) => updateStep(originalIndex, { approvalMode: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Mode step" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sequential">Sequential</SelectItem>
                            <SelectItem value="parallel_all">Parallel All</SelectItem>
                            <SelectItem value="parallel_any">Parallel Any-One</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="flex items-center gap-3 rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                        <Switch
                          checked={step.canDelegate}
                          onCheckedChange={(checked) => updateStep(originalIndex, { canDelegate: checked })}
                        />
                        <div>
                          <p className="font-medium text-[#1e293b]">Boleh delegate</p>
                          <p className="text-xs text-[#64748b]">Delegate assignment bisa dipakai bila primary tidak tersedia.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                        <Switch
                          checked={step.isRequired}
                          onCheckedChange={(checked) => updateStep(originalIndex, { isRequired: checked })}
                        />
                        <div>
                          <p className="font-medium text-[#1e293b]">Step wajib</p>
                          <p className="text-xs text-[#64748b]">Pertahankan aktif untuk memastikan step ini tetap dilewati.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.3rem] bg-surface-container-lowest p-5 shadow-[0_12px_24px_rgba(0,52,97,0.06)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#ecfeff] text-[#0f766e]">
                  <WandSparkles className="size-5" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-[#1e293b]">Route Simulator</h4>
                  <p className="text-sm text-[#64748b]">
                    Uji kombinasi karyawan, activity, priority, dan overtime untuk melihat route approval yang akan dipakai engine.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <div className="grid gap-2 lg:col-span-2">
                  <Label>Karyawan</Label>
                  <Select
                    value={simulationForm.employeeId || "none"}
                    onValueChange={(value) =>
                      setSimulationForm((current) => ({
                        ...current,
                        employeeId: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih karyawan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id.toString()}>
                          {employee.name} • {employee.jobTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="grid gap-2">
                  <Label>Activity Type</Label>
                  <Input
                    value={simulationForm.activityType}
                    onChange={(event) =>
                      setSimulationForm((current) => ({ ...current, activityType: event.target.value }))
                    }
                  />
                </label>
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select
                    value={simulationForm.priority}
                    onValueChange={(value) =>
                      setSimulationForm((current) => ({ ...current, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Safety">Safety</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="grid gap-2">
                  <Label>Overtime (menit)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={simulationForm.overtimeMinutes}
                    onChange={(event) =>
                      setSimulationForm((current) => ({
                        ...current,
                        overtimeMinutes: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="flex items-end">
                  <Button type="button" onClick={handleSimulate} className="w-full bg-[#0f766e] hover:bg-[#115e59]">
                    <GitPullRequest className="mr-2 size-4" />
                    Simulasikan
                  </Button>
                </div>
              </div>

              {simulationResult ? (
                <div className="mt-4 rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {simulationResult.status === "success" ? "Route Found" : "Route Error"}
                    </Badge>
                    <p className="text-sm text-[#475569]">{simulationResult.message}</p>
                  </div>

                  {simulationResult.route ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs text-[#64748b]">
                        <Badge variant="outline" className="bg-surface-container-lowest">
                          Matrix: {simulationResult.route.matrixName ?? "Legacy Fallback"}
                        </Badge>
                        <Badge variant="outline" className="bg-surface-container-lowest">
                          Struktur: {simulationResult.route.structureName ?? "N/A"}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {simulationResult.route.steps.map((step: any) => (
                          <div key={`${step.stepOrder}-${step.approverName}`} className="rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-[#1e293b]">
                                  Step {step.stepOrder} • {step.label}
                                </p>
                                <p className="text-sm text-[#64748b]">
                                  {step.approverName} • source {step.resolutionSource}
                                </p>
                              </div>
                              <Badge variant="outline">SLA {step.slaHours} jam</Badge>
                            </div>
                            {(step.fallbackLabel || step.escalationLabel) ? (
                              <p className="mt-2 text-xs text-[#64748b]">
                                Fallback: {step.fallbackLabel || "-"} • Escalation: {step.escalationLabel || "-"}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {simulationResult.route.warnings?.length > 0 ? (
                        <Alert className="border-[#fde68a] bg-[#fffbeb]">
                          <AlertCircle className="size-4 text-[#d97706]" />
                          <AlertDescription className="text-[#92400e]">
                            {simulationResult.route.warnings.join(" ")}
                          </AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
