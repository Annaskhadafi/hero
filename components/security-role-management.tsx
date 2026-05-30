"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
};

type DraftPermission = {
  menuItemId: number;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSelectAll: boolean;
};

const PERMISSION_FIELDS = [
  { key: "canView", label: "Lihat" },
  { key: "canEdit", label: "Ubah" },
  { key: "canDelete", label: "Hapus" },
  { key: "canSelectAll", label: "Akses penuh" },
] as const;

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
  const labels: Record<string, string> = {
    admin: "Admin",
    central_service: "Central Service",
    performance: "Performance",
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

function SubmitButton({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending}>
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

export function SecurityRoleManagement({
  roles,
  menuItems,
  menuPermissions,
}: {
  roles: RoleRow[];
  menuItems: MenuRow[];
  menuPermissions: MenuPermissionRow[];
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
          ? {
              ...permission,
              [field]: checked,
            }
          : permission,
      ),
    );
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
        <Card className="industrial-card rounded-xl bg-surface-container-lowest shadow-[0_18px_42px_rgba(0,52,97,0.08)]">
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
          <CardContent className="space-y-3">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full rounded-lg px-4 py-4 text-left transition-[background-color,box-shadow,transform] active:scale-[0.96] ${
                  selectedRoleId === role.id
                    ? "bg-primary/8 shadow-[inset_3px_0_0_var(--primary),0_12px_24px_rgba(0,52,97,0.08)]"
                    : "bg-surface-container-low hover:bg-surface-container"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{role.name}</p>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                  <Badge variant="outline" className="rounded-full">
                    {formatScopeLabel(role.scope)}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {role.assignedUsers} pengguna memakai peran ini
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="industrial-card rounded-xl bg-surface-container-lowest shadow-[0_18px_42px_rgba(0,52,97,0.08)]">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">
                    Akses Menu
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Atur menu dan aksi yang dapat digunakan oleh peran{" "}
                    <span className="font-medium text-foreground">
                      {selectedRole?.name ?? "—"}
                    </span>
                    .
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 font-medium">
                      <ListChecks className="size-3.5" />
                      {selectedRoleEnabledCount} izin aktif
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 font-medium md:hidden">
                      <Smartphone className="size-3.5" />
                      Mobile view
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Copy className="size-4" />
                        Duplikat Peran
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
                        <input
                          type="hidden"
                          name="sourceRoleId"
                          value={selectedRole ? `${selectedRole.id}` : ""}
                        />
                        <label className="grid gap-2">
                          <Label>Nama Peran Baru</Label>
                          <Input
                            name="roleName"
                            defaultValue={selectedRole ? `${selectedRole.name} Copy` : ""}
                          />
                        </label>
                        <label className="grid gap-2">
                          <Label>Deskripsi</Label>
                          <Input
                            name="description"
                            defaultValue={selectedRole?.description ?? ""}
                          />
                        </label>
                        <div className="grid gap-2">
                          <Label>Cakupan Akses</Label>
                          <Select
                            name="scope"
                            defaultValue={selectedRole?.scope ?? "site"}
                          >
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
                    <input
                      type="hidden"
                      name="roleId"
                      value={selectedRole ? `${selectedRole.id}` : ""}
                    />
                    <SubmitButton variant="destructive">
                      <Trash2 className="size-4" />
                      Hapus Peran
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraftPermissions((current) =>
                      current.map((permission) => ({
                        ...permission,
                        canView: true,
                        canEdit: true,
                        canDelete: true,
                        canSelectAll: true,
                      })),
                    )
                  }
                >
                  <Shield className="size-4" />
                  Aktifkan Semua
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraftPermissions((current) =>
                      current.map((permission) => ({
                        ...permission,
                        canView: false,
                        canEdit: false,
                        canDelete: false,
                        canSelectAll: false,
                      })),
                    )
                  }
                >
                  Reset Semua
                </Button>
              </div>

              <form action={roleFormAction} className="space-y-4">
                <input type="hidden" name="intent" value="save-menu-permissions" />
                <input
                  type="hidden"
                  name="roleId"
                  value={selectedRole ? `${selectedRole.id}` : ""}
                />
                <input
                  type="hidden"
                  name="permissionsJson"
                  value={JSON.stringify(draftPermissions)}
                />

                {Object.entries(groupedMenus).map(([menuArea, items]) => {
                  const areaPermissions = items.map((menuItem) =>
                    permissionByMenuId.get(menuItem.id),
                  );
                  const activeCount = countEnabledPermissions(
                    areaPermissions.filter(Boolean) as DraftPermission[],
                  );
                  const isOpen = openMenuAreas.has(menuArea);

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
                          className="flex min-h-14 w-full items-center justify-between gap-3 bg-surface-container px-4 py-3 text-left transition-[background-color] hover:bg-surface-container-high"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <ChevronDown
                              className={`size-4 shrink-0 text-primary transition-transform ${
                                isOpen ? "rotate-0" : "-rotate-90"
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="font-medium">{formatMenuArea(menuArea)}</p>
                              <p className="text-xs text-muted-foreground">
                                {items.length} menu • {activeCount} izin aktif
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="rounded-full">
                            {isOpen ? "Terbuka" : "Tutup"}
                          </Badge>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="hidden space-y-3 p-3 md:block">
                          <EnterpriseScorecards
                            items={[
                              { label: "Menu", value: items.length, description: "Menu dalam area ini", tone: "info" },
                              { label: "Izin aktif", value: activeCount, description: "Total permission aktif", tone: activeCount > 0 ? "success" : "default" },
                              {
                                label: "Full access",
                                value: items.filter((menuItem) => permissionByMenuId.get(menuItem.id)?.canSelectAll).length,
                                description: "Menu dengan select all",
                                tone: "warning",
                              },
                            ]}
                            className="xl:grid-cols-3"
                          />
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
                                    };

                                  return (
                                    <TableRow key={menuItem.id}>
                                      <TableCell>
                                        <div>
                                          <p className="font-medium">{menuItem.title}</p>
                                          <p className="text-xs text-muted-foreground">{menuItem.section}</p>
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
                              };

                            return (
                              <section
                                key={menuItem.id}
                                className="rounded-lg bg-surface-container-lowest p-4 shadow-[0_10px_22px_rgba(0,52,97,0.08)]"
                              >
                                <div>
                                  <p className="font-medium">{menuItem.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {menuItem.section}
                                  </p>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                  {PERMISSION_FIELDS.map((field) => (
                                    <label
                                      key={`${menuItem.id}-${field.key}`}
                                      className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-surface-container-low px-3 text-sm font-medium"
                                    >
                                      <span>{field.label}</span>
                                      <Checkbox
                                        checked={currentPermission[field.key]}
                                        onCheckedChange={(checked) =>
                                          updatePermission(
                                            menuItem.id,
                                            field.key,
                                            Boolean(checked),
                                          )
                                        }
                                      />
                                    </label>
                                  ))}
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}

                <div className="flex justify-end">
                  <SubmitButton>
                    <Save className="size-4" />
                    Simpan Akses Menu
                  </SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
