/**
 * Seed sites + timesheet configs
 * Create missing sites first, then add configs
 */

import { db } from "@/db";
import { sites } from "@/db/schema/hero";
import { timesheetSiteConfigs } from "@/db/schema/timesheet";
import { eq } from "drizzle-orm";

async function seedSitesAndConfigs() {
  console.log("Seeding sites + timesheet configs...\n");

  const siteConfigs = [
    {
      siteCode: "VALE",
      siteName: "VALE INDONESIA",
      location: "Sorowako, Sulawesi Selatan",
      customerName: "PT Vale Indonesia Tbk",
      msaRate: 40000,
      mealsRate: 60000,
      tlkRate: 30000,
      otDecimalMode: true,
      hasMsaSummary: true,
      hasMealsSummary: true,
      hasTlkSummary: true,
    },
    {
      siteCode: "PPA BIB",
      siteName: "PPA BIB",
      location: "Binuang, Kalimantan Selatan",
      customerName: "PT Pamapersada Nusantara",
      msaRate: 35000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
    {
      siteCode: "AMM MIFA",
      siteName: "AMM MIFA",
      location: "Melak, Kalimantan Timur",
      customerName: "PT Adaro Indonesia",
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
      location: "Tanjung, Kalimantan Selatan",
      customerName: "PT Adaro Indonesia",
      msaRate: 35000,
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
      location: "Binuang, Kalimantan Selatan",
      customerName: "PT Kaltim Prima Coal",
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
      location: "Bengalon, Kalimantan Timur",
      customerName: "PT Kaltim Prima Coal",
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
      location: "Melak, Kalimantan Timur",
      customerName: "PT Kaltim Prima Coal",
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
      location: "Sangatta, Kalimantan Timur",
      customerName: "PT Kaltim Prima Coal",
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
      location: "Sangatta, Kalimantan Timur",
      customerName: "PT Kaltim Prima Coal",
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
      location: "Gresik, Jawa Timur",
      customerName: "PT Semen Indonesia",
      msaRate: 30000,
      mealsRate: 0,
      tlkRate: 0,
      otDecimalMode: false,
      hasMsaSummary: true,
      hasMealsSummary: false,
      hasTlkSummary: false,
    },
  ];

  for (const config of siteConfigs) {
    // Check if site exists
    const [existingSite] = await db
      .select()
      .from(sites)
      .where(eq(sites.name, config.siteName))
      .limit(1);

    let siteId: number;

    if (existingSite) {
      console.log(`✓ Site exists: ${config.siteName}`);
      siteId = existingSite.id;
    } else {
      // Create site
      const [newSite] = await db
        .insert(sites)
        .values({
          name: config.siteName,
          location: config.location,
          customerName: config.customerName,
          contractNumber: "TBD",
          isActive: true,
        })
        .returning();
      siteId = newSite.id;
      console.log(`✓ Created site: ${config.siteName} (ID: ${siteId})`);
    }

    // Check if config exists
    const [existingConfig] = await db
      .select()
      .from(timesheetSiteConfigs)
      .where(eq(timesheetSiteConfigs.siteId, siteId))
      .limit(1);

    if (existingConfig) {
      console.log(`  → Config already exists\n`);
      continue;
    }

    // Create config
    await db.insert(timesheetSiteConfigs).values({
      siteId,
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
    console.log(`  → Created timesheet config\n`);
  }

  console.log("Seeding complete!");
}

seedSitesAndConfigs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
