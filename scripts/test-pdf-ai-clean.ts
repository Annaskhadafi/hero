import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { cleanMarkdownWithAi, chunkMarkdown } from "../lib/hero-genius/web-parser";

async function testPdfParseAndAiClean() {
  console.log("=== Testing PDF Extraction & AI Clean Structuring for SOP / WIN Documents ===");

  const pdfPath = path.join(process.cwd(), "public", "HERO_RMS_Suggestion_System.pdf");
  if (!fs.existsSync(pdfPath)) {
    console.log("PDF not found:", pdfPath);
    return;
  }

  const pdfBuffer = fs.readFileSync(pdfPath);
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: pdfBuffer });
  const textResult = await parser.getText();
  await parser.destroy();

  console.log(`Extracted raw text length: ${textResult.text.length} chars`);
  console.log("Raw text snippet:\n" + textResult.text.slice(0, 300) + "...\n");

  console.log("Running cleanMarkdownWithAi on extracted SOP/WIN PDF text...");
  const aiRes = await cleanMarkdownWithAi(textResult.text, {
    docTitle: "SOP HERO RMS Suggestion System",
  });

  console.log(`\nAI Enhanced: ${aiRes.isAiEnhanced} (Model: ${aiRes.modelUsed})`);
  console.log("--- AI Cleaned Structured SOP/WIN Markdown ---");
  console.log(aiRes.cleanMarkdown.slice(0, 1000) + "...\n");

  const chunks = chunkMarkdown(aiRes.cleanMarkdown, {
    chunkSize: 600,
    chunkOverlap: 100,
    docTitle: "SOP HERO RMS Suggestion System",
  });

  console.log(`Generated ${chunks.length} clean chunks!`);
  chunks.slice(0, 2).forEach((c) => {
    console.log(`\n[Chunk #${c.chunkIndex}] ${c.heading} (${c.charCount} chars)`);
    console.log(c.content);
  });
}

testPdfParseAndAiClean().catch(console.error);
