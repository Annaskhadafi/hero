import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import {
  listRagDocuments,
  searchRagKnowledge,
  sendRagChat,
  getRagDocumentChunks,
} from "../lib/hero-genius/client";

async function main() {
  console.log("=== 1. Checking Documents in Knowledge Base ===");
  const docsRes = await listRagDocuments();
  console.log(`Total Documents: ${docsRes.total_documents}`);
  docsRes.documents.forEach((d) => {
    console.log(`- [${d.id}] ${d.filename} (${d.format}) - ${d.total_chunks} chunks, ${d.char_count} chars`);
  });

  const michelinDoc = docsRes.documents.find((d) =>
    d.filename.toLowerCase().includes("michelin") || d.filename.toLowerCase().includes("xdgrip")
  );

  if (michelinDoc) {
    console.log(`\n=== 2. Inspecting Chunks of ${michelinDoc.filename} (${michelinDoc.id}) ===`);
    const chunksRes = await getRagDocumentChunks(michelinDoc.id);
    console.log(`Found ${chunksRes.total_chunks} chunks:`);
    chunksRes.chunks.slice(0, 3).forEach((c) => {
      console.log(`\n--- Chunk #${c.chunk_index} (${c.heading}) ---`);
      console.log(c.content.slice(0, 300) + "...");
    });
  }

  console.log("\n=== 3. Testing Semantic Search for 'michelin xdgrip' ===");
  const searchRes = await searchRagKnowledge("michelin xdgrip", 4);
  console.log(`Found ${searchRes.results_count} results:`);
  searchRes.results.forEach((r) => {
    console.log(`- [Score: ${r.similarity_score}] ${r.filename} > ${r.heading || 'No Heading'}`);
    console.log(`  Content preview: ${r.content.slice(0, 150)}...`);
  });

  console.log("\n=== 4. Testing RAG Chat Query 'jelaskan tentang michelin xdgrip' ===");
  const chatRes = await sendRagChat({
    query: "jelaskan tentang michelin xdgrip",
    top_k: 4,
  });

  console.log("AI Answer:", chatRes.data.answer);
  console.log("Sources:", chatRes.data.sources);
  console.log("Retrieved Chunks Count:", chatRes.data.retrieved_chunks_count);
}

main().catch((err) => {
  console.error("Debug failed:", err);
  process.exit(1);
});
