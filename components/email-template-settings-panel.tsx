"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  saveEmailTemplateAction,
  toggleEmailTemplateActiveAction,
  type EmailSettingsActionState,
} from "@/app/dashboard/settings/email/actions";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function EmailTemplateSettingsPanel({
  templates,
}: {
  templates: EmailTemplateRecord[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateRecord | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const filteredTemplates = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return templates.filter((template) => {
      const haystack = [
        template.name,
        template.templateCode,
        template.templateType,
        template.deliveryChannel,
        template.subject,
      ]
        .join(" ")
        .toLowerCase();

      return !keyword || haystack.includes(keyword);
    });
  }, [query, templates]);

  const handleOpenDialog = (template?: EmailTemplateRecord) => {
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

  return (
    <Card className="rounded-lg p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Email Template</h2>
          <p className="text-sm text-muted-foreground">
            Kelola template email yang dipakai modul approval, auth, dan notifikasi.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, kode, tipe, atau subject..."
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-lg bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)]"
          >
            <Plus className="size-4" />
            Template Baru
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-surface-container-low p-2">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nama</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <TableRow key={template.id} className="hover:bg-surface-container">
                  <TableCell className="font-semibold">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full">
                      {template.templateType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{template.templateCode}</TableCell>
                  <TableCell className="text-sm">{template.deliveryChannel}</TableCell>
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
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => handleOpenDialog(template)}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Tidak ada template yang cocok dengan pencarian.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
                <Label htmlFor="template-type">Tipe</Label>
                <Input
                  id="template-type"
                  value={formData.templateType}
                  onChange={(event) => setFormData({ ...formData, templateType: event.target.value })}
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
                  placeholder="opsional@contoh.com"
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
