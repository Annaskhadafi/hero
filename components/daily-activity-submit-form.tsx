"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SourceMode = "assigned" | "self_input" | "custom";

type AssignmentOption = {
  id: number;
  activityName: string | null;
  customJobName: string;
  priority?: string | null;
  assignedByName?: string | null;
};

type LibraryOption = {
  id: number;
  activityCode: string;
  activityName: string;
  basePoints: number;
};

type DailyActivitySubmitActionState = {
  status: "idle" | "success" | "error";
  message: string;
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
  className?: string;
  variant?: "desktop" | "mobile";
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
  className,
  variant = "desktop",
}: DailyActivitySubmitFormProps) {
  const firstAssignmentId = assignments[0]?.id ? `${assignments[0].id}` : "";
  const firstLibraryId = availableLibrary[0]?.id ? `${availableLibrary[0].id}` : "";
  const [sourceMode, setSourceMode] = useState<SourceMode>(defaultSourceMode);
  const [assignmentId, setAssignmentId] = useState(defaultSourceMode === "assigned" ? firstAssignmentId : "");
  const [photoName, setPhotoName] = useState("");
  const [photoCaptureMode, setPhotoCaptureMode] = useState<"camera" | "gallery">("gallery");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialDailyActivitySubmitState);
  const showLibrary = sourceMode === "self_input";
  const showAssignment = sourceMode === "assigned";
  const isMobile = variant === "mobile";

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
        Approval otomatis ke atasan langsung.
      </span>
    </Label>
  ) : null;

  const libraryField = showLibrary ? (
    <Label className={labelClass}>
      <span className={labelTextClass}>Library activity</span>
      <select name="libraryActivityId" defaultValue={firstLibraryId} required={showLibrary} className={fieldClass}>
        <option value="">Pilih activity library</option>
        {availableLibrary.map((item) => (
          <option key={item.id} value={item.id}>
            {item.activityCode} - {item.activityName} ({item.basePoints} pts)
          </option>
        ))}
      </select>
    </Label>
  ) : null;

  const customFields =
    sourceMode === "custom" ? (
      <>
        <Label className={labelClass}>
          <span className={labelTextClass}>Custom activity name</span>
          <Input
            name="customActivityName"
            placeholder="Nama aktivitas custom"
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
                Di mobile, tombol ini buka kamera atau galeri native. Di web, upload dari file picker browser.
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
          </Label>
        </>
      )}

      <SubmitButton variant={variant} />
    </form>
  );
}
