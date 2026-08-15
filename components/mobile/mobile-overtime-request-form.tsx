"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpeechTextarea as Textarea } from "@/components/ui/speech-textarea";

type LibraryActivity = {
  id: number;
  activityCode: string;
  activityName: string;
  basePoints: number;
};

type SubmitState = {
  status: "idle" | "success" | "error";
  message: string;
  summary?: {
    id: number;
    splNumber: string;
    title: string;
    status: string;
    workDate: string;
    plannedStartAt: string;
    plannedEndAt: string;
    totalMinutes: number;
  };
};

function dateInputValue(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function halfHourInputValue(value = new Date()) {
  const rounded = new Date(Math.ceil(value.getTime() / 1_800_000) * 1_800_000);
  const local = new Date(rounded.getTime() - rounded.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  return `${hours}:${index % 2 === 0 ? "00" : "30"}`;
});

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function plannedDateTime(date: string, time: string, nextDay = false) {
  if (!nextDay) return `${date}T${time}`;
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + 1);
  return `${dateInputValue(value)}T${time}`;
}

const DEFAULT_LIBRARY_ACTIVITIES: LibraryActivity[] = [
  { id: 101, activityCode: "ACT-01", activityName: "Perbaikan & Maintenance Unit Operasional", basePoints: 15 },
  { id: 102, activityCode: "ACT-02", activityName: "Pemeriksaan / Inspeksi Ban (Tire Inspection)", basePoints: 15 },
  { id: 103, activityCode: "ACT-03", activityName: "Pengawalan Heavy Equipment / Moving Unit", basePoints: 20 },
  { id: 104, activityCode: "ACT-04", activityName: "Support Team Shift / Standby Breakdown Unit", basePoints: 15 },
  { id: 105, activityCode: "ACT-05", activityName: "Pekerjaan Emergency / Handling Trouble Unit", basePoints: 25 },
  { id: 106, activityCode: "ACT-06", activityName: "Stock Opname / Inventory Check Workshop", basePoints: 10 },
  { id: 107, activityCode: "ACT-99", activityName: "Pekerjaan Custom / Aktivitas Khusus", basePoints: 10 },
];

export function MobileOvertimeRequestForm({
  action,
  libraryActivities,
  submitLabel,
  currentEmployeeId,
  parentSplId,
}: {
  action: (previousState: SubmitState, formData: FormData) => Promise<SubmitState>;
  libraryActivities: LibraryActivity[];
  submitLabel: string;
  currentEmployeeId: number;
  parentSplId?: number;
}) {
  const activeLibraryActivities = useMemo(
    () => (libraryActivities && libraryActivities.length > 0 ? libraryActivities : DEFAULT_LIBRARY_ACTIVITIES),
    [libraryActivities],
  );

  const draftKey = `hero-spl-self-${currentEmployeeId}-${parentSplId ?? "base"}`;
  const formRef = useRef<HTMLFormElement>(null);
  const [submitState, formAction, isPending] = useActionState(action, { status: "idle", message: "" } satisfies SubmitState);
  const [createAnother, setCreateAnother] = useState(false);
  const [workDate, setWorkDate] = useState(dateInputValue());
  const [startTime, setStartTime] = useState(halfHourInputValue().slice(11));
  const [endTime, setEndTime] = useState(halfHourInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)).slice(11));
  const [description, setDescription] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const selectedActivity = useMemo(
    () => activeLibraryActivities.find((activity) => String(activity.id) === selectedActivityId),
    [activeLibraryActivities, selectedActivityId],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) ?? "null") as {
        selectedActivityId?: string;
        fields?: Record<string, string>;
      } | null;
      setSelectedActivityId(saved?.selectedActivityId ?? "");
      setDescription(saved?.fields?.requestNotes ?? "");
      setWorkDate(saved?.fields?.workDate ?? dateInputValue());
      setStartTime(saved?.fields?.plannedStartAt?.slice(11, 16) ?? halfHourInputValue().slice(11));
      setEndTime(saved?.fields?.plannedEndAt?.slice(11, 16) ?? halfHourInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)).slice(11));
      requestAnimationFrame(() => {
        if (!formRef.current || !saved?.fields) return;
        for (const [name, value] of Object.entries(saved.fields)) {
          if (["workDate", "plannedStartAt", "plannedEndAt", "requestNotes"].includes(name)) continue;
          const field = formRef.current.elements.namedItem(name);
          if (field instanceof HTMLInputElement) field.value = value;
        }
      });
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    if (submitState.status !== "success") return;
    localStorage.removeItem(draftKey);
    setCreateAnother(false);
  }, [draftKey, submitState]);

  function persistDraft() {
    if (!formRef.current) return;
    const fields = Object.fromEntries(
      [...new FormData(formRef.current).entries()]
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .filter(([name]) => name !== "lineItemsJson"),
    );
    localStorage.setItem(draftKey, JSON.stringify({ selectedActivityId, fields }));
  }

  const lineItemsJson = JSON.stringify(
    description.trim()
      ? [{
          assignedEmployeeId: currentEmployeeId,
          routeTemplateId: null,
          routeItemId: null,
          libraryActivityId: selectedActivity?.id ?? null,
          lineLabel: (selectedActivity?.activityName ?? description.trim()).slice(0, 160),
          lineDescription: description.trim(),
          targetUnit: "",
          estimatedMinutes: 60,
          plannedPoints: selectedActivity?.basePoints ?? 0,
          isCustomLine: !selectedActivity,
          sortOrder: 1,
        }]
      : [],
  );
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const totalMinutes = endMinutes === startMinutes
    ? 0
    : endMinutes > startMinutes
      ? endMinutes - startMinutes
      : 1_440 - startMinutes + endMinutes;
  const totalHours = (totalMinutes / 60).toLocaleString("id-ID", { maximumFractionDigits: 1 });

  if (submitState.status === "success" && submitState.summary && !createAnother) {
    const summary = submitState.summary;
    const totalHours = (summary.totalMinutes / 60).toLocaleString("id-ID", { maximumFractionDigits: 1 });
    const dateTime = (value: string) => new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    return (
      <section className="space-y-4 rounded-[1.25rem] bg-[#f6fbff] p-4">
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em]">Sudah Diajukan</p>
            <p className="mt-1 text-sm font-semibold">SPL berhasil masuk ke proses approval.</p>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl bg-white p-4 text-sm">
          <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Nomor SPL</p><p className="font-black text-[#003f78]">{summary.splNumber}</p></div>
          <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Judul</p><p className="font-semibold text-[#082033]">{summary.title}</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Waktu</p><p className="font-semibold text-[#082033]">{dateTime(summary.plannedStartAt)}–{dateTime(summary.plannedEndAt)}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Total</p><p className="font-semibold text-[#082033]">{totalHours} jam</p></div>
          </div>
          <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Status</p><p className="font-black capitalize text-amber-700">{summary.status}</p></div>
        </div>
        <Button type="button" onClick={() => setCreateAnother(true)} variant="outline" className="h-12 w-full rounded-xl bg-white">
          Buat Pengajuan Baru
        </Button>
      </section>
    );
  }

  return (
    <form ref={formRef} action={formAction} onInput={persistDraft} className="space-y-4">
      <input type="hidden" name="intent" value="create" />
      <input type="hidden" name="status" value="draft" />
      <input type="hidden" name="origin" value="employee_request" />
      <input type="hidden" name="requestKind" value={parentSplId ? "extension" : "base"} />
      <input type="hidden" name="parentSplId" value={parentSplId ?? ""} />
      <input type="hidden" name="submitNow" value="true" />
      <input type="hidden" name="executionNotes" value="" />
      <input type="hidden" name="plannedStartAt" value={plannedDateTime(workDate, startTime)} />
      <input type="hidden" name="plannedEndAt" value={plannedDateTime(workDate, endTime, endMinutes < startMinutes)} />
      <input type="hidden" name="lineItemsJson" value={lineItemsJson} />

      <section className="space-y-4 rounded-[1.25rem] bg-[#f6fbff] p-4">
        {submitState.status === "error" ? (
          <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{submitState.message}</p>
        ) : null}
        <Label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Judul</span>
          <Input name="title" required placeholder="Contoh: Support breakdown unit" className="h-12 rounded-2xl border-0 bg-white px-4" />
        </Label>

        <Label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Tanggal</span>
          <Input name="workDate" type="date" required value={workDate} onChange={(event) => setWorkDate(event.target.value)} className="h-12 rounded-2xl border-0 bg-white px-4" />
        </Label>

        <div className="grid grid-cols-2 gap-3">
          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Mulai</span>
            <select value={startTime} onChange={(event) => setStartTime(event.target.value)} aria-label="Jam mulai" className="h-12 w-full rounded-2xl border-0 bg-white px-3 text-sm text-[#082033]">
              {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
          </Label>
          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Selesai</span>
            <select value={endTime} onChange={(event) => setEndTime(event.target.value)} aria-label="Jam selesai" className="h-12 w-full rounded-2xl border-0 bg-white px-3 text-sm text-[#082033]">
              {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
          </Label>
        </div>

        <div className="rounded-2xl bg-[#eaf4fb] px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Total Lembur</p>
          <p className="mt-1 text-lg font-black text-[#003f78]">{totalHours} jam</p>
        </div>

        <Label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Deskripsi Pekerjaan</span>
          <select
            value={selectedActivityId}
            onChange={(event) => {
              const activity = activeLibraryActivities.find((item) => String(item.id) === event.target.value);
              setSelectedActivityId(event.target.value);
              if (activity) setDescription(activity.activityName);
            }}
            className="h-12 w-full rounded-2xl border-0 bg-white px-4 text-sm text-[#486275]"
            aria-label="Pilih dari Daily Activity"
          >
            <option value="">Pilih dari Daily Activity (opsional)</option>
            {activeLibraryActivities.map((activity) => (
              <option key={activity.id} value={activity.id}>{activity.activityCode} · {activity.activityName}</option>
            ))}
          </select>
          <Textarea
            name="requestNotes"
            rows={4}
            required
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setSelectedActivityId("");
            }}
            placeholder="Jelaskan pekerjaan yang akan dilakukan."
            className="rounded-2xl border-0 bg-white px-4 py-3"
          />
        </Label>

        <details className="rounded-2xl bg-white px-4 py-3">
          <summary className="cursor-pointer text-xs font-bold text-[#486275]">Perlu OFF pengganti?</summary>
          <Label className="mt-3 block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Tanggal OFF pengganti</span>
            <Input name="replacementOffDate" type="date" className="h-12 rounded-xl bg-[#f6fbff]" />
          </Label>
        </details>
      </section>

      <div className="sticky bottom-20 z-10 rounded-2xl bg-white/95 p-2 shadow-[0_12px_30px_rgba(8,32,51,0.18)] backdrop-blur">
        <Button type="submit" disabled={isPending || !description.trim() || totalMinutes === 0} className="h-14 w-full rounded-xl bg-[#003f78] text-white">
          <Check className="size-4" /> {isPending ? "Mengajukan..." : parentSplId ? "Ajukan Extend" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
