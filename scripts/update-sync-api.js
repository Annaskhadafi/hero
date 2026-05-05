const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "api", "central-service", "employees", "sync", "route.ts");
let content = fs.readFileSync(filePath, "utf8");

// Revert department back to use original from csEmployee
content = content.replace(
  /department: "Central Service",  \/\/ Always set to Central Service/g,
  `department: csEmployee.department || "Central Services",  // Keep original or default`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Updated sync API to keep original department");
