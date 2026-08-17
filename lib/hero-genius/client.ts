/**
 * Hero Genius / RAG Knowledge Base & pgvector Client
 * Connects to vision.chitraparatama.com/api/v1/rag
 */

const DEFAULT_BASE_URL = 'https://vision.chitraparatama.com/api/v1'
const DEFAULT_API_KEY = 'rv_e5ddc389b891d26ce04a426b8399090e'

export function getRagBaseUrl(): string {
  const envUrl = process.env.RARAY_VISION_BASE_URL?.replace(/\/+$/, '')
  if (!envUrl) return DEFAULT_BASE_URL
  return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl}/api/v1`
}

export function getRagApiKey(): string {
  return process.env.RARAY_VISION_API_KEY || DEFAULT_API_KEY
}

export function resolveRagDocumentUrl(rawUrl?: string | null): string {
  if (!rawUrl) return ''
  const trimmed = rawUrl.trim()
  if (!trimmed) return ''

  const filename = trimmed.split('/').pop() || ''

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('vision.chitraparatama.com')) {
      return trimmed
    }
    // Route cloudhost or other raw S3 storage through the working Vision proxy endpoint
    return `https://vision.chitraparatama.com/api/v1/uploads/${encodeURIComponent(filename)}`
  }

  if (trimmed.startsWith('/api/v1/uploads/')) {
    return `https://vision.chitraparatama.com${trimmed}`
  }

  if (trimmed.startsWith('/uploads/')) {
    return `https://vision.chitraparatama.com/api/v1${trimmed}`
  }

  return `https://vision.chitraparatama.com/api/v1/uploads/${encodeURIComponent(filename)}`
}

function getAuthHeaders(): HeadersInit {
  const apiKey = getRagApiKey()
  return {
    Authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
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
  message: string
  data?: {
    document_id: string
    filename: string
    total_chunks: number
    format: string
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
    }),
    cache: 'no-store',
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
  })

  if (!res.ok) {
    throw new Error(`Semantic search failed (${res.status}): ${await res.text()}`)
  }

  return res.json()
}

/**
 * 4. List All Documents in Knowledge Base
 */
export async function listRagDocuments(): Promise<RagDocumentsResponse> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/documents`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to list documents (${res.status}): ${await res.text()}`)
  }

  return res.json()
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
  user_id?: string | null
  title?: string
  summary?: string | null
  message_count?: number
  last_active_at?: string
  created_at?: string
}

export interface RagSessionsResponse {
  status: string
  total?: number
  sessions: RagSessionItem[]
}

export interface RagSessionMessagesResponse {
  status: string
  session_id: string
  messages: Array<{
    id?: string | number
    role: 'user' | 'assistant' | 'system'
    content: string
    sources?: RagSourceItem[]
    latency_ms?: number
    created_at?: string
  }>
}

export interface RagFeedbackPayload {
  session_id?: string | null
  message_id?: string | null
  query: string
  answer: string
  rating: 'up' | 'down' | 'positive' | 'negative' | number
  feedback_text?: string | null
  correction?: string | null
  user_id?: string | null
}

export interface RagFeedbackResponse {
  status: string
  message: string
  feedback_id?: string | number
}

export interface RagLearnMemoryPayload {
  fact: string
  category?: string
  source?: string
  tags?: string[]
  user_id?: string | null
}

export interface RagLearnMemoryResponse {
  status: string
  message: string
  data?: {
    fact_id: string | number
    fact: string
    category: string
    created_at?: string
  }
}

export interface RagMemoryFactItem {
  id: string | number
  fact: string
  category: string
  source?: string | null
  tags?: string[]
  confidence_score?: number
  is_active?: boolean
  learned_by?: string | null
  created_at?: string
}

export interface RagMemoryFactsResponse {
  status: string
  total: number
  facts: RagMemoryFactItem[]
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

  return res.json()
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
      return {
        status: 'ok',
        session_id: sessionId,
        messages: Array.isArray(data.history)
          ? data.history.map((h: any, idx: number) => ({
              id: idx,
              role: h.role,
              content: h.content,
              created_at: h.timestamp || new Date().toISOString(),
            }))
          : [],
      }
    }
    throw new Error(`Failed to fetch session messages: ${await res.text()}`)
  }

  return res.json()
}

/**
 * 13. POST /api/v1/rag/feedback: Menerima rating (thumbs up/down) dan teks koreksi/masukan untuk self-growth
 */
export async function sendRagFeedback(payload: RagFeedbackPayload): Promise<RagFeedbackResponse> {
  const baseUrl = getRagBaseUrl()
  const res = await fetch(`${baseUrl}/rag/feedback`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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
  const res = await fetch(`${baseUrl}/rag/memory/learn`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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
  if (params?.limit) url.searchParams.set('limit', String(params.limit))
  if (params?.category) url.searchParams.set('category', params.category)
  if (params?.search) url.searchParams.set('search', params.search)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to get memory facts (${res.status}): ${await res.text()}`)
  }

  return res.json()
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
