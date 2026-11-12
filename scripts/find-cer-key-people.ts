import { db } from '../db';
import { employees } from '../db/schema/hero';
import { ilike, or } from 'drizzle-orm';

async function main() {
  const emps = await db.select({
    id: employees.id,
    name: employees.name,
    email: employees.email,
    jobTitle: employees.jobTitle,
  }).from(employees).where(
    or(
      ilike(employees.name, '%amama%'),
      ilike(employees.name, '%febrian%'),
      ilike(employees.name, '%syamsul%'),
      ilike(employees.name, '%indra%'),
      ilike(employees.name, '%gilang%')
    )
  );
  console.log('Found employees:');
  for (const e of emps) {
    console.log(`- ID: ${e.id} | Name: ${e.name} | Email: ${e.email} | Title: ${e.jobTitle}`);
  }
}
main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
