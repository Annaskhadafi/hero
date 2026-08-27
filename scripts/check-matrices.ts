import { db } from '@/db';
import { approvalMatrices, approvalMatrixSteps, orgChartNodes, employees, sites } from '@/db/schema/hero';
import { eq, inArray, asc } from 'drizzle-orm';

async function main() {
  const matrices = await db
    .select({
      id: approvalMatrices.id,
      name: approvalMatrices.name,
      transactionType: approvalMatrices.transactionType,
      siteId: approvalMatrices.siteId,
      siteName: sites.name,
      siteLocation: sites.location,
      sectionId: approvalMatrices.sectionId,
      isActive: approvalMatrices.isActive,
    })
    .from(approvalMatrices)
    .leftJoin(sites, eq(approvalMatrices.siteId, sites.id))
    .where(
      inArray(approvalMatrices.transactionType, [
        'apd-request-apd',
        'apd-request-material',
        'apd-request-tools',
      ])
    )
    .orderBy(asc(approvalMatrices.transactionType), asc(approvalMatrices.siteId));

  console.log(`Total matrices: ${matrices.length}\n`);

  for (const m of matrices) {
    console.log(`--- Matrix #${m.id}: ${m.name} ---`);
    console.log(`  Type: ${m.transactionType}`);
    console.log(`  Site: ${m.siteName ?? 'ALL'} (ID: ${m.siteId})`);
    console.log(`  Active: ${m.isActive}`);

    const steps = await db
      .select({
        stepOrder: approvalMatrixSteps.stepOrder,
        label: approvalMatrixSteps.label,
        employeeName: employees.name,
        slaHours: approvalMatrixSteps.slaHours,
      })
      .from(approvalMatrixSteps)
      .leftJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
      .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
      .where(eq(approvalMatrixSteps.matrixId, m.id))
      .orderBy(asc(approvalMatrixSteps.stepOrder));

    if (steps.length === 0) {
      console.log(`  ⚠️  NO STEPS CONFIGURED`);
    } else {
      for (const s of steps) {
        console.log(`  Step ${s.stepOrder}: ${s.label} → ${s.employeeName ?? 'VACANT'} (SLA ${s.slaHours}h)`);
      }
    }
    console.log('');
  }

  console.log('=== SUMMARY ===\n');
  const types = ['apd-request-apd', 'apd-request-material', 'apd-request-tools'];
  for (const t of types) {
    const filtered = matrices.filter(m => m.transactionType === t);
    const active = filtered.filter(m => m.isActive);
    console.log(`${t}: ${filtered.length} total, ${active.length} active`);
    console.log(`  Sites: ${filtered.map(m => m.siteName ?? 'ALL').join(', ') || '(none)'}`);
  }
}

main().catch(console.error);
