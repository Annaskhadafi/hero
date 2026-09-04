/**
 * Hero Genius / RAG Knowledge Base & pgvector Client
 * Connects to vision.chitraparatama.com/api/v1/rag
 */

const DEFAULT_BASE_URL = 'https://vision.chitraparatama.com/api/v1'

export function getRagBaseUrl(): string {
  const envUrl = process.env.RARAY_VISION_BASE_URL?.replace(/\/+$/, '')
  if (!envUrl) return DEFAULT_BASE_URL
  return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl}/api/v1`
}

export function getRagApiKey(): string {
  return process.env.RARAY_VISION_API_KEY || ''
}

export function resolveRagDocumentUrl(rawUrl?: string | null): string {
  if (!rawUrl) return ''
  const trimmed = rawUrl.trim()
  if (!trimmed) return ''

  // If already pointing to vision's api/v1/uploads endpoint, return as is
  if (trimmed.includes('vision.chitraparatama.com/api/v1/uploads/')) {
    return trimmed
  }
  if (trimmed.includes('vision.chitraparatama.com/uploads/')) {
    return trimmed.replace('/uploads/', '/api/v1/uploads/')
  }

  // Extract clean filename without query parameters
  const cleanFilename = decodeURIComponent(trimmed.split('?')[0].split('/').pop() || '')
  if (!cleanFilename) return trimmed

  return `https://vision.chitraparatama.com/api/v1/uploads/${encodeURIComponent(cleanFilename)}`
}



function getAuthHeaders(): HeadersInit {
  const apiKey = getRagApiKey()
  return {
    'X-API-Key': apiKey,
    Authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
  }
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = 3,
  delayMs = 1000
): Promise<Response> {
  let attempt = 0
  while (true) {
    try {
      return await fetch(url, init)
    } catch (err: any) {
      attempt++
      if (attempt > retries) throw err
      await new Promise((r) => setTimeout(r, delayMs * attempt))
    }
  }
}

export interface RagInfoResponse {
  status: string
  data: {
    default_provider: string
    model_name: string
    vector_dimension: number
    pricing: string
    active_llm: string
    groq_configured: boolean
    gemini_configured: boolean
    openrouter_configured: boolean
    vector_dimensions?: number
  }
}

export interface RagSourceItem {
  source_id: number
  filename: string
  heading?: string | null
  s3_url?: string | null
  similarity_score: number
  chunk_id?: string
  content?: string
}

export interface RagChatRequest {
  query: string
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  top_k?: number
  session_id?: string | null
  document_id?: string | null
}

export interface RagChatResponse {
  status: string
  data: {
    query: string
    answer: string
    sources: RagSourceItem[]
    session_id?: string | null
    retrieved_chunks_count: number
    latency_ms: number
    from_cache?: boolean
  }
}

export interface RagSearchResultItem {
  chunk_id: string
  document_id: string
  filename: string
  format: string
  s3_url?: string | null
  chunk_index: number
  heading?: string | null
  content: string
  similarity_score: number
  distance?: number
}

export interface RagSearchResponse {
  status: string
  query: string
  results_count: number
  results: RagSearchResultItem[]
}

export interface RagDocumentItem {
  id: string
  filename: string
  format: string
  s3_url?: string | null
  local_url?: string | null
  char_count: number
  word_count: number
  total_chunks: number
  engine_used: string
  embedding_model: string
  created_at: string
}

export interface RagDocumentsResponse {
  status: string
  total_documents: number
  total_chunks: number
  documents: RagDocumentItem[]
}

export interface RagChunkItem {
  id: string
  document_id: string
  chunk_index: number
  heading?: string | null
  content: string
  char_count: number
  token_count?: number
  created_at?: string
}

export interface RagDocumentChunksResponse {
  status: string
  document_id: string
  filename: string
  total_chunks: number
  chunks: RagChunkItem[]
}

export interface RagIngestResponse {
  status: string
  message?: string
  document_id?: string
  filename?: string
  total_chunks?: number
  format?: string
  s3_url?: string
  char_count?: number
  word_count?: number
  processing_time_ms?: number
  embedding_model?: string
  preview_markdown?: string
  data?: {
    document_id: string
    filename: string
    total_chunks: number
    format?: string
    s3_url?: string
    char_count?: number
    word_count?: number
  }
}

export interface RagRedisStatusResponse {
  status: string
  redis_connected: boolean
  latency_ms?: number
  cached_keys_count?: number
  message?: string
}

/**
 * 1. Get RAG & Embedding Engine Info
 */
export async function getRagEngineInfo(): Promise<RagInfoResponse> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/info`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch RAG info: ${res.status} ${await res.text()}`)
  }

  return res.json()
}

/**
 * 2. Send Multi-Turn RAG Chat Query
 */
export async function sendRagChat(payload: RagChatRequest): Promise<RagChatResponse> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/chat`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: payload.query,
      messages: payload.messages || [],
      top_k: payload.top_k || 4,
      session_id: payload.session_id || undefined,
      document_id: payload.document_id || undefined,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(120000),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`RAG Chat failed (${res.status}): ${errorText}`)
  }

  return res.json()
}

/**
 * 3. Semantic Vector Search
 */
export async function searchRagKnowledge(query: string, top_k = 4): Promise<RagSearchResponse> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/search`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, top_k }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    throw new Error(`Semantic search failed (${res.status}): ${await res.text()}`)
  }

  return res.json()
}

/**
 * 4. List All Documents in Knowledge Base (with full pagination support)
 */
export async function listRagDocuments(options?: {
  skip?: number
  limit?: number
  fetchAll?: boolean
}): Promise<RagDocumentsResponse> {
  const baseUrl = getRagBaseUrl()
  const headers = getAuthHeaders()

  // If specific skip/limit without fetchAll is requested, perform single call
  if (options?.fetchAll === false && (options?.skip !== undefined || options?.limit !== undefined)) {
    const skip = options.skip ?? 0
    const limit = options.limit ?? 50
    const res = await fetch(`${baseUrl}/rag/documents?skip=${skip}&limit=${limit}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })
    if (!res.ok) {
      throw new Error(`Failed to list documents (${res.status}): ${await res.text()}`)
    }
    return res.json()
  }

  // Otherwise, automatically paginate to fetch ALL documents (max 200 per page)
  let allDocuments: RagDocumentItem[] = []
  let skip = 0
  const limit = 200
  let totalDocs = 0
  let totalChunks = 0

  while (true) {
    const res = await fetchWithRetry(`${baseUrl}/rag/documents?skip=${skip}&limit=${limit}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    if (!res.ok) {
      if (allDocuments.length > 0) break
      throw new Error(`Failed to list documents (${res.status}): ${await res.text()}`)
    }

    const data: RagDocumentsResponse = await res.json()
    const pageDocs = data.documents || []
    totalDocs = data.total_documents || totalDocs
    totalChunks = data.total_chunks || totalChunks
    allDocuments.push(...pageDocs)

    if (pageDocs.length < limit || allDocuments.length >= totalDocs) {
      break
    }
    skip += limit
  }

  return {
    status: 'success',
    total_documents: totalDocs || allDocuments.length,
    total_chunks: totalChunks || allDocuments.reduce((acc, d) => acc + (d.total_chunks || 0), 0),
    documents: allDocuments,
  }
}

/**
 * 5. Get Chunks of a Specific Document
 */
export async function getRagDocumentChunks(documentId: string): Promise<RagDocumentChunksResponse> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/documents/${encodeURIComponent(documentId)}/chunks`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to get chunks for document ${documentId}: ${await res.text()}`)
  }

  return res.json()
}

/**
 * 6. Ingest Document to Knowledge Base & pgvector
 */
export async function ingestRagDocument(formData: FormData): Promise<RagIngestResponse> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/ingest`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Document ingestion failed (${res.status}): ${errorText}`)
  }

  return res.json()
}

/**
 * 7. Delete Document from Knowledge Base & pgvector
 */
export async function deleteRagDocument(documentId: string): Promise<{ status: string; message: string }> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Failed to delete document (${res.status}): ${await res.text()}`)
  }

  return res.json()
}

/**
 * 8. Get Chat Session History from Redis
 */
export async function getRagSessionHistory(sessionId: string) {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/chat/session/${encodeURIComponent(sessionId)}/history`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to get session history: ${await res.text()}`)
  }

  return res.json()
}

/**
 * 9. Clear Chat Session History from Redis
 */
export async function clearRagSessionHistory(sessionId: string) {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/chat/session/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Failed to clear session history: ${await res.text()}`)
  }

  return res.json()
}

/**
 * 10. Get Redis Status & Latency
 */
export async function getRagRedisStatus(): Promise<RagRedisStatusResponse> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/redis/status`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    return {
      status: 'error',
      redis_connected: false,
      message: `HTTP ${res.status}`,
    }
  }

  return res.json()
}

export interface RagSessionItem {
  id: string
  session_id?: string
  title?: string
  message_count?: number
  created_at?: string
  updated_at?: string
  user_id?: string | null
  summary?: string | null
  last_active_at?: string
}

export interface RagSessionsResponse {
  status: string
  total?: number
  data?: RagSessionItem[]
  sessions?: RagSessionItem[]
}

export interface RagSessionMessageItem {
  id: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: RagSourceItem[]
  rating?: number | null
  feedback_notes?: string | null
  correction_text?: string | null
  latency_ms?: number
  created_at?: string
}

export interface RagSessionMessagesResponse {
  status: string
  session_id: string
  data?: RagSessionMessageItem[]
  messages?: RagSessionMessageItem[]
}

export interface RagFeedbackPayload {
  message_id: string
  rating: number // 1 for thumbs up, -1 for thumbs down
  feedback_notes?: string | null
  correction_text?: string | null
  session_id?: string | null
  query?: string | null
  answer?: string | null
  user_id?: string | null
}

export interface RagFeedbackResponse {
  status: string
  message?: string
  data?: {
    message_id: string
    rating: number
    feedback_notes?: string | null
    correction_text?: string | null
    learned_fact?: any
  }
}

export interface RagLearnMemoryPayload {
  content: string
  subject?: string
  fact_type?: string
  // Aliases for compatibility
  fact?: string
  category?: string
  source?: string
  tags?: string[]
}

export interface RagLearnMemoryResponse {
  status: string
  message?: string
  data?: {
    id: string
    subject?: string
    content: string
    fact_type: string
    learned_from?: string
    created_at?: string
  }
}

export interface RagMemoryFactItem {
  id: string | number
  subject?: string
  content: string
  fact_type?: string
  learned_from?: string
  confidence_score?: number
  created_at?: string
  // Aliases
  fact?: string
  category?: string
  source?: string
  is_active?: boolean
}

export interface RagMemoryFactsResponse {
  status: string
  total: number
  data?: RagMemoryFactItem[]
  facts?: RagMemoryFactItem[]
}

/**
 * 11. GET /api/v1/rag/sessions: Mengambil daftar riwayat sesi percakapan pengguna
 */
export async function listRagSessions(userId?: string): Promise<RagSessionsResponse> {
  const baseUrl = getRagBaseUrl()
  const url = new URL(`${baseUrl}/rag/sessions`)
  if (userId) url.searchParams.set('user_id', userId)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to list sessions (${res.status}): ${await res.text()}`)
  }

  const json = await res.json()
  const rawList = json.data || json.sessions || []
  return {
    status: json.status || 'success',
    total: json.total ?? rawList.length,
    sessions: rawList.map((s: any) => ({
      id: s.id || s.session_id,
      session_id: s.id || s.session_id,
      title: s.title || 'Percakapan',
      message_count: s.message_count || 0,
      created_at: s.created_at,
      updated_at: s.updated_at,
      last_active_at: s.updated_at || s.created_at,
    })),
    data: rawList,
  }
}

/**
 * 12. GET /api/v1/rag/sessions/{session_id}/messages: Mengambil histori chat lengkap dari sesi tertentu
 */
export async function getRagSessionMessages(sessionId: string): Promise<RagSessionMessagesResponse> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    // Fallback try redis session history
    const fallbackRes = await fetch(`${baseUrl}/rag/chat/session/${encodeURIComponent(sessionId)}/history`, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store',
    })
    if (fallbackRes.ok) {
      const data = await fallbackRes.json()
      const rawHistory = Array.isArray(data.history) ? data.history : []
      const mapped = rawHistory.map((h: any, idx: number) => ({
        id: idx,
        role: h.role,
        content: h.content,
        created_at: h.timestamp || new Date().toISOString(),
      }))
      return {
        status: 'success',
        session_id: sessionId,
        messages: mapped,
        data: mapped,
      }
    }
    throw new Error(`Failed to fetch session messages: ${await res.text()}`)
  }

  const json = await res.json()
  const rawMessages = json.data || json.messages || []
  return {
    status: json.status || 'success',
    session_id: json.session_id || sessionId,
    messages: rawMessages,
    data: rawMessages,
  }
}

/**
 * 13. POST /api/v1/rag/feedback: Menerima rating (thumbs up/down) dan teks koreksi/masukan untuk self-growth
 */
export async function sendRagFeedback(payload: RagFeedbackPayload): Promise<RagFeedbackResponse> {
  const baseUrl = getRagBaseUrl()

  const ratingInt = typeof payload.rating === 'number'
    ? payload.rating
    : String(payload.rating).toLowerCase().includes('down') ? -1 : 1

  const body = {
    message_id: payload.message_id || `msg_${Date.now()}`,
    rating: ratingInt,
    feedback_notes: payload.feedback_notes || null,
    correction_text: payload.correction_text || null,
  }

  const res = await fetch(`${baseUrl}/rag/feedback`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to submit feedback (${res.status}): ${errorText}`)
  }

  return res.json()
}

/**
 * 14. POST /api/v1/rag/memory/learn: Mengajari AI fakta/aturan baru secara instan
 */
export async function teachRagMemory(payload: RagLearnMemoryPayload): Promise<RagLearnMemoryResponse> {
  const baseUrl = getRagBaseUrl()

  const contentText = payload.content || payload.fact || ''
  const subjectText = payload.subject || payload.category || 'General'

  const res = await fetch(`${baseUrl}/rag/memory/learn`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: contentText,
      subject: subjectText,
      fact_type: payload.fact_type || 'learned_knowledge',
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to teach memory (${res.status}): ${errorText}`)
  }

  return res.json()
}

/**
 * 15. GET /api/v1/rag/memory/facts: Menginspeksi daftar memori/fakta yang sudah dipelajari sistem
 */
export async function getRagMemoryFacts(params?: {
  limit?: number
  category?: string
  search?: string
}): Promise<RagMemoryFactsResponse> {
  const baseUrl = getRagBaseUrl()
  const url = new URL(`${baseUrl}/rag/memory/facts`)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to get memory facts (${res.status}): ${await res.text()}`)
  }

  const json = await res.json()
  const rawList = json.data || json.facts || []
  return {
    status: json.status || 'success',
    total: json.total ?? rawList.length,
    facts: rawList.map((f: any) => ({
      id: f.id,
      content: f.content || f.fact,
      fact: f.content || f.fact,
      subject: f.subject || f.category || 'General',
      category: f.subject || f.category || 'General',
      source: f.learned_from || 'Direct Input',
      confidence_score: f.confidence_score ?? 1.0,
      is_active: true,
      created_at: f.created_at,
    })),
    data: rawList,
  }
}

/**
 * 16. DELETE /api/v1/rag/memory/facts/{fact_id}
 */
export async function deleteRagMemoryFact(factId: string | number): Promise<{ status: string; message: string }> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/memory/facts/${encodeURIComponent(factId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Failed to delete memory fact (${res.status}): ${await res.text()}`)
  }

  return res.json()
}

