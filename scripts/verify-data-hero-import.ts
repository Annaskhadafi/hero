import "dotenv/config";

import { Client } from "pg";

import { getDatabaseUrl } from "../lib/database-url";

async function main() {
  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: process.env.DATABASE_SSL?.toLowerCase() === "false" ? false : undefined,
  });

  await client.connect();

  const counts = await client.query(`
    select
      (select count(*) from hero_hr_departments) as departments,
      (select count(*) from hero_hr_sections) as sections,
      (select count(*) from hero_hr_sites) as sites,
      (select count(*) from hero_hr_work_locations) as work_locations,
      (select count(*) from hero_hr_positions) as positions,
      (select count(*) from hero_hr_org_nodes) as org_nodes,
      (select count(*) from hero_hr_employees) as employees,
      (select count(*) from hero_hr_employees where org_node_id is not null) as employees_with_org_node,
      (select count(*) from hero_hr_employees where position_id is not null) as employees_with_position,
      (select count(*) from hero_hr_employees where email is null) as employees_without_email
  `);

  console.log(JSON.stringify(counts.rows[0], null, 2));
  await client.end();
}

main().catch((error) => {
  console.error("DATA HERO verification failed.", error);
  process.exit(1);
});
