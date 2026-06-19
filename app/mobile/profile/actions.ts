"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq, or, sql } from "drizzle-orm";

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

  const normalizedEmail = session.user.email.trim().toLowerCase();
  const employeeFilters = [sql`lower(${employees.email}) = ${normalizedEmail}`];

  if (session.user.id) {
    employeeFilters.push(eq(employees.authUserId, session.user.id));
  }

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
    userUpdate.email = email.toLowerCase()
    userUpdate.emailVerified = false
    empUpdate.email = email.toLowerCase()
  }

  await Promise.all([
    db.update(user).set(userUpdate).where(eq(user.id, session.user.id)),
    db.update(employees).set(empUpdate).where(or(...employeeFilters)),
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

  await Promise.all([
    db
      .update(user)
      .set({ email: normalizedEmail, emailVerified: false, updatedAt: new Date() })
      .where(eq(user.id, session.user.id)),
    db
      .update(employees)
      .set({ email: normalizedEmail })
      .where(eq(employees.authUserId, session.user.id)),
  ]);

  revalidatePath("/mobile/profile");
  revalidatePath("/mobile/dashboard");

  return {
    ok: true,
    message: "Email berhasil diperbarui.",
  };
}
