/**
 * Fix location names in hero_central_service_assets
 * Preserves MASTER_ROOSTER_TOOLS_2026.xlsx raw location names.
 */

const { Pool } = require("pg");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

// Map Excel raw location to itself. Do not canonicalize to hero_sites.
// ponytail: raw workbook label is the source of truth for this asset page.
const LOCATION_MAP = {
  // TU GRESIK variants
  "TU GRESIK": "TU GRESIK",
  "tu gresik": "tu gresik",

  // Balikpapan variants
  "BALIKPAPAN": "BALIKPAPAN",
  "Balikpapan": "Balikpapan",
  "balikpapan": "balikpapan",
  "BPN": "BPN",

  // Jakarta
  "Jakarta": "Jakarta",
  "jakarta": "jakarta",
  "JAKARTA": "JAKARTA",

  // BIB = CK BIB
  "BIB": "BIB",
  "CK BIB": "CK BIB",

  // BMB = CK BMB
  "BMB": "BMB",
  "CK BMB": "CK BMB",

  // KIM = CK KIM
  "KIM": "KIM",
  "CK KIM": "CK KIM",

  // MHU = CK MHU
  "MHU": "MHU",
  "CK MHU": "CK MHU",

  // NCN = CK NCN
  "NCN": "NCN",
  "CK NCN": "CK NCN",

  // VALE = Vale - Sorowako
  "VALE": "VALE",
  "vale": "vale",

  // TIMIKA / FRP TIMIKA / FMI TIMIKA
  "TIMIKA": "TIMIKA",
  "FRP TIMIKA": "FRP TIMIKA",
  "FMI TIMIKA": "FMI TIMIKA",

  // KPC SGT = Sangatta
  "KPC SGT": "KPC SGT",

  // CDE BKU
  "CDE BKU": "CDE BKU",
};

async function main() {
  const client = await pool.connect();
  try {
    // Get distinct locations in DB
    const { rows } = await client.query(
      "SELECT DISTINCT location FROM hero_central_service_assets ORDER BY location"
    );
    console.log("Current locations in DB:", rows.map(r => r.location));

    let updated = 0;
    for (const { location } of rows) {
      const canonical = LOCATION_MAP[location];
      if (canonical && canonical !== location) {
        const res = await client.query(
          "UPDATE hero_central_service_assets SET location = $1 WHERE location = $2",
          [canonical, location]
        );
        console.log(`  ✅ "${location}" → "${canonical}" (${res.rowCount} rows)`);
        updated += res.rowCount;
      } else if (!canonical) {
        console.log(`  ⚠️  No mapping for "${location}" — keeping as-is`);
      } else {
        console.log(`  ✓  "${location}" already matches raw Excel label`);
      }
    }

    console.log(`\nDone! Updated ${updated} records total.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
