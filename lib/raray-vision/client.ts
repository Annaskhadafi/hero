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
  status: 'success' | 'not_registered' | 'spoofing_detected' | 'error'
  verified: boolean
  employee_id?: string
  confidence?: number
  threshold?: number
  liveness_score?: number
  is_live?: boolean
  message?: string
}

export interface RarayAntiSpoofResult {
  status: 'success' | 'spoof_detected' | 'error'
  is_real: boolean
  confidence: number
  verdict?: string
  latency_ms?: number
  message?: string
}

export interface RarayPdfInspectorResult {
  status: 'success' | 'error'
  markdown: string
  pageCount?: number
  latency_ms?: number
  rawResponse?: any
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
  const email = process.env.RARAY_VISION_EMAIL || 'mochamad.khadafi@chitraparatama.co.id'
  const password = process.env.RARAY_VISION_PASSWORD || 'Wusthochq2018-'
  return { email, password }
}

function getApiKey(): string | null {
  return process.env.RARAY_VISION_API_KEY || null
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
 * Delete all face records for an employee across all alias IDs on Raray Vision.
 */
export async function rarayDeleteFace(params: {
  employeeId: number
  employeeSn?: string
  faceRarayId?: string
}): Promise<void> {
  const { employeeId, employeeSn, faceRarayId } = params
  const baseUrl = getBaseUrl()
  const authHeader = await getAuthHeader()

  const allAliases = Array.from(
    new Set(
      [
        employeeSn?.trim(),
        faceRarayId?.trim(),
        faceRarayId ? faceRarayId.replace(/^emp-/, '').trim() : '',
        `emp-${employeeId}`,
        String(employeeId),
      ].filter(Boolean) as string[]
    )
  )

  // 1. Try HERO unregister endpoint
  try {
    await fetch(`${baseUrl}/api/v1/hero/unregister/${employeeId}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
      cache: 'no-store',
    })
  } catch {
    // Ignore
  }

  // 2. Delete each alias from /api/v1/faces/{user_id}
  for (const alias of allAliases) {
    try {
      await fetch(`${baseUrl}/api/v1/faces/${encodeURIComponent(alias)}`, {
        method: 'DELETE',
        headers: { Authorization: authHeader },
        cache: 'no-store',
      })
    } catch {
      // Ignore
    }
  }
}

/**
 * Register or update an employee face in Raray Vision.
 * Tries custom `/api/v1/hero/register` first, falls back to native `/api/v1/faces/live` or `/api/v1/faces`
 */
export async function rarayRegisterFace(params: {
  employeeId: number
  employeeSn?: string
  employeeName: string
  imageBuffer: Buffer
  mimeType?: string
  force?: boolean
}): Promise<RarayRegisterResult> {
  const { employeeId, employeeSn, employeeName, imageBuffer, mimeType = 'image/jpeg', force = false } = params
  const baseUrl = getBaseUrl()
  const authHeader = await getAuthHeader()
  const faceId = employeeSn?.trim() || `emp-${employeeId}`

  // If force overwrite, purge old aliases in Raray Vision first to prevent multiple face vectors
  if (force) {
    await rarayDeleteFace({ employeeId, employeeSn })
  }

  // 1. Try custom HERO controller endpoint
  try {
    const formData = new FormData()
    formData.append('employee_id', String(employeeId))
    if (employeeSn) formData.append('employee_sn', employeeSn)
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
    if (employeeSn) formData.append('employee_sn', employeeSn)
    formData.append('file', new Blob([imageBuffer], { type: mimeType }), `face-${employeeId}.jpg`)

    const endpoint = force ? `${baseUrl}/api/v1/faces/${faceId}` : `${baseUrl}/api/v1/faces/live`
    const method = force ? 'PUT' : 'POST'

    let res = await fetch(endpoint, {
      method,
      headers: { Authorization: authHeader },
      body: formData,
      cache: 'no-store',
    })

    // If initial POST failed because already registered, auto retry with PUT (force)
    if (!res.ok && res.status === 409 && !force) {
      const putEndpoint = `${baseUrl}/api/v1/faces/${faceId}`
      res = await fetch(putEndpoint, {
        method: 'PUT',
        headers: { Authorization: authHeader },
        body: formData,
        cache: 'no-store',
      })
    }

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
    const info = data.data || {}
    const isMatch = Boolean(data.match ?? info.match ?? data.is_match ?? info.is_match ?? false)
    const similarity = typeof data.similarity === 'number' ? data.similarity : (typeof info.similarity === 'number' ? info.similarity : (typeof data.confidence === 'number' ? data.confidence : (typeof info.confidence === 'number' ? info.confidence : 0)))
    const normalizedSim = similarity > 1 ? similarity / 100 : similarity

    const faceId = info.id || data.face_id || data.user_id
    let employeeId: string | undefined = info.employee_id || info.user_id || faceId
    if (faceId && String(faceId).startsWith('emp-')) {
      employeeId = String(faceId).slice(4)
    }

    const recognized = Boolean((isMatch && normalizedSim >= 0.45) || normalizedSim >= 0.48) && !!employeeId && employeeId !== 'Unknown'

    return {
      status: 'success',
      recognized,
      face_id: faceId,
      employee_id: employeeId,
      employee_name: info.name || data.name,
      confidence: normalizedSim,
      threshold: 0.45,
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
  employeeSn?: string
  faceRarayId?: string
  imageBuffer: Buffer
  mimeType?: string
}): Promise<RarayVerifyResult> {
  const { employeeId, employeeSn, faceRarayId, imageBuffer, mimeType = 'image/jpeg' } = params
  const baseUrl = getBaseUrl()
  const authHeader = await getAuthHeader()
  const candidateIds = Array.from(
    new Set(
      [
        employeeSn?.trim(),
        faceRarayId?.trim(),
        faceRarayId ? faceRarayId.replace(/^emp-/, '').trim() : '',
        `emp-${employeeId}`,
        String(employeeId),
      ].filter(Boolean) as string[]
    )
  )

  // 1. Try HERO endpoint first
  try {
    const formData = new FormData()
    formData.append('employee_id', String(employeeId))
    if (employeeSn) formData.append('employee_sn', employeeSn)
    formData.append('file', new Blob([imageBuffer], { type: mimeType }), `verify-${employeeId}.jpg`)

    const res = await fetch(`${baseUrl}/api/v1/hero/verify`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: formData,
      cache: 'no-store',
    })

    if (res.ok) {
      const data = await res.json()
      if (data.status === 'success' && data.verified !== undefined) {
        const livenessScore = data.liveness_score ?? data.data?.liveness_score ?? data.liveness ?? data.data?.liveness ?? null
        const isLive = data.is_live ?? data.data?.is_live ?? (livenessScore !== null ? livenessScore >= 0.40 : true)
        const isSpoof = data.is_spoof ?? data.data?.is_spoof ?? false

        if (isSpoof || isLive === false || (livenessScore !== null && livenessScore < 0.40)) {
          return {
            status: 'spoofing_detected',
            verified: false,
            employee_id: String(employeeId),
            confidence: data.confidence ?? data.similarity ?? 0,
            liveness_score: livenessScore ?? 0,
            is_live: false,
            message: 'Terdeteksi foto/layar HP. Harap gunakan wajah asli (Anti-Spoofing Gagal).',
          }
        }

        return data as RarayVerifyResult
      }
    }
  } catch {
    // Fall through
  }

  // 2. Native endpoint fallback: try candidate user_ids directly on POST /api/v1/faces/compare
  let lastErrorMessage = ''
  for (const faceId of candidateIds) {
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

      if (res.status === 404) {
        continue
      }

      if (!res.ok) {
        const errText = await res.text()
        lastErrorMessage = `Raray Vision error (${res.status}): ${errText}`
        continue
      }

      const data = await res.json()

      // If user not found on this ID alias, continue trying next candidate ID
      if (
        data.status === 'error' &&
        (String(data.message).toLowerCase().includes('not found') ||
          String(data.message).toLowerCase().includes('tidak ditemukan'))
      ) {
        continue
      }

      if (data.status === 'error') {
        lastErrorMessage = data.message || 'Error from Vision API'
        continue
      }

      const info = data.data || {}
      const rawSim = typeof data.similarity === 'number' ? data.similarity : (typeof info.similarity === 'number' ? info.similarity : (typeof data.confidence === 'number' ? data.confidence : (typeof info.confidence === 'number' ? info.confidence : 0)))
      const similarity = rawSim > 1 ? rawSim / 100 : rawSim
      const livenessScore = data.liveness_score ?? info.liveness_score ?? data.liveness ?? info.liveness ?? null
      const isLive = data.is_live ?? info.is_live ?? (livenessScore !== null ? livenessScore >= 0.40 : true)
      const isSpoof = data.is_spoof ?? info.is_spoof ?? false

      if (isSpoof || isLive === false || (livenessScore !== null && livenessScore < 0.40)) {
        return {
          status: 'spoofing_detected',
          verified: false,
          employee_id: String(employeeId),
          confidence: similarity,
          liveness_score: livenessScore ?? 0,
          is_live: false,
          message: 'Terdeteksi foto/layar HP. Harap gunakan wajah asli (Anti-Spoofing Gagal).',
        }
      }

      const isMatch = Boolean(data.match ?? info.match ?? data.is_match ?? info.is_match ?? false)
      // Balanced verification rule for ArcFace:
      const verified = (isMatch && similarity >= 0.45) || similarity >= 0.48

      return {
        status: 'success',
        verified,
        employee_id: String(employeeId),
        confidence: similarity,
        threshold: 0.45,
        liveness_score: livenessScore ?? 1.0,
        is_live: true,
      }
    } catch (err) {
      lastErrorMessage = err instanceof Error ? err.message : 'Error'
    }
  }

  // If candidate IDs return 404 or error
  return {
    status: 'not_registered',
    verified: false,
    message: lastErrorMessage || 'Wajah belum terdaftar di Raray Vision. Silakan lakukan registrasi wajah.',
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

/**
 * Verify if a face photo is authentic (Real) or a spoof attempt (Photo screen, printout, paper mask)
 * using UniFace-v2 Anti-Spoofing API.
 * 
 * Endpoint: POST https://vision.chitraparatama.com/api/v1/anti-spoof/uniface-v2
 */
export async function rarayCheckAntiSpoofUniFaceV2(params: {
  imageBuffer: Buffer
  mimeType?: string
}): Promise<RarayAntiSpoofResult> {
  const { imageBuffer, mimeType = 'image/jpeg' } = params
  const baseUrl = getBaseUrl()
  const authHeader = await getAuthHeader()

  try {
    const formData = new FormData()
    formData.append('file', new Blob([imageBuffer], { type: mimeType }), 'face.jpg')

    const res = await fetch(`${baseUrl}/api/v1/anti-spoof/uniface-v2`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: formData,
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`[AntiSpoof] UniFace-v2 API returned error (${res.status}): ${errText}`)
      return {
        status: 'error',
        is_real: false,
        confidence: 0,
        message: `Anti-spoof API error (${res.status}): ${errText}`,
      }
    }

    const data = await res.json()
    const rawConf = typeof data.confidence === 'number' ? data.confidence : 0
    const confidence = rawConf > 1 ? rawConf : rawConf * 100
    // UniFace-v2 verdict threshold: trust model's is_real flag with rational >= 60% confidence floor
    const isReal = Boolean(data.is_real) && confidence >= 60

    if (data.status === 'success' || data.is_real !== undefined) {
      if (isReal) {
        console.log(`[AntiSpoof] ✅ Terverifikasi Wajah Asli: ${confidence.toFixed(1)}% (Latency: ${data.latency_ms ?? 0}ms)`)
        return {
          status: 'success',
          is_real: true,
          confidence,
          verdict: data.verdict || 'real',
          latency_ms: data.latency_ms,
        }
      } else {
        const verdictDetail = data.verdict ? ` (${data.verdict})` : ''
        console.warn(`[AntiSpoof] 🚨 Spoofing / Foto Layar Terdeteksi: ${data.verdict || 'spoof'} | Confidence: ${confidence.toFixed(1)}%`)
        return {
          status: 'spoof_detected',
          is_real: false,
          confidence,
          verdict: data.verdict || 'spoof',
          latency_ms: data.latency_ms,
          message: `🚨 Spoofing / Foto Layar Terdeteksi${verdictDetail}. Harap gunakan wajah asli secara langsung.`,
        }
      }
    }

    return {
      status: 'error',
      is_real: false,
      confidence,
      message: data.message || 'Gagal memvalidasi anti-spoofing.',
    }
  } catch (err: any) {
    console.error('[AntiSpoof] Error checking anti-spoof:', err)
    return {
      status: 'error',
      is_real: false,
      confidence: 0,
      message: err instanceof Error ? err.message : 'Gagal menghubungi server anti-spoof',
    }
  }
}

/**
 * Helper to extract Markdown or text from various response structures returned by PDF Inspector Microservice.
 */
function extractMarkdownFromPdfInspectorResponse(data: any): string {
  if (!data) return ''
  if (typeof data === 'string') return data

  // 1. Direct top-level fields
  for (const key of ['markdown', 'md', 'text', 'extracted_text', 'content', 'ocr_text', 'result_text']) {
    if (typeof data[key] === 'string' && data[key].trim()) {
      return data[key]
    }
  }

  // 2. Nested in data or result object
  const nested = data.data || data.result
  if (nested && typeof nested === 'object') {
    for (const key of ['markdown', 'md', 'text', 'extracted_text', 'content', 'ocr_text', 'result_text']) {
      if (typeof nested[key] === 'string' && nested[key].trim()) {
        return nested[key]
      }
    }
    if (Array.isArray(nested.pages)) {
      const pageTexts = nested.pages
        .map((p: any) => (typeof p === 'string' ? p : p.markdown || p.text || p.content || ''))
        .filter(Boolean)
      if (pageTexts.length > 0) return pageTexts.join('\n\n')
    }
  }

  // 3. Top-level pages array
  if (Array.isArray(data.pages)) {
    const pageTexts = data.pages
      .map((p: any) => (typeof p === 'string' ? p : p.markdown || p.text || p.content || ''))
      .filter(Boolean)
    if (pageTexts.length > 0) return pageTexts.join('\n\n')
  }

  return ''
}

/**
 * Process document (PDF or Image) using PDF Inspector Microservice to extract clean Markdown text.
 * Endpoint: POST https://vision.chitraparatama.com/api/v1/pdf-inspector/process
 */
export async function rarayPdfInspectorProcess(params: {
  fileBuffer: Buffer
  fileName?: string
  mimeType?: string
  autoOcr?: boolean
}): Promise<RarayPdfInspectorResult> {
  const {
    fileBuffer,
    fileName = 'document.pdf',
    mimeType = 'application/pdf',
    autoOcr = true,
  } = params

  const baseUrl = getBaseUrl()
  const authHeader = await getAuthHeader()

  try {
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), fileName)
    formData.append('auto_ocr', autoOcr ? 'true' : 'false')

    console.log(`[PDF-Inspector] Sending ${fileName} (${fileBuffer.length} bytes, ${mimeType}) to ${baseUrl}/api/v1/pdf-inspector/process...`)

    const res = await fetch(`${baseUrl}/api/v1/pdf-inspector/process`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: formData,
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.warn(`[PDF-Inspector] Microservice returned ${res.status}: ${errText}`)
      return {
        status: 'error',
        markdown: '',
        message: `PDF Inspector Microservice error (${res.status}): ${errText.slice(0, 200)}`,
      }
    }

    const data = await res.json()
    const extractedMarkdown = extractMarkdownFromPdfInspectorResponse(data)

    if (!extractedMarkdown || !extractedMarkdown.trim()) {
      return {
        status: 'error',
        markdown: '',
        rawResponse: data,
        message: 'PDF Inspector Microservice tidak menghasilkan teks markdown.',
      }
    }

    const pageCount = Array.isArray(data.pages)
      ? data.pages.length
      : Array.isArray(data.data?.pages)
      ? data.data.pages.length
      : typeof data.page_count === 'number'
      ? data.page_count
      : typeof data.total_pages === 'number'
      ? data.total_pages
      : extractedMarkdown.split(/\n\s*---\s*\n|\n\s*#+\s*Page|\n\n/).length

    console.log(`[PDF-Inspector] ✅ Extracted ${extractedMarkdown.length} chars (${pageCount} pages, Latency: ${data.latency_ms ?? 0}ms)`)

    return {
      status: 'success',
      markdown: extractedMarkdown.trim(),
      pageCount,
      latency_ms: data.latency_ms,
      rawResponse: data,
    }
  } catch (err: any) {
    console.error('[PDF-Inspector] Request failed:', err)
    return {
      status: 'error',
      markdown: '',
      message: err instanceof Error ? err.message : 'Gagal menghubungi PDF Inspector Microservice',
    }
  }
}


