"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ChevronDown,
  Copy,
  ListChecks,
  Plus,
  Save,
  Shield,
  Smartphone,
  Trash2,
  Users,
  UserMinus,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import {
  manageSecurityRoleAction,
  type AdminMutationState,
} from "@/app/dashboard/admin-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnterpriseScorecards } from "@/components/ui/enterprise-table-kit";

type RoleRow = {
  id: number;
  name: string;
  description: string;
  scope: string;
  assignedUsers: number;
};

type MenuRow = {
  id: number;
  menuArea: string;
  section: string;
  title: string;
  url: string;
  resource: string;
};

type MenuPermissionRow = {
  id: number;
  roleId: number;
  menuItemId: number;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSelectAll: boolean;
  dataScope: string;
};

type DraftPermission = {
  menuItemId: number;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSelectAll: boolean;
  dataScope: string;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  accessRole: string;
  jobTitle: string;
  section: string;
  isActive: boolean;
};

const PERMISSION_FIELDS = [
  { key: "canView", label: "Lihat" },
  { key: "canEdit", label: "Ubah" },
  { key: "canDelete", label: "Hapus" },
  { key: "canSelectAll", label: "Akses penuh" },
] as const;

const MENU_AREA_META: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  admin: {
    label: "Pengaturan Sistem",
    description: "Konfigurasi, keamanan, dan manajemen portal",
    icon: <Settings className="size-4" />,
  },
  central_service: {
    label: "Layanan Pusat",
    description: "Master data, approval, email, dan notifikasi",
    icon: <Zap className="size-4" />,
  },
  performance: {
    label: "Aktivitas & Performa",
    description: "Daily activity, timesheet, HSE, training, dan wellness",
    icon: <ListChecks className="size-4" />,
  },
};

const QUICK_PRESETS = [
  {
    label: "Full Akses",
    description: "Semua menu aktif (Lihat + Ubah + Hapus + Full)",
    icon: <Shield className="size-4" />,
    apply: (items: MenuRow[]) =>
      items.map<DraftPermission>((item) => ({
        menuItemId: item.id,
        canView: true,
        canEdit: true,
        canDelete: true,
        canSelectAll: true,
        dataScope: "global",
      })),
  },
  {
    label: "Hanya Lihat",
    description: "Semua menu hanya bisa dilihat",
    icon: <ListChecks className="size-4" />,
    apply: (items: MenuRow[]) =>
      items.map<DraftPermission>((item) => ({
        menuItemId: item.id,
        canView: true,
        canEdit: false,
        canDelete: false,
        canSelectAll: false,
        dataScope: "own",
      })),
  },
  {
    label: "Reset Semua",
    description: "Nonaktifkan semua permission",
    icon: <Trash2 className="size-4" />,
    apply: (items: MenuRow[]) =>
      items.map<DraftPermission>((item) => ({
        menuItemId: item.id,
        canView: false,
        canEdit: false,
        canDelete: false,
        canSelectAll: false,
        dataScope: "own",
      })),
  },
];

const INITIAL_STATE: AdminMutationState = {
  status: "idle",
  message: "",
};

function formatScopeLabel(value: string) {
  const labels: Record<string, string> = {
    site: "Site tertentu",
    all_sites: "Semua site",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function formatMenuArea(value: string) {
  return MENU_AREA_META[value]?.label ?? value.replaceAll("_", " ");
}

function hasMobileCounterpart(url: string | null | undefined, resource: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/mobile")) return true;
  const cleanUrl = url.split("?")[0];
  if (cleanUrl === "/dashboard/activity-hub/my-day") return true;
  if (cleanUrl.startsWith("/dashboard/activity-hub")) return true;
  if (cleanUrl === "/dashboard/overtime-requests" || cleanUrl.startsWith("/dashboard/overtime")) return true;
  if (cleanUrl === "/dashboard/timesheet" || cleanUrl.startsWith("/dashboard/scheduling-timesheet")) return true;
  if (cleanUrl === "/dashboard/approval") return true;
  if (cleanUrl === "/dashboard/curhat") return true;
  if (cleanUrl === "/dashboard/hr-counseling") return true;
  if (cleanUrl === "/dashboard/hse" || cleanUrl.startsWith("/dashboard/hse/")) return true;
  if (cleanUrl === "/dashboard/gamification") return true;
  if (cleanUrl === "/dashboard/wellness") return true;
  if (cleanUrl === "/dashboard/executive") return true;
  if (cleanUrl === "/dashboard/cargo-manifest") return true;
  if (cleanUrl === "/dashboard/security/roles") return true;
  if (cleanUrl === "/dashboard/reports") return true;
  if (cleanUrl === "/dashboard/training") return true;
  if (cleanUrl === "/dashboard/attendance" || cleanUrl.startsWith("/dashboard/attendance/")) return true;
  if (cleanUrl === "/dashboard/lms" || cleanUrl.startsWith("/api/lms")) return true;

  const segments = cleanUrl.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const knownMobilePages = [
    "activity", "approval", "attendance", "cargo-manifest", "curhat",
    "executive", "gamification", "hr-counseling", "hse", "lms",
    "notifications", "overtime", "profile", "reports", "timesheet",
    "training", "wellness"
  ];
  return knownMobilePages.includes(lastSegment);
}

function SubmitButton({
  children,
  variant = "default",
  size = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? "Memproses..." : children}
    </Button>
  );
}

function buildDraftPermissions(
  roleId: number,
  menuItems: MenuRow[],
  menuPermissions: MenuPermissionRow[],
) {
  const permissionByMenu = new Map(
    menuPermissions
      .filter((permission) => permission.roleId === roleId)
      .map((permission) => [permission.menuItemId, permission]),
  );
  return menuItems.map<DraftPermission>((menuItem) => {
    const permission = permissionByMenu.get(menuItem.id);
    return {
      menuItemId: menuItem.id,
      canView: permission?.canView ?? false,
      canEdit: permission?.canEdit ?? false,
      canDelete: permission?.canDelete ?? false,
      canSelectAll: permission?.canSelectAll ?? false,
      dataScope: permission?.dataScope ?? "own",
    };
  });
}

function countEnabledPermissions(permissions: DraftPermission[]) {
  return permissions.reduce((total, permission) => {
    return (
      total +
      Number(permission.canView) +
      Number(permission.canEdit) +
      Number(permission.canDelete) +
      Number(permission.canSelectAll)
    );
  }, 0);
}

function RoleChangeSelect({
  userId,
  currentRoleId,
  roles,
  formAction,
}: {
  userId: number;
  currentRoleId: number;
  roles: { id: number; name: string }[];
  formAction: (formData: FormData) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="intent" value="assign-user-role" />
      <input type="hidden" name="employeeId" value={String(userId)} />
      <input type="hidden" name="roleId" value="" />
      <Select
        defaultValue={String(currentRoleId)}
        onValueChange={(value) => {
          const form = formRef.current;
          if (!form) return;
          const input = form.querySelector('input[name="roleId"]') as HTMLInputElement;
          if (input) {
            input.value = value;
            form.requestSubmit();
          }
        }}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.id} value={String(role.id)}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}

export function SecurityRoleManagement({
  roles,
  menuItems,
  menuPermissions,
  users,
}: {
  roles: RoleRow[];
  menuItems: MenuRow[];
  menuPermissions: MenuPermissionRow[];
  users: UserRow[];
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<number>(roles[0]?.id ?? 0);
  const [draftPermissions, setDraftPermissions] = useState<DraftPermission[]>(
    buildDraftPermissions(roles[0]?.id ?? 0, menuItems, menuPermissions),
  );
  const [openMenuAreas, setOpenMenuAreas] = useState<Set<string>>(
    () => new Set(menuItems.map((menuItem) => menuItem.menuArea)),
  );
  const [roleState, roleFormAction] = useActionState(
    manageSecurityRoleAction,
    INITIAL_STATE,
  );
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => {
    setDraftPermissions(
      buildDraftPermissions(selectedRoleId, menuItems, menuPermissions),
    );
  }, [menuItems, menuPermissions, selectedRoleId]);

  useEffect(() => {
    setOpenMenuAreas(new Set(menuItems.map((menuItem) => menuItem.menuArea)));
  }, [menuItems]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const groupedMenus = useMemo(() => {
    return menuItems.reduce<Record<string, MenuRow[]>>((accumulator, menuItem) => {
      accumulator[menuItem.menuArea] = accumulator[menuItem.menuArea] ?? [];
      accumulator[menuItem.menuArea].push(menuItem);
      return accumulator;
    }, {});
  }, [menuItems]);
  const permissionByMenuId = useMemo(() => {
    return new Map(
      draftPermissions.map((permission) => [permission.menuItemId, permission]),
    );
  }, [draftPermissions]);

  const selectedRoleEnabledCount = countEnabledPermissions(draftPermissions);
  const totalMenuCount = menuItems.length;
  const activeProgress = totalMenuCount > 0 ? Math.round((selectedRoleEnabledCount / (totalMenuCount * 4)) * 100) : 0;

  const roleUsers = useMemo(() => {
    return users.filter((user) => user.accessRole === selectedRole?.name);
  }, [users, selectedRole]);

  const availableUsers = useMemo(() => {
    const assignedIds = new Set(roleUsers.map((u) => u.id));
    const query = userSearchQuery.toLowerCase();
    return users.filter(
      (user) =>
        !assignedIds.has(user.id) &&
        user.isActive &&
        (user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.jobTitle.toLowerCase().includes(query)),
    );
  }, [users, roleUsers, userSearchQuery]);

  const toggleMenuArea = (menuArea: string) => {
    setOpenMenuAreas((current) => {
      const next = new Set(current);
      if (next.has(menuArea)) {
        next.delete(menuArea);
      } else {
        next.add(menuArea);
      }
      return next;
    });
  };

  const updatePermission = (
    menuItemId: number,
    field: (typeof PERMISSION_FIELDS)[number]["key"],
    checked: boolean,
  ) => {
    setDraftPermissions((current) =>
      current.map((permission) =>
        permission.menuItemId === menuItemId
          ? { ...permission, [field]: checked }
          : permission,
      ),
    );
  };

  const updateDataScope = (menuItemId: number, scope: string) => {
    setDraftPermissions((current) =>
      current.map((permission) =>
        permission.menuItemId === menuItemId
          ? { ...permission, dataScope: scope }
          : permission,
      ),
    );
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[number]) => {
    setDraftPermissions(preset.apply(menuItems));
  };

  return (
    <div className="space-y-6">
      {roleState.status !== "idle" ? (
        <Alert
          className={
            roleState.status === "error"
              ? "border-red-200 text-red-700"
              : "border-emerald-200 text-emerald-700"
          }
        >
          <AlertDescription>{roleState.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── Left: Role List ── */}
        <Card className="rounded-xl bg-surface-container-lowest shadow-[0_18px_42px_rgba(0,52,97,0.08)]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Daftar Peran</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-4" />
                    Peran Baru
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buat Peran Baru</DialogTitle>
                    <DialogDescription>
                      Peran baru dimulai tanpa akses menu. Anda dapat mengaturnya setelah dibuat.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={roleFormAction} className="space-y-4">
                    <input type="hidden" name="intent" value="create-role" />
                    <label className="grid gap-2">
                      <Label>Nama Peran</Label>
                      <Input name="roleName" placeholder="Contoh: Finance Admin" />
                    </label>
                    <label className="grid gap-2">
                      <Label>Deskripsi</Label>
                      <Input name="description" placeholder="Ringkasan tanggung jawab peran" />
                    </label>
                    <div className="grid gap-2">
                      <Label>Cakupan Akses</Label>
                      <Select name="scope" defaultValue="site">
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih cakupan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="site">Site tertentu</SelectItem>
                          <SelectItem value="all_sites">Semua site</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end">
                      <SubmitButton>Buat Peran</SubmitButton>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {roles.map((role) => {
              const rolePermCount = countEnabledPermissions(
                buildDraftPermissions(role.id, menuItems, menuPermissions),
              );
              const isSelected = selectedRoleId === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full rounded-xl px-4 py-3.5 text-left transition-all ${
                    isSelected
                      ? "bg-primary/8 shadow-[inset_3px_0_0_var(--primary),0_8px_20px_rgba(0,52,97,0.08)]"
                      : "bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{role.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
                      {formatScopeLabel(role.scope)}
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" />
                      {role.assignedUsers} user
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="size-3" />
                      {rolePermCount} izin
                    </span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Right: Tabs ── */}
        <div className="space-y-4">
          <Card className="rounded-xl bg-surface-container-lowest shadow-[0_18px_42px_rgba(0,52,97,0.08)]">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">
                    {selectedRole?.name ?? "—"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedRole?.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 font-medium">
                      <ListChecks className="size-3.5" />
                      {selectedRoleEnabledCount} dari {totalMenuCount * 4} izin aktif
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${activeProgress}%` }}
                        />
                      </div>
                      <span className="font-medium">{activeProgress}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Copy className="size-4" />
                        Duplikat
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Duplikat Peran</DialogTitle>
                        <DialogDescription>
                          Menyalin seluruh akses dari peran yang sedang dipilih.
                        </DialogDescription>
                      </DialogHeader>
                      <form action={roleFormAction} className="space-y-4">
                        <input type="hidden" name="intent" value="duplicate-role" />
                        <input type="hidden" name="sourceRoleId" value={selectedRole ? `${selectedRole.id}` : ""} />
                        <label className="grid gap-2">
                          <Label>Nama Peran Baru</Label>
                          <Input name="roleName" defaultValue={selectedRole ? `${selectedRole.name} Copy` : ""} />
                        </label>
                        <label className="grid gap-2">
                          <Label>Deskripsi</Label>
                          <Input name="description" defaultValue={selectedRole?.description ?? ""} />
                        </label>
                        <div className="grid gap-2">
                          <Label>Cakupan Akses</Label>
                          <Select name="scope" defaultValue={selectedRole?.scope ?? "site"}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih cakupan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="site">Site tertentu</SelectItem>
                              <SelectItem value="all_sites">Semua site</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end">
                          <SubmitButton>Duplikat Peran</SubmitButton>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <form action={roleFormAction}>
                    <input type="hidden" name="intent" value="delete-role" />
                    <input type="hidden" name="roleId" value={selectedRole ? `${selectedRole.id}` : ""} />
                    <SubmitButton variant="destructive">
                      <Trash2 className="size-4" />
                      Hapus
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="permissions">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="permissions">
                    <Settings className="mr-1.5 size-3.5" />
                    Permissions
                  </TabsTrigger>
                  <TabsTrigger value="users">
                    <Users className="mr-1.5 size-3.5" />
                    Users ({roleUsers.length})
                  </TabsTrigger>
                </TabsList>

                {/* ── Tab: Permissions ── */}
                <TabsContent value="permissions" className="mt-4 space-y-4">
                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        title={preset.description}
                      >
                        {preset.icon}
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  {/* Permission Form */}
                  <form action={roleFormAction} className="space-y-3">
                    <input type="hidden" name="intent" value="save-menu-permissions" />
                    <input type="hidden" name="roleId" value={selectedRole ? `${selectedRole.id}` : ""} />
                    <input type="hidden" name="permissionsJson" value={JSON.stringify(draftPermissions)} />

                    {Object.entries(groupedMenus).map(([menuArea, items]) => {
                      const areaPermissions = items.map((menuItem) =>
                        permissionByMenuId.get(menuItem.id),
                      );
                      const activeCount = countEnabledPermissions(
                        areaPermissions.filter(Boolean) as DraftPermission[],
                      );
                      const isOpen = openMenuAreas.has(menuArea);
                      const meta = MENU_AREA_META[menuArea];

                      return (
                        <Collapsible
                          key={menuArea}
                          open={isOpen}
                          onOpenChange={() => toggleMenuArea(menuArea)}
                          className="overflow-hidden rounded-xl bg-surface-container-low shadow-[inset_0_0_0_1px_var(--outline-ghost)]"
                        >
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex min-h-14 w-full items-center justify-between gap-3 bg-surface-container px-4 py-3 text-left transition-colors hover:bg-surface-container-high"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <ChevronDown
                                  className={`size-4 shrink-0 text-primary transition-transform ${
                                    isOpen ? "rotate-0" : "-rotate-90"
                                  }`}
                                />
                                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                  {meta?.icon ?? <ListChecks className="size-4" />}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-medium">{formatMenuArea(menuArea)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {meta?.description ?? `${items.length} menu`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {activeCount}/{items.length * 4}
                                </span>
                                <Badge variant="outline" className="rounded-full text-[10px]">
                                  {isOpen ? "Tutup" : "Buka"}
                                </Badge>
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="hidden space-y-3 p-3 md:block">
                              <div className="overflow-auto rounded-[1rem] border border-border/70 bg-white shadow-sm">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead>Menu</TableHead>
                                      {PERMISSION_FIELDS.map((field) => (
                                        <TableHead key={field.key} className="text-center">
                                          {field.label}
                                        </TableHead>
                                      ))}
                                      <TableHead className="text-center">Scope Data</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {items.map((menuItem) => {
                                      const currentPermission =
                                        permissionByMenuId.get(menuItem.id) ?? {
                                          menuItemId: menuItem.id,
                                          canView: false,
                                          canEdit: false,
                                          canDelete: false,
                                          canSelectAll: false,
                                          dataScope: "own",
                                        };
                                      const isMobile = hasMobileCounterpart(menuItem.url, menuItem.resource);
                                      return (
                                        <TableRow key={menuItem.id}>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <p className="font-medium">{menuItem.title}</p>
                                              {isMobile && (
                                                <Badge variant="secondary" className="gap-0.5 text-[9px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-700 border-none py-0.5 h-auto">
                                                  <Smartphone className="size-2.5" /> M
                                                </Badge>
                                              )}
                                            </div>
                                          </TableCell>
                                          {PERMISSION_FIELDS.map((field) => (
                                            <TableCell key={`${menuItem.id}-${field.key}`} className="text-center">
                                              <Checkbox
                                                checked={currentPermission[field.key]}
                                                onCheckedChange={(checked) =>
                                                  updatePermission(menuItem.id, field.key, Boolean(checked))
                                                }
                                              />
                                            </TableCell>
                                          ))}
                                          <TableCell className="text-center">
                                            <Select
                                              value={currentPermission.dataScope}
                                              onValueChange={(value) => updateDataScope(menuItem.id, value)}
                                            >
                                              <SelectTrigger className="h-8 w-[110px] mx-auto text-[11px]">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="global">Global</SelectItem>
                                                <SelectItem value="own">Own Only</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            <div className="space-y-3 p-3 md:hidden">
                              {items.map((menuItem) => {
                                const currentPermission =
                                  permissionByMenuId.get(menuItem.id) ?? {
                                    menuItemId: menuItem.id,
                                    canView: false,
                                    canEdit: false,
                                    canDelete: false,
                                    canSelectAll: false,
                                    dataScope: "own",
                                  };
                                const isMobile = hasMobileCounterpart(menuItem.url, menuItem.resource);
                                return (
                                  <section
                                    key={menuItem.id}
                                    className="rounded-lg bg-surface-container-lowest p-4 shadow-[0_10px_22px_rgba(0,52,97,0.08)]"
                                  >
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{menuItem.title}</p>
                                      {isMobile && (
                                        <Badge variant="secondary" className="gap-0.5 text-[9px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-700 border-none py-0.5 h-auto">
                                          <Smartphone className="size-2.5" /> Mobile
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                      {PERMISSION_FIELDS.map((field) => (
                                        <label
                                          key={`${menuItem.id}-${field.key}`}
                                          className="flex min-h-10 items-center justify-between gap-2 rounded-md bg-surface-container-low px-3 text-sm font-medium"
                                        >
                                          <span>{field.label}</span>
                                          <Checkbox
                                            checked={currentPermission[field.key]}
                                            onCheckedChange={(checked) =>
                                              updatePermission(menuItem.id, field.key, Boolean(checked))
                                            }
                                          />
                                        </label>
                                      ))}
                                    </div>
                                    <div className="mt-2">
                                      <Select
                                        value={currentPermission.dataScope}
                                        onValueChange={(value) => updateDataScope(menuItem.id, value)}
                                      >
                                        <SelectTrigger className="h-9 w-full text-xs">
                                          <SelectValue placeholder="Scope data" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="global">Global — Lihat semua data</SelectItem>
                                          <SelectItem value="own">Own Only — Hanya data sendiri</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </section>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}

                    <div className="flex justify-end pt-2">
                      <SubmitButton>
                        <Save className="size-4" />
                        Simpan Akses Menu
                      </SubmitButton>
                    </div>
                  </form>
                </TabsContent>

                {/* ── Tab: Users ── */}
                <TabsContent value="users" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {roleUsers.length} user menggunakan peran ini.
                    </p>
                    <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="size-4" />
                          Tambah User
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Tambah User ke {selectedRole?.name}</DialogTitle>
                          <DialogDescription>
                            Pilih user yang ingin ditambahkan ke peran ini.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Cari nama, email, atau jabatan..."
                              value={userSearchQuery}
                              onChange={(event) => setUserSearchQuery(event.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <div className="space-y-2">
                            {availableUsers.length === 0 ? (
                              <p className="py-8 text-center text-sm text-muted-foreground">
                                Tidak ada user tersedia untuk ditambahkan.
                              </p>
                            ) : (
                              availableUsers.slice(0, 50).map((user) => (
                                <form key={user.id} action={roleFormAction}>
                                  <input type="hidden" name="intent" value="assign-user-role" />
                                  <input type="hidden" name="roleId" value={selectedRole ? `${selectedRole.id}` : ""} />
                                  <input type="hidden" name="employeeId" value={`${user.id}`} />
                                  <div className="flex items-center justify-between gap-3 rounded-lg border bg-surface-container-low px-3 py-2.5">
                                    <div className="min-w-0">
                                      <p className="font-medium">{user.name}</p>
                                      <p className="text-xs text-muted-foreground">{user.email}</p>
                                      {user.jobTitle && (
                                        <p className="text-xs text-muted-foreground">{user.jobTitle}</p>
                                      )}
                                    </div>
                                    <SubmitButton size="sm">
                                      <Plus className="size-3" />
                                      Tambah
                                    </SubmitButton>
                                  </div>
                                </form>
                              ))
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {roleUsers.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-surface-container-low py-12 text-center">
                      <Users className="mx-auto size-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Belum ada user dengan peran ini.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Klik &quot;Tambah User&quot; untuk assign user ke peran ini.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-auto rounded-[1rem] border border-border/70 bg-white shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Nama</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Jabatan</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead className="w-[200px]">Role</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roleUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell className="text-muted-foreground">{user.email}</TableCell>
                              <TableCell className="text-muted-foreground">{user.jobTitle || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{user.section || "—"}</TableCell>
                              <TableCell>
                                <RoleChangeSelect
                                  userId={user.id}
                                  currentRoleId={selectedRole?.id ?? 0}
                                  roles={roles}
                                  formAction={roleFormAction}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <form action={roleFormAction} className="inline-flex">
                                  <input type="hidden" name="intent" value="remove-user-role" />
                                  <input type="hidden" name="employeeId" value={`${user.id}`} />
                                  <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" title={`Hapus ${user.name} dari peran ini`}>
                                    <UserMinus className="size-3.5" />
                                  </Button>
                                </form>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
