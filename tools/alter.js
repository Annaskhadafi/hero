const { Client } = require('pg');
const url = 'postgresql://onecentral:Wusthochq2018-@31.97.187.38:5433/Onecentral?sslmode=disable';

async function main() {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    
    try {
      await client.query('ALTER TABLE hero_org_chart_nodes ADD COLUMN employee_id integer;');
      console.log('Added employee_id column');
    } catch (e) {
      console.log('Column add error (might already exist):', e.message);
    }
    
    try {
      await client.query('ALTER TABLE hero_org_chart_nodes ADD CONSTRAINT hero_org_chart_nodes_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hero_employees(id) ON DELETE SET NULL;');
      console.log('Added foreign key constraint');
    } catch (e) {
      console.log('Constraint add error:', e.message);
    }
  } catch(e) {
    console.error('Connection error:', e.message);
  } finally {
    await client.end();
  }
}

main();
