import { z } from 'zod'

const smartSiteConditionRiskLevelSchema = z.enum(['low', 'medium', 'high'])
const smartSiteConditionPrioritySchema = z.enum(['P1', 'P2', 'P3'])

export const smartSiteConditionPhotoInputSchema = z.object({
  photoId: z.number(),
  caption: z.string().default(''),
  locationLabel: z.string().default(''),
  mimeType: z.string().default('image/jpeg'),
  base64: z.string().min(1),
})

export const smartSiteConditionObservationInputSchema = z.object({
  observationId: z.number(),
  aspectType: z.string().min(1),
  title: z.string().min(1),
  score: z.number().min(1).max(5).default(3),
  notes: z.string().default(''),
  soilType: z.string().default(''),
  tireUsed: z.string().default(''),
  photos: z.array(smartSiteConditionPhotoInputSchema).default([]),
})

export const smartSiteConditionAiInputSchema = z.object({
  locationName: z.string().min(1),
  weather: z.string().default(''),
  shiftLabel: z.string().default(''),
  notes: z.string().default(''),
  tireSpecSnapshot: z.record(z.string(), z.unknown()).default({}),
  checklistSnapshot: z.record(z.string(), z.unknown()).default({}),
  templateVersionId: z.number(),
  templateName: z.string().min(1),
  templateSchemaSnapshot: z.record(z.string(), z.unknown()).default({}),
  templateRubricSnapshot: z.record(z.string(), z.unknown()).default({}),
  slideLayoutSnapshot: z.record(z.string(), z.unknown()).default({}),
  observations: z.array(smartSiteConditionObservationInputSchema).min(1),
})

export const smartSiteConditionAiOutputSchema = z.object({
  executiveSummary: z.string().min(1),
  overallRisk: smartSiteConditionRiskLevelSchema,
  siteNarrative: z.string().min(1),
  keyFindings: z.array(
    z.object({
      title: z.string().min(1),
      riskLevel: smartSiteConditionRiskLevelSchema,
      why: z.string().min(1),
      evidencePhotoIds: z.array(z.number()).default([]),
    })
  ),
  matrixRows: z.array(
    z.object({
      aspectType: z.string().min(1),
      finding: z.string().min(1),
      riskLevel: smartSiteConditionRiskLevelSchema,
      confidence: z.number().min(0).max(1),
      tireImpact: z.array(z.string()).default([]),
      rootCause: z.string().min(1),
      recommendation: z.string().min(1),
      priority: smartSiteConditionPrioritySchema,
      evidencePhotoIds: z.array(z.number()).default([]),
    })
  ),
  recommendedActions: z.array(
    z.object({
      title: z.string().min(1),
      priority: smartSiteConditionPrioritySchema,
      ownerHint: z.string().default(''),
      detail: z.string().min(1),
    })
  ),
  slidePlan: z.array(
    z.object({
      slideNumber: z.number().int().positive(),
      title: z.string().min(1),
      objective: z.string().min(1),
      photoIds: z.array(z.number()).default([]),
      bulletPoints: z.array(z.string()).default([]),
    })
  ).min(5),
})

export type SmartSiteConditionAiInput = z.infer<typeof smartSiteConditionAiInputSchema>
export type SmartSiteConditionAiOutput = z.infer<typeof smartSiteConditionAiOutputSchema>

export function getSmartSiteConditionAiConfig() {
  const apiUrl =
    process.env.SITE_CONDITION_AI_URL ||
    process.env.OLLAMA_URL ||
    'https://openrouter.ai/api/v1/chat/completions'
  const apiKey =
    process.env.SITE_CONDITION_AI_API_KEY ||
    process.env.OLLAMA_API_KEY ||
    process.env.TIRE_PATTERN_API_KEY ||
    ''
  const model =
    process.env.SITE_CONDITION_AI_MODEL ||
    process.env.TIRE_PATTERN_MODEL ||
    process.env.OLLAMA_MODEL ||
    'openai/gpt-4o-mini'

  return { apiUrl, apiKey, model }
}

export function buildSmartSiteConditionSystemPrompt() {
  return `Anda adalah analis technical service tire mining.

Tugas:
1. Analisa kondisi site berdasarkan foto, checklist, metadata lokasi, dan konteks tire.
2. Identifikasi faktor risiko yang memengaruhi performa, umur pakai, heat buildup, cut damage, sidewall damage, dan casing life.
3. Isi output secara TERSTRUKTUR dan KEMBALIKAN HANYA JSON valid.
4. Semua teks user-facing wajib Bahasa Indonesia.
5. Gunakan evidence photo id yang benar-benar ada pada input.

Aturan:
- Jangan mengarang kondisi yang tidak didukung evidence.
- Jika confidence rendah, tetap beri rekomendasi aman dan praktis.
- Prioritas:
  - P1 = tindakan segera / risiko tinggi
  - P2 = perlu perbaikan terjadwal
  - P3 = monitoring / optimasi
- slidePlan minimal 5 slide.
- matrixRows wajib mengikuti makna template, tetapi field inti tidak boleh hilang.

Format JSON wajib:
${JSON.stringify(
  {
    executiveSummary: 'string',
    overallRisk: 'low|medium|high',
    siteNarrative: 'string',
    keyFindings: [
      {
        title: 'string',
        riskLevel: 'low|medium|high',
        why: 'string',
        evidencePhotoIds: [1],
      },
    ],
    matrixRows: [
      {
        aspectType: 'curve',
        finding: 'string',
        riskLevel: 'low|medium|high',
        confidence: 0.86,
        tireImpact: ['heat', 'cut'],
        rootCause: 'string',
        recommendation: 'string',
        priority: 'P1|P2|P3',
        evidencePhotoIds: [1],
      },
    ],
    recommendedActions: [
      {
        title: 'string',
        priority: 'P1|P2|P3',
        ownerHint: 'Road maintenance / operation / tire team',
        detail: 'string',
      },
    ],
    slidePlan: [
      {
        slideNumber: 1,
        title: 'Cover',
        objective: 'string',
        photoIds: [1],
        bulletPoints: ['string'],
      },
    ],
  },
  null,
  2
)}`.trim()
}

export async function callSmartSiteConditionAiDraft(input: SmartSiteConditionAiInput) {
  const safeInput = smartSiteConditionAiInputSchema.parse(input)
  const { apiUrl, apiKey, model } = getSmartSiteConditionAiConfig()

  if (!apiKey) {
    throw new Error('SITE_CONDITION_AI_API_KEY / OLLAMA_API_KEY belum dikonfigurasi.')
  }

  const prompt = [
    `Template: ${safeInput.templateName}`,
    `Lokasi: ${safeInput.locationName}`,
    `Cuaca: ${safeInput.weather || '-'}`,
    `Shift: ${safeInput.shiftLabel || '-'}`,
    `Catatan umum: ${safeInput.notes || '-'}`,
    `Tire spec snapshot: ${JSON.stringify(safeInput.tireSpecSnapshot)}`,
    `Checklist snapshot: ${JSON.stringify(safeInput.checklistSnapshot)}`,
    `Template schema snapshot: ${JSON.stringify(safeInput.templateSchemaSnapshot)}`,
    `Template rubric snapshot: ${JSON.stringify(safeInput.templateRubricSnapshot)}`,
    `Slide layout snapshot: ${JSON.stringify(safeInput.slideLayoutSnapshot)}`,
    `Observations: ${JSON.stringify(safeInput.observations)}`,
  ].join('\n')

  const photoContents = safeInput.observations
    .flatMap((observation) => observation.photos)
    .slice(0, 8)
    .map((photo) => ({
      type: 'image_url',
      image_url: {
        url: `data:${photo.mimeType};base64,${photo.base64}`,
      },
    }))

  // ponytail: queue-upgrade-path -> pindahkan ke background worker saat ukuran foto/report sudah besar.
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
      'X-Title': 'HERO Smart Site Condition',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: buildSmartSiteConditionSystemPrompt(),
        },
        {
          role: 'user',
          content: [
            ...photoContents,
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.15,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API error ${response.status}: ${errorText.slice(0, 300)}`)
  }

  const data = await response.json()
  const rawContent = data.choices?.[0]?.message?.content || data.message?.content || '{}'
  const cleaned = `${rawContent}`.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = smartSiteConditionAiOutputSchema.parse(JSON.parse(cleaned))

  return {
    rawContent: cleaned,
    content: parsed,
    model,
  }
}
