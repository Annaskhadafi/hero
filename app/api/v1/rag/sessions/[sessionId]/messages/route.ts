import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { heroGeniusMessages, heroGeniusSessions } from "@/db/schema";
import { getRagSessionMessages } from "@/lib/hero-genius/client";
import { getServerSession } from "@/lib/auth-session";
import { asc, eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized", messages: [] },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ status: "error", message: "Session ID is required" }, { status: 400 });
    }

    // Verify session ownership if session exists locally
    const [existingSession] = await db
      .select({ userId: heroGeniusSessions.userId })
      .from(heroGeniusSessions)
      .where(eq(heroGeniusSessions.id, sessionId))
      .limit(1);

    if (existingSession && existingSession.userId && existingSession.userId !== userId) {
      return NextResponse.json(
        { status: "error", message: "Forbidden: You do not have access to this session", messages: [] },
        { status: 403 }
      );
    }

    // 1. Try remote RAG endpoint
    try {
      const remoteRes = await getRagSessionMessages(sessionId);
      if (remoteRes && Array.isArray(remoteRes.messages) && remoteRes.messages.length > 0) {
        return NextResponse.json(remoteRes);
      }
    } catch (e) {
      // Fallback to local DB
    }

    // 2. Local database messages
    const messages = await db
      .select()
      .from(heroGeniusMessages)
      .where(eq(heroGeniusMessages.sessionId, sessionId))
      .orderBy(asc(heroGeniusMessages.createdAt));

    return NextResponse.json({
      status: "ok",
      session_id: sessionId,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        latency_ms: m.latencyMs,
        feedback_rating: m.feedbackRating,
        feedback_text: m.feedbackText,
        feedback_correction: m.feedbackCorrection,
        created_at: m.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[GET /api/v1/rag/sessions/:sessionId/messages] error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to retrieve session messages", messages: [] },
      { status: 500 }
    );
  }
}
