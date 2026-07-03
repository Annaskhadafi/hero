import { getApprovalCenterData } from "../lib/approval-workspace";

async function main() {
  const data = await getApprovalCenterData("andana@chitra.co.id"); // Assume Andana's email
  
  console.log("Inbox Groups for Andana:", JSON.stringify(data.inboxGroups, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
