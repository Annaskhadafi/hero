"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ClipboardList, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpeechTextarea as Textarea } from "@/components/ui/speech-textarea";

type LibraryActivity = {
  id: number;
  activityCode: string;
  activityName: string;
  basePoints: number;
};

type CustomJob = {
  key: string;
  lineLabel: string;
  lineDescription: string;
  targetUnit: string;
  estimatedMinutes: string;
};

function newCustomJob(): CustomJob {
  return {
    key: crypto.randomUUID(),
    lineLabel: "",
    lineDescription: "",
    targetUnit: "",
    estimatedMinutes: "60",
  };
}

function dateInputValue(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dateTimeInputValue(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function MobileOvertimeRequestForm({
  action,
  libraryActivities,
  submitLabel,
  currentEmployeeId,
  parentSplId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  libraryActivities: LibraryActivity[];
  submitLabel: string;
  currentEmployeeId: number;
  parentSplId?: number;
}) {
  const draftKey = `hero-spl-self-${currentEmployeeId}-${parentSplId ?? "base"}`;
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [customJobs, setCustomJobs] = useState<CustomJob[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) ?? "null") as {
        selectedLibraryIds?: string[];
        customJobs?: CustomJob[];
        fields?: Record<string, string>;
      } | null;
      setSelectedLibraryIds(saved?.selectedLibraryIds ?? []);
      setCustomJobs(saved?.customJobs ?? []);
      requestAnimationFrame(() => {
        if (!formRef.current || !saved?.fields) return;
        for (const [name, value] of Object.entries(saved.fields)) {
          const field = formRef.current.elements.namedItem(name);
          if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.value = value;
        }
      });
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  function persistDraft() {
    const fields = formRef.current
      ? Object.fromEntries(
          [...new FormData(formRef.current).entries()]
            .filter((entry): entry is [string, string] => typeof entry[1] === "string")
            .filter(([name]) => name !== "lineItemsJson"),
        )
      : {};
    localStorage.setItem(draftKey, JSON.stringify({ selectedLibraryIds, customJobs, fields }));
  }

  useEffect(() => {
    persistDraft();
  }, [selectedLibraryIds, customJobs]);

  const selectedLibraries = useMemo(
    () => libraryActivities.filter((activity) => selectedLibraryIds.includes(String(activity.id))),
    [libraryActivities, selectedLibraryIds],
  );
  const validCustomJobs = customJobs.filter((job) => job.lineLabel.trim());
  const activityCount = selectedLibraries.length + validCustomJobs.length;
  const filteredLibraries = libraryActivities.filter((activity) =>
    `${activity.activityCode} ${activity.activityName}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const lineItemsJson = JSON.stringify([
    ...selectedLibraries.map((activity) => ({
      assignedEmployeeId: currentEmployeeId,
      routeTemplateId: null,
      routeItemId: null,
      libraryActivityId: activity.id,
      lineLabel: activity.activityName,
      lineDescription: `Checklist library ${activity.activityCode}`,
      targetUnit: "",
      estimatedMinutes: 60,
      plannedPoints: activity.basePoints,
      isCustomLine: false,
    })),
    ...validCustomJobs.map((job) => ({
      assignedEmployeeId: currentEmployeeId,
      routeTemplateId: null,
      routeItemId: null,
      libraryActivityId: null,
      lineLabel: job.lineLabel,
      lineDescription: job.lineDescription,
      targetUnit: job.targetUnit,
      estimatedMinutes: Number(job.estimatedMinutes || 60),
      plannedPoints: 0,
      isCustomLine: true,
    })),
  ].map((line, index) => ({ ...line, sortOrder: index + 1 })));

  function toggleLibrary(id: string) {
    setSelectedLibraryIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function updateCustom(key: string, patch: Partial<CustomJob>) {
    setCustomJobs((current) => current.map((job) => (job.key === key ? { ...job, ...patch } : job)));
  }

  async function submit(formData: FormData) {
    await action(formData);
    localStorage.removeItem(draftKey);
  }

  return (
    <>
      <form ref={formRef} action={submit} onInput={persistDraft} className="space-y-4">
        <input type="hidden" name="intent" value="create" />
        <input type="hidden" name="status" value="draft" />
        <input type="hidden" name="origin" value="employee_request" />
        <input type="hidden" name="requestKind" value={parentSplId ? "extension" : "base"} />
        <input type="hidden" name="parentSplId" value={parentSplId ?? ""} />
        <input type="hidden" name="submitNow" value="true" />
        <input type="hidden" name="executionNotes" value="" />
        <input type="hidden" name="lineItemsJson" value={lineItemsJson} />

        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">
          <div className="rounded-xl bg-[#eaf4fb] px-2 py-3 text-[#003f78]">1 · Waktu</div>
          <div className="rounded-xl bg-[#eaf4fb] px-2 py-3 text-[#003f78]">2 · Aktivitas</div>
          <div className="rounded-xl bg-[#eaf4fb] px-2 py-3 text-[#003f78]">3 · Kirim</div>
        </div>

        <section className="space-y-4 rounded-[1.25rem] bg-[#f6fbff] p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Langkah 1</p>
            <p className="mt-1 text-base font-black text-[#082033]">Kapan Anda lembur?</p>
          </div>

          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Judul singkat</span>
            <Input name="title" required placeholder="Contoh: Support breakdown unit" className="h-12 rounded-2xl border-0 bg-white px-4" />
          </Label>

          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Tanggal kerja</span>
            <Input name="workDate" type="date" required defaultValue={dateInputValue()} className="h-12 rounded-2xl border-0 bg-white px-4" />
          </Label>

          <div className="grid grid-cols-2 gap-3">
            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Mulai</span>
              <Input name="plannedStartAt" type="datetime-local" required defaultValue={dateTimeInputValue()} className="h-12 rounded-2xl border-0 bg-white px-3 text-xs" />
            </Label>
            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Selesai</span>
              <Input name="plannedEndAt" type="datetime-local" required defaultValue={dateTimeInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000))} className="h-12 rounded-2xl border-0 bg-white px-3 text-xs" />
            </Label>
          </div>

          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Alasan lembur</span>
            <Textarea name="requestNotes" rows={3} required placeholder="Jelaskan alasan dan target pekerjaan." className="rounded-2xl border-0 bg-white px-4 py-3" />
          </Label>

          <details className="rounded-2xl bg-white px-4 py-3">
            <summary className="cursor-pointer text-xs font-bold text-[#486275]">Perlu OFF pengganti?</summary>
            <Label className="mt-3 block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Tanggal OFF pengganti</span>
              <Input name="replacementOffDate" type="date" className="h-12 rounded-xl bg-[#f6fbff]" />
            </Label>
          </details>
        </section>

        <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Langkah 2</p>
              <p className="mt-1 text-base font-black text-[#082033]">Apa yang Anda kerjakan?</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} className="h-11 rounded-xl">
              <ClipboardList className="size-4" /> Pilih
            </Button>
          </div>

          {selectedLibraries.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f6fbff] px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#082033]">{activity.activityName}</p>
                <p className="text-[10px] font-bold text-[#486275]">{activity.activityCode}</p>
              </div>
              <button type="button" onClick={() => toggleLibrary(String(activity.id))} aria-label={`Hapus ${activity.activityName}`} className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-rose-600">
                <X className="size-4" />
              </button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={() => setCustomJobs((current) => [...current, newCustomJob()])} className="h-11 w-full rounded-xl border-dashed">
            <Plus className="size-4" /> Aktivitas tidak ada di daftar
          </Button>

          {customJobs.map((job, index) => (
            <div key={job.key} className="space-y-3 rounded-xl bg-[#fff8e8] p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#5a2200]">Aktivitas custom {index + 1}</p>
                <button type="button" onClick={() => setCustomJobs((current) => current.filter((item) => item.key !== job.key))} aria-label="Hapus aktivitas custom" className="grid size-10 place-items-center rounded-full bg-white text-rose-600"><Trash2 className="size-4" /></button>
              </div>
              <Input value={job.lineLabel} onChange={(event) => updateCustom(job.key, { lineLabel: event.target.value })} placeholder="Nama aktivitas" className="h-12 rounded-xl border-0 bg-white" />
              <Textarea value={job.lineDescription} onChange={(event) => updateCustom(job.key, { lineDescription: event.target.value })} rows={2} placeholder="Deskripsi singkat" className="rounded-xl border-0 bg-white" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={job.targetUnit} onChange={(event) => updateCustom(job.key, { targetUnit: event.target.value })} placeholder="Area / unit" className="h-12 rounded-xl border-0 bg-white" />
                <Input type="number" min={60} value={job.estimatedMinutes} onChange={(event) => updateCustom(job.key, { estimatedMinutes: event.target.value })} placeholder="Menit" className="h-12 rounded-xl border-0 bg-white" />
              </div>
            </div>
          ))}

          {activityCount === 0 ? <p className="rounded-xl bg-[#fff8e8] px-4 py-3 text-sm font-semibold text-[#8a5a00]">Pilih minimal satu aktivitas.</p> : null}
        </section>

        <section className="rounded-[1.25rem] bg-[#eaf4fb] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Langkah 3</p>
          <p className="mt-1 font-black text-[#082033]">Siap diajukan</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#486275]">
            {activityCount} aktivitas dipilih. Shift, roster, kategori SPL, H+2, overlap, dan jalur approval dicek otomatis saat dikirim.
          </p>
          <p className="mt-2 rounded-xl bg-white px-3 py-3 text-xs font-semibold leading-5 text-[#486275]">
            Foto evidence diunggah setelah SPL disetujui melalui tab <span className="font-black text-[#003f78]">SPL Aktif</span>.
          </p>
        </section>

        <div className="sticky bottom-20 z-10 rounded-2xl bg-white/95 p-2 shadow-[0_12px_30px_rgba(8,32,51,0.18)] backdrop-blur">
          <Button type="submit" disabled={activityCount === 0} className="h-14 w-full rounded-xl bg-[#003f78] text-white">
            <Check className="size-4" /> {parentSplId ? "Ajukan Extend" : submitLabel}
          </Button>
        </div>
      </form>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="w-[min(96vw,640px)] max-w-[min(96vw,640px)] rounded-[1.5rem] p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Pilih Aktivitas Lembur</DialogTitle>
            <DialogDescription>Boleh memilih lebih dari satu aktivitas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 pb-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#486275]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari aktivitas..." className="h-12 rounded-xl bg-[#f6fbff] pl-11" />
            </div>
            <div className="max-h-[52vh] space-y-2 overflow-y-auto">
              {filteredLibraries.map((activity) => {
                const checked = selectedLibraryIds.includes(String(activity.id));
                return (
                  <div
                    key={activity.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleLibrary(String(activity.id))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleLibrary(String(activity.id));
                      }
                    }}
                    className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl bg-[#f6fbff] px-4 text-left"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleLibrary(String(activity.id))}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#082033]">{activity.activityName}</p>
                      <p className="text-[10px] font-bold text-[#486275]">{activity.activityCode}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button type="button" onClick={() => setPickerOpen(false)} className="h-12 w-full rounded-xl">Selesai · {selectedLibraryIds.length} dipilih</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
