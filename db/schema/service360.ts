import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  decimal,
  date,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sites, employees } from "@/db/schema/hero";

export const service360EmployeeLevels = pgTable("hero_service360_employee_levels", {
  employeeId: integer("employee_id").primaryKey().references(() => employees.id, { onDelete: "cascade" }),
  level: integer("level").notNull().default(1),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const service360RateSettings = pgTable("hero_service360_rate_settings", {
  id: serial("id").primaryKey(),
  workLocation: text("work_location").notNull(),
  section: text("section").notNull(),
  level: integer("level").notNull(), // 1, 2, or 3
  price: decimal("price", { precision: 15, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    locationSectionLevelUnique: uniqueIndex("hero_service360_rate_settings_location_section_level_idx").on(table.workLocation, table.section, table.level),
  }
});

export const service360Customers = pgTable("hero_service360_customers", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const service360Items = pgTable("hero_service360_items", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // Labour Cost, Rental, Tools, Accessories, Consumable Parts
  siteId: integer("site_id").references(() => sites.id),
  jobTitle: text("job_title"),
  name: text("name").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const service360Quotations = pgTable("hero_service360_quotations", {
  id: serial("id").primaryKey(),
  quotationNumber: text("quotation_number").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => service360Customers.id),
  quotationDate: date("quotation_date").notNull(),
  attn: text("attn"),
  cc: text("cc"),
  fromName: text("from_name"),
  subject: text("subject"),
  poNumber: text("po_number"),
  projectName: text("project_name"),
  poPeriod: text("po_period"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"), // e.g. 11.00 for 11%
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  subTotal: decimal("sub_total", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("Draft"),
  showLevel: boolean("show_level").notNull().default(true),
  showQty: boolean("show_qty").notNull().default(false),
  notes: text("notes"),
  showIntro: boolean("show_intro").notNull().default(true),
  customIntro: text("custom_intro"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const service360QuotationItems = pgTable("hero_service360_quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id")
    .notNull()
    .references(() => service360Quotations.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => service360Items.id),
  monthPeriod: text("month_period"),
  level: text("level"),
  customDescription: text("custom_description"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  price: decimal("price", { precision: 15, scale: 2 }).notNull().default("0"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  
  // Backup Fields
  isBackup: boolean("is_backup").notNull().default(false),
  backupStartDate: date("backup_start_date"),
  backupEndDate: date("backup_end_date"),
  backupMonthPeriod: text("backup_month_period"),
  backupLevel: text("backup_level"),
  backupDescription: text("backup_description"),
  backupPrice: decimal("backup_price", { precision: 15, scale: 2 }).notNull().default("0"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const service360FormHistory = pgTable("hero_service360_form_history", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => service360Customers.id, { onDelete: "cascade" }),
  field: text("field").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    customerFieldUnique: uniqueIndex("hero_service360_form_history_unique_idx").on(table.customerId, table.field, table.value),
  }
});
