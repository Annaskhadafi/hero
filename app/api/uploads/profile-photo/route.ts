import { uploadProfilePhotoToS3 } from "@/lib/s3-storage";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "File foto belum dikirim." },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return Response.json(
        { error: "File must be an image." },
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
