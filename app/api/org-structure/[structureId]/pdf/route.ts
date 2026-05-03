import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ structureId: string }> }
) {
  try {
    const { imageDataUrl, structureName } = await request.json();
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Buffer.from(base64Data, "base64");
    
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([841.89, 595.28]); // A4 landscape
    
    const image = await pdfDoc.embedPng(imageBytes);
    const imgDims = image.scaleToFit(page.getWidth() - 60, page.getHeight() - 80);
    
    page.drawImage(image, {
      x: (page.getWidth() - imgDims.width) / 2,
      y: page.getHeight() - imgDims.height - 50,
      width: imgDims.width,
      height: imgDims.height,
    });
    
    page.drawText(structureName || "Org Structure", {
      x: 30,
      y: page.getHeight() - 30,
      size: 16,
      font,
      color: rgb(0.059, 0.09, 0.165),
    });
    
    page.drawText(`Generated: ${new Date().toLocaleDateString("id-ID")}`, {
      x: 30,
      y: page.getHeight() - 46,
      size: 9,
      font,
      color: rgb(0.392, 0.455, 0.545),
    });
    
    const pdfBytes = await pdfDoc.save();
    
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${structureName || "org-structure"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
