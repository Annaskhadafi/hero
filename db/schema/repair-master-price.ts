import { pgTable, serial, varchar, numeric, timestamp, integer } from "drizzle-orm/pg-core"

export const repairMasterPrice = pgTable("repair_master_price", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).default("Repair").notNull(), // Repair | Retread
  customer: varchar("customer", { length: 255 }).default("OTHER CUSTOMER").notNull(),
  site: varchar("site", { length: 255 }),
  size: varchar("size", { length: 100 }).notNull(),
  damageType: varchar("damage_type", { length: 50 }).default("R1").notNull(), // R1 | R2 | R3
  price: numeric("price", { precision: 15, scale: 2 }).default("0").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type RepairMasterPriceRecord = typeof repairMasterPrice.$inferSelect
