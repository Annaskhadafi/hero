import { NextRequest, NextResponse } from "next/server";
import { resolveRagDocumentUrl, getRagApiKey } from "@/lib/hero-genius/client";
import { isS3UploadConfigured, getS3ObjectForProxy } from "@/lib/s3-storage";
import { existsSync, promises as fs } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

function extractLocalUploadPath(targetUrl: string): string | null {
  try {
    let clean = targetUrl.trim();
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      try {
        const parsed = new URL(clean);
        clean = parsed.pathname;
      } catch (_) {}
    }

    clean = clean.replace(/^\/+/, "");

    // Strip bucket prefix if present
    if (clean.startsWith("onechitra/")) {
      clean = clean.slice("onechitra/".length);
    }

    if (clean.startsWith("api/uploads/")) {
      return clean.slice("api/uploads/".length);
    }
    if (clean.startsWith("uploads/")) {
      return clean.slice("uploads/".length);
    }
    if (clean.startsWith("public/uploads/")) {
      return clean.slice("public/uploads/".length);
    }

    return clean;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url") || searchParams.get("file");
    const requestedFilename = searchParams.get("filename") || "document.pdf";
    const requestedFormat = searchParams.get("format") || "";

    if (!targetUrl) {
      return NextResponse.json({ error: "Missing document url parameter" }, { status: 400 });
    }

    let buffer: Buffer | null = null;
    const filename = targetUrl.split("/").pop() || requestedFilename;

    // 1. Try S3 storage proxy first if configured
    if (isS3UploadConfigured()) {
      try {
        // Try direct targetUrl
        let s3Obj = await getS3ObjectForProxy(targetUrl);

        // Try upload/<filename>
        if (!s3Obj?.body && filename) {
          s3Obj = await getS3ObjectForProxy(`upload/${filename}`);
        }

        // Try raw filename
        if (!s3Obj?.body && filename) {
          s3Obj = await getS3ObjectForProxy(filename);
        }

        if (s3Obj?.body) {
          buffer = Buffer.from(s3Obj.body);
        }
      } catch (s3Err) {
        console.warn("[document-stream] S3 proxy error:", s3Err);
      }
    }

    // 2. Try local filesystem (public/uploads and public/)
    if (!buffer) {
      const localRelPath = extractLocalUploadPath(targetUrl);
      if (localRelPath) {
        const uploadFilePath = join(process.cwd(), "public", "uploads", localRelPath);
        if (existsSync(uploadFilePath)) {
          try {
            buffer = await fs.readFile(uploadFilePath);
          } catch (err) {
            console.warn("[document-stream] Local uploads read error:", err);
          }
        }

        if (!buffer) {
          const publicFilePath = join(process.cwd(), "public", localRelPath);
          if (existsSync(publicFilePath)) {
            try {
              buffer = await fs.readFile(publicFilePath);
            } catch (err) {
              console.warn("[document-stream] Public file read error:", err);
            }
          }
        }
      }

      if (!buffer && filename) {
        const filenamePath = join(process.cwd(), "public", "uploads", filename);
        if (existsSync(filenamePath)) {
          try {
            buffer = await fs.readFile(filenamePath);
          } catch (err) {
            console.warn("[document-stream] Local filename read error:", err);
          }
        }
      }
    }

    // 3. If not found locally or in S3, fetch from upstream (Vision proxy or external URL)
    if (!buffer) {
      const apiKey = getRagApiKey();
      const headersInit: HeadersInit = {
        "X-API-Key": apiKey,
        Authorization: `Bearer ${apiKey}`,
      };

      const isExternalUrl = targetUrl.startsWith("http://") || targetUrl.startsWith("https://");
      const resolved = resolveRagDocumentUrl(targetUrl);

      // Try fetching resolved Vision proxy URL
      if (resolved && resolved.startsWith("http")) {
        try {
          const upstreamRes = await fetch(resolved, {
            headers: headersInit,
            cache: "no-store",
          });

          if (upstreamRes.ok) {
            const arrayBuffer = await upstreamRes.arrayBuffer();
            const tempBuf = Buffer.from(arrayBuffer);
            const prefix = tempBuf.slice(0, 10).toString("ascii").toLowerCase();
            // Validate: If it's an HTML fallback SPA page, ignore it
            if (!prefix.startsWith("<!doct") && !prefix.startsWith("<html")) {
              buffer = tempBuf;
            }
          }
        } catch (fetchErr) {
          console.warn("[document-stream] Vision proxy fetch error:", fetchErr);
        }
      }

      // Fallback: Try fetching direct targetUrl if it's an http URL
      if (!buffer && isExternalUrl && targetUrl !== resolved) {
        try {
          const directRes = await fetch(targetUrl, {
            headers: headersInit,
            cache: "no-store",
          });
          if (directRes.ok) {
            const arrayBuffer = await directRes.arrayBuffer();
            const tempBuf = Buffer.from(arrayBuffer);
            const prefix = tempBuf.slice(0, 10).toString("ascii").toLowerCase();
            if (!prefix.startsWith("<!doct") && !prefix.startsWith("<html")) {
              buffer = tempBuf;
            }
          }
        } catch (directErr) {
          console.warn("[document-stream] Direct fetch error:", directErr);
        }
      }

      // Fallback: If targetUrl is an internal relative URL, try fetching via Next.js host
      if (!buffer && targetUrl.startsWith("/")) {
        try {
          const fullInternalUrl = new URL(targetUrl, req.url).toString();
          const internalRes = await fetch(fullInternalUrl, {
            cache: "no-store",
          });
          if (internalRes.ok) {
            const arrayBuffer = await internalRes.arrayBuffer();
            const tempBuf = Buffer.from(arrayBuffer);
            const prefix = tempBuf.slice(0, 10).toString("ascii").toLowerCase();
            if (!prefix.startsWith("<!doct") && !prefix.startsWith("<html")) {
              buffer = tempBuf;
            }
          }
        } catch (internalErr) {
          console.warn("[document-stream] Internal route fetch error:", internalErr);
        }
      }
    }

    if (!buffer) {
      return NextResponse.json(
        { error: "Dokumen tidak ditemukan atau gagal dimuat dari penyimpanan." },
        { status: 404 }
      );
    }

    // Detect actual MIME type from format, extension or magic bytes
    let contentType = "application/octet-stream";
    const headerPrefix = buffer.slice(0, 8).toString("ascii");

    if (
      requestedFormat === "md" ||
      requestedFormat === "markdown" ||
      /\.(md|markdown)$/i.test(requestedFilename)
    ) {
      contentType = "text/markdown; charset=utf-8";
    } else if (
      requestedFormat === "txt" ||
      /\.txt$/i.test(requestedFilename)
    ) {
      contentType = "text/plain; charset=utf-8";
    } else if (headerPrefix.startsWith("%PDF") || requestedFilename.toLowerCase().endsWith(".pdf")) {
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
    } else if (headerPrefix.startsWith("<?xml") || headerPrefix.startsWith("<!DOCT") || headerPrefix.startsWith("<html>")) {
      contentType = "text/html; charset=utf-8";
    } else {
      const isAscii = buffer.slice(0, 100).every((b) => (b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9);
      contentType = isAscii ? "text/markdown; charset=utf-8" : "application/pdf";
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


