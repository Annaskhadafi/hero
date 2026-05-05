const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "api", "central-service", "employees", "sync", "route.ts");
let content = fs.readFileSync(filePath, "utf8");

// Replace department field in both update and insert
content = content.replace(
  /department: csEmployee\.department,/g,
  `department: "Central Service",  // Always set to Central Service`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Updated sync API to use Central Service department");
