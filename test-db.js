const { Client } = require('pg');

const url = 'postgresql://onecentral:Wusthochq2018-@31.97.187.38:1220/Onecentral';

async function test(suffix, ssl) {
  const client = new Client({ connectionString: url + suffix, ssl });
  try {
    await client.connect();
    const res = await client.query('SELECT 1 as val');
    console.log(`Success! Suffix: ${suffix}, SSL: ${JSON.stringify(ssl)}`, res.rows);
  } catch (err) {
    console.error(`Error! Suffix: ${suffix}, SSL: ${JSON.stringify(ssl)} =>`, err.message);
  } finally {
    try { await client.end(); } catch (e) {}
  }
}

async function main() {
  await test('?sslmode=disable', false);
  await test('?sslmode=require', { rejectUnauthorized: false });
  await test('', false);
  await test('', { rejectUnauthorized: false });
}

main();
