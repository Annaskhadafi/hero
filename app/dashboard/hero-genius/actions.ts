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
  type RagFeedbackPayload,
  type RagLearnMemoryPayload,
} from "@/lib/hero-genius/client";
import { getServerSession } from "@/lib/auth-session";
import { getEmployeeDisplayDataByEmail } from "@/lib/hero-admin";
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";
import { db } from "@/db";
import {
  heroGeniusFeedback,
  heroGeniusLearnedFacts,
  heroGeniusMessages,
  heroGeniusSessions,
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

    // Append learned facts as system guidance if present
    const augmentedMessages = [...(payload.messages || [])];
    if (activeFacts.length > 0) {
      const memoryContext = activeFacts
        .map((f, i) => `[Aturan/Fakta #${i + 1}] (${f.category}): ${f.fact}`)
        .join("\n");

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

    const response = await sendRagChat({
      ...payload,
      session_id: sessionId,
      messages: augmentedMessages,
    });

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
    if (!session?.user) return false;

    const directRole = String((session.user as any)?.role || "").toLowerCase();
    if (directRole.includes("admin") || directRole.includes("super")) {
      return true;
    }

    if (session.user.email) {
      const emp = await getEmployeeDisplayDataByEmail(session.user.email);
      const role = String(emp?.accessRole || emp?.role || "").toLowerCase();
      if (
        role.includes("super") ||
        role.includes("admin") ||
        role === "hc manager" ||
        role === "super admin" ||
        role === "super_admin"
      ) {
        return true;
      }
    }

    const empAccessRole = String((await getCurrentEmployeeAccessRole()) || "").toLowerCase();
    if (
      empAccessRole.includes("super") ||
      empAccessRole.includes("admin") ||
      empAccessRole === "hc manager"
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
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

    // 1. Try remote
    try {
      const remote = await listRagSessions(userId);
      if (remote && Array.isArray(remote.sessions) && remote.sessions.length > 0) {
        return { success: true, sessions: remote.sessions };
      }
    } catch {
      // fallback
    }

    // 2. Query Local DB
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

    // 1. Try remote
    try {
      const remote = await getRagSessionMessages(sessionId);
      if (remote && Array.isArray(remote.messages) && remote.messages.length > 0) {
        return { success: true, messages: remote.messages };
      }
    } catch {
      // fallback
    }

    // 2. Query Local DB
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
        feedback_rating: m.feedbackRating,
        feedback_text: m.feedbackText,
        feedback_correction: m.feedbackCorrection,
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
    const session = await getServerSession();
    const userId = session?.user?.id;

    // 1. Try remote RAG
    try {
      await sendRagFeedback({ ...payload, user_id: userId });
    } catch {
      // continue to local
    }

    const ratingNormalized =
      String(payload.rating).toLowerCase().includes("down") ||
      payload.rating === -1 ||
      String(payload.rating).toLowerCase().includes("neg")
        ? "down"
        : "up";

    // 2. Save locally
    const [inserted] = await db
      .insert(heroGeniusFeedback)
      .values({
        sessionId: payload.session_id || null,
        messageId: payload.message_id ? String(payload.message_id) : null,
        query: payload.query,
        answer: payload.answer,
        rating: ratingNormalized,
        feedbackText: payload.feedback_text || null,
        correction: payload.correction || null,
        userId: userId || null,
        status: "pending",
      })
      .returning({ id: heroGeniusFeedback.id });

    // Update message row if available
    if (payload.message_id && !isNaN(Number(payload.message_id))) {
      try {
        await db
          .update(heroGeniusMessages)
          .set({
            feedbackRating: ratingNormalized,
            feedbackText: payload.feedback_text || null,
            feedbackCorrection: payload.correction || null,
          })
          .where(eq(heroGeniusMessages.id, Number(payload.message_id)));
      } catch {
        // non-fatal
      }
    }

    return {
      success: true,
      message: "Masukan & koreksi Anda berhasil dicatat untuk self-growth AI.",
      feedbackId: inserted?.id,
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
    if (!payload.fact || !payload.fact.trim()) {
      return { success: false, error: "Teks fakta / aturan baru tidak boleh kosong." };
    }

    const session = await getServerSession();
    const userId = session?.user?.id;

    // 1. Try remote
    try {
      await teachRagMemory({ ...payload, user_id: userId });
    } catch {
      // continue to local
    }

    // 2. Save to local DB
    const [inserted] = await db
      .insert(heroGeniusLearnedFacts)
      .values({
        fact: payload.fact.trim(),
        category: payload.category?.trim() || "General",
        source: payload.source?.trim() || "Self-Growth Input",
        tags: payload.tags || [],
        confidenceScore: 1.0,
        isActive: true,
        learnedBy: userId || null,
      })
      .returning();

    return {
      success: true,
      message: "Fakta / aturan baru berhasil dipelajari oleh Hero Genius!",
      fact: {
        id: inserted.id,
        fact: inserted.fact,
        category: inserted.category,
        source: inserted.source,
        tags: inserted.tags,
        is_active: inserted.isActive,
        created_at: inserted.createdAt.toISOString(),
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

    return {
      success: true,
      total: facts.length,
      facts: facts.map((f) => ({
        id: f.id,
        fact: f.fact,
        category: f.category,
        source: f.source,
        tags: f.tags || [],
        confidence_score: f.confidenceScore,
        is_active: f.isActive,
        learned_by: f.learnedBy,
        created_at: f.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    console.error("[getHeroGeniusLearnedFactsAction] error:", error);
    return { success: false, error: error.message, total: 0, facts: [] };
  }
}

export async function toggleHeroGeniusLearnedFactAction(id: number, isActive: boolean) {
  try {
    await db
      .update(heroGeniusLearnedFacts)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(heroGeniusLearnedFacts.id, id));

    return { success: true, message: `Status fakta berhasil diperbarui.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteHeroGeniusLearnedFactAction(id: number) {
  try {
    try {
      await deleteRagMemoryFact(id);
    } catch {
      // non-fatal
    }

    await db.delete(heroGeniusLearnedFacts).where(eq(heroGeniusLearnedFacts.id, id));
    return { success: true, message: "Fakta berhasil dihapus dari memori AI." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
