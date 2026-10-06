import { db } from '@/db'
import { settings } from '@/db/schema'
import { eq } from 'drizzle-orm'

export interface VisionModelEndpointPreset {
  id: string
  name: string
  endpoint: string
  description?: string
  isDefault?: boolean
}

export interface VisionModelSettings {
  baseUrl: string
  primaryEndpoint: string
  fallbackEndpoint: string
  apiKey: string
  defaultConfidence: number
  defaultIou: number
  customEndpoints: VisionModelEndpointPreset[]
  updatedAt?: string
  updatedBy?: string
}

export const SETTINGS_KEY_VISION_TIRE_MODEL = 'vision_tire_model_settings'

export const DEFAULT_VISION_MODEL_SETTINGS: VisionModelSettings = {
  baseUrl: process.env.RARAY_VISION_BASE_URL?.replace(/\/+$/, '') || 'https://vision.chitraparatama.com',
  primaryEndpoint: 'tire-demage-onnx',
  fallbackEndpoint: 'tire-demage',
  apiKey: process.env.RARAY_VISION_API_KEY || '',
  defaultConfidence: 0.25,
  defaultIou: 0.45,
  customEndpoints: [
    {
      id: 'onnx-default',
      name: 'ONNX Optimized (Fast / Real-time)',
      endpoint: 'tire-demage-onnx',
      description: 'Model teroptimasi ONNX runtime berkecepatan tinggi untuk latensi rendah.',
      isDefault: true,
    },
    {
      id: 'pytorch-standard',
      name: 'PyTorch Standard (Comprehensive)',
      endpoint: 'tire-demage',
      description: 'Model inferensi PyTorch komprehensif sebagai fallback akurasi tinggi.',
      isDefault: false,
    },
    {
      id: 'yolo26-custom',
      name: 'YOLO26 Custom (Deep Learning)',
      endpoint: 'tire-demage-yolo26',
      description: 'Model custom eksperimental dengan arsitektur YOLO26.',
      isDefault: false,
    },
  ],
}

/**
 * Mendapatkan konfigurasi model vision aktif dari database settings (dengan fallback ke default).
 */
export async function getVisionModelSettings(): Promise<VisionModelSettings> {
  try {
    const [row] = await db
      .select({ value: settings.value, updatedAt: settings.updatedAt })
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY_VISION_TIRE_MODEL))
      .limit(1)

    if (!row?.value) {
      return DEFAULT_VISION_MODEL_SETTINGS
    }

    const parsed = JSON.parse(row.value) as Partial<VisionModelSettings>

    return {
      baseUrl: (parsed.baseUrl || DEFAULT_VISION_MODEL_SETTINGS.baseUrl).replace(/\/+$/, ''),
      primaryEndpoint: parsed.primaryEndpoint || DEFAULT_VISION_MODEL_SETTINGS.primaryEndpoint,
      fallbackEndpoint: parsed.fallbackEndpoint || DEFAULT_VISION_MODEL_SETTINGS.fallbackEndpoint,
      apiKey: parsed.apiKey ?? DEFAULT_VISION_MODEL_SETTINGS.apiKey,
      defaultConfidence: typeof parsed.defaultConfidence === 'number' ? parsed.defaultConfidence : 0.25,
      defaultIou: typeof parsed.defaultIou === 'number' ? parsed.defaultIou : 0.45,
      customEndpoints:
        Array.isArray(parsed.customEndpoints) && parsed.customEndpoints.length > 0
          ? parsed.customEndpoints
          : DEFAULT_VISION_MODEL_SETTINGS.customEndpoints,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : undefined,
      updatedBy: parsed.updatedBy,
    }
  } catch (error) {
    console.error('[getVisionModelSettings] Error reading settings from DB:', error)
    return DEFAULT_VISION_MODEL_SETTINGS
  }
}

/**
 * Menyimpan konfigurasi model vision ke database.
 */
export async function saveVisionModelSettings(
  newSettings: Partial<VisionModelSettings>,
  updatedByEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getVisionModelSettings()
    const primary = (newSettings.primaryEndpoint || current.primaryEndpoint).trim()
    const rawEndpoints =
      Array.isArray(newSettings.customEndpoints) && newSettings.customEndpoints.length > 0
        ? newSettings.customEndpoints
        : current.customEndpoints
    const customEndpoints = rawEndpoints.map((ep) => ({
      ...ep,
      isDefault: ep.endpoint === primary,
    }))

    const payload: VisionModelSettings = {
      ...current,
      ...newSettings,
      baseUrl: (newSettings.baseUrl || current.baseUrl).replace(/\/+$/, ''),
      primaryEndpoint: primary,
      fallbackEndpoint: (newSettings.fallbackEndpoint || current.fallbackEndpoint).trim(),
      apiKey: newSettings.apiKey !== undefined ? newSettings.apiKey.trim() : current.apiKey,
      defaultConfidence:
        typeof newSettings.defaultConfidence === 'number'
          ? Math.max(0.01, Math.min(1, newSettings.defaultConfidence))
          : current.defaultConfidence,
      defaultIou:
        typeof newSettings.defaultIou === 'number'
          ? Math.max(0.01, Math.min(1, newSettings.defaultIou))
          : current.defaultIou,
      customEndpoints,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedByEmail || current.updatedBy || 'admin',
    }

    const jsonValue = JSON.stringify(payload)

    await db
      .insert(settings)
      .values({
        key: SETTINGS_KEY_VISION_TIRE_MODEL,
        value: jsonValue,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: jsonValue,
          updatedAt: new Date(),
        },
      })

    return { success: true }
  } catch (error) {
    console.error('[saveVisionModelSettings] Error saving settings to DB:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menyimpan pengaturan model ke database.',
    }
  }
}

/**
 * Melakukan ping tes konektivitas ke Vision Base URL & Endpoint.
 */
export async function testVisionEndpoint(params: {
  baseUrl: string
  endpoint: string
  apiKey?: string
}): Promise<{
  success: boolean
  statusCode?: number
  latencyMs?: number
  message: string
}> {
  const startedAt = Date.now()
  const cleanBase = params.baseUrl.replace(/\/+$/, '')
  const cleanEndpoint = params.endpoint.trim()

  const targetUrl = `${cleanBase}/api/v1/models/endpoints/${cleanEndpoint}/predict`

  try {
    const headers: Record<string, string> = {}
    if (params.apiKey) {
      headers['X-API-Key'] = params.apiKey
      headers['Authorization'] = params.apiKey.startsWith('Bearer ')
        ? params.apiKey
        : `Bearer ${params.apiKey}`
    }

    // Melakukan GET atau OPTIONS/HEAD atau request kosong untuk melihat apakah server merespons
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    const latencyMs = Date.now() - startedAt

    // 400 atau 422 (Unprocessable Entity / No file sent) membuktikan endpoint aktif dan siap menerima data!
    if (response.ok || response.status === 400 || response.status === 422) {
      return {
        success: true,
        statusCode: response.status,
        latencyMs,
        message: `Endpoint aktif dan merespons (${latencyMs}ms). Status HTTP ${response.status}`,
      }
    }

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        statusCode: response.status,
        latencyMs,
        message: `Endpoint ditemukan namun otorisasi ditolak (HTTP ${response.status}). Periksa API Key jika diperlukan.`,
      }
    }

    if (response.status === 404) {
      return {
        success: false,
        statusCode: response.status,
        latencyMs,
        message: `Endpoint "${cleanEndpoint}" tidak ditemukan (404 Not Found) di ${cleanBase}. Pastikan nama slug endpoint sudah didaftarkan.`,
      }
    }

    return {
      success: false,
      statusCode: response.status,
      latencyMs,
      message: `Server merespons dengan status HTTP ${response.status}.`,
    }
  } catch (error) {
    const latencyMs = Date.now() - startedAt
    const isTimeout = error instanceof Error && error.name === 'TimeoutError'
    return {
      success: false,
      latencyMs,
      message: isTimeout
        ? `Koneksi timeout setelah 8 detik ke ${targetUrl}. Periksa domain atau jaringan.`
        : error instanceof Error
        ? error.message
        : 'Gagal menghubungi server.',
    }
  }
}

export interface RemoteVisionEndpoint {
  id: number
  name: string
  slug: string
  description?: string
  model_id?: number
  model_name?: string
  model_version?: string
  model_framework?: string
  is_active: boolean
  default_conf?: number
  default_iou?: number
  predict_url?: string
}

/**
 * Mengambil daftar endpoint kustom secara live dari server Raray Vision (/api/v1/models/endpoints).
 */
export async function fetchRemoteVisionEndpoints(params?: {
  baseUrl?: string
  apiKey?: string
}): Promise<{
  success: boolean
  endpoints: RemoteVisionEndpoint[]
  message: string
}> {
  const currentSettings = await getVisionModelSettings().catch(() => DEFAULT_VISION_MODEL_SETTINGS)
  const baseUrl = (params?.baseUrl || currentSettings.baseUrl).replace(/\/+$/, '')
  const apiKey = params?.apiKey ?? currentSettings.apiKey

  const targetUrl = `${baseUrl}/api/v1/models/endpoints`

  try {
    const headers: Record<string, string> = {}
    if (apiKey) {
      headers['X-API-Key'] = apiKey
      headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return {
        success: false,
        endpoints: [],
        message: `Server Vision merespons dengan HTTP ${response.status}`,
      }
    }

    const data = await response.json()
    const rawList: RemoteVisionEndpoint[] = Array.isArray(data.endpoints) ? data.endpoints : []

    return {
      success: true,
      endpoints: rawList,
      message: `Berhasil memuat ${rawList.length} endpoint dari Raray Vision.`,
    }
  } catch (error) {
    return {
      success: false,
      endpoints: [],
      message: error instanceof Error ? error.message : 'Gagal menghubungi API Raray Vision.',
    }
  }
}

