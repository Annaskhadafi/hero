import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://onechitranewdb:Wusthochq2018-@31.97.187.38:5475/onechitranewdb' });

export async function GET() {
  try {
    const result = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_revenue_sap'`);
    return NextResponse.json({ columns: result.rows.map(r => r.column_name) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
