import { NextResponse } from "next/server";
import { getS3ObjectForProxy, isS3UploadConfigured } from "@/lib/s3-storage";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename) {
    return NextResponse.json({ message: "Missing filename" }, { status: 400 });
  }

  // 1. Check local public/uploads directory first (for local fallback)
  const localPath = join(process.cwd(), "public", "uploads", filename);
  if (existsSync(localPath)) {
    try {
      const fileBuffer = readFileSync(localPath);
      let contentType = "application/octet-stream";
      if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (filename.endsWith(".png")) contentType = "image/png";
      else if (filename.endsWith(".webp")) contentType = "image/webp";
      else if (filename.endsWith(".gif")) contentType = "image/gif";
      else if (filename.endsWith(".pdf")) contentType = "application/pdf";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (e) {
      console.error("Local file read error:", e);
    }
  }

  // 2. Fetch from S3 proxy
  if (isS3UploadConfigured()) {
    try {
      // Try with default upload/ prefix
      const key = `upload/${filename}`;
      const object = await getS3ObjectForProxy(key);

      if (!object) {
        // Fallback: try direct key
        const directObject = await getS3ObjectForProxy(filename);
        if (!directObject) {
          return NextResponse.json({ message: "File not found" }, { status: 404 });
        }
        return new NextResponse(Buffer.from(directObject.body), {
          headers: {
            "Content-Type": directObject.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }

      return new NextResponse(Buffer.from(object.body), {
        headers: {
          "Content-Type": object.contentType || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      console.error("Failed to proxy S3 upload:", error);
      return NextResponse.json({ message: "Failed to load upload" }, { status: 502 });
    }
  }

  return NextResponse.json({ message: "File not found" }, { status: 404 });
}
