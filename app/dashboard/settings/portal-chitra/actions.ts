"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { portalChitraApps, portalChitraRoleAccess } from "@/db/schema/hero";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { ensureHeroGovernanceSeedData } from "@/lib/hero-admin";
import { slugifyPortalChitraName } from "@/lib/portal-chitra";

export type PortalChitraSettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const INITIAL_STATE: PortalChitraSettingsActionState = {
  status: "idle",
  message: "",
};

const formBooleanField = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === "" || value == null) {
      return defaultValue;
    }

    if (typeof value === "string") {
      return value === "true";
    }

    return Boolean(value);
  }, z.boolean());

const portalChitraAppSchema = z.object({
  intent: z.enum(["create", "update"]),
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, "Nama aplikasi wajib diisi.").max(120),
  category: z.string().trim().min(1, "Kategori wajib diisi.").max(120),
  description: z.string().trim().max(500).optional().default(""),
  url: z.string().trim().min(1, "URL wajib diisi.").max(500),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, "Warna wajib format hex seperti #003461."),
  iconName: z.string().trim().min(1, "Icon wajib diisi.").max(40),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: formBooleanField(true),
  showOnMobile: formBooleanField(true),
  restrictedToRoles: formBooleanField(false),
  roleIdsJson: z.string().trim().optional().default("[]"),
});

const deleteSchema = z.object({
  id: z.coerce.number().int().positive(),
});

async function ensureCanEditPortalChitra() {
  await ensureHeroGovernanceSeedData();

  const permission = await getCurrentMenuPermission("portal_chitra");
  return permission.canEdit;
}

async function buildUniquePortalSlug(name: string, excludeId?: number) {
  const baseSlug = slugifyPortalChitraName(name) || "portal-chitra-app";
  let attempt = 0;

  while (attempt < 100) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const [existing] = await db
      .select({ id: portalChitraApps.id })
      .from(portalChitraApps)
      .where(eq(portalChitraApps.slug, slug))
      .limit(1);

    if (!existing || existing.id === excludeId) {
      return slug;
    }

    attempt += 1;
  }

  throw new Error("Slug aplikasi tidak bisa dibuat unik.");
}

function parseRoleIds(value: string, restrictedToRoles: boolean) {
  const parsed = z.array(z.coerce.number().int().positive()).safeParse(JSON.parse(value || "[]"));

  if (!parsed.success) {
    throw new Error("Daftar role Portal Chitra tidak valid.");
  }

  const roleIds = Array.from(new Set(parsed.data));

  if (restrictedToRoles && roleIds.length === 0) {
    throw new Error("Pilih minimal satu role saat akses dibatasi.");
  }

  return roleIds;
}

function revalidatePortalChitraSurfaces() {
  revalidatePath("/dashboard/portal-chitra");
  revalidatePath("/dashboard/settings/portal-chitra");
  revalidatePath("/mobile/dashboard");
}

export async function savePortalChitraAppAction(
  _state: PortalChitraSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<PortalChitraSettingsActionState> {
  try {
    if (!(await ensureCanEditPortalChitra())) {
      return {
        status: "error",
        message: "Role Anda belum punya akses edit Portal Chitra.",
      };
    }

    const parsed = portalChitraAppSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!parsed.success) {
      return {
        status: "error",
        message: parsed.error.issues[0]?.message ?? "Form Portal Chitra belum valid.",
      };
    }

    const payload = parsed.data;
    const roleIds = parseRoleIds(payload.roleIdsJson, payload.restrictedToRoles);

    if (payload.intent === "create") {
      const slug = await buildUniquePortalSlug(payload.name);

      await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(portalChitraApps)
          .values({
            slug,
            name: payload.name,
            category: payload.category,
            description: payload.description,
            url: payload.url,
            color: payload.color,
            iconName: payload.iconName,
            sortOrder: payload.sortOrder,
            isActive: payload.isActive,
            showOnMobile: payload.showOnMobile,
            updatedAt: new Date(),
          })
          .returning({ id: portalChitraApps.id });

        if (roleIds.length > 0) {
          await tx.insert(portalChitraRoleAccess).values(
            roleIds.map((roleId) => ({
              portalAppId: created.id,
              roleId,
            })),
          );
        }
      });

      revalidatePortalChitraSurfaces();
      return {
        status: "success",
        message: "Aplikasi Portal Chitra berhasil ditambahkan.",
      };
    }

    if (!payload.id) {
      return {
        status: "error",
        message: "ID aplikasi wajib ada untuk update.",
      };
    }

    const [existing] = await db
      .select({ id: portalChitraApps.id })
      .from(portalChitraApps)
      .where(eq(portalChitraApps.id, payload.id))
      .limit(1);

    if (!existing) {
      return {
        status: "error",
        message: "Aplikasi Portal Chitra tidak ditemukan.",
      };
    }

    const appId = payload.id;

    await db.transaction(async (tx) => {
      await tx
        .update(portalChitraApps)
        .set({
          name: payload.name,
          category: payload.category,
          description: payload.description,
          url: payload.url,
          color: payload.color,
          iconName: payload.iconName,
          sortOrder: payload.sortOrder,
          isActive: payload.isActive,
          showOnMobile: payload.showOnMobile,
          updatedAt: new Date(),
        })
        .where(eq(portalChitraApps.id, appId));

      await tx
        .delete(portalChitraRoleAccess)
        .where(eq(portalChitraRoleAccess.portalAppId, appId));

      if (roleIds.length > 0) {
        await tx.insert(portalChitraRoleAccess).values(
          roleIds.map((roleId) => ({
            portalAppId: appId,
            roleId,
          })),
        );
      }
    });

    revalidatePortalChitraSurfaces();
    return {
      status: "success",
      message: "Aplikasi Portal Chitra berhasil diperbarui.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal menyimpan Portal Chitra.",
    };
  }
}

export async function deletePortalChitraAppAction(
  _state: PortalChitraSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<PortalChitraSettingsActionState> {
  try {
    if (!(await ensureCanEditPortalChitra())) {
      return {
        status: "error",
        message: "Role Anda belum punya akses edit Portal Chitra.",
      };
    }

    const parsed = deleteSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!parsed.success) {
      return {
        status: "error",
        message: parsed.error.issues[0]?.message ?? "ID aplikasi tidak valid.",
      };
    }

    await db.delete(portalChitraApps).where(eq(portalChitraApps.id, parsed.data.id));

    revalidatePortalChitraSurfaces();
    return {
      status: "success",
      message: "Aplikasi Portal Chitra berhasil dihapus.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal menghapus Portal Chitra.",
    };
  }
}
