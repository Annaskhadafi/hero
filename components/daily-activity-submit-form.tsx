"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RouteSessionSyncItem } from "@/lib/offline-sync";
import { cn } from "@/lib/utils";

type SourceMode = "assigned" | "self_input" | "custom";

type AssignmentOption = {
  id: number;
  activityName: string | null;
  customJobName: string;
  priority?: string | null;
  assignedByName?: string | null;
  libraryActivityId?: number | null;
  requiresPhoto?: boolean | null;
};

type LibraryOption = {
  id: number;
  activityCode: string;
  activityName: string;
  basePoints: number;
  requiresPhoto?: boolean;
};

type DailyActivitySubmitActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

type RouteChecklistItem = {
  id: number;
  libraryActivityId: number | null;
  itemCode: string | null;
  itemLabel: string;
  itemDescription: string | null;
  sortOrder: number;
  requiresUnit: boolean;
  requiresTime: boolean;
  requiresRemark: boolean;
  requiresPhoto: boolean;
  requiresChecklistEvidence: boolean;
  isOptional: boolean;
  allowCustomUnit: boolean;
  pointOverride: number | null;
  libraryCode: string | null;
  libraryName: string | null;
  libraryPoints: number | null;
  isChecked: boolean;
  unitNumber: string;
  remark: string;
  startedAt: string | Date | null;
  endedAt: string | Date | null;
  actualPoints: number;
};

type RouteChecklistGroup = {
  id: number;
  groupKey: string;
  groupName: string;
  description: string | null;
  sortOrder: number;
  isRequired: boolean;
  items: RouteChecklistItem[];
};

type RouteChecklist = {
  id: number;
  routeCode: string;
  routeName: string;
  shiftCode: string;
  activeSpl: {
    id: number;
    splNumber: string;
    title: string;
    status: string;
    lineCount: number;
    plannedPointsTotal: number;
    requestNotes: string;
    items: Array<{
      id: number;
      lineLabel: string;
      targetUnit: string;
      plannedPoints: number;
    }>;
  } | null;
  groups: RouteChecklistGroup[];
};

const initialDailyActivitySubmitState: DailyActivitySubmitActionState = {
  status: "idle",
  message: "",
};

type DailyActivitySubmitFormProps = {
  action: (
    state: DailyActivitySubmitActionState,
    formData: FormData,
  ) => Promise<DailyActivitySubmitActionState>;
  employeeId: number;
  assignments: AssignmentOption[];
  availableLibrary: LibraryOption[];
  defaultStartTime: string;
  defaultEndTime: string;
  defaultSourceMode?: SourceMode;
  routeChecklist?: RouteChecklist | null;
  className?: string;
  variant?: "desktop" | "mobile";
};

type RouteItemState = {
  isChecked: boolean;
  unitNumber: string;
  remark: string;
  startedAt: string;
  endedAt: string;
  actualPoints: string;
};

const emptyRouteItemState: RouteItemState = {
  isChecked: false,
  unitNumber: "",
  remark: "",
  startedAt: "",
  endedAt: "",
  actualPoints: "0",
};

function SubmitButton({ variant }: { variant: "desktop" | "mobile" }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className={cn(
        "w-full",
        variant === "mobile"
          ? "h-14 rounded-2xl bg-[#003f78] text-white shadow-[0_14px_30px_rgba(0,63,120,0.22)]"
          : "rounded-2xl",
      )}
      disabled={pending}
    >
      <SendHorizontal className="size-4" />
      {pending ? "Mengirim..." : "Submit Activity"}
    </Button>
  );
}

export function DailyActivitySubmitForm({
  action,
  employeeId,
  assignments,
  availableLibrary,
  defaultStartTime,
  defaultEndTime,
  defaultSourceMode = "self_input",
  routeChecklist = null,
  className,
  variant = "desktop",
}: DailyActivitySubmitFormProps) {
  const firstAssignmentId = assignments[0]?.id ? `${assignments[0].id}` : "";
  const firstLibraryId = availableLibrary[0]?.id ? `${availableLibrary[0].id}` : "";
  const [sourceMode, setSourceMode] = useState<SourceMode>(defaultSourceMode);
  const [assignmentId, setAssignmentId] = useState(defaultSourceMode === "assigned" ? firstAssignmentId : "");
  const [libraryActivityId, setLibraryActivityId] = useState(defaultSourceMode === "self_input" ? firstLibraryId : "");
  const [photoName, setPhotoName] = useState("");
  const [photoCaptureMode, setPhotoCaptureMode] = useState<"camera" | "gallery">("gallery");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialDailyActivitySubmitState);
  const showLibrary = sourceMode === "self_input";
  const showAssignment = sourceMode === "assigned";
  const isMobile = variant === "mobile";
  const [routeItemState, setRouteItemState] = useState<Record<number, RouteItemState>>({});
  const selectedAssignment = useMemo(
    () => assignments.find((item) => `${item.id}` === assignmentId) ?? null,
    [assignmentId, assignments],
  );
  const selectedLibrary = useMemo(
    () => availableLibrary.find((item) => `${item.id}` === libraryActivityId) ?? null,
    [availableLibrary, libraryActivityId],
  );

  function toDateTimeLocalValue(value?: string | Date | null) {
    if (!value) return "";
    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) return "";
    const local = new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  useEffect(() => {
    if (!routeChecklist) {
      setRouteItemState({});
      return;
    }

    const nextState = Object.fromEntries(
      routeChecklist.groups.flatMap((group) =>
        group.items.map((item) => [
          item.id,
          {
            isChecked: item.isChecked,
            unitNumber: item.unitNumber,
            remark: item.remark,
            startedAt: toDateTimeLocalValue(item.startedAt),
            endedAt: toDateTimeLocalValue(item.endedAt),
            actualPoints: `${item.actualPoints || item.pointOverride || item.libraryPoints || 0}`,
          },
        ]),
      ),
    ) as Record<number, RouteItemState>;

    setRouteItemState(nextState);
  }, [routeChecklist]);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    const timer = window.setTimeout(() => {
      router.push(isMobile ? "/mobile/activity" : "/dashboard/activity-hub/my-day");
      router.refresh();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isMobile, router, state.status]);

  const fieldClass = useMemo(
    () =>
      isMobile
        ? "h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.03)]"
        : "h-11 rounded-xl border border-input bg-background px-3 text-sm",
    [isMobile],
  );
  const textareaClass = isMobile
    ? "w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.03)]"
    : undefined;
  const labelClass = isMobile ? "block space-y-2" : "grid gap-2";
  const labelTextClass =
    isMobile
      ? "text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]"
      : "text-sm font-medium";
  const mobileSectionClass = "space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]";
  const mobileHintClass = "text-xs font-semibold leading-5 text-[#486275]";

  function updateRouteItemState(itemId: number, nextValue: Partial<RouteItemState>) {
    setRouteItemState((current) => ({
      ...current,
      [itemId]: {
        ...emptyRouteItemState,
        ...current[itemId],
        ...nextValue,
      },
    }));
  }

  const routeSessionItems = useMemo<RouteSessionSyncItem[]>(
    () =>
      routeChecklist?.groups.flatMap((group) =>
        group.items.map((item) => {
          const stateForItem = routeItemState[item.id];
          const fallbackPoints = item.pointOverride ?? item.libraryPoints ?? 0;

          return {
            routeItemId: item.id,
            libraryActivityId: item.libraryActivityId,
            snapshotLabel: item.itemLabel,
            snapshotGroupName: group.groupName,
            snapshotPayload: {
              itemCode: item.itemCode,
              libraryCode: item.libraryCode,
              libraryName: item.libraryName,
              requiresUnit: item.requiresUnit,
              requiresTime: item.requiresTime,
              requiresRemark: item.requiresRemark,
              requiresPhoto: item.requiresPhoto,
              requiresChecklistEvidence: item.requiresChecklistEvidence,
              isOptional: item.isOptional,
            },
            unitNumber:
              (stateForItem?.unitNumber || "").trim() ||
              (stateForItem?.isChecked && item.requiresUnit ? "" : ""),
            remark: (stateForItem?.remark || "").trim(),
            startedAt:
              stateForItem?.isChecked && item.requiresTime
                ? stateForItem.startedAt || defaultStartTime
                : "",
            endedAt:
              stateForItem?.isChecked && item.requiresTime
                ? stateForItem.endedAt || defaultEndTime
                : "",
            isChecked: stateForItem?.isChecked ?? false,
            actualPoints:
              stateForItem?.isChecked
                ? Number(stateForItem.actualPoints || fallbackPoints || 0)
                : 0,
            sortOrder: item.sortOrder,
          };
        }),
      ) ?? [],
    [defaultEndTime, defaultStartTime, routeChecklist, routeItemState],
  );
  const checkedChecklistNeedsPhoto =
    routeChecklist?.groups.some((group) =>
      group.items.some((item) => {
        const itemState = routeItemState[item.id];
        return (itemState?.isChecked ?? false) && item.requiresPhoto;
      }),
    ) ?? false;
  const needsAnyPhoto =
    Boolean(selectedLibrary?.requiresPhoto) ||
    Boolean(selectedAssignment?.requiresPhoto) ||
    checkedChecklistNeedsPhoto;

  const routeChecklistSection =
    routeChecklist != null ? (
      <section className={isMobile ? mobileSectionClass : "space-y-4 rounded-[1.25rem] bg-surface-container-low p-4"}>
        <div className="space-y-1">
          <p className={labelTextClass}>Route checklist</p>
          <p className={isMobile ? mobileHintClass : "text-sm text-muted-foreground"}>
            {routeChecklist.routeCode} • {routeChecklist.routeName} • {routeChecklist.shiftCode}
          </p>
          {routeChecklist.activeSpl ? (
            <div className={isMobile ? mobileHintClass : "text-sm text-muted-foreground"}>
              <p>SPL aktif: {routeChecklist.activeSpl.splNumber} • {routeChecklist.activeSpl.title}</p>
              <p>{routeChecklist.activeSpl.lineCount} line • {routeChecklist.activeSpl.plannedPointsTotal} pts</p>
            </div>
          ) : null}
        </div>

        {routeChecklist.activeSpl ? (
          <div className="space-y-2 rounded-xl bg-white px-3 py-3 shadow-[0_10px_22px_rgba(8,32,51,0.05)]">
            {routeChecklist.activeSpl.items.map((item) => (
              <div key={item.id} className="text-sm">
                <p className="font-semibold text-foreground">{item.lineLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {item.targetUnit || "-"} • {item.plannedPoints} pts
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-3">
          {routeChecklist.groups.map((group) => (
            <div
              key={group.id}
              className={cn(
                "space-y-3 rounded-[1rem] p-3",
                isMobile ? "bg-[#f6fbff]" : "bg-white shadow-[0_10px_22px_rgba(8,32,51,0.05)]",
              )}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">{group.groupKey}</p>
                <p className="mt-1 font-semibold text-[#082033]">{group.groupName}</p>
                {group.description ? (
                  <p className={isMobile ? mobileHintClass : "text-sm text-muted-foreground"}>{group.description}</p>
                ) : null}
              </div>

              <div className="space-y-3">
                {group.items.map((item) => {
                  const itemState = routeItemState[item.id] ?? {
                    isChecked: false,
                    unitNumber: "",
                    remark: "",
                    startedAt: "",
                    endedAt: "",
                    actualPoints: `${item.pointOverride ?? item.libraryPoints ?? 0}`,
                  };

                  return (
                    <div key={item.id} className="rounded-xl border border-border/60 bg-background px-3 py-3">
                      <Label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={itemState.isChecked}
                          onChange={(event) =>
                            updateRouteItemState(item.id, {
                              isChecked: event.target.checked,
                            })
                          }
                        />
                        <span className="space-y-1">
                          <span className="block font-semibold text-foreground">{item.itemLabel}</span>
                          <span className="block text-xs text-muted-foreground">
                            {item.itemDescription || item.libraryName || "Checklist item"}
                          </span>
                          {item.requiresPhoto ? (
                            <span className="inline-flex rounded-full bg-[#fff1cf] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#8a5a00]">
                              Foto wajib
                            </span>
                          ) : null}
                          <span className="block text-[11px] font-semibold text-primary">
                            {item.pointOverride ?? item.libraryPoints ?? 0} pts
                          </span>
                        </span>
                      </Label>

                      {itemState.isChecked ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {item.requiresUnit ? (
                            <Label className={labelClass}>
                              <span className={labelTextClass}>Unit</span>
                              <Input
                                value={itemState.unitNumber}
                                onChange={(event) =>
                                  updateRouteItemState(item.id, { unitNumber: event.target.value })
                                }
                                placeholder="Unit number"
                                className={fieldClass}
                              />
                            </Label>
                          ) : null}

                          {item.requiresTime ? (
                            <>
                              <Label className={labelClass}>
                                <span className={labelTextClass}>Mulai</span>
                                <Input
                                  type="datetime-local"
                                  value={itemState.startedAt || defaultStartTime}
                                  onChange={(event) =>
                                    updateRouteItemState(item.id, { startedAt: event.target.value })
                                  }
                                  className={fieldClass}
                                />
                              </Label>
                              <Label className={labelClass}>
                                <span className={labelTextClass}>Selesai</span>
                                <Input
                                  type="datetime-local"
                                  value={itemState.endedAt || defaultEndTime}
                                  onChange={(event) =>
                                    updateRouteItemState(item.id, { endedAt: event.target.value })
                                  }
                                  className={fieldClass}
                                />
                              </Label>
                            </>
                          ) : null}

                          {item.requiresRemark ? (
                            <Label className={cn(labelClass, item.requiresTime || item.requiresUnit ? "sm:col-span-2" : "")}>
                              <span className={labelTextClass}>Keterangan</span>
                              <Textarea
                                rows={3}
                                value={itemState.remark}
                                onChange={(event) =>
                                  updateRouteItemState(item.id, { remark: event.target.value })
                                }
                                className={textareaClass}
                                placeholder="Checklist notes"
                              />
                            </Label>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : null;

  function openPhotoPicker(mode: "camera" | "gallery") {
    setPhotoCaptureMode(mode);
    window.setTimeout(() => {
      photoInputRef.current?.click();
    }, 0);
  }

  const modeField = (
    <Label className={labelClass}>
      <span className={labelTextClass}>Source mode</span>
      <select
        name="sourceMode"
        value={sourceMode}
        onChange={(event) => {
          const nextMode = event.target.value as SourceMode;
          setSourceMode(nextMode);
          setAssignmentId(nextMode === "assigned" ? firstAssignmentId : "");
          setLibraryActivityId(nextMode === "self_input" ? firstLibraryId : "");
        }}
        className={fieldClass}
      >
        <option value="assigned">Assigned activity</option>
        <option value="self_input">Self-input activity</option>
        <option value="custom">Custom activity</option>
      </select>
    </Label>
  );

  const assignmentField = showAssignment ? (
    <Label className={labelClass}>
      <span className={labelTextClass}>Assignment</span>
      <select
        name="assignmentId"
        value={assignmentId}
        required={showAssignment}
        onChange={(event) => setAssignmentId(event.target.value)}
        className={fieldClass}
      >
        <option value="">Pilih assignment</option>
        {assignments.map((assignment) => (
          <option key={assignment.id} value={assignment.id}>
            {(assignment.activityName ?? assignment.customJobName) || `Assignment #${assignment.id}`}
            {assignment.assignedByName ? ` - ${assignment.assignedByName}` : ""}
          </option>
        ))}
      </select>
      <span className={isMobile ? mobileHintClass : "text-xs text-muted-foreground"}>
        {selectedAssignment?.requiresPhoto
          ? "Assignment ini wajib upload foto evidence."
          : "Approval otomatis ke atasan langsung."}
      </span>
    </Label>
  ) : null;

  const libraryField = showLibrary ? (
    <Label className={labelClass}>
      <span className={labelTextClass}>Library activity</span>
      <select
        name="libraryActivityId"
        value={libraryActivityId}
        required={showLibrary}
        onChange={(event) => setLibraryActivityId(event.target.value)}
        className={fieldClass}
      >
        <option value="">Pilih activity library</option>
        {availableLibrary.map((item) => (
          <option key={item.id} value={item.id}>
            {item.activityCode} - {item.activityName} ({item.basePoints} pts)
          </option>
        ))}
      </select>
      <span className={isMobile ? mobileHintClass : "text-xs text-muted-foreground"}>
        {selectedLibrary?.requiresPhoto
          ? "Library ini wajib upload foto evidence."
          : "Pilih activity library sesuai pekerjaan real di lapangan."}
      </span>
    </Label>
  ) : null;

  const customFields =
    sourceMode === "custom" ? (
      <>
        <Label className={labelClass}>
          <span className={labelTextClass}>Custom activity name</span>
          <Input
            name="customActivityName"
            placeholder="Custom activity name"
            className={fieldClass}
            required
          />
        </Label>

        <Label className={labelClass}>
          <span className={labelTextClass}>Custom activity description</span>
          <Textarea
            name="customActivityDescription"
            rows={4}
            placeholder="Jelaskan aktivitas custom bila pekerjaan belum ada di library."
            className={textareaClass}
          />
        </Label>
      </>
    ) : null;

  return (
    <form action={formAction} className={cn("space-y-4", className)}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="gpsValid" value="false" />
      <input type="hidden" name="routeTemplateId" value={routeChecklist?.id ?? ""} />
      <input type="hidden" name="overtimeCommandLetterId" value={routeChecklist?.activeSpl?.id ?? ""} />
      <input type="hidden" name="routeShiftCode" value={routeChecklist?.shiftCode ?? ""} />
      <input type="hidden" name="routeSummaryRemark" value="" />
      <input type="hidden" name="routeSessionItemsJson" value={JSON.stringify(routeSessionItems)} />

      {state.status !== "idle" ? (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-semibold",
            state.status === "success"
              ? "bg-emerald-50 text-emerald-900 shadow-[inset_0_0_0_1px_rgba(22,101,52,0.12)]"
              : "bg-rose-50 text-rose-900 shadow-[inset_0_0_0_1px_rgba(190,24,93,0.12)]",
          )}
        >
          {state.message}
        </div>
      ) : null}

      {isMobile ? (
        <div className="space-y-4">
          <section className={mobileSectionClass}>
            {modeField}
            {assignmentField}
            {libraryField}
            {customFields}
          </section>

          {routeChecklistSection}

          <section className={mobileSectionClass}>
            <div className="grid gap-4">
              <Label className={labelClass}>
                <span className={labelTextClass}>Equipment / unit no.</span>
                <Input name="equipmentNo" placeholder="Contoh: DT-451 / BAY-03" className={fieldClass} />
              </Label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Label className={labelClass}>
                  <span className={labelTextClass}>Start time</span>
                  <Input
                    name="startTime"
                    type="datetime-local"
                    defaultValue={defaultStartTime}
                    className={fieldClass}
                    required
                  />
                </Label>

                <Label className={labelClass}>
                  <span className={labelTextClass}>End time</span>
                  <Input
                    name="endTime"
                    type="datetime-local"
                    defaultValue={defaultEndTime}
                    className={fieldClass}
                    required
                  />
                </Label>
              </div>

              <Label className={labelClass}>
                <span className={labelTextClass}>Material used</span>
                <Input
                  name="materialUsed"
                  placeholder="Contoh: patch kit, grease, torque wrench"
                  className={fieldClass}
                />
              </Label>
            </div>
          </section>

          <section className={mobileSectionClass}>
            <Label className={labelClass}>
              <span className={labelTextClass}>Notes / hasil kerja</span>
              <Textarea
                name="notes"
                rows={5}
                placeholder="Ringkas apa yang dikerjakan, hasilnya, kendala, dan bukti penting."
                className={textareaClass}
              />
            </Label>
          </section>

          <section className={mobileSectionClass}>
            <Label className={labelClass}>
              <span className={cn(labelTextClass, "flex items-center gap-1")}>
                <Camera className="size-3.5" />
                Photo camera / galeri
              </span>
              <input
                ref={photoInputRef}
                name="photoFile"
                type="file"
                accept="image/*"
                capture={photoCaptureMode === "camera" ? "environment" : undefined}
                className="hidden"
                onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? "")}
              />
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl border-0 bg-[#e9f6fd] text-[#003f78] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.05)]"
                  onClick={() => openPhotoPicker("camera")}
                >
                  <Camera className="size-4" />
                  Kamera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl border-0 bg-[#e9f6fd] text-[#003f78] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.05)]"
                  onClick={() => openPhotoPicker("gallery")}
                >
                  <ImagePlus className="size-4" />
                  Galeri
                </Button>
              </div>
              <span className={mobileHintClass}>
                {needsAnyPhoto
                  ? "Foto wajib. Tombol ini buka kamera atau galeri native di mobile, dan file picker di web."
                  : "Di mobile, tombol ini buka kamera atau galeri native. Di web, upload dari file picker browser."}
              </span>
              {photoName ? <span className={mobileHintClass}>{photoName}</span> : null}
              {state.status === "error" ? (
                <span className="text-xs font-semibold leading-5 text-rose-700">
                  Save gagal. Lihat pesan error di atas untuk tahu field mana yang kurang atau kenapa ditolak.
                </span>
              ) : null}
            </Label>
          </section>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {modeField}
            {assignmentField}
            {libraryField}
            <Label className={labelClass}>
              <span className={labelTextClass}>Equipment / unit no.</span>
              <Input name="equipmentNo" placeholder="Contoh: DT-451 / BAY-03" className={fieldClass} />
            </Label>
            <Label className={labelClass}>
              <span className={labelTextClass}>Start time</span>
              <Input
                name="startTime"
                type="datetime-local"
                defaultValue={defaultStartTime}
                className={fieldClass}
                required
              />
            </Label>
            <Label className={labelClass}>
              <span className={labelTextClass}>End time</span>
              <Input
                name="endTime"
                type="datetime-local"
                defaultValue={defaultEndTime}
                className={fieldClass}
                required
              />
            </Label>
          </div>

          <Label className={labelClass}>
            <span className={labelTextClass}>Material used</span>
            <Input name="materialUsed" placeholder="Contoh: patch kit, grease, torque wrench" className={fieldClass} />
          </Label>

          {customFields}
          {routeChecklistSection}

          <Label className={labelClass}>
            <span className={labelTextClass}>Notes / hasil kerja</span>
            <Textarea
              name="notes"
              rows={4}
              placeholder="Ringkas apa yang dikerjakan, hasilnya, kendala, dan bukti penting."
              className={textareaClass}
            />
          </Label>

          <Label className={labelClass}>
            <span className={cn(labelTextClass, "flex items-center gap-1")}>
              <Camera className="size-3.5" />
              Photo camera / galeri
            </span>
            <Input
              name="photoFile"
              type="file"
              accept="image/*"
              className={fieldClass}
              onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? "")}
            />
            {photoName ? <span className="text-xs text-muted-foreground">{photoName}</span> : null}
            <span className="text-xs text-muted-foreground">
              {needsAnyPhoto
                ? "Foto wajib karena assignment / checklist / library yang dipilih butuh image evidence."
                : "Foto opsional, tapi disarankan untuk bukti kerja lapangan."}
            </span>
          </Label>
        </>
      )}

      <SubmitButton variant={variant} />
    </form>
  );
}
