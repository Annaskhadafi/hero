const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "dashboard", "central-service", "page.tsx");
let content = fs.readFileSync(filePath, "utf8");

// Add viewingEmployee state after editingEmployee
content = content.replace(
  /const \[editingEmployee, setEditingEmployee\] = useState<Employee \| null>\(null\);/,
  `const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);`
);

// Update view button to use setViewingEmployee
content = content.replace(
  /<Button size="sm" variant="ghost" onClick=\{\(\) => setEditingEmployee\(emp\)\} title="View Details">/,
  `<Button size="sm" variant="ghost" onClick={() => setViewingEmployee(emp)} title="View Details">`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Added viewingEmployee state and updated view button");
