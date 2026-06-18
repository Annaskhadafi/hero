/**
 * Central Service Employee Management Schema
 * Stores all employees (with or without email)
 * Links to user management when email is added
 */

import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { sites } from "@/db/schema/hero";

export const centralServiceEmployees = pgTable(
  "hero_central_service_employees",
  {
    id: serial("id").primaryKey(),
    
    // Basic Info
    employeeSn: text("employee_sn").notNull(), // Serial Number / NIK
    fullName: text("full_name").notNull(),
    nickname: text("nickname"),
    
    // Contact
    email: text("email"), // Optional, can be null
    phoneNumber: text("phone_number"),
    
    // Employment
    siteId: integer("site_id").references(() => sites.id, { onDelete: "set null" }),
    siteName: text("site_name").notNull().default(""),
    department: text("department").notNull().default(""),
    section: text("section").notNull().default(""),
    position: text("position").notNull().default(""),
    employmentStatus: text("employment_status").notNull().default("active"), // active, inactive, resigned
    employmentType: text("employment_type").notNull().default("permanent"), // permanent, contract, outsource
    
    // Personal
    idCardNumber: text("id_card_number"), // KTP
    birthDate: text("birth_date"),
    birthPlace: text("birth_place"),
    address: text("address"),
    
    // Employment Dates
    joinDate: text("join_date"),
    resignDate: text("resign_date"),
    
    // User Management Link
    authUserId: text("auth_user_id").references(() => user.id, { onDelete: "set null" }),
    isSyncedToUserManagement: boolean("is_synced_to_user_management").notNull().default(false),
    syncedAt: timestamp("synced_at"),
    
    // Import Tracking
    importBatchId: text("import_batch_id"),
    importedAt: timestamp("imported_at"),
    
    // Metadata
    notes: text("notes").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    employeeSnIdx: uniqueIndex("cs_employee_sn_idx").on(table.employeeSn),
    emailIdx: uniqueIndex("cs_employee_email_idx").on(table.email),
  })
);

// Import history tracking
export const centralServiceEmployeeImports = pgTable("hero_central_service_employee_imports", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull().unique(),
  originalFilename: text("original_filename").notNull(),
  fileStoragePath: text("file_storage_path").notNull(),
  
  totalRows: integer("total_rows").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  duplicateCount: integer("duplicate_count").notNull().default(0),
  
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  errorLog: text("error_log"),
  
  uploadedByUserId: text("uploaded_by_user_id").references(() => user.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Central Service Manpower Requested Targets
export const centralServiceManpowerTargets = pgTable(
  "hero_central_service_manpower_targets",
  {
    id: serial("id").primaryKey(),
    siteName: text("site_name").notNull(),
    position: text("position").notNull(), // 'Technical Engineer', 'Serviceman', 'Repairman'
    requestedCount: integer("requested_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    sitePositionIdx: uniqueIndex("cs_mp_target_site_pos_idx").on(table.siteName, table.position),
  })
);

