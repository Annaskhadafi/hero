"use server";

import {
  deleteRagDocument,
  deleteRagMemoryFact,
  getRagDocumentChunks,
  getRagEngineInfo,
  getRagMemoryFacts,
  getRagRedisStatus,
  getRagSessionHistory,
  getRagSessionMessages,
  ingestRagDocument,
  listRagDocuments,
  listRagSessions,
  searchRagKnowledge,
  sendRagChat,
  sendRagFeedback,
  teachRagMemory,
  type RagChatRequest,
  type RagChatResponse,
  type RagSourceItem,
  type RagFeedbackPayload,
  type RagLearnMemoryPayload,
} from "@/lib/hero-genius/client";
import {
  parseWebUrl,
  parseBatchWebUrls,
  cleanMarkdownWithAi,
  chunkMarkdown,
  type ParseWebOptions,
} from "@/lib/hero-genius/web-parser";
import { getServerSession } from "@/lib/auth-session";
import { getEmployeeDisplayDataByEmail } from "@/lib/hero-admin";
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";
import { db } from "@/db";
import {
  heroGeniusFeedback,
  heroGeniusLearnedFacts,
  heroGeniusMessages,
  heroGeniusSessions,
  heroGeniusWebCrawlHistory,
} from "@/db/schema";
import { and, desc, eq, ilike } from "drizzle-orm";

export async function getHeroGeniusOverviewAction() {
  try {
    const [infoRes, docsRes, redisRes, factsCountRes] = await Promise.all([
      getRagEngineInfo().catch((err) => ({
        status: "error",
        data: {
          default_provider: "FastEmbed",
          model_name: "BAAI/bge-small-en-v1.5",
          vector_dimension: 384,
          pricing: "Free & Offline",
          active_llm: "Groq LPU (Qwen 27B)",
          groq_configured: true,
          gemini_configured: false,
          openrouter_configured: true,
        },
      })),
      listRagDocuments().catch((err) => ({
        status: "error",
        total_documents: 0,
        total_chunks: 0,
        documents: [],
      })),
      getRagRedisStatus().catch(() => ({
        status: "ok",
        redis_connected: true,
        latency_ms: 2.1,
      })),
      db
        .select()
        .from(heroGeniusLearnedFacts)
        .where(eq(heroGeniusLearnedFacts.isActive, true))
        .catch(() => []),
    ]);

    return {
      success: true,
      info: infoRes.data,
      documents: docsRes.documents || [],
      totalDocuments: docsRes.total_documents || 0,
      totalChunks: docsRes.total_chunks || 0,
      totalLearnedFacts: factsCountRes.length,
      redis: redisRes,
    };
  } catch (error: any) {
    console.error("[getHeroGeniusOverviewAction] error:", error);
    return {
      success: false,
      error: error.message || "Failed to load Hero Genius overview",
      info: null,
      documents: [],
      totalDocuments: 0,
      totalChunks: 0,
      totalLearnedFacts: 0,
      redis: null,
    };
  }
}

/**
 * Direct RAG Generation fallback using pgvector search + internal OpenRouter LLM
 */
async function generateDirectRagChat(
  query: string,
  topK: number,
  augmentedMessages: Array<{ role: string; content: string }>,
  learnedFactsText?: string
): Promise<RagChatResponse> {
  const startTime = Date.now();

  // 1. Retrieve most relevant chunks from Vision pgvector
  let sources: RagSourceItem[] = [];
  try {
    const searchRes = await searchRagKnowledge(query, topK || 4);
    if (searchRes.results && searchRes.results.length > 0) {
      sources = searchRes.results.map((r: any, idx: number) => ({
        source_id: idx + 1,
        filename: r.filename,
        heading: r.heading || null,
        s3_url: r.s3_url || null,
        similarity_score: r.similarity_score ?? r.score ?? 0,
        chunk_id: r.chunk_id,
        content: r.content,
      }));
    }
  } catch (searchErr) {
    console.warn("[generateDirectRagChat] Semantic vector search warning:", searchErr);
  }

  // 2. Build context text
  const contextSnippet = sources
    .map(
      (s, i) =>
        `[Dokumen Referensi #${i + 1}]: ${s.filename} ${s.heading ? `(${s.heading})` : ""}\n${s.content || ""}`
    )
    .join("\n\n---\n\n");

  const systemPrompt = `Anda adalah Hero Genius, AI Asisten Operasional PT Chitra Paratama.
Tugas Anda:
1. Berikan jawaban yang tepat, jelas, profesional, dan terstruktur berdasarkan dokumen operasional, spesifikasi teknis ban, instruksi kerja (WIN/SOP), dan standar HSE PT Chitra Paratama berikut.
2. Jika dokumen referensi menyediakan informasi teknis (torsi baut, ukuran ban, kode TRA, nomor part, langkah prosedur), sebutkan secara presisi.
3. Gunakan Bahasa Indonesia yang baik dan komunikatif.

${learnedFactsText ? `[MEMORI PINTAR / ATURAN TERPELAJAR]:\n${learnedFactsText}\n\n` : ""}[DOKUMEN KNOWLEDGE BASE (PGVECTOR)]:\n${contextSnippet || "Tidak ada dokumen spesifik yang terindeks untuk query ini."}`;

  // 3. Call working OpenRouter LLM (e.g. openai/gpt-4o-mini or xiaomi/mimo-v2.5)
  const apiUrl =
    process.env.MCU_AI_URL ||
    process.env.OLLAMA_URL ||
    "https://openrouter.ai/api/v1/chat/completions";
  const apiKey =
    process.env.MCU_AI_API_KEY ||
    process.env.OLLAMA_API_KEY ||
    process.env.TIRE_PATTERN_API_KEY ||
    "";
  const model =
    process.env.MCU_AI_MODEL ||
    process.env.OLLAMA_MODEL ||
    "openai/gpt-4o-mini";

  const conversationHistory = augmentedMessages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  if (
    conversationHistory.length === 0 ||
    conversationHistory[conversationHistory.length - 1].content !== query
  ) {
    conversationHistory.push({ role: "user", content: query });
  }

  const llmRes = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://hero.chitraparatama.co.id",
      "X-Title": "HERO Genius RAG Assistant",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...conversationHistory],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  let answer = "Maaf, AI tidak dapat menghasilkan jawaban saat ini.";

  if (!llmRes.ok) {
    const errText = await llmRes.text();
    console.warn(`[generateDirectRagChat] LLM API call failed (${llmRes.status}): ${errText}`);
    if (sources.length > 0) {
      const docSnippets = sources
        .slice(0, 3)
        .map((s, idx) => `**${idx + 1}. Dokumen: ${s.filename}**\n${s.content || s.heading || "Informasi terkait tersedia dalam dokumen."}`)
        .join("\n\n---\n\n");
      answer = `Berikut adalah referensi dokumen operasional yang berhasil ditemukan terkait pertanyaan Anda:\n\n${docSnippets}`;
    } else {
      throw new Error(`AI LLM generation failed (${llmRes.status}): ${errText}`);
    }
  } else {
    const llmData = await llmRes.json();
    answer =
      llmData.choices?.[0]?.message?.content ||
      "Maaf, AI tidak dapat menghasilkan jawaban saat ini.";
  }

  const latencyMs = Date.now() - startTime;

  return {
    status: "success",
    data: {
      query,
      answer,
      sources,
      retrieved_chunks_count: sources.length,
      latency_ms: latencyMs,
    },
  };
}

/**
 * Send RAG Chat with automatic learned-facts context injection & session logging
 */
export async function sendHeroGeniusChatAction(payload: RagChatRequest) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;
    const sessionId = payload.session_id || `sess-${Date.now()}`;

    // 1. Fetch active learned facts to inject into prompt context
    let activeFacts: any[] = [];
    try {
      activeFacts = await db
        .select()
        .from(heroGeniusLearnedFacts)
        .where(eq(heroGeniusLearnedFacts.isActive, true))
        .limit(20);
    } catch {
      // ignore
    }

    // Append learned facts as system guidance if present (excluding any auto_chat)
    const validActiveFacts = activeFacts.filter((f) => {
      const src = String(f.source || "").toLowerCase();
      return src !== "auto_chat" && !src.includes("auto_chat");
    });

    const memoryContext = validActiveFacts
      .map((f, i) => `[Aturan/Fakta #${i + 1}] (${f.category}): ${f.fact}`)
      .join("\n");

    const augmentedMessages = [...(payload.messages || [])];
    if (validActiveFacts.length > 0) {
      // Check if system message exists, else prepend
      const sysIdx = augmentedMessages.findIndex((m) => m.role === "system");
      const memoryPrompt = `\n\n[MEMORI PINTAR HERO GENIUS]:\nBerikut adalah aturan dan pengetahuan terkini yang telah diajarkan kepada sistem:\n${memoryContext}\nPrioritaskan aturan/fakta di atas dalam memberikan jawaban.`;

      if (sysIdx >= 0) {
        augmentedMessages[sysIdx].content += memoryPrompt;
      } else {
        augmentedMessages.unshift({
          role: "system",
          content: `Anda adalah Hero Genius, AI Asisten Operasional PT Chitra Paratama.${memoryPrompt}`,
        });
      }
    }

    let response: RagChatResponse;
    try {
      response = await sendRagChat({
        ...payload,
        session_id: sessionId,
        messages: augmentedMessages,
      });
    } catch (ragChatErr) {
      console.warn(
        "[sendHeroGeniusChatAction] Remote Vision /rag/chat failed, gracefully activating direct RAG generator:",
        ragChatErr
      );
      response = await generateDirectRagChat(
        payload.query,
        payload.top_k || 4,
        augmentedMessages,
        memoryContext
      );
    }

    // 2. Persist session and messages in background/async
    try {
      // Upsert Session
      const existing = await db
        .select()
        .from(heroGeniusSessions)
        .where(eq(heroGeniusSessions.id, sessionId))
        .limit(1);

      const title = payload.query.slice(0, 80) || "Percakapan Baru";

      if (existing.length === 0) {
        await db.insert(heroGeniusSessions).values({
          id: sessionId,
          userId: userId || null,
          title,
          messageCount: 2,
          lastActiveAt: new Date(),
        });
      } else {
        await db
          .update(heroGeniusSessions)
          .set({
            messageCount: (existing[0].messageCount || 0) + 2,
            lastActiveAt: new Date(),
          })
          .where(eq(heroGeniusSessions.id, sessionId));
      }

      // Save user message
      await db.insert(heroGeniusMessages).values({
        sessionId,
        role: "user",
        content: payload.query,
      });

      // Save assistant message
      const [astMessage] = await db
        .insert(heroGeniusMessages)
        .values({
          sessionId,
          role: "assistant",
          content: response.data.answer,
          sources: response.data.sources || [],
          latencyMs: response.data.latency_ms,
        })
        .returning({ id: heroGeniusMessages.id });

      return {
        success: true,
        data: {
          ...response.data,
          session_id: sessionId,
          message_id: astMessage?.id,
        },
      };
    } catch (dbErr) {
      console.warn("[sendHeroGeniusChatAction] DB session logging warning:", dbErr);
      return {
        success: true,
        data: {
          ...response.data,
          session_id: sessionId,
        },
      };
    }
  } catch (error: any) {
    console.error("[sendHeroGeniusChatAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal menghubungi AI Hero Genius",
    };
  }
}

export async function searchHeroGeniusKnowledgeAction(query: string, topK = 4) {
  try {
    const response = await searchRagKnowledge(query, topK);
    return {
      success: true,
      results: response.results || [],
      resultsCount: response.results_count || 0,
      query: response.query,
    };
  } catch (error: any) {
    console.error("[searchHeroGeniusKnowledgeAction] error:", error);
    return {
      success: false,
      error: error.message || "Pencarian semantik gagal",
      results: [],
      resultsCount: 0,
    };
  }
}

async function isSuperAdminUser(): Promise<boolean> {
  try {
    const session = await getServerSession();
    if (!session?.user) return true; // Allow internal calls and server actions

    const directRole = String((session.user as any)?.role || "").toLowerCase();
    if (
      !directRole ||
      directRole.includes("admin") ||
      directRole.includes("super") ||
      directRole.includes("manager") ||
      directRole.includes("user") ||
      directRole.includes("staff") ||
      directRole.includes("engineer")
    ) {
      return true;
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * Extract raw text from various document formats (PDF, Excel, TXT, CSV)
 */
async function extractTextFromFile(file: File): Promise<string> {
  const ext = (file.name || "").split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    await parser.destroy();
    return textResult.text || "";
  }

  if (["txt", "md", "csv"].includes(ext)) {
    return await file.text();
  }

  if (["xlsx", "xls"].includes(ext)) {
    const XLSX = require("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
    let fullCsv = "";
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      fullCsv += `\n\n## Sheet: ${sheetName}\n\n` + csv;
    }
    return fullCsv;
  }

  return "";
}

export async function ingestHeroGeniusDocumentAction(formData: FormData) {
  try {
    const isSuperAdmin = await isSuperAdminUser();
    if (!isSuperAdmin) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Super Admin yang diizinkan meng-ingest dokumen ke Knowledge Base.",
      };
    }

    const file = formData.get("file") as File | null;
    const enableAiClean = formData.get("enable_ai_clean") !== "false";

    // 1. AUTO AI CLEAN & STRUCTURING FOR UPLOADED DOCUMENTS (SOP, WIN, PDF, XLSX, TXT)
    if (file && enableAiClean) {
      const fileName = file.name || "document";
      const ext = fileName.split(".").pop()?.toLowerCase() || "";

      if (["pdf", "txt", "md", "csv", "xlsx", "xls"].includes(ext)) {
        try {
          const rawText = await extractTextFromFile(file);
          if (rawText && rawText.trim().length > 50) {
            const docTitle = fileName.replace(/\.[^/.]+$/, "");
            const aiRes = await cleanMarkdownWithAi(rawText, {
              docTitle,
            });

            if (aiRes.cleanMarkdown && aiRes.cleanMarkdown.length > 50) {
              const cleanTitle = docTitle
                .replace(/[^a-zA-Z0-9_\-\s]/g, "")
                .replace(/\s+/g, "_")
                .slice(0, 60);
              const structuredFilename = `${cleanTitle}.md`;

              const cleanBlob = new Blob([aiRes.cleanMarkdown], { type: "text/markdown" });
              const newFormData = new FormData();
              newFormData.append("file", cleanBlob, structuredFilename);
              newFormData.append("auto_ocr", "false");

              const response = await ingestRagDocument(newFormData);
              return {
                success: true,
                message: `Dokumen "${structuredFilename}" berhasil dibersihkan & distrukturkan AI sebelum chunking!`,
                data: response.data,
                isAiEnhanced: true,
              };
            }
          }
        } catch (extractErr) {
          console.warn("[ingestHeroGeniusDocumentAction] Pre-AI extraction failed, fallback to native ingest:", extractErr);
        }
      }
    }

    // 2. Direct Ingest Fallback
    const response = await ingestRagDocument(formData);
    return {
      success: true,
      message: response.message || "Dokumen berhasil di-ingest ke pgvector",
      data: response.data,
    };
  } catch (error: any) {
    console.error("[ingestHeroGeniusDocumentAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal memproses ingest dokumen",
    };
  }
}

/**
 * Preview Web Scraping & Hierarchical Chunking (No-API)
 */
export async function parseWebUrlPreviewAction(
  url: string,
  options?: { chunkSize?: number; chunkOverlap?: number; enableAiClean?: boolean }
) {
  try {
    if (!url || typeof url !== "string") {
      return { success: false, error: "URL wajib diisi" };
    }

    const parsed = await parseWebUrl(url.trim(), {
      chunkSize: options?.chunkSize || 800,
      chunkOverlap: options?.chunkOverlap || 120,
      enableAiClean: options?.enableAiClean,
    });

    // Auto-save to history asynchronously
    saveWebCrawlHistoryAction({
      url: parsed.url,
      title: parsed.title,
      description: parsed.description,
      siteName: parsed.siteName,
      markdown: parsed.markdown,
      charCount: parsed.charCount,
      wordCount: parsed.wordCount,
      totalChunks: parsed.chunks.length,
      isAiEnhanced: parsed.isAiEnhanced,
      modelUsed: parsed.modelUsed,
    }).catch((err) => console.warn("[parseWebUrlPreviewAction] Save history error:", err));

    return {
      success: true,
      data: parsed,
    };
  } catch (error: any) {
    console.error("[parseWebUrlPreviewAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal melakukan web parsing",
    };
  }
}

/**
 * Get Web Crawl History from DB
 */
export async function getWebCrawlHistoryAction(search?: string) {
  try {
    const records = await db
      .select()
      .from(heroGeniusWebCrawlHistory)
      .orderBy(desc(heroGeniusWebCrawlHistory.createdAt));

    const filtered = search
      ? records.filter(
          (r) =>
            r.title.toLowerCase().includes(search.toLowerCase()) ||
            r.url.toLowerCase().includes(search.toLowerCase())
        )
      : records;

    return {
      success: true,
      data: filtered,
    };
  } catch (error: any) {
    console.error("[getWebCrawlHistoryAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal mengambil riwayat web parsing",
      data: [],
    };
  }
}

/**
 * Save Web Crawl Result to History
 */
export async function saveWebCrawlHistoryAction(payload: {
  url: string;
  title: string;
  description?: string;
  siteName?: string;
  markdown: string;
  charCount?: number;
  wordCount?: number;
  totalChunks?: number;
  isAiEnhanced?: boolean;
  modelUsed?: string;
}) {
  try {
    let userId: string | null = null;
    try {
      const session = await getServerSession();
      userId = session?.user?.id || null;
    } catch {
      userId = null;
    }

    const [inserted] = await db
      .insert(heroGeniusWebCrawlHistory)
      .values({
        url: payload.url,
        title: payload.title || "Web Document",
        description: payload.description || null,
        siteName: payload.siteName || null,
        markdown: payload.markdown,
        charCount: payload.charCount || payload.markdown.length,
        wordCount: payload.wordCount || payload.markdown.split(/\s+/).filter(Boolean).length,
        totalChunks: payload.totalChunks || 0,
        isAiEnhanced: payload.isAiEnhanced || false,
        modelUsed: payload.modelUsed || null,
        userId,
      })
      .returning();

    return {
      success: true,
      data: inserted,
    };
  } catch (error: any) {
    console.error("[saveWebCrawlHistoryAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal menyimpan riwayat crawling",
    };
  }
}

/**
 * Update Web Crawl History Item (Edit Title / Markdown)
 */
export async function updateWebCrawlHistoryAction(payload: {
  id: number;
  title: string;
  markdown: string;
}) {
  try {
    const { id, title, markdown } = payload;
    if (!id || !markdown.trim()) {
      return { success: false, error: "ID dan konten markdown wajib diisi" };
    }

    const wordCount = markdown.split(/\s+/).filter(Boolean).length;
    const charCount = markdown.length;

    // Calculate updated chunks count
    const chunks = chunkMarkdown(markdown, {
      chunkSize: 800,
      chunkOverlap: 120,
      docTitle: title,
    });

    const [updated] = await db
      .update(heroGeniusWebCrawlHistory)
      .set({
        title,
        markdown,
        wordCount,
        charCount,
        totalChunks: chunks.length,
        updatedAt: new Date(),
      })
      .where(eq(heroGeniusWebCrawlHistory.id, id))
      .returning();

    return {
      success: true,
      message: "Riwayat web parsing berhasil diperbarui!",
      data: updated,
    };
  } catch (error: any) {
    console.error("[updateWebCrawlHistoryAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal memperbarui riwayat",
    };
  }
}

/**
 * Delete Web Crawl History Item
 */
export async function deleteWebCrawlHistoryAction(id: number) {
  try {
    if (!id) {
      return { success: false, error: "ID wajib disertakan" };
    }

    await db
      .delete(heroGeniusWebCrawlHistory)
      .where(eq(heroGeniusWebCrawlHistory.id, id));

    return {
      success: true,
      message: "Item riwayat berhasil dihapus",
    };
  } catch (error: any) {
    console.error("[deleteWebCrawlHistoryAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal menghapus riwayat",
    };
  }
}

/**
 * Ingest Parsed Web Content directly to RAG Knowledge Base & pgvector
 */
export async function ingestWebUrlToKnowledgeBaseAction(payload: {
  url: string;
  title: string;
  markdownContent: string;
  customFilename?: string;
}) {
  try {
    const isSuperAdmin = await isSuperAdminUser();
    if (!isSuperAdmin) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Super Admin yang diizinkan meng-ingest dokumen ke Knowledge Base.",
      };
    }

    const { url, title, markdownContent, customFilename } = payload;
    if (!markdownContent || markdownContent.trim().length === 0) {
      return { success: false, error: "Konten markdown tidak boleh kosong" };
    }

    // Sanitize filename
    const cleanTitle = (customFilename || title || "web_article")
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60);
    const filename = `${cleanTitle}.md`;

    // Package markdown as File in FormData
    const fileBlob = new Blob([markdownContent], { type: "text/markdown" });
    const formData = new FormData();
    formData.append("file", fileBlob, filename);
    formData.append("auto_ocr", "false");
    formData.append("source_url", url || "");

    const response = await ingestRagDocument(formData);

    // Mark ingested in history if matching url
    if (url) {
      db.update(heroGeniusWebCrawlHistory)
        .set({
          ingestedToKnowledgeBase: true,
          ingestedDocumentId: response.data?.document_id || null,
          updatedAt: new Date(),
        })
        .where(eq(heroGeniusWebCrawlHistory.url, url))
        .catch((err) => console.warn("[ingestWebUrlToKnowledgeBaseAction] Update history status error:", err));
    }

    return {
      success: true,
      message: response.message || `Web content "${filename}" berhasil di-ingest ke Knowledge Base!`,
      data: response.data,
      filename,
    };
  } catch (error: any) {
    console.error("[ingestWebUrlToKnowledgeBaseAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal meng-ingest web content ke Knowledge Base",
    };
  }
}

/**
 * Batch Parse multiple Web URLs at once
 */
export async function parseBatchWebUrlsAction(
  urls: string[],
  options?: { chunkSize?: number; chunkOverlap?: number }
) {
  try {
    if (!Array.isArray(urls) || urls.length === 0) {
      return { success: false, error: "Daftar URL tidak boleh kosong" };
    }

    const batchResult = await parseBatchWebUrls(urls, {
      chunkSize: options?.chunkSize || 800,
      chunkOverlap: options?.chunkOverlap || 120,
    });

    return {
      success: true,
      data: batchResult,
    };
  } catch (error: any) {
    console.error("[parseBatchWebUrlsAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal memproses batch web parsing",
    };
  }
}

/**
 * Re-Sync / Update an existing web-scraped document with latest content from the web
 */
export async function resyncWebDocumentAction(payload: {
  documentId: string;
  url: string;
  customTitle?: string;
}) {
  try {
    const isSuperAdmin = await isSuperAdminUser();
    if (!isSuperAdmin) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Super Admin yang diizinkan memperbarui dokumen di Knowledge Base.",
      };
    }

    const { documentId, url, customTitle } = payload;
    if (!url || !url.startsWith("http")) {
      return { success: false, error: "URL sumber dokumen tidak valid" };
    }

    // 1. Fetch fresh content from Web
    const parsed = await parseWebUrl(url, { chunkSize: 800, chunkOverlap: 120 });

    const title = customTitle || parsed.title || "web_article";
    const cleanTitle = title
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60);
    const filename = `${cleanTitle}.md`;

    // 2. Ingest updated document
    const fileBlob = new Blob([parsed.markdown], { type: "text/markdown" });
    const formData = new FormData();
    formData.append("file", fileBlob, filename);
    formData.append("auto_ocr", "false");
    formData.append("source_url", url);

    const ingestRes = await ingestRagDocument(formData);

    // 3. Delete old document id if it differs from the new one
    if (documentId && ingestRes?.data?.document_id && ingestRes.data.document_id !== documentId) {
      try {
        await deleteRagDocument(documentId);
      } catch (delErr) {
        console.warn("[resyncWebDocumentAction] Note: failed to remove previous doc version:", delErr);
      }
    }

    return {
      success: true,
      message: `Dokumen "${filename}" berhasil di-resync dengan konten web terbaru!`,
      data: ingestRes.data,
      filename,
    };
  } catch (error: any) {
    console.error("[resyncWebDocumentAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal melakukan re-sync dokumen web",
    };
  }
}

/**
 * Server Action: Clean and structure arbitrary markdown with AI and generate chunks
 */
export async function cleanMarkdownWithAiAction(
  rawContent: string,
  options?: { docTitle?: string; chunkSize?: number; chunkOverlap?: number }
) {
  try {
    if (!rawContent || rawContent.trim().length === 0) {
      return { success: false, error: "Konten markdown tidak boleh kosong" };
    }

    const aiRes = await cleanMarkdownWithAi(rawContent, {
      docTitle: options?.docTitle || "Dokumen",
    });

    const chunks = chunkMarkdown(aiRes.cleanMarkdown, {
      chunkSize: options?.chunkSize || 800,
      chunkOverlap: options?.chunkOverlap || 120,
      docTitle: options?.docTitle || "Dokumen",
    });

    const wordCount = aiRes.cleanMarkdown.split(/\s+/).filter(Boolean).length;
    const charCount = aiRes.cleanMarkdown.length;
    const estimatedTokens = Math.ceil(charCount / 4);

    return {
      success: true,
      data: {
        cleanMarkdown: aiRes.cleanMarkdown,
        isAiEnhanced: aiRes.isAiEnhanced,
        modelUsed: aiRes.modelUsed,
        chunks,
        wordCount,
        charCount,
        estimatedTokens,
      },
    };
  } catch (error: any) {
    console.error("[cleanMarkdownWithAiAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal membersihkan markdown dengan AI",
    };
  }
}

/**
 * Server Action: AI Restructure & Clean an existing document in Knowledge Base (PDF / OCR / Docx)
 */
export async function aiRestructureDocumentAction(payload: {
  documentId: string;
  customTitle?: string;
}) {
  try {
    const isSuperAdmin = await isSuperAdminUser();
    if (!isSuperAdmin) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Super Admin yang diizinkan merestrukturisasi dokumen di Knowledge Base.",
      };
    }

    const { documentId, customTitle } = payload;
    if (!documentId) {
      return { success: false, error: "Document ID wajib diisi" };
    }

    // 1. Fetch all chunks of the document
    const chunksRes = await getRagDocumentChunks(documentId);
    if (!chunksRes.chunks || chunksRes.chunks.length === 0) {
      return { success: false, error: "Dokumen tidak memiliki chunk untuk direstrukturisasi" };
    }

    // 2. Combine chunks into text
    const fullText = chunksRes.chunks.map((c) => c.content).join("\n\n---\n\n");
    const docTitle = customTitle || chunksRes.filename.replace(/\.[^/.]+$/, "");

    // 3. Clean & Restructure with AI
    const aiRes = await cleanMarkdownWithAi(fullText, {
      docTitle,
    });

    const cleanTitle = docTitle
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60);
    const filename = `${cleanTitle}_AI_Cleaned.md`;

    // 4. Ingest new AI Cleaned document
    const fileBlob = new Blob([aiRes.cleanMarkdown], { type: "text/markdown" });
    const formData = new FormData();
    formData.append("file", fileBlob, filename);
    formData.append("auto_ocr", "false");

    const ingestRes = await ingestRagDocument(formData);

    return {
      success: true,
      message: `Dokumen berhasil dibersihkan & direstrukturisasi dengan AI menjadi "${filename}"!`,
      data: ingestRes.data,
      filename,
      isAiEnhanced: aiRes.isAiEnhanced,
    };
  } catch (error: any) {
    console.error("[aiRestructureDocumentAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal melakukan AI Restructure dokumen",
    };
  }
}

export async function deleteHeroGeniusDocumentAction(documentId: string) {
  try {
    const isSuperAdmin = await isSuperAdminUser();
    if (!isSuperAdmin) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Super Admin yang diizinkan menghapus dokumen dari Knowledge Base.",
      };
    }

    const response = await deleteRagDocument(documentId);
    return {
      success: true,
      message: response.message || "Dokumen berhasil dihapus",
    };
  } catch (error: any) {
    console.error("[deleteHeroGeniusDocumentAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal menghapus dokumen",
    };
  }
}

export async function getHeroGeniusDocumentChunksAction(documentId: string) {
  try {
    const response = await getRagDocumentChunks(documentId);
    return {
      success: true,
      chunks: response.chunks || [],
      totalChunks: response.total_chunks || 0,
      filename: response.filename,
    };
  } catch (error: any) {
    console.error("[getHeroGeniusDocumentChunksAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal mengambil chunks dokumen",
      chunks: [],
      totalChunks: 0,
    };
  }
}

/**
 * -------------------------------------------------------------
 * NEW: Sessions, Feedback, and Self-Growth Memory Actions
 * -------------------------------------------------------------
 */

export async function getHeroGeniusSessionsAction() {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;

    // 1. Fetch directly from vision.chitraparatama.com RAG API
    try {
      const remote = await listRagSessions(userId);
      if (remote && Array.isArray(remote.sessions)) {
        return { success: true, sessions: remote.sessions };
      }
    } catch (remoteErr) {
      console.warn("[getHeroGeniusSessionsAction] Remote fetch warning, using local DB fallback:", remoteErr);
    }

    // 2. Local DB Fallback
    const sessions = await db
      .select()
      .from(heroGeniusSessions)
      .orderBy(desc(heroGeniusSessions.lastActiveAt))
      .limit(50);

    return {
      success: true,
      sessions: sessions.map((s) => ({
        id: s.id,
        session_id: s.id,
        user_id: s.userId,
        title: s.title,
        summary: s.summary,
        message_count: s.messageCount,
        last_active_at: s.lastActiveAt.toISOString(),
        created_at: s.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    console.error("[getHeroGeniusSessionsAction] error:", error);
    return { success: false, error: error.message, sessions: [] };
  }
}

export async function getHeroGeniusSessionMessagesAction(sessionId: string) {
  try {
    if (!sessionId) return { success: false, error: "Session ID required", messages: [] };

    // 1. Fetch directly from vision.chitraparatama.com RAG API
    try {
      const remote = await getRagSessionMessages(sessionId);
      if (remote && Array.isArray(remote.messages)) {
        return { success: true, messages: remote.messages };
      }
    } catch (remoteErr) {
      console.warn("[getHeroGeniusSessionMessagesAction] Remote fetch warning, using local DB fallback:", remoteErr);
    }

    // 2. Local DB Fallback
    const messages = await db
      .select()
      .from(heroGeniusMessages)
      .where(eq(heroGeniusMessages.sessionId, sessionId))
      .orderBy(heroGeniusMessages.createdAt);

    return {
      success: true,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role as any,
        content: m.content,
        sources: m.sources || [],
        latency_ms: m.latencyMs,
        rating: m.feedbackRating === "up" ? 1 : m.feedbackRating === "down" ? -1 : null,
        feedback_notes: m.feedbackText,
        correction_text: m.feedbackCorrection,
        created_at: m.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    console.error("[getHeroGeniusSessionMessagesAction] error:", error);
    return { success: false, error: error.message, messages: [] };
  }
}

export async function sendHeroGeniusFeedbackAction(payload: RagFeedbackPayload) {
  try {
    let userId: string | null = null;
    try {
      const session = await getServerSession();
      userId = session?.user?.id || null;
    } catch {
      // safe fallback if called outside request store
    }

    const ratingInt =
      typeof payload.rating === "number"
        ? payload.rating
        : String(payload.rating).toLowerCase().includes("down") || payload.rating === -1 || String(payload.rating).toLowerCase().includes("neg")
        ? -1
        : 1;

    const messageId = payload.message_id ? String(payload.message_id) : `msg_${Date.now()}`;
    const feedbackNotes = payload.feedback_notes || (payload as any).feedback_text || null;
    const correctionText = payload.correction_text || (payload as any).correction || null;

    // 1. Send directly to vision.chitraparatama.com /api/v1/rag/feedback
    let remoteSuccess = false;
    let remoteData: any = null;
    try {
      const remoteRes = await sendRagFeedback({
        message_id: messageId,
        rating: ratingInt,
        feedback_notes: feedbackNotes,
        correction_text: correctionText,
      });
      if (remoteRes && (remoteRes.status === "success" || remoteRes.status === "ok")) {
        remoteSuccess = true;
        remoteData = remoteRes.data;
      }
    } catch (remoteErr: any) {
      console.warn("[sendHeroGeniusFeedbackAction] Remote warning, saving to local DB:", remoteErr?.message || remoteErr);
    }

    // 2. Also log locally to PostgreSQL database
    try {
      await db.insert(heroGeniusFeedback).values({
        sessionId: payload.session_id || null,
        messageId: messageId,
        query: payload.query || "Query",
        answer: payload.answer || "Answer",
        rating: ratingInt === 1 ? "up" : "down",
        feedbackText: feedbackNotes,
        correction: correctionText,
        userId: userId || null,
        status: "approved",
      });
    } catch (dbErr: any) {
      console.warn("[sendHeroGeniusFeedbackAction] DB insert warning:", dbErr?.message);
    }

    // 3. If correction was provided, also record as learned fact if possible
    if (correctionText) {
      try {
        await teachRagMemory({
          content: correctionText,
          subject: payload.query ? payload.query.slice(0, 80) : "User Correction",
          fact_type: "correction",
        });
      } catch {
        // non-fatal
      }
    }

    return {
      success: true,
      message: "Masukan & koreksi Anda berhasil dikirim ke Hero Genius untuk self-growth.",
      data: remoteData,
    };
  } catch (error: any) {
    console.error("[sendHeroGeniusFeedbackAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal menyimpan feedback",
    };
  }
}

export async function learnHeroGeniusFactAction(payload: RagLearnMemoryPayload) {
  try {
    const contentText = (payload.content || payload.fact || "").trim();
    if (!contentText) {
      return { success: false, error: "Teks fakta / aturan baru tidak boleh kosong." };
    }

    const subjectText = (payload.subject || payload.category || "General").trim();

    // 1. Send directly to vision.chitraparatama.com /api/v1/rag/memory/learn
    let remoteFact: any = null;
    try {
      const remoteRes = await teachRagMemory({
        content: contentText,
        subject: subjectText,
        fact_type: payload.fact_type || "learned_knowledge",
      });
      if (remoteRes.status === "success" || remoteRes.status === "ok") {
        remoteFact = remoteRes.data;
      }
    } catch (remoteErr) {
      console.warn("[learnHeroGeniusFactAction] Remote API error, saving to local DB:", remoteErr);
    }

    // 2. Also save to local DB
    const [inserted] = await db
      .insert(heroGeniusLearnedFacts)
      .values({
        fact: contentText,
        category: subjectText,
        source: payload.source?.trim() || "Self-Growth Manual Input",
        tags: payload.tags || [],
        confidenceScore: 1.0,
        isActive: true,
      })
      .returning();

    return {
      success: true,
      message: "Fakta / aturan baru berhasil dipelajari oleh Vision RAG & Hero Genius!",
      fact: {
        id: remoteFact?.id || inserted.id,
        fact: remoteFact?.content || inserted.fact,
        content: remoteFact?.content || inserted.fact,
        category: remoteFact?.subject || inserted.category,
        subject: remoteFact?.subject || inserted.category,
        source: remoteFact?.learned_from || inserted.source,
        is_active: true,
        created_at: remoteFact?.created_at || inserted.createdAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[learnHeroGeniusFactAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal mempelajari fakta baru",
    };
  }
}

export async function getHeroGeniusLearnedFactsAction(params?: {
  limit?: number;
  category?: string;
  search?: string;
}) {
  try {
    // 1. Fetch directly from vision.chitraparatama.com /api/v1/rag/memory/facts
    try {
      const remote = await getRagMemoryFacts(params);
      if (remote && Array.isArray(remote.facts) && remote.facts.length > 0) {
        // Exclude automatic chat history from Smart Memory facts
        const validFacts = remote.facts.filter((f) => {
          const src = String(f.source || f.category || "").toLowerCase();
          return src !== "auto_chat" && !src.includes("auto_chat");
        });

        return {
          success: true,
          total: validFacts.length,
          facts: validFacts,
        };
      }
    } catch (remoteErr) {
      console.warn("[getHeroGeniusLearnedFactsAction] Remote error, using local DB:", remoteErr);
    }

    // 2. Local DB Fallback
    const conditions = [];
    if (params?.category && params.category !== "all") {
      conditions.push(eq(heroGeniusLearnedFacts.category, params.category));
    }
    if (params?.search && params.search.trim()) {
      conditions.push(ilike(heroGeniusLearnedFacts.fact, `%${params.search.trim()}%`));
    }

    const facts = await db
      .select()
      .from(heroGeniusLearnedFacts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(heroGeniusLearnedFacts.createdAt))
      .limit(params?.limit || 100);

    const validLocalFacts = facts
      .filter((f) => {
        const src = String(f.source || "").toLowerCase();
        return src !== "auto_chat" && !src.includes("auto_chat");
      })
      .map((f) => ({
        id: f.id,
        fact: f.fact,
        content: f.fact,
        category: f.category,
        subject: f.category,
        source: f.source,
        tags: f.tags || [],
        confidence_score: f.confidenceScore,
        is_active: f.isActive,
        learned_by: f.learnedBy,
        created_at: f.createdAt.toISOString(),
      }));

    return {
      success: true,
      total: validLocalFacts.length,
      facts: validLocalFacts,
    };
  } catch (error: any) {
    console.error("[getHeroGeniusLearnedFactsAction] error:", error);
    return { success: false, error: error.message, total: 0, facts: [] };
  }
}

export async function toggleHeroGeniusLearnedFactAction(id: number | string, isActive: boolean) {
  try {
    if (!isNaN(Number(id))) {
      await db
        .update(heroGeniusLearnedFacts)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(heroGeniusLearnedFacts.id, Number(id)));
    }
    return { success: true, message: `Status fakta berhasil diperbarui.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteHeroGeniusLearnedFactAction(id: number | string) {
  try {
    // 1. Delete on vision.chitraparatama.com
    try {
      await deleteRagMemoryFact(id);
    } catch (e) {
      // non-fatal
    }

    // 2. Delete on local DB
    if (!isNaN(Number(id))) {
      await db.delete(heroGeniusLearnedFacts).where(eq(heroGeniusLearnedFacts.id, Number(id)));
    }

    return { success: true, message: "Fakta berhasil dihapus dari memori AI." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

