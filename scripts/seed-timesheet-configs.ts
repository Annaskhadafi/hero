/**
 * Seed timesheet site configurations
 * Based on TIMESHEET_SYSTEM_DESIGN.md section 3
 */

import { db } from "@/db";
import { timesheetSiteConfigs } from "@/db/schema/timesheet";
import { sites } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function seedTimesheetSiteConfigs() {
  console.log("Seeding timesheet site configs...");

  // Site configurations based on design doc
  const siteConfigs = [
    {
      siteCode: "VALE",
      siteName: "VALE INDONESIA",
      msaRate: 40000,
      mealsRate: 60000,
      tlkRate: 30000,
      otDecimalMode: true, // VALE uses decimals (4.5, 12.5)
      hasMsaSummary: true,
      hasMealsSummary: true,
      hasTlkSummary: true,
    },
    {
      siteCode: "PPA BIB",
      siteName: "PPA BIB",
      msaRate: 35000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false, // Integer OT
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
    {
      siteCode: "AMM MIFA",
      siteName: "AMM MIFA",
      msaRate: 35000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
    {
      siteCode: "AMM IPT",
      siteName: "AMM IPT",
      msaRate: 35000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
    {
      siteCode: "Balikpapan",
      siteName: "Balikpapan",
      msaRate: 30000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
    {
      siteCode: "CK BIB",
      siteName: "CK BIB",
      msaRate: 35000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
    {
      siteCode: "CK BMB",
      siteName: "CK BMB",
      msaRate: 35000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
    {
      siteCode: "CK DMP & MIFA",
      siteName: "CK DMP & MIFA",
      msaRate: 35000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
    {
      siteCode: "CK KIM",
      siteName: "CK KIM",
      msaRate: 35000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
    {
      siteCode: "CK MHU",
      siteName: "CK MHU",
      msaRate: 35000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
    {
      siteCode: "BHJ & GRESIK",
      siteName: "BHJ & GRESIK",
      msaRate: 30000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
  ];

  // Get all sites from database
  const allSites = await db.select().from(sites);

  for (const config of siteConfigs) {
    // Try to match site by name or location
    const matchedSite = allSites.find(
      (s) =>
        s.name.toUpperCase().includes(config.siteCode.toUpperCase()) ||
        s.location.toUpperCase().includes(config.siteCode.toUpperCase())
    );

    if (!matchedSite) {
      console.log(`⚠️  No matching site found for ${config.siteCode}, skipping...`);
      continue;
    }

    // Check if config already exists
    const [existing] = await db
      .select()
      .from(timesheetSiteConfigs)
      .where(eq(timesheetSiteConfigs.siteId, matchedSite.id))
      .limit(1);

    if (existing) {
      console.log(`✓ Config already exists for ${config.siteCode}`);
      continue;
    }

    // Insert config
    await db.insert(timesheetSiteConfigs).values({
      siteId: matchedSite.id,
      siteCode: config.siteCode,
      siteName: config.siteName,
      msaRate: config.msaRate,
      mealsRate: config.mealsRate,
      tlkRate: config.tlkRate,
      otDecimalMode: config.otDecimalMode,
      hasMsaSummary: config.hasMsaSummary,
      hasMealsSummary: config.hasMealsSummary,
      hasTlkSummary: config.hasTlkSummary,
    });

    console.log(`✓ Created config for ${config.siteCode}`);
  }

  console.log("\nTimesheet site configs seeded successfully!");
}

seedTimesheetSiteConfigs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
