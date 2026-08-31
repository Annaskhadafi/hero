import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { heroGeniusFeedback, heroGeniusMessages } from "@/db/schema";
import { sendRagFeedback } from "@/lib/hero-genius/client";
import { getServerSession } from "@/lib/auth-session";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;
    const body = await req.json();

    const {
      session_id,
      message_id,
      query,
      answer,
      rating,
      feedback_text,
      correction,
    } = body;

    if (!query || !answer || !rating) {
      return NextResponse.json(
        { status: "error", message: "Query, answer, and rating are required." },
        { status: 400 }
      );
    }

    const ratingNormalized = String(rating).toLowerCase().includes("down") || rating === -1 || String(rating).toLowerCase().includes("neg")
      ? "down"
      : "up";

    // 1. Try remote RAG endpoint
    let remoteId: any = null;
    try {
      const remoteRes = await sendRagFeedback({
        session_id,
        message_id: message_id ? String(message_id) : 'msg-1',
        query,
        answer,
        rating: ratingNormalized === "up" ? 1 : -1,
        feedback_notes: feedback_text,
        correction_text: correction,
        user_id: userId,
      });
      remoteId = (remoteRes as any).feedback_id || (remoteRes as any).data?.message_id;
    } catch (e) {
      // Continue to local save
    }

    // 2. Save feedback to local DB for self-growth dataset
    const inserted = await db
      .insert(heroGeniusFeedback)
      .values({
        sessionId: session_id || null,
        messageId: message_id ? String(message_id) : null,
        query,
        answer,
        rating: ratingNormalized,
        feedbackText: feedback_text || null,
        correction: correction || null,
        userId: userId || null,
        status: "pending",
      })
      .returning({ id: heroGeniusFeedback.id });

    // 3. Update message row if message_id is provided
    if (message_id && !isNaN(Number(message_id))) {
      try {
        await db
          .update(heroGeniusMessages)
          .set({
            feedbackRating: ratingNormalized,
            feedbackText: feedback_text || null,
            feedbackCorrection: correction || null,
          })
          .where(eq(heroGeniusMessages.id, Number(message_id)));
      } catch (err) {
        // non-fatal
      }
    }

    return NextResponse.json({
      status: "ok",
      message: "Feedback dan masukan koreksi berhasil disimpan untuk pembelajaran mandiri (self-growth) Hero Genius.",
      feedback_id: inserted[0]?.id || remoteId,
    });
  } catch (error: any) {
    console.error("[POST /api/v1/rag/feedback] error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
