import { boolean, date, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

export const warehouseRepairItemTypes = pgTable("hero_warehouse_repair_item_types", {
  id: serial("id").primaryKey(),
  typeCode: text("type_code").notNull(),
  typeName: text("type_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({ typeCodeIdx: uniqueIndex("hero_wr_item_types_code_idx").on(table.typeCode) }))

export const warehouseRepairUnits = pgTable("hero_warehouse_repair_units", {
  id: serial("id").primaryKey(),
  unitCode: text("unit_code").notNull(),
  unitName: text("unit_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({ unitCodeIdx: uniqueIndex("hero_wr_units_code_idx").on(table.unitCode) }))

export const warehouseRepairItems = pgTable("hero_warehouse_repair_items", {
  id: serial("id").primaryKey(),
  itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  materialDesc: text("material_desc"),
  storageLocation: text("storage_location"),
  storageLocationDesc: text("storage_location_desc"),
  typeId: integer("type_id").references(() => warehouseRepairItemTypes.id, { onDelete: "set null" }),
  minimumStock: integer("minimum_stock").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  unitId: integer("unit_id").references(() => warehouseRepairUnits.id, { onDelete: "set null" }),
  photoUrl: text("photo_url").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({ itemCodeIdx: uniqueIndex("hero_wr_items_code_idx").on(table.itemCode) }))

export const warehouseRepairInbound = pgTable("hero_warehouse_repair_inbound", {
  id: serial("id").primaryKey(),
  transactionNo: text("transaction_no").notNull(),
  transactionDate: date("transaction_date").notNull(),
  itemId: integer("item_id").notNull().references(() => warehouseRepairItems.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  targetSLoc: text("target_sloc").notNull().default(""),
  targetSLocDesc: text("target_sloc_desc").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({ transactionNoIdx: uniqueIndex("hero_wr_inbound_no_idx").on(table.transactionNo) }))

export const warehouseRepairOutbound = pgTable("hero_warehouse_repair_outbound", {
  id: serial("id").primaryKey(),
  transactionNo: text("transaction_no").notNull(),
  transactionDate: date("transaction_date").notNull(),
  itemId: integer("item_id").notNull().references(() => warehouseRepairItems.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  outboundType: text("outbound_type").notNull().default("Pemakaian Internal"),
  destinationSLoc: text("destination_sloc").notNull().default(""),
  destinationSLocDesc: text("destination_sloc_desc").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({ transactionNoIdx: uniqueIndex("hero_wr_outbound_no_idx").on(table.transactionNo) }))

export const warehouseRepairTransfers = pgTable("hero_warehouse_repair_transfers", {
  id: serial("id").primaryKey(),
  transactionNo: text("transaction_no").notNull(),
  transactionDate: date("transaction_date").notNull(),
  itemId: integer("item_id").notNull().references(() => warehouseRepairItems.id, { onDelete: "cascade" }),
  fromSLoc: text("from_sloc").notNull(),
  fromSLocDesc: text("from_sloc_desc").notNull(),
  toSLoc: text("to_sloc").notNull(),
  toSLocDesc: text("to_sloc_desc").notNull(),
  quantity: integer("quantity").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({ transactionNoIdx: uniqueIndex("hero_wr_transfer_no_idx").on(table.transactionNo) }))

