import { NextRequest, NextResponse } from "next/server";
import { extractTextViaOcr, analyzeTextViaAi } from "@/lib/mcu-wellness-ocr";
import { uploadBufferToS3 } from "@/lib/s3-storage";
import { saveAiResultForEmployee } from "@/app/actions/mcu-wellness";
import { type McuAiExtraction } from "@/lib/mcu-wellness-ai";
import { getServerSession } from "@/lib/auth-session";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  try {
    let buffer: Buffer;
    let mimeType: string = "application/pdf";
    let fileName: string = "document.pdf";
    let employeeId: number | null = null;
    let autoSave: boolean = false;
    let mcuDate: string | undefined = undefined;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "File dokumen diperlukan" }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
      mimeType = file.type || "application/pdf";
      fileName = file.name || "document.pdf";
      const empIdStr = formData.get("employeeId") as string | null;
      if (empIdStr) employeeId = Number(empIdStr);
      autoSave = formData.get("autoSave") === "true";
      const mcuDateStr = formData.get("mcuDate") as string | null;
      if (mcuDateStr) mcuDate = mcuDateStr;
    } else {
      const body = await request.json();
      const { fileBase64, mimeType: mt, fileName: fn, employeeId: empId, autoSave: as, mcuDate: md } = body;
      if (!fileBase64) {
        return NextResponse.json({ error: "fileBase64 diperlukan" }, { status: 400 });
      }
      buffer = Buffer.from(fileBase64.split(",")[1] ?? fileBase64, "base64");
      mimeType = mt || "application/pdf";
      fileName = fn || "document.pdf";
      if (empId) employeeId = Number(empId);
      autoSave = Boolean(as);
      if (md) mcuDate = md;
    }

    const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!supportedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Tipe file tidak didukung: ${mimeType}. Gunakan PDF, JPG, PNG, atau WEBP.` },
        { status: 400 },
      );
    }

    console.log("[mcu-wellness/analyze] step 1/3: PDF Inspector OCR start", { fileSize: buffer.length, mimeType, fileName });

    // 2. OCR: extract markdown text from PDF/image via PDF Inspector Microservice (with fallback)
    const ocrText = await extractTextViaOcr(buffer, mimeType, fileName);
    const pagesEstimated = ocrText.split(/\n\s*---\s*\n|\n\s*#+\s*Page|\n\n/).length;
    console.log("[mcu-wellness/analyze] step 2/3: PDF Inspector OCR done", { textLength: ocrText.length, pages: pagesEstimated });

    // 3. AI Mapping: Map extracted markdown text into structured MCU metrics via AI
    const result = await analyzeTextViaAi(ocrText);
    console.log("[mcu-wellness/analyze] step 3/3: AI mapping done in", Date.now() - startTime, "ms", {
      model: result.model,
      kategori: (result.content as any)?.kategori,
    });

    let uploadedUrl = "";
    if (autoSave && employeeId) {
      try {
        const s3Key = `mcu-wellness-results/${employeeId}-${Date.now()}-${fileName}`;
        const s3Res = await uploadBufferToS3(buffer, s3Key, mimeType);
        uploadedUrl = `/api/uploads/${s3Res.key}`;

        await saveAiResultForEmployee(
          employeeId,
          result.content as unknown as McuAiExtraction,
          result.model || "PDF-Inspector + AI",
          {
            mcuDate,
            resultFileName: fileName,
            resultFileUrl: uploadedUrl,
            examinedBy: "Dr. / Lab Terverifikasi (via PDF Inspector)",
          }
        );
      } catch (saveErr) {
        console.warn("[mcu-wellness/analyze] auto-save warning:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      extraction: result.content,
      rawContent: result.rawContent,
      model: result.model,
      fileName,
      ocrPages: pagesEstimated,
      uploadedUrl,
      saved: Boolean(autoSave && employeeId),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[mcu-wellness/analyze] FAILED in", Date.now() - startTime, "ms:", message);
    return NextResponse.json(
      {
        error: message,
        hint: "Gagal memproses dokumen MCU. Pastikan server vision.chitraparatama.com atau API AI aktif.",
      },
      { status: 500 },
    );
  }
}
