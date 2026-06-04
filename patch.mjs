import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('app/dashboard/hc/surat-*/client-form.tsx');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('useMemo')) {
    content = content.replace(/import \{ ([^\}]+) \} from 'react'/, "import { $1, useMemo } from 'react'");
  }
  
  const searchPattern = /const normalizedEmployeeSearch = employeeSearch\.trim\(\)\.toLowerCase\(\)[\s\S]+?const visibleEmployeeResults = filteredEmployees\.slice\(0, 8\)/;
  
  const replacement = `const visibleEmployeeResults = useMemo(() => {
    const normalized = employeeSearch.trim().toLowerCase();
    if (!normalized) return employees.slice(0, 8);
    return employees.filter(e => {
      const vals = [e.name, e.employeeSn, e.jobTitle, e.section, (e as any).levelName, (e as any).employeeStatusType];
      return vals.filter(Boolean).join(' ').toLowerCase().includes(normalized);
    }).slice(0, 8);
  }, [employees, employeeSearch]);`;

  if (searchPattern.test(content)) {
    content = content.replace(searchPattern, replacement);
    fs.writeFileSync(file, content);
    console.log('Patched', file);
  } else {
    console.log('Skipped', file);
  }
}
