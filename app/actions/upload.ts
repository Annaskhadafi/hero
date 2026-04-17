import { isS3UploadConfigured, uploadAnyFileToS3, uploadAttendancePhotoToS3 } from "@/lib/s3-storage";

export async function uploadFile(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };
    const uploadTarget = (formData.get("uploadTarget") as string | null)?.trim();

    if (process.env.UPLOAD_DRIVER === "s3" || isS3UploadConfigured()) {
      const result =
        uploadTarget === "attendance"
          ? await uploadAttendancePhotoToS3(file)
          : await uploadAnyFileToS3(file);
      return { success: true, url: result.url };
    } else {
        return { success: false, error: "S3 Upload Driver is not properly configured." };
    }
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "Failed to upload file to Object Storage" };
  }
}
