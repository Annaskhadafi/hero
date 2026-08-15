'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { and, eq, ne, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { account, session, user } from '@/db/schema/auth'
import { employees } from '@/db/schema/hero'
import { auth } from '@/lib/auth'
import { getCurrentEmployee } from '@/lib/get-current-employee'
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
  const sessionData = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  const currentEmp = await getCurrentEmployee().catch(() => null)

  const targetAuthUserId = sessionData?.user?.id || currentEmp?.authUserId
  if (!targetAuthUserId && !currentEmp) {
    return { ok: false, message: 'Sesi tidak valid. Silakan login ulang.' }
  }

  const currentPassword = formVal(formData, 'currentPassword')
  const newPassword = formVal(formData, 'newPassword')

  if (!currentPassword) {
    return { ok: false, message: 'Password saat ini wajib diisi.' }
  }

  if (newPassword.length < 6) {
    return { ok: false, message: 'Password baru minimal 6 karakter.' }
  }

  const userEmail = sessionData?.user?.email?.toLowerCase().trim() || currentEmp?.email?.toLowerCase().trim()
  const employeeSn = currentEmp?.employeeSn?.trim()

  // Find existing credential record
  const [cred] = await db
    .select({
      id: account.id,
      password: account.password,
      userId: account.userId,
      accountId: account.accountId,
    })
    .from(account)
    .where(
      and(
        eq(account.providerId, 'credential'),
        or(
          targetAuthUserId ? eq(account.userId, targetAuthUserId) : sql`false`,
          userEmail ? eq(account.accountId, userEmail) : sql`false`,
          employeeSn ? eq(account.accountId, employeeSn) : sql`false`
        )
      )
    )
    .limit(1)

  if (!cred?.password) {
    return { ok: false, message: 'Akun login tidak ditemukan. Hubungi Administrator.' }
  }

  // Verify current password
  let isValid = false
  try {
    isValid = await verifyPassword({ hash: cred.password, password: currentPassword })
  } catch {
    // If argon2/bcrypt throws because of legacy plaintext or different format
    if (cred.password === currentPassword) {
      isValid = true
    } else {
      return { ok: false, message: 'Format password lama tidak valid. Hubungi administrator.' }
    }
  }

  if (!isValid && cred.password === currentPassword) {
    isValid = true
  }

  if (!isValid) {
    return { ok: false, message: 'Password saat ini tidak sesuai / salah.' }
  }

  const passwordHash = await hashPassword(newPassword)
  const now = new Date()

  await db
    .update(account)
    .set({
      password: passwordHash,
      userId: targetAuthUserId || cred.userId,
      updatedAt: now,
    })
    .where(eq(account.id, cred.id))

  // Delete all other sessions except current if session exists
  if (sessionData?.user?.id) {
    await db
      .delete(session)
      .where(and(eq(session.userId, sessionData.user.id), ne(session.id, sessionData.session?.id ?? '')))
      .catch(() => null)
  }

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/analytics')
  return { ok: true, message: 'Password berhasil diubah.' }
}

export async function changeMyPasswordDirectAction(payload: {
  currentPassword: string
  newPassword: string
}): Promise<ProfileActionState> {
  const fd = new FormData()
  fd.append('currentPassword', payload.currentPassword)
  fd.append('newPassword', payload.newPassword)
  return changeMyPasswordAction(emptyState, fd)
}

