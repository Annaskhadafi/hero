"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OvertimeLineDraft = {
  key: string;
  routeTemplateId: string;
  libraryActivityId: string;
  lineLabel: string;
  lineDescription: string;
  targetUnit: string;
  estimatedMinutes: string;
  plannedPoints: string;
  isCustomLine: boolean;
};

type ComposerDefaults = {
  id: number;
  title: string;
  workDate: Date;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  status: string;
  requestNotes: string;
  executionNotes: string;
  items: Array<{
    routeTemplateId: number | null;
    libraryActivityId: number | null;
    lineLabel: string;
    lineDescription: string;
    targetUnit: string;
    estimatedMinutes: number;
    plannedPoints: number;
    isCustomLine: boolean;
  }>;
};

type OvertimeCommandLetterComposerProps = {
  action: (formData: FormData) => void | Promise<void>;
  intent: "create" | "update";
  submitLabel: string;
  routeTemplates: Array<{
    id: number;
    routeCode: string;
    routeName: string;
    sectionName: string | null;
    positionName: string | null;
  }>;
  libraryActivities: Array<{
    id: number;
    activityCode: string;
    activityName: string;
    basePoints: number;
  }>;
  defaults?: ComposerDefaults | null;
};

function dateInputValue(value?: Date | null) {
  if (!value) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateTimeInputValue(value?: Date | null) {
  if (!value) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function createEmptyLine(): OvertimeLineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    routeTemplateId: "",
    libraryActivityId: "",
    lineLabel: "",
    lineDescription: "",
    targetUnit: "",
    estimatedMinutes: "60",
    plannedPoints: "0",
    isCustomLine: true,
  };
}

export function OvertimeCommandLetterComposer({
  action,
  intent,
  submitLabel,
  routeTemplates,
  libraryActivities,
  defaults,
}: OvertimeCommandLetterComposerProps) {
  const [lines, setLines] = useState<OvertimeLineDraft[]>(
    defaults?.items.length
      ? defaults.items.map((item, index) => ({
          key: `${defaults.id}-${index}`,
          routeTemplateId: item.routeTemplateId ? `${item.routeTemplateId}` : "",
          libraryActivityId: item.libraryActivityId ? `${item.libraryActivityId}` : "",
          lineLabel: item.lineLabel,
          lineDescription: item.lineDescription,
          targetUnit: item.targetUnit,
          estimatedMinutes: `${item.estimatedMinutes}`,
          plannedPoints: `${item.plannedPoints}`,
          isCustomLine: item.isCustomLine,
        }))
      : [createEmptyLine()],
  );

  const lineItemsJson = useMemo(
    () =>
      JSON.stringify(
        lines.map((line, index) => ({
          routeTemplateId: line.routeTemplateId || null,
          routeItemId: null,
          libraryActivityId: line.libraryActivityId || null,
          lineLabel: line.lineLabel,
          lineDescription: line.lineDescription,
          targetUnit: line.targetUnit,
          estimatedMinutes: Number(line.estimatedMinutes || 60),
          plannedPoints: Number(line.plannedPoints || 0),
          sortOrder: index + 1,
          isCustomLine: line.isCustomLine,
        })),
      ),
    [lines],
  );

  function updateLine(key: string, nextValue: Partial<OvertimeLineDraft>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...nextValue } : line)),
    );
  }

  function removeLine(key: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.key !== key) : current));
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={defaults?.id ?? ""} />
      <input type="hidden" name="lineItemsJson" value={lineItemsJson} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">
          Judul SPL
          <Input
            name="title"
            required
            defaultValue={defaults?.title ?? ""}
            placeholder="SPL Tire Service Night Shift"
          />
        </Label>
        <Label className="grid gap-2">
          Tanggal kerja
          <Input
            name="workDate"
            type="date"
            required
            defaultValue={dateInputValue(defaults?.workDate ?? new Date())}
          />
        </Label>
        <Label className="grid gap-2">
          Jam mulai
          <Input
            name="plannedStartAt"
            type="datetime-local"
            defaultValue={dateTimeInputValue(defaults?.plannedStartAt ?? null)}
          />
        </Label>
        <Label className="grid gap-2">
          Jam selesai
          <Input
            name="plannedEndAt"
            type="datetime-local"
            defaultValue={dateTimeInputValue(defaults?.plannedEndAt ?? null)}
          />
        </Label>
        <Label className="grid gap-2">
          Status
          <select
            name="status"
            defaultValue={defaults?.status ?? "draft"}
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="closed">Closed</option>
          </select>
        </Label>
      </div>

      <Label className="grid gap-2">
        Request notes
        <Textarea
          name="requestNotes"
          rows={3}
          defaultValue={defaults?.requestNotes ?? ""}
          placeholder="Alasan lembur, area kerja, risiko, dan instruksi utama."
        />
      </Label>

      <Label className="grid gap-2">
        Execution notes
        <Textarea
          name="executionNotes"
          rows={3}
          defaultValue={defaults?.executionNotes ?? ""}
          placeholder="Catatan pelaksanaan atau hasil akhir."
        />
      </Label>

      <div className="space-y-3 rounded-[1.2rem] bg-surface-container-low p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Line pekerjaan SPL</p>
            <p className="text-xs text-muted-foreground">Pilih route template, library, atau tulis line custom.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setLines((current) => [...current, createEmptyLine()])}
          >
            <Plus className="size-4" />
            Tambah line
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={line.key} className="rounded-[1rem] bg-white p-4 shadow-[0_10px_22px_rgba(8,32,51,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Line {index + 1}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-rose-700"
                  onClick={() => removeLine(line.key)}
                >
                  <Trash2 className="size-4" />
                  Hapus
                </Button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Label className="grid gap-2">
                  Route template
                  <select
                    value={line.routeTemplateId}
                    onChange={(event) => updateLine(line.key, { routeTemplateId: event.target.value })}
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Tanpa route template</option>
                    {routeTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.routeCode} - {template.routeName}
                      </option>
                    ))}
                  </select>
                </Label>

                <Label className="grid gap-2">
                  Library activity
                  <select
                    value={line.libraryActivityId}
                    onChange={(event) => {
                      const selected = libraryActivities.find(
                        (item) => `${item.id}` === event.target.value,
                      );
                      updateLine(line.key, {
                        libraryActivityId: event.target.value,
                        lineLabel: line.lineLabel || selected?.activityName || "",
                        plannedPoints: selected ? `${selected.basePoints}` : line.plannedPoints,
                        isCustomLine: !selected,
                      });
                    }}
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Tanpa library</option>
                    {libraryActivities.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.activityCode} - {item.activityName}
                      </option>
                    ))}
                  </select>
                </Label>

                <Label className="grid gap-2 sm:col-span-2">
                  Label pekerjaan
                  <Input
                    value={line.lineLabel}
                    onChange={(event) => updateLine(line.key, { lineLabel: event.target.value })}
                    placeholder="Nama pekerjaan lembur"
                  />
                </Label>

                <Label className="grid gap-2 sm:col-span-2">
                  Deskripsi
                  <Textarea
                    rows={3}
                    value={line.lineDescription}
                    onChange={(event) => updateLine(line.key, { lineDescription: event.target.value })}
                    placeholder="Deskripsi line pekerjaan."
                  />
                </Label>

                <Label className="grid gap-2">
                  Target unit
                  <Input
                    value={line.targetUnit}
                    onChange={(event) => updateLine(line.key, { targetUnit: event.target.value })}
                    placeholder="HD785 / DT451 / Area"
                  />
                </Label>

                <Label className="grid gap-2">
                  Estimasi menit
                  <Input
                    type="number"
                    value={line.estimatedMinutes}
                    onChange={(event) => updateLine(line.key, { estimatedMinutes: event.target.value })}
                  />
                </Label>

                <Label className="grid gap-2">
                  Planned points
                  <Input
                    type="number"
                    value={line.plannedPoints}
                    onChange={(event) => updateLine(line.key, { plannedPoints: event.target.value })}
                  />
                </Label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full rounded-2xl">
        {submitLabel}
      </Button>
    </form>
  );
}
