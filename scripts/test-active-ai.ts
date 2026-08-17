import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { sendRagChat, getRagEngineInfo } from "../lib/hero-genius/client";

async function testAllAiSystems() {
  console.log("=== Testing Active AI Systems in Repository ===");

  // 1. Test Hero Genius / Vision RAG LLM
  console.log("\n--- 1. Testing Hero Genius (Vision RAG LLM Backend) ---");
  try {
    const info = await getRagEngineInfo();
    console.log("RAG Engine Info:", info.data);

    const testPrompt = `Bersihkan dan rapikan teks spesifikasi berikut menjadi format Markdown dengan heading dan tabel:
Product: Michelin XDR 3
Features: New tread pattern, corrosion-resistant cables, longer service life
Size: 27.00R49
Pressure: 105 PSI
Back to search Close Loading...`;

    console.log("Sending test prompt to Hero Genius AI...");
    const res = await sendRagChat({
      query: testPrompt,
      messages: [
        {
          role: "system",
          content:
            "Anda adalah AI Technical Document Structurer. Rapikan teks teknis menjadi Clean Markdown yang rapi dengan tabel dan heading. Hapus teks navigasi (Back to search, Close, Loading).",
        },
        {
          role: "user",
          content: testPrompt,
        },
      ],
      top_k: 1,
    });

    console.log("✅ Hero Genius LLM is FUNCTIONAL! Output preview:\n" + res.data.answer.slice(0, 300) + "...\n");
  } catch (err: any) {
    console.log("❌ Hero Genius LLM error:", err.message);
  }

  // 2. Test OpenRouter / Inspection AI API if key present
  console.log("--- 2. Testing OpenRouter / Inspection AI Key ---");
  const openRouterKey =
    process.env.INSPECTION_AI_API_KEY ||
    process.env.OLLAMA_API_KEY ||
    process.env.TIRE_PATTERN_API_KEY ||
    "";

  if (openRouterKey) {
    console.log(`Found OpenRouter key (${openRouterKey.slice(0, 8)}...)`);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://chitraparatama.com",
          "X-Title": "Hero Genius AI Structurer",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a markdown structurer. Return only clean markdown.",
            },
            {
              role: "user",
              content: "Hello, format a 2-line markdown table.",
            },
          ],
          max_tokens: 150,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        console.log("✅ OpenRouter AI is FUNCTIONAL! Output:\n" + json.choices[0]?.message?.content);
      } else {
        console.log(`❌ OpenRouter returned status ${response.status}: ${await response.text()}`);
      }
    } catch (err: any) {
      console.log("❌ OpenRouter error:", err.message);
    }
  } else {
    console.log("ℹ️ No separate OpenRouter key found (will use Vision RAG LLM Backend).");
  }
}

testAllAiSystems().catch(console.error);
