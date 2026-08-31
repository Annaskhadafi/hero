import { uploadProfilePhotoToS3 } from "@/lib/s3-storage";
import { getServerSession } from "@/lib/auth-session";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "File foto belum dikirim." },
        { status: 400 },
      );
    }

    const fileType = file.type?.toLowerCase() || "";
    const fileName = file.name?.toLowerCase() || "";

    // Explicitly reject SVG files for security (prevent XSS/XXE)
    if (fileType === "image/svg+xml" || fileType.includes("svg") || fileName.endsWith(".svg")) {
      return Response.json(
        { error: "SVG files are not permitted for profile photos." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(fileType)) {
      return Response.json(
        { error: "File must be an image (JPEG, PNG, or WebP only)." },
        { status: 400 },
      );
    }

    const extMatch = fileName.match(/\.[a-z0-9]+$/);
    const ext = extMatch ? extMatch[0] : "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return Response.json(
        { error: "File extension must be .jpg, .jpeg, .png, or .webp." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "Profile photo too large. Max 2MB." },
        { status: 400 },
      );
    }

    const uploaded = await uploadProfilePhotoToS3(file);

    return Response.json({
      url: uploaded.url,
      key: uploaded.key,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Upload foto profile ke S3 gagal diproses.";

    return Response.json({ error: message }, { status: 500 });
  }
}
