import { NextRequest, NextResponse } from "next/server";
import { parseWebUrl } from "@/lib/hero-genius/web-parser";
import { getServerSession } from "@/lib/auth-session";

/**
 * POST /api/hero-genius/web-parser
 * Body: { url: string, chunkSize?: number, chunkOverlap?: number, timeoutMs?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url, chunkSize, chunkOverlap, timeoutMs } = body || {};

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Parameter 'url' wajib diisi (string http/https)" },
        { status: 400 }
      );
    }

    const result = await parseWebUrl(url.trim(), {
      chunkSize: chunkSize ? Number(chunkSize) : undefined,
      chunkOverlap: chunkOverlap ? Number(chunkOverlap) : undefined,
      timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[POST /api/hero-genius/web-parser] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memproses web parsing",
      },
      { status: 500 }
    );
  }
}
