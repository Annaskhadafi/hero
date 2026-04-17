"use client";

import { useMemo, useState } from "react";
import { createActivityAction, saveActivityDraftAction } from "@/app/dashboard/admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { getDailyActivityTemplateFormData } from "@/lib/approval-blueprint";

type ActivityTemplateFormData = NonNullable<Awaited<ReturnType<typeof getDailyActivityTemplateFormData>>>;

type FormValueState = Record<string, string | string[]>;
type FieldOption = { value: string; label: string };

const REQUIRED_FIELDS = [
  "employeeId",
  "activityType",
  "activityCode",
  "title",
  "unitNumber",
  "startTime",
  "endTime",
  "priority",
  "overtimeMinutes",
  "remarks",
];

function getDurationLabel(startTime: string, endTime: string) {
  if (!startTime || !endTime) {
    return "0 menit";
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return "0 menit";
  }

  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return `${minutes} menit`;
}

function dedupeOptions(options: FieldOption[]) {
  const seenValues = new Set<string>();

  return options.filter((option) => {
    const normalizedValue = option.value.trim().toLowerCase();
    if (!normalizedValue || seenValues.has(normalizedValue)) {
      return false;
    }

    seenValues.add(normalizedValue);
    return true;
  });
}

export function ActivityTemplateForm({ data }: { data: ActivityTemplateFormData }) {
  const initialValues = useMemo<FormValueState>(
    () => ({
      workDate: new Date().toISOString().slice(0, 10),
      shift: "Shift Pagi",
      priority: "Normal",
      overtimeMinutes: "0",
      checklistCompletion: [],
      additionalWatchers: [],
      signatureName: "",
    }),
    [],
  );
  const [values, setValues] = useState<FormValueState>(initialValues);

  const departments = useMemo(
    () =>
      Array.from(new Set(data.employees.map((employee) => employee.department).filter(Boolean))).sort(),
    [data.employees],
  );
  const sections = useMemo(
    () => Array.from(new Set(data.employees.map((employee) => employee.section).filter(Boolean))).sort(),
    [data.employees],
  );

  const progress = REQUIRED_FIELDS.filter((fieldKey) => {
    const value = values[fieldKey];
    return Array.isArray(value) ? value.length > 0 : `${value ?? ""}`.trim().length > 0;
  }).length;
  const progressPercent = Math.round((progress / REQUIRED_FIELDS.length) * 100);

  const resolvedPreview = {
    title: `${values.title ?? "-"}`,
    requester:
      data.employees.find((employee) => `${employee.id}` === `${values.employeeId ?? ""}`)?.name ?? "-",
    activityType: `${values.activityType ?? "-"}`,
    unitNumber: `${values.unitNumber ?? "-"}`,
    workDate: `${values.workDate ?? "-"}`,
    shift: `${values.shift ?? "-"}`,
    priority: `${values.priority ?? "-"}`,
    duration: getDurationLabel(`${values.startTime ?? ""}`, `${values.endTime ?? ""}`),
    overtimeMinutes: `${values.overtimeMinutes ?? "0"} menit`,
    photoAttachmentUrl: `${values.photoAttachmentUrl ?? ""}`.trim(),
    documentAttachmentUrl: `${values.documentAttachmentUrl ?? ""}`.trim(),
    remarks: `${values.remarks ?? "-"}`,
  };

  const setFieldValue = (fieldKey: string, value: string | string[]) => {
    setValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  };

  const getFieldOptions = (field: ActivityTemplateFormData["sections"][number]["fields"][number]) => {
    if (field.options.length > 0) {
      return dedupeOptions(
        field.options.map((option) => ({
          value: option.optionValue,
          label: option.optionLabel,
        })),
      );
    }

    if (field.fieldKey === "employeeId") {
      return dedupeOptions(
        data.employees.map((employee) => ({
          value: `${employee.id}`,
          label: `${employee.name} • ${employee.department}`,
        })),
      );
    }

    if (field.fieldKey === "siteName") {
      return dedupeOptions(
        data.sites.map((site) => ({
          value: site.name,
          label: site.name,
        })),
      );
    }

    if (field.fieldKey === "department") {
      return dedupeOptions(
        departments.map((department) => ({
          value: department,
          label: department,
        })),
      );
    }

    if (field.fieldKey === "section") {
      return dedupeOptions(
        sections.map((section) => ({
          value: section,
          label: section,
        })),
      );
    }

    if (field.fieldKey === "additionalWatchers") {
      return dedupeOptions(
        data.employees.map((employee) => ({
          value: employee.email,
          label: `${employee.name} • ${employee.email}`,
        })),
      );
    }

    return [];
  };

  const renderField = (field: ActivityTemplateFormData["sections"][number]["fields"][number]) => {
    const value = values[field.fieldKey] ?? (field.fieldType === "checkbox" || field.fieldType === "multi_select" ? [] : "");
    const options = getFieldOptions(field);

    if (field.fieldType === "textarea") {
      return (
        <div className="grid gap-2" key={field.id}>
          <Label>{field.label}</Label>
          <Textarea
            name={field.fieldKey}
            value={Array.isArray(value) ? value.join(", ") : value}
            onChange={(event) => setFieldValue(field.fieldKey, event.target.value)}
            rows={field.fieldKey === "remarks" ? 3 : 4}
            placeholder={field.placeholder || undefined}
          />
        </div>
      );
    }

    if (field.fieldType === "select" || field.fieldType === "people_picker" || field.fieldType === "org_unit_picker") {
      return (
        <div className="grid gap-2" key={field.id}>
          <Label>{field.label}</Label>
          <select
            name={field.fieldKey}
            value={Array.isArray(value) ? value[0] ?? "" : value}
            onChange={(event) => setFieldValue(field.fieldKey, event.target.value)}
            className="flex h-12 w-full rounded-md border-0 border-b-2 border-b-transparent bg-surface-container-low px-4 py-3 text-sm text-foreground outline-none shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] focus-visible:border-b-primary focus-visible:bg-surface-container-lowest focus-visible:ring-0"
          >
            <option value="">Pilih {field.label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.fieldType === "radio") {
      return (
        <div className="grid gap-3" key={field.id}>
          <Label>{field.label}</Label>
          <RadioGroup
            name={field.fieldKey}
            value={Array.isArray(value) ? value[0] ?? "" : value}
            onValueChange={(nextValue) => setFieldValue(field.fieldKey, nextValue)}
            className="grid gap-2"
          >
            {options.map((option) => (
              <label key={option.value} className="flex min-h-12 items-center gap-3 rounded-[1rem] bg-surface-container-low px-4 py-3">
                <RadioGroupItem value={option.value} id={`${field.fieldKey}-${option.value}`} />
                <span className="text-sm text-[#0f172a]">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      );
    }

    if (field.fieldType === "checkbox" || field.fieldType === "multi_select") {
      const currentValues = Array.isArray(value) ? value : [];
      return (
        <div className="grid gap-3" key={field.id}>
          <Label>{field.label}</Label>
          <div className="grid gap-2">
            {options.map((option) => (
              <label key={option.value} className="flex min-h-12 items-center gap-3 rounded-[1rem] bg-surface-container-low px-4 py-3">
                <Checkbox
                  name={field.fieldKey}
                  value={option.value}
                  checked={currentValues.includes(option.value)}
                  onCheckedChange={(checked) =>
                    setFieldValue(
                      field.fieldKey,
                      checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((item) => item !== option.value),
                    )
                  }
                />
                <span className="text-sm text-[#0f172a]">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (field.fieldType === "calculated_field") {
      return (
        <div className="grid gap-2" key={field.id}>
          <Label>{field.label}</Label>
          <Input readOnly value={getDurationLabel(`${values.startTime ?? ""}`, `${values.endTime ?? ""}`)} />
        </div>
      );
    }

    const resolvedType =
      field.fieldType === "number"
        ? "number"
        : field.fieldType === "date"
          ? "date"
          : field.fieldType === "datetime"
            ? "datetime-local"
            : "text";

    return (
      <div className="grid gap-2" key={field.id}>
        <Label>{field.label}</Label>
        <Input
          name={field.fieldKey}
          type={resolvedType}
          value={Array.isArray(value) ? value.join(", ") : value}
          onChange={(event) => setFieldValue(field.fieldKey, event.target.value)}
          placeholder={field.placeholder || undefined}
        />
      </div>
    );
  };

  return (
    <section className="rounded-[1.8rem] bg-surface-container-low p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <form className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{data.template.name}</h2>
            <p className="text-sm text-muted-foreground">
              Template-driven form dengan progress, preview, draft, attachment, watcher, dan signature field.
            </p>
          </div>

          <Card className="rounded-[1.4rem] bg-surface-container-lowest py-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Form Progress</CardTitle>
              <CardDescription>
                {progress}/{REQUIRED_FIELDS.length} field wajib terisi • {progressPercent}%
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-low">
                <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${progressPercent}%` }} />
              </div>
            </CardContent>
          </Card>

          {data.sections.map((section) => (
            <Card key={section.id} className="rounded-[1.4rem] bg-surface-container-lowest shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">{section.label}</CardTitle>
                <CardDescription>{section.description || "Section form template."}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {section.fields.map((field) => (
                  <div key={field.id} className={field.fieldType === "textarea" || field.fieldType === "checkbox" || field.fieldType === "multi_select" ? "md:col-span-2" : undefined}>
                    {renderField(field)}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-wrap justify-end gap-3">
            <Button formAction={saveActivityDraftAction} type="submit" variant="outline" className="rounded-full px-5">
              Simpan Draft
            </Button>
            <Button formAction={createActivityAction} type="submit" className="rounded-full px-5">
              Submit Final
            </Button>
          </div>
        </form>

        <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
          <CardHeader>
            <CardTitle>Preview Sebelum Submit</CardTitle>
            <CardDescription>Snapshot yang akan terbawa ke approval inbox dan request center.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[840px] rounded-[1.2rem] bg-surface-container-low">
              <div className="space-y-4 p-4">
                <div className="rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Header</p>
                  <p className="mt-2 font-semibold text-[#0f172a]">{resolvedPreview.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {resolvedPreview.requester} • {resolvedPreview.activityType} • {resolvedPreview.unitNumber}
                  </p>
                </div>
                <div className="grid gap-3">
                  {[
                    ["Tanggal kerja", resolvedPreview.workDate],
                    ["Shift", resolvedPreview.shift],
                    ["Priority", resolvedPreview.priority],
                    ["Durasi", resolvedPreview.duration],
                    ["Overtime", resolvedPreview.overtimeMinutes],
                    ["Remark", resolvedPreview.remarks],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                      <p className="mt-2 text-sm font-medium text-[#0f172a]">{value}</p>
                    </div>
                  ))}
                </div>

                {resolvedPreview.photoAttachmentUrl ? (
                  <div className="rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Photo Preview</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedPreview.photoAttachmentUrl}
                      alt="Attachment preview"
                      className="mt-3 h-48 w-full rounded-2xl object-cover"
                    />
                  </div>
                ) : null}

                {resolvedPreview.documentAttachmentUrl ? (
                  <div className="rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Document Attachment</p>
                    <p className="mt-2 text-sm font-medium text-[#0f172a]">{resolvedPreview.documentAttachmentUrl}</p>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
