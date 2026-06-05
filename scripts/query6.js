const { Client } = require('pg'); 
const client = new Client('postgresql://onecentral:Wusthochq2018-@31.97.187.38:5433/Onecentral'); 
async function run() { 
  await client.connect(); 
  const res = await client.query("SELECT e.full_name, e.department_id FROM hero_hr_employees e WHERE e.full_name ILIKE '%Dedi Irawan%' OR e.full_name ILIKE '%Ary Maulana%'"); 
  console.log(res.rows); 
  await client.end(); 
} 
run().catch(console.error);
