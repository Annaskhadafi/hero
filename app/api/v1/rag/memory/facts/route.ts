import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { heroGeniusLearnedFacts } from "@/db/schema";
import { deleteRagMemoryFact, getRagMemoryFacts } from "@/lib/hero-genius/client";
import { and, desc, eq, ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");

    // 1. Try remote RAG endpoint
    try {
      const remoteRes = await getRagMemoryFacts({ limit, category: category || undefined, search: search || undefined });
      if (remoteRes && Array.isArray(remoteRes.facts) && remoteRes.facts.length > 0) {
        return NextResponse.json(remoteRes);
      }
    } catch (e) {
      // Continue to local DB
    }

    // 2. Query local DB
    const conditions = [];
    if (category && category !== "all") {
      conditions.push(eq(heroGeniusLearnedFacts.category, category));
    }
    if (search && search.trim()) {
      conditions.push(ilike(heroGeniusLearnedFacts.fact, `%${search.trim()}%`));
    }

    const facts = await db
      .select()
      .from(heroGeniusLearnedFacts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(heroGeniusLearnedFacts.createdAt))
      .limit(limit);

    return NextResponse.json({
      status: "ok",
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
    });
  } catch (error: any) {
    console.error("[GET /api/v1/rag/memory/facts] error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to retrieve facts", total: 0, facts: [] },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ status: "error", message: "Fact ID is required" }, { status: 400 });
    }

    // 1. Try remote RAG endpoint
    try {
      await deleteRagMemoryFact(id);
    } catch (e) {
      // non-fatal
    }

    // 2. Delete local DB
    if (!isNaN(Number(id))) {
      await db.delete(heroGeniusLearnedFacts).where(eq(heroGeniusLearnedFacts.id, Number(id)));
    }

    return NextResponse.json({
      status: "ok",
      message: "Fakta / memori berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("[DELETE /api/v1/rag/memory/facts] error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to delete fact" },
      { status: 500 }
    );
  }
}
