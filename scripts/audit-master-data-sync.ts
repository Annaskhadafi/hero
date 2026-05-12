import "dotenv/config";
import { runMasterDataSyncAudit } from "@/lib/master-data-sync-audit";

async function main() {
  const audit = await runMasterDataSyncAudit();

  console.log(`Master data sync audit generated at ${audit.generatedAt}`);
  console.log(`Employees: ${audit.counts.employees}`);
  console.log(`Auth users: ${audit.counts.authUsers}`);
  console.log(`HR employees: ${audit.counts.hrEmployees}`);
  console.log(`Issues: ${audit.counts.issues} (${audit.counts.critical} critical, ${audit.counts.warning} warning, ${audit.counts.info} info)`);

  const grouped = audit.issues.reduce<Record<string, typeof audit.issues>>((acc, issue) => {
    acc[issue.code] ??= [];
    acc[issue.code].push(issue);
    return acc;
  }, {});

  for (const [code, issues] of Object.entries(grouped)) {
    console.log(`\n${code} (${issues.length})`);
    for (const issue of issues.slice(0, 20)) {
      console.log(`- [${issue.severity}] ${issue.entity} ${issue.entityId}: ${issue.label} — ${issue.detail}`);
    }
    if (issues.length > 20) {
      console.log(`- ... ${issues.length - 20} more`);
    }
  }

  if (audit.counts.critical > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
