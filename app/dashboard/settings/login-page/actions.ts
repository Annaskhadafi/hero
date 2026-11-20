"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { heroLoginPageSettings } from "@/db/schema/hero";
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission, isSuperAdminRole } from "@/lib/hero-access";
import { getServerSession } from "@/lib/auth-session";
import { DEFAULT_LOGIN_PAGE_SETTINGS, LoginPageSettingsData } from "./types";

export async function getLoginPageSettings(): Promise<LoginPageSettingsData> {
  try {
    const [row] = await db
      .select()
      .from(heroLoginPageSettings)
      .where(eq(heroLoginPageSettings.isActive, true))
      .orderBy(desc(heroLoginPageSettings.id))
      .limit(1);

    if (!row) {
      return DEFAULT_LOGIN_PAGE_SETTINGS;
    }

    let parsedFeatures = DEFAULT_LOGIN_PAGE_SETTINGS.featuresJson;
    if (row.featuresJson) {
      if (Array.isArray(row.featuresJson)) {
        parsedFeatures = row.featuresJson as any;
      } else if (typeof row.featuresJson === "string") {
        try {
          parsedFeatures = JSON.parse(row.featuresJson);
        } catch {
          parsedFeatures = DEFAULT_LOGIN_PAGE_SETTINGS.featuresJson;
        }
      }
    }

    return {
      id: row.id,
      heroTitle: row.heroTitle ?? DEFAULT_LOGIN_PAGE_SETTINGS.heroTitle,
      heroSubtitle: row.heroSubtitle ?? DEFAULT_LOGIN_PAGE_SETTINGS.heroSubtitle,
      heroEyebrow: row.heroEyebrow ?? DEFAULT_LOGIN_PAGE_SETTINGS.heroEyebrow,
      bannerImageUrl: row.bannerImageUrl ?? DEFAULT_LOGIN_PAGE_SETTINGS.bannerImageUrl,
      bannerOverlayColor: row.bannerOverlayColor ?? DEFAULT_LOGIN_PAGE_SETTINGS.bannerOverlayColor,
      logoUrl: row.logoUrl ?? DEFAULT_LOGIN_PAGE_SETTINGS.logoUrl,
      formEyebrow: row.formEyebrow ?? DEFAULT_LOGIN_PAGE_SETTINGS.formEyebrow,
      formTitle: row.formTitle ?? DEFAULT_LOGIN_PAGE_SETTINGS.formTitle,
      formDescription: row.formDescription ?? DEFAULT_LOGIN_PAGE_SETTINGS.formDescription,
      pageBackgroundType: row.pageBackgroundType ?? DEFAULT_LOGIN_PAGE_SETTINGS.pageBackgroundType,
      pageBackgroundColor: row.pageBackgroundColor ?? DEFAULT_LOGIN_PAGE_SETTINGS.pageBackgroundColor,
      pageBackgroundImageUrl: row.pageBackgroundImageUrl ?? "",
      footerCopyright: row.footerCopyright ?? DEFAULT_LOGIN_PAGE_SETTINGS.footerCopyright,
      footerTagline: row.footerTagline ?? DEFAULT_LOGIN_PAGE_SETTINGS.footerTagline,
      helpText: row.helpText ?? DEFAULT_LOGIN_PAGE_SETTINGS.helpText,
      helpDetails: row.helpDetails ?? DEFAULT_LOGIN_PAGE_SETTINGS.helpDetails,
      featuresJson: parsedFeatures,
    };
  } catch (error) {
    console.error("[getLoginPageSettings] Error fetching settings:", error);
    return DEFAULT_LOGIN_PAGE_SETTINGS;
  }
}

async function verifyCanManageLoginPage(): Promise<{ allowed: boolean; userEmail?: string }> {
  const session = await getServerSession();
  if (!session?.user) {
    return { allowed: false };
  }

  const roleName = await getCurrentEmployeeAccessRole();
  if (isSuperAdminRole(roleName)) {
    return { allowed: true, userEmail: session.user.email };
  }

  const perm = await getCurrentMenuPermission("settings_login_page");
  if (perm.canEdit) {
    return { allowed: true, userEmail: session.user.email };
  }

  const navPerm = await getCurrentMenuPermission("settings_navbar");
  if (navPerm.canEdit) {
    return { allowed: true, userEmail: session.user.email };
  }

  return { allowed: false, userEmail: session.user.email };
}

export async function updateLoginPageSettingsAction(data: Partial<LoginPageSettingsData>) {
  const auth = await verifyCanManageLoginPage();
  if (!auth.allowed) {
    return { success: false, error: "Akses ditolak: Anda tidak memiliki wewenang untuk mengubah pengaturan login." };
  }

  try {
    const existing = await getLoginPageSettings();

    const payload = {
      heroTitle: data.heroTitle?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.heroTitle,
      heroSubtitle: data.heroSubtitle?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.heroSubtitle,
      heroEyebrow: data.heroEyebrow?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.heroEyebrow,
      bannerImageUrl: data.bannerImageUrl?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.bannerImageUrl,
      bannerOverlayColor: data.bannerOverlayColor?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.bannerOverlayColor,
      logoUrl: data.logoUrl?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.logoUrl,
      formEyebrow: data.formEyebrow?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.formEyebrow,
      formTitle: data.formTitle?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.formTitle,
      formDescription: data.formDescription?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.formDescription,
      pageBackgroundType: data.pageBackgroundType || DEFAULT_LOGIN_PAGE_SETTINGS.pageBackgroundType,
      pageBackgroundColor: data.pageBackgroundColor || DEFAULT_LOGIN_PAGE_SETTINGS.pageBackgroundColor,
      pageBackgroundImageUrl: data.pageBackgroundImageUrl || null,
      footerCopyright: data.footerCopyright?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.footerCopyright,
      footerTagline: data.footerTagline?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.footerTagline,
      helpText: data.helpText?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.helpText,
      helpDetails: data.helpDetails?.trim() || DEFAULT_LOGIN_PAGE_SETTINGS.helpDetails,
      featuresJson: data.featuresJson || DEFAULT_LOGIN_PAGE_SETTINGS.featuresJson,
      isActive: true,
      updatedBy: auth.userEmail || "admin",
      updatedAt: new Date(),
    };

    if (existing.id) {
      await db
        .update(heroLoginPageSettings)
        .set(payload)
        .where(eq(heroLoginPageSettings.id, existing.id));
    } else {
      await db.insert(heroLoginPageSettings).values(payload);
    }

    revalidatePath("/sign-in");
    revalidatePath("/login");
    revalidatePath("/dashboard/settings/login-page");

    return { success: true, message: "Pengaturan halaman login berhasil diperbarui!" };
  } catch (error: any) {
    console.error("[updateLoginPageSettingsAction] Error:", error);
    return { success: false, error: error?.message || "Gagal menyimpan pengaturan halaman login." };
  }
}

export async function resetLoginPageSettingsAction() {
  const auth = await verifyCanManageLoginPage();
  if (!auth.allowed) {
    return { success: false, error: "Akses ditolak: Anda tidak memiliki wewenang untuk mereset pengaturan login." };
  }

  try {
    const existing = await getLoginPageSettings();

    const payload = {
      ...DEFAULT_LOGIN_PAGE_SETTINGS,
      pageBackgroundImageUrl: null,
      isActive: true,
      updatedBy: auth.userEmail || "admin",
      updatedAt: new Date(),
    };

    if (existing.id) {
      await db
        .update(heroLoginPageSettings)
        .set(payload)
        .where(eq(heroLoginPageSettings.id, existing.id));
    } else {
      await db.insert(heroLoginPageSettings).values(payload);
    }

    revalidatePath("/sign-in");
    revalidatePath("/login");
    revalidatePath("/dashboard/settings/login-page");

    return { success: true, message: "Pengaturan halaman login berhasil dikembalikan ke default bawaan HERO!" };
  } catch (error: any) {
    console.error("[resetLoginPageSettingsAction] Error:", error);
    return { success: false, error: error?.message || "Gagal mereset pengaturan halaman login." };
  }
}
