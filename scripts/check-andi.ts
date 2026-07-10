import { db } from '@/db';
import { trainingRecords, sioCertifications, employees } from '@/db/schema/hero';
import { eq, ilike } from 'drizzle-orm';

async function run() {
  const emp = await db.select().from(employees).where(ilike(employees.name, '%andi ibrahim%'));
  console.log('Employees:', emp.map(e => ({ id: e.id, name: e.name })));
  
  if (emp.length === 0) return;
  const empId = emp[0].id;
  
  const tr = await db.select().from(trainingRecords).where(eq(trainingRecords.employeeId, empId));
  console.log('Training:', tr.map(t => ({ name: t.trainingName, status: t.status })));
  
  const sio = await db.select().from(sioCertifications).where(eq(sioCertifications.employeeId, empId));
  console.log('SIO:', sio.map(s => ({ name: s.certName, type: s.certType, status: s.status })));
}

run().catch(console.error);
