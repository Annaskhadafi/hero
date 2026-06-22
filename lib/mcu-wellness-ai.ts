// AI extraction helper for MCU Wellness Advance.
// Reuses OLLAMA_* env (OpenRouter-compatible) same as recruitment smart scoring
// and tire-pattern analyzer. Vision-capable model required (gpt-4o-mini etc).

export const MCU_METRIC_CATEGORIES = [
  "hipertensi",
  "kolesterol",
  "asam_urat",
  "jantung",
  "diabetes",
  "liver",
] as const;

export type McuMetricCategory = (typeof MCU_METRIC_CATEGORIES)[number];

export interface McuMetricEntry {
  value: string;
  unit: string;
  flag: "normal" | "tinggi" | "rendah" | "abnormal";
  notes?: string;
}

export type McuMetricMap = Partial<
  Record<McuMetricCategory, Partial<Record<string, McuMetricEntry>>>
>;

export interface McuAiExtraction {
  kesimpulan: string;
  saran: string;
  kategori: "Fit" | "Unfit" | "Perlu Review";
  metrics: McuMetricMap;
}

export const MCU_METRIC_KEYS: Record<McuMetricCategory, string[]> = {
  hipertensi: ["tensi_sistolik", "tensi_diastolik"],
  kolesterol: ["chol_total", "ldl", "hdl", "trigliserida"],
  asam_urat: ["asam_urat"],
  jantung: ["ekg", "treadmill"],
  diabetes: ["glukosa_puasa", "gd2pp", "hba1c"],
  liver: ["sgot", "sgpt", "gamma_gt", "usg_abdomen"],
};

export const MCU_METRIC_LABELS: Record<string, string> = {
  tensi_sistolik: "Tensi Sistolik",
  tensi_diastolik: "Tensi Diastolik",
  chol_total: "Kolesterol Total",
  ldl: "LDL",
  hdl: "HDL",
  trigliserida: "Trigliserida",
  asam_urat: "Asam Urat",
  ekg: "EKG",
  treadmill: "Treadmill",
  glukosa_puasa: "Glukosa Puasa",
  gd2pp: "Glukosa 2 Jam PP",
  hba1c: "HbA1c",
  sgot: "SGOT",
  sgpt: "SGPT",
  gamma_gt: "Gamma GT",
  usg_abdomen: "USG Abdomen",
};

export const MCU_CATEGORY_LABELS: Record<McuMetricCategory, string> = {
  hipertensi: "Hipertensi",
  kolesterol: "Kolesterol",
  asam_urat: "Asam Urat",
  jantung: "Jantung",
  diabetes: "Diabetes",
  liver: "Liver",
};

export const MCU_AI_PROMPT_SYSTEM = `Anda adalah asisten medis ahli yang membantu HR untuk mengekstrak hasil Medical Check Up (MCU) karyawan dari dokumen (PDF/gambar) yang diunggah.

Tugas Anda:
1. Baca dokumen hasil MCU dengan teliti.
2. Ekstrak ringkasan klinis, saran tindak lanjut, dan kategori hasil keseluruhan.
3. Ekstrak nilai-nilai pemeriksaan per kategori kesehatan berikut:
   - hipertensi: tensi_sistolik (mmHg), tensi_diastolik (mmHg)
   - kolesterol: chol_total (mg/dL), ldl (mg/dL), hdl (mg/dL), trigliserida (mg/dL)
   - asam_urat: asam_urat (mg/dL)
   - jantung: ekg (hasil/interpretasi), treadmill (hasil/interpretasi)
   - diabetes: glukosa_puasa (mg/dL), gd2pp (mg/dL), hba1c (%)
   - liver: sgot (U/L), sgpt (U/L), gamma_gt (U/L), usg_abdomen (hasil)

Aturan output:
- Kembalikan HANYA JSON valid, tanpa markdown fence, tanpa teks tambahan.
- Semua teks user-facing dalam Bahasa Indonesia.
- "kategori" harus salah satu dari: "Fit", "Unfit", "Perlu Review".
- "flag" tiap metric harus salah satu dari: "normal", "tinggi", "rendah", "abnormal".
- Jika nilai tidak ditemukan di dokumen, gunakan value "" (string kosong) dan flag "normal".
- "kesimpulan" ringkas maksimal 3 kalimat. "saran" berisi rekomendasi tindak lanjut praktis.

Format JSON WAJIB:
{
  "kesimpulan": "string",
  "saran": "string",
  "kategori": "Fit" | "Unfit" | "Perlu Review",
  "metrics": {
    "hipertensi": {
      "tensi_sistolik": {"value":"120","unit":"mmHg","flag":"normal"},
      "tensi_diastolik": {"value":"80","unit":"mmHg","flag":"normal"}
    },
    "kolesterol": {
      "chol_total": {"value":"","unit":"mg/dL","flag":"normal"},
      "ldl": {"value":"","unit":"mg/dL","flag":"normal"},
      "hdl": {"value":"","unit":"mg/dL","flag":"normal"},
      "trigliserida": {"value":"","unit":"mg/dL","flag":"normal"}
    },
    "asam_urat": {
      "asam_urat": {"value":"","unit":"mg/dL","flag":"normal"}
    },
    "jantung": {
      "ekg": {"value":"","unit":"","flag":"normal"},
      "treadmill": {"value":"","unit":"","flag":"normal"}
    },
    "diabetes": {
      "glukosa_puasa": {"value":"","unit":"mg/dL","flag":"normal"},
      "gd2pp": {"value":"","unit":"mg/dL","flag":"normal"},
      "hba1c": {"value":"","unit":"%","flag":"normal"}
    },
    "liver": {
      "sgot": {"value":"","unit":"U/L","flag":"normal"},
      "sgpt": {"value":"","unit":"U/L","flag":"normal"},
      "gamma_gt": {"value":"","unit":"U/L","flag":"normal"},
      "usg_abdomen": {"value":"","unit":"","flag":"normal"}
    }
  }
}`;

export interface McuAiCallParams {
  fileBase64: string;
  mimeType: string;
}

export interface McuAiCallResult {
  content: McuAiExtraction;
  rawContent: string;
  model: string;
}

export function getMcuAiConfig() {
  const apiUrl =
    process.env.MCU_AI_URL ||
    process.env.OLLAMA_URL ||
    "https://openrouter.ai/api/v1/chat/completions";
  const apiKey =
    process.env.MCU_AI_API_KEY ||
    process.env.OLLAMA_API_KEY ||
    process.env.TIRE_PATTERN_API_KEY ||
    "";
  // Vision-capable model required. xiaomi/mimo-v2.5 is text-only.
  // Priority: MCU_AI_MODEL > TIRE_PATTERN_MODEL (vision) > OLLAMA_MODEL.
  const model =
    process.env.MCU_AI_MODEL ||
    process.env.TIRE_PATTERN_MODEL || // anthropic/claude-3.5-sonnet (vision-capable)
    process.env.OLLAMA_MODEL ||
    "openai/gpt-4o-mini";
  return { apiUrl, apiKey, model };
}

export async function callMcuAiExtraction(params: McuAiCallParams): Promise<McuAiCallResult> {
  const { apiUrl, apiKey, model } = getMcuAiConfig();
  if (!apiKey) {
    throw new Error("OLLAMA_API_KEY belum dikonfigurasi. Set di .env.local (OpenRouter API key).");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

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
          { role: "system", content: MCU_AI_PROMPT_SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${params.mimeType};base64,${params.fileBase64}` },
              },
              {
                type: "text",
                text: "Ekstrak hasil MCU dari dokumen ini dan kembalikan sebagai JSON sesuai format yang ditentukan.",
              },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.1,
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
    const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed: McuAiExtraction;
    try {
      parsed = JSON.parse(cleaned) as McuAiExtraction;
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = JSON.parse(cleaned.slice(start, end + 1)) as McuAiExtraction;
      } else {
        throw new Error("AI response bukan JSON valid");
      }
    }
    return { content: parsed, rawContent, model };
  } finally {
    clearTimeout(timeout);
  }
}

export function flattenMcuMetrics(
  extraction: McuAiExtraction,
  recordedAt: Date,
): Array<{
  category: string;
  metricKey: string;
  metricValue: string;
  metricUnit: string;
  flag: string;
  notes: string;
  recordedAt: Date;
}> {
  const rows: Array<{
    category: string;
    metricKey: string;
    metricValue: string;
    metricUnit: string;
    flag: string;
    notes: string;
    recordedAt: Date;
  }> = [];

  for (const category of MCU_METRIC_CATEGORIES) {
    const catMap = extraction.metrics?.[category];
    if (!catMap) continue;
    for (const [key, entry] of Object.entries(catMap)) {
      if (!entry) continue;
      rows.push({
        category,
        metricKey: key,
        metricValue: entry.value ?? "",
        metricUnit: entry.unit ?? "",
        flag: entry.flag ?? "normal",
        notes: entry.notes ?? "",
        recordedAt,
      });
    }
  }
  return rows;
}
