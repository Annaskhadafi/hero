const { Client } = require('pg'); 
const client = new Client('postgresql://onecentral:Wusthochq2018-@31.97.187.38:5433/Onecentral'); 
async function run() { 
  await client.connect(); 
  const res = await client.query("SELECT e.full_name, d.name as dept, p.level_name, p.rank_name, p.is_managerial FROM hero_hr_employees e LEFT JOIN hero_hr_departments d ON e.department_id = d.id LEFT JOIN hero_hr_positions p ON e.position_id = p.id WHERE e.is_active = true AND (d.name ILIKE '%HR%' OR d.name ILIKE '%Human%')"); 
  console.log(res.rows); 
  await client.end(); 
} 
run().catch(console.error);
