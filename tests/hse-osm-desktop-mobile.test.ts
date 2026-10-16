import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../db";
import { navbarMenuItems } from "../db/schema/hero";
import { eq, or } from "drizzle-orm";
import { getHseOsmSessions } from "../app/actions/hse-osm";

test("OSM Desktop and Mobile Migration Verification", async (t) => {
  await t.test("1. Database navbar menu item has been updated from Safety Inspections to OSM List", async () => {
    const legacyMenu = await db
      .select()
      .from(navbarMenuItems)
      .where(
        or(
          eq(navbarMenuItems.resource, "safety_inspections"),
          eq(navbarMenuItems.url, "/dashboard/safety/inspections")
        )
      );

    assert.equal(
      legacyMenu.length,
      0,
      "Safety Inspections menu should no longer exist in hero_navbar_menu_items"
    );

    const osmMenu = await db
      .select()
      .from(navbarMenuItems)
      .where(eq(navbarMenuItems.resource, "hse_osm"));

    assert.ok(osmMenu.length >= 1, "OSM List menu item must exist in hero_navbar_menu_items");
    assert.equal(osmMenu[0].title, "OSM List");
    assert.equal(osmMenu[0].url, "/dashboard/hse/osm");
    assert.equal(osmMenu[0].section, "HSE");
    assert.equal(osmMenu[0].groupLabel, "Safety Management");
  });

  await t.test("2. getHseOsmSessions returns ticketStatus and substandard/standard counts", async () => {
    const res = await getHseOsmSessions({ limit: 10 });
    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.data), "Data should be an array");

    if (res.data.length > 0) {
      const first = res.data[0];
      assert.ok(
        ["OPEN", "IN PROGRESS", "CLOSED", "REJECTED"].includes(first.ticketStatus),
        `ticketStatus should be valid status, got ${first.ticketStatus}`
      );
      assert.ok(first.findingsSummary, "findingsSummary must exist");
      assert.equal(typeof first.findingsSummary.substandard, "number");
      assert.equal(typeof first.findingsSummary.standard, "number");
    }
  });

  await t.test("3. Status filtering in getHseOsmSessions works for ticket statuses", async () => {
    const resOpen = await getHseOsmSessions({ status: "OPEN" });
    assert.equal(resOpen.success, true);
    for (const item of resOpen.data) {
      assert.ok(item.ticketStatus === "OPEN" || item.status === "OPEN");
    }
  });
});
