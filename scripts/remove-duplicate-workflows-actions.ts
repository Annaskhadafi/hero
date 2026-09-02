import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "app/dashboard/sop-win/actions.ts");
let content = fs.readFileSync(filePath, "utf8");

const firstIdx = content.indexOf("export async function getSopWinDepartmentWorkflowsAction");
const lastIdx = content.lastIndexOf("export async function getSopWinDepartmentWorkflowsAction");

if (firstIdx !== -1 && lastIdx !== -1 && firstIdx !== lastIdx) {
  console.log(`First occurrence at ${firstIdx}, last at ${lastIdx}. Removing first occurrence...`);
  // Find where the first block ends (up to the second occurrence banner)
  const bannerIdx = content.indexOf("// ─── Department Workflow Matrix Server Actions", firstIdx + 1);
  if (bannerIdx !== -1) {
    content = content.slice(0, firstIdx) + content.slice(bannerIdx);
    fs.writeFileSync(filePath, content, "utf8");
    console.log("CLEANED DUPLICATE getSopWinDepartmentWorkflowsAction SUCCESSFULLY!");
  }
} else {
  console.log("No duplicate getSopWinDepartmentWorkflowsAction found.");
}
