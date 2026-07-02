import { db } from "../db";
import { 
  centralServiceForecastPeriods,
  centralServiceForecastItems 
} from "../db/schema/central-service";
import { employees } from "../db/schema/hero";
import { ilike, eq } from "drizzle-orm";
import Fuse from "fuse.js";

const RAW_DATA = [
  { customer: "PETROSEA PSF", picSales: "AGUNG", service: 21345208, remark: "" },
  { customer: "PETROSEA FMI", picSales: "AGUNG", service: 0, remark: "" },
  { customer: "PETROSEA SDA", picSales: "AGUNG", service: 0, remark: "FORECAST JUNI 2026" },
  { customer: "AMMPT TABANG", picSales: "AGUNG", service: 98920000, remark: "SSA TIREMAN JUNI 2026" },
  { customer: "PPA BIB", picSales: "AGUNG", service: 149478911, remark: "SSA TIREMAN JUNI 2027" },
  { customer: "AMM MIFA", picSales: "AGUNG", service: 264375000, remark: "SSA TIREMAN JUNI 2028" },
  { customer: "PPA-WARA", picSales: "AGUNG", service: 0, remark: "FORECAST JUNI 2026" },
  { customer: "KCI JAKARTA", picSales: "MICHAEL", service: 0, remark: "" },
  { customer: "CKB JAKARTA", picSales: "MICHAEL", service: 24000000, remark: "SSA TIREMAN JUNI 2026" },
  { customer: "CDE BENGKULU", picSales: "BURI ANTONI", service: 0, remark: "" },
  { customer: "SIS MACO", picSales: "TOMMY", service: 0, remark: "Forecast Juni" },
  { customer: "SIS Admo", picSales: "TOMMY", service: 40000000, remark: "PEMASANGAN CTS" },
  { customer: "SIS Sera", picSales: "TOMMY", service: 0, remark: "FORECAST JUNI 2026" },
  { customer: "GET SEBAKIS", picSales: "ZULFIKAR", service: 0, remark: "" },
  { customer: "BSI", picSales: "MICHAEL", service: 0, remark: "" },
  { customer: "KPUC Malinau", picSales: "Zulfikar", service: 0, remark: "FORECAST JUNI 2026" },
  { customer: "KPUC Fonder", picSales: "Zulfikar", service: 0, remark: "" },
  { customer: "UDU", picSales: "IKBAL LAISA", service: 0, remark: "" },
  { customer: "ISB", picSales: "WISNU", service: 6250000, remark: "dis/assy & repair 2x tire 14.00R24, 16.9-28" },
  { customer: "PPA BUKIT ASAM", picSales: "BURI ANTONI", service: 0, remark: "" },
  { customer: "MTN SBS", picSales: "BURI ANTONI", service: 0, remark: "FORECAST JUNI 2026" },
  { customer: "PT.SSB Jakarta", picSales: "MICHAEL", service: 0, remark: "" },
  { customer: "TU Tanjung Enim", picSales: "MICHAEL", service: 0, remark: "" },
  { customer: "TU Samarinda", picSales: "MICHAEL", service: 0, remark: "" },
  { customer: "tu balikpapan", picSales: "MICHAEL", service: 0, remark: "" },
  { customer: "TU JAKARTA", picSales: "MICHAEL", service: 48000000, remark: "Job Service spot Jakarta" },
  { customer: "KPP - SANGATTA", picSales: "IKBAL LAISA", service: 0, remark: "FORECAST JUNI 2026" },
  { customer: "KPC Sangatta", picSales: "IKBAL LAISA", service: 19500000, remark: "FORECAST JUNI 2026" },
  { customer: "PAMA SANGATTA", picSales: "IKBAL LAISA", service: 0, remark: "" },
  { customer: "SUKET GADJAH", picSales: "MICHAEL", service: 0, remark: "" },
  { customer: "CK BIB", picSales: "SABRINA", service: 1025990613, remark: "SSA TIREMAN MAY2026 & Forecast Juni 2026" },
  { customer: "CK TJ API API", picSales: "SABRINA", service: 0, remark: "" },
  { customer: "CK NCN", picSales: "SABRINA", service: 92314682, remark: "SSA TIREMAN JUNI 2026" },
  { customer: "CK BMB", picSales: "SABRINA", service: 863940323, remark: "SSA TIREMAN JUNI 2026 & Forecast Repair Juni 2026" },
  { customer: "CK MIFA", picSales: "AGUNG", service: 78000000, remark: "SSA TIREMAN JUNI 2026" },
  { customer: "CK KIM", picSales: "SABRINA", service: 364125774, remark: "SSA TIREMAN JUNI 2026 & Forecast Repair Juni 2026" },
  { customer: "CK MHU", picSales: "SABRINA", service: 422000000, remark: "SSA TIREMAN JUNI 2026 & Forecast Repair Juni 2026" },
  { customer: "RODA NUSANTARA", picSales: "RIKI DARMAWAN", service: 20000000, remark: "SSA TIREMAN JUNI 2026" },
  { customer: "AJL", picSales: "OCKY", service: 43000000, remark: "Rental Tire Handler" },
  { customer: "PAMA BPOP", picSales: "OCKY", service: 0, remark: "" },
  { customer: "IBP LOAJANAN", picSales: "RICKY", service: 0, remark: "" },
  { customer: "BDP TABANG", picSales: "RICKY", service: 0, remark: "" },
  { customer: "Trakindo BHI", picSales: "MICHAEL", service: 30500000, remark: "SSA TIREMAN MAY2026" },
  { customer: "PT.VALE", picSales: "AGUNG", service: 755267000, remark: "SSA TIREMAN JUNI 2026 & Forecast Repair Juni 2026" },
  { customer: "Trakindo Gresik", picSales: "Michael", service: 91986000, remark: "SSA TIREMAN MAY2026" },
  { customer: "SIMS JAYA", picSales: "OCKY", service: 0, remark: "" },
  { customer: "CKB Samarinda Batch 1", picSales: "WISNU", service: 0, remark: "" },
  { customer: "CKB Samarinda Batch 2", picSales: "WISNU", service: 0, remark: "" },
  { customer: "Madhani Berau", picSales: "ZULFIKAR", service: 0, remark: "FORECAST JUNI 2026" },
  { customer: "PKA SUMATRA", picSales: "FEBRIAL", service: 0, remark: "FORECAST JUNI 2026" },
  { customer: "RCI ABK", picSales: "WISNU", service: 0, remark: "" },
  { customer: "RCI INDOMINING", picSales: "WISNU", service: 0, remark: "Repair 16x27.00R49" },
  { customer: "Hasnur Berau", picSales: "ZULFIKAR", service: 0, remark: "" },
  { customer: "SMI Berau", picSales: "ZULFIKAR", service: 0, remark: "" },
];

async function seed() {
  console.log("Seeding July 2026 Forecast...");

  // 1. Create or get period "July 2026"
  let period = await db.select().from(centralServiceForecastPeriods).where(eq(centralServiceForecastPeriods.monthYear, "July 2026")).limit(1).then(res => res[0]);
  if (!period) {
    const res = await db.insert(centralServiceForecastPeriods).values({
      monthYear: "July 2026",
      exchangeRateIdrToUsd: "15000"
    }).returning();
    period = res[0];
    console.log("Created period July 2026", period.id);
  } else {
    console.log("Found existing period July 2026", period.id);
  }

  // 2. Fetch Sales Employees for Fuzzy matching
  const salesEmps = await db.select({
    id: employees.id,
    name: employees.name,
  })
  .from(employees)
  .where(ilike(employees.department, "%Sales%"));

  console.log(`Found ${salesEmps.length} sales employees in DB`);

  const fuse = new Fuse(salesEmps, { keys: ["name"], threshold: 0.4 });

  // 3. Map Data
  const recordsToInsert = RAW_DATA.map(row => {
    let matchedPic = row.picSales;
    if (row.picSales && salesEmps.length > 0) {
      const results = fuse.search(row.picSales);
      if (results.length > 0) {
        matchedPic = results[0].item.name;
      }
    }

    return {
      periodId: period.id,
      customer: row.customer,
      picSales: matchedPic,
      isProductAccessories: false,
      osInvoicePrevMonth: "0",
      repairForecast: "0",
      retreadForecast: "0",
      serviceForecast: row.service.toString(),
      totalForecastIdr: row.service.toString(),
      accessoriesAmountIdr: "0",
      accessoriesAmountUsd: "0",
      remark: row.remark,
      status: "Waiting",
      remainingRepair: "0",
      remainingRetread: "0",
      remainingService: row.service.toString(),
      remainingTotalIdr: row.service.toString(),
      remainingAccessoriesIdr: "0",
      remainingAccessoriesUsd: "0",
    };
  });

  // 4. Insert
  await db.insert(centralServiceForecastItems).values(recordsToInsert);

  console.log(`Successfully seeded ${recordsToInsert.length} items for July 2026.`);
  process.exit(0);
}

seed().catch(console.error);
