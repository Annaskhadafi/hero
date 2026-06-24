"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { employees } from "@/db/schema/hero";
import { auth } from "@/lib/auth";

export type MobileProfileActionState = {
  ok: boolean;
  message: string;
};

const emptyState: MobileProfileActionState = {
  ok: false,
  message: "",
};

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getCurrentUserManagementEmployee(sessionUser: { id?: string; email?: string | null }) {
  const normalizedEmail = sessionUser.email?.trim().toLowerCase() ?? "";

  if (sessionUser.id) {
    const [employee] = await db
      .select({ id: employees.id, authUserId: employees.authUserId, email: employees.email })
      .from(employees)
      .where(eq(employees.authUserId, sessionUser.id))
      .limit(1);

    if (employee) return employee;
  }

  if (!normalizedEmail) return null;

  const [employee] = await db
    .select({ id: employees.id, authUserId: employees.authUserId, email: employees.email })
    .from(employees)
    .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
    .limit(1);

  return employee ?? null;
}

async function ensureEmailAvailableForEmployee(email: string, employeeId: number) {
  const [existing] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(sql`lower(${employees.email}) = ${email}`, ne(employees.id, employeeId)))
    .limit(1);

  return !existing;
}

export async function updateMobileProfileAction(
  _previousState: MobileProfileActionState = emptyState,
  formData: FormData,
): Promise<MobileProfileActionState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email) {
    return {
      ok: false,
      message: "Session is invalid. Please log in again.",
    };
  }

  const name = formValue(formData, "name");
  const email = formValue(formData, "email");
  const phoneNumber = formValue(formData, "phoneNumber");
  const domicile = formValue(formData, "domicile");
  const birthPlaceDate = formValue(formData, "birthPlaceDate");
  const profileImage = formValue(formData, "profileImage");

  if (name.length < 2) {
    return {
      ok: false,
      message: "Nama minimal 2 karakter.",
    };
  }

  const currentEmployee = await getCurrentUserManagementEmployee(session.user);

  if (!currentEmployee) {
    return {
      ok: false,
      message: "Data User Management tidak ditemukan untuk akun ini.",
    };
  }

  const normalizedEmail = currentEmployee.email.trim().toLowerCase();

  const userUpdate: { name: string; image: string | null; updatedAt: Date; email?: string; emailVerified?: boolean } = {
    name,
    image: profileImage || null,
    updatedAt: new Date(),
  }
  const empUpdate: { name: string; phoneNumber: string; domicile: string; birthPlaceDate: string; email?: string } = {
    name,
    phoneNumber,
    domicile: domicile || "Belum diisi",
    birthPlaceDate,
  }

  if (email && email !== normalizedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const nextEmail = email.toLowerCase();
    const emailAvailable = await ensureEmailAvailableForEmployee(nextEmail, currentEmployee.id);

    if (!emailAvailable) {
      return { ok: false, message: "Email sudah dipakai user lain di User Management." };
    }

    userUpdate.email = nextEmail
    userUpdate.emailVerified = false
    empUpdate.email = nextEmail
  }

  await Promise.all([
    db.update(user).set(userUpdate).where(eq(user.id, session.user.id)),
    db.update(employees).set(empUpdate).where(eq(employees.id, currentEmployee.id)),
  ]);

  revalidatePath("/mobile/profile");
  revalidatePath("/mobile/dashboard");

  return {
    ok: true,
    message: "Profile tersimpan.",
  };
}

export async function updateMobileEmailAction(
  _previousState: MobileProfileActionState = emptyState,
  formData: FormData,
): Promise<MobileProfileActionState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email) {
    return { ok: false, message: "Session tidak valid." };
  }

  const newEmail = formValue(formData, "email");

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { ok: false, message: "Format email tidak valid." };
  }

  const normalizedEmail = newEmail.toLowerCase();
  const currentEmployee = await getCurrentUserManagementEmployee(session.user);

  if (!currentEmployee) {
    return { ok: false, message: "Data User Management tidak ditemukan untuk akun ini." };
  }

  const emailAvailable = await ensureEmailAvailableForEmployee(normalizedEmail, currentEmployee.id);

  if (!emailAvailable) {
    return { ok: false, message: "Email sudah dipakai user lain di User Management." };
  }

  await Promise.all([
    db
      .update(user)
      .set({ email: normalizedEmail, emailVerified: false, updatedAt: new Date() })
      .where(eq(user.id, session.user.id)),
    db
      .update(employees)
      .set({ email: normalizedEmail })
      .where(eq(employees.id, currentEmployee.id)),
  ]);

  revalidatePath("/mobile/profile");
  revalidatePath("/mobile/dashboard");

  return {
    ok: true,
    message: "Email berhasil diperbarui.",
  };
}
