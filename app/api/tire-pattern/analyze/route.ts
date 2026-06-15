import { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/lib/server-env'

export const runtime = 'nodejs'
export const maxDuration = 30

// ─── Prompt untuk analisa pola ban dari gambar ──────────────────────────────
const PATTERN_ANALYSIS_PROMPT = `You are an expert tire tread pattern analyst. Analyze the tire tread pattern in this image and extract the following information in JSON format.

Return ONLY a valid JSON object with these fields:
{
  "patternType": "string — one of: zig-zag, lug, rib, block, mixed, custom",
  "grooveAngle": "number — dominant groove angle in degrees (0-90)",
  "grooveWidthRatio": "number — estimated groove width as % of tread (5-40)",
  "patternDensity": "number — rubber-to-void ratio estimate 0-100 (higher = more rubber)",
  "blockShape": "string — square, rectangular, hexagonal, triangular, irregular",
  "isDirectional": "boolean — is this a directional pattern?",
  "hasLateralGrooves": "boolean",
  "hasCenterGroove": "boolean",
  "primaryDirection": "string — diagonal, transverse, longitudinal, combined",
  "estimatedGrooveDepthCategory": "string — shallow (<8mm), medium (8-14mm), deep (>14mm)",
  "patternDescription": "string — brief technical description in Indonesian, max 80 words",
  "suggestedGrooveAngle": "number — best angle for this pattern type",
  "suggestedGrooveWidthMm": "number — suggested groove width in mm for retread",
  "suggestedGrooveDepthMm": "number — suggested groove depth in mm for retread",
  "confidence": "number — analysis confidence 0-100"
}

Analyze the pattern carefully and provide accurate technical measurements.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, mimeType = 'image/jpeg' } = body

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 diperlukan' }, { status: 400 })
    }

    const apiKey = serverEnv.tirePatternApiKey
    const apiUrl = serverEnv.tirePatternApiUrl
    const model = serverEnv.tirePatternModel

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Konfigurasi API tidak ditemukan. Periksa TIRE_PATTERN_API_KEY di .env' },
        { status: 500 },
      )
    }

    const payload = {
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: PATTERN_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.1, // Low temperature for consistent/accurate analysis
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
        'X-Title': 'HERO Tire Pattern Designer',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[tire-pattern/analyze] API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Analisa gagal: HTTP ${response.status}` },
        { status: 502 },
      )
    }

    const data = await response.json()
    const rawContent = data?.choices?.[0]?.message?.content || ''

    // Extract JSON from response
    let parsed: Record<string, unknown> = {}
    try {
      // Try direct parse first
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        parsed = JSON.parse(rawContent)
      }
    } catch {
      console.error('[tire-pattern/analyze] Failed to parse JSON from model response:', rawContent)
      // Return fallback structure
      parsed = {
        patternType: 'custom',
        grooveAngle: 45,
        grooveWidthRatio: 20,
        patternDensity: 60,
        blockShape: 'rectangular',
        isDirectional: false,
        hasLateralGrooves: true,
        hasCenterGroove: false,
        primaryDirection: 'diagonal',
        estimatedGrooveDepthCategory: 'medium (8-14mm)',
        patternDescription: 'Pola tidak dapat dianalisa otomatis. Silakan atur parameter secara manual.',
        suggestedGrooveAngle: 45,
        suggestedGrooveWidthMm: 8,
        suggestedGrooveDepthMm: 12,
        confidence: 0,
      }
    }

    return NextResponse.json({
      success: true,
      result: parsed,
      model,
      rawResponse: rawContent,
    })
  } catch (error) {
    console.error('[tire-pattern/analyze] Unexpected error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
