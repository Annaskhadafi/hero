"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Eye,
  FileText,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  restoreEmailTemplatePresetAction,
  saveEmailTemplateAction,
  sendTemplateTestAction,
  syncEmailTemplatePresetsAction,
  toggleEmailTemplateActiveAction,
  type EmailSettingsActionState,
} from "@/app/dashboard/settings/email/actions";
import {
  EMAIL_TEMPLATE_PRESETS,
  EMAIL_TEMPLATE_PRESET_MAP,
  getTemplateFeature,
  type EmailTemplatePreset,
} from "@/lib/email-template-presets";
import { EmployeeMultiSelect } from "@/components/employee-multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  hseRecipientEmails,
  hseCcEmails,
  hcRecipientEmails,
  hcCcEmails,
  employees,
}: {
  templates: EmailTemplateRecord[];
  hseRecipientEmails: string;
  hseCcEmails: string;
  hcRecipientEmails: string;
  hcCcEmails: string;
  employees: Array<{ id: number; name: string; email: string }>;
}) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateRecord | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [restoringCode, setRestoringCode] = useState<string | null>(null);
  const [testSendingId, setTestSendingId] = useState<number | null>(null);
  const [isSyncingPresets, setIsSyncingPresets] = useState(false);

  const scopeList = formData.recipientScope
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const selectedRecipientEmails = scopeList.filter((scope) => scope.includes("@"));
  const selectedCcEmails = formData.ccEmail
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const scopeDescriptions = scopeList.map((scope) => {
    if (scope.includes("@")) return { label: "User terpilih", detail: scope };
    if (scope === "employee") return { label: "employee", detail: "Variabel: {{employeeName}}, {{employeeEmail}}" };
    if (scope === "candidate") return { label: "candidate", detail: "Variabel: {{candidateName}}, {{candidateEmail}}" };
    if (scope === "approver") return { label: "approver", detail: "Ditentukan oleh approval engine saat runtime" };
    if (scope === "reviewer") return { label: "reviewer", detail: "Ditentukan oleh sistem review saat runtime" };
    if (scope === "admin") return { label: "admin", detail: "Ditentukan oleh role admin sistem" };
    if (scope === "pjo") return { label: "pjo", detail: "Ditentukan oleh assignment PJO saat runtime" };
    if (scope === "clinic") return { label: "clinic", detail: "Ditentukan oleh pemilihan klinik saat runtime" };
    if (scope === "hse") {
      const emails = hseRecipientEmails.split(",").map((e) => e.trim()).filter(Boolean);
      const ccList = hseCcEmails.split(",").map((e) => e.trim()).filter(Boolean);
      return {
        label: "HSE Safety",
        detail: emails.length > 0
          ? `Kirim ke: ${emails.join(", ")}${ccList.length > 0 ? ` | CC: ${ccList.join(", ")}` : ""}`
          : "Belum ada email penerima di Settings > HSE Safety",
      };
    }
    if (scope === "hc") {
      const emails = hcRecipientEmails.split(",").map((e) => e.trim()).filter(Boolean);
      const ccList = hcCcEmails.split(",").map((e) => e.trim()).filter(Boolean);
      return {
        label: "Human Capital",
        detail: emails.length > 0
          ? `Kirim ke: ${emails.join(", ")}${ccList.length > 0 ? ` | CC: ${ccList.join(", ")}` : ""}`
          : "Belum ada email penerima di Settings > Human Capital",
      };
    }
    return { label: scope, detail: "Tidak diketahui" };
  });

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

  const handleSendTest = async (template: EmailTemplateRecord) => {
    setTestSendingId(template.id);

    const form = new FormData();
    form.append("templateId", template.id.toString());

    const result = await sendTemplateTestAction(INITIAL_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setTestSendingId(null);
  };

  return (
    <Card className="rounded-lg p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Email Template</h2>
          <p className="text-sm text-muted-foreground">
            Kelola template email yang dipakai modul approval, auth, invitation, dan workflow notifikasi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-0 bg-primary/10 text-primary">
            {activeTemplatesCount} aktif
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {presetTemplatesCount} workflow
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {customTemplatesCount} custom
          </Badge>
          <Button
            type="button"
            variant="outline"
            className="rounded-lg"
            onClick={handleSyncAllPresets}
            disabled={isSyncingPresets}
          >
            <RefreshCcw className="size-4" />
            {isSyncingPresets ? "Sync..." : "Sync Preset"}
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-[1rem] bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)]"
          >
            <Plus className="size-4" />
            Template Baru
          </Button>
        </div>
      </div>

      <MinimalTableShell
        label="email templates"
        fileName="email-templates"
        searchPlaceholder="Cari nama, kode, fitur, tipe, atau subject..."
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
              label="feature"
              filterKey="feature"
              options={Array.from(
                new Set(templates.map((template) => getTemplateFeature(template.templateCode)))
              )
                .sort()
                .map((feature) => ({ value: feature.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label: feature }))}
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
      >
          <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Fitur</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length > 0 ? (
              templates.map((template) => {
                const feature = getTemplateFeature(template.templateCode);
                const isEmailChannel = template.deliveryChannel.split(",").some((channel) => channel.trim() === "email");

                return (
                  <TableRow
                    key={template.id}
                    className="hover:bg-surface-container"
                    data-date-value={template.updatedAt.toISOString()}
                    data-filter-origin={
                      EMAIL_TEMPLATE_PRESET_MAP[template.templateCode] ? "workflow" : "custom"
                    }
                    data-filter-feature={feature.toLowerCase().replace(/[^a-z0-9]+/g, "_")}
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
                        {feature}
                      </Badge>
                    </TableCell>
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
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {template.subject}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={(checked) => handleToggleActive(template, checked)}
                        disabled={togglingId === template.id}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isEmailChannel ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-primary hover:bg-surface-container-low"
                            onClick={() => handleSendTest(template)}
                            disabled={testSendingId === template.id}
                            aria-label={`Test email template ${template.name}`}
                            title={`Test email template ${template.name}`}
                          >
                            {testSendingId === template.id ? (
                              <RefreshCcw className="size-4 animate-spin" />
                            ) : (
                              <Send className="size-4" />
                            )}
                            <span className="sr-only">Test email</span>
                          </Button>
                        ) : null}
                        {EMAIL_TEMPLATE_PRESET_MAP[template.templateCode] ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-primary hover:bg-surface-container-low"
                            onClick={() => handleRestorePreset(template.templateCode)}
                            disabled={restoringCode === template.templateCode}
                            aria-label={`Restore default template ${template.name}`}
                            title={`Restore default template ${template.name}`}
                          >
                            <RotateCcw
                              className={restoringCode === template.templateCode ? "size-4 animate-spin" : "size-4"}
                            />
                            <span className="sr-only">Restore Default</span>
                          </Button>
                        ) : null}
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
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
        <DialogContent className="w-[min(98vw,1400px)] max-w-[min(98vw,1400px)] max-h-[94vh] overflow-y-auto">
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
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Nama Template</Label>
                    <Input
                      id="template-name"
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      placeholder="Approval Assignment"
                      required
                    />
                  </div>
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 rounded-xl border bg-surface-container-lowest p-3">
                    <div className="flex items-start gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                        <Users className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <Label>Scope Penerima</Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Pilih user tujuan email. Untuk workflow lama, isi scope manual seperti hc, hse, approver tetap bisa dipakai.
                        </p>
                      </div>
                    </div>
                    <EmployeeMultiSelect
                      label="penerima"
                      selectedEmails={selectedRecipientEmails}
                      onChange={(emails) =>
                        setFormData({ ...formData, recipientScope: emails.join(", ") || "all" })
                      }
                      employees={employees}
                      placeholder="Pilih user penerima utama..."
                    />
                    <Input
                      id="template-scope"
                      value={formData.recipientScope}
                      onChange={(event) =>
                        setFormData({ ...formData, recipientScope: event.target.value })
                      }
                      placeholder="Pilih user atau isi scope: hc, hse, approver"
                      required
                    />
                    {scopeDescriptions.length > 0 ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {scopeDescriptions.map((scope, index) => (
                          <div key={scope.label + "-" + index} className="rounded-lg bg-surface-container-low px-3 py-2 text-xs">
                            <span className="font-semibold">{scope.label}:</span>{" "}
                            <span className="text-muted-foreground">{scope.detail}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-xl border bg-surface-container-lowest p-3">
                    <div>
                      <Label>CC Email</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pilih user CC. Nilai ini juga digabung dengan CC runtime dari domain fitur.
                      </p>
                    </div>
                    <EmployeeMultiSelect
                      label="CC"
                      selectedEmails={selectedCcEmails}
                      onChange={(emails) => setFormData({ ...formData, ccEmail: emails.join(", ") })}
                      employees={employees}
                      placeholder="Pilih user CC..."
                    />
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
                  <div className="flex items-start gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                      <Send className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <Label>Channel</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pilih channel pengiriman notifikasi.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      { id: "email", label: "Email", desc: "Kirim via email SMTP" },
                      { id: "bell", label: "Notification Bell", desc: "Notifikasi di header aplikasi" },
                      { id: "pwa_push", label: "PWA Push", desc: "Push notification ke browser" },
                    ].map((channel) => {
                      const selected = formData.deliveryChannel.split(",").map((c) => c.trim());
                      const isChecked = selected.includes(channel.id);
                      return (
                        <label
                          key={channel.id}
                          className="flex items-start gap-3 rounded-lg border bg-surface-container-low px-3 py-2 cursor-pointer hover:bg-surface-container-low/80 transition-colors"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...selected, channel.id]
                                : selected.filter((c) => c !== channel.id);
                              setFormData({ ...formData, deliveryChannel: next.join(",") });
                            }}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{channel.label}</p>
                            <p className="text-xs text-muted-foreground">{channel.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>

            <Card className="rounded-lg border bg-surface-container-lowest p-4 shadow-sm">
              <Tabs defaultValue="preview" className="min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="size-4 text-primary" />
                    <h3 className="font-display text-base font-semibold">Live Preview</h3>
                  </div>
                  <TabsList className="grid w-auto grid-cols-3">
                    <TabsTrigger value="preview">Live Preview</TabsTrigger>
                    <TabsTrigger value="html">HTML Content</TabsTrigger>
                    <TabsTrigger value="text">Text Content</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="preview" className="mt-4">
                  <div className="mb-3 rounded-lg bg-surface-container-low p-3">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="mt-1 text-sm font-medium">{previewSubject}</p>
                  </div>
                  <div className="h-[480px] overflow-hidden rounded-xl border bg-white">
                    <iframe
                      srcDoc={previewHtml}
                      title="Live preview HTML"
                      className="h-full w-full"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="html" className="mt-4">
                  <Label htmlFor="template-html">HTML Content</Label>
                  <Textarea
                    id="template-html"
                    value={formData.htmlContent}
                    onChange={(event) =>
                      setFormData({ ...formData, htmlContent: event.target.value })
                    }
                    placeholder="<p>Request #{{requestId}} menunggu approval Anda.</p>"
                    className="mt-2 min-h-[480px] font-mono text-xs"
                  />
                </TabsContent>

                <TabsContent value="text" className="mt-4">
                  <Label htmlFor="template-text">Text Content</Label>
                  <Textarea
                    id="template-text"
                    value={formData.textContent}
                    onChange={(event) =>
                      setFormData({ ...formData, textContent: event.target.value })
                    }
                    placeholder="Request #{{requestId}} menunggu approval Anda."
                    className="mt-2 min-h-[480px] font-mono text-xs"
                  />
                </TabsContent>
              </Tabs>
            </Card>

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
