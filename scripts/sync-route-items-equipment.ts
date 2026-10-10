import { db } from "../db";
import { activityLibraries, activityRouteItems } from "../db/schema/hero";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("=== SYNCING ROUTE ITEMS WITH ACTIVITY LIBRARIES ===");

  // 1. Update requires_unit = true for route items whose library has requires_equipment_no = true
  const updateUnitRes = await db.execute(sql`
    UPDATE hero_activity_route_items
    SET requires_unit = true, updated_at = NOW()
    FROM hero_activity_libraries
    WHERE hero_activity_route_items.library_activity_id = hero_activity_libraries.id
      AND hero_activity_libraries.requires_equipment_no = true
      AND hero_activity_route_items.requires_unit = false;
  `);

  console.log("Updated requires_unit for route items:", updateUnitRes);

  // 2. Update requires_photo = true for route items whose library has requires_photo = true
  const updatePhotoRes = await db.execute(sql`
    UPDATE hero_activity_route_items
    SET requires_photo = true, updated_at = NOW()
    FROM hero_activity_libraries
    WHERE hero_activity_route_items.library_activity_id = hero_activity_libraries.id
      AND hero_activity_libraries.requires_photo = true
      AND hero_activity_route_items.requires_photo = false;
  `);

  console.log("Updated requires_photo for route items:", updatePhotoRes);

  // 3. Verify
  const remainingDiscrepancies = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM hero_activity_route_items r
    JOIN hero_activity_libraries l ON r.library_activity_id = l.id
    WHERE l.requires_equipment_no = true AND r.requires_unit = false;
  `);

  console.log("Remaining discrepancies (requires_unit):", remainingDiscrepancies.rows[0]);

  console.log("=== SYNC FINISHED SUCCESSFULLY ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
