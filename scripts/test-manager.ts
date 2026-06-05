import { db } from "../db"
import { hrEmployees, hrOrgNodes, hrPositions } from "../db/schema/hero"
import { eq } from "drizzle-orm"

async function run() {
  const emps = await db.select({
    id: hrEmployees.id,
    name: hrEmployees.fullName,
    orgNodeId: hrEmployees.orgNodeId,
    parentNodeId: hrOrgNodes.parentNodeId,
    position: hrPositions.levelName,
    isManagerial: hrPositions.isManagerial
  }).from(hrEmployees)
    .leftJoin(hrOrgNodes, eq(hrEmployees.orgNodeId, hrOrgNodes.id))
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .limit(20);
  console.log(emps);
  process.exit(0);
}
run();
