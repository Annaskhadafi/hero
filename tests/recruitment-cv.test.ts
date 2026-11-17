import { getCvDetails } from "@/app/actions/recruitment";
import { checkS3ObjectExists } from "@/lib/s3-storage";
import assert from "assert";

async function runTests() {
  console.log("Starting Recruitment CV tests...");

  // Test 1: Null/empty input
  console.log("Test 1: null cvUrl");
  const nullResult = await getCvDetails(null);
  assert.strictEqual(nullResult.url, null);
  assert.strictEqual(nullResult.exists, false);
  assert.strictEqual(nullResult.fileName, "");
  console.log("✓ Test 1 passed: null handled correctly");

  // Test 2: Missing/lost file
  console.log("Test 2: missing cvUrl (Hengki Hariyono)");
  const missingUrl = "/api/uploads/public-career-cv/CV_Hengki_Hariyono__smd_1-398cbcdb.pdf";
  const missingResult = await getCvDetails(missingUrl);
  assert.strictEqual(missingResult.exists, false);
  assert.strictEqual(missingResult.url, missingUrl);
  assert.strictEqual(missingResult.fileName, "CV_Hengki_Hariyono__smd_1-398cbcdb.pdf");
  console.log("✓ Test 2 passed: missing file correctly detected as exists=false");

  // Test 3: checkS3ObjectExists for nonexistent key
  console.log("Test 3: checkS3ObjectExists for nonexistent key");
  const s3Exists = await checkS3ObjectExists("public-career-cv/nonexistent-file-99999.pdf");
  assert.strictEqual(s3Exists, false);
  console.log("✓ Test 3 passed: non-existent S3 key returns false");

  console.log("All Recruitment CV unit tests passed successfully! 🎉");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
