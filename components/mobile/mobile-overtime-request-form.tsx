"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Plus,
  RotateCcw,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { createOvertimeCommandLetterAction } from "@/app/dashboard/overtime-requests/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SpeechTextarea as Textarea } from "@/components/ui/speech-textarea";
import { resolveEmployeeApproverHierarchy, type EmployeeHierarchyInfo } from "@/lib/overtime-hierarchy";

export type EmployeeOption = EmployeeHierarchyInfo;

type WorkerRow = {
  employeeId: string;
  shiftCode: string;
  rosterType: string;
  category: string;
};

type LineItemRow = {
  lineLabel: string;
  targetUnit: string;
  estimatedMinutes: number;
  plannedPoints: number;
};

function dateInputValue(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const SPL_PRESETS = [
  { name: "Overtime Pemasangan & Dismounting Tyre OTR", unit: "1 Unit HD", dur: 120, pts: 10 },
  { name: "Emergency Callout Breakdown Unit Lapangan", unit: "1 Unit", dur: 180, pts: 15 },
  { name: "Perbaikan Struktur Curing Ban Workshop", unit: "2 Tyre", dur: 90, pts: 10 },
  { name: "Inspection & Tyre Maintenance Overtime", unit: "4 Unit", dur: 60, pts: 5 },
];

function formatPtwTime(value: Date | string | null | undefined) {
  if (!value) return "17:00";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "17:00";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
}

export function MobileOvertimeRequestForm({
  employees = [],
  currentEmployee,
  parentSplId,
  initialSplData,
}: {
  employees: EmployeeOption[];
  currentEmployee?: EmployeeOption | null;
  parentSplId?: number;
  initialSplData?: any;
}) {
  const router = useRouter();

  const doc = initialSplData?.document;
  const initialTargetId = doc?.requestedByEmployeeId || currentEmployee?.id || employees[0]?.id;
  const initialHierarchy = initialTargetId
    ? resolveEmployeeApproverHierarchy(initialTargetId, employees)
    : { leader: null, superior: null, department: "Central Services" };

  const [title, setTitle] = useState(
    doc?.title ? (parentSplId ? `Extension ${doc.title}` : doc.title) : (parentSplId ? "Extension SPL Lembur" : "")
  );
  const [workDate, setWorkDate] = useState(
    doc?.workDate ? dateInputValue(new Date(doc.workDate)) : dateInputValue()
  );
  const [plannedStartDate, setPlannedStartDate] = useState(
    doc?.plannedStartAt ? dateInputValue(new Date(doc.plannedStartAt)) : dateInputValue()
  );
  const [plannedStartTime, setPlannedStartTime] = useState(
    doc?.plannedStartAt ? formatPtwTime(new Date(doc.plannedStartAt)) : "17:00"
  );
  const [plannedEndDate, setPlannedEndDate] = useState(
    doc?.plannedEndAt ? dateInputValue(new Date(doc.plannedEndAt)) : dateInputValue()
  );
  const [plannedEndTime, setPlannedEndTime] = useState(
    doc?.plannedEndAt ? formatPtwTime(new Date(doc.plannedEndAt)) : "20:00"
  );
  const [requesterEmployeeId, setRequesterEmployeeId] = useState(
    doc?.requestedByEmployeeId ? String(doc.requestedByEmployeeId) : (currentEmployee?.id ? String(currentEmployee.id) : "")
  );
  const [requesterDepartment, setRequesterDepartment] = useState(
    doc?.department || initialHierarchy.department || currentEmployee?.department || "Central Services"
  );
  const [requestNotes, setRequestNotes] = useState(doc?.requestNotes || "");

  const [leaderEmployeeId, setLeaderEmployeeId] = useState(
    initialHierarchy.leader?.id ? String(initialHierarchy.leader.id) : ""
  );
  const [leaderName, setLeaderName] = useState(initialHierarchy.leader?.name || "");
  const [superiorEmployeeId, setSuperiorEmployeeId] = useState(
    initialHierarchy.superior?.id ? String(initialHierarchy.superior.id) : ""
  );
  const [superiorName, setSuperiorName] = useState(initialHierarchy.superior?.name || "");

  const [workers, setWorkers] = useState<WorkerRow[]>(() => {
    if (initialSplData?.participants && initialSplData.participants.length > 0) {
      return initialSplData.participants.map((p: any) => ({
        employeeId: String(p.employeeId),
        shiftCode: p.shiftCode || "DS",
        rosterType: p.rosterType || "5:2",
        category: p.category || "after_mandatory_ot",
      }));
    }
    return [
      {
        employeeId: currentEmployee?.id ? String(currentEmployee.id) : "",
        shiftCode: "DS",
        rosterType: "5:2",
        category: "after_mandatory_ot",
      },
    ];
  });

  const [lineItems, setLineItems] = useState<LineItemRow[]>(() => {
    if (initialSplData?.lineItems && initialSplData.lineItems.length > 0) {
      return initialSplData.lineItems.map((l: any) => ({
        lineLabel: l.lineLabel || "",
        targetUnit: l.targetUnit || "",
        estimatedMinutes: Number(l.estimatedMinutes) || 60,
        plannedPoints: Number(l.plannedPoints) || 5,
      }));
    }
    return [
      {
        lineLabel: "Overtime Pemasangan & Dismounting Tyre OTR",
        targetUnit: "1 Unit HD",
        estimatedMinutes: 120,
        plannedPoints: 10,
      },
    ];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{
    splNumber: string;
    title: string;
    workDate: string;
    totalMinutes: number;
    workerCount: number;
  } | null>(null);

  function applyHierarchy(empId: string | number) {
    if (!empId) return;
    const hierarchy = resolveEmployeeApproverHierarchy(empId, employees);
    if (hierarchy.department) {
      setRequesterDepartment(hierarchy.department);
    }
    if (hierarchy.leader) {
      setLeaderEmployeeId(String(hierarchy.leader.id));
      setLeaderName(hierarchy.leader.name);
    }
    if (hierarchy.superior) {
      setSuperiorEmployeeId(String(hierarchy.superior.id));
      setSuperiorName(hierarchy.superior.name);
    }
  }

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: String(e.id),
        label: `${e.name}${e.position ? ` — ${e.position}` : ""}${e.department ? ` (${e.department})` : ""}`,
      })),
    [employees]
  );

  const totalEstimatedMinutes = useMemo(
    () => lineItems.reduce((sum, item) => sum + (Number(item.estimatedMinutes) || 0), 0),
    [lineItems]
  );

  function addWorkerRow() {
    setWorkers((prev) => [
      ...prev,
      {
        employeeId: "",
        shiftCode: "DS",
        rosterType: "5:2",
        category: "after_mandatory_ot",
      },
    ]);
  }

  function updateWorker(index: number, field: keyof WorkerRow, value: string) {
    setWorkers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

    if (field === "employeeId" && value) {
      if (index === 0 && (!requesterEmployeeId || requesterEmployeeId === workers[0]?.employeeId)) {
        setRequesterEmployeeId(value);
        applyHierarchy(value);
      } else if (!leaderEmployeeId || !superiorEmployeeId) {
        applyHierarchy(value);
      }
    }
  }

  function removeWorker(index: number) {
    if (workers.length <= 1) return;
    setWorkers((prev) => prev.filter((_, idx) => idx !== index));
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        lineLabel: "",
        targetUnit: "",
        estimatedMinutes: 60,
        plannedPoints: 5,
      },
    ]);
  }

  function addPresetLineItem(preset: (typeof SPL_PRESETS)[number]) {
    setLineItems((prev) => [
      ...prev,
      {
        lineLabel: preset.name,
        targetUnit: preset.unit,
        estimatedMinutes: preset.dur,
        plannedPoints: preset.pts,
      },
    ]);
    toast.success(`Preset "${preset.name}" ditambahkan.`);
  }

  function updateLineItem(index: number, field: keyof LineItemRow, value: any) {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Mohon isi judul / keperluan lembur.");
      return;
    }

    const validWorkers = workers.filter((w) => Boolean(w.employeeId));
    if (validWorkers.length === 0) {
      toast.error("Mohon pilih minimal 1 peserta lembur.");
      return;
    }

    const validItems = lineItems.filter((item) => Boolean(item.lineLabel.trim()));
    if (validItems.length === 0) {
      toast.error("Mohon isi minimal 1 aktivitas pekerjaan lembur.");
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = `${plannedStartDate}T${plannedStartTime}`;
      const endDateTime = `${plannedEndDate}T${plannedEndTime}`;

      const res = await createOvertimeCommandLetterAction({
        title: title.trim(),
        workDate,
        plannedStartAt: startDateTime,
        plannedEndAt: endDateTime,
        requestedByEmployeeId: Number(requesterEmployeeId) || currentEmployee?.id || null,
        requestNotes: requestNotes.trim(),
        workerParticipants: validWorkers.map((w) => ({
          employeeId: Number(w.employeeId),
          shiftCode: w.shiftCode,
          rosterType: w.rosterType,
          category: w.category,
        })),
        lineItems: validItems.map((item) => ({
          lineLabel: item.lineLabel.trim(),
          targetUnit: item.targetUnit.trim(),
          estimatedMinutes: Number(item.estimatedMinutes) || 60,
          plannedPoints: Number(item.plannedPoints) || 0,
        })),
        leaderEmployeeId: leaderEmployeeId ? Number(leaderEmployeeId) : null,
        leaderName: leaderName || null,
        superiorEmployeeId: superiorEmployeeId ? Number(superiorEmployeeId) : null,
        superiorName: superiorName || null,
      });

      if (!res.success) {
        toast.error((res as any).error || "Gagal membuat SPL.");
        return;
      }

      toast.success("Surat Perintah Lembur (SPL) berhasil diajukan!");
      setSubmittedSummary({
        splNumber: (res as any).splNumber || "SPL-Baru",
        title: title.trim(),
        workDate,
        totalMinutes: totalEstimatedMinutes,
        workerCount: validWorkers.length,
      });
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Terjadi kesalahan saat mengajukan SPL.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedSummary) {
    return (
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm border border-slate-100 text-slate-900">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
              SPL Berhasil Diajukan
            </p>
            <p className="mt-1 text-sm font-semibold">
              Dokumen telah diteruskan ke alur verifikasi & approval atasan.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nomor SPL</p>
            <p className="font-bold text-[#003461] text-sm">{submittedSummary.splNumber}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Judul Lembur</p>
            <p className="font-semibold text-slate-800">{submittedSummary.title}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Peserta</p>
              <p className="font-semibold text-slate-800">{submittedSummary.workerCount} Karyawan</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Durasi</p>
              <p className="font-semibold text-slate-800">{submittedSummary.totalMinutes} Menit</p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => {
            setSubmittedSummary(null);
            setTitle("");
            setRequestNotes("");
          }}
          className="w-full h-12 rounded-xl bg-[#003461] text-white hover:bg-[#00274a] font-bold text-xs"
        >
          Buat SPL Baru
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {parentSplId ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 text-xs shadow-xs">
          <RotateCcw className="size-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Mode Revisi / Extension SPL #{parentSplId}</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Anda sedang membuat atau memperbarui pengajuan SPL berdasarkan rujukan SPL #{parentSplId}.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── 1. Details & Request Profile ── */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px]">
              F.HC.SPL
            </span>
            <p className="text-xs font-bold text-slate-800">1. Header & Jadwal Lembur</p>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold text-teal-700 bg-teal-50 border-teal-200">
            Official Document
          </Badge>
        </div>

        <div className="space-y-3 text-xs">
          <Label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700">Judul / Keperluan Lembur *</span>
            <Input
              required
              placeholder="Contoh: Overtime Pemasangan Tyre OTR Unit HD-785..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs font-medium"
            />
          </Label>

          <div className="grid grid-cols-2 gap-3">
            <Label className="block space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700">Tanggal Pekerjaan *</span>
              <Input
                type="date"
                required
                value={workDate}
                onChange={(e) => {
                  setWorkDate(e.target.value);
                  setPlannedStartDate(e.target.value);
                  setPlannedEndDate(e.target.value);
                }}
                className="h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs"
              />
            </Label>

            <Label className="block space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700">Departemen</span>
              <Input
                value={requesterDepartment}
                onChange={(e) => setRequesterDepartment(e.target.value)}
                placeholder="Central Services"
                className="h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs"
              />
            </Label>
          </div>

          <Label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700">Pemohon (Requester)</span>
            <SearchableSelect
              label="Pemohon"
              placeholder="PILIH PEMOHON..."
              value={requesterEmployeeId}
              onValueChange={(val) => {
                setRequesterEmployeeId(val);
                applyHierarchy(val);
              }}
              options={employeeOptions}
              widthClassName="w-full"
            />
          </Label>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700">Mulai (Start) *</span>
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={plannedStartDate}
                  onChange={(e) => setPlannedStartDate(e.target.value)}
                  className="h-9 rounded-lg bg-slate-50/70 border-slate-200 text-[11px] w-3/5 px-1.5"
                />
                <Input
                  type="time"
                  value={plannedStartTime}
                  onChange={(e) => setPlannedStartTime(e.target.value)}
                  className="h-9 rounded-lg bg-slate-50/70 border-slate-200 text-[11px] w-2/5 px-1.5 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700">Selesai (End) *</span>
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                  className="h-9 rounded-lg bg-slate-50/70 border-slate-200 text-[11px] w-3/5 px-1.5"
                />
                <Input
                  type="time"
                  value={plannedEndTime}
                  onChange={(e) => setPlannedEndTime(e.target.value)}
                  className="h-9 rounded-lg bg-slate-50/70 border-slate-200 text-[11px] w-2/5 px-1.5 font-semibold"
                />
              </div>
            </div>
          </div>

          <Label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700">Alasan Lembur & Instruksi</span>
            <Textarea
              rows={3}
              placeholder="Instruksi operasional, area kerja, SPK terkait, atau alasan lembur..."
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              className="rounded-xl bg-slate-50/70 border-slate-200 text-xs p-3"
            />
          </Label>
        </div>
      </section>

      {/* ── 2. Section A: Workers (Peserta Lembur) ── */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-600"></span>
            <p className="text-xs font-bold text-slate-800">A. Workers (Peserta Lembur)</p>
          </div>
          <Badge className="bg-blue-50 text-blue-700 border-0 font-bold text-[10px]">
            {workers.filter((w) => Boolean(w.employeeId)).length} Peserta
          </Badge>
        </div>

        <div className="space-y-3">
          {workers.map((worker, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">Peserta #{idx + 1}</span>
                {workers.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeWorker(idx)}
                    className="size-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              <div>
                <SearchableSelect
                  label="Worker"
                  placeholder="PILIH WORKER..."
                  value={worker.employeeId}
                  onValueChange={(val) => updateWorker(idx, "employeeId", val)}
                  options={employeeOptions}
                  widthClassName="w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Shift</span>
                  <select
                    value={worker.shiftCode}
                    onChange={(e) => updateWorker(idx, "shiftCode", e.target.value)}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium"
                  >
                    <option value="DS">DS (Day)</option>
                    <option value="NS">NS (Night)</option>
                    <option value="ALL">ALL</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Roster</span>
                  <select
                    value={worker.rosterType}
                    onChange={(e) => updateWorker(idx, "rosterType", e.target.value)}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium"
                  >
                    <option value="5:2">5:2</option>
                    <option value="6:1">6:1</option>
                    <option value="10:2">10:2</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Kategori</span>
                  <select
                    value={worker.category}
                    onChange={(e) => updateWorker(idx, "category", e.target.value)}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-medium"
                  >
                    <option value="after_mandatory_ot">Mandatory OT</option>
                    <option value="off_day_ot">Off Day OT</option>
                    <option value="emergency_callout">Emergency</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addWorkerRow}
            className="w-full h-9 rounded-xl border-dashed border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-xs font-semibold gap-1.5"
          >
            <UserPlus className="size-3.5 text-slate-500" /> Tambah Peserta Lembur
          </Button>
        </div>
      </section>

      {/* ── 3. Section B: Line Items (Aktivitas Pekerjaan) ── */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-600"></span>
            <p className="text-xs font-bold text-slate-800">B. Line Items (Aktivitas Pekerjaan)</p>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border-0 font-bold text-[10px]">
            {lineItems.length} Aktivitas • {totalEstimatedMinutes} Mnt
          </Badge>
        </div>



        <div className="space-y-3">
          {lineItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">Aktivitas #{idx + 1}</span>
                {lineItems.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLineItem(idx)}
                    className="size-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">
                  Uraian Aktivitas Pekerjaan *
                </span>
                <Input
                  required
                  placeholder="Nama aktivitas pekerjaan..."
                  value={item.lineLabel}
                  onChange={(e) => updateLineItem(idx, "lineLabel", e.target.value)}
                  className="h-9 rounded-lg bg-white border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Target / Unit</span>
                  <Input
                    placeholder="e.g. 1 Unit HD"
                    value={item.targetUnit}
                    onChange={(e) => updateLineItem(idx, "targetUnit", e.target.value)}
                    className="h-8 rounded-lg bg-white border-slate-200 text-[11px]"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Durasi (Mnt)</span>
                  <Input
                    type="number"
                    min={15}
                    value={item.estimatedMinutes}
                    onChange={(e) => updateLineItem(idx, "estimatedMinutes", Number(e.target.value))}
                    className="h-8 rounded-lg bg-white border-slate-200 text-[11px] font-semibold text-center"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Poin</span>
                  <Input
                    type="number"
                    min={0}
                    value={item.plannedPoints}
                    onChange={(e) => updateLineItem(idx, "plannedPoints", Number(e.target.value))}
                    className="h-8 rounded-lg bg-white border-slate-200 text-[11px] font-bold text-center"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
            className="w-full h-9 rounded-xl border-dashed border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-xs font-semibold gap-1.5"
          >
            <Plus className="size-3.5 text-slate-500" /> Tambah Baris Aktivitas
          </Button>
        </div>
      </section>

      {/* ── 4. Section C: Signatories & Verification Matrix ── */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-600"></span>
            <p className="text-xs font-bold text-slate-800">
              C. Penandatangan Approval (Signatories)
            </p>
          </div>
          <Badge className="bg-amber-50 text-amber-700 border-0 font-bold text-[10px]">
            2-Tier Verification
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
              Leader / Supervisor (Tahap 1)
            </span>
            <SearchableSelect
              label="Leader"
              placeholder="PILIH LEADER..."
              value={leaderEmployeeId}
              onValueChange={(val) => {
                setLeaderEmployeeId(val);
                const emp = employees.find((e) => String(e.id) === val);
                setLeaderName(emp?.name || "");
              }}
              options={employeeOptions}
              widthClassName="w-full"
            />
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
              Superior / Section Head (Tahap 2)
            </span>
            <SearchableSelect
              label="Section Head"
              placeholder="PILIH SECTION HEAD..."
              value={superiorEmployeeId}
              onValueChange={(val) => {
                setSuperiorEmployeeId(val);
                const emp = employees.find((e) => String(e.id) === val);
                setSuperiorName(emp?.name || "");
              }}
              options={employeeOptions}
              widthClassName="w-full"
            />
          </div>
        </div>
      </section>

      {/* ── Bottom Sticky Action Bar ── */}
      <div className="sticky bottom-20 z-10 rounded-2xl bg-white/95 p-3 shadow-lg border border-slate-200/80 backdrop-blur">
        <Button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="w-full h-12 rounded-xl bg-[#003461] hover:bg-[#00274a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
        >
          <Check className="size-4" />
          {isSubmitting ? "Menyimpan & Mengajukan..." : "AJUKAN SURAT PERINTAH LEMBUR (SPL)"}
        </Button>
      </div>
    </form>
  );
}
