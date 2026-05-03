import { pgTable, serial, integer, text, timestamp, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { employees } from "./hero";

// Extended fields for user management enhancements
export const userImportHistory = pgTable("hero_user_import_history", {
  id: serial("id").primaryKey(),
  importedByEmployeeId: integer("imported_by_employee_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  fileName: text("file_name").notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  importedCount: integer("imported_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  errorDetails: jsonb("error_details"),
  mapping: jsonb("mapping"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userActivityLog = pgTable(
  "hero_user_activity_log",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    activityType: text("activity_type").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    employeeIdx: uniqueIndex("hero_user_activity_log_employee_idx").on(
      table.employeeId,
      table.createdAt,
    ),
  }),
);

export const userGroups = pgTable("hero_user_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userGroupMemberships = pgTable(
  "hero_user_group_memberships",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => userGroups.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueMembership: uniqueIndex("hero_user_group_memberships_unique").on(
      table.employeeId,
      table.groupId,
    ),
    employeeIdx: uniqueIndex("hero_user_group_memberships_employee_idx").on(table.employeeId),
    groupIdx: uniqueIndex("hero_user_group_memberships_group_idx").on(table.groupId),
  }),
);
