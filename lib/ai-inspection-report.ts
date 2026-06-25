export interface InspectionAiExtraction {
  summary: string;
  findings: string;
  recommendations: string;
  photoCaptions: Record<string, string>; // photoId -> caption
}

export const INSPECTION_AI_PROMPT_SYSTEM = `Anda adalah asisten ahli inspeksi tambang yang membantu supervisor/inspector untuk menyusun laporan hasil inspeksi lapangan.

Tugas Anda:
1. Baca hasil inspeksi, kondisi lapangan (loading area, haul road, dumping area), daftar checklist, dan foto-foto (jika ada).
2. Buat ringkasan (summary) singkat maksimal 3 kalimat mengenai kondisi keseluruhan site.
3. Buat temuan lapangan (findings) berdasarkan jawaban negatif atau skor rendah dari checklist. Sebutkan area dan temuan secara rinci.
4. Buat rekomendasi (recommendations) yang actionable untuk memperbaiki temuan lapangan. Pastikan rekomendasi relevan dengan mengurangi risiko kerusakan ban (tyre hazard).
5. Buat caption foto secara otomatis jika ada foto yang diberikan. 

Aturan output:
- Kembalikan HANYA JSON valid, tanpa markdown fence, tanpa teks tambahan.
- Semua teks user-facing dalam Bahasa Indonesia dengan bahasa profesional industri tambang.

Format JSON WAJIB:
{
  "summary": "string",
  "findings": "string",
  "recommendations": "string",
  "photoCaptions": {
    "photo_id_1": "string caption untuk foto 1",
    "photo_id_2": "string caption untuk foto 2"
  }
}`;

export interface InspectionAiCallParams {
  siteName: string;
  customerName: string;
  shift: string;
  unitName: string;
  notes: string;
  loadingScore: number;
  haulRoadScore: number;
  dumpingScore: number;
  totalScore: number;
  checklists: Array<{
    section: string;
    question: string;
    answer: boolean;
    score: number;
    remarks: string;
  }>;
  photos: Array<{
    id: string;
    section: string;
    base64: string;
    mimeType: string;
    caption: string;
  }>;
}

export interface InspectionAiCallResult {
  content: InspectionAiExtraction;
  rawContent: string;
  model: string;
}

export function getInspectionAiConfig() {
  const apiUrl =
    process.env.INSPECTION_AI_URL ||
    process.env.OLLAMA_URL ||
    "https://openrouter.ai/api/v1/chat/completions";
  const apiKey =
    process.env.INSPECTION_AI_API_KEY ||
    process.env.OLLAMA_API_KEY ||
    process.env.TIRE_PATTERN_API_KEY ||
    "";
  
  // Vision-capable model required if photos are processed
  const model =
    process.env.INSPECTION_AI_MODEL ||
    process.env.TIRE_PATTERN_MODEL ||
    process.env.OLLAMA_MODEL ||
    "openai/gpt-4o-mini";
    
  return { apiUrl, apiKey, model };
}

export async function callInspectionAiReport(params: InspectionAiCallParams): Promise<InspectionAiCallResult> {
  const { apiUrl, apiKey, model } = getInspectionAiConfig();
  if (!apiKey) {
    throw new Error("API Key belum dikonfigurasi. Set di .env.local (OpenRouter API key).");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2 minutes

  try {
    // Construct user prompt
    const textContent = `Data Inspeksi:
Lokasi: ${params.siteName}
Customer: ${params.customerName}
Shift: ${params.shift}
Unit: ${params.unitName}
Catatan: ${params.notes}

Total Skor: ${params.totalScore}
- Loading Area: ${params.loadingScore}
- Haul Road: ${params.haulRoadScore}
- Dumping Area: ${params.dumpingScore}

Hasil Checklist:
${params.checklists.map(c => `[${c.section}] Q: ${c.question} | Ans: ${c.answer ? 'YA' : 'TIDAK'} | Skor: ${c.score}/10 | Remarks: ${c.remarks}`).join('\\n')}

Daftar ID Foto yang disertakan:
${params.photos.map(p => `- ${p.id} (${p.section})`).join('\\n')}
`;

    const userMessageContent: any[] = [
      {
        type: "text",
        text: textContent,
      }
    ];

    // Add photos
    for (const photo of params.photos) {
      if (photo.base64) {
        userMessageContent.push({
          type: "image_url",
          image_url: { url: `data:${photo.mimeType};base64,${photo.base64}` },
        });
      }
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
        "X-Title": "HERO AI Inspection Report",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: INSPECTION_AI_PROMPT_SYSTEM },
          {
            role: "user",
            content: userMessageContent,
          },
        ],
        max_tokens: 2048,
        temperature: 0.2,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const aiData = await response.json();
    const rawContent =
      aiData.choices?.[0]?.message?.content || aiData.message?.content || "{}";
    const cleaned = rawContent.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
    let parsed: InspectionAiExtraction;
    try {
      parsed = JSON.parse(cleaned) as InspectionAiExtraction;
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = JSON.parse(cleaned.slice(start, end + 1)) as InspectionAiExtraction;
      } else {
        throw new Error("AI response bukan JSON valid: " + rawContent.slice(0, 100));
      }
    }
    return { content: parsed, rawContent, model };
  } finally {
    clearTimeout(timeout);
  }
}
