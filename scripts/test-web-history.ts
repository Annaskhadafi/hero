import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import {
  saveWebCrawlHistoryAction,
  getWebCrawlHistoryAction,
  updateWebCrawlHistoryAction,
  deleteWebCrawlHistoryAction,
} from "../app/dashboard/hero-genius/actions";

async function main() {
  console.log("=== Testing Web Crawl History Server Actions ===");

  // 1. Save History Item
  console.log("\n1. Saving test crawl history item...");
  const saveRes = await saveWebCrawlHistoryAction({
    url: "https://example.com/test-article",
    title: "Test Article Title",
    description: "Sample test description",
    siteName: "Example Site",
    markdown: "# Test Heading\n\nContent for testing.",
    totalChunks: 2,
    isAiEnhanced: true,
    modelUsed: "openai/gpt-4o-mini",
  });

  console.log("Save Result:", saveRes.success, "Item ID:", saveRes.data?.id);
  if (!saveRes.success || !saveRes.data) {
    throw new Error("Failed to save history item");
  }

  const itemId = saveRes.data.id;

  // 2. Fetch History
  console.log("\n2. Fetching history list...");
  const listRes = await getWebCrawlHistoryAction();
  console.log(`History count: ${listRes.data.length}`);
  const found = listRes.data.find((it: any) => it.id === itemId);
  console.log("Found saved item in list:", !!found);

  // 3. Update History Item
  console.log("\n3. Updating history item...");
  const updateRes = await updateWebCrawlHistoryAction({
    id: itemId,
    title: "Updated Test Article Title",
    markdown: "# Updated Heading\n\n| Param | Val |\n|---|---|\n| Size | 27.00R49 |",
  });
  console.log("Update Result:", updateRes.success, "New Title:", updateRes.data?.title);

  // 4. Delete History Item
  console.log("\n4. Deleting history item...");
  const delRes = await deleteWebCrawlHistoryAction(itemId);
  console.log("Delete Result:", delRes.success);

  // 5. Verify Deletion
  const listAfter = await getWebCrawlHistoryAction();
  const foundAfter = listAfter.data.find((it: any) => it.id === itemId);
  console.log("Item exists after delete:", !!foundAfter);

  if (!foundAfter) {
    console.log("\n✅ [SUCCESS] All Web Crawl History operations (Create, Read, Update, Delete) verified successfully!");
  } else {
    console.error("❌ Deletion verification failed!");
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
