import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { portalChitraApps, portalChitraRoleAccess, securityRoles } from "@/db/schema/hero";
import { getCurrentEmployeeAccessRole, getEmployeeAccessRoleByEmail } from "@/lib/hero-access";
import { ensureHeroGovernanceSeedData } from "@/lib/hero-admin";

export type PortalChitraAppRecord = {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  url: string;
  color: string;
  iconName: string;
  sortOrder: number;
  isActive: boolean;
  showOnMobile: boolean;
  createdAt: Date;
  updatedAt: Date;
  roleIds: number[];
  roleNames: string[];
  restrictedToRoles: boolean;
};

export function slugifyPortalChitraName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getPortalChitraBaseData() {
  await ensureHeroGovernanceSeedData();

  const [apps, roles, roleAccessRows] = await Promise.all([
    db
      .select()
      .from(portalChitraApps)
      .orderBy(asc(portalChitraApps.sortOrder), asc(portalChitraApps.name)),
    db.select().from(securityRoles).orderBy(asc(securityRoles.name)),
    db.select().from(portalChitraRoleAccess),
  ]);

  const roleNameById = new Map(roles.map((role) => [role.id, role.name]));
  const roleIdsByAppId = roleAccessRows.reduce<Map<number, number[]>>((accumulator, row) => {
    const current = accumulator.get(row.portalAppId) ?? [];
    current.push(row.roleId);
    accumulator.set(row.portalAppId, current);
    return accumulator;
  }, new Map());

  const mappedApps = apps.map<PortalChitraAppRecord>((app) => {
    const roleIds = roleIdsByAppId.get(app.id) ?? [];
    const roleNames = roleIds
      .map((roleId) => roleNameById.get(roleId))
      .filter((value): value is string => Boolean(value));

    return {
      ...app,
      roleIds,
      roleNames,
      restrictedToRoles: roleIds.length > 0,
    };
  });

  return {
    apps: mappedApps,
    roles,
  };
}

function filterPortalAppsForRole(apps: PortalChitraAppRecord[], roleName: string | null, options?: { mobileOnly?: boolean }) {
  return apps.filter((app) => {
    if (!app.isActive) {
      return false;
    }

    if (options?.mobileOnly && !app.showOnMobile) {
      return false;
    }

    if (!app.restrictedToRoles) {
      return true;
    }

    if (!roleName) {
      return false;
    }

    return app.roleNames.includes(roleName);
  });
}

export async function getPortalChitraSettingsData() {
  return getPortalChitraBaseData();
}

export async function getVisiblePortalChitraAppsForRole(roleName: string | null, options?: { mobileOnly?: boolean }) {
  const { apps } = await getPortalChitraBaseData();
  return filterPortalAppsForRole(apps, roleName, options);
}

export async function getVisiblePortalChitraAppsForCurrentUser(options?: { mobileOnly?: boolean }) {
  const roleName = await getCurrentEmployeeAccessRole();
  return getVisiblePortalChitraAppsForRole(roleName, options);
}

export async function getVisiblePortalChitraAppsForEmail(email: string, options?: { mobileOnly?: boolean }) {
  const roleName = await getEmployeeAccessRoleByEmail(email);
  return getVisiblePortalChitraAppsForRole(roleName, options);
}

export async function getPortalChitraRoleNamesByIds(roleIds: number[]) {
  if (roleIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: securityRoles.id, name: securityRoles.name })
    .from(securityRoles)
    .where(inArray(securityRoles.id, roleIds))
    .orderBy(asc(securityRoles.name));

  return rows;
}

export async function getPortalChitraAppById(id: number) {
  await ensureHeroGovernanceSeedData();

  const [app] = await db
    .select()
    .from(portalChitraApps)
    .where(eq(portalChitraApps.id, id))
    .limit(1);

  return app ?? null;
}
