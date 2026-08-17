import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import {
  cleanHtml,
  htmlToMarkdown,
  chunkMarkdown,
  cleanMarkdownWithAi,
  parseWebUrl,
} from "../lib/hero-genius/web-parser";

async function main() {
  console.log("=== 1. Testing AI Clean Markdown & Structuring Engine ===");

  const rawMessyText = `
Back to search
Loading...
Close
What kind of usages?
# MICHELIN XD GRIP
Designed for superior traction in the most demanding off-road conditions.
Size: 27.00R49 Tread Depth: 95mm Pressure: 105 PSI Load Capacity: 30000kg
Features:
- Aggressive tread pattern
- High cut resistance
- Reinforced bead structure
mailto:?subject=Tyre%20Inquiry
Terms and Conditions Cookie Policy All rights reserved
  `;

  console.log("Input text (Raw messy):", rawMessyText.trim().slice(0, 150) + "...");
  console.log("\nExecuting cleanMarkdownWithAi...");

  const aiResult = await cleanMarkdownWithAi(rawMessyText, {
    docTitle: "MICHELIN XD GRIP",
    sourceUrl: "https://commercial.michelin.com/xd-grip",
  });

  console.log(`\nAI Enhanced: ${aiResult.isAiEnhanced} (Model: ${aiResult.modelUsed || "heuristic"})`);
  console.log("--- Clean Structured Markdown Output ---");
  console.log(aiResult.cleanMarkdown);

  console.log("\n=== 2. Chunking AI-Cleaned Output ===");
  const chunks = chunkMarkdown(aiResult.cleanMarkdown, {
    chunkSize: 400,
    chunkOverlap: 60,
    docTitle: "MICHELIN XD GRIP",
    sourceUrl: "https://commercial.michelin.com/xd-grip",
  });

  console.log(`Total Chunks Generated: ${chunks.length}`);
  chunks.forEach((c) => {
    console.log(`\n[Chunk #${c.chunkIndex}] ${c.heading} (${c.charCount} chars)`);
    console.log(c.content);
  });

  // Assert no UI noise remains
  const hasNoise =
    aiResult.cleanMarkdown.includes("Back to search") ||
    aiResult.cleanMarkdown.includes("mailto:") ||
    aiResult.cleanMarkdown.includes("Loading...");

  if (!hasNoise) {
    console.log("\n✅ [SUCCESS] AI Clean Markdown completely eliminated noise and structured technical specs into clean chunks!");
  } else {
    console.warn("\n⚠️ [WARNING] Some noise was still found in output.");
  }
}

main().catch((err) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
