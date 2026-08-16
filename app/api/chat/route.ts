import { NextRequest, NextResponse } from "next/server";
import { sendRagChat } from "@/lib/hero-genius/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    const query = body.query || messages[messages.length - 1]?.content;
    const sessionId = body.sessionId || body.session_id;
    const topK = body.top_k || 4;

    if (!query) {
      return NextResponse.json({ error: "Message/query is required" }, { status: 400 });
    }

    const ragResponse = await sendRagChat({
      query,
      messages,
      top_k: topK,
      session_id: sessionId,
    });

    return NextResponse.json({
      role: "assistant",
      content: ragResponse.data.answer,
      sources: ragResponse.data.sources,
      latency_ms: ragResponse.data.latency_ms,
      session_id: ragResponse.data.session_id,
      retrieved_chunks_count: ragResponse.data.retrieved_chunks_count,
    });
  } catch (error: any) {
    console.error("[api/chat] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process RAG chat request" },
      { status: 500 }
    );
  }
}
