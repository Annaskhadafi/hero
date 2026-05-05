const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "api", "central-service", "employees", "route.ts");
let content = fs.readFileSync(filePath, "utf8");

// Update filter to match Central Services (with s) or variations
content = content.replace(
  /conditions\.push\(eq\(centralServiceEmployees\.department, "Central Service"\)\);/,
  `// Filter by Central Services department (with variations)
    conditions.push(
      or(
        eq(centralServiceEmployees.department, "Central Services"),
        eq(centralServiceEmployees.department, "CENTRAL SERVICES"),
        eq(centralServiceEmployees.department, "Central Service")
      )
    );`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Updated API filter to match Central Services department variations");
