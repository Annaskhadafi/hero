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
  reportDate: string
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
    reportDate: readString(body.reportDate, 'Tanggal'),
    category: category.key,
    photos: photos.map((photo, index) => {
      const mimeType = readString(photo?.mimeType, `Mime foto ${index + 1}`)
      const dataUrl = readString(photo?.dataUrl, `Data foto ${index + 1}`)

      if (!mimeType.startsWith('image/')) {
        throw new Error(`Foto ${index + 1} harus bertipe image.`)
      }
      if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
        throw new Error(`Foto ${index + 1} harus berupa data URL base64.`)
      }
      if (dataUrl.length > 8_000_000) {
        throw new Error(`Foto ${index + 1} terlalu besar. Maksimal sekitar 5MB.`)
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
  const assessmentById = new Map(
    (Array.isArray(rawResult.assessments) ? rawResult.assessments : []).map((item) => [
      String(item?.criterionId ?? ''),
      item,
    ])
  )

  const assessments = category.criteria.map((criterion) => {
    const item = assessmentById.get(criterion.id)
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
        : 'Analisis selesai. Detail temuan tersedia pada tabel parameter.',
    overallScore: clampScore(rawResult.overallScore ?? averageScore),
    assessments,
    photoCaptions: Array.isArray(rawResult.photoCaptions) ? rawResult.photoCaptions : [],
  }
}

async function callRoadConditionAi(payload: RoadConditionAnalyzePayload) {
  const category = getRoadConditionCategory(payload.category)!
  const { apiUrl, apiKey, model } = getInspectionAiConfig()

  if (!apiKey) {
    throw new Error('API key AI vision belum dikonfigurasi. Set INSPECTION_AI_API_KEY, OLLAMA_API_KEY, atau TIRE_PATTERN_API_KEY.')
  }

  const userText = `Analisis road condition tambang.
Site: ${payload.siteName}
Customer: ${payload.customerName}
Tanggal: ${payload.reportDate}
Kategori: ${category.reportLabel}

Gunakan 3 foto angle berbeda sebagai bukti visual. Caption user:
${payload.photos.map((photo, index) => `${index + 1}. ${photo.angle}: ${photo.caption || '-'}`).join('\n')}

Rubric penilaian kategori ini:
${buildRoadConditionRubricPrompt(payload.category)}

Output hanya JSON valid:
{
  "summary": "ringkasan 1-2 kalimat",
  "overallScore": 1,
  "assessments": [
    { "criterionId": "id_parameter", "score": 1, "description": "deskripsi kondisi visual", "recommendation": "rekomendasi tindakan" }
  ],
  "photoCaptions": [
    { "angle": "Angle 1", "caption": "caption visual singkat" }
  ]
}

Wajib isi satu assessment untuk setiap parameter rubric. Score 1 paling buruk, 5 paling baik.`

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [{ type: 'text', text: userText }]

  payload.photos.forEach((photo) => {
    content.push({ type: 'image_url', image_url: { url: photo.dataUrl } })
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
              'Anda adalah evaluator road condition tambang untuk risiko kerusakan BAN. Jawab dalam Bahasa Indonesia profesional. Jangan mengarang di luar bukti visual. Return hanya JSON valid.',
          },
          { role: 'user', content },
        ],
        max_tokens: 2600,
        temperature: 0.1,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI API error ${response.status}: ${errorText.slice(0, 240)}`)
    }

    const data = await response.json()
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
