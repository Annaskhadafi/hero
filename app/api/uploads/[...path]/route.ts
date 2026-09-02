import { NextResponse } from "next/server"
import { getS3ObjectForProxy, isS3UploadConfigured } from "@/lib/s3-storage"
import { getServerSession } from "@/lib/auth-session"
import { join } from "path"
import { existsSync, readFileSync } from "fs"

export const runtime = "nodejs"

const ALLOWED_UPLOAD_PREFIXES = new Set([
  "attendance-photos",
  "activity-photos",
  "curhat",
  "profile-photos",
  "upload",
  "uploads",
  "mcu-wellness-results",
  "lms-materials",
  "lms-covers",
  "chitralearning",
  "sop-win-requests",
  "sop-win",
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

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params

  if (!path || path.length === 0) {
    return NextResponse.json({ message: "Missing filename" }, { status: 400 })
  }

  if (!isAllowedUploadPath(path)) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 })
  }

  // Strict session check only for sensitive directories
  const isSensitive = path[0] !== "upload" && path[0] !== "lms-covers" && path[0] !== "chitralearning"
  if (isSensitive) {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
  }

  const relativePath = path.join("/")
  const fileName = path[path.length - 1]

  // 1. Check local public/uploads directory candidates
  const candidateLocalPaths = [
    join(process.cwd(), "public", "uploads", relativePath),
    join(process.cwd(), "public", "uploads", fileName),
    join(process.cwd(), "public", relativePath),
    join(process.cwd(), "public", fileName),
  ]

  for (const localPath of candidateLocalPaths) {
    if (existsSync(localPath)) {
      try {
        const fileBuffer = readFileSync(localPath)
        const contentType = getContentType(fileName)
        const isSafeInline = contentType.startsWith("image/") || contentType === "application/pdf"
        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=300",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": `${isSafeInline ? "inline" : "attachment"}; filename="${encodeURIComponent(fileName)}"`,
          },
        })
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
      `sop-win-requests/${fileName}`,
    ]

    for (const key of candidateS3Keys) {
      try {
        const object = await getS3ObjectForProxy(key)
        if (object && object.body) {
          const contentType = object.contentType || getContentType(fileName)
          const isSafeInline = contentType.startsWith("image/") || contentType === "application/pdf"
          return new NextResponse(Buffer.from(object.body), {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "private, max-age=300",
              "X-Content-Type-Options": "nosniff",
              "Content-Disposition": `${isSafeInline ? "inline" : "attachment"}; filename="${encodeURIComponent(fileName)}"`,
            },
          })
        }
      } catch (error) {
        console.warn("Failed to proxy S3 upload key:", key, error)
      }
    }
  }

  // 3. Fallback for demo/mock attachment files: Render clean HTML notice instead of raw JSON
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
