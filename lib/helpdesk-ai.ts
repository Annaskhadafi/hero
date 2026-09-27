import { db } from '@/db'
import { heroHelpdeskSettings, heroTicketCategories } from '@/db/schema/helpdesk'
import { eq } from 'drizzle-orm'

export interface HelpdeskAiContext {
  ticketNumber: string
  title: string
  categoryName: string
  customerName: string
  siteName: string
  messageHistory: Array<{
    senderType: 'customer' | 'bot' | 'hero_agent' | 'system'
    senderName?: string
    message: string
  }>
  newUserMessage: string
}

export interface HelpdeskAiResult {
  reply: string
  shouldEscalate: boolean
  escalationReason?: string
  summary?: string
  tokensUsed?: number
}

function getAiConfig() {
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase()

  let rawUrl =
    process.env.OPENAI_BASE_URL ||
    process.env.OLLAMA_API_URL ||
    process.env.OLLAMA_URL ||
    'https://openrouter.ai/api/v1'

  rawUrl = rawUrl.trim()
  if (rawUrl.endsWith('/')) {
    rawUrl = rawUrl.slice(0, -1)
  }
  const apiUrl = rawUrl.endsWith('/chat/completions')
    ? rawUrl
    : `${rawUrl}/chat/completions`

  const apiKey = (
    process.env.OPENAI_API_KEY ||
    process.env.OLLAMA_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    ''
  ).trim()

  const model =
    process.env.OPENAI_MODEL ||
    process.env.OLLAMA_MODEL ||
    'cx/gpt-5.6-luna'

  return { apiUrl, apiKey, model, provider }
}

export async function generateHelpdeskAiResponse(
  context: HelpdeskAiContext,
): Promise<HelpdeskAiResult> {
  const [settings] = await db.select().from(heroHelpdeskSettings).limit(1)

  const isAiActive = settings ? settings.aiEnabled : true
  if (!isAiActive) {
    return {
      reply:
        'Terima kasih telah menghubungi kami. Pesan Anda telah diterima dan akan segera direspons oleh tim HERO.',
      shouldEscalate: true,
      escalationReason: 'AI Assistant sedang dinonaktifkan.',
    }
  }

  // Check auto-escalation keywords
  const keywords: string[] = settings?.autoEscalateKeywords || [
    'kecelakaan',
    'darurat',
    'urgent',
    'bahaya',
    'kebakaran',
    'tumpahan',
    'breakdown',
    'manusia',
    'petugas',
    'staf',
    'bicara',
  ]

  const lowerMsg = context.newUserMessage.toLowerCase()
  const matchedKeyword = keywords.find((kw) => lowerMsg.includes(kw.toLowerCase()))

  const systemPrompt =
    settings?.aiSystemPrompt ||
    `Anda adalah Asisten AI Helpdesk Chitra Paratama yang bertugas melayani keluhan dan pertanyaan customer di portal Maestro. Berikan jawaban yang ramah, sopan, solutif, empatik, dan profesional. Tanyakan informasi rinci jika keluhan membutuhkan data spesifik (nomor unit, lokasi site, foto bukti).`

  const instructionPrompt = `
Konteks Tiket:
- Nomor Tiket: ${context.ticketNumber}
- Judul: ${context.title}
- Kategori: ${context.categoryName}
- Nama Customer: ${context.customerName}
- Site / Lokasi: ${context.siteName}

Aturan Penjawab:
1. Respon dalam Bahasa Indonesia yang profesional dan solutif.
2. Jika masalah tergolong mendesak, bahaya keselamatan, breakdown operasional fatal, atau user secara eksplisit ingin bicara dengan manusia, set flag "shouldEscalate": true dengan alasan yang jelas di "escalationReason".
3. Berikan ringkasan keluhan (1-2 kalimat) di field "summary" yang berguna bagi staf HERO saat mengambil alih tiket.
4. Format output HARUS berupa JSON murni tanpa markdown wrapper:
{
  "reply": "string jawaban untuk customer",
  "shouldEscalate": boolean,
  "escalationReason": "string alasan jika shouldEscalate true, atau null jika false",
  "summary": "string ringkasan masalah untuk petugas HERO"
}
`

  // Format message history for LLM
  const formattedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: `${systemPrompt}\n\n${instructionPrompt}` },
  ]

  for (const hist of context.messageHistory) {
    if (hist.senderType === 'customer') {
      formattedMessages.push({ role: 'user', content: hist.message })
    } else if (hist.senderType === 'bot' || hist.senderType === 'hero_agent') {
      formattedMessages.push({ role: 'assistant', content: hist.message })
    }
  }

  formattedMessages.push({ role: 'user', content: context.newUserMessage })

  const { apiUrl, apiKey, model: envModel } = getAiConfig()
  const model = envModel || settings?.aiModel || 'cx/gpt-5.6-luna'

  if (!apiKey) {
    // Graceful fallback if API key is not yet set
    console.warn('[Helpdesk AI] API Key not set, using fallback smart rule')
    const wantsHuman = !!matchedKeyword || lowerMsg.includes('bantuan') || lowerMsg.includes('operator')
    return {
      reply: wantsHuman
        ? 'Keluhan Anda telah kami catat dengan prioritas tinggi. Tiket ini sedang kami teruskan ke tim spesialis HERO yang bertugas di lokasi Anda. Mohon tunggu sebentar, petugas kami akan segera membalas di thread ini.'
        : `Halo Bapak/Ibu dari ${context.customerName}, terima kasih atas informasinya terkait "${context.title}". Mohon pastikan foto/dokumen pendukung sudah terlampir agar tim kami dapat memverifikasi kendala ini secepatnya. Jika ada info tambahan mengenai nomor unit atau kondisi lapangan, silakan kirimkan di sini ya.`,
      shouldEscalate: wantsHuman,
      escalationReason: wantsHuman ? `Terdeteksi indikasi kebutuhan bantuan langsung/urgensi: ${matchedKeyword || 'permintaan eskalasi'}` : undefined,
      summary: `Customer melaporkan masalah terkait ${context.categoryName} di site ${context.siteName}: ${context.title}.`,
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
        'X-Title': 'HERO Maestro Helpdesk AI',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: 0.3,
        max_tokens: 1024,
      }),
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text()
      console.error('[Helpdesk AI] Response error:', response.status, errText)
      throw new Error(`AI API error: ${response.status}`)
    }

    const resJson = await response.json()
    const rawContent =
      resJson.choices?.[0]?.message?.content || resJson.message?.content || '{}'
    const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed: any = {}
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start >= 0 && end > start) {
        parsed = JSON.parse(cleaned.slice(start, end + 1))
      }
    }

    const shouldEscalate = Boolean(parsed.shouldEscalate || matchedKeyword)
    return {
      reply:
        parsed.reply ||
        'Pesan Anda telah kami terima dan tim kami sedang menganalisis kendala tersebut.',
      shouldEscalate,
      escalationReason:
        parsed.escalationReason ||
        (matchedKeyword ? `Terdeteksi kata kunci krisis: ${matchedKeyword}` : undefined),
      summary: parsed.summary || `Tiket ${context.ticketNumber}: ${context.title}`,
      tokensUsed: resJson.usage?.total_tokens,
    }
  } catch (error) {
    console.error('[Helpdesk AI] Error invoking LLM:', error)
    // Safe graceful fallback
    const wantsHuman = !!matchedKeyword
    return {
      reply:
        'Terima kasih telah menyampaikan keluhan ini. Sistem kami telah mencatat tiket Anda dan saat ini sedang meneruskannya ke petugas terkait di HERO. Mohon ditunggu, staf kami akan segera menghubungi Anda.',
      shouldEscalate: true,
      escalationReason: 'Fallback sistem / auto-escalate error',
      summary: `Tiket ${context.ticketNumber}: ${context.title}`,
    }
  }
}
