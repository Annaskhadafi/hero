import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "app/dashboard/sop-win/actions.ts");
let content = fs.readFileSync(filePath, "utf8");

// Find second occurrence of "function errorUserNotLoggedIn" or duplicate getSopWinDocumentRequestsAction
const firstIndex = content.indexOf("function errorUserNotLoggedIn");
const secondIndex = content.indexOf("function errorUserNotLoggedIn", firstIndex + 1);

if (secondIndex !== -1) {
  // Find where the duplicate block ends (right before getSopWinDepartmentWorkflowsAction)
  const deptWfIdx = content.indexOf("// ─── Department Workflow Matrix Server Actions", secondIndex);
  if (deptWfIdx !== -1) {
    console.log(`Removing duplicate section from byte ${secondIndex} to ${deptWfIdx}...`);
    content = content.slice(0, secondIndex) + content.slice(deptWfIdx);
    fs.writeFileSync(filePath, content, "utf8");
    console.log("SUCCESSFULLY REMOVED DUPLICATE BLOCK!");
  }
} else {
  console.log("No duplicate block found.");
}
