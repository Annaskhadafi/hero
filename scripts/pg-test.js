import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env") });
import pkg from "pg";
const { Client } = pkg;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const res = await client.query("SELECT * FROM hero_master_job_titles WHERE name ILIKE '%Repair%' OR name ILIKE '%Database%' LIMIT 10");
  console.log(res.rows);
  const emp = await client.query("SELECT employee_sn, name, position_id FROM hero_employees WHERE employee_sn = '77901'");
  console.log(emp.rows);
  await client.end();
}
run();
