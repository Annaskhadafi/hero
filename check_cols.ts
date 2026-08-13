import { getSapPool } from './lib/cs-sap-db';
getSapPool().query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_revenue_sap'`)
  .then(res => console.log(res.rows.map(r => r.column_name)))
  .catch(console.error)
  .finally(() => process.exit(0));
