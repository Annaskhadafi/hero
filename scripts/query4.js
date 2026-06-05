const { Client } = require('pg'); 
const client = new Client('postgresql://onecentral:Wusthochq2018-@31.97.187.38:5433/Onecentral'); 
async function run() { 
  await client.connect(); 
  let current_node = 57;
  console.log("Path for Dedi Irawan (Node 57):");
  while (current_node) {
    const res = await client.query("SELECT n.id, n.parent_node_id, n.name, e.full_name, e.department_id FROM hero_hr_org_nodes n LEFT JOIN hero_hr_employees e ON n.id = e.org_node_id WHERE n.id = $1", [current_node]);
    if (res.rows.length === 0) break;
    console.log(`Node ${res.rows[0].id}: ${res.rows[0].name}`);
    for (const row of res.rows) {
        if (row.full_name) console.log(`  -> Employee: ${row.full_name}`);
    }
    current_node = res.rows[0].parent_node_id;
  }
  await client.end(); 
} 
run().catch(console.error);
