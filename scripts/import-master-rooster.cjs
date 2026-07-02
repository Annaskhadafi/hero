/**
 * Import MASTER_ROOSTER_TOOLS_2026.xlsx into hero_central_service_assets
 * First clears existing data, then imports fresh.
 */

const XLSX = require("xlsx");
const { Pool } = require("pg");
const path = require("path");

const filePath = "D:\\DATA SERVICE\\MASTER_ROOSTER_TOOLS_2026.xlsx";

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not found!"); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });

function excelDateToISO(value) {
  if (!value || typeof value !== "number" || value < 1) return null;
  const date = new Date((value - 25569) * 86400 * 1000);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

function toStr(val) {
  if (val === null || val === undefined || val === "") return null;
  return String(val).trim() || null;
}

function toInt(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

async function main() {
  console.log("📖 Reading Excel file...");
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["MASTER DATA"];
  if (!ws) { console.error("Sheet 'MASTER DATA' not found!"); process.exit(1); }

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  // Row 0 = headers, Row 1+ = data. The workbook has a Section column before Location.
  const headers = data[0];
  console.log("Headers:", JSON.stringify(headers));
  console.log("Total data rows:", data.length - 1);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clear existing data
    console.log("\n🗑️  Clearing existing asset data...");
    await client.query("DELETE FROM hero_central_service_assets");
    console.log("  ✅ Cleared.");

    // Reset sequence
    await client.query("ALTER SEQUENCE hero_central_service_assets_id_seq RESTART WITH 1");

    // Column indices based on header row:
    // [No, Section, Location, Description, Nomor Aset, SN, Tanggal Pembelian, Delivery To Site,
    //  Last Calibaration, Cycle (Month), Calibration Due, Certiifacete Date, Certificate Cycle,
    //  Certificate Due, Condition, Umur Aset, Qty, Kategori Alat, Remarks]
    const COL = {
      no: 0, workSection: 1, location: 2, description: 3, assetNumber: 4, sn: 5,
      purchaseDate: 6, deliveryToSite: 7, lastCalibration: 8, calibCycle: 9,
      calibDue: 10, certDate: 11, certCycle: 12, certDue: 13,
      condition: 14, umurAset: 15, qty: 16, section: 17, remarks: 18
    };

    let count = 0;
    let skipped = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Skip empty rows
      if (!row[COL.description] && !row[COL.assetNumber] && !row[COL.sn]) {
        skipped++;
        continue;
      }

      const description = toStr(row[COL.description]) || "Unknown";
      const assetNumber = toStr(row[COL.assetNumber]); // CAN be null
      const workSection = toStr(row[COL.workSection]) || "";
      const section = toStr(row[COL.section]) || "MISC";
      // ponytail: keep raw workbook location; canonical site mapping loses Excel-specific labels.
      const location = toStr(row[COL.location]) || "";
      const serialNumber = toStr(String(row[COL.sn]));
      const purchaseDate = excelDateToISO(row[COL.purchaseDate]);
      const deliveryToSiteDate = excelDateToISO(row[COL.deliveryToSite]);
      const lastCalibrationDate = excelDateToISO(row[COL.lastCalibration]);
      const calibrationCycleMonths = toInt(row[COL.calibCycle]);
      const calibrationDueDate = excelDateToISO(row[COL.calibDue]);
      const certificateDate = excelDateToISO(row[COL.certDate]);
      const certificateCycleMonths = toInt(row[COL.certCycle]);
      const certificateDueDate = excelDateToISO(row[COL.certDue]);
      const condition = toStr(row[COL.condition]) || "Unknown";
      const qty = toInt(row[COL.qty]) || 1;
      const remarks = toStr(row[COL.remarks]);

      try {
        await client.query(
          `INSERT INTO hero_central_service_assets
            (work_section, section, location, description, asset_number, serial_number,
             purchase_date, delivery_to_site_date, last_calibration_date,
             calibration_cycle_months, calibration_due_date,
             certificate_date, certificate_cycle_months, certificate_due_date,
             condition, qty, remarks, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW())`,
          [workSection, section, location, description, assetNumber, serialNumber,
           purchaseDate, deliveryToSiteDate, lastCalibrationDate,
           calibrationCycleMonths, calibrationDueDate,
           certificateDate, certificateCycleMonths, certificateDueDate,
           condition, qty, remarks]
        );
        count++;
        console.log(`  ✅ [${count}] ${section} | ${description} | ${assetNumber || "(no asset#)"}`);
      } catch (err) {
        console.error(`  ❌ Row ${i}: ${err.message} | ${description} | ${assetNumber}`);
      }
    }

    await client.query("COMMIT");
    console.log(`\n✅ DONE! Imported: ${count}, Skipped empty rows: ${skipped}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
