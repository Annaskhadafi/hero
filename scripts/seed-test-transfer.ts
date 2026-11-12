import { db } from '../db';
import { assetTransfers } from '../db/schema/asset-transfer';
import { eq } from 'drizzle-orm';

async function main() {
  // 1. Ensure TRF-202611-0001 (Step 1: In Review)
  const [t1] = await db.select().from(assetTransfers).where(eq(assetTransfers.transferNumber, 'TRF-202611-0001'));
  if (t1) {
    console.log('TRF-202611-0001 exists, resetting...');
    await db.update(assetTransfers).set({
      status: 'in_review',
      currentStepOrder: 1,
      currentApproverTitle: 'Step 1: Atasan Langsung Pemegang Lama (Pelepasan Aset)',
      currentApproverName: 'Gilang Suryo Wirawan',
      currentApproverEmployeeId: 1255,
      updatedAt: new Date()
    }).where(eq(assetTransfers.transferNumber, 'TRF-202611-0001'));
  } else {
    console.log('Creating TRF-202611-0001...');
    await db.insert(assetTransfers).values({
      transferNumber: 'TRF-202611-0001',
      assetId: 265,
      assetName: 'ASUS M415DAO-VIPS352',
      assetNumber: '70000162',
      serialNumber: 'M9N0CV22192039E',
      equipmentChecklist: ['Laptop / Desktop', 'Charger', 'Mouse'],
      assetPhotos: '[]',
      receivedPhotos: '[]',
      currentHolderEmployeeId: 1255,
      currentHolderName: 'Gilang Suryo Wirawan',
      currentLocationSiteId: 126,
      currentLocationName: 'Balikpapan',
      newHolderEmployeeId: 1143,
      newHolderName: 'Sofyan Darmawan',
      targetLocationSiteId: 126,
      targetLocationName: 'Balikpapan',
      notes: 'Pengajuan transfer reguler',
      status: 'in_review',
      currentStepOrder: 1,
      currentApproverTitle: 'Step 1: Atasan Langsung Pemegang Lama (Pelepasan Aset)',
      currentApproverName: 'Gilang Suryo Wirawan',
      currentApproverEmployeeId: 1255,
      createdById: '1fc0bd24-b2da-4802-9b17-d67accf5bdd9',
      applicantEmployeeId: 1255,
      submittedAt: new Date()
    });
  }

  // 2. Ensure TRF-202611-0003 (Step 2: New Holder In Review)
  const [t3] = await db.select().from(assetTransfers).where(eq(assetTransfers.transferNumber, 'TRF-202611-0003'));
  if (t3) {
    console.log('TRF-202611-0003 exists, ensuring step 2 in_review...');
    await db.update(assetTransfers).set({
      status: 'in_review',
      currentStepOrder: 2,
      currentApproverTitle: 'Step 2: Pemegang Baru (Konfirmasi Serah Terima Fisik)',
      currentApproverName: 'Sofyan Darmawan',
      currentApproverEmployeeId: 1143,
      newHolderEmployeeId: 1143,
      newHolderName: 'Sofyan Darmawan',
      receivedPhotos: '[]',
      updatedAt: new Date()
    }).where(eq(assetTransfers.transferNumber, 'TRF-202611-0003'));
  } else {
    console.log('Creating TRF-202611-0003...');
    await db.insert(assetTransfers).values({
      transferNumber: 'TRF-202611-0003',
      assetId: 265,
      assetName: 'ASUS M415DAO-VIPS352',
      assetNumber: '70000162',
      serialNumber: 'M9N0CV22192039E',
      equipmentChecklist: ['Laptop / Desktop', 'Charger'],
      assetPhotos: '[]',
      receivedPhotos: '[]',
      currentHolderEmployeeId: 1255,
      currentHolderName: 'Gilang Suryo Wirawan',
      currentLocationSiteId: 126,
      currentLocationName: 'Balikpapan',
      newHolderEmployeeId: 1143,
      newHolderName: 'Sofyan Darmawan',
      targetLocationSiteId: 126,
      targetLocationName: 'Balikpapan',
      notes: 'Transfer serah terima holder baru',
      status: 'in_review',
      currentStepOrder: 2,
      currentApproverTitle: 'Step 2: Pemegang Baru (Konfirmasi Serah Terima Fisik)',
      currentApproverName: 'Sofyan Darmawan',
      currentApproverEmployeeId: 1143,
      createdById: '1fc0bd24-b2da-4802-9b17-d67accf5bdd9',
      applicantEmployeeId: 1255,
      submittedAt: new Date()
    });
  }

  console.log('Done ensuring test transfers!');
  process.exit(0);
}
main().catch(console.error);
