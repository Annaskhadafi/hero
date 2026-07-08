import { getEmployeeFilterOptions } from "./app/actions/employee";

async function main() {
  const options = await getEmployeeFilterOptions();
  console.log("Departments:", options.departments.map(d => ({id: d.id, name: d.name})));
  
  const csDeptId = options.departments.find(d => d.name === "Central Services")?.id;
  console.log("CS Dept ID:", csDeptId);
  
  const csSections = options.sections.filter(s => s.departmentId === csDeptId);
  console.log("CS Sections:", csSections);
  
  process.exit(0);
}

main();
