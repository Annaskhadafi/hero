const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://onecentral:Wusthochq2018-@31.97.187.38:5433/Onecentral?sslmode=disable',
});

async function run() {
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE "hero_daily_checklist_answers" ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb;
    `);
    console.log("Column attachments added successfully");
  } catch (err) {
    console.error("Error adding column:", err);
  } finally {
    await client.end();
  }
}

run();
