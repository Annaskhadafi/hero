/**
 * Raray Vision API Client
 * Singleton HTTP client for interfacing with vision.chitraparatama.com
 * Supports both custom HERO endpoints and native Raray Vision API endpoints with automatic fallback.
 */

interface RarayTokenCache {
  token: string
  expiresAt: number // unix ms
}

interface RarayRegisterResult {
  status: 'success' | 'already_registered' | 'error'
  face_id?: string
  employee_id?: string
  employee_name?: string
  liveness_score?: number
  was_update?: boolean
  message?: string
}

interface RarayRecognizeResult {
  status: 'success' | 'no_faces_registered' | 'error'
  recognized: boolean
  face_id?: string
  employee_id?: string
  employee_name?: string
  confidence?: number
  message?: string
}

interface RarayVerifyResult {
  status: 'success' | 'not_registered' | 'error'
  verified: boolean
  employee_id?: string
  confidence?: number
  threshold?: number
  message?: string
}

interface RarayStatusResult {
  status: 'success' | 'error'
  registered: boolean
  employee_id?: string
  face_id?: string
  registered_at?: string
}

let _tokenCache: RarayTokenCache | null = null

function getBaseUrl(): string {
  const url = process.env.RARAY_VISION_BASE_URL?.replace(/\/+$/, '')
  return url || 'https://vision.chitraparatama.com'
}

function getCredentials() {
  const email = process.env.RARAY_VISION_EMAIL
  const password = process.env.RARAY_VISION_PASSWORD
  if (!email || !password) {
    throw new Error('RARAY_VISION_EMAIL and RARAY_VISION_PASSWORD must be configured')
  }
  return { email, password }
}

function getApiKey(): string | null {
  return process.env.RARAY_VISION_API_KEY || 'rv_373fadd7eee1dd23acdf62050bd2fa5a'
}

/**
 * Get valid Authorization header value (API Key or JWT Bearer)
 */
async function getAuthHeader(): Promise<string> {
  const apiKey = getApiKey()
  if (apiKey) {
    return apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
  }

  const now = Date.now()
  if (_tokenCache && _tokenCache.expiresAt > now + 2 * 60 * 1000) {
    return `Bearer ${_tokenCache.token}`
  }

  const { email, password } = getCredentials()
  const baseUrl = getBaseUrl()

  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Raray Vision login failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  if (!data.token) {
    throw new Error('Raray Vision login did not return a token')
  }

  _tokenCache = {
    token: data.token,
    expiresAt: now + 6 * 24 * 60 * 60 * 1000,
  }

  return `Bearer ${data.token}`
}

/**
 * Register or update an employee face in Raray Vision.
 * Tries custom `/api/v1/hero/register` first, falls back to native `/api/v1/faces/live` or `/api/v1/faces`
 */
export async function rarayRegisterFace(params: {
  employeeId: number
  employeeName: string
  imageBuffer: Buffer
  mimeType?: string
  force?: boolean
}): Promise<RarayRegisterResult> {
  const { employeeId, employeeName, imageBuffer, mimeType = 'image/jpeg', force = false } = params
  const baseUrl = getBaseUrl()
  const authHeader = await getAuthHeader()
  const faceId = `emp-${employeeId}`

  // 1. Try custom HERO controller endpoint
  try {
    const formData = new FormData()
    formData.append('employee_id', String(employeeId))
    formData.append('employee_name', employeeName)
    formData.append('force', force ? 'true' : 'false')
    formData.append('file', new Blob([imageBuffer], { type: mimeType }), `face-${employeeId}.jpg`)

    const res = await fetch(`${baseUrl}/api/v1/hero/register`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: formData,
      cache: 'no-store',
    })

    if (res.ok) {
      return (await res.json()) as RarayRegisterResult
    }
  } catch {
    // Fall through to native endpoint
  }

  // 2. Native endpoint fallback: POST /api/v1/faces/live or /api/v1/faces
  try {
    const formData = new FormData()
    formData.append('user_id', faceId)
    formData.append('user_name', employeeName)
    formData.append('file', new Blob([imageBuffer], { type: mimeType }), `face-${employeeId}.jpg`)

    const endpoint = force ? `${baseUrl}/api/v1/faces/${faceId}` : `${baseUrl}/api/v1/faces/live`
    const method = force ? 'PUT' : 'POST'

    const res = await fetch(endpoint, {
      method,
      headers: { Authorization: authHeader },
      body: formData,
      cache: 'no-store',
    })

    if (res.ok) {
      const data = await res.json()
      return {
        status: 'success',
        face_id: faceId,
        employee_id: String(employeeId),
        employee_name: employeeName,
        was_update: force,
        message: data.message || 'Wajah berhasil didaftarkan.',
      }
    }

    const errText = await res.text()
    return { status: 'error', message: `Raray Vision error (${res.status}): ${errText}` }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Gagal terhubung ke Raray Vision' }
  }
}

/**
 * Recognize a face in an image — 1:N identify mode.
 */
export async function rarayRecognizeFace(params: {
  imageBuffer: Buffer
  mimeType?: string
}): Promise<RarayRecognizeResult> {
  const { imageBuffer, mimeType = 'image/jpeg' } = params
  const baseUrl = getBaseUrl()
  const authHeader = await getAuthHeader()

  const formData = new FormData()
  formData.append('file', new Blob([imageBuffer], { type: mimeType }), 'frame.jpg')

  // 1. Try HERO endpoint
  try {
    const res = await fetch(`${baseUrl}/api/v1/hero/recognize`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: formData,
      cache: 'no-store',
    })
    if (res.ok) {
      return (await res.json()) as RarayRecognizeResult
    }
  } catch {
    // Fall through
  }

  // 2. Native endpoint fallback: POST /api/v1/faces/recognize/live
  try {
    const res = await fetch(`${baseUrl}/api/v1/faces/recognize/live`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: formData,
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text()
      return { status: 'error', recognized: false, message: `Raray Vision error: ${res.status} ${errText}` }
    }

    const data = await res.json()
    const match = data.match ?? false
    const info = data.data || {}

    const faceId = info.id
    let employeeId: string | undefined = undefined
    if (faceId && String(faceId).startsWith('emp-')) {
      employeeId = String(faceId).slice(4)
    }

    return {
      status: 'success',
      recognized: match && !!employeeId,
      face_id: faceId,
      employee_id: employeeId,
      employee_name: info.name,
      confidence: info.similarity ?? 0,
    }
  } catch (err) {
    return { status: 'error', recognized: false, message: err instanceof Error ? err.message : 'Error' }
  }
}

/**
 * Verify a specific employee face (1:1 comparison).
 * Tries HERO verify endpoint first, falls back to native `/api/v1/faces/compare`
 */
export async function rarayVerifyFace(params: {
  employeeId: number
  imageBuffer: Buffer
  mimeType?: string
}): Promise<RarayVerifyResult> {
  const { employeeId, imageBuffer, mimeType = 'image/jpeg' } = params
  const baseUrl = getBaseUrl()
  const authHeader = await getAuthHeader()
  const faceId = `emp-${employeeId}`

  // 1. Try HERO endpoint first
  try {
    const formData = new FormData()
    formData.append('employee_id', String(employeeId))
    formData.append('file', new Blob([imageBuffer], { type: mimeType }), `verify-${employeeId}.jpg`)

    const res = await fetch(`${baseUrl}/api/v1/hero/verify`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: formData,
      cache: 'no-store',
    })

    if (res.ok) {
      return (await res.json()) as RarayVerifyResult
    }
  } catch {
    // Fall through
  }

  // 2. Native endpoint fallback: POST /api/v1/faces/compare
  try {
    const formData = new FormData()
    formData.append('user_id', faceId)
    formData.append('file', new Blob([imageBuffer], { type: mimeType }), `verify-${employeeId}.jpg`)

    const res = await fetch(`${baseUrl}/api/v1/faces/compare`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: formData,
      cache: 'no-store',
    })

    if (!res.ok) {
      if (res.status === 404) {
        return { status: 'not_registered', verified: false, message: 'Wajah belum terdaftar di Raray Vision' }
      }
      const errText = await res.text()
      return { status: 'error', verified: false, message: `Raray Vision error: ${res.status} ${errText}` }
    }

    const data = await res.json()
    const similarity = data.similarity ?? data.data?.similarity ?? 0
    const verified = (data.match ?? data.status === 'success') && similarity >= 0.45

    return {
      status: 'success',
      verified,
      employee_id: String(employeeId),
      confidence: similarity,
      threshold: 0.45,
    }
  } catch (err) {
    return { status: 'error', verified: false, message: err instanceof Error ? err.message : 'Error' }
  }
}

/**
 * Check if an employee has a registered face in Raray Vision.
 */
export async function rarayCheckFaceStatus(params: {
  employeeId: number
}): Promise<RarayStatusResult> {
  const { employeeId } = params
  const baseUrl = getBaseUrl()
  const authHeader = await getAuthHeader()
  const faceId = `emp-${employeeId}`

  try {
    const res = await fetch(`${baseUrl}/api/v1/faces/${faceId}`, {
      method: 'GET',
      headers: { Authorization: authHeader },
      cache: 'no-store',
    })

    if (res.ok) {
      const data = await res.json()
      return {
        status: 'success',
        registered: true,
        employee_id: String(employeeId),
        face_id: faceId,
        registered_at: data.created_at,
      }
    }
  } catch {
    // Ignore
  }

  return { status: 'success', registered: false, employee_id: String(employeeId) }
}

/**
 * Delete an employee face from Raray Vision.
 */
export async function rarayDeleteFace(params: {
  employeeId: number
}): Promise<{ status: 'success' | 'error'; message?: string }> {
  const { employeeId } = params
  const baseUrl = getBaseUrl()
  const authHeader = await getAuthHeader()
  const faceId = `emp-${employeeId}`

  try {
    const res = await fetch(`${baseUrl}/api/v1/faces/${faceId}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
      cache: 'no-store',
    })

    if (res.ok) {
      return { status: 'success', message: `Wajah untuk employee ${employeeId} berhasil dihapus.` }
    }
    return { status: 'error', message: `Delete failed: ${res.status}` }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Delete error' }
  }
}

/**
 * Health check: verify Raray Vision is reachable.
 */
export async function rarayHealthCheck(): Promise<boolean> {
  try {
    const baseUrl = getBaseUrl()
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}
