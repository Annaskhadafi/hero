const { Client } = require('pg'); 
const client = new Client('postgresql://onecentral:Wusthochq2018-@31.97.187.38:5433/Onecentral'); 
async function run() { 
  await client.connect(); 
  const res = await client.query("SELECT e.full_name, n.id, n.name, n.parent_node_id, n.hierarchy_level FROM hero_hr_employees e LEFT JOIN hero_hr_org_nodes n ON e.org_node_id = n.id WHERE e.full_name ILIKE '%Romy Hidayat%'"); 
  console.log("Romy Hidayat Node:", res.rows); 
  const res2 = await client.query("SELECT id, name, parent_node_id, hierarchy_level FROM hero_hr_org_nodes WHERE id IN (4, 44)");
  console.log("Nodes 4 and 44:", res2.rows);
  await client.end(); 
} 
run().catch(console.error);
