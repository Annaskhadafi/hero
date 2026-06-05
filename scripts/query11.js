const { db } = require('../db');
const { hrEmployees, hrDepartments, hrPositions } = require('../db/schema/hr');
const { eq } = require('drizzle-orm');

async function run() {
  const employees = await db
    .select({
      name: hrEmployees.fullName,
      position: hrPositions.levelName,
      rank: hrPositions.rankName,
    })
    .from(hrEmployees)
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .where(eq(hrEmployees.fullName, 'Febrian Dani'));
  console.log(employees);
}
run().catch(console.error);
