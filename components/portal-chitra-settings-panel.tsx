"use client";

import { useActionState, useEffect, useState } from "react";
import { Edit3, Plus, Smartphone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deletePortalChitraAppAction,
  savePortalChitraAppAction,
  type PortalChitraSettingsActionState,
} from "@/app/dashboard/settings/portal-chitra/actions";
import {
  PORTAL_CHITRA_ICON_OPTIONS,
  PortalChitraIcon,
} from "@/components/portal-chitra-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PortalChitraAppRecord } from "@/lib/portal-chitra";

type SecurityRoleOption = {
  id: number;
  name: string;
};

type DraftPortalApp = {
  intent: "create" | "update";
  id?: number;
  name: string;
  category: string;
  description: string;
  url: string;
  color: string;
  iconName: string;
  sortOrder: number;
  isActive: boolean;
  showOnMobile: boolean;
  restrictedToRoles: boolean;
  roleIds: number[];
};

const INITIAL_STATE: PortalChitraSettingsActionState = {
  status: "idle",
  message: "",
};

function createEmptyDraft(): DraftPortalApp {
  return {
    intent: "create",
    name: "",
    category: "General",
    description: "",
    url: "",
    color: "#003461",
    iconName: "globe",
    sortOrder: 0,
    isActive: true,
    showOnMobile: true,
    restrictedToRoles: false,
    roleIds: [],
  };
}

function createDraftFromApp(app: PortalChitraAppRecord): DraftPortalApp {
  return {
    intent: "update",
    id: app.id,
    name: app.name,
    category: app.category,
    description: app.description,
    url: app.url,
    color: app.color,
    iconName: app.iconName,
    sortOrder: app.sortOrder,
    isActive: app.isActive,
    showOnMobile: app.showOnMobile,
    restrictedToRoles: app.restrictedToRoles,
    roleIds: app.roleIds,
  };
}

export function PortalChitraSettingsPanel({
  apps,
  roles,
}: {
  apps: PortalChitraAppRecord[];
  roles: SecurityRoleOption[];
}) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPortalApp>(createEmptyDraft());
  const [saveState, saveFormAction, isSaving] = useActionState(savePortalChitraAppAction, INITIAL_STATE);
  const [deleteState, deleteFormAction, isDeleting] = useActionState(deletePortalChitraAppAction, INITIAL_STATE);

  useEffect(() => {
    if (saveState.status === "success") {
      setIsDialogOpen(false);
      setDraft(createEmptyDraft());
      router.refresh();
    }
  }, [router, saveState.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      router.refresh();
    }
  }, [deleteState.status, router]);

  const categories = Array.from(new Set(apps.map((app) => app.category))).sort((left, right) =>
    left.localeCompare(right, "id-ID"),
  );

  function openCreateDialog() {
    setDraft(createEmptyDraft());
    setIsDialogOpen(true);
  }

  function openEditDialog(app: PortalChitraAppRecord) {
    setDraft(createDraftFromApp(app));
    setIsDialogOpen(true);
  }

  return (
    <div className="space-y-5">
      {saveState.status !== "idle" ? (
        <Alert className={saveState.status === "error" ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"}>
          <AlertDescription>{saveState.message}</AlertDescription>
        </Alert>
      ) : null}
      {deleteState.status !== "idle" ? (
        <Alert className={deleteState.status === "error" ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"}>
          <AlertDescription>{deleteState.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[1.4rem] border-0 bg-[linear-gradient(135deg,#003461,#004b87)] text-white shadow-[0_18px_40px_rgba(0,52,97,0.24)]">
          <CardContent className="p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b9dff6]">Total Apps</p>
            <p className="mt-3 text-4xl font-black leading-none">{apps.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.4rem] border-0 bg-white shadow-[0_16px_34px_rgba(8,32,51,0.06)]">
          <CardContent className="p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Mobile Ready</p>
            <p className="mt-3 text-4xl font-black leading-none text-[#082033]">
              {apps.filter((app) => app.showOnMobile && app.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.4rem] border-0 bg-white shadow-[0_16px_34px_rgba(8,32,51,0.06)]">
          <CardContent className="p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Role Restricted</p>
            <p className="mt-3 text-4xl font-black leading-none text-[#082033]">
              {apps.filter((app) => app.restrictedToRoles).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.5rem] border-0 bg-white shadow-[0_18px_40px_rgba(8,32,51,0.07)]">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Daftar Aplikasi Portal</CardTitle>
            <p className="text-sm text-muted-foreground">
              Kelola nama, URL, warna, icon, visibilitas role, dan kemunculan app di mobile slider.
            </p>
          </div>
          <Button onClick={openCreateDialog} className="min-h-12 rounded-full px-5 font-black uppercase tracking-[0.08em]">
            <Plus className="size-4" />
            Tambah App
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="grid gap-4 rounded-[1.2rem] bg-[#f8fbfd] p-4 ring-1 ring-[#e2ebf1] xl:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="flex gap-4">
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-[1rem] text-white shadow-[0_12px_24px_rgba(8,32,51,0.16)]"
                  style={{ backgroundColor: app.color }}
                >
                  <PortalChitraIcon name={app.iconName} className="size-5" />
                </span>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-black text-[#082033]">{app.name}</p>
                    <Badge className="rounded-full border-0 bg-[#e9f6fd] text-[#003f78]">
                      {app.category}
                    </Badge>
                    {!app.isActive ? (
                      <Badge className="rounded-full border-0 bg-[#f6ede7] text-[#5a2200]">
                        Nonaktif
                      </Badge>
                    ) : null}
                    {app.showOnMobile ? (
                      <Badge className="rounded-full border-0 bg-[#eef7ea] text-[#24553a]">
                        <Smartphone className="mr-1 size-3.5" />
                        Mobile
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm leading-6 text-[#486275]">{app.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#486275]">
                    <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-[#dde8ef]">
                      {app.url}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-[#dde8ef]">
                      Icon: {app.iconName}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-[#dde8ef]">
                      Order: {app.sortOrder}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {app.roleNames.length > 0 ? (
                      app.roleNames.map((roleName) => (
                        <Badge key={`${app.id}-${roleName}`} variant="outline" className="rounded-full">
                          {roleName}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="rounded-full">
                        Semua role
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-start gap-2 xl:justify-end">
                <Button variant="outline" onClick={() => openEditDialog(app)}>
                  <Edit3 className="size-4" />
                  Edit
                </Button>
                <form action={deleteFormAction}>
                  <input type="hidden" name="id" value={app.id} />
                  <Button variant="destructive" type="submit" disabled={isDeleting}>
                    <Trash2 className="size-4" />
                    Hapus
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {draft.intent === "create" ? "Tambah App Portal Chitra" : "Edit App Portal Chitra"}
            </DialogTitle>
            <DialogDescription>
              Konfigurasi di sini langsung mempengaruhi page desktop dan slider app di mobile dashboard.
            </DialogDescription>
          </DialogHeader>

          <form action={saveFormAction} className="space-y-5">
            <input type="hidden" name="intent" value={draft.intent} />
            <input type="hidden" name="id" value={draft.id ?? ""} />
            <input type="hidden" name="isActive" value={`${draft.isActive}`} />
            <input type="hidden" name="showOnMobile" value={`${draft.showOnMobile}`} />
            <input type="hidden" name="restrictedToRoles" value={`${draft.restrictedToRoles}`} />
            <input type="hidden" name="roleIdsJson" value={JSON.stringify(draft.roleIds)} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <Label htmlFor="portal-name">Nama App</Label>
                <Input
                  id="portal-name"
                  name="name"
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Contoh: HCMS"
                />
              </label>
              <label className="grid gap-2">
                <Label htmlFor="portal-category">Kategori</Label>
                <Input
                  id="portal-category"
                  name="category"
                  value={draft.category}
                  onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                  list="portal-chitra-categories"
                  placeholder="Contoh: Human Capital"
                />
                <datalist id="portal-chitra-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </label>
              <label className="grid gap-2 md:col-span-2">
                <Label htmlFor="portal-url">URL</Label>
                <Input
                  id="portal-url"
                  name="url"
                  value={draft.url}
                  onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://example.com"
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <Label htmlFor="portal-description">Description</Label>
                <Textarea
                  id="portal-description"
                  name="description"
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-24"
                  placeholder="Deskripsi singkat aplikasi"
                />
              </label>
              <label className="grid gap-2">
                <Label htmlFor="portal-color">Warna</Label>
                <div className="flex items-center gap-3 rounded-[1rem] bg-[#f3faff] p-3 ring-1 ring-[#dbe8f1]">
                  <input
                    id="portal-color"
                    type="color"
                    value={draft.color}
                    onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
                    className="h-10 w-16 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  />
                  <Input
                    name="color"
                    value={draft.color}
                    onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
                    className="bg-white"
                  />
                </div>
              </label>
              <label className="grid gap-2">
                <Label htmlFor="portal-icon">Icon</Label>
                <div className="flex items-center gap-3 rounded-[1rem] bg-[#f3faff] p-3 ring-1 ring-[#dbe8f1]">
                  <span
                    className="flex size-11 items-center justify-center rounded-[0.9rem] text-white"
                    style={{ backgroundColor: draft.color }}
                  >
                    <PortalChitraIcon name={draft.iconName} className="size-5" />
                  </span>
                  <Input
                    id="portal-icon"
                    name="iconName"
                    value={draft.iconName}
                    onChange={(event) => setDraft((current) => ({ ...current, iconName: event.target.value }))}
                    list="portal-chitra-icons"
                    className="bg-white"
                  />
                  <datalist id="portal-chitra-icons">
                    {PORTAL_CHITRA_ICON_OPTIONS.map((iconName) => (
                      <option key={iconName} value={iconName} />
                    ))}
                  </datalist>
                </div>
              </label>
              <label className="grid gap-2">
                <Label htmlFor="portal-order">Urutan</Label>
                <Input
                  id="portal-order"
                  type="number"
                  name="sortOrder"
                  min={0}
                  max={999}
                  value={draft.sortOrder}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
            </div>

            <div className="grid gap-4 rounded-[1.2rem] bg-[#f8fbfd] p-4 ring-1 ring-[#e2ebf1] md:grid-cols-3">
              <label className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#082033]">Aktif</p>
                  <p className="text-xs text-[#486275]">App tampil di desktop portal.</p>
                </div>
                <Switch
                  checked={draft.isActive}
                  onCheckedChange={(checked) => setDraft((current) => ({ ...current, isActive: checked }))}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#082033]">Slider Mobile</p>
                  <p className="text-xs text-[#486275]">App muncul di mobile dashboard.</p>
                </div>
                <Switch
                  checked={draft.showOnMobile}
                  onCheckedChange={(checked) => setDraft((current) => ({ ...current, showOnMobile: checked }))}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#082033]">Batasi Role</p>
                  <p className="text-xs text-[#486275]">Kosong = semua role bisa lihat.</p>
                </div>
                <Switch
                  checked={draft.restrictedToRoles}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      restrictedToRoles: checked,
                      roleIds: checked ? current.roleIds : [],
                    }))
                  }
                />
              </label>
            </div>

            {draft.restrictedToRoles ? (
              <div className="space-y-3 rounded-[1.2rem] bg-white p-4 ring-1 ring-[#dbe8f1]">
                <p className="text-sm font-semibold text-[#082033]">Role yang boleh lihat</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {roles.map((role) => {
                    const checked = draft.roleIds.includes(role.id);

                    return (
                      <label
                        key={role.id}
                        className="flex items-center gap-3 rounded-[0.95rem] bg-[#f8fbfd] px-3 py-3 ring-1 ring-[#e2ebf1]"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              roleIds: value
                                ? [...current.roleIds, role.id]
                                : current.roleIds.filter((item) => item !== role.id),
                            }))
                          }
                        />
                        <span className="text-sm font-medium text-[#082033]">{role.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="rounded-[1.2rem] bg-[#f8fbfd] p-4 ring-1 ring-[#e2ebf1]">
              <p className="text-sm font-semibold text-[#082033]">Preview</p>
              <div className="mt-4 max-w-sm rounded-[1.3rem] bg-white p-5 shadow-[0_16px_32px_rgba(8,32,51,0.06)] ring-1 ring-[#dbe8f1]">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex size-12 items-center justify-center rounded-[1rem] text-white"
                    style={{ backgroundColor: draft.color }}
                  >
                    <PortalChitraIcon name={draft.iconName} className="size-5" />
                  </span>
                  <Badge className="rounded-full border-0 bg-[#f3faff] text-[#486275]">
                    {draft.category || "General"}
                  </Badge>
                </div>
                <p className="mt-4 text-lg font-black text-[#082033]">
                  {draft.name || "Nama aplikasi"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#486275]">
                  {draft.description || "Deskripsi aplikasi akan tampil di sini."}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving} className="min-h-12 rounded-full px-5 font-black uppercase tracking-[0.08em]">
                {isSaving ? "Menyimpan..." : draft.intent === "create" ? "Simpan App" : "Update App"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
