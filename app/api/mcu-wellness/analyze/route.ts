import { NextRequest, NextResponse } from "next/server";
import { extractTextViaOcr, analyzeTextViaAi } from "@/lib/mcu-wellness-ocr";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { fileBase64, mimeType, fileName } = body as {
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
    };

    if (!fileBase64) {
      return NextResponse.json({ error: "fileBase64 diperlukan" }, { status: 400 });
    }
    if (!mimeType) {
      return NextResponse.json({ error: "mimeType diperlukan" }, { status: 400 });
    }

    const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!supportedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Tipe file tidak didukung: ${mimeType}. Gunakan PDF, JPG, PNG, atau WEBP.` },
        { status: 400 },
      );
    }

    // 1. Convert base64 to buffer
    const buffer = Buffer.from(fileBase64.split(",")[1] ?? fileBase64, "base64");
    console.log("[mcu-wellness/analyze] step 1/3: OCR start", { fileSize: buffer.length, mimeType, fileName });

    // 2. OCR: extract text from PDF/image via Mistral OCR
    const ocrText = await extractTextViaOcr(buffer, mimeType, fileName ?? "document");
    console.log("[mcu-wellness/analyze] step 2/3: OCR done", { textLength: ocrText.length, pages: ocrText.split("\n\n").length });

    // 3. Analyze extracted text with cheap AI
    const result = await analyzeTextViaAi(ocrText);
    console.log("[mcu-wellness/analyze] step 3/3: AI analysis done in", Date.now() - startTime, "ms", {
      model: result.model,
      kategori: (result.content as any)?.kategori,
    });

    return NextResponse.json({
      success: true,
      extraction: result.content,
      rawContent: result.rawContent,
      model: result.model,
      fileName,
      ocrPages: ocrText.split("\n\n").length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[mcu-wellness/analyze] FAILED in", Date.now() - startTime, "ms:", message);
    return NextResponse.json(
      {
        error: message,
        hint: "OCR gagal. Pastikan MISTRAL_API_KEY dan MCU_AI_API_KEY sudah di .env. Untuk PDF butuh koneksi S3.",
      },
      { status: 500 },
    );
  }
}
