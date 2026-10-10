import { NextResponse } from "next/server"
import { getS3ObjectForProxy, isS3UploadConfigured } from "@/lib/s3-storage"
import { getServerSession } from "@/lib/auth-session"
import { join } from "path"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { createHash } from "crypto"
// @ts-ignore
import heicDecode from "heic-decode"
import sharp from "sharp"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"

const ALLOWED_UPLOAD_PREFIXES = new Set([
  "attendance-photos",
  "activity-photos",
  "curhat",
  "curhat-attachments",
  "profile-photos",
  "upload",
  "uploads",
  "mcu-wellness-results",
  "mcu-referral-letters",
  "mcu-results",
  "offering-letters",
  "lms-materials",
  "lms-covers",
  "chitralearning",
  "sop-win-requests",
  "sop-win",
  "emergency-reports",
  "safety",
  "face-attendance",
  "face-attendance-v2",
  "contract-review-attachment",
  "public-career-cv",
  "hse-osm",
])

function getContentType(fileName: string) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".gif")) return "image/gif"
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".doc")) return "application/msword"
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel"
  if (lower.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  return "application/octet-stream"
}

function isValidPathSegment(segment: string) {
  if (!segment || segment === "." || segment === "..") return false
  if (segment.includes("\\") || segment.includes("/") || segment.includes("..")) return false
  if (/[\u0000-\u001f\u007f]/.test(segment)) return false
  if (/^[a-zA-Z]:$/.test(segment)) return false
  return true
}

function isAllowedUploadPath(path: string[]) {
  if (!path.every(isValidPathSegment)) return false
  if (path.length === 1) return true;
  return ALLOWED_UPLOAD_PREFIXES.has(path[0])
}

async function prepareResponseBuffer(
  buffer: Buffer,
  fileName: string,
  targetWidth?: number | null,
  cachedThumbPath?: string,
  cacheDir?: string
): Promise<{ data: Buffer; contentType: string; isThumbnail?: boolean }> {
  const lower = fileName.toLowerCase()
  const isHeic = lower.endsWith(".heic") || lower.endsWith(".heif")
  const isRasterImage = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(lower)

  if (isHeic) {
    try {
      const { width, height, data } = await heicDecode({ buffer })
      let pipeline = sharp(Buffer.from(data), {
        raw: { width, height, channels: 4 },
      }).rotate()

      if (targetWidth && targetWidth < width) {
        pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true })
      }

      const converted = await pipeline
        .jpeg({ quality: targetWidth ? 82 : 85, mozjpeg: true })
        .toBuffer()

      if (targetWidth && cachedThumbPath && cacheDir) {
        try {
          if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
          writeFileSync(cachedThumbPath, converted)
        } catch {}
      }

      return { data: converted, contentType: "image/jpeg", isThumbnail: !!targetWidth }
    } catch (e) {
      console.warn("HEIC auto-conversion failed in uploads proxy:", e)
    }
  }

  if (targetWidth && isRasterImage) {
    try {
      const resized = await sharp(buffer)
        .rotate()
        .resize({ width: targetWidth, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer()

      if (cachedThumbPath && cacheDir) {
        try {
          if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
          writeFileSync(cachedThumbPath, resized)
        } catch {}
      }

      return { data: resized, contentType: "image/jpeg", isThumbnail: true }
    } catch (resizeErr) {
      console.warn("Image thumbnail resize failed in uploads proxy, falling back to original:", resizeErr)
    }
  }

  return { data: buffer, contentType: getContentType(fileName) }
}

function createStreamingResponse(
  fileBuffer: Buffer,
  contentType: string,
  fileName: string,
  isThumbnail: boolean | undefined,
  request: Request
): NextResponse {
  const isSafeInline = contentType.startsWith("image/") || contentType === "application/pdf";
  const rangeHeader = request.headers.get("range");

  if (rangeHeader && rangeHeader.startsWith("bytes=")) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileBuffer.length - 1;

    if (!isNaN(start) && start < fileBuffer.length) {
      const safeEnd = Math.min(isNaN(end) ? fileBuffer.length - 1 : end, fileBuffer.length - 1);
      const chunk = fileBuffer.subarray(start, safeEnd + 1);

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Range", `bytes ${start}-${safeEnd}/${fileBuffer.length}`);
      headers.set("Content-Length", chunk.length.toString());
      headers.set("Cache-Control", isThumbnail ? "public, max-age=31536000, immutable" : "public, max-age=86400, stale-while-revalidate=604800");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Content-Disposition", `${isSafeInline ? "inline" : "attachment"}; filename="${encodeURIComponent(fileName)}"`);

      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers,
      });
    }
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", fileBuffer.length.toString());
  headers.set("Cache-Control", isThumbnail ? "public, max-age=31536000, immutable" : "public, max-age=86400, stale-while-revalidate=604800");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Disposition", `${isSafeInline ? "inline" : "attachment"}; filename="${encodeURIComponent(fileName)}"`);

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers,
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params

  if (!path || path.length === 0) {
    return NextResponse.json({ message: "Missing filename" }, { status: 400 })
  }

  if (!isAllowedUploadPath(path)) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 })
  }

  // Strict session check only for sensitive directories
  const isRootUpload = path.length === 1
  const isPublicPrefix =
    path[0] === "upload" ||
    path[0] === "uploads" ||
    path[0] === "activity-photos" ||
    path[0] === "profile-photos" ||
    path[0] === "emergency-reports" ||
    path[0] === "safety" ||
    path[0] === "face-attendance-v2" ||
    path[0] === "sop-win" ||
    path[0] === "lms-covers" ||
    path[0] === "lms-materials" ||
    path[0] === "chitralearning" ||
    path[0] === "public-career-cv" ||
    path[0] === "contract-review-attachment"

  const isSensitive = !isRootUpload && !isPublicPrefix
  if (isSensitive) {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
  }

  const relativePath = path.join("/")
  const fileName = path[path.length - 1]

  // Parse thumbnail width query param (?w=800 or ?width=800)
  const reqUrl = new URL(request.url)
  const widthParam = reqUrl.searchParams.get("w") || reqUrl.searchParams.get("width")
  const targetWidth = widthParam && !isNaN(Number(widthParam)) ? Math.min(Math.max(Math.round(Number(widthParam)), 32), 2560) : null

  // Fast disk cache check for generated thumbnails
  const publicDir = join(/*turbopackIgnore: true*/ process.cwd(), "public")
  const thumbCacheDir = join(publicDir, "uploads", "cache", "thumbnails")
  let cachedThumbPath: string | undefined
  if (targetWidth) {
    const thumbHash = createHash("md5").update(`${relativePath}_w${targetWidth}`).digest("hex")
    cachedThumbPath = join(thumbCacheDir, `${thumbHash}.jpg`)
    if (existsSync(cachedThumbPath)) {
      try {
        const cachedThumbBuf = readFileSync(cachedThumbPath)
        return new NextResponse(new Uint8Array(cachedThumbBuf), {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": `inline; filename="thumb-${encodeURIComponent(fileName)}"`,
          },
        })
      } catch (err) {
        console.warn("Failed reading cached thumbnail:", err)
      }
    }
  }

  // 1. Check local public/uploads directory candidates
  const candidateLocalPaths = [
    join(publicDir, "uploads", relativePath),
    join(publicDir, "uploads", fileName),
    join(publicDir, relativePath),
    join(publicDir, fileName),
  ]

  for (const localPath of candidateLocalPaths) {
    if (existsSync(localPath)) {
      try {
        const rawBuffer = readFileSync(localPath)
        const { data: fileBuffer, contentType, isThumbnail } = await prepareResponseBuffer(rawBuffer, fileName, targetWidth, cachedThumbPath, thumbCacheDir)
        return createStreamingResponse(fileBuffer, contentType, fileName, isThumbnail, request)
      } catch (e) {
        console.error("Local file read error:", e)
      }
    }
  }

  // 2. Fetch from S3 proxy using candidate keys
  if (isS3UploadConfigured()) {
    const candidateS3Keys = [
      relativePath,
      fileName,
      `upload/${fileName}`,
      `uploads/${fileName}`,
      `activity-photos/${fileName}`,
      `attendance-photos/${fileName}`,
      `emergency-reports/${fileName}`,
      `safety/${fileName}`,
      `sop-win-requests/${fileName}`,
      `sop-win/${fileName}`,
      `mcu-referral-letters/${fileName}`,
      `mcu-results/${fileName}`,
      `offering-letters/${fileName}`,
      `public-career-cv/${fileName}`,
      `lms-materials/${fileName}`,
      `lms-covers/${fileName}`,
      `chitralearning/${fileName}`,
      `contract-review-attachment/${fileName}`,
      `hse-osm/${fileName}`,
    ]

    for (const key of candidateS3Keys) {
      try {
        const object = await getS3ObjectForProxy(key)
        if (object && object.body) {
          const rawBuffer = Buffer.from(object.body)

          // Persist S3 download to local public/uploads disk cache so future requests are instantaneous
          try {
            const localCachePath = join(publicDir, "uploads", relativePath)
            const localCacheDir = join(publicDir, "uploads", ...path.slice(0, -1))
            if (!existsSync(localCacheDir)) mkdirSync(localCacheDir, { recursive: true })
            writeFileSync(localCachePath, rawBuffer)
          } catch (writeErr) {
            console.warn("Failed caching S3 file to local disk:", writeErr)
          }

          const { data: fileBuffer, contentType, isThumbnail } = await prepareResponseBuffer(rawBuffer, fileName, targetWidth, cachedThumbPath, thumbCacheDir)
          return createStreamingResponse(fileBuffer, contentType, fileName, isThumbnail, request)
        }
      } catch (error) {
        console.warn("Failed to proxy S3 upload key:", key, error)
      }
    }
  }

  // 3. For missing image/document/PDF files, return clean 404 instead of receiving HTML
  const isBinaryOrDocFile = /\.(jpe?g|png|webp|gif|heic|heif|svg|bmp|ico|pdf|docx?|xlsx?|pptx?|zip)$/i.test(fileName)
  if (isBinaryOrDocFile) {
    return new NextResponse(null, { status: 404 })
  }

  // 4. Fallback for demo/mock attachment files: Render clean HTML notice instead of raw JSON
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lampiran Permohonan Dokumen</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 2.5rem 2rem;
      border-radius: 1rem;
      max-width: 440px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 1.25rem;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #60a5fa;
      font-size: 1.75rem;
    }
    h3 {
      margin: 0 0 0.5rem;
      font-size: 1.15rem;
      font-weight: 700;
      color: #f8fafc;
    }
    p {
      margin: 0 0 1.5rem;
      font-size: 0.85rem;
      color: #94a3b8;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      background: #0f172a;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 0.35rem 0.85rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: monospace;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📄</div>
    <h3>Lampiran Penunjang Permohonan</h3>
    <p>File ini merupakan data sampel pengujian atau dokumen sedang disinkronisasikan ke penyimpanan lokal.</p>
    <div class="badge">${fileName}</div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  })
}
