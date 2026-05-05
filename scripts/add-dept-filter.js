const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "api", "central-service", "employees", "route.ts");
let content = fs.readFileSync(filePath, "utf8");

// Add department filter
content = content.replace(
  /\/\/ Apply filters\s+const conditions = \[\];/,
  `// Apply filters
    const conditions = [];

    // Always filter by Central Service department
    conditions.push(eq(centralServiceEmployees.department, "Central Service"));`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Added Central Service department filter to API");
