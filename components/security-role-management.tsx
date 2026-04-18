"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Copy, Plus, Save, Shield, Trash2 } from "lucide-react";
import {
  manageSecurityRoleAction,
  type AdminMutationState,
} from "@/app/dashboard/admin-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [roleState, roleFormAction] = useActionState(
    manageSecurityRoleAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    setDraftPermissions(
      buildDraftPermissions(selectedRoleId, menuItems, menuPermissions),
    );
  }, [menuItems, menuPermissions, selectedRoleId]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const groupedMenus = useMemo(() => {
    return menuItems.reduce<Record<string, MenuRow[]>>((accumulator, menuItem) => {
      accumulator[menuItem.menuArea] = accumulator[menuItem.menuArea] ?? [];
      accumulator[menuItem.menuArea].push(menuItem);
      return accumulator;
    }, {});
  }, [menuItems]);

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
        <Card className="rounded-[1.6rem] bg-surface-container-lowest">
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
                className={`w-full rounded-[1.05rem] px-4 py-4 text-left transition ${
                  selectedRoleId === role.id
                    ? "bg-primary/5"
                    : "bg-surface-container-low hover:bg-surface-container-highest"
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
          <Card className="rounded-[1.6rem] bg-surface-container-lowest">
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

                {Object.entries(groupedMenus).map(([menuArea, items]) => (
                  <div key={menuArea} className="overflow-hidden rounded-[1.2rem] bg-surface-container-low">
                    <div className="bg-surface-container-high px-4 py-4">
                      <p className="font-medium">{formatMenuArea(menuArea)}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Menu</th>
                            <th className="px-4 py-3 text-left font-medium">Lihat</th>
                            <th className="px-4 py-3 text-left font-medium">Ubah</th>
                            <th className="px-4 py-3 text-left font-medium">Hapus</th>
                            <th className="px-4 py-3 text-left font-medium">Akses penuh</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((menuItem) => {
                            const currentPermission =
                              draftPermissions.find(
                                (permission) => permission.menuItemId === menuItem.id,
                              ) ?? {
                                menuItemId: menuItem.id,
                                canView: false,
                                canEdit: false,
                                canDelete: false,
                                canSelectAll: false,
                              };

                            return (
                              <tr key={menuItem.id} className="bg-surface-container-lowest">
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium">{menuItem.title}</p>
                                    <p className="text-xs text-muted-foreground">{menuItem.section}</p>
                                  </div>
                                </td>
                                {(
                                  [
                                    "canView",
                                    "canEdit",
                                    "canDelete",
                                    "canSelectAll",
                                  ] as const
                                ).map((field) => (
                                  <td key={`${menuItem.id}-${field}`} className="px-4 py-3">
                                    <Checkbox
                                      checked={currentPermission[field]}
                                      onCheckedChange={(checked) =>
                                        setDraftPermissions((current) =>
                                          current.map((permission) =>
                                            permission.menuItemId === menuItem.id
                                              ? {
                                                  ...permission,
                                                  [field]: Boolean(checked),
                                                }
                                              : permission,
                                          ),
                                        )
                                      }
                                    />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

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
