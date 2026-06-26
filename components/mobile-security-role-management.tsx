"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ChevronDown,
  Copy,
  Plus,
  Save,
  Shield,
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
  sortOrder?: number | null;
  groupLabel?: string | null;
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
  return sectionLabelMap[value] ?? value.replaceAll("_", " ");
}

const DESKTOP_MENU_ORDER = [
  "Portal Chitra",
  "Aktivitas Harian",
  "Roster & Timesheet",
  "Approval",
  "Data Induk",
  "Human Capital",
  "Attendance",
  "HSE",
  "Central Service",
  "Laporan",
  "Pengaturan",
] as const;

const sectionLabelMap: Record<string, string> = {
  "Daily Activity": "Aktivitas Harian",
  "Central Service": "Central Service",
  Approval: "Approval",
  "Master Data": "Data Induk",
  HR: "Human Capital",
  HSE: "HSE",
  Report: "Laporan",
  Setting: "Pengaturan",
};

type ViewFilter = "all" | "desktop" | "mobile";

function getSidebarSection(menuItem: MenuRow) {
  return sectionLabelMap[menuItem.section] ?? menuItem.section ?? "Menu";
}

function hasMobileCounterpart(url: string) {
  if (url.startsWith("/mobile")) return true;
  const cleanUrl = url.split("?")[0];
  return cleanUrl === "/dashboard/security/roles" || cleanUrl.startsWith("/dashboard/hse/") || [
    "/dashboard/activity-hub/my-day",
    "/dashboard/approval",
    "/dashboard/lms",
    "/dashboard/overtime-requests",
    "/dashboard/timesheet",
    "/dashboard/training",
    "/dashboard/wellness",
  ].includes(cleanUrl);
}

function matchesViewFilter(menuItem: MenuRow, viewFilter: ViewFilter) {
  if (viewFilter === "mobile") return hasMobileCounterpart(menuItem.url);
  if (viewFilter === "desktop") return !menuItem.url.startsWith("/mobile");
  return true;
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
    <Button type="submit" variant={variant} disabled={pending} className="w-full">
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

export function MobileSecurityRoleManagement({
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
  const [expandedMenuArea, setExpandedMenuArea] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
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
    const filteredItems = menuItems
      .filter((menuItem) => matchesViewFilter(menuItem, viewFilter))
      .sort((left, right) => {
        const leftSection = getSidebarSection(left);
        const rightSection = getSidebarSection(right);
        const leftIndex = DESKTOP_MENU_ORDER.indexOf(leftSection as (typeof DESKTOP_MENU_ORDER)[number]);
        const rightIndex = DESKTOP_MENU_ORDER.indexOf(rightSection as (typeof DESKTOP_MENU_ORDER)[number]);
        const sectionDiff = (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
        if (sectionDiff !== 0) return sectionDiff;
        return (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.title.localeCompare(right.title);
      });

    return filteredItems.reduce<Array<{ section: string; items: MenuRow[] }>>((accumulator, menuItem) => {
      const section = getSidebarSection(menuItem);
      const group = accumulator.find((item) => item.section === section);
      if (group) {
        group.items.push(menuItem);
      } else {
        accumulator.push({ section, items: [menuItem] });
      }
      return accumulator;
    }, []);
  }, [menuItems, viewFilter]);

  const permissionByMenuId = useMemo(() => {
    return new Map(draftPermissions.map((p) => [p.menuItemId, p]));
  }, [draftPermissions]);

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
    <div className="space-y-4 px-4 py-4">
      {roleState.status !== "idle" && (
        <Alert
          className={
            roleState.status === "error"
              ? "border-red-200 text-red-700"
              : "border-emerald-200 text-emerald-700"
          }
        >
          <AlertDescription>{roleState.message}</AlertDescription>
        </Alert>
      )}

      <Card className="rounded-lg bg-surface-container-lowest">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pilih Role</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedRoleId.toString()} onValueChange={(v) => setSelectedRoleId(Number(v))}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id.toString()}>
                  <div className="flex items-center gap-2">
                    <Shield className="size-3.5" />
                    <span>{role.name}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {role.assignedUsers}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Akses Menu
        </div>
        <Select value={viewFilter} onValueChange={(value) => setViewFilter(value as ViewFilter)}>
          <SelectTrigger className="h-10 bg-surface-container-lowest text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua view</SelectItem>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
          </SelectContent>
        </Select>

        <form action={roleFormAction} className="space-y-3">
          <input type="hidden" name="intent" value="update-permissions" />
          <input type="hidden" name="roleId" value={selectedRoleId} />
          <input
            type="hidden"
            name="permissions"
            value={JSON.stringify(draftPermissions)}
          />

          {groupedMenus.map(({ section, items }) => (
            <div key={section} className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  setExpandedMenuArea(
                    expandedMenuArea === section ? null : section,
                  )
                }
                className="flex w-full items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5 text-sm font-medium transition-colors active:bg-surface-container-lowest"
              >
                <span>{formatMenuArea(section)}</span>
                <ChevronDown
                  className={`size-4 transition-transform ${
                    expandedMenuArea === section ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedMenuArea === section && (
                <div className="space-y-2 pl-2">
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
                      <div
                        key={menuItem.id}
                        className="rounded-lg bg-surface-container-lowest p-3"
                      >
                        <div className="mb-3">
                          {menuItem.groupLabel && (
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                              {menuItem.groupLabel}
                            </p>
                          )}
                          <p className="text-sm font-medium">{menuItem.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {menuItem.section}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {PERMISSION_FIELDS.map((field) => (
                            <label
                              key={`${menuItem.id}-${field.key}`}
                              className="flex min-h-10 items-center justify-between gap-2 rounded-md bg-surface-container-low px-2.5 text-xs font-medium"
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div className="sticky bottom-0 space-y-2 bg-surface pt-3">
            <SubmitButton>
              <Save className="size-4" />
              Simpan Akses
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
