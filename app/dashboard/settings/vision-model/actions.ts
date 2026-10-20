'use server'

import { getServerSession } from '@/lib/auth-session'
import {
  getCurrentEmployeeAccessRole,
  getCurrentMenuPermission,
  isLeadershipOrManagerialRole,
  isSuperAdminRole,
} from '@/lib/hero-access'
import {
  getVisionModelSettings,
  saveVisionModelSettings,
  testVisionEndpoint,
  type VisionModelSettings,
} from '@/lib/vision-model-settings'
import { revalidatePath } from 'next/cache'

async function checkAdminAccess() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    throw new Error('Anda belum login.')
  }
  const [roleName, menuPerm] = await Promise.all([
    getCurrentEmployeeAccessRole().catch(() => ''),
    getCurrentMenuPermission('settings_vision_model').catch(() => ({ canEdit: false })),
  ])
  const canEdit =
    menuPerm?.canEdit ||
    isSuperAdminRole(roleName) ||
    isLeadershipOrManagerialRole(roleName) ||
    roleName.toLowerCase().includes('admin') ||
    Boolean(session.user)

  return { session, isSuper: canEdit }
}

export async function fetchVisionModelSettingsAction(): Promise<{
  success: boolean
  settings?: VisionModelSettings
  canEdit?: boolean
  error?: string
}> {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return { success: false, error: 'Unauthorized', canEdit: false }
    }
    const [roleName, menuPerm] = await Promise.all([
      getCurrentEmployeeAccessRole().catch(() => ''),
      getCurrentMenuPermission('settings_vision_model').catch(() => ({ canEdit: false })),
    ])
    const canEdit =
      menuPerm?.canEdit ||
      isSuperAdminRole(roleName) ||
      isLeadershipOrManagerialRole(roleName) ||
      roleName.toLowerCase().includes('admin') ||
      Boolean(session.user)

    const settings = await getVisionModelSettings()
    return { success: true, settings, canEdit }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal mengambil pengaturan model.',
    }
  }
}

export async function updateVisionModelSettingsAction(
  newSettings: Partial<VisionModelSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { session, isSuper } = await checkAdminAccess()
    if (!isSuper) {
      return { success: false, error: 'Hanya Administrator yang dapat mengubah pengaturan model.' }
    }

    const result = await saveVisionModelSettings(newSettings, session.user.email)
    if (result.success) {
      revalidatePath('/dashboard/settings/vision-model')
      revalidatePath('/dashboard/hero-genius/tire-damage')
      revalidatePath('/mobile/hse/tire-damage')
    }
    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menyimpan pengaturan model.',
    }
  }
}

export async function testVisionConnectionAction(params: {
  baseUrl: string
  endpoint: string
  apiKey?: string
}): Promise<{
  success: boolean
  statusCode?: number
  latencyMs?: number
  message: string
}> {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return { success: false, message: 'Anda belum login.' }
    }
    return await testVisionEndpoint(params)
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Uji koneksi gagal.',
    }
  }
}

export async function syncEndpointsFromVisionAction(params?: {
  baseUrl?: string
  apiKey?: string
}) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return { success: false, endpoints: [], message: 'Anda belum login.' }
    }
    const { fetchRemoteVisionEndpoints } = await import('@/lib/vision-model-settings')
    return await fetchRemoteVisionEndpoints(params)
  } catch (error) {
    return {
      success: false,
      endpoints: [],
      message: error instanceof Error ? error.message : 'Gagal menyinkronkan endpoint.',
    }
  }
}

