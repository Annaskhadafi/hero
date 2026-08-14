"use client";

import { useState, useTransition } from "react";
import { Gauge, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle, ShieldAlert, FileJson, Hash, ToggleLeft, Type, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  createDailyActivityConfigAction,
  updateDailyActivityConfigAction,
  deleteDailyActivityConfigAction,
} from "@/app/dashboard/activity-hub/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfigItem = {
  id: number;
  siteId: number | null;
  configKey: string;
  configLabel: string;
  configValue: string;
  valueType: string;
  description: string;
  isEditableBySectionHead: boolean;
  isActive: boolean;
  updatedAt: Date;
  siteName?: string | null;
  updatedByName?: string | null;
};

export type SiteItem = {
  id: number;
  name: string;
};

export type Permissions = {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  roleName?: string | null;
};

interface Props {
  initialSettings: ConfigItem[];
  sites: SiteItem[];
  permissions: Permissions;
  purpose: {
    title: string;
    description: string;
  };
}

export function ActivityConfigurationManagement({ initialSettings, sites, permissions, purpose }: Props) {
  const canEdit = permissions?.canEdit ?? true;
  const canDelete = permissions?.canDelete ?? true;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newValueType, setNewValueType] = useState<"boolean" | "number" | "text" | "json">("boolean");
  const [newValue, setNewValue] = useState("true");
  const [newDescription, setNewDescription] = useState("");
  const [newSiteId, setNewSiteId] = useState<string>("global");
  const [newIsActive, setNewIsActive] = useState(true);

  // Edit Modal state
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValueType, setEditValueType] = useState<"boolean" | "number" | "text" | "json">("text");
  const [editValue, setEditValue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSiteId, setEditSiteId] = useState<string>("global");
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete Modal state
  const [deletingItem, setDeletingItem] = useState<ConfigItem | null>(null);

  // JSON Error validation state
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Filtered settings
  const filteredSettings = initialSettings.filter((item) => {
    const matchesSearch =
      item.configLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.configKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSite =
      selectedSiteFilter === "all"
        ? true
        : selectedSiteFilter === "global"
        ? item.siteId === null
        : item.siteId === Number(selectedSiteFilter);

    return matchesSearch && matchesSite;
  });

  const openCreateModal = () => {
    setNewKey("");
    setNewLabel("");
    setNewValueType("boolean");
    setNewValue("true");
    setNewDescription("");
    setNewSiteId("global");
    setNewIsActive(true);
    setJsonError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (item: ConfigItem) => {
    setEditingItem(item);
    setEditLabel(item.configLabel);
    const validValueType = (["boolean", "number", "text", "json"].includes(item.valueType)
      ? item.valueType
      : "text") as "boolean" | "number" | "text" | "json";
    setEditValueType(validValueType);
    setEditValue(item.configValue);
    setEditDescription(item.description);
    setEditSiteId(item.siteId ? String(item.siteId) : "global");
    setEditIsActive(item.isActive);
    setJsonError(null);
  };

  const validateJson = (val: string): boolean => {
    if (!val.trim()) return true;
    try {
      JSON.parse(val);
      setJsonError(null);
      return true;
    } catch (err: any) {
      setJsonError(err?.message || "Format JSON tidak valid");
      return false;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newKey.trim()) {
      toast.error("Key Identifier wajib diisi");
      return;
    }
    if (!newLabel.trim()) {
      toast.error("Label Rule wajib diisi");
      return;
    }
    if (newValueType === "json" && !validateJson(newValue)) {
      toast.error("Format JSON tidak valid");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createDailyActivityConfigAction({
          configKey: newKey.trim().toLowerCase().replace(/\s+/g, "_"),
          configLabel: newLabel.trim(),
          configValue: newValue,
          valueType: newValueType,
          description: newDescription.trim(),
          siteId: newSiteId === "global" ? null : Number(newSiteId),
          isActive: newIsActive,
        });

        if (result?.success) {
          toast.success(result.message || "Rule global berhasil ditambahkan");
          setIsCreateOpen(false);
        }
      } catch (error: any) {
        toast.error(error?.message || "Gagal menambahkan rule global");
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editLabel.trim()) {
      toast.error("Label Rule wajib diisi");
      return;
    }

    if (editValueType === "json" && !validateJson(editValue)) {
      toast.error("Format JSON tidak valid");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateDailyActivityConfigAction({
          id: editingItem.id,
          configLabel: editLabel.trim(),
          configValue: editValue,
          valueType: editValueType,
          description: editDescription.trim(),
          siteId: editSiteId === "global" ? null : Number(editSiteId),
          isActive: editIsActive,
        });

        if (result?.success) {
          toast.success(result.message || "Rule global berhasil diperbarui");
          setEditingItem(null);
        }
      } catch (error: any) {
        toast.error(error?.message || "Gagal mengupdate rule global");
      }
    });
  };

  const handleDeleteSubmit = async () => {
    if (!deletingItem) return;

    startTransition(async () => {
      try {
        const result = await deleteDailyActivityConfigAction({ id: deletingItem.id });
        if (result?.success) {
          toast.success(result.message || "Rule global berhasil dihapus");
          setDeletingItem(null);
        }
      } catch (error: any) {
        toast.error(error?.message || "Gagal menghapus rule global");
      }
    });
  };

  const renderValueBadge = (item: ConfigItem) => {
    if (item.valueType === "boolean") {
      const isTrue = item.configValue === "true" || item.configValue === "1";
      return (
        <Badge variant="outline" className={isTrue ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono" : "border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-400 font-mono"}>
          {isTrue ? "True (Aktif)" : "False (Nonaktif)"}
        </Badge>
      );
    }
    if (item.valueType === "number") {
      return (
        <Badge variant="secondary" className="font-mono bg-blue-500/10 text-blue-700 dark:text-blue-300">
          {item.configValue}
        </Badge>
      );
    }
    if (item.valueType === "json") {
      return (
        <Badge variant="outline" className="font-mono bg-amber-500/10 text-amber-700 dark:text-amber-300 max-w-[200px] truncate" title={item.configValue}>
          {item.configValue}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="font-mono max-w-[220px] truncate" title={item.configValue}>
        {item.configValue || "-"}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "boolean":
        return <ToggleLeft className="size-3.5 text-emerald-500" />;
      case "number":
        return <Hash className="size-3.5 text-blue-500" />;
      case "json":
        return <FileJson className="size-3.5 text-amber-500" />;
      default:
        return <Type className="size-3.5 text-slate-500" />;
    }
  };

  return (
    <Card className="rounded-[1.6rem] border border-border/80 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <Gauge className="size-5 text-primary" />
            {purpose.title}
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-muted-foreground">
            {purpose.description}
          </CardDescription>
        </div>

        {canEdit && (
          <Button onClick={openCreateModal} className="rounded-full shadow-sm">
            <Plus className="mr-1.5 size-4" />
            Tambah Rule Global
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-muted/40 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari rule berdasarkan label, key, atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/80 rounded-lg text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <Select value={selectedSiteFilter} onValueChange={setSelectedSiteFilter}>
              <SelectTrigger className="w-[180px] bg-background/80 rounded-lg text-sm">
                <SelectValue placeholder="Semua Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Scope</SelectItem>
                <SelectItem value="global">Global (All Sites)</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={String(site.id)}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[280px]">Key / Rule</TableHead>
                <TableHead className="w-[140px]">Tipe & Nilai</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead>Keterangan & Scope</TableHead>
                <TableHead className="w-[120px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSettings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Tidak ada rule global yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSettings.map((setting) => (
                  <TableRow key={setting.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="align-top">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">{setting.configLabel}</p>
                        <code className="text-[11px] font-mono bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">
                          {setting.configKey}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground capitalize">
                          {getTypeIcon(setting.valueType)}
                          {setting.valueType}
                        </span>
                        {renderValueBadge(setting)}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={setting.isActive ? "default" : "secondary"} className={setting.isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}>
                        {setting.isActive ? (
                          <CheckCircle2 className="mr-1 size-3 inline" />
                        ) : (
                          <XCircle className="mr-1 size-3 inline" />
                        )}
                        {setting.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm">
                        <p className="text-foreground/90">{setting.description || "-"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-medium text-primary">{setting.siteName ?? "Global"}</span>
                          <span>•</span>
                          <span>diperbarui oleh {setting.updatedByName ?? "System"}</span>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(setting)}
                            className="h-8 rounded-lg px-2.5 text-xs"
                          >
                            <Edit2 className="mr-1 size-3.5" /> Edit
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled className="h-8 rounded-lg px-2.5 text-xs opacity-50">
                            Edit
                          </Button>
                        )}

                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingItem(setting)}
                            className="h-8 rounded-lg px-2.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 border-rose-200 dark:border-rose-900"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              Tambah Rule Global Baru
            </DialogTitle>
            <DialogDescription>
              Tambahkan konfigurasi rule harian baru ke sistem Daily Activity.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="newKey" className="text-sm font-medium">
                Key Identifier (Unik) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="newKey"
                placeholder="contoh: max_daily_overtime_hours"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                required
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Format snake_case (huruf kecil, angka, underscore)</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="newLabel" className="text-sm font-medium">
                Label Rule <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="newLabel"
                placeholder="contoh: Batas Maksimal Jam Lembur Harian"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Tipe Nilai</Label>
                <Select
                  value={newValueType}
                  onValueChange={(val: "boolean" | "number" | "text" | "json") => {
                    setNewValueType(val);
                    if (val === "boolean") setNewValue("true");
                    else if (val === "number") setNewValue("0");
                    else if (val === "json") setNewValue("{}");
                    else setNewValue("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boolean">Boolean (True/False)</SelectItem>
                    <SelectItem value="number">Number (Angka)</SelectItem>
                    <SelectItem value="text">Text (String)</SelectItem>
                    <SelectItem value="json">JSON (Object/Array)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-medium">Scope Site</Label>
                <Select value={newSiteId} onValueChange={setNewSiteId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (Semua Site)</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={String(site.id)}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* DYNAMIC VALUE INPUT */}
            <div className="grid gap-2">
              <Label htmlFor="newValue" className="text-sm font-medium">
                Nilai Konfigurasi <span className="text-rose-500">*</span>
              </Label>

              {newValueType === "boolean" ? (
                <Select value={newValue} onValueChange={setNewValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True (Aktif / Ya)</SelectItem>
                    <SelectItem value="false">False (Nonaktif / Tidak)</SelectItem>
                  </SelectContent>
                </Select>
              ) : newValueType === "number" ? (
                <Input
                  id="newValue"
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="0"
                  required
                />
              ) : newValueType === "json" ? (
                <div className="space-y-1">
                  <Textarea
                    id="newValue"
                    rows={4}
                    value={newValue}
                    onChange={(e) => {
                      setNewValue(e.target.value);
                      validateJson(e.target.value);
                    }}
                    placeholder='{"key": "value"}'
                    className="font-mono text-xs"
                    required
                  />
                  {jsonError && <p className="text-xs font-semibold text-rose-500">{jsonError}</p>}
                </div>
              ) : (
                <Input
                  id="newValue"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Masukkan nilai konfigurasi..."
                  required
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="newDescription" className="text-sm font-medium">
                Keterangan
              </Label>
              <Textarea
                id="newDescription"
                rows={2}
                placeholder="Penjelasan fungsi dan cakupan rule ini..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/80 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Status Rule Aktif</Label>
                <p className="text-xs text-muted-foreground">Bila aktif, rule langsung berlaku di runtime engine.</p>
              </div>
              <Switch checked={newIsActive} onCheckedChange={setNewIsActive} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Rule Global"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5 text-primary" />
              Edit Rule Global
            </DialogTitle>
            <DialogDescription>
              Sesuaikan nilai dan status konfigurasi untuk <code className="font-mono font-semibold text-foreground">{editingItem?.configKey}</code>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-muted-foreground">Key Identifier (Read-only)</Label>
              <Input value={editingItem?.configKey || ""} disabled className="font-mono bg-muted/50 text-sm" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editLabel" className="text-sm font-medium">
                Label Rule <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="editLabel"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Tipe Nilai</Label>
                <Select
                  value={editValueType}
                  onValueChange={(val: "boolean" | "number" | "text" | "json") => {
                    setEditValueType(val);
                    if (val === "boolean" && editValue !== "true" && editValue !== "false") {
                      setEditValue("true");
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boolean">Boolean (True/False)</SelectItem>
                    <SelectItem value="number">Number (Angka)</SelectItem>
                    <SelectItem value="text">Text (String)</SelectItem>
                    <SelectItem value="json">JSON (Object/Array)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-medium">Scope Site</Label>
                <Select value={editSiteId} onValueChange={setEditSiteId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (Semua Site)</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={String(site.id)}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* DYNAMIC VALUE INPUT FOR EDIT */}
            <div className="grid gap-2">
              <Label htmlFor="editValue" className="text-sm font-medium">
                Nilai Konfigurasi <span className="text-rose-500">*</span>
              </Label>

              {editValueType === "boolean" ? (
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True (Aktif / Ya)</SelectItem>
                    <SelectItem value="false">False (Nonaktif / Tidak)</SelectItem>
                  </SelectContent>
                </Select>
              ) : editValueType === "number" ? (
                <Input
                  id="editValue"
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  required
                />
              ) : editValueType === "json" ? (
                <div className="space-y-1">
                  <Textarea
                    id="editValue"
                    rows={4}
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      validateJson(e.target.value);
                    }}
                    className="font-mono text-xs"
                    required
                  />
                  {jsonError && <p className="text-xs font-semibold text-rose-500">{jsonError}</p>}
                </div>
              ) : (
                <Input
                  id="editValue"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editDescription" className="text-sm font-medium">
                Keterangan
              </Label>
              <Textarea
                id="editDescription"
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/80 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Status Rule Aktif</Label>
                <p className="text-xs text-muted-foreground">Mengontrol apakah rule ini aktif di runtime engine.</p>
              </div>
              <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="size-5 text-rose-600" />
              Hapus Rule Global?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus rule global{" "}
              <strong className="text-foreground">{deletingItem?.configLabel}</strong> (
              <code className="font-mono">{deletingItem?.configKey}</code>)? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isPending ? "Menghapus..." : "Hapus Rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
