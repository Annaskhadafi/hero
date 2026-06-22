// OCR extraction using Mistral OCR API, then cheap text AI analysis.
// Flow: document → Mistral OCR → extracted text → cheap LLM → structured JSON

import { uploadBufferToS3, getS3ObjectReadUrl } from "@/lib/s3-storage";

interface MistralOcrResponse {
  pages: Array<{
    index: number;
    markdown: string;
    images?: Array<{ id: string; base64?: string }>;
    dimensions?: { width: number; height: number };
  }>;
  model: string;
  usage?: { pages_parsed: number };
}

export async function extractTextViaOcr(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  const apiUrl = process.env.MISTRAL_OCR_ENDPOINT || "https://api.mistral.ai/v1/ocr";
  if (!apiKey) throw new Error("MISTRAL_API_KEY belum dikonfigurasi");

  const isPdf = mimeType === "application/pdf";

  let documentPayload: Record<string, unknown>;

  if (isPdf) {
    // PDF: upload to S3, then signed URL for Mistral
    const s3Key = `mcu-ocr-temp/${Date.now()}-${fileName}`;
    const s3Result = await uploadBufferToS3(fileBuffer, s3Key, mimeType);
    const signedUrl = await getS3ObjectReadUrl(s3Result.url, 3600);
    if (!signedUrl) throw new Error("Gagal generate signed URL untuk PDF");
    documentPayload = { type: "document_url", document_url: signedUrl };
  } else {
    // Image: pass base64 data URL directly
    const base64 = fileBuffer.toString("base64");
    documentPayload = { type: "image_url", image_url: `data:${mimeType};base64,${base64}` };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: documentPayload,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Mistral OCR error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data: MistralOcrResponse = await response.json();

    // Combine all page markdown
    const text = (data.pages ?? [])
      .map((p) => p.markdown || "")
      .filter(Boolean)
      .join("\n\n");

    if (!text.trim()) {
      throw new Error("OCR tidak menghasilkan teks. Dokumen mungkin kosong atau tidak terbaca.");
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

// Cheap AI analysis from extracted text
const ANALYSIS_SYSTEM_PROMPT = `Anda adalah asisten medis ahli yang menganalisis hasil Medical Check Up (MCU) dari teks hasil OCR.

Tugas Anda membaca teks hasil scan dokumen MCU dan mengekstrak informasi medis secara terstruktur.

Kembalikan HANYA JSON valid, tanpa markdown fence, tanpa teks tambahan.

{
  "kesimpulan": "string — ringkasan klinis maksimal 3 kalimat dalam Bahasa Indonesia",
  "saran": "string — rekomendasi tindak lanjut praktis",
  "kategori": "Fit" | "Unfit" | "Perlu Review",
  "metrics": {
    "hipertensi": {
      "tensi_sistolik": {"value":"...","unit":"mmHg","flag":"normal|tinggi|rendah"},
      "tensi_diastolik": {"value":"...","unit":"mmHg","flag":"normal|tinggi|rendah"}
    },
    "kolesterol": {
      "chol_total": {"value":"...","unit":"mg/dL","flag":"normal|tinggi|rendah"},
      "ldl": {"value":"...","unit":"mg/dL","flag":"normal|tinggi|rendah"},
      "hdl": {"value":"...","unit":"mg/dL","flag":"normal|tinggi|rendah"},
      "trigliserida": {"value":"...","unit":"mg/dL","flag":"normal|tinggi|rendah"}
    },
    "asam_urat": {
      "asam_urat": {"value":"...","unit":"mg/dL","flag":"normal|tinggi|rendah"}
    },
    "jantung": {
      "ekg": {"value":"...","unit":"","flag":"normal|abnormal"},
      "treadmill": {"value":"...","unit":"","flag":"normal|abnormal"}
    },
    "diabetes": {
      "glukosa_puasa": {"value":"...","unit":"mg/dL","flag":"normal|tinggi|rendah"},
      "gd2pp": {"value":"...","unit":"mg/dL","flag":"normal|tinggi|rendah"},
      "hba1c": {"value":"...","unit":"%","flag":"normal|tinggi|rendah"}
    },
    "liver": {
      "sgot": {"value":"...","unit":"U/L","flag":"normal|tinggi|rendah"},
      "sgpt": {"value":"...","unit":"U/L","flag":"normal|tinggi|rendah"},
      "gamma_gt": {"value":"...","unit":"U/L","flag":"normal|tinggi|rendah"},
      "usg_abdomen": {"value":"...","unit":"","flag":"normal|abnormal"}
    }
  }
}

Aturan:
- Jika nilai tidak ditemukan di teks, gunakan "" (string kosong) dan flag "normal".
- flag harus: "normal", "tinggi", "rendah", atau "abnormal".
- value bisa berupa angka atau teks (untuk hasil deskriptif seperti EKG, USG).
- unit wajib diisi jika ada satuan (mmHg, mg/dL, U/L, %).
- Semua teks user-facing dalam Bahasa Indonesia.`;

export async function analyzeTextViaAi(
  ocrText: string,
): Promise<{
  content: Record<string, unknown>;
  rawContent: string;
  model: string;
}> {
  const apiUrl = process.env.MCU_AI_URL || process.env.OLLAMA_URL || "https://openrouter.ai/api/v1/chat/completions";
  const apiKey = process.env.MCU_AI_API_KEY || process.env.OLLAMA_API_KEY || process.env.TIRE_PATTERN_API_KEY || "";
  const model = process.env.MCU_AI_MODEL || process.env.OLLAMA_MODEL || "openai/gpt-4o-mini";

  if (!apiKey) throw new Error("API key AI belum dikonfigurasi");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
        "X-Title": "HERO MCU Wellness AI",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          { role: "user", content: `Berikut adalah teks hasil OCR dari dokumen MCU. Ekstrak data medisnya:\n\n${ocrText.slice(0, 15000)}` },
        ],
        max_tokens: 2048,
        temperature: 0.1,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`AI API error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || aiData.message?.content || "{}";
    const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      } else {
        throw new Error("AI response bukan JSON valid");
      }
    }
    return { content: parsed, rawContent, model };
  } finally {
    clearTimeout(timeout);
  }
}
