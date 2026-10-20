import { NextRequest, NextResponse } from 'next/server'

import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getServerSession } from '@/lib/auth-session'
import { getInspectionAiConfig } from '@/lib/ai-inspection-report'
import {
  ROAD_CONDITION_RESOURCE,
  buildRoadConditionRubricPrompt,
  getRoadConditionCategory,
  type RoadConditionCategoryKey,
} from '@/lib/road-condition-rubric'

export const runtime = 'nodejs'
export const maxDuration = 120

type RoadConditionPhotoPayload = {
  angle: string
  caption: string
  mimeType: string
  dataUrl: string
}

type RoadConditionAnalyzePayload = {
  siteName: string
  customerName: string
  inspectorName: string
  reportDate: string
  pointName: string
  category: RoadConditionCategoryKey
  photos: RoadConditionPhotoPayload[]
}

type RoadConditionAiAssessment = {
  criterionId: string
  score: number
  description: string
  recommendation: string
}

type RoadConditionAiResult = {
  summary: string
  overallScore: number
  assessments: RoadConditionAiAssessment[]
  photoCaptions?: Array<{ angle: string; caption: string }>
}

function readString(value: unknown, field: string) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) throw new Error(`${field} wajib diisi.`)
  return text
}

function validatePayload(input: unknown): RoadConditionAnalyzePayload {
  const body = input as Partial<RoadConditionAnalyzePayload>
  const category = getRoadConditionCategory(String(body.category ?? ''))
  if (!category) throw new Error('Kategori road condition tidak valid.')

  const photos = Array.isArray(body.photos) ? body.photos : []
  if (photos.length !== 3) throw new Error('Wajib unggah 3 foto angle berbeda.')

  return {
    siteName: readString(body.siteName, 'Lokasi site'),
    customerName: readString(body.customerName, 'Customer'),
    inspectorName: readString(body.inspectorName, 'Nama inspector'),
    reportDate: readString(body.reportDate, 'Tanggal'),
    pointName: readString(body.pointName, 'Nama point'),
    category: category.key,
    photos: photos.map((photo, index) => {
      const rawMimeType = typeof photo?.mimeType === 'string' ? photo.mimeType.trim().toLowerCase() : ''
      const rawDataUrl = readString(photo?.dataUrl, `Data foto ${index + 1}`)

      // Detect MIME from dataUrl or rawMimeType
      const dataUrlMatch = rawDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i)
      const detectedMime = dataUrlMatch ? dataUrlMatch[1].toLowerCase() : (rawMimeType || 'image/jpeg')
      const mimeType = detectedMime === 'image/jpg' ? 'image/jpeg' : detectedMime

      if (!mimeType.startsWith('image/')) {
        throw new Error(`Foto ${index + 1} harus bertipe image.`)
      }

      // Normalisasi format base64
      const dataUrl = rawDataUrl.startsWith('data:')
        ? rawDataUrl
        : `data:${mimeType};base64,${rawDataUrl}`

      if (!dataUrl.startsWith('data:image/') || !dataUrl.includes(';base64,')) {
        throw new Error(`Foto ${index + 1} harus berupa data URL base64.`)
      }

      if (dataUrl.length > 20_000_000) {
        throw new Error(`Foto ${index + 1} terlalu besar. Maksimal sekitar 15MB.`)
      }

      return {
        angle: readString(photo?.angle, `Angle foto ${index + 1}`),
        caption: typeof photo?.caption === 'string' ? photo.caption.trim() : '',
        mimeType,
        dataUrl,
      }
    }),
  }
}

function cleanJsonContent(rawContent: string) {
  return rawContent.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
}

function parseJsonObject(rawContent: string) {
  const cleaned = cleanJsonContent(rawContent)
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw new Error(`AI response bukan JSON valid: ${rawContent.slice(0, 120)}`)
  }
}

function clampScore(value: unknown) {
  const score = Math.round(Number(value))
  if (!Number.isFinite(score)) return 3
  return Math.max(1, Math.min(5, score))
}

function normalizeAiResult(
  categoryKey: RoadConditionCategoryKey,
  rawResult: Partial<RoadConditionAiResult>
): RoadConditionAiResult {
  const category = getRoadConditionCategory(categoryKey)!
  const rawAssessments = Array.isArray(rawResult.assessments) ? rawResult.assessments : []

  // Create lookup maps by criterionId (exact and sanitized) as well as index
  const assessmentMap = new Map<string, Partial<RoadConditionAiAssessment>>()
  rawAssessments.forEach((item, index) => {
    if (!item) return
    const rawId = String(item.criterionId ?? '').trim().toLowerCase()
    if (rawId) {
      assessmentMap.set(rawId, item)
      assessmentMap.set(rawId.replace(/[-_\s]+/g, ''), item)
    }
    assessmentMap.set(`__idx_${index}`, item)
  })

  const assessments = category.criteria.map((criterion, index) => {
    const cleanId = criterion.id.toLowerCase()
    const cleanNormalized = cleanId.replace(/[-_\s]+/g, '')
    const cleanTitle = criterion.title.toLowerCase().replace(/[-_\s]+/g, '')

    const item =
      assessmentMap.get(cleanId) ||
      assessmentMap.get(cleanNormalized) ||
      assessmentMap.get(cleanTitle) ||
      assessmentMap.get(`__idx_${index}`)

    const score = clampScore(item?.score)
    const defaultDescription = `${criterion.title}: ${criterion.ratings[score as 1 | 2 | 3 | 4 | 5]}`

    return {
      criterionId: criterion.id,
      score,
      description:
        typeof item?.description === 'string' && item.description.trim()
          ? item.description.trim()
          : defaultDescription,
      recommendation:
        typeof item?.recommendation === 'string' && item.recommendation.trim()
          ? item.recommendation.trim()
          : 'Lakukan perbaikan area sesuai temuan visual dan pantau ulang setelah pekerjaan selesai.',
    }
  })

  const averageScore = Number(
    (assessments.reduce((total, item) => total + item.score, 0) / assessments.length).toFixed(1)
  )

  return {
    summary:
      typeof rawResult.summary === 'string' && rawResult.summary.trim()
        ? rawResult.summary.trim()
        : 'Analisis selesai. Detail temuan visual tersedia pada tabel parameter di bawah.',
    overallScore: clampScore(rawResult.overallScore ?? averageScore),
    assessments,
    photoCaptions: Array.isArray(rawResult.photoCaptions) ? rawResult.photoCaptions : [],
  }
}

async function callRoadConditionAi(payload: RoadConditionAnalyzePayload) {
  const category = getRoadConditionCategory(payload.category)!
  const { apiUrl, apiKey, model } = getInspectionAiConfig()

  if (!apiKey) {
    throw new Error('API key AI vision belum dikonfigurasi. Set OPENAI_API_KEY, INSPECTION_AI_API_KEY, atau OLLAMA_API_KEY.')
  }

  const expectedCriteriaList = category.criteria
    .map((c) => `- "${c.id}" (${c.title}): ${c.prompt}`)
    .join('\n')

  const criteriaJsonExample = category.criteria
    .map((c) => `    { "criterionId": "${c.id}", "score": 3, "description": "Deskripsi temuan visual untuk ${c.title}...", "recommendation": "Tindakan rekomendasi untuk ${c.title}..." }`)
    .join(',\n')

  const userText = `Analisis kondisi jalan tambang (road condition) dan risiko kerusakan BAN berdasarkan 3 foto yang dilampirkan.
Site: ${payload.siteName}
Customer: ${payload.customerName}
Inspector: ${payload.inspectorName}
Tanggal: ${payload.reportDate}
Kategori: ${category.reportLabel}
Nama point/segment: ${payload.pointName}

Caption foto dari inspector:
${payload.photos.map((photo, index) => `${index + 1}. ${photo.angle}: ${photo.caption || '-'}`).join('\n')}

Daftar parameter rubric penilaian yang WAJIB dievaluasi:
${expectedCriteriaList}

Rubric detail skala skor (1-5):
${buildRoadConditionRubricPrompt(payload.category)}

Instruksi penting:
1. Amati ketiga foto visual dengan teliti sesuai kategori ${category.reportLabel}.
2. Berikan evaluasi untuk SETIAP parameter di atas secara lengkap.
3. Nilai skor 1 (sangat buruk/kritis bagi ban) sampai 5 (sangat baik/ideal).
4. Buat caption visual singkat untuk masing-masing foto (Angle 1, Angle 2, Angle 3).

Output WAJIB berupa JSON valid persis dengan struktur berikut:
{
  "summary": "Ringkasan kondisi visual keseluruhan point ini dalam 1-2 kalimat spesifik terhadap temuan pada foto",
  "overallScore": 3,
  "assessments": [
${criteriaJsonExample}
  ],
  "photoCaptions": [
    { "angle": "Angle 1", "caption": "deskripsi visual singkat angle 1" },
    { "angle": "Angle 2", "caption": "deskripsi visual singkat angle 2" },
    { "angle": "Angle 3", "caption": "deskripsi visual singkat angle 3" }
  ]
}

Score 1 paling buruk, 5 paling baik.`

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
  > = [{ type: 'text', text: userText }]

  payload.photos.forEach((photo) => {
    content.push({
      type: 'image_url',
      image_url: {
        url: photo.dataUrl,
      },
    })
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
        'X-Title': 'HERO Road Condition Analysis',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Anda adalah auditor & evaluator ahli kondisi jalan tambang (road condition) dan dampaknya terhadap keausan/kerusakan ban (tyre hazard). Amati ketiga foto yang dilampirkan dengan teliti. Berikan penilaian skor (1-5) objektif, deskripsi kondisi visual spesifik yang tampak pada foto, dan rekomendasi perbaikan untuk setiap parameter rubric. Jawab dalam Bahasa Indonesia profesional. Return HANYA format JSON valid.',
          },
          { role: 'user', content },
        ],
        max_tokens: 3000,
        temperature: 0.1,
        stream: false,
      }),
    })

    const rawText = await response.text()
    if (!response.ok) {
      console.error(`[road-condition-analyze] AI error ${response.status} from ${apiUrl} (model: ${model}):`, rawText)
      let detail = rawText.slice(0, 240)
      if (response.status === 401) {
        detail = `${rawText.slice(0, 200)} [Target: ${apiUrl}] - Pastikan OPENAI_API_KEY & OPENAI_BASE_URL (https://9router.chitraparatama.com/v1) sesuai di environment Dokploy.`
      }
      throw new Error(`AI API error ${response.status}: ${detail}`)
    }

    const cleanedText = rawText.replace(/data:\s*\[DONE\]\s*$/i, '').trim()
    let data: any
    try {
      data = JSON.parse(cleanedText)
    } catch {
      throw new Error(`AI API response format tidak valid: ${cleanedText.slice(0, 240)}`)
    }
    const rawContent = data.choices?.[0]?.message?.content || data.message?.content || '{}'
    const parsed = parseJsonObject(Array.isArray(rawContent) ? JSON.stringify(rawContent) : rawContent)

    return {
      result: normalizeAiResult(payload.category, parsed),
      rawContent,
      model,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permission = await getCurrentMenuPermission(ROAD_CONDITION_RESOURCE)
    if (!permission.canView) {
      return NextResponse.json({ error: 'Akses analisis ditolak.' }, { status: 403 })
    }

    const payload = validatePayload(await request.json())
    const ai = await callRoadConditionAi(payload)

    return NextResponse.json({
      success: true,
      category: payload.category,
      result: ai.result,
      model: ai.model,
      rawContent: ai.rawContent,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menjalankan analisis.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
