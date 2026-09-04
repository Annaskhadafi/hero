import { NextRequest, NextResponse } from "next/server";
import { sendHeroGeniusChatAction } from "@/app/dashboard/hero-genius/actions";

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

    const documentId = body.document_id || body.documentId || undefined;

    const res = await sendHeroGeniusChatAction({
      query,
      messages,
      top_k: topK,
      session_id: sessionId,
      document_id: documentId,
    });

    if (!res.success || !res.data) {
      return NextResponse.json({ error: res.error || "Gagal memproses chat" }, { status: 500 });
    }

    return NextResponse.json({
      role: "assistant",
      content: res.data.answer,
      sources: res.data.sources,
      latency_ms: res.data.latency_ms,
      session_id: res.data.session_id,
      message_id: (res.data as any).message_id,
      retrieved_chunks_count: res.data.retrieved_chunks_count,
    });
  } catch (error: any) {
    console.error("[api/chat] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process RAG chat request" },
      { status: 500 }
    );
  }
}

