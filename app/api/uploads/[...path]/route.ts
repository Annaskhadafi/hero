import { NextResponse } from "next/server";
import { getS3ObjectForProxy, isS3UploadConfigured } from "@/lib/s3-storage";
import { getServerSession } from "@/lib/auth-session";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

export const runtime = "nodejs";

const ALLOWED_UPLOAD_PREFIXES = new Set([
  "attendance-photos",
  "curhat",
  "profile-photos",
  "upload",
]);

function getContentType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

function isValidPathSegment(segment: string) {
  if (!segment || segment === "." || segment === "..") return false;
  if (segment.includes("\\") || segment.includes("/") || segment.includes("..")) return false;
  if (/[\u0000-\u001f\u007f]/.test(segment)) return false;
  if (/^[a-zA-Z]:$/.test(segment)) return false;
  return true;
}

function isAllowedUploadPath(path: string[]) {
  if (!path.every(isValidPathSegment)) return false;
  if (path.length === 1) return true;
  return ALLOWED_UPLOAD_PREFIXES.has(path[0]);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;

  if (!path || path.length === 0) {
    return NextResponse.json({ message: "Missing filename" }, { status: 400 });
  }

  if (!isAllowedUploadPath(path)) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 });
  }

  const relativePath = path.join("/");
  const fileName = path[path.length - 1];

  // 1. Check local public/uploads directory first (for local fallback)
  const localPath = join(process.cwd(), "public", "uploads", relativePath);
  if (existsSync(localPath)) {
    try {
      const fileBuffer = readFileSync(localPath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": getContentType(fileName),
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch (e) {
      console.error("Local file read error:", e);
    }
  }

  // 2. Fetch from S3 proxy using the full relative path as key
  if (isS3UploadConfigured()) {
    try {
      const object = await getS3ObjectForProxy(relativePath);

      if (!object) return NextResponse.json({ message: "File not found" }, { status: 404 });

      return new NextResponse(Buffer.from(object.body), {
        headers: {
          "Content-Type": object.contentType || getContentType(fileName),
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch (error) {
      console.error("Failed to proxy S3 upload:", error);
      return NextResponse.json({ message: "Failed to load upload" }, { status: 502 });
    }
  }

  return NextResponse.json({ message: "File not found" }, { status: 404 });
}
