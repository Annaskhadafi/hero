import { db } from '@/db';
import { trainingRecords, employees } from '@/db/schema/hero';
import { eq, ilike } from 'drizzle-orm';
import Fuse from 'fuse.js';

async function run() {
  const records = await db
    .select({ trainingName: trainingRecords.trainingName, name: employees.name })
    .from(trainingRecords)
    .innerJoin(employees, eq(trainingRecords.employeeId, employees.id))
    .where(ilike(employees.name, '%Abdul Hafiz Hilman%'));
  
  console.log("Records:", records);
  
  const thKeywords = ['forklift', 'loader', 'tyrehandler', 'tyre handler', 'heavy', 'excavator', 'dozer', 'grader'];

  for (const record of records) {
    const name = record.trainingName.toLowerCase();
    const words = name.split(/[\s,/-]+/);
    const wordFuse = new Fuse(words.map(w => ({ word: w })), { keys: ['word'], threshold: 0.3 });
    
    let matchedTH = false;
    for (const kw of thKeywords) {
      const results = wordFuse.search(kw);
      if (results.length > 0 || name.includes(kw)) {
        console.log(`Matched '${kw}' in '${name}', results:`, results);
        matchedTH = true;
        break;
      }
    }
    console.log(`Final matchedTH for '${name}':`, matchedTH);
  }

  process.exit(0);
}
run();
