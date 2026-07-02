/**
 * Script to import data from "UPDATE ROOSTER TOOLS 2026.xlsx"
 * into hero_central_service_assets table.
 *
 * Maps all 8 sheets to the unified asset schema.
 */

const XLSX = require("xlsx");
const { Pool } = require("pg");
const path = require("path");

const filePath = "D:\\DATA SERVICE\\UPDATE ROOSTER TOOLS 2026.xlsx";

// DB connection (read from .env.local or .env)
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found!");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false,
});

/**
 * Convert Excel serial date to ISO string (YYYY-MM-DD)
 */
function excelDateToISO(value) {
  if (!value || typeof value !== "number") return null;
  // Excel serial date: days since 1899-12-30
  const date = new Date((value - 25569) * 86400 * 1000);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

function toStr(val) {
  if (val === null || val === undefined || val === "") return null;
  return String(val).trim();
}

function toInt(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

/**
 * Upsert an asset record (insert or update based on asset_number).
 * If asset_number is blank, generate a unique placeholder.
 */
async function upsertAsset(client, asset) {
  // Filter out rows with no meaningful data
  if (!asset.assetNumber && !asset.description && !asset.serialNumber) {
    return;
  }

  // Ensure we have at least a description
  if (!asset.description) {
    asset.description = "Unknown";
  }

  // If no asset number, generate one from section + description + SN
  if (!asset.assetNumber) {
    asset.assetNumber = `GEN-${asset.section || "MISC"}-${asset.description.substring(0, 10).replace(/\s/g, "")}-${Math.random().toString(36).substring(2, 7)}`;
  }

  try {
    await client.query(
      `INSERT INTO hero_central_service_assets
        (section, location, description, asset_number, serial_number,
         purchase_date, delivery_to_site_date, last_calibration_date, 
         calibration_cycle_months, calibration_due_date,
         certificate_date, certificate_cycle_months, certificate_due_date,
         condition, qty, remarks, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
       ON CONFLICT (asset_number) DO UPDATE SET
         section = EXCLUDED.section,
         location = EXCLUDED.location,
         description = EXCLUDED.description,
         serial_number = COALESCE(EXCLUDED.serial_number, hero_central_service_assets.serial_number),
         purchase_date = COALESCE(EXCLUDED.purchase_date, hero_central_service_assets.purchase_date),
         delivery_to_site_date = COALESCE(EXCLUDED.delivery_to_site_date, hero_central_service_assets.delivery_to_site_date),
         last_calibration_date = COALESCE(EXCLUDED.last_calibration_date, hero_central_service_assets.last_calibration_date),
         calibration_cycle_months = COALESCE(EXCLUDED.calibration_cycle_months, hero_central_service_assets.calibration_cycle_months),
         calibration_due_date = COALESCE(EXCLUDED.calibration_due_date, hero_central_service_assets.calibration_due_date),
         certificate_date = COALESCE(EXCLUDED.certificate_date, hero_central_service_assets.certificate_date),
         certificate_due_date = COALESCE(EXCLUDED.certificate_due_date, hero_central_service_assets.certificate_due_date),
         condition = COALESCE(EXCLUDED.condition, hero_central_service_assets.condition),
         qty = COALESCE(EXCLUDED.qty, hero_central_service_assets.qty),
         remarks = COALESCE(EXCLUDED.remarks, hero_central_service_assets.remarks),
         updated_at = NOW()
      `,
      [
        asset.section || "",
        asset.location || "",
        asset.description,
        asset.assetNumber,
        asset.serialNumber,
        asset.purchaseDate,
        asset.deliveryToSiteDate,
        asset.lastCalibrationDate,
        asset.calibrationCycleMonths,
        asset.calibrationDueDate,
        asset.certificateDate,
        asset.certificateCycleMonths,
        asset.certificateDueDate,
        asset.condition || "Unknown",
        asset.qty || 1,
        asset.remarks,
      ]
    );
    return true;
  } catch (err) {
    console.error(`  ❌ Error upserting asset ${asset.assetNumber}:`, err.message);
    return false;
  }
}

async function importSheet(client, wb, sheetName, section) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return 0;

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Find header row
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    const rowStr = JSON.stringify(row).toLowerCase();
    if (
      rowStr.includes("no asset") ||
      rowStr.includes("no.asset") ||
      (rowStr.includes("location") && rowStr.includes("sn")) ||
      rowStr.includes("description")
    ) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) {
    console.log(`  ⚠️  No header row found in sheet "${sheetName}"`);
    return 0;
  }

  const headers = data[headerRow].map((h) => String(h).toLowerCase().trim());
  let count = 0;
  let errors = 0;

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];

    // Skip completely empty rows
    if (row.every((v) => v === "" || v === null)) continue;

    const get = (keywords) => {
      for (const kw of keywords) {
        const idx = headers.findIndex((h) => h.includes(kw));
        if (idx !== -1 && row[idx] !== "") return row[idx];
      }
      return null;
    };

    // ---- Map columns by sheet type ----
    let asset = { section };

    // Location/Position
    asset.location =
      toStr(get(["location", "position now"])) || section;

    // Description
    asset.description =
      toStr(get(["description", "type rad", "master gauge"])) || "";

    // Asset Number
    const assetNumRaw = get(["no asset", "no.asset", "unit no"]);
    asset.assetNumber = toStr(assetNumRaw);

    // Serial Number
    asset.serialNumber = toStr(get(["sn", "serial"]));

    // Purchase Date
    asset.purchaseDate = excelDateToISO(get(["tgl pembelian", "purchase date"]));

    // Delivery to Site
    asset.deliveryToSiteDate = excelDateToISO(get(["send to site", "delivery date"]));

    // Last Calibration / Calibration Date on Certificate
    asset.lastCalibrationDate = excelDateToISO(get(["calibration date on cert"]));

    // Calibration Cycle (months)
    const cycleMo = get(["plan", "plan month"]);
    asset.calibrationCycleMonths = toInt(cycleMo);

    // Calibration Due Date
    asset.calibrationDueDate = excelDateToISO(
      get(["calibration due date on cert", "calibration expire after", "calibration expire"])
    );

    // Certificate fields — not in these sheets so null
    asset.certificateDate = null;
    asset.certificateCycleMonths = null;
    asset.certificateDueDate = null;

    // Condition
    asset.condition = toStr(get(["condition"])) || "Unknown";

    // Qty (default 1)
    asset.qty = 1;

    // Remarks (combine all remark columns)
    const remarkValues = [];
    for (let j = 0; j < headers.length; j++) {
      if (headers[j].includes("remark") && row[j] !== "") {
        remarkValues.push(String(row[j]).trim());
      }
    }
    asset.remarks = remarkValues.length > 0 ? remarkValues.join(" | ") : null;

    const ok = await upsertAsset(client, asset);
    if (ok === true) {
      count++;
      console.log(`  ✅ [${sheetName}] ${asset.description} | ${asset.assetNumber}`);
    } else if (ok === false) {
      errors++;
    }
  }

  return { count, errors };
}

async function main() {
  console.log("📖 Reading Excel file...");
  const wb = XLSX.readFile(filePath);

  const client = await pool.connect();
  let totalInserted = 0;
  let totalErrors = 0;

  try {
    // Sheet → Section mapping
    const sheetMapping = [
      { sheet: "RAD", section: "RAD" },
      { sheet: "manual torque", section: "Manual Torque" },
      { sheet: "MASTER GAUGE", section: "Master Gauge" },
      { sheet: "ROOSTER JACK 80 TON", section: "Jack 80 Ton" },
      { sheet: "ROOSTER JACK HYDRAULIC", section: "Jack Hydraulic" },
      { sheet: "IMPACT WRENCH", section: "Impact Wrench" },
      { sheet: "BEAD BREAKER + HYD PUMP", section: "Bead Breaker" },
      { sheet: "RADIO ", section: "Radio" },
    ];

    for (const { sheet, section } of sheetMapping) {
      console.log(`\n📋 Importing sheet: ${sheet} (section: ${section})`);
      const result = await importSheet(client, wb, sheet, section);
      if (result) {
        console.log(`  → ${result.count} records imported, ${result.errors} errors`);
        totalInserted += result.count;
        totalErrors += result.errors;
      }
    }

    console.log(`\n✅ DONE! Total imported: ${totalInserted}, Total errors: ${totalErrors}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
