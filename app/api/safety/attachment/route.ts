import { NextResponse } from "next/server";
import { hasValidSessionCookie } from "@/lib/auth-cookie";
import {
  getS3ObjectForProxy,
  isS3UploadConfigured,
  resolveS3ObjectKey,
} from "@/lib/s3-storage";
import { verifyAttachmentToken } from "@/lib/safety-attachment-token";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const objectUrl = url.searchParams.get("url")?.trim();
  const token = url.searchParams.get("token");

  if (!objectUrl) {
    return NextResponse.json({ message: "Missing url" }, { status: 400 });
  }

  // Authorize via a self-contained signed token (preferred: works for `<img>`
  // subresources even when cookies are not forwarded) or, as a fallback, a
  // locally verified session cookie. Both checks are HMAC-only so attachment
  // loading never depends on a live database round-trip.
  const isAuthorized =
    verifyAttachmentToken(objectUrl, token) ||
    (await hasValidSessionCookie(request.headers.get("cookie")));

  if (!isAuthorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isS3UploadConfigured() || !resolveS3ObjectKey(objectUrl)) {
    return NextResponse.json({ message: "Invalid object url" }, { status: 400 });
  }

  try {
    const object = await getS3ObjectForProxy(objectUrl);

    if (!object) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(object.body), {
      status: 200,
      headers: {
        "Content-Type": object.contentType,
        "Content-Length": String(object.contentLength),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Failed to proxy S3 attachment:", error);
    return NextResponse.json({ message: "Failed to load attachment" }, { status: 502 });
  }
}
