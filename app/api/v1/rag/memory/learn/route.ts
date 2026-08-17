import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { heroGeniusLearnedFacts } from "@/db/schema";
import { teachRagMemory } from "@/lib/hero-genius/client";
import { getServerSession } from "@/lib/auth-session";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;
    const body = await req.json();

    const { fact, category = "General", source = "Self-Growth Input", tags = [] } = body;

    if (!fact || !fact.trim()) {
      return NextResponse.json(
        { status: "error", message: "Fakta / aturan baru wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Try remote RAG learn endpoint
    let remoteData: any = null;
    try {
      const remoteRes = await teachRagMemory({
        fact: fact.trim(),
        category,
        source,
        tags: Array.isArray(tags) ? tags : [],
        user_id: userId,
      });
      remoteData = remoteRes.data;
    } catch (e) {
      // Continue to local save
    }

    // 2. Insert into local DB table
    const [inserted] = await db
      .insert(heroGeniusLearnedFacts)
      .values({
        fact: fact.trim(),
        category: category.trim() || "General",
        source: source.trim() || "Self-Growth Input",
        tags: Array.isArray(tags) ? tags : [],
        confidenceScore: 1.0,
        isActive: true,
        learnedBy: userId || null,
      })
      .returning();

    return NextResponse.json({
      status: "ok",
      message: "Fakta / aturan baru berhasil dipelajari oleh Hero Genius!",
      data: {
        fact_id: inserted.id,
        fact: inserted.fact,
        category: inserted.category,
        source: inserted.source,
        tags: inserted.tags,
        is_active: inserted.isActive,
        created_at: inserted.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[POST /api/v1/rag/memory/learn] error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to learn fact" },
      { status: 500 }
    );
  }
}
