import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps, orgChartNodes, employees, sites } from '../db/schema/hero';
import { inArray, eq, sql } from 'drizzle-orm';

async function main() {
  const rows = await db
    .select({
      id: approvalMatrices.id,
      name: approvalMatrices.name,
      transactionType: approvalMatrices.transactionType,
      siteId: approvalMatrices.siteId,
      siteName: sites.name,
      sectionId: approvalMatrices.sectionId,
      isActive: approvalMatrices.isActive,
    })
    .from(approvalMatrices)
    .leftJoin(sites, eq(approvalMatrices.siteId, sites.id))
    .where(
      sql`${approvalMatrices.transactionType} IN ('five_r_report', 'five-r-report', 'quality-report-5r')`
    );

  console.log('5R Matrices in Database:', rows);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
