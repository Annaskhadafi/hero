"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  FileText,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  restoreEmailTemplatePresetAction,
  saveEmailTemplateAction,
  syncEmailTemplatePresetsAction,
  toggleEmailTemplateActiveAction,
  type EmailSettingsActionState,
} from "@/app/dashboard/settings/email/actions";
import {
  EMAIL_TEMPLATE_PRESETS,
  EMAIL_TEMPLATE_PRESET_MAP,
  type EmailTemplatePreset,
} from "@/lib/email-template-presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Switch } from "@/components/ui/switch";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type EmailTemplateRecord = {
  id: number;
  name: string;
  templateCode: string;
  templateType: string;
  deliveryChannel: string;
  recipientScope: string;
  ccEmail: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const INITIAL_STATE: EmailSettingsActionState = {
  status: "idle",
  message: "",
};

const EMPTY_FORM = {
  name: "",
  templateCode: "",
  templateType: "Notification",
  deliveryChannel: "email",
  recipientScope: "all",
  ccEmail: "",
  subject: "",
  htmlContent: "",
  textContent: "",
  isActive: true,
};

function renderTemplatePreview(content: string, values: Record<string, string>) {
  return content.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, token: string) => {
    return values[token] ?? "";
  });
}

function buildFormFromPreset(
  preset: EmailTemplatePreset,
  overrides?: Partial<typeof EMPTY_FORM>,
) {
  return {
    name: preset.name,
    templateCode: preset.templateCode,
    templateType: preset.templateType,
    deliveryChannel: preset.deliveryChannel,
    recipientScope: preset.recipientScope,
    ccEmail: preset.ccEmail,
    subject: preset.subject,
    htmlContent: preset.htmlContent,
    textContent: preset.textContent,
    isActive: true,
    ...overrides,
  };
}

export function EmailTemplateSettingsPanel({
  templates,
}: {
  templates: EmailTemplateRecord[];
}) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateRecord | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [restoringCode, setRestoringCode] = useState<string | null>(null);
  const [isSyncingPresets, setIsSyncingPresets] = useState(false);

  const templatesByCode = useMemo(
    () => new Map(templates.map((template) => [template.templateCode, template])),
    [templates],
  );

  const presetTemplatesCount = templates.filter((template) =>
    Boolean(EMAIL_TEMPLATE_PRESET_MAP[template.templateCode]),
  ).length;
  const customTemplatesCount = templates.length - presetTemplatesCount;
  const activeTemplatesCount = templates.filter((template) => template.isActive).length;
  const activePreset = EMAIL_TEMPLATE_PRESET_MAP[formData.templateCode] ?? null;
  const previewValues = activePreset?.sampleValues ?? {};
  const previewSubject = renderTemplatePreview(formData.subject || "(subject kosong)", previewValues);
  const previewHtml = renderTemplatePreview(
    formData.htmlContent || "<p>Template belum memiliki HTML content.</p>",
    previewValues,
  );
  const previewText = renderTemplatePreview(
    formData.textContent || "Template belum memiliki text content.",
    previewValues,
  );

  const handleOpenDialog = (template?: EmailTemplateRecord, preset?: EmailTemplatePreset) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        templateCode: template.templateCode,
        templateType: template.templateType,
        deliveryChannel: template.deliveryChannel,
        recipientScope: template.recipientScope,
        ccEmail: template.ccEmail,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        isActive: template.isActive,
      });
    } else if (preset) {
      setEditingTemplate(null);
      setFormData(buildFormFromPreset(preset));
    } else {
      setEditingTemplate(null);
      setFormData(EMPTY_FORM);
    }

    setIsDialogOpen(true);
  };

  const handleOpenFromRegistry = (preset: EmailTemplatePreset) => {
    const existingTemplate = templatesByCode.get(preset.templateCode);
    handleOpenDialog(existingTemplate, preset);
  };

  const handleResetToPreset = () => {
    if (!activePreset) {
      return;
    }

    setFormData(
      buildFormFromPreset(activePreset, {
        isActive: formData.isActive,
      }),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    const form = new FormData();
    form.append("intent", editingTemplate ? "update" : "create");
    if (editingTemplate) {
      form.append("id", editingTemplate.id.toString());
    }
    form.append("name", formData.name);
    form.append("templateCode", formData.templateCode);
    form.append("templateType", formData.templateType);
    form.append("deliveryChannel", formData.deliveryChannel);
    form.append("recipientScope", formData.recipientScope);
    form.append("ccEmail", formData.ccEmail);
    form.append("subject", formData.subject);
    form.append("htmlContent", formData.htmlContent);
    form.append("textContent", formData.textContent);
    form.append("isActive", formData.isActive.toString());

    const result = await saveEmailTemplateAction(INITIAL_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingTemplate(null);
      setFormData(EMPTY_FORM);
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setIsSaving(false);
  };

  const handleToggleActive = async (template: EmailTemplateRecord, nextValue: boolean) => {
    setTogglingId(template.id);

    const form = new FormData();
    form.append("id", template.id.toString());
    form.append("isActive", nextValue.toString());

    const result = await toggleEmailTemplateActiveAction(INITIAL_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setTogglingId(null);
  };

  const handleRestorePreset = async (templateCode: string) => {
    setRestoringCode(templateCode);

    const form = new FormData();
    form.append("templateCode", templateCode);

    const result = await restoreEmailTemplatePresetAction(INITIAL_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setRestoringCode(null);
  };

  const handleSyncAllPresets = async () => {
    setIsSyncingPresets(true);

    const result = await syncEmailTemplatePresetsAction(INITIAL_STATE);

    if (result.status === "success") {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setIsSyncingPresets(false);
  };

  return (
    <Card className="rounded-lg p-4 shadow-sm">
      <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="rounded-lg border bg-surface-container-lowest p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">Workflow Template Registry</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Preset ini memetakan template email sistem ke kode workflow yang dipakai modul.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge className="rounded-full border-0 bg-primary/10 text-primary">
                {EMAIL_TEMPLATE_PRESETS.length} preset
              </Badge>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg"
                onClick={handleSyncAllPresets}
                disabled={isSyncingPresets}
              >
                <RefreshCcw className="size-4" />
                {isSyncingPresets ? "Sync..." : "Sync Semua Preset"}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {EMAIL_TEMPLATE_PRESETS.map((preset) => {
              const existingTemplate = templatesByCode.get(preset.templateCode);

              return (
                <div
                  key={preset.templateCode}
                  className="rounded-xl border bg-surface-container-low p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{preset.name}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {preset.templateCode}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-full bg-surface-container-lowest text-xs"
                    >
                      {existingTemplate ? "Tersedia" : "Belum ada"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{preset.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {preset.templateType}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {preset.variables.length} variabel
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => handleOpenFromRegistry(preset)}
                    >
                      <WandSparkles className="size-4" />
                      {existingTemplate ? "Edit Default" : "Buat dari Preset"}
                    </Button>
                    {existingTemplate ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => handleRestorePreset(preset.templateCode)}
                        disabled={restoringCode === preset.templateCode}
                      >
                        <RotateCcw className="size-4" />
                        {restoringCode === preset.templateCode ? "Restore..." : "Restore Default"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-lg border bg-surface-container-lowest p-4 shadow-sm">
          <h3 className="font-display text-lg font-semibold">Ringkasan Template</h3>
          <div className="mt-4 space-y-3">
            {[
              ["Total template", String(templates.length)],
              ["Template aktif", String(activeTemplatesCount)],
              ["Template workflow", String(presetTemplatesCount)],
              ["Template custom", String(customTemplatesCount)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-display text-lg font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm text-muted-foreground">
            Gunakan registry untuk audit cepat kode template sistem, lalu edit subject atau body tanpa
            menebak placeholder manual.
          </div>
        </Card>
      </div>

      <MinimalTableShell
        title="Email Template"
        description="Kelola template email yang dipakai modul approval, auth, invitation, dan workflow notifikasi."
        label="email templates"
        fileName="email-templates"
        searchPlaceholder="Cari nama, kode, tipe, atau subject..."
        filters={
          <div className="flex flex-wrap gap-2">
            <TableMultiFilter
              label="origin"
              filterKey="origin"
              options={[
                { value: "workflow", label: "Workflow" },
                { value: "custom", label: "Custom" },
              ]}
            />
            <TableMultiFilter
              label="active"
              filterKey="active"
              options={[
                { value: "active", label: "Aktif" },
                { value: "inactive", label: "Nonaktif" },
              ]}
            />
          </div>
        }
        actions={
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-[1rem] bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)]"
          >
            <Plus className="size-4" />
            Template Baru
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Variabel</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length > 0 ? (
              templates.map((template) => (
                <TableRow
                  key={template.id}
                  className="hover:bg-surface-container"
                  data-date-value={template.updatedAt.toISOString()}
                  data-filter-origin={
                    EMAIL_TEMPLATE_PRESET_MAP[template.templateCode] ? "workflow" : "custom"
                  }
                  data-filter-active={template.isActive ? "active" : "inactive"}
                >
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-semibold">{template.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {EMAIL_TEMPLATE_PRESET_MAP[template.templateCode]?.description ??
                          "Template custom dari admin."}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{template.templateCode}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full">
                      {EMAIL_TEMPLATE_PRESET_MAP[template.templateCode] ? "Workflow" : "Custom"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full">
                      {template.templateType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{template.deliveryChannel}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {EMAIL_TEMPLATE_PRESET_MAP[template.templateCode]?.variables.length ?? 0}
                  </TableCell>
                  <TableCell className="max-w-[360px] truncate text-muted-foreground">
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={(checked) => handleToggleActive(template, checked)}
                      disabled={togglingId === template.id}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-primary hover:bg-surface-container-low"
                      onClick={() => handleOpenDialog(template)}
                      aria-label={`Edit template ${template.name}`}
                      title={`Edit template ${template.name}`}
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit template</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Tidak ada template email.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[min(96vw,1100px)] max-w-[min(96vw,1100px)]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template Email" : "Buat Template Email"}
            </DialogTitle>
            <DialogDescription>
              Gunakan placeholder seperti {"{{requestId}}"}, {"{{userName}}"}, atau {"{{magicLink}}"} sesuai kebutuhan modul.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_360px]">
              <div className="space-y-4">
                <Card className="rounded-lg border bg-surface-container-lowest p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-semibold">
                        Preset Workflow Cepat
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pilih preset untuk mengisi subject, body, dan metadata template sistem.
                      </p>
                    </div>
                    {activePreset ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg"
                        onClick={handleResetToPreset}
                      >
                        <RotateCcw className="size-4" />
                        Reset ke Default
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {EMAIL_TEMPLATE_PRESETS.map((preset) => (
                      <Button
                        key={preset.templateCode}
                        type="button"
                        variant={
                          formData.templateCode === preset.templateCode ? "default" : "outline"
                        }
                        className="h-auto items-start justify-start rounded-lg px-3 py-3 text-left"
                        onClick={() =>
                          setFormData(
                            buildFormFromPreset(preset, {
                              isActive: formData.isActive,
                            }),
                          )
                        }
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{preset.name}</p>
                          <p className="mt-1 font-mono text-[11px] opacity-80">
                            {preset.templateCode}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2 xl:col-span-1">
                    <Label htmlFor="template-name">Nama Template</Label>
                    <Input
                      id="template-name"
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      placeholder="Approval Assignment"
                      required
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-1">
                    <Label htmlFor="template-code">Kode Template</Label>
                    <Input
                      id="template-code"
                      value={formData.templateCode}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          templateCode: event.target.value.toLowerCase().replaceAll(" ", "_"),
                        })
                      }
                      placeholder="approval_assignment"
                      required
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-1">
                    <Label htmlFor="template-type">Type</Label>
                    <Input
                      id="template-type"
                      value={formData.templateType}
                      onChange={(event) =>
                        setFormData({ ...formData, templateType: event.target.value })
                      }
                      placeholder="Notification"
                      required
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-1">
                    <Label htmlFor="template-active">Status</Label>
                    <div className="flex h-10 items-center rounded-lg border bg-surface-container-low px-3">
                      <Switch
                        id="template-active"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <span className="ml-3 text-sm font-medium">
                        {formData.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 xl:col-span-2">
                    <Label htmlFor="template-channel">Channel</Label>
                    <Input
                      id="template-channel"
                      value={formData.deliveryChannel}
                      onChange={(event) =>
                        setFormData({ ...formData, deliveryChannel: event.target.value })
                      }
                      placeholder="email,bell,pwa_push"
                      required
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-1">
                    <Label htmlFor="template-scope">Scope Penerima</Label>
                    <Input
                      id="template-scope"
                      value={formData.recipientScope}
                      onChange={(event) =>
                        setFormData({ ...formData, recipientScope: event.target.value })
                      }
                      placeholder="approver"
                      required
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-1">
                    <Label htmlFor="template-cc">CC Email</Label>
                    <Input
                      id="template-cc"
                      value={formData.ccEmail}
                      onChange={(event) => setFormData({ ...formData, ccEmail: event.target.value })}
                      placeholder="optional@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-subject">Subject</Label>
                  <Input
                    id="template-subject"
                    value={formData.subject}
                    onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                    placeholder="Tugas approval baru #{{requestId}}"
                    required
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="template-html">HTML Content</Label>
                    <Textarea
                      id="template-html"
                      value={formData.htmlContent}
                      onChange={(event) =>
                        setFormData({ ...formData, htmlContent: event.target.value })
                      }
                      placeholder="<p>Request #{{requestId}} menunggu approval Anda.</p>"
                      className="min-h-64 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-text">Text Content</Label>
                    <Textarea
                      id="template-text"
                      value={formData.textContent}
                      onChange={(event) =>
                        setFormData({ ...formData, textContent: event.target.value })
                      }
                      placeholder="Request #{{requestId}} menunggu approval Anda."
                      className="min-h-64 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Card className="rounded-lg border bg-surface-container-lowest p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-semibold">Metadata Workflow</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Placeholder dan sample data untuk pratinjau aman.
                      </p>
                    </div>
                    <Badge className="rounded-full border-0 bg-primary/10 text-primary">
                      {activePreset ? "Mapped" : "Custom"}
                    </Badge>
                  </div>

                  {activePreset ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-lg bg-surface-container-low p-3">
                        <p className="font-medium">{activePreset.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {activePreset.description}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {activePreset.variables.map((variable) => (
                          <div
                            key={variable}
                            className="rounded-lg border bg-surface-container-low px-3 py-2"
                          >
                            <p className="font-mono text-xs font-semibold">{`{{${variable}}}`}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {activePreset.sampleValues[variable] || "Sample value kosong"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm text-muted-foreground">
                      Template ini belum terpetakan ke preset workflow. Anda tetap bisa edit manual,
                      tapi preview hanya memakai isi raw tanpa sample variable sistem.
                    </div>
                  )}
                </Card>

                <Card className="rounded-lg border bg-surface-container-lowest p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Eye className="size-4 text-primary" />
                    <h3 className="font-display text-base font-semibold">Live Preview</h3>
                  </div>
                  <div className="mt-4 rounded-lg bg-surface-container-low p-3">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="mt-1 text-sm font-medium">{previewSubject}</p>
                  </div>

                  <Tabs defaultValue="html" className="mt-4 min-w-0">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="html">HTML</TabsTrigger>
                      <TabsTrigger value="text">Text</TabsTrigger>
                    </TabsList>
                    <TabsContent value="html" className="mt-4">
                      <div className="h-[320px] overflow-hidden rounded-xl border bg-white">
                        <iframe
                          srcDoc={previewHtml}
                          title="Live preview HTML"
                          className="h-full w-full"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="text" className="mt-4">
                      <div className="h-[320px] overflow-auto rounded-xl border p-4">
                        <pre className="whitespace-pre-wrap break-words font-mono text-sm">
                          {previewText}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)]"
              >
                <FileText className="size-4" />
                {isSaving
                  ? "Menyimpan..."
                  : editingTemplate
                    ? "Simpan Perubahan"
                    : "Buat Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
