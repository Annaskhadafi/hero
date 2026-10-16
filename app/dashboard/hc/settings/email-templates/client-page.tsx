"use client";

import { useState, useEffect, useMemo } from "react";
import { IconMail, IconPlus, IconTrash, IconSettings, IconHistory, IconExternalLink, IconEye, IconCode } from "@tabler/icons-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { saveHcEmailTemplate, deleteHcEmailTemplate, getHcEmailDeliveryLogs, ensureDefaultTemplates } from "@/app/actions/hc-email-templates";
import { getAvailablePlaceholders } from "@/lib/hc-email-utils";
import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { RecruitmentTabBar } from "@/components/hc/recruitment-tab-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { HeroSearchableSelect } from "@/components/templates";

const TEMPLATE_TYPES = [
  { value: "interview_invitation", label: "Interview Invitation" },
  { value: "test_assigned", label: "Online Test Assigned" },
  { value: "application_received", label: "Application Received" },
  { value: "mcu_pengantar", label: "MCU Surat Pengantar (to Clinic)" },
  { value: "mcu_invitation", label: "MCU Invitation (to Candidate)" },
] as const;

const PLACEHOLDER_DEFS = getAvailablePlaceholders();

type HcEmailTemplate = {
  id: number;
  name: string;
  type: string;
  subject: string;
  body: string;
  format: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Props = { initialTemplates: HcEmailTemplate[] };

const DEFAULT_BODY = `Yth. {candidateName},

Berikut adalah jadwal {type} untuk posisi {jobTitle} di {companyName}.

Hari/Tanggal: {date}
Waktu: {time}
Lokasi: {location}
Pewawancara: {interviewer}

Harap hadir 10 menit sebelum jadwal. Bawa dokumen pendukung jika ada.

Terima kasih.
{companyName}`;

export function HcEmailTemplatesClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HcEmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: number; toEmail: string; subject: string; templateCode: string | null; templateName: string | null; status: string; errorMessage: string | null; sentAt: Date | null; createdAt: Date }>>([]);

  useEffect(() => {
    getHcEmailDeliveryLogs(10).then(setLogs).catch(() => {});
  }, []);
  const [form, setForm] = useState({ name: "", type: "interview_invitation", subject: "", body: DEFAULT_BODY, format: "html" });
  const [showPreview, setShowPreview] = useState(false);

  const [templateSortField, setTemplateSortField] = useState<string | null>(null);
  const [templateSortDir, setTemplateSortDir] = useState<'asc' | 'desc'>('asc');

  const handleTemplateSort = (field: string) => {
    if (templateSortField === field) {
      if (templateSortDir === 'asc') setTemplateSortDir('desc');
      else { setTemplateSortField(null); setTemplateSortDir('asc'); }
    } else {
      setTemplateSortField(field);
      setTemplateSortDir('asc');
    }
  };

  const sortedTemplates = useMemo<HcEmailTemplate[]>(() => {
    if (!templateSortField) return templates;
    return [...templates].sort((a, b) => {
      const aVal = String((a as any)[templateSortField] ?? '').toLowerCase();
      const bVal = String((b as any)[templateSortField] ?? '').toLowerCase();
      if (aVal < bVal) return templateSortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return templateSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [templates, templateSortField, templateSortDir]);

  const [logSortField, setLogSortField] = useState<string | null>(null);
  const [logSortDir, setLogSortDir] = useState<'asc' | 'desc'>('asc');

  const handleLogSort = (field: string) => {
    if (logSortField === field) {
      if (logSortDir === 'asc') setLogSortDir('desc');
      else { setLogSortField(null); setLogSortDir('asc'); }
    } else {
      setLogSortField(field);
      setLogSortDir('asc');
    }
  };

  const sortedLogs = useMemo(() => {
    if (!logSortField) return logs;
    return [...logs].sort((a, b) => {
      let aVal = (a as any)[logSortField] ?? '';
      let bVal = (b as any)[logSortField] ?? '';
      if (logSortField === 'sentAt' || logSortField === 'createdAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return logSortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return logSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [logs, logSortField, logSortDir]);

  const openEdit = (t?: HcEmailTemplate) => {
    if (t) {
      setEditing(t);
      setForm({ name: t.name, type: t.type, subject: t.subject, body: t.body, format: t.format || "html" });
    } else {
      setEditing(null);
      setForm({ name: "", type: "interview_invitation", subject: "", body: DEFAULT_BODY, format: "html" });
    }
    setOpen(true);
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) {
      toast.error("Name, Subject, and Body are required");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveHcEmailTemplate(editing?.id ?? null, {
        name: form.name,
        type: form.type,
        subject: form.subject,
        body: form.body,
        format: form.format,
      });
      if (editing) {
        setTemplates(prev => prev.map(t => t.id === editing.id ? { ...t, ...saved } as HcEmailTemplate : t));
      } else {
        setTemplates(prev => [saved as HcEmailTemplate, ...prev]);
      }
      toast.success(editing ? "Template updated" : "Template created");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    try {
      await deleteHcEmailTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Template deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <AdminPageShell eyebrow="HC Settings" title="Email Templates" description="Manage recruitment email notifications">
      <RecruitmentTabBar />
      <div className="mt-8 space-y-6">

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Templates</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={async () => { await ensureDefaultTemplates(); toast.success("Default templates created"); window.location.reload(); }}>
                Seed Default Templates
              </Button>
              <Button onClick={() => openEdit()}><IconPlus className="w-4 h-4 mr-2" /> New Template</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent" onClick={() => handleTemplateSort('name')}>
                    Name
                    {templateSortField === 'name' ? (templateSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent" onClick={() => handleTemplateSort('type')}>
                    Type
                    {templateSortField === 'type' ? (templateSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent" onClick={() => handleTemplateSort('format')}>
                    Format
                    {templateSortField === 'format' ? (templateSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent" onClick={() => handleTemplateSort('subject')}>
                    Subject
                    {templateSortField === 'subject' ? (templateSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent" onClick={() => handleTemplateSort('isActive')}>
                    Status
                    {templateSortField === 'isActive' ? (templateSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTemplates.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No email templates yet. Create one to get started.</TableCell></TableRow>
                )}
                {sortedTemplates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="outline">{TEMPLATE_TYPES.find(tt => tt.value === t.type)?.label || t.type}</Badge></TableCell>
                    <TableCell><Badge variant={t.format === "plain_text" ? "secondary" : "default"} className="text-xs">{t.format === "plain_text" ? "Plain Text" : "HTML"}</Badge></TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">{t.subject}</TableCell>
                    <TableCell><Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><IconSettings className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(t.id)}><IconTrash className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Placeholder Reference */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Available Placeholders</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {Object.entries(PLACEHOLDER_DEFS || {}).map(([key, desc]) => (
                <div key={key} className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md">
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{`{${key}}`}</code>
                  <span className="text-muted-foreground text-xs">{desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><IconHistory className="w-4 h-4" /> Recent Delivery Logs</CardTitle>
            </div>
            <Link href="/dashboard/settings/email" target="_blank">
              <Button variant="outline" size="sm"><IconExternalLink className="w-4 h-4 mr-1" /> Full Logs</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent" onClick={() => handleLogSort('toEmail')}>
                      To
                      {logSortField === 'toEmail' ? (logSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent" onClick={() => handleLogSort('templateCode')}>
                      Template
                      {logSortField === 'templateCode' ? (logSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent" onClick={() => handleLogSort('subject')}>
                      Subject
                      {logSortField === 'subject' ? (logSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent" onClick={() => handleLogSort('status')}>
                      Status
                      {logSortField === 'status' ? (logSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent" onClick={() => handleLogSort('sentAt')}>
                      Sent At
                      {logSortField === 'sentAt' ? (logSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLogs.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No delivery logs yet. Emails sent via HC templates will appear here.</TableCell></TableRow>
                )}
                {sortedLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.toEmail}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{log.templateCode}</Badge></TableCell>
                    <TableCell className="text-muted-foreground max-w-[250px] truncate">{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === "sent" ? "default" : "destructive"} className={log.status === "sent" ? "bg-green-600" : ""}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.sentAt ? format(new Date(log.sentAt), "dd MMM HH:mm") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Email Template"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Interview Invitation" />
              </div>
              <div className="space-y-2">
                <Label>Type <span className="text-destructive">*</span></Label>
                <HeroSearchableSelect
                  value={form.type}
                  onChange={(val) => setForm({ ...form, type: val || "interview_invitation" })}
                  options={TEMPLATE_TYPES.map(tt => ({ value: tt.value, label: tt.label }))}
                  placeholder="Select Type"
                />
              </div>
              <div className="space-y-2">
                <Label>Format <span className="text-destructive">*</span></Label>
                <HeroSearchableSelect
                  value={form.format}
                  onChange={(val) => setForm({ ...form, format: val || "html" })}
                  options={[
                    { value: "html", label: "HTML (Rich Email)" },
                    { value: "plain_text", label: "Plain Text (No HTML)" },
                  ]}
                  placeholder="Select Format"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Subject <span className="text-destructive">*</span></Label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. [HERO] Interview Invitation - {jobTitle}" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Body {form.format === "html" ? "(HTML supported)" : "(Plain Text only)"} <span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-2">
                  <IconCode className="w-4 h-4 text-muted-foreground" />
                  <Switch checked={showPreview} onCheckedChange={setShowPreview} />
                  <IconEye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{showPreview ? "Preview" : "Code"}</span>
                </div>
              </div>
              {showPreview ? (
                <div className="border rounded-lg bg-white overflow-hidden" style={{ minHeight: "400px" }}>
                  <iframe
                    srcDoc={form.body}
                    className="w-full h-full border-0"
                    style={{ minHeight: "400px" }}
                    title="Email Preview"
                  />
                </div>
              ) : (
                <Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                  rows={14} className="font-mono text-sm" />
              )}
            </div>
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
              <strong>Available variables:</strong> {Object.keys(PLACEHOLDER_DEFS || {}).map(k => `{${k}}`).join(", ")}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
