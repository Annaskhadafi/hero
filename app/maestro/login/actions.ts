'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  createMaestroSession,
  destroyMaestroSession,
  verifyMaestroCredentials,
} from '@/lib/maestro-session'

export async function loginMaestroAction(input: {
  email: string
  password: string
  rememberMe?: boolean
}) {
  const email = input.email?.trim()
  const password = input.password

  if (!email || !password) {
    return { success: false, error: 'Email dan password wajib diisi.' }
  }

  const verification = await verifyMaestroCredentials(email, password)
  if (!verification.success) {
    return { success: false, error: verification.error }
  }

  const reqHeaders = await headers()
  const ipAddress =
    reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    reqHeaders.get('x-real-ip') ||
    undefined
  const userAgent = reqHeaders.get('user-agent') || undefined

  await createMaestroSession(verification.user.id, {
    rememberMe: input.rememberMe,
    ipAddress,
    userAgent,
  })

  return { success: true }
}

export async function logoutMaestroAction() {
  await destroyMaestroSession()
  redirect('/login')
}
