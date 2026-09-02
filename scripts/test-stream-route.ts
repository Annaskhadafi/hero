import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { GET } from "../app/api/hero-genius/document-stream/route";
import { NextRequest } from "next/server";

async function testStream(url: string, filename: string, format?: string) {
  console.log(`\nTesting stream for: ${filename} (format: ${format})`);
  const reqUrl = `http://localhost:3000/api/hero-genius/document-stream?url=${encodeURIComponent(
    url
  )}&filename=${encodeURIComponent(filename)}&format=${encodeURIComponent(format || "")}`;

  const req = new NextRequest(reqUrl);
  const res = await GET(req);

  console.log(`- Status: ${res.status}`);
  console.log(`- Content-Type: ${res.headers.get("content-type")}`);
  console.log(`- Content-Length: ${res.headers.get("content-length")} bytes`);

  if (res.status === 200) {
    console.log(`✅ [SUCCESS] Successfully streamed ${filename}`);
  } else {
    const json = await res.json().catch(() => ({}));
    console.error(`❌ [FAILED] Stream returned ${res.status}:`, json);
  }
}

async function testRange(url: string, filename: string) {
  console.log(`\nTesting HTTP Range 206 stream for: ${filename}`);
  const reqUrl = `http://localhost:3000/api/hero-genius/document-stream?url=${encodeURIComponent(
    url
  )}&filename=${encodeURIComponent(filename)}`;

  const req = new NextRequest(reqUrl, {
    headers: {
      Range: "bytes=0-2047",
    },
  });
  const res = await GET(req);

  console.log(`- Status: ${res.status}`);
  console.log(`- Content-Type: ${res.headers.get("content-type")}`);
  console.log(`- Content-Range: ${res.headers.get("content-range")}`);
  console.log(`- Content-Length: ${res.headers.get("content-length")} bytes`);

  if (res.status === 206) {
    console.log(`✅ [SUCCESS] Successfully streamed 206 partial content for ${filename}`);
  } else {
    console.error(`❌ [FAILED] Range stream returned ${res.status}`);
  }
}

async function main() {
  console.log("=== Testing Document Stream Proxy Route ===");

  // 1. PDF file (CloudHost S3)
  await testStream(
    "https://is3.cloudhost.id/onechitra/upload/befcb944e1_WIN.SVC.SEM-028.03_PROSEDURE_PERGANTIAN_PULLEY_COUPLING_KOMPRESSOR_ATLAS_COPCO_97Dd.pdf",
    "WIN.SVC.SEM-028.03_PROSEDURE_PERGANTIAN_PULLEY_COUPLING_KOMPRESSOR_ATLAS_COPCO_97Dd.pdf",
    "pdf"
  );

  // 2. Test Range on the same S3 PDF
  await testRange(
    "https://is3.cloudhost.id/onechitra/upload/befcb944e1_WIN.SVC.SEM-028.03_PROSEDURE_PERGANTIAN_PULLEY_COUPLING_KOMPRESSOR_ATLAS_COPCO_97Dd.pdf",
    "WIN.SVC.SEM-028.03_PROSEDURE_PERGANTIAN_PULLEY_COUPLING_KOMPRESSOR_ATLAS_COPCO_97Dd.pdf"
  );
}

main().catch(console.error);

