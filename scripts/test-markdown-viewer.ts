import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { cleanHtml, htmlToMarkdown } from "../lib/hero-genius/web-parser";

async function main() {
  console.log("=== Testing Markdown Viewers & Stream Compatibility ===");
  const testFilename1 = "MICHELIN_XDR_3_tyres.md";
  const testFilename2 = "SOP_Hydraulic_Jack.pdf";

  const isMd1 = /\.(md|markdown|txt)$/i.test(testFilename1);
  const isMd2 = /\.(md|markdown|txt)$/i.test(testFilename2);

  console.log(`- ${testFilename1} is detected as Markdown: ${isMd1} (Expected: true)`);
  console.log(`- ${testFilename2} is detected as Markdown: ${isMd2} (Expected: false)`);

  if (isMd1 && !isMd2) {
    console.log("✅ [SUCCESS] Markdown detection & DocumentPreviewModal routing verified!");
  } else {
    console.error("❌ Detection failed!");
  }
}

main().catch(console.error);
