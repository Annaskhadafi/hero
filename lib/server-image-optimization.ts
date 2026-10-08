import sharp from "sharp";

export interface ServerImageOptimizationOptions {
  /** Maximum width or height dimension in pixels. Defaults to 1920. */
  maxDimension?: number;
  /** WebP compression quality (1-100). Defaults to 82. */
  quality?: number;
  /** CPU effort for compression (0-6). Defaults to 4. */
  effort?: number;
}

const DEFAULT_OPTIONS: Required<ServerImageOptimizationOptions> = {
  maxDimension: 1920,
  quality: 82,
  effort: 4,
};

/**
 * Optimizes an image buffer using sharp:
 * 1. Auto-orients based on EXIF camera orientation (.rotate()).
 * 2. Downscales if larger than maxDimension while preserving aspect ratio.
 * 3. Encodes to modern WebP format.
 * 4. Strips unnecessary metadata to minimize payload size.
 * 
 * Non-image files, SVGs, and GIFs are safely bypassed without modification.
 */
export async function optimizeImageBufferToWebp(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  options?: ServerImageOptimizationOptions
): Promise<{
  buffer: Buffer;
  contentType: string;
  fileName: string;
  wasOptimized: boolean;
}> {
  // Guard: Only process raster images, never touch PDFs, office docs, videos, SVGs, or GIFs
  const isRasterImage =
    contentType.startsWith("image/") &&
    contentType !== "image/svg+xml" &&
    contentType !== "image/gif";

  if (!isRasterImage) {
    return { buffer, contentType, fileName, wasOptimized: false };
  }

  // Guard: If already tiny WebP (< 80KB), skip re-encoding to save CPU
  if (contentType === "image/webp" && buffer.length < 80 * 1024) {
    return { buffer, contentType, fileName, wasOptimized: false };
  }

  try {
    const maxDimension = options?.maxDimension ?? DEFAULT_OPTIONS.maxDimension;
    const quality = options?.quality ?? DEFAULT_OPTIONS.quality;
    const effort = options?.effort ?? DEFAULT_OPTIONS.effort;

    const pipeline = sharp(buffer)
      .rotate() // Auto-orient based on camera EXIF tags
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort,
      });

    const optimizedBuffer = await pipeline.toBuffer();

    // Use WebP if it's smaller or if source was JPEG/PNG (to standardize to modern web format)
    const isSmallerOrStandardized =
      optimizedBuffer.length < buffer.length || contentType !== "image/webp";

    if (!isSmallerOrStandardized) {
      return { buffer, contentType, fileName, wasOptimized: false };
    }

    const baseName = fileName.replace(/\.[^/.]+$/, "");
    const webpFileName = `${baseName}.webp`;

    return {
      buffer: optimizedBuffer,
      contentType: "image/webp",
      fileName: webpFileName,
      wasOptimized: true,
    };
  } catch (error) {
    console.warn(`[optimizeImageBufferToWebp] Sharp optimization skipped for "${fileName}":`, error);
    return { buffer, contentType, fileName, wasOptimized: false };
  }
}

/**
 * Convenience helper to optimize a standard Web API File instance to WebP.
 * Returns a new File object if optimized, or the original File if bypassed/failed.
 */
export async function optimizeUploadFile(
  file: File,
  options?: ServerImageOptimizationOptions
): Promise<File> {
  const isRasterImage =
    file.type.startsWith("image/") &&
    file.type !== "image/svg+xml" &&
    file.type !== "image/gif";

  if (!isRasterImage) {
    return file;
  }

  try {
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const result = await optimizeImageBufferToWebp(rawBuffer, file.name, file.type, options);

    if (!result.wasOptimized) {
      return file;
    }

    return new File([new Uint8Array(result.buffer)], result.fileName, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn(`[optimizeUploadFile] Failed to optimize "${file.name}", using original:`, error);
    return file;
  }
}
