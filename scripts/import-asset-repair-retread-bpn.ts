import path from 'node:path';
import * as XLSX from 'xlsx';
import { and, eq, sql } from 'drizzle-orm';

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  mei: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  agu: 7,
  sep: 8,
  oct: 9,
  okt: 9,
  nov: 10,
  dec: 11,
  des: 11,
};

export function parseExcelAssetDate(raw: unknown): Date | null {
  if (raw === undefined || raw === null) return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()));
  }
  const str = String(raw).trim();
  if (!str || str === '-') return null;

  // Match formats like "20-Oct-11", "1-Jan-07", "21-Sep-23"
  const dmyText = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})$/);
  if (dmyText) {
    const day = Number(dmyText[1]);
    const month = MONTHS[dmyText[2].slice(0, 3).toLowerCase()];
    let year = Number(dmyText[3]);
    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }
    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
  }
  return null;
}

export function parseOptionalInt(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  if (!str || str === '-') return null;
  const num = Number(str);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

export function normalizeText(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  if (!str || str === '-') return null;
  return str;
}

export function mapExcelRowToAsset(row: Record<string, unknown>) {
  const rawLocation = String(row['Lokasi Site'] ?? '').trim();
  const location =
    !rawLocation || /^retread\s*bpn$/i.test(rawLocation) || /^bpn$/i.test(rawLocation)
      ? 'Balikpapan'
      : rawLocation;

  const workSection = String(row['Work Section'] ?? '').trim() || 'Repair / Retread Operation';
  const section = String(row['Kategori Alat'] ?? '').trim();
  const description = String(row['Deskripsi / Nama Alat'] ?? '').trim();

  if (!section || !description) {
    return null;
  }

  return {
    workSection,
    section,
    location,
    description,
    assetNumber: normalizeText(row['Nomor Aset']),
    serialNumber: normalizeText(row['Serial Number']),
    purchaseDate: parseExcelAssetDate(row['Tgl Pembelian']),
    deliveryToSiteDate: parseExcelAssetDate(row['Delivery To Site']),
    condition: String(row['Kondisi'] ?? '').trim() || 'ACTIVE',
    qty: Math.max(1, parseOptionalInt(row['Qty']) ?? 1),
    lastCalibrationDate: parseExcelAssetDate(row['Tgl Kalibrasi Terakhir']),
    calibrationCycleMonths: parseOptionalInt(row['Siklus Kalibrasi (bln)']),
    calibrationDueDate: parseExcelAssetDate(row['Kalibrasi Due Date']),
    certificateDate: parseExcelAssetDate(row['Tgl Sertifikat']),
    certificateCycleMonths: parseOptionalInt(row['Siklus Sertifikat (bln)']),
    certificateDueDate: parseExcelAssetDate(row['Sertifikat Due Date']),
    remarks: normalizeText(row['Remarks']),
  };
}

export function loadWorkbookAssets(
  workbookPath = path.resolve(process.cwd(), 'public', 'asset repair retread bpn.xlsx')
) {
  const xlsxLib = (XLSX as any).default ?? XLSX;
  const wb = xlsxLib.readFile(workbookPath);
  const sheetName = wb.SheetNames.includes('Assets') ? 'Assets' : wb.SheetNames[0];
  const rawRows = xlsxLib.utils.sheet_to_json(wb.Sheets[sheetName], {
    raw: false,
    defval: null,
  }) as Array<Record<string, unknown>>;

  return rawRows
    .map(mapExcelRowToAsset)
    .filter((item): item is NonNullable<ReturnType<typeof mapExcelRowToAsset>> => item !== null);
}

async function runImport() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  const { db } = await import('../db');
  const { centralServiceAssetHistories, centralServiceAssets } = await import(
    '../db/schema/central-service'
  );

  const assetsToImport = loadWorkbookAssets();
  console.log(`Loaded ${assetsToImport.length} rows from Excel.`);

  let insertedCount = 0;
  let skippedCount = 0;

  await db.transaction(async (tx) => {
    for (const item of assetsToImport) {
      const existing = await tx
        .select({ id: centralServiceAssets.id })
        .from(centralServiceAssets)
        .where(
          and(
            eq(centralServiceAssets.workSection, item.workSection),
            eq(centralServiceAssets.location, item.location),
            eq(centralServiceAssets.description, item.description),
            sql`COALESCE(${centralServiceAssets.assetNumber}, '') = ${item.assetNumber ?? ''}`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        skippedCount += 1;
        continue;
      }

      const [created] = await tx.insert(centralServiceAssets).values(item).returning();
      await tx.insert(centralServiceAssetHistories).values({
        assetId: created.id,
        action: 'create',
        fieldName: 'asset',
        fieldLabel: 'Asset Dibuat',
        previousValue: null,
        newValue: `${created.description} (${created.location})`,
        changeRemark: 'Import data Excel public/asset repair retread bpn.xlsx',
      });
      insertedCount += 1;
    }
  });

  console.log(`Import finished. Inserted: ${insertedCount}, Skipped (already exists): ${skippedCount}`);
  process.exit(0);
}

const isMainModule =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.endsWith('import-asset-repair-retread-bpn.ts');

if (isMainModule) {
  runImport().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
