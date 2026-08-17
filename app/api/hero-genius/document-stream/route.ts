import { NextRequest, NextResponse } from "next/server";
import { resolveRagDocumentUrl } from "@/lib/hero-genius/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url") || searchParams.get("file");
    const requestedFilename = searchParams.get("filename") || "document.pdf";

    if (!targetUrl) {
      return NextResponse.json({ error: "Missing document url parameter" }, { status: 400 });
    }

    const resolved = resolveRagDocumentUrl(targetUrl);
    const upstreamRes = await fetch(resolved, {
      cache: "no-store",
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch upstream document: ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect actual MIME type from magic bytes or extension
    let contentType = "application/octet-stream";
    const headerPrefix = buffer.slice(0, 5).toString("ascii");

    if (/\.(md|markdown)$/i.test(requestedFilename)) {
      contentType = "text/markdown; charset=utf-8";
    } else if (/\.txt$/i.test(requestedFilename)) {
      contentType = "text/plain; charset=utf-8";
    } else if (headerPrefix.startsWith("%PDF") || requestedFilename.endsWith(".pdf")) {
      contentType = "application/pdf";
    } else if (
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      contentType = "image/jpeg";
    } else if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      contentType = "image/png";
    } else {
      contentType = "application/pdf";
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", buffer.length.toString());
    // Inline disposition so browser renders it in preview instead of downloading
    headers.set(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(requestedFilename)}"`
    );
    headers.set("Cache-Control", "public, max-age=3600, immutable");
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("[document-stream] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to stream document" },
      { status: 500 }
    );
  }
}
