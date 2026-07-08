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
  const emp = await client.query("SELECT employee_sn, name, position_id, job_title FROM hero_employees WHERE employee_sn IN ('77901', '77900', '77899', '77898', '77897')");
  console.log(emp.rows);
  await client.end();
}
run();
