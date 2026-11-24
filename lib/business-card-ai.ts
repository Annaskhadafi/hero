/**
 * Vision AI extraction service for Business Cards.
 * Extracts contact information from uploaded business card photos.
 */

export interface BusinessCardExtraction {
  contactName: string;
  companyName: string;
  jobTitle: string;
  phoneNumber: string;
  email: string;
  address: string;
  website: string;
  notes?: string;
  category?: 'lead' | 'client' | 'vendor' | 'partner' | 'other';
  rating?: 'hot' | 'warm' | 'cold';
}

export interface BusinessCardAiResult {
  data: BusinessCardExtraction;
  rawContent?: string;
  modelUsed: string;
  isMockFallback?: boolean;
}

export const BUSINESS_CARD_SYSTEM_PROMPT = `Anda adalah asisten AI spesialis ekstraksi data kartu nama bisnis (Business Card Scanner).
Tugas Anda adalah membaca gambar kartu nama secara akurat dan mengekstrak entitas kontak ke dalam format JSON.

Field yang wajib diekstrak:
- contactName: Nama lengkap pemegang kartu nama
- companyName: Nama perusahaan, organisasi, atau instansi
- jobTitle: Jabatan, posisi, atau spesialisasi pekerjaan
- phoneNumber: Nomor telepon seluler/WhatsApp/kantor (prioritaskan nomor HP/WA)
- email: Alamat email resmi atau pribadi
- address: Alamat kantor atau kota yang tertera
- website: Alamat situs web atau portal perusahaan
- notes: Catatan ringkas mengenai bidang usaha, tagline, atau produk yang tertera di kartu
- category: Salah satu dari "lead" | "client" | "vendor" | "partner" | "other" (default "lead")
- rating: Salah satu dari "hot" | "warm" | "cold" (default "warm")

Aturan output:
- Kembalikan HANYA JSON valid tanpa format markdown (jangan gunakan \`\`\`json).
- Jika ada field yang tidak ditemukan di kartu nama, isi dengan string kosong "".
- Bersihkan karakter noise dan rapikan format teks (Title Case untuk nama dan perusahaan).
- Normalisasi nomor telepon jika ada.`;

export function getBusinessCardAiConfig() {
  const apiUrl =
    process.env.BUSINESS_CARD_AI_URL ||
    process.env.MCU_AI_URL ||
    process.env.OLLAMA_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://openrouter.ai/api/v1/chat/completions';

  const apiKey =
    process.env.BUSINESS_CARD_AI_API_KEY ||
    process.env.MCU_AI_API_KEY ||
    process.env.OLLAMA_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.TIRE_PATTERN_API_KEY ||
    '';

  const model =
    process.env.BUSINESS_CARD_AI_MODEL ||
    process.env.MCU_AI_MODEL ||
    process.env.TIRE_PATTERN_MODEL ||
    process.env.OLLAMA_MODEL ||
    'openai/gpt-4o-mini';

  return { apiUrl, apiKey, model };
}

export async function extractBusinessCardFromImage(params: {
  fileBase64: string;
  mimeType: string;
}): Promise<BusinessCardAiResult> {
  const { apiUrl, apiKey, model } = getBusinessCardAiConfig();

  // If no AI key is configured (local dev/offline testing), return safe structured fallback
  if (!apiKey) {
    return {
      data: {
        contactName: 'Kontak Terdeteksi (Mode Offline)',
        companyName: 'PT Chitra Paratama Partner',
        jobTitle: 'Business Development',
        phoneNumber: '081234567890',
        email: 'partner@example.com',
        address: 'Jakarta, Indonesia',
        website: 'https://chitraparatama.com',
        notes: 'Kartu nama diekstrak via mode fallback local dev.',
        category: 'lead',
        rating: 'warm',
      },
      modelUsed: 'offline-fallback',
      isMockFallback: true,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const formattedUrl = apiUrl.endsWith('/chat/completions')
      ? apiUrl
      : `${apiUrl.replace(/\/+$/, '')}/chat/completions`;

    const response = await fetch(formattedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
        'X-Title': 'HERO Business Card Scanner AI',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: BUSINESS_CARD_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${params.mimeType};base64,${params.fileBase64}` },
              },
              {
                type: 'text',
                text: 'Silakan ekstrak seluruh informasi dari kartu nama pada gambar ini ke format JSON.',
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API status ${response.status}: ${errText.slice(0, 150)}`);
    }

    const jsonRes = await response.json();
    const rawContent =
      jsonRes.choices?.[0]?.message?.content || jsonRes.message?.content || '{}';

    const cleaned = rawContent
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsed: any = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      }
    }

    const data: BusinessCardExtraction = {
      contactName: String(parsed.contactName || '').trim(),
      companyName: String(parsed.companyName || '').trim(),
      jobTitle: String(parsed.jobTitle || '').trim(),
      phoneNumber: String(parsed.phoneNumber || '').trim(),
      email: String(parsed.email || '').trim(),
      address: String(parsed.address || '').trim(),
      website: String(parsed.website || '').trim(),
      notes: String(parsed.notes || '').trim(),
      category: ['lead', 'client', 'vendor', 'partner', 'other'].includes(parsed.category)
        ? parsed.category
        : 'lead',
      rating: ['hot', 'warm', 'cold'].includes(parsed.rating) ? parsed.rating : 'warm',
    };

    return {
      data,
      rawContent,
      modelUsed: model,
    };
  } catch (error: any) {
    console.warn('[business-card-ai] AI Vision extraction failed, using safe fallback:', error?.message);
    return {
      data: {
        contactName: '',
        companyName: '',
        jobTitle: '',
        phoneNumber: '',
        email: '',
        address: '',
        website: '',
        notes: `Ekstraksi otomatis perlu peninjauan manual (${error?.message || 'Error parsing'})`,
        category: 'lead',
        rating: 'warm',
      },
      modelUsed: model,
      isMockFallback: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}
