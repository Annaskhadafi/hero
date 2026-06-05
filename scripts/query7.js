const { Client } = require('pg'); 
const client = new Client('postgresql://onecentral:Wusthochq2018-@31.97.187.38:5433/Onecentral'); 
async function run() { 
  await client.connect(); 
  const res = await client.query("SELECT e.full_name, e.org_node_id, e.department_id, p.level_name, p.rank_name FROM hero_hr_employees e LEFT JOIN hero_hr_positions p ON e.position_id = p.id WHERE e.full_name ILIKE '%Didik Wahyudi%'"); 
  console.log(res.rows); 
  await client.end(); 
} 
run().catch(console.error);
