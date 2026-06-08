"use server"

import { getS3ObjectReadUrl, isS3UploadConfigured, uploadAnyFileToS3, uploadAttendancePhotoToS3 } from "@/lib/s3-storage";

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

export async function uploadFile(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return { success: false, error: "File must be an image or PDF." };
    }
    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_FILE_SIZE) {
      return { success: false, error: "Photo size max 5MB." };
    }
    if (file.type === "application/pdf" && file.size > 10 * 1024 * 1024) {
      return { success: false, error: "PDF size max 10MB." };
    }
    const uploadTarget = (formData.get("uploadTarget") as string | null)?.trim();

    if (isS3UploadConfigured()) {
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

export async function uploadImageFromUrl(imageUrl: string) {
  try {
    if (!isS3UploadConfigured()) {
      return { success: false, error: "S3 Upload Driver is not properly configured." };
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return { success: false, error: "Failed to fetch image from URL." };
    }

    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) {
      return { success: false, error: "URL does not point to a valid image." };
    }

    if (blob.size > MAX_IMAGE_FILE_SIZE) {
      return { success: false, error: "Image from URL is too large (max 5MB)." };
    }

    const urlObj = new URL(imageUrl);
    let fileName = urlObj.pathname.split('/').pop() || "image.jpg";
    if (!fileName.includes('.')) fileName += ".jpg";
    
    const file = new File([blob], fileName, { type: blob.type });

    const result = await uploadAnyFileToS3(file);
    const readableUrl = await getS3ObjectReadUrl(result.url);
    
    return { success: true, url: result.url, readableUrl };
  } catch (error) {
    console.error("Upload from URL error:", error);
    return { success: false, error: "Failed to fetch or upload image from URL." };
  }
}
