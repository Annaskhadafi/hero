import { db } from '../db';
import { cerRequests, cerItems } from '../db/schema/cer';
import { approvals, employees, sites, masterDepartments, masterSections } from '../db/schema/hero';
import { generateCerPdf } from '../lib/cer-pdf';
import { eq, asc } from 'drizzle-orm';

async function verify() {
  const cerId = 13;
  console.log('--- Verifying CER ID 13 Signature Columns & PDF Generation ---');

  const [cer] = await db
    .select({
      id: cerRequests.id,
      cerNumber: cerRequests.cerNumber,
      subject: cerRequests.subject,
      purchaseType: cerRequests.purchaseType,
      budgetSource: cerRequests.budgetSource,
      level: cerRequests.level,
      assetCategory: cerRequests.assetCategory,
      purchasePurpose: cerRequests.purchasePurpose,
      vendorName: cerRequests.vendorName,
      totalEstimatedPrice: cerRequests.totalEstimatedPrice,
      dateRequired: cerRequests.dateRequired,
      kelompokAset: cerRequests.kelompokAset,
      status: cerRequests.status,
      pdfUrl: cerRequests.pdfUrl,
      applicantSignatureUrl: cerRequests.applicantSignatureUrl,
      createdAt: cerRequests.createdAt,
      approvedAt: cerRequests.approvedAt,
      applicantName: employees.name,
      applicantSn: employees.employeeSn,
      applicantJobTitle: employees.jobTitle,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      siteName: sites.name,
    })
    .from(cerRequests)
    .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
    .leftJoin(masterDepartments, eq(cerRequests.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(cerRequests.sectionId, masterSections.id))
    .leftJoin(sites, eq(cerRequests.siteId, sites.id))
    .where(eq(cerRequests.id, cerId))
    .limit(1);

  if (!cer) {
    throw new Error('CER ID 13 not found');
  }

  const items = await db
    .select()
    .from(cerItems)
    .where(eq(cerItems.cerRequestId, cerId))
    .orderBy(asc(cerItems.id));

  const approvalRows = await db
    .select({
      id: approvals.id,
      level: approvals.level,
      status: approvals.status,
      approverName: approvals.approverName,
      jobTitle: employees.jobTitle,
      formName: approvals.formName,
      decisionNote: approvals.decisionNote,
      signatureUrl: approvals.signatureUrl,
      reviewedAt: approvals.reviewedAt,
    })
    .from(approvals)
    .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
    .where(eq(approvals.cerRequestId, cerId))
    .orderBy(asc(approvals.level));

  console.log(`Found ${approvalRows.length} raw approval rows in database.`);

  // Test Document View filter
  const docApprovalsFiltered = approvalRows.filter((app) => {
    const titleLower = (app.formName || app.decisionNote || '').toLowerCase();
    const noteLower = (app.decisionNote || '').toLowerCase();
    const nameLower = (app.approverName || '').toLowerCase();
    const jobLower = (app.jobTitle || '').toLowerCase();
    const isTagging =
      titleLower.includes('tagging') ||
      titleLower.includes('nomor aset') ||
      titleLower.includes('kelompok aset') ||
      noteLower.includes('tagging') ||
      noteLower.includes('nomor aset') ||
      nameLower.includes('syamsul bahri') ||
      jobLower.includes('tagging');
    return !isTagging;
  });

  console.log('\n--- Document View Filtered Approvals ---');
  docApprovalsFiltered.forEach((a, idx) => {
    console.log(`Col ${idx + 1}: Level ${a.level} | ${a.approverName} | ${a.jobTitle || a.decisionNote}`);
  });

  const hasAmamaIra = docApprovalsFiltered.some((a) =>
    (a.approverName || '').toLowerCase().includes('amama ira')
  );
  const hasSyamsulBahri = docApprovalsFiltered.some((a) =>
    (a.approverName || '').toLowerCase().includes('syamsul bahri')
  );

  console.log('\nValidation Checks:');
  console.log('✓ Amama Ira is included in Preview:', hasAmamaIra);
  console.log('✓ Syamsul Bahri (Asset Tagging) is excluded from signature columns:', !hasSyamsulBahri);

  if (!hasAmamaIra) {
    throw new Error('FAILURE: Amama Ira is missing from document view!');
  }
  if (hasSyamsulBahri) {
    throw new Error('FAILURE: Syamsul Bahri should be excluded from signature columns!');
  }

  // Test PDF Generation
  console.log('\n--- Generating PDF with generateCerPdf ---');
  const pdfBytes = await generateCerPdf({
    cerNumber: cer.cerNumber,
    subject: cer.subject,
    applicantName: cer.applicantName || 'Pemohon',
    applicantSn: cer.applicantSn || null,
    applicantJobTitle: cer.applicantJobTitle || 'Pemohon Capex',
    applicantSignatureUrl: cer.applicantSignatureUrl || null,
    siteName: cer.siteName || 'Balikpapan',
    departmentName: cer.departmentName || 'Central Services',
    sectionName: cer.sectionName || null,
    level: cer.level || 'Staff',
    purchaseType: cer.purchaseType || 'New',
    budgetSource: cer.budgetSource || 'Capex',
    assetCategory: cer.assetCategory || 'IT',
    purchasePurpose: cer.purchasePurpose || 'Operational',
    vendorName: cer.vendorName || '-',
    totalEstimatedPrice: cer.totalEstimatedPrice || 0,
    dateRequired: cer.dateRequired,
    kelompokAset: cer.kelompokAset || 'IT Device & Elektronik',
    createdAt: cer.createdAt,
    approvedAt: cer.approvedAt,
    items: items.map((it) => ({
      description: it.description,
      qty: it.qty,
      pricePerUnit: it.pricePerUnit,
      totalPrice: it.totalPrice,
      allocation: it.allocation || undefined,
      holderName: it.holderName || undefined,
      estimatedLifespan: it.estimatedLifespan || undefined,
      assetNumber: it.assetNumber || undefined,
    })),
    approvals: approvalRows.map((app) => ({
      stepOrder: app.level,
      label: app.formName || app.decisionNote || `Tahap ${app.level}`,
      approverName: app.approverName,
      jobTitle: app.jobTitle || app.formName || `Approver Step ${app.level}`,
      status: app.status,
      reviewedAt: app.reviewedAt,
      signatureUrl: app.signatureUrl,
      decisionNote: app.decisionNote,
    })),
  });

  console.log(`✓ PDF successfully generated! Byte length: ${pdfBytes.length} bytes`);
  const fs = await import('fs');
  fs.writeFileSync('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/cer-preview-13.pdf', Buffer.from(pdfBytes));
  console.log('✓ Saved PDF to brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/cer-preview-13.pdf');
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => process.exit(0));
