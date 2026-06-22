'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { and, eq, ne } from 'drizzle-orm'

import { db } from '@/db'
import { account, session, user } from '@/db/schema/auth'
import { employees } from '@/db/schema/hero'
import { auth } from '@/lib/auth'
import { hashPassword, verifyPassword } from 'better-auth/crypto'

export type ProfileActionState = { ok: boolean; message: string }

const emptyState: ProfileActionState = { ok: false, message: '' }

function formVal(formData: FormData, key: string) {
  const v = formData.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export async function updateMyProfileAction(
  _prev: ProfileActionState = emptyState,
  formData: FormData
): Promise<ProfileActionState> {
  const sessionData = await auth.api.getSession({ headers: await headers() })
  if (!sessionData?.user?.id) return { ok: false, message: 'Sesi tidak valid. Silakan login ulang.' }

  const name = formVal(formData, 'name')
  const phone = formVal(formData, 'phoneNumber')
  const domicile = formVal(formData, 'domicile')
  const birthPlaceDate = formVal(formData, 'birthPlaceDate')
  const religion = formVal(formData, 'religion')
  const education = formVal(formData, 'education')
  const maritalStatus = formVal(formData, 'maritalStatus')
  const gender = formVal(formData, 'gender')
  const profileImage = formVal(formData, 'profileImage')

  if (name.length < 2) return { ok: false, message: 'Nama minimal 2 karakter.' }

  await db
    .update(user)
    .set({ name, image: profileImage || null, updatedAt: new Date() })
    .where(eq(user.id, sessionData.user.id))

  const [emp] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.authUserId, sessionData.user.id))
    .limit(1)

  if (emp) {
    await db
      .update(employees)
      .set({
        name,
        phoneNumber: phone,
        domicile: domicile || 'Belum diisi',
        birthPlaceDate,
        religion,
        education,
        maritalStatus: maritalStatus || 'none',
        gender,
      })
      .where(eq(employees.id, emp.id))
  }

  revalidatePath('/dashboard/profile')
  return { ok: true, message: 'Profil berhasil disimpan.' }
}

export async function changeMyPasswordAction(
  _prev: ProfileActionState = emptyState,
  formData: FormData
): Promise<ProfileActionState> {
  const sessionData = await auth.api.getSession({ headers: await headers() })
  if (!sessionData?.user?.id) return { ok: false, message: 'Sesi tidak valid.' }

  const currentPassword = formVal(formData, 'currentPassword')
  const newPassword = formVal(formData, 'newPassword')

  if (newPassword.length < 8) return { ok: false, message: 'Password baru minimal 8 karakter.' }

  // Verify current password
  const [cred] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, sessionData.user.id), eq(account.providerId, 'credential')))
    .limit(1)

  if (!cred?.password) return { ok: false, message: 'Akun credential tidak ditemukan.' }

  let isValid = false
  try {
    isValid = await verifyPassword({ hash: cred.password, password: currentPassword })
  } catch {
    return { ok: false, message: 'Format hash password tidak dikenali. Hubungi admin untuk reset password.' }
  }
  if (!isValid) return { ok: false, message: 'Password saat ini salah.' }

  const passwordHash = await hashPassword(newPassword)
  await db
    .update(account)
    .set({ password: passwordHash, updatedAt: new Date() })
    .where(and(eq(account.userId, sessionData.user.id), eq(account.providerId, 'credential')))

  // Delete all other sessions except current
  await db.delete(session).where(and(eq(session.userId, sessionData.user.id), ne(session.id, sessionData.session?.id ?? '')))

  revalidatePath('/dashboard/profile')
  return { ok: true, message: 'Password berhasil diubah.' }
}
