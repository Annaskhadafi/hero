"use server"

import { getS3ObjectReadUrl, isS3UploadConfigured, uploadAnyFileToS3, uploadAttendancePhotoToS3 } from "@/lib/s3-storage";

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

export async function uploadFile(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image." };
    }
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return { success: false, error: "Photo size max 5MB." };
    }
    const uploadTarget = (formData.get("uploadTarget") as string | null)?.trim();

    if (process.env.UPLOAD_DRIVER === "s3" || isS3UploadConfigured()) {
      const result =
        uploadTarget === "attendance"
          ? await uploadAttendancePhotoToS3(file)
          : await uploadAnyFileToS3(file);
      const readableUrl = await getS3ObjectReadUrl(result.url);
      return { success: true, url: result.url, readableUrl };
    } else {
        return { success: false, error: "S3 Upload Driver is not properly configured." };
    }
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "Failed to upload file to Object Storage" };
  }
}
