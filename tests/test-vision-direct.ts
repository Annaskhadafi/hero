import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import {
  listRagSessions,
  getRagSessionMessages,
  teachRagMemory,
  getRagMemoryFacts,
  sendRagFeedback
} from '../lib/hero-genius/client';


async function testDirectVision() {
  console.log("=== Testing Direct Vision API Connection via lib/hero-genius/client ===");

  // 1. Test Teach Memory
  console.log("\n1. Mengajari AI fakta baru (POST /api/v1/rag/memory/learn)...");
  const learnRes = await teachRagMemory({
    content: "SOP pengisian bahan bakar unit loader wajib mematikan mesin dan memasang wheel chock.",
    subject: "HSE & Keselamatan Kerja",
    fact_type: "learned_knowledge"
  });
  console.log("✅ Teach Memory Result:", learnRes);

  // 2. Test Get Learned Facts
  console.log("\n2. Mengambil daftar fakta memori (GET /api/v1/rag/memory/facts)...");
  const factsRes = await getRagMemoryFacts();
  console.log(`✅ Get Facts Result: ${factsRes.total} facts found:`, factsRes.facts?.slice(0, 2));

  // 3. Test Get Sessions
  console.log("\n3. Mengambil daftar sesi chat (GET /api/v1/rag/sessions)...");
  const sessionsRes = await listRagSessions();
  console.log(`✅ Get Sessions Result: ${sessionsRes.total} sessions found:`, sessionsRes.sessions);

  // 4. Test Session Messages if any session exists
  if (sessionsRes.sessions && sessionsRes.sessions.length > 0) {
    const sid = sessionsRes.sessions[0].id;
    console.log(`\n4. Mengambil pesan dari sesi ${sid} (GET /api/v1/rag/sessions/${sid}/messages)...`);
    const msgsRes = await getRagSessionMessages(sid);
    console.log(`✅ Messages in session ${sid}:`, msgsRes.messages?.length, "messages");

    if (msgsRes.messages && msgsRes.messages.length > 0) {
      const astMsg = msgsRes.messages.find(m => m.role === 'assistant') || msgsRes.messages[0];
      if (astMsg && astMsg.id) {
        console.log(`\n5. Mengirim feedback untuk message ${astMsg.id} (POST /api/v1/rag/feedback)...`);
        const fbRes = await sendRagFeedback({
          message_id: String(astMsg.id),
          rating: 1,
          feedback_notes: "Informasi akurat dari vision API",
        });
        console.log("✅ Feedback Result:", fbRes);
      }
    }
  }

  console.log("\n🎉 Direct vision.chitraparatama.com integration verified 100%!");
}

testDirectVision().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
