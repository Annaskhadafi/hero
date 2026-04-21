"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, ClipboardList, Plus, Search, Trash2, Users2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TeamMember = {
  id: number;
  name: string;
  role: string;
};

type LibraryActivity = {
  id: number;
  activityCode: string;
  activityName: string;
  basePoints: number;
};

type CustomJobDraft = {
  key: string;
  lineLabel: string;
  lineDescription: string;
  targetUnit: string;
  estimatedMinutes: string;
  plannedPoints: string;
};

type EmployeeJobState = {
  libraryActivityIds: string[];
  customJobs: CustomJobDraft[];
};

function createCustomJobDraft(): CustomJobDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    lineLabel: "",
    lineDescription: "",
    targetUnit: "",
    estimatedMinutes: "60",
    plannedPoints: "0",
  };
}

function dateInputValue(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateTimeInputValue(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function MobileOvertimeRequestForm({
  action,
  teamMembers,
  libraryActivities,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  teamMembers: TeamMember[];
  libraryActivities: LibraryActivity[];
  submitLabel: string;
}) {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeStates, setEmployeeStates] = useState<Record<string, EmployeeJobState>>({});
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [jobPickerEmployeeId, setJobPickerEmployeeId] = useState<string | null>(null);
  const [jobSearch, setJobSearch] = useState("");

  const selectedEmployees = useMemo(
    () => teamMembers.filter((member) => selectedEmployeeIds.includes(`${member.id}`)),
    [selectedEmployeeIds, teamMembers],
  );

  const selectedEmployeeCount = selectedEmployees.length;
  const totalSelectedLibraryJobs = useMemo(
    () =>
      selectedEmployeeIds.reduce(
        (total, employeeId) => total + (employeeStates[employeeId]?.libraryActivityIds.length ?? 0),
        0,
      ),
    [employeeStates, selectedEmployeeIds],
  );

  const totalCustomJobs = useMemo(
    () =>
      selectedEmployeeIds.reduce(
        (total, employeeId) => total + (employeeStates[employeeId]?.customJobs.length ?? 0),
        0,
      ),
    [employeeStates, selectedEmployeeIds],
  );

  const lineItemsJson = useMemo(() => {
    const lines = selectedEmployeeIds.flatMap((employeeId) => {
      const employeeState = employeeStates[employeeId] ?? { libraryActivityIds: [], customJobs: [] };
      const libraryLines = employeeState.libraryActivityIds.map((libraryId) => {
        const library = libraryActivities.find((item) => `${item.id}` === libraryId);

        return {
          assignedEmployeeId: Number(employeeId),
          routeTemplateId: null,
          routeItemId: null,
          libraryActivityId: library ? library.id : null,
          lineLabel: library?.activityName ?? "Pekerjaan library",
          lineDescription: library ? `Checklist library ${library.activityCode}` : "",
          targetUnit: "",
          estimatedMinutes: 60,
          plannedPoints: library?.basePoints ?? 0,
          sortOrder: 0,
          isCustomLine: false,
        };
      });

      const customLines = employeeState.customJobs
        .filter((job) => job.lineLabel.trim().length > 0)
        .map((job) => ({
          assignedEmployeeId: Number(employeeId),
          routeTemplateId: null,
          routeItemId: null,
          libraryActivityId: null,
          lineLabel: job.lineLabel,
          lineDescription: job.lineDescription,
          targetUnit: job.targetUnit,
          estimatedMinutes: Number(job.estimatedMinutes || 60),
          plannedPoints: Number(job.plannedPoints || 0),
          sortOrder: 0,
          isCustomLine: true,
        }));

      return [...libraryLines, ...customLines];
    });

    return JSON.stringify(
      lines.map((line, index) => ({
        ...line,
        sortOrder: index + 1,
      })),
    );
  }, [employeeStates, libraryActivities, selectedEmployeeIds]);

  const filteredLibraries = useMemo(() => {
    const normalizedSearch = normalizeSearch(jobSearch);
    if (!normalizedSearch) {
      return libraryActivities;
    }

    return libraryActivities.filter((item) =>
      normalizeSearch(`${item.activityCode} ${item.activityName} ${item.basePoints}`).includes(normalizedSearch),
    );
  }, [jobSearch, libraryActivities]);

  function ensureEmployeeState(employeeId: string) {
    setEmployeeStates((current) => ({
      ...current,
      [employeeId]:
        current[employeeId] ?? {
          libraryActivityIds: [],
          customJobs: [],
        },
    }));
  }

  function toggleEmployee(employeeId: string) {
    setSelectedEmployeeIds((current) => {
      const exists = current.includes(employeeId);
      const next = exists ? current.filter((value) => value !== employeeId) : [...current, employeeId];

      if (!exists) {
        ensureEmployeeState(employeeId);
      }

      return next;
    });
  }

  function toggleLibraryJob(employeeId: string, libraryId: string) {
    setEmployeeStates((current) => {
      const employeeState = current[employeeId] ?? { libraryActivityIds: [], customJobs: [] };
      const exists = employeeState.libraryActivityIds.includes(libraryId);

      return {
        ...current,
        [employeeId]: {
          ...employeeState,
          libraryActivityIds: exists
            ? employeeState.libraryActivityIds.filter((value) => value !== libraryId)
            : [...employeeState.libraryActivityIds, libraryId],
        },
      };
    });
  }

  function addCustomJob(employeeId: string) {
    setEmployeeStates((current) => {
      const employeeState = current[employeeId] ?? { libraryActivityIds: [], customJobs: [] };

      return {
        ...current,
        [employeeId]: {
          ...employeeState,
          customJobs: [...employeeState.customJobs, createCustomJobDraft()],
        },
      };
    });
  }

  function updateCustomJob(employeeId: string, key: string, nextValue: Partial<CustomJobDraft>) {
    setEmployeeStates((current) => {
      const employeeState = current[employeeId] ?? { libraryActivityIds: [], customJobs: [] };

      return {
        ...current,
        [employeeId]: {
          ...employeeState,
          customJobs: employeeState.customJobs.map((job) => (job.key === key ? { ...job, ...nextValue } : job)),
        },
      };
    });
  }

  function removeCustomJob(employeeId: string, key: string) {
    setEmployeeStates((current) => {
      const employeeState = current[employeeId] ?? { libraryActivityIds: [], customJobs: [] };

      return {
        ...current,
        [employeeId]: {
          ...employeeState,
          customJobs: employeeState.customJobs.filter((job) => job.key !== key),
        },
      };
    });
  }

  return (
    <>
      <form action={action} className="space-y-4">
        <input type="hidden" name="intent" value="create" />
        <input type="hidden" name="status" value="draft" />
        <input type="hidden" name="lineItemsJson" value={lineItemsJson} />

        <section className="space-y-4 rounded-[1.25rem] bg-[#f6fbff] p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[1rem] bg-white px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Bawahan</p>
              <p className="mt-1 text-lg font-black text-[#082033]">{selectedEmployeeCount}</p>
            </div>
            <div className="rounded-[1rem] bg-white px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Daftar</p>
              <p className="mt-1 text-lg font-black text-[#082033]">{totalSelectedLibraryJobs}</p>
            </div>
            <div className="rounded-[1rem] bg-white px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Custom</p>
              <p className="mt-1 text-lg font-black text-[#082033]">{totalCustomJobs}</p>
            </div>
          </div>

          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Judul SPL</span>
            <Input
              name="title"
              required
              placeholder="Contoh: SPL Support Breakdown Unit Malam"
              className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]"
            />
          </Label>

          <div className="grid grid-cols-2 gap-3">
            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Tanggal kerja</span>
              <Input
                name="workDate"
                type="date"
                required
                defaultValue={dateInputValue()}
                className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]"
              />
            </Label>
            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Jam mulai</span>
              <Input
                name="plannedStartAt"
                type="datetime-local"
                defaultValue={dateTimeInputValue()}
                className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]"
              />
            </Label>
          </div>

          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Jam selesai</span>
            <Input
              name="plannedEndAt"
              type="datetime-local"
              defaultValue={dateTimeInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000))}
              className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]"
            />
          </Label>

          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Catatan pengajuan</span>
            <Textarea
              name="requestNotes"
              rows={4}
              placeholder="Alasan lembur, area kerja, target, dan catatan utama."
              className="rounded-2xl border-0 bg-white px-4 py-3 text-sm font-semibold text-[#082033]"
            />
          </Label>

          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Catatan pelaksanaan</span>
            <Textarea
              name="executionNotes"
              rows={3}
              placeholder="Opsional. Bisa diisi kosong dulu."
              className="rounded-2xl border-0 bg-white px-4 py-3 text-sm font-semibold text-[#082033]"
            />
          </Label>
        </section>

        <section className="space-y-4 rounded-[1.25rem] bg-[#f6fbff] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Step 1</p>
              <p className="mt-1 text-base font-black text-[#082033]">Pilih bawahan</p>
            </div>
            <Button
              type="button"
              onClick={() => setEmployeePickerOpen(true)}
              className="h-11 rounded-2xl bg-[#003f78] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white"
            >
              <Users2 className="size-4" />
              Pilih
            </Button>
          </div>

          {selectedEmployees.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedEmployees.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleEmployee(`${member.id}`)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#082033] shadow-[0_10px_22px_rgba(8,32,51,0.05)]"
                >
                  {member.name}
                  <X className="size-3.5 text-[#486275]" />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[1rem] bg-white px-4 py-4 text-sm font-semibold text-[#486275]">
              Belum ada bawahan dipilih.
            </div>
          )}
        </section>

        {selectedEmployees.map((member) => {
          const employeeState = employeeStates[`${member.id}`] ?? { libraryActivityIds: [], customJobs: [] };
          const selectedLibraryRows = employeeState.libraryActivityIds
            .map((libraryId) => libraryActivities.find((item) => `${item.id}` === libraryId))
            .filter((item): item is LibraryActivity => Boolean(item));

          return (
            <section
              key={member.id}
              className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Bawahan terpilih</p>
                  <p className="mt-1 text-base font-black text-[#082033]">{member.name}</p>
                  <p className="mt-1 text-xs font-semibold text-[#486275]">{member.role}</p>
                </div>
                <Badge className="border-0 bg-[#eaf4fb] text-[9px] font-black uppercase tracking-[0.14em] text-[#003f78]">
                  {selectedLibraryRows.length + employeeState.customJobs.length} pekerjaan
                </Badge>
              </div>

              <div className="rounded-[1rem] bg-[#f6fbff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Step 2</p>
                    <p className="mt-1 text-sm font-black text-[#082033]">Daftar pekerjaan</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setJobPickerEmployeeId(`${member.id}`);
                      setJobSearch("");
                    }}
                    className="h-11 rounded-2xl border-0 bg-white px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#003f78]"
                  >
                    <ClipboardList className="size-4" />
                    Multi Select
                  </Button>
                </div>

                {selectedLibraryRows.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {selectedLibraryRows.map((library) => (
                      <div
                        key={library.id}
                        className="flex items-center justify-between gap-3 rounded-[0.95rem] bg-white px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#082033]">{library.activityName}</p>
                          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#486275]">
                            {library.activityCode} • {library.basePoints} pts
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleLibraryJob(`${member.id}`, `${library.id}`)}
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fce7f3] text-[#be185d]"
                          aria-label={`Hapus ${library.activityName}`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-[0.95rem] bg-white px-4 py-4 text-sm font-semibold text-[#486275]">
                    Belum ada daftar pekerjaan dipilih.
                  </div>
                )}
              </div>

              <div className="rounded-[1rem] bg-[#fff8e8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a5a00]">Step 3</p>
                    <p className="mt-1 text-sm font-black text-[#5a2200]">Pekerjaan custom</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => addCustomJob(`${member.id}`)}
                    className="h-11 rounded-2xl bg-[#8a5a00] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white"
                  >
                    <Plus className="size-4" />
                    Tambah
                  </Button>
                </div>

                {employeeState.customJobs.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {employeeState.customJobs.map((job, index) => (
                      <div key={job.key} className="rounded-[0.95rem] bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-[#082033]">Custom {index + 1}</p>
                          <button
                            type="button"
                            onClick={() => removeCustomJob(`${member.id}`, job.key)}
                            className="flex size-9 items-center justify-center rounded-full bg-[#ffe4e6] text-[#e11d48]"
                            aria-label="Hapus pekerjaan custom"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        <div className="mt-3 grid gap-3">
                          <Label className="block space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Nama pekerjaan</span>
                            <Input
                              value={job.lineLabel}
                              onChange={(event) =>
                                updateCustomJob(`${member.id}`, job.key, { lineLabel: event.target.value })
                              }
                              placeholder="Contoh: Support cleaning area breakdown"
                              className="h-12 rounded-2xl border-0 bg-[#f6fbff] px-4 text-sm font-semibold text-[#082033]"
                            />
                          </Label>

                          <Label className="block space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Deskripsi</span>
                            <Textarea
                              rows={3}
                              value={job.lineDescription}
                              onChange={(event) =>
                                updateCustomJob(`${member.id}`, job.key, { lineDescription: event.target.value })
                              }
                              placeholder="Jelaskan pekerjaan custom."
                              className="rounded-2xl border-0 bg-[#f6fbff] px-4 py-3 text-sm font-semibold text-[#082033]"
                            />
                          </Label>

                          <div className="grid grid-cols-2 gap-3">
                            <Label className="block space-y-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Target/unit</span>
                              <Input
                                value={job.targetUnit}
                                onChange={(event) =>
                                  updateCustomJob(`${member.id}`, job.key, { targetUnit: event.target.value })
                                }
                                placeholder="Area / Unit"
                                className="h-12 rounded-2xl border-0 bg-[#f6fbff] px-4 text-sm font-semibold text-[#082033]"
                              />
                            </Label>
                            <Label className="block space-y-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Estimasi menit</span>
                              <Input
                                type="number"
                                value={job.estimatedMinutes}
                                onChange={(event) =>
                                  updateCustomJob(`${member.id}`, job.key, { estimatedMinutes: event.target.value })
                                }
                                className="h-12 rounded-2xl border-0 bg-[#f6fbff] px-4 text-sm font-semibold text-[#082033]"
                              />
                            </Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-[0.95rem] bg-white px-4 py-4 text-sm font-semibold text-[#8a5a00]">
                    Tidak wajib. Tambah hanya jika pekerjaan belum ada di daftar library.
                  </div>
                )}
              </div>
            </section>
          );
        })}

        <Button
          type="submit"
          className="h-14 w-full rounded-2xl bg-[#003f78] text-white shadow-[0_14px_30px_rgba(0,63,120,0.22)]"
          disabled={selectedEmployeeIds.length === 0}
        >
          <Check className="size-4" />
          {submitLabel}
        </Button>
      </form>

      <Dialog open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
        <DialogContent className="w-[min(96vw,640px)] max-w-[min(96vw,640px)] rounded-[1.5rem] p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Pilih Bawahan</DialogTitle>
            <DialogDescription>Multi select bawahan yang akan masuk pengajuan lembur.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-5 pb-5">
            {teamMembers.map((member) => {
              const checked = selectedEmployeeIds.includes(`${member.id}`);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleEmployee(`${member.id}`)}
                  className="flex w-full items-center gap-3 rounded-[1rem] bg-[#f6fbff] px-4 py-4 text-left"
                >
                  <Checkbox checked={checked} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#082033]">{member.name}</p>
                    <p className="mt-1 text-xs font-semibold text-[#486275]">{member.role}</p>
                  </div>
                  <ChevronRight className="size-4 text-[#486275]" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={jobPickerEmployeeId != null} onOpenChange={(open) => !open && setJobPickerEmployeeId(null)}>
        <DialogContent className="w-[min(96vw,640px)] max-w-[min(96vw,640px)] rounded-[1.5rem] p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Pilih Daftar Pekerjaan</DialogTitle>
            <DialogDescription>Multi select daftar pekerjaan library untuk bawahan terpilih.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-5 pb-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#486275]" />
              <Input
                value={jobSearch}
                onChange={(event) => setJobSearch(event.target.value)}
                placeholder="Cari kode / nama pekerjaan"
                className="h-12 rounded-2xl border-0 bg-[#f6fbff] pl-11 text-sm font-semibold text-[#082033]"
              />
            </div>

            <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              {filteredLibraries.map((library) => {
                const checked =
                  jobPickerEmployeeId != null &&
                  (employeeStates[jobPickerEmployeeId]?.libraryActivityIds ?? []).includes(`${library.id}`);

                return (
                  <button
                    key={library.id}
                    type="button"
                    onClick={() => {
                      if (!jobPickerEmployeeId) return;
                      toggleLibraryJob(jobPickerEmployeeId, `${library.id}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-[1rem] bg-[#f6fbff] px-4 py-4 text-left"
                  >
                    <Checkbox checked={checked} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#082033]">{library.activityName}</p>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#486275]">
                        {library.activityCode} • {library.basePoints} pts
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
