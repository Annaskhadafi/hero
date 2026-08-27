import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps, orgChartNodes, workflowTemplates, workflowTemplateVersions } from '../db/schema/hero';
import { eq, asc } from 'drizzle-orm';

async function main() {
  const types = ['apd-request-apd', 'apd-request-material', 'apd-request-tools'];
  
  for (const txType of types) {
    console.log(`\n=== ${txType.toUpperCase()} ===`);
    
    // Check workflow template
    const [template] = await db.select().from(workflowTemplates).where(eq(workflowTemplates.templateKey, txType)).limit(1);
    console.log(`  Template: ${template ? template.name : '(none)'} | active=${template?.isActive}`);
    
    // Check matrices
    const matrices = await db.select().from(approvalMatrices).where(
      eq(approvalMatrices.transactionType, txType)
    );
    const activeMatrices = matrices.filter(m => m.isActive);
    console.log(`  Matrices: ${matrices.length} total, ${activeMatrices.length} active`);
    
    // Check each active matrix
    for (const m of activeMatrices) {
      const steps = await db.select().from(approvalMatrixSteps).where(eq(approvalMatrixSteps.matrixId, m.id)).orderBy(asc(approvalMatrixSteps.stepOrder));
      
      const nodeIds = steps.filter(s => s.nodeId).map(s => s.nodeId!);
      const nodes = nodeIds.length > 0 ? await db.select().from(orgChartNodes).where(eq(orgChartNodes.id, nodeIds[0])) : [];
      
      const stepDetail = steps.map(s => {
        const node = nodes.find(n => n.id === s.nodeId);
        return `${s.stepOrder}. ${s.label} (nodeId=${s.nodeId})`;
      }).join(' → ');
      
      console.log(`  [matrix#${m.id}] site=${m.siteId} | steps=${steps.length} | ${stepDetail || '(no steps)'}`);
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
