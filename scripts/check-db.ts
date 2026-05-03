import { db } from "../db";
import { employees, masterDepartments, masterSections, masterPositions, sites } from "../db/schema/hero";

async function main() {
  const allSites = await db.select().from(sites);
  console.log('=== SITES ===');
  allSites.forEach(s => console.log(JSON.stringify({id: s.id, name: s.name, customerName: s.customerName})));

  const allDepts = await db.select().from(masterDepartments);
  console.log('\n=== DEPARTMENTS ===');
  allDepts.forEach(d => console.log(JSON.stringify({id: d.id, code: d.code, name: d.name})));

  const allSections = await db.select().from(masterSections);
  console.log('\n=== SECTIONS ===');
  allSections.forEach(s => console.log(JSON.stringify({id: s.id, code: s.code, name: s.name, departmentId: s.departmentId})));

  const allPositions = await db.select().from(masterPositions);
  console.log('\n=== POSITIONS ===');
  allPositions.forEach(p => console.log(JSON.stringify({id: p.id, code: p.code, name: p.name, departmentId: p.departmentId, sectionId: p.sectionId})));

  const allEmps = await db.select().from(employees);
  console.log(`\n=== EMPLOYEES (${allEmps.length}) ===`);
  allEmps.forEach(e => console.log(JSON.stringify({id: e.id, name: e.name, email: e.email, role: e.role, department: e.department, section: e.section, jobTitle: e.jobTitle, departmentId: e.departmentId, sectionId: e.sectionId, positionId: e.positionId, siteId: e.siteId})));
}
main().catch(console.error).finally(() => process.exit());
