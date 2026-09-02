import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { heroGeniusSessions } from "@/db/schema";
import { listRagSessions } from "@/lib/hero-genius/client";
import { getServerSession } from "@/lib/auth-session";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized", sessions: [] },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // 1. Try remote RAG endpoint scoped to logged-in user
    try {
      const remoteRes = await listRagSessions(userId);
      if (remoteRes && Array.isArray(remoteRes.sessions) && remoteRes.sessions.length > 0) {
        return NextResponse.json(remoteRes);
      }
    } catch (e) {
      // Fallback to local DB
    }

    // 2. Local database sessions scoped strictly to logged-in user
    const sessions = await db
      .select()
      .from(heroGeniusSessions)
      .where(eq(heroGeniusSessions.userId, userId))
      .orderBy(desc(heroGeniusSessions.lastActiveAt))
      .limit(50);

    return NextResponse.json({
      status: "ok",
      total: sessions.length,
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
    });
  } catch (error: any) {
    console.error("[GET /api/v1/rag/sessions] error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to retrieve sessions", sessions: [] },
      { status: 500 }
    );
  }
}
