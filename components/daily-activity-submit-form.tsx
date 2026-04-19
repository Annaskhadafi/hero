"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera, SendHorizontal } from "lucide-react";
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

type DailyActivitySubmitFormProps = {
  action: (formData: FormData) => void | Promise<void>;
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
  const showLibrary = sourceMode === "self_input";

  const fieldClass = useMemo(
    () =>
      variant === "mobile"
        ? "h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-bold text-[#082033]"
        : "h-11 rounded-xl border border-input bg-background px-3 text-sm",
    [variant],
  );
  const labelClass = variant === "mobile" ? "block space-y-2" : "grid gap-2";
  const labelTextClass =
    variant === "mobile"
      ? "text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]"
      : "text-sm font-medium";

  return (
    <form action={action} className={cn("space-y-4", className)}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="gpsValid" value="false" />

      <div className={variant === "mobile" ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
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

        <Label className={labelClass}>
          <span className={labelTextClass}>Assignment</span>
          <select
            name="assignmentId"
            value={assignmentId}
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
          <span className={variant === "mobile" ? "text-xs font-bold text-[#486275]" : "text-xs text-muted-foreground"}>
            Approval otomatis ke atasan langsung.
          </span>
        </Label>

        {showLibrary ? (
          <Label className={labelClass}>
            <span className={labelTextClass}>Library activity</span>
            <select name="libraryActivityId" defaultValue={firstLibraryId} className={fieldClass}>
              <option value="">Pilih activity library</option>
              {availableLibrary.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.activityCode} - {item.activityName} ({item.basePoints} pts)
                </option>
              ))}
            </select>
          </Label>
        ) : null}

        <Label className={labelClass}>
          <span className={labelTextClass}>Equipment / unit no.</span>
          <Input name="equipmentNo" placeholder="Contoh: DT-451 / BAY-03" className={fieldClass} />
        </Label>

        <Label className={labelClass}>
          <span className={labelTextClass}>Start time</span>
          <Input name="startTime" type="datetime-local" defaultValue={defaultStartTime} className={fieldClass} />
        </Label>

        <Label className={labelClass}>
          <span className={labelTextClass}>End time</span>
          <Input name="endTime" type="datetime-local" defaultValue={defaultEndTime} className={fieldClass} />
        </Label>
      </div>

      <Label className={labelClass}>
        <span className={labelTextClass}>Material used</span>
        <Input name="materialUsed" placeholder="Contoh: patch kit, grease, torque wrench" className={fieldClass} />
      </Label>

      {sourceMode === "custom" ? (
        <>
          <Label className={labelClass}>
            <span className={labelTextClass}>Custom activity name</span>
            <Input name="customActivityName" placeholder="Nama aktivitas custom" className={fieldClass} />
          </Label>

          <Label className={labelClass}>
            <span className={labelTextClass}>Custom activity description</span>
            <Textarea
              name="customActivityDescription"
              rows={4}
              placeholder="Jelaskan aktivitas custom minimal 80 karakter bila pekerjaan belum ada di library."
              className={variant === "mobile" ? "w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-bold text-[#082033]" : undefined}
            />
          </Label>
        </>
      ) : null}

      <Label className={labelClass}>
        <span className={labelTextClass}>Notes / hasil kerja</span>
        <Textarea
          name="notes"
          rows={4}
          placeholder="Ringkas apa yang dikerjakan, hasilnya, kendala, dan bukti penting."
          className={variant === "mobile" ? "w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-bold text-[#082033]" : undefined}
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
        {photoName ? (
          <span className={variant === "mobile" ? "text-xs font-bold text-[#486275]" : "text-xs text-muted-foreground"}>
            {photoName}
          </span>
        ) : null}
      </Label>

      <SubmitButton variant={variant} />
    </form>
  );
}
