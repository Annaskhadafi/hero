import { db } from "@/db";
import { service360Quotations, service360Customers } from "@/db/schema/service360";
import { eq, desc } from "drizzle-orm";
import assert from "assert";

async function runTests() {
  console.log("Starting Quotation Custom Approval Tests...");

  // 1. Verify schema column types
  console.log("Test 1: Read existing quotation or test inserting custom approvals payload");
  const testNumber = `TEST-QUOT-APPR-${Date.now()}`;
  
  // Find or use a customer
  const [customer] = await db.select({ id: service360Customers.id }).from(service360Customers).limit(1);
  if (!customer) {
    console.log("No customer found in database, skipping insert test");
    return;
  }

  const customApprovalsData = [
    {
      label: "APPROVED BY",
      name: "Agus Supriyanto",
      position: "Supervisor GL Plant",
      company: "PT Antareja Mahada Makmur",
    },
    {
      label: "APPROVED BY",
      name: "Dewi Lestari",
      position: "Procurement Specialist",
      company: "PT Antareja Mahada Makmur",
    },
  ];

  const [inserted] = await db
    .insert(service360Quotations)
    .values({
      quotationNumber: testNumber,
      customerId: customer.id,
      quotationDate: "2026-11-03",
      showCustomApproval: true,
      customApprovalPosition: "right",
      customApprovals: customApprovalsData,
      fromName: "Agung Ari Prasetyo",
      attn: "Indra P Wardhana",
    })
    .returning();

  assert(inserted, "Quotation should be inserted successfully");
  assert.strictEqual(inserted.showCustomApproval, true);
  assert.strictEqual(inserted.customApprovalPosition, "right");
  assert.strictEqual(Array.isArray(inserted.customApprovals), true);
  assert.strictEqual(inserted.customApprovals?.length, 2);
  assert.strictEqual(inserted.customApprovals?.[0].name, "Agus Supriyanto");
  assert.strictEqual(inserted.customApprovals?.[0].position, "Supervisor GL Plant");
  assert.strictEqual(inserted.customApprovals?.[1].name, "Dewi Lestari");
  assert.strictEqual(inserted.customApprovals?.[1].position, "Procurement Specialist");
  console.log("✓ Test 1 passed: Insert with 2 Custom Approvals and position 'right' successful");

  // 2. Test update to 'middle' and 1 approval
  console.log("Test 2: Update custom approval to 1 approval and position 'middle'");
  const updatedApprovals = [
    {
      label: "CHECKED BY",
      name: "Agus Supriyanto",
      position: "Supervisor GL Plant",
      company: "PT Antareja Mahada Makmur",
    },
  ];

  const [updated] = await db
    .update(service360Quotations)
    .set({
      customApprovalPosition: "middle",
      customApprovals: updatedApprovals,
    })
    .where(eq(service360Quotations.id, inserted.id))
    .returning();

  assert.strictEqual(updated.customApprovalPosition, "middle");
  assert.strictEqual(updated.customApprovals?.length, 1);
  assert.strictEqual(updated.customApprovals?.[0].label, "CHECKED BY");
  console.log("✓ Test 2 passed: Update to 1 Custom Approval and position 'middle' successful");

  // 3. Test default 2-person quotation (showCustomApproval false)
  console.log("Test 3: Verify standard quotation defaults to 2-person signature");
  const testNumber2 = `TEST-QUOT-STD-${Date.now()}`;
  const [standardQuot] = await db
    .insert(service360Quotations)
    .values({
      quotationNumber: testNumber2,
      customerId: customer.id,
      quotationDate: "2026-11-03",
      fromName: "Sales Person",
      attn: "Customer Rep",
    })
    .returning();

  assert.strictEqual(standardQuot.showCustomApproval, false);
  assert.strictEqual(standardQuot.customApprovalPosition, "middle");
  console.log("✓ Test 3 passed: Standard quotation default is 2-person signature (showCustomApproval = false)");
  await db.delete(service360Quotations).where(eq(service360Quotations.id, standardQuot.id));

  // Clean up test quotation
  await db.delete(service360Quotations).where(eq(service360Quotations.id, inserted.id));
  console.log("✓ Cleaned up test quotation");

  console.log("All Quotation Custom Approval unit tests passed successfully! 🎉");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
