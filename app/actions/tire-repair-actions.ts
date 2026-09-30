'use server';

import { db } from '@/db';
import {
  tireRepairInspections,
  tireRepairPhotos,
  type NewTireRepairInspection,
  type TireRepairPhoto,
  type NewTireRepairPhoto,
} from '@/db/schema/tire-repair';
import { employees, sites } from '@/db/schema/hero';
import { customers } from '@/db/schema/customers';
import { repairMasterSites } from '@/db/schema/repair-master';
import { DEFAULT_REPAIR_SITES } from '@/lib/repair-master';
import { eq, desc, and, gte, lte, ilike, sql, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getServerSession } from '@/lib/auth-session';
import { getCurrentEmployee } from '@/lib/get-current-employee';
import {
  DURATION_CONFIG,
  STANDARD_TIRE_SIZES,
  STANDARD_TIRE_BRANDS,
  DEFAULT_CUSTOMERS,
  DEFAULT_CUSTOMER_SITES,
  DEFAULT_CHITRA_INSPECTORS,
  type DurationTag,
  type CreateTireRepairInspectionPayload,
  type TireRepairInspectionRecord,
  type InspectionFilterParams,
} from '@/lib/tire-repair-constants';

let isSchemaEnsured = false;

export async function ensureTireRepairSchema(): Promise<void> {
  if (isSchemaEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_tire_repair_inspections" (
        "id" serial PRIMARY KEY,
        "serial_number" varchar(100) NOT NULL,
        "customer" varchar(150) NOT NULL DEFAULT 'PT Kaltim Prima Coal',
        "customer_site" varchar(150) NOT NULL DEFAULT 'Sangatta KPC',
        "inspect_location" varchar(150) NOT NULL,
        "date_inspect" timestamp NOT NULL DEFAULT now(),
        "date_received" timestamp NOT NULL DEFAULT now(),
        "report_by" varchar(150) NOT NULL,
        "repair_duration" varchar(10) NOT NULL DEFAULT 'R1',
        "max_days" integer NOT NULL DEFAULT 4,
        "repair_completed_date" timestamp,
        "cargo_manifest_no" varchar(100),
        "rtd_1" varchar(50),
        "rtd_2" varchar(50),
        "remarks" text,
        "tire_size" varchar(100) NOT NULL,
        "is_custom_tire_size" boolean NOT NULL DEFAULT false,
        "brand" varchar(100),
        "type_construction" varchar(50) NOT NULL DEFAULT 'RADIAL',
        "pattern" varchar(100),
        "status" varchar(50) NOT NULL DEFAULT 'Repair',
        "created_by" integer REFERENCES "hero_employees"("id") ON DELETE SET NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "hero_tire_repair_photos" (
        "id" serial PRIMARY KEY,
        "inspection_id" integer NOT NULL REFERENCES "hero_tire_repair_inspections"("id") ON DELETE CASCADE,
        "photo_area" varchar(255) NOT NULL,
        "photo_url" text NOT NULL,
        "inspect_date" timestamp NOT NULL DEFAULT now(),
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS "idx_tire_repair_sn" ON "hero_tire_repair_inspections" ("serial_number");
      CREATE INDEX IF NOT EXISTS "idx_tire_repair_customer" ON "hero_tire_repair_inspections" ("customer");
      CREATE INDEX IF NOT EXISTS "idx_tire_repair_inspect_date" ON "hero_tire_repair_inspections" ("date_inspect");
      CREATE INDEX IF NOT EXISTS "idx_tire_repair_photos_inspection" ON "hero_tire_repair_photos" ("inspection_id");

      ALTER TABLE "hero_tire_repair_inspections" ADD COLUMN IF NOT EXISTS "removal_reason" varchar(255);
      ALTER TABLE "hero_tire_repair_inspections" ADD COLUMN IF NOT EXISTS "scrap_reason" varchar(255);
      ALTER TABLE "hero_tire_repair_inspections" ADD COLUMN IF NOT EXISTS "deffectex_repair" varchar(255);
      ALTER TABLE "hero_tire_repair_inspections" ADD COLUMN IF NOT EXISTS "vehicle" varchar(100);
      ALTER TABLE "hero_tire_repair_inspections" ADD COLUMN IF NOT EXISTS "wheel_position" varchar(100);
      ALTER TABLE "hero_tire_repair_inspections" ADD COLUMN IF NOT EXISTS "hours" varchar(50);
      ALTER TABLE "hero_tire_repair_inspections" ADD COLUMN IF NOT EXISTS "hours_since_last_repair" varchar(50);
      ALTER TABLE "hero_tire_repair_inspections" ADD COLUMN IF NOT EXISTS "pit_location" varchar(150);
      ALTER TABLE "hero_tire_repair_inspections" ADD COLUMN IF NOT EXISTS "marking" varchar(255);
    `);
    isSchemaEnsured = true;
  } catch (error) {
    console.error('ensureTireRepairSchema error:', error);
  }
}

export async function getTireRepairMasterDataAction() {
  try {
    await ensureTireRepairSchema();
    const session = await getServerSession();
    const currentEmp = await getCurrentEmployee();

    let userDefaultLocation = '';
    let userDefaultName = currentEmp?.name || session?.user?.name || '';

    if (currentEmp) {
      if (currentEmp.workLocation && currentEmp.workLocation.trim()) {
        const rawLoc = currentEmp.workLocation.trim();
        userDefaultLocation =
          rawLoc.toLowerCase().startsWith('workshop') || rawLoc.toLowerCase().startsWith('cp ')
            ? rawLoc
            : `Workshop ${rawLoc}`;
      } else if (currentEmp.siteId) {
        try {
          const [siteRow] = await db
            .select({ name: sites.name })
            .from(sites)
            .where(eq(sites.id, currentEmp.siteId))
            .limit(1);
          if (siteRow?.name) {
            const siteName = siteRow.name.trim();
            userDefaultLocation =
              siteName.toLowerCase().startsWith('workshop') || siteName.toLowerCase().startsWith('cp ')
                ? siteName
                : `Workshop ${siteName}`;
          }
        } catch (e) {
          console.warn('Could not query site for employee:', e);
        }
      }
    }

    // 1. Fetch Customers from customers table, recorded inspections, and defaults
    let dbCustomers: string[] = [];
    try {
      const customersQuery = await db
        .select({
          name: customers.name,
          customerCode: customers.customerCode,
        })
        .from(customers);
      dbCustomers = customersQuery
        .map((c) => c.name?.trim() || c.customerCode?.trim())
        .filter(Boolean);
    } catch (e) {
      console.warn('Could not query customers table:', e);
    }

    const customerRes = await db
      .selectDistinct({ customer: tireRepairInspections.customer })
      .from(tireRepairInspections)
      .where(sql`"customer" IS NOT NULL AND "customer" != ''`);

    const recordedCustomers = customerRes.map((r) => r.customer).filter(Boolean) as string[];
    const rawCustomers = Array.from(
      new Set([...DEFAULT_CUSTOMERS, ...dbCustomers, ...recordedCustomers])
    ).filter(Boolean).sort();

    const kpcCustomer = rawCustomers.find((c) => c.toLowerCase().includes('kaltim prima coal')) || 'PT Kaltim Prima Coal';
    const allCustomers = [kpcCustomer, ...rawCustomers.filter((c) => c !== kpcCustomer)];

    // 2. Fetch Repair Workshop Locations from repair_master_sites, hero_sites, and defaults
    let dbRepairSites: string[] = [];
    try {
      const sitesQuery = await db
        .select({
          siteName: repairMasterSites.siteName,
          siteCode: repairMasterSites.siteCode,
        })
        .from(repairMasterSites)
        .where(eq(repairMasterSites.isActive, true));

      dbRepairSites = sitesQuery.map((s) => s.siteName).filter(Boolean);
    } catch (e) {
      console.warn('Could not query repairMasterSites:', e);
    }

    let dbHeroSites: string[] = [];
    try {
      const heroSitesQuery = await db
        .select({ name: sites.name })
        .from(sites)
        .where(eq(sites.isActive, true));
      dbHeroSites = heroSitesQuery.map((s) => s.name).filter(Boolean);
    } catch (e) {
      console.warn('Could not query hero_sites:', e);
    }

    const recordedLocationsRes = await db
      .selectDistinct({ inspectLocation: tireRepairInspections.inspectLocation })
      .from(tireRepairInspections)
      .where(sql`"inspect_location" IS NOT NULL AND "inspect_location" != ''`);
    const recordedLocations = recordedLocationsRes.map((r) => r.inspectLocation).filter(Boolean) as string[];

    const defaultWorkshopLocations = [
      'Workshop Sangatta',
      'Workshop Balikpapan',
      'Workshop Tanjung',
      'Workshop Berau',
      'Workshop BMB',
      'Workshop BIB',
      'Workshop KIM',
      'Workshop Palu',
      'Workshop Malinau',
      'CP DMP',
      'CP SBS',
      'CP BSI Banyuwangi',
      'CP Sorowako Vale',
      'CP Bengkulu CDE',
      'CP MHU',
      ...DEFAULT_REPAIR_SITES.map((s) => s.siteName),
    ];

    const allLocations = Array.from(
      new Set([
        ...defaultWorkshopLocations,
        ...dbRepairSites,
        ...dbHeroSites,
        ...recordedLocations,
      ])
    ).filter(Boolean).sort();

    // 3. Customer Sites
    const recordedSitesRes = await db
      .selectDistinct({ customerSite: tireRepairInspections.customerSite })
      .from(tireRepairInspections)
      .where(sql`"customer_site" IS NOT NULL AND "customer_site" != ''`);
    const recordedSites = recordedSitesRes.map((r) => r.customerSite).filter(Boolean) as string[];

    const rawSites = Array.from(
      new Set([
        ...DEFAULT_CUSTOMER_SITES,
        ...dbHeroSites.map((s) => s.replace(/^(Workshop|CP)\s+/i, '')),
        ...dbRepairSites.map((s) => s.replace(/^(Workshop|CP)\s+/i, '')),
        ...recordedSites,
      ])
    ).filter(Boolean).sort();

    const sangattaSite = rawSites.find((s) => s.toLowerCase().includes('sangatta kpc') || s.toLowerCase() === 'sangatta') || 'Sangatta KPC';
    const allSites = [sangattaSite, ...rawSites.filter((s) => s !== sangattaSite)];

    // 4. Fetch Tire Sizes & Brands
    const sizeRes = await db
      .selectDistinct({ tireSize: tireRepairInspections.tireSize })
      .from(tireRepairInspections)
      .where(sql`"tire_size" IS NOT NULL AND "tire_size" != ''`);

    const distinctSizes = sizeRes.map((r) => r.tireSize).filter(Boolean) as string[];
    const allSizes = Array.from(new Set([...STANDARD_TIRE_SIZES, ...distinctSizes]));

    const brandRes = await db
      .selectDistinct({ brand: tireRepairInspections.brand })
      .from(tireRepairInspections)
      .where(sql`"brand" IS NOT NULL AND "brand" != ''`);

    const recordedBrands = brandRes.map((r) => r.brand).filter(Boolean) as string[];
    const allBrands = Array.from(new Set([...STANDARD_TIRE_BRANDS, ...recordedBrands]));

    // 5. Fetch Inspector Names (Single Source of Truth: hero_employees + recorded report_by)
    const empRes = await db
      .select({ name: employees.name })
      .from(employees)
      .where(eq(employees.isActive, true));
    const empNames = empRes.map((e) => e.name).filter(Boolean);

    const inspectorRes = await db
      .selectDistinct({ reportBy: tireRepairInspections.reportBy })
      .from(tireRepairInspections)
      .where(sql`"report_by" IS NOT NULL AND "report_by" != ''`);
    const recordedInspectors = inspectorRes.map((r) => r.reportBy).filter(Boolean) as string[];

    const rawInspectors = Array.from(
      new Set([
        ...(userDefaultName ? [userDefaultName] : []),
        ...empNames,
        ...DEFAULT_CHITRA_INSPECTORS,
        ...recordedInspectors,
      ])
    ).filter(Boolean).sort();

    const defaultInspector = userDefaultName && rawInspectors.includes(userDefaultName)
      ? userDefaultName
      : rawInspectors[0] || '';
    const allInspectors = defaultInspector
      ? [defaultInspector, ...rawInspectors.filter((i) => i !== defaultInspector)]
      : rawInspectors;

    return {
      success: true,
      data: {
        customers: allCustomers,
        sites: allSites,
        locations: allLocations,
        sizes: allSizes,
        brands: allBrands,
        patterns: ['E4', 'L4', 'L5', 'E3', 'TRACTION', 'ROCK', 'SMOOTH'],
        userDefaultLocation,
        userDefaultName,
        inspectors: allInspectors,
      },
    };
  } catch (error: any) {
    console.error('getTireRepairMasterDataAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal memuat master data',
      data: {
        customers: DEFAULT_CUSTOMERS,
        sites: DEFAULT_CUSTOMER_SITES,
        locations: [
          'Workshop Sangatta',
          'Workshop Balikpapan',
          'Workshop Tanjung',
          'Workshop Berau',
          'Workshop BMB',
          'Workshop BIB',
          'Workshop KIM',
          'Workshop Palu',
          'Workshop Malinau',
          'CP DMP',
          'CP SBS',
          'CP BSI Banyuwangi',
          'CP Sorowako Vale',
          'CP Bengkulu CDE',
          'CP MHU',
        ],
        sizes: STANDARD_TIRE_SIZES,
        brands: STANDARD_TIRE_BRANDS,
        patterns: ['E4', 'L4', 'L5', 'E3', 'TRACTION', 'ROCK', 'SMOOTH'],
        userDefaultLocation: '',
        userDefaultName: '',
        inspectors: DEFAULT_CHITRA_INSPECTORS,
      },
    };
  }
}

export async function getTireRepairInspectionsAction(filters: InspectionFilterParams = {}) {
  try {
    await ensureTireRepairSchema();

    const conditions = [];

    if (filters.searchSN && filters.searchSN.trim()) {
      conditions.push(ilike(tireRepairInspections.serialNumber, `%${filters.searchSN.trim()}%`));
    }

    if (filters.customer && filters.customer !== 'ALL') {
      conditions.push(eq(tireRepairInspections.customer, filters.customer));
    }

    if (filters.status && filters.status !== 'ALL') {
      conditions.push(ilike(tireRepairInspections.status, filters.status));
    }

    if (filters.tireSize && filters.tireSize !== 'ALL') {
      conditions.push(eq(tireRepairInspections.tireSize, filters.tireSize));
    }

    if (filters.repairLocation && filters.repairLocation !== 'ALL') {
      conditions.push(eq(tireRepairInspections.inspectLocation, filters.repairLocation));
    }

    if (filters.month && filters.year) {
      const startOfMonth = new Date(filters.year, filters.month - 1, 1);
      const endOfMonth = new Date(filters.year, filters.month, 0, 23, 59, 59);
      conditions.push(
        and(
          gte(tireRepairInspections.dateInspect, startOfMonth),
          lte(tireRepairInspections.dateInspect, endOfMonth)
        )
      );
    } else if (filters.year) {
      const startOfYear = new Date(filters.year, 0, 1);
      const endOfYear = new Date(filters.year, 11, 31, 23, 59, 59);
      conditions.push(
        and(
          gte(tireRepairInspections.dateInspect, startOfYear),
          lte(tireRepairInspections.dateInspect, endOfYear)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const inspections = await db
      .select()
      .from(tireRepairInspections)
      .where(whereClause)
      .orderBy(desc(tireRepairInspections.createdAt));

    const inspectionIds = inspections.map((i) => i.id);
    let allPhotos: TireRepairPhoto[] = [];

    if (inspectionIds.length > 0) {
      allPhotos = await db
        .select()
        .from(tireRepairPhotos)
        .where(inArray(tireRepairPhotos.inspectionId, inspectionIds));
    }

    const photosByInspectionId = new Map<number, TireRepairPhoto[]>();
    allPhotos.forEach((photo) => {
      const existing = photosByInspectionId.get(photo.inspectionId) || [];
      existing.push(photo);
      photosByInspectionId.set(photo.inspectionId, existing);
    });

    const result: TireRepairInspectionRecord[] = inspections.map((i) => ({
      ...i,
      photos: photosByInspectionId.get(i.id) || [],
    }));

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error('getTireRepairInspectionsAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal memuat data inspeksi ban',
      data: [],
    };
  }
}

export async function createTireRepairInspectionAction(payload: CreateTireRepairInspectionPayload) {
  try {
    await ensureTireRepairSchema();
    const session = await getServerSession();

    const durationKey = (payload.repairDuration || 'R1') as DurationTag;
    const maxDays = DURATION_CONFIG[durationKey]?.maxDays || 4;

    const inspectDate = payload.dateInspect ? new Date(payload.dateInspect) : new Date();
    const completedDate = new Date(inspectDate.getTime() + maxDays * 24 * 60 * 60 * 1000);
    const receivedDate = payload.dateReceived ? new Date(payload.dateReceived) : new Date();

    const currentEmp = await getCurrentEmployee();
    const createdByUserId: number | null = currentEmp?.id ?? null;

    const insertData: NewTireRepairInspection = {
      serialNumber: payload.serialNumber.trim().toUpperCase(),
      tireSize: payload.tireSize,
      isCustomTireSize: payload.isCustomTireSize ?? false,
      brand: payload.brand?.trim().toUpperCase() || 'MICHELIN',
      typeConstruction: payload.typeConstruction || 'RADIAL',
      pattern: payload.pattern || 'E4',
      dateReceived: receivedDate,
      customer: payload.customer?.trim() || 'PT Kaltim Prima Coal',
      customerSite: payload.customerSite?.trim() || 'Sangatta',
      status: payload.status || 'Repair',
      inspectLocation: payload.inspectLocation || 'Workshop Sangatta',
      dateInspect: inspectDate,
      reportBy: payload.reportBy?.trim() || currentEmp?.name || session?.user?.name || 'Inspector',
      repairDuration: durationKey,
      maxDays,
      repairCompletedDate: completedDate,
      cargoManifestNo: payload.cargoManifestNo?.trim() || null,
      rtd1: payload.rtd1 ? String(payload.rtd1) : null,
      rtd2: payload.rtd2 ? String(payload.rtd2) : null,
      remarks: payload.remarks?.trim() || null,
      createdBy: createdByUserId,
    };

    const insertedRows = await db
      .insert(tireRepairInspections)
      .values(insertData)
      .returning();

    const createdInspection = insertedRows[0];

    if (payload.photos && payload.photos.length > 0) {
      const photosToInsert: NewTireRepairPhoto[] = payload.photos.map((p) => ({
        inspectionId: createdInspection.id,
        photoArea: p.photoArea,
        photoUrl: p.photoUrl,
        inspectDate: inspectDate,
      }));

      await db.insert(tireRepairPhotos).values(photosToInsert);
    }

    revalidatePath('/mobile/tire-repair/inspection');
    revalidatePath('/mobile/tire-repair');

    return {
      success: true,
      message: 'Laporan inspeksi ban berhasil disimpan',
      data: createdInspection,
    };
  } catch (error: any) {
    console.error('createTireRepairInspectionAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal menyimpan laporan inspeksi ban',
    };
  }
}

export async function bulkCreateTireRepairInspectionsAction(
  payloads: CreateTireRepairInspectionPayload[],
  options?: { overwriteDuplicates?: boolean }
) {
  try {
    await ensureTireRepairSchema();
    const session = await getServerSession();
    const currentEmp = await getCurrentEmployee();
    const createdByUserId: number | null = currentEmp?.id ?? null;
    const overwriteDuplicates = options?.overwriteDuplicates ?? false;

    if (!Array.isArray(payloads) || payloads.length === 0) {
      return {
        success: false,
        message: 'Tidak ada data inspeksi yang valid untuk diimport',
        count: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
      };
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; serialNumber: string; reason: string }> = [];

    let rowIndex = 0;
    for (const payload of payloads) {
      rowIndex++;
      const sn = payload.serialNumber?.trim().toUpperCase();

      if (!sn) {
        failedCount++;
        errors.push({ row: rowIndex, serialNumber: '-', reason: 'Serial Number (ID) wajib diisi' });
        continue;
      }
      if (!payload.tireSize || !payload.tireSize.trim()) {
        failedCount++;
        errors.push({ row: rowIndex, serialNumber: sn, reason: 'Size (Ukuran Ban) wajib diisi' });
        continue;
      }

      try {
        const durationKey = (payload.repairDuration || 'R1') as DurationTag;
        const maxDays = DURATION_CONFIG[durationKey]?.maxDays || 4;
        const inspectDate = payload.dateInspect ? new Date(payload.dateInspect) : new Date();
        const completedDate = new Date(inspectDate.getTime() + maxDays * 24 * 60 * 60 * 1000);
        const receivedDate = payload.dateReceived ? new Date(payload.dateReceived) : new Date();

        const existingRows = await db
          .select({ id: tireRepairInspections.id })
          .from(tireRepairInspections)
          .where(eq(tireRepairInspections.serialNumber, sn))
          .limit(1);

        if (existingRows.length > 0) {
          if (!overwriteDuplicates) {
            skippedCount++;
            continue;
          }

          const existingId = existingRows[0].id;
          await db
            .update(tireRepairInspections)
            .set({
              tireSize: payload.tireSize.trim(),
              isCustomTireSize: payload.isCustomTireSize ?? false,
              brand: payload.brand?.trim().toUpperCase() || 'MICHELIN',
              typeConstruction: payload.typeConstruction || 'RADIAL',
              pattern: payload.pattern || 'E4',
              dateReceived: receivedDate,
              customer: payload.customer?.trim() || 'PT Kaltim Prima Coal',
              customerSite: payload.customerSite?.trim() || 'Sangatta KPC',
              status: payload.status || 'Repair',
              inspectLocation: payload.inspectLocation || 'Workshop Sangatta',
              dateInspect: inspectDate,
              reportBy: payload.reportBy?.trim() || currentEmp?.name || session?.user?.name || 'Inspector',
              repairDuration: durationKey,
              maxDays,
              repairCompletedDate: completedDate,
              cargoManifestNo: payload.cargoManifestNo?.trim() || null,
              rtd1: payload.rtd1 ? String(payload.rtd1) : null,
              rtd2: payload.rtd2 ? String(payload.rtd2) : null,
              remarks: payload.remarks?.trim() || null,
              removalReason: payload.removalReason?.trim() || null,
              scrapReason: payload.scrapReason?.trim() || null,
              deffectexRepair: payload.deffectexRepair?.trim() || null,
              vehicle: payload.vehicle?.trim() || null,
              wheelPosition: payload.wheelPosition?.trim() || null,
              hours: payload.hours ? String(payload.hours).trim() : null,
              hoursSinceLastRepair: payload.hoursSinceLastRepair ? String(payload.hoursSinceLastRepair).trim() : null,
              pitLocation: payload.pitLocation?.trim() || null,
              marking: payload.marking?.trim() || null,
              updatedAt: new Date(),
            })
            .where(eq(tireRepairInspections.id, existingId));

          if (payload.photos && payload.photos.length > 0) {
            await db.delete(tireRepairPhotos).where(eq(tireRepairPhotos.inspectionId, existingId));
            const photosToInsert: NewTireRepairPhoto[] = payload.photos.map((p) => ({
              inspectionId: existingId,
              photoArea: p.photoArea,
              photoUrl: p.photoUrl,
              inspectDate: inspectDate,
            }));
            await db.insert(tireRepairPhotos).values(photosToInsert);
          }

          updatedCount++;
        } else {
          const insertData: NewTireRepairInspection = {
            serialNumber: sn,
            tireSize: payload.tireSize.trim(),
            isCustomTireSize: payload.isCustomTireSize ?? false,
            brand: payload.brand?.trim().toUpperCase() || 'MICHELIN',
            typeConstruction: payload.typeConstruction || 'RADIAL',
            pattern: payload.pattern || 'E4',
            dateReceived: receivedDate,
            customer: payload.customer?.trim() || 'PT Kaltim Prima Coal',
            customerSite: payload.customerSite?.trim() || 'Sangatta KPC',
            status: payload.status || 'Repair',
            inspectLocation: payload.inspectLocation || 'Workshop Sangatta',
            dateInspect: inspectDate,
            reportBy: payload.reportBy?.trim() || currentEmp?.name || session?.user?.name || 'Inspector',
            repairDuration: durationKey,
            maxDays,
            repairCompletedDate: completedDate,
            cargoManifestNo: payload.cargoManifestNo?.trim() || null,
            rtd1: payload.rtd1 ? String(payload.rtd1) : null,
            rtd2: payload.rtd2 ? String(payload.rtd2) : null,
            remarks: payload.remarks?.trim() || null,
            removalReason: payload.removalReason?.trim() || null,
            scrapReason: payload.scrapReason?.trim() || null,
            deffectexRepair: payload.deffectexRepair?.trim() || null,
            vehicle: payload.vehicle?.trim() || null,
            wheelPosition: payload.wheelPosition?.trim() || null,
            hours: payload.hours ? String(payload.hours).trim() : null,
            hoursSinceLastRepair: payload.hoursSinceLastRepair ? String(payload.hoursSinceLastRepair).trim() : null,
            pitLocation: payload.pitLocation?.trim() || null,
            marking: payload.marking?.trim() || null,
            createdBy: createdByUserId,
          };

          const insertedRows = await db
            .insert(tireRepairInspections)
            .values(insertData)
            .returning();

          const createdInspection = insertedRows[0];
          if (createdInspection && payload.photos && payload.photos.length > 0) {
            const photosToInsert: NewTireRepairPhoto[] = payload.photos.map((p) => ({
              inspectionId: createdInspection.id,
              photoArea: p.photoArea,
              photoUrl: p.photoUrl,
              inspectDate: inspectDate,
            }));
            await db.insert(tireRepairPhotos).values(photosToInsert);
          }

          insertedCount++;
        }
      } catch (err: any) {
        failedCount++;
        errors.push({ row: rowIndex, serialNumber: sn, reason: err?.message || 'Gagal memproses baris ini' });
      }
    }

    revalidatePath('/mobile/tire-repair/inspection');
    revalidatePath('/mobile/tire-repair');
    revalidatePath('/dashboard/repair-retread/inspection');

    const totalProcessed = insertedCount + updatedCount;
    return {
      success: totalProcessed > 0 || skippedCount > 0,
      message: `Import selesai: ${insertedCount} ditambahkan, ${updatedCount} diperbarui, ${skippedCount} dilewati, ${failedCount} gagal.`,
      count: totalProcessed,
      insertedCount,
      updatedCount,
      skippedCount,
      failedCount,
      errors,
    };
  } catch (error: any) {
    console.error('bulkCreateTireRepairInspectionsAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal mengimport data inspeksi ban',
      count: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [{ row: 0, serialNumber: '-', reason: error?.message || 'Terjadi kesalahan sistem' }],
    };
  }
}

export async function deleteAllTireRepairInspectionsAction() {
  try {
    await ensureTireRepairSchema();
    await db.delete(tireRepairPhotos);
    const deletedInspections = await db.delete(tireRepairInspections).returning();

    revalidatePath('/mobile/tire-repair/inspection');
    revalidatePath('/mobile/tire-repair');
    revalidatePath('/dashboard/repair-retread/inspection');

    return {
      success: true,
      message: `${deletedInspections.length} data inspeksi ban berhasil dihapus`,
      count: deletedInspections.length,
    };
  } catch (error: any) {
    console.error('deleteAllTireRepairInspectionsAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal menghapus data inspeksi ban',
      count: 0,
    };
  }
}

export async function updateTireRepairInspectionAction(
  id: number,
  payload: Partial<CreateTireRepairInspectionPayload>
) {
  try {
    await ensureTireRepairSchema();
    const durationKey = payload.repairDuration ? (payload.repairDuration as DurationTag) : undefined;
    const maxDays = durationKey ? DURATION_CONFIG[durationKey]?.maxDays || 4 : undefined;

    const inspectDate = payload.dateInspect ? new Date(payload.dateInspect) : undefined;
    const completedDate =
      inspectDate && maxDays
        ? new Date(inspectDate.getTime() + maxDays * 24 * 60 * 60 * 1000)
        : undefined;
    const receivedDate = payload.dateReceived ? new Date(payload.dateReceived) : undefined;

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (payload.serialNumber !== undefined) updateData.serialNumber = payload.serialNumber.trim().toUpperCase();
    if (payload.tireSize !== undefined) updateData.tireSize = payload.tireSize;
    if (payload.isCustomTireSize !== undefined) updateData.isCustomTireSize = payload.isCustomTireSize;
    if (payload.brand !== undefined) updateData.brand = payload.brand.trim().toUpperCase();
    if (payload.typeConstruction !== undefined) updateData.typeConstruction = payload.typeConstruction;
    if (payload.pattern !== undefined) updateData.pattern = payload.pattern;
    if (receivedDate !== undefined) updateData.dateReceived = receivedDate;
    if (payload.customer !== undefined) updateData.customer = payload.customer.trim();
    if (payload.customerSite !== undefined) updateData.customerSite = payload.customerSite.trim();
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.inspectLocation !== undefined) updateData.inspectLocation = payload.inspectLocation;
    if (inspectDate !== undefined) updateData.dateInspect = inspectDate;
    if (payload.reportBy !== undefined) updateData.reportBy = payload.reportBy.trim();
    if (durationKey !== undefined) updateData.repairDuration = durationKey;
    if (maxDays !== undefined) updateData.maxDays = maxDays;
    if (completedDate !== undefined) updateData.repairCompletedDate = completedDate;
    if (payload.cargoManifestNo !== undefined) updateData.cargoManifestNo = payload.cargoManifestNo?.trim() || null;
    if (payload.rtd1 !== undefined) updateData.rtd1 = payload.rtd1 ? String(payload.rtd1) : null;
    if (payload.rtd2 !== undefined) updateData.rtd2 = payload.rtd2 ? String(payload.rtd2) : null;
    if (payload.remarks !== undefined) updateData.remarks = payload.remarks?.trim() || null;

    const updatedRows = await db
      .update(tireRepairInspections)
      .set(updateData)
      .where(eq(tireRepairInspections.id, id))
      .returning();

    if (payload.photos !== undefined) {
      await db.delete(tireRepairPhotos).where(eq(tireRepairPhotos.inspectionId, id));
      if (payload.photos.length > 0) {
        const photosToInsert: NewTireRepairPhoto[] = payload.photos.map((p) => ({
          inspectionId: id,
          photoArea: p.photoArea,
          photoUrl: p.photoUrl,
          inspectDate: inspectDate || new Date(),
        }));
        await db.insert(tireRepairPhotos).values(photosToInsert);
      }
    }

    revalidatePath('/mobile/tire-repair/inspection');
    revalidatePath('/mobile/tire-repair');
    revalidatePath('/dashboard/repair-retread/inspection');

    return {
      success: true,
      message: 'Laporan inspeksi ban berhasil diperbarui',
      data: updatedRows[0],
    };
  } catch (error: any) {
    console.error('updateTireRepairInspectionAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal memperbarui laporan inspeksi ban',
    };
  }
}

export async function deleteTireRepairInspectionAction(id: number) {
  try {
    await ensureTireRepairSchema();
    await db.delete(tireRepairPhotos).where(eq(tireRepairPhotos.inspectionId, id));
    await db.delete(tireRepairInspections).where(eq(tireRepairInspections.id, id));

    revalidatePath('/mobile/tire-repair/inspection');
    revalidatePath('/mobile/tire-repair');
    revalidatePath('/dashboard/repair-retread/inspection');

    return {
      success: true,
      message: 'Data inspeksi ban berhasil dihapus',
    };
  } catch (error: any) {
    console.error('deleteTireRepairInspectionAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal menghapus data inspeksi ban',
    };
  }
}



