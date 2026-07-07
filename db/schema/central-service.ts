/**
 * Central Service Employee Management Schema
 * Stores all employees (with or without email)
 * Links to user management when email is added
 */

import {
  boolean,
  index,
  integer,
  numeric,
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

// Central Service Assets
export const centralServiceAssets = pgTable(
  "hero_central_service_assets",
  {
    id: serial("id").primaryKey(),
    workSection: text("work_section").notNull().default(""),
    section: text("section").notNull().default(""),
    location: text("location").notNull().default(""),
    description: text("description").notNull().default(""),
    assetNumber: text("asset_number"),
    serialNumber: text("serial_number"),
    purchaseDate: timestamp("purchase_date"),
    deliveryToSiteDate: timestamp("delivery_to_site_date"),
    lastCalibrationDate: timestamp("last_calibration_date"),
    calibrationCycleMonths: integer("calibration_cycle_months"),
    calibrationDueDate: timestamp("calibration_due_date"),
    certificateDate: timestamp("certificate_date"),
    certificateCycleMonths: integer("certificate_cycle_months"),
    certificateDueDate: timestamp("certificate_due_date"),
    condition: text("condition").notNull().default(""),
    qty: integer("qty").notNull().default(1),
    remarks: text("remarks"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // uniqueIndex removed — assetNumber is now optional (nullable)
  })
);

export const centralServiceAssetAttachments = pgTable(
  "hero_central_service_asset_attachments",
  {
    id: serial("id").primaryKey(),
    assetId: integer("asset_id")
      .notNull()
      .references(() => centralServiceAssets.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull().default(""),
    fileUrl: text("file_url").notNull(),
    mimeType: text("mime_type").notNull().default("application/octet-stream"),
    fileSize: integer("file_size"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    assetIdx: index("cs_asset_attachment_asset_idx").on(table.assetId),
  })
);

export const centralServiceAssetHistories = pgTable(
  "hero_central_service_asset_histories",
  {
    id: serial("id").primaryKey(),
    assetId: integer("asset_id")
      .notNull()
      .references(() => centralServiceAssets.id, { onDelete: "cascade" }),
    action: text("action").notNull().default("update"),
    fieldName: text("field_name").notNull().default(""),
    fieldLabel: text("field_label").notNull().default(""),
    previousValue: text("previous_value"),
    newValue: text("new_value"),
    changeRemark: text("change_remark"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    assetIdx: index("cs_asset_history_asset_idx").on(table.assetId),
  })
);

// ==========================================
// FORECAST REVENUE MODULE
// ==========================================

export const centralServiceForecastPeriods = pgTable(
  "hero_central_service_forecast_periods",
  {
    id: serial("id").primaryKey(),
    monthYear: text("month_year").notNull().unique(), // Format: "YYYY-MM"
    exchangeRateIdrToUsd: numeric("exchange_rate_idr_to_usd").notNull().default("15000"),
    status: text("status").notNull().default("Draft"), // 'Draft', 'Locked'
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const centralServiceForecastItems = pgTable(
  "hero_central_service_forecast_items",
  {
    id: serial("id").primaryKey(),
    periodId: integer("period_id")
      .notNull()
      .references(() => centralServiceForecastPeriods.id, { onDelete: "cascade" }),
    
    customer: text("customer").notNull(),
    picSales: text("pic_sales").notNull().default(""),
    
    // Core Forecast Categories (Amounts in IDR)
    osInvoicePrevMonth: numeric("os_invoice_prev_month").notNull().default("0"),
    repairForecast: numeric("repair_forecast").notNull().default("0"),
    retreadForecast: numeric("retread_forecast").notNull().default("0"),
    serviceForecast: numeric("service_forecast").notNull().default("0"),
    totalForecastIdr: numeric("total_forecast_idr").notNull().default("0"),
    repairRemark: text("repair_remark").notNull().default(""),
    retreadRemark: text("retread_remark").notNull().default(""),
    serviceRemark: text("service_remark").notNull().default(""),
    
    // Remaining Forecast (Total Forecast - Actuals)
    remainingRepair: numeric("remaining_repair").notNull().default("0"),
    remainingRetread: numeric("remaining_retread").notNull().default("0"),
    remainingService: numeric("remaining_service").notNull().default("0"),
    remainingTotalIdr: numeric("remaining_total_idr").notNull().default("0"),
    
    // Product Accessories fields
    isProductAccessories: boolean("is_product_accessories").notNull().default(false),
    accessoriesAmountIdr: numeric("accessories_amount_idr").notNull().default("0"),
    accessoriesAmountUsd: numeric("accessories_amount_usd").notNull().default("0"),
    remainingAccessoriesIdr: numeric("remaining_accessories_idr").notNull().default("0"),
    remainingAccessoriesUsd: numeric("remaining_accessories_usd").notNull().default("0"),
    
    // Workflow tracking
    status: text("status").notNull().default("Waiting"), // 'Waiting', 'Invoiced', 'Cancel'
    remark: text("remark").notNull().default(""),
    
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    periodIdx: index("cs_forecast_items_period_idx").on(table.periodId),
  })
);

export const centralServiceForecastActuals = pgTable(
  "hero_central_service_forecast_actuals",
  {
    id: serial("id").primaryKey(),
    periodId: integer("period_id")
      .notNull()
      .references(() => centralServiceForecastPeriods.id, { onDelete: "cascade" }),
    forecastItemId: integer("forecast_item_id")
      .references(() => centralServiceForecastItems.id, { onDelete: "set null" }), // Null if unplanned/takeout
    
    updateDate: timestamp("update_date").notNull().defaultNow(),
    invoiceNumber: text("invoice_number").notNull(),
    customer: text("customer"), // Mostly for unplanned
    
    category: text("category").notNull(), // 'Repair', 'Retread', 'Service', 'Accessories'
    jobCode: text("job_code").notNull().default(""), // 'ZCP1', 'ZCP2', 'ZCP3', 'ZCP8'
    
    amountIdr: numeric("amount_idr").notNull().default("0"),
    amountUsd: numeric("amount_usd").notNull().default("0"),
    
    remark: text("remark").notNull().default(""),
    
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    periodIdx: index("cs_forecast_actuals_period_idx").on(table.periodId),
    itemIdx: index("cs_forecast_actuals_item_idx").on(table.forecastItemId),
  })
);

export const centralServiceForecastHistories = pgTable(
  "hero_central_service_forecast_histories",
  {
    id: serial("id").primaryKey(),
    forecastItemId: integer("forecast_item_id")
      .notNull()
      .references(() => centralServiceForecastItems.id, { onDelete: "cascade" }),
    
    previousStatus: text("previous_status").notNull(),
    newStatus: text("new_status").notNull(),
    
    actionRemark: text("action_remark").notNull().default(""),
    
    actionById: text("action_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    itemIdx: index("cs_forecast_history_item_idx").on(table.forecastItemId),
  })
);
