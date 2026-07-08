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
  
  // Update Repair / Retread Operation -> Repairman
  const res1 = await client.query(`
    UPDATE hero_employees
    SET job_title = 'Repairman'
    WHERE section_id IN (SELECT id FROM hero_master_sections WHERE name = 'Repair / Retread Operation')
    AND job_title != 'Repairman'
  `);
  console.log(`Updated ${res1.rowCount} employees in Repair / Retread Operation to Repairman`);

  // Update Service Operation MVC -> Serviceman
  const res2 = await client.query(`
    UPDATE hero_employees
    SET job_title = 'Serviceman'
    WHERE section_id IN (SELECT id FROM hero_master_sections WHERE name = 'Service Operation MVC')
    AND job_title != 'Serviceman'
  `);
  console.log(`Updated ${res2.rowCount} employees in Service Operation MVC to Serviceman`);

  // Update Service Operation Others -> Serviceman
  const res3 = await client.query(`
    UPDATE hero_employees
    SET job_title = 'Serviceman'
    WHERE section_id IN (SELECT id FROM hero_master_sections WHERE name = 'Service Operation Others')
    AND job_title != 'Serviceman'
  `);
  console.log(`Updated ${res3.rowCount} employees in Service Operation Others to Serviceman`);
  
  await client.end();
}
run();
