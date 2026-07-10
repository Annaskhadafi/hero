import { getServerSession } from "@/lib/auth-session";
import { createDirectS3UploadUrl, isS3UploadConfigured } from "@/lib/s3-storage";

export const runtime = "nodejs";

const MATERIAL_EXTENSIONS = new Set(["zip", "pdf", "doc", "docx", "ppt", "pptx"]);
const MATERIAL_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function extensionOf(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isS3UploadConfigured()) return Response.json({ error: "S3 upload belum dikonfigurasi." }, { status: 503 });

  try {
    const { fileName, contentType } = await request.json();
    const extension = typeof fileName === "string" ? extensionOf(fileName) : "";
    const type = typeof contentType === "string" ? contentType : "application/octet-stream";

    if (!MATERIAL_EXTENSIONS.has(extension) || (type !== "application/octet-stream" && !MATERIAL_TYPES.has(type))) {
      return Response.json({ error: "File materi harus ZIP, PDF, Word, atau PowerPoint." }, { status: 400 });
    }

    return Response.json(await createDirectS3UploadUrl(fileName, type, "lms-materials"));
  } catch {
    return Response.json({ error: "Gagal menyiapkan upload materi." }, { status: 500 });
  }
}
