"use server"

import { getS3ObjectReadUrl, isS3UploadConfigured, uploadAnyFileToS3, uploadAttendancePhotoToS3 } from "@/lib/s3-storage";
import { getServerSession } from "@/lib/auth-session";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DOC_FILE_SIZE = 10 * 1024 * 1024;

async function requireUploadSession() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return { success: false as const, error: "Unauthorized" };
  }
  return { success: true as const, session };
}

export async function uploadFile(formData: FormData) {
  try {
    const access = await requireUploadSession();
    if (!access.success) return access;

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
    }

    // Local fallback storage when S3 is not configured
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const ext = getCurhatFileExtension(file.name, file.type);
    const safeName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "file";
    const uniqueName = `${safeName}-${randomUUID().slice(0, 8)}.${ext}`;
    const filePath = join(uploadDir, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, buffer);

    const publicUrl = `/api/uploads/${uniqueName}`;
    return { success: true, url: publicUrl, readableUrl: publicUrl };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "Failed to upload file to Object Storage" };
  }
}

export async function uploadImageFromUrl(imageUrl: string) {
  try {
    const access = await requireUploadSession();
    if (!access.success) return access;

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

function getCurhatFileExtension(fileName: string, contentType: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{1,10}$/.test(ext)) return ext;
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("image/")) {
    if (contentType === "image/jpeg") return "jpg";
    if (contentType === "image/png") return "png";
    if (contentType === "image/webp") return "webp";
    if (contentType === "image/gif") return "gif";
  }
  return "bin";
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadCurhatAttachment(formData: FormData) {
  try {
    const access = await requireUploadSession();
    if (!access.success) return access;

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const isDoc =
      file.type === "application/msword" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/vnd.ms-excel" ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (!isImage && !isPdf && !isDoc) {
      return { success: false, error: "File must be an image, PDF, or Office document." };
    }

    if (isImage && file.size > MAX_IMAGE_FILE_SIZE) {
      return { success: false, error: "Image size max 5MB." };
    }
    if (isPdf && file.size > MAX_PDF_FILE_SIZE) {
      return { success: false, error: "PDF size max 10MB." };
    }
    if (isDoc && file.size > MAX_DOC_FILE_SIZE) {
      return { success: false, error: "Document size max 10MB." };
    }

    if (isS3UploadConfigured()) {
      const result = await uploadAnyFileToS3(file, "curhat-attachments");
      const readableUrl = await getS3ObjectReadUrl(result.url);
      return { success: true, url: result.url, readableUrl, fileName: file.name };
    }

    // Local fallback storage when S3 is not configured
    const uploadDir = join(process.cwd(), "public", "uploads", "curhat");
    await mkdir(uploadDir, { recursive: true });

    const ext = getCurhatFileExtension(file.name, file.type);
    const safeName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "attachment";
    const uniqueName = `${safeName}-${randomUUID().slice(0, 8)}.${ext}`;
    const filePath = join(uploadDir, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, buffer);

    const publicUrl = `/api/uploads/curhat/${uniqueName}`;
    return { success: true, url: publicUrl, readableUrl: publicUrl, fileName: file.name };
  } catch (error) {
    console.error("Curhat upload error:", error);
    return { success: false, error: "Failed to upload attachment." };
  }
}
