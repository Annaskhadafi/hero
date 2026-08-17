import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runVerification() {
  console.log("=== Testing Hero Genius Self-Growth & Smart Memory Endpoints & DB ===");
  const client = await pool.connect();
  try {
    // 1. Check Tables exist and structure
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('hero_genius_sessions', 'hero_genius_messages', 'hero_genius_feedback', 'hero_genius_learned_facts');
    `);
    console.log("Found Tables:", tablesRes.rows.map(r => r.table_name));

    // 2. Test Inserting a Learned Fact
    const factInsert = await client.query(`
      INSERT INTO hero_genius_learned_facts (fact, category, source, tags, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *;
    `, [
      "Tekanan angin standar ban loader tipe Michelin XLDD2 26.5R25 adalah 75 PSI untuk site tambang Vale.",
      "Ban & Spesifikasi Teknis",
      "Head of Technical",
      JSON.stringify(["michelin", "tekanan", "vale", "loader"])
    ]);
    console.log("✅ Insert Fact Success:", factInsert.rows[0].id, factInsert.rows[0].fact.slice(0, 50));

    // 3. Test Querying Learned Facts
    const factsList = await client.query(`
      SELECT id, fact, category, source, is_active 
      FROM hero_genius_learned_facts 
      WHERE is_active = true 
      ORDER BY created_at DESC;
    `);
    console.log(`✅ Query Active Facts Success: ${factsList.rows.length} facts found`);

    // 4. Test Session & Message Logging
    const testSessionId = `test-sess-${Date.now()}`;
    await client.query(`
      INSERT INTO hero_genius_sessions (id, title, message_count)
      VALUES ($1, $2, 2);
    `, [testSessionId, "Testing PTW workflow query"]);

    const testMsg = await client.query(`
      INSERT INTO hero_genius_messages (session_id, role, content, feedback_rating)
      VALUES ($1, 'assistant', 'Berikut adalah alur pengajuan izin kerja PTW...', 'up')
      RETURNING *;
    `, [testSessionId]);
    console.log("✅ Session & Message Logging Success, Message ID:", testMsg.rows[0].id);

    // 5. Test Feedback Submission
    const fbRes = await client.query(`
      INSERT INTO hero_genius_feedback (session_id, message_id, query, answer, rating, feedback_text)
      VALUES ($1, $2, 'Alur PTW', 'Berikut alur PTW...', 'up', 'Jawaban sangat lengkap dan akurat')
      RETURNING id, rating, status;
    `, [testSessionId, String(testMsg.rows[0].id)]);
    console.log("✅ Feedback Logging Success, Feedback ID:", fbRes.rows[0].id);

    // Clean up test session data
    await client.query(`DELETE FROM hero_genius_feedback WHERE session_id = $1;`, [testSessionId]);
    await client.query(`DELETE FROM hero_genius_sessions WHERE id = $1;`, [testSessionId]);
    console.log("✅ Cleaned up temporary test session.");

    console.log("\n🎉 ALL HERO GENIUS SELF-GROWTH TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Test Failed:", err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runVerification();
