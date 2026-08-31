import fs from "fs";
import path from "path";

const actionsPath = path.join(process.cwd(), "app/dashboard/sop-win/actions.ts");
const lines = fs.readFileSync(actionsPath, "utf8").split(/\r?\n/);

// Find index of "export async function upsertSopWinDepartmentWorkflowAction(input: {" around line 2856
const targetIdx = lines.findIndex((l, i) => i > 2840 && l.includes("export async function upsertSopWinDepartmentWorkflowAction(input: {"));

if (targetIdx !== -1) {
  // Find index of "function errorUserNotLoggedIn() {" after targetIdx
  const endIdx = lines.findIndex((l, i) => i > targetIdx && l.includes("function errorUserNotLoggedIn() {"));
  if (endIdx !== -1) {
    console.log(`Removing lines ${targetIdx + 1} to ${endIdx}...`);
    lines.splice(targetIdx, endIdx - targetIdx);
    fs.writeFileSync(actionsPath, lines.join("\n"), "utf8");
    console.log("SUCCESSFULLY REMOVED BROKEN HEADER!");
  }
}
