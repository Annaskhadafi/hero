import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from '@/db/schema/auth'
import { employees, masterDepartments, masterSections, sites } from '@/db/schema/hero'
import { centralServiceAssets } from '@/db/schema/central-service'

// ==========================================
// CAPEX BUDGET CONTROLLER TABLES
// ==========================================

export const cerCapexBudgets = pgTable(
  'hero_cer_capex_budgets',
  {
    id: serial('id').primaryKey(),
    fiscalYear: integer('fiscal_year').notNull(),
    siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
    departmentId: integer('department_id').references(() => masterDepartments.id, {
      onDelete: 'set null',
    }),
    assetCategory: text('asset_category').notNull().default('IT Device'),
    budgetCode: text('budget_code').notNull(),
    budgetName: text('budget_name').notNull(),
    allocatedAmount: numeric('allocated_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    usedAmount: numeric('used_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    remainingAmount: numeric('remaining_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    notes: text('notes').notNull().default(''),
    isActive: boolean('is_active').notNull().default(true),
    createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    budgetCodeIdx: uniqueIndex('cer_capex_budget_code_idx').on(table.budgetCode),
    yearSiteDeptCatIdx: index('cer_capex_year_site_dept_cat_idx').on(
      table.fiscalYear,
      table.siteId,
      table.departmentId,
      table.assetCategory
    ),
  })
)

export const cerCapexBudgetTransactions = pgTable(
  'hero_cer_capex_budget_transactions',
  {
    id: serial('id').primaryKey(),
    budgetId: integer('budget_id')
      .notNull()
      .references(() => cerCapexBudgets.id, { onDelete: 'cascade' }),
    cerRequestId: integer('cer_request_id'),
    transactionType: text('transaction_type').notNull(), // 'allocation', 'commitment', 'deduction', 'release', 'adjustment'
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull().default('0'),
    previousRemaining: numeric('previous_remaining', { precision: 15, scale: 2 }).notNull().default('0'),
    newRemaining: numeric('new_remaining', { precision: 15, scale: 2 }).notNull().default('0'),
    description: text('description').notNull().default(''),
    createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    budgetIdIdx: index('cer_budget_tx_budget_id_idx').on(table.budgetId),
    cerRequestIdIdx: index('cer_budget_tx_request_id_idx').on(table.cerRequestId),
  })
)

// ==========================================
// CER REQUEST MASTER & DETAILS TABLES
// ==========================================

export const cerRequests = pgTable(
  'hero_cer_requests',
  {
    id: serial('id').primaryKey(),
    cerNumber: text('cer_number').notNull(),
    subject: text('subject').notNull(),
    applicantEmployeeId: integer('applicant_employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'restrict' }),
    dateRequired: date('date_required'),
    level: text('level').notNull().default('Non Managerial'), // 'Non Managerial', 'Managerial'
    purchaseType: text('purchase_type').notNull().default('Tambahan / Baru'), // 'Pergantian', 'Tambahan / Baru'
    budgetSource: text('budget_source').notNull().default('Anggaran'), // 'Anggaran', 'Bukan Anggaran'
    departmentId: integer('department_id').references(() => masterDepartments.id, {
      onDelete: 'set null',
    }),
    sectionId: integer('section_id').references(() => masterSections.id, {
      onDelete: 'set null',
    }),
    siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
    assetCategory: text('asset_category').notNull().default('IT Device'),
    purchasePurpose: text('purchase_purpose').notNull().default(''),
    vendorName: text('vendor_name').notNull().default(''),
    totalEstimatedPrice: numeric('total_estimated_price', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
    capexBudgetId: integer('capex_budget_id').references(() => cerCapexBudgets.id, {
      onDelete: 'set null',
    }),
    attachmentChecklist: jsonb('attachment_checklist')
      .$type<string[]>()
      .notNull()
      .default([]),
    status: text('status').notNull().default('draft'), // 'draft', 'in_review', 'need_revision', 'full_approved', 'received', 'completed', 'rejected'
    currentStepOrder: integer('current_step_order').notNull().default(1),
    currentApproverTitle: text('current_approver_title'),
    currentApproverName: text('current_approver_name'),
    currentApproverEmployeeId: integer('current_approver_employee_id'),
    lastRevertedByEmployeeId: integer('last_reverted_by_employee_id'),
    lastRevertStepOrder: integer('last_revert_step_order'),
    lastRevertNote: text('last_revert_note'),
    isUnbudgeted: boolean('is_unbudgeted').notNull().default(false),
    isOverBudget: boolean('is_over_budget').notNull().default(false),
    kelompokAset: text('kelompok_aset'),
    financeCheckedAt: timestamp('finance_checked_at'),
    financeCheckedByEmployeeId: integer('finance_checked_by_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    financeCheckNotes: text('finance_check_notes'),
    pdfUrl: text('pdf_url'),
    bastPdfUrl: text('bast_pdf_url'),
    applicantSignatureUrl: text('applicant_signature_url'),
    receiverSignatureUrl: text('receiver_signature_url'),
    approvedAt: timestamp('approved_at'),
    receivedAt: timestamp('received_at'),
    receiverNotes: text('receiver_notes'),
    deliveryNoteUrl: text('delivery_note_url'),
    goodsPhotoUrl: text('goods_photo_url'),
    createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    cerNumberIdx: uniqueIndex('cer_number_idx').on(table.cerNumber),
    applicantIdx: index('cer_applicant_idx').on(table.applicantEmployeeId),
    statusIdx: index('cer_status_idx').on(table.status),
    siteDeptIdx: index('cer_site_dept_idx').on(table.siteId, table.departmentId),
  })
)

export const cerItems = pgTable(
  'hero_cer_items',
  {
    id: serial('id').primaryKey(),
    cerRequestId: integer('cer_request_id')
      .notNull()
      .references(() => cerRequests.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    qty: integer('qty').notNull().default(1),
    pricePerUnit: numeric('price_per_unit', { precision: 15, scale: 2 }).notNull().default('0'),
    totalPrice: numeric('total_price', { precision: 15, scale: 2 }).notNull().default('0'),
    allocation: text('allocation').notNull().default(''),
    holderName: text('holder_name').notNull().default(''),
    holderEmployeeId: integer('holder_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    estimatedLifespan: text('estimated_lifespan').notNull().default(''),
    assetNumber: text('asset_number'),
    assetGroup: text('asset_group'),
    assetId: integer('asset_id').references(() => centralServiceAssets.id, {
      onDelete: 'set null',
    }),
    serialNumber: text('serial_number'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    cerRequestIdx: index('cer_items_request_idx').on(table.cerRequestId),
  })
)

export const cerAttachments = pgTable(
  'hero_cer_attachments',
  {
    id: serial('id').primaryKey(),
    cerRequestId: integer('cer_request_id')
      .notNull()
      .references(() => cerRequests.id, { onDelete: 'cascade' }),
    fileType: text('file_type').notNull().default('attachment'), // 'attachment', 'budget_capex', 'goods_photo', 'delivery_note', 'bast_signed'
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    fileSize: integer('file_size'),
    mimeType: text('mime_type').notNull().default('application/octet-stream'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    cerRequestAttachmentIdx: index('cer_attachments_request_idx').on(table.cerRequestId),
  })
)

// ==========================================
// CER BAST (BERITA ACARA SERAH TERIMA)
// ==========================================

export const cerBasts = pgTable(
  'hero_cer_basts',
  {
    id: serial('id').primaryKey(),
    cerRequestId: integer('cer_request_id')
      .notNull()
      .references(() => cerRequests.id, { onDelete: 'cascade' }),
    bastNumber: text('bast_number').notNull(),
    handoverDate: date('handover_date').notNull(),
    gaEmployeeId: integer('ga_employee_id').references(() => employees.id, { onDelete: 'set null' }),
    gaEmployeeName: text('ga_employee_name').notNull().default(''),
    userEmployeeId: integer('user_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    userEmployeeName: text('user_employee_name').notNull().default(''),
    gaSignatureUrl: text('ga_signature_url'),
    gaSignedAt: timestamp('ga_signed_at'),
    userSignatureUrl: text('user_signature_url'),
    userSignedAt: timestamp('user_signed_at'),
    pdfUrl: text('pdf_url'),
    bastPdfUrl: text('bast_pdf_url'),
    applicantSignatureUrl: text('applicant_signature_url'),
    receiverSignatureUrl: text('receiver_signature_url'),
    status: text('status').notNull().default('draft'), // 'draft', 'signed', 'completed'
    notes: text('notes').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    bastNumberIdx: uniqueIndex('cer_bast_number_idx').on(table.bastNumber),
    bastRequestIdx: index('cer_bast_request_idx').on(table.cerRequestId),
  })
)

// ==========================================
// CER NOTIFICATION & RECIPIENT SETTINGS
// ==========================================

export const cerNotificationConfigs = pgTable('hero_cer_notification_configs', {
  id: serial('id').primaryKey(),
  procurementEmail: text('procurement_email').notNull().default('procurement@chitraparatama.com'),
  procurementSiteOverrides: jsonb('procurement_site_overrides')
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  evoDwiEmail: text('evo_dwi_email').notNull().default('evo.dwi@chitraparatama.com'),
  gaAdilaEmail: text('ga_adila_email').notNull().default('adila@chitraparatama.com'),
  gaBagasEmail: text('ga_bagas_email').notNull().default('bagas@chitraparatama.com'),
  itBimaEmail: text('it_bima_email').notNull().default('bima@chitraparatama.com'),
  budgetValidatorEmail: text('budget_validator_email')
    .notNull()
    .default('budget.controller@chitraparatama.com'),
  isActive: boolean('is_active').notNull().default(true),
  updatedById: text('updated_by_id').references(() => user.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ==========================================
// RELATIONS
// ==========================================

export const cerCapexBudgetsRelations = relations(cerCapexBudgets, ({ one, many }) => ({
  site: one(sites, {
    fields: [cerCapexBudgets.siteId],
    references: [sites.id],
  }),
  department: one(masterDepartments, {
    fields: [cerCapexBudgets.departmentId],
    references: [masterDepartments.id],
  }),
  transactions: many(cerCapexBudgetTransactions),
  requests: many(cerRequests),
}))

export const cerCapexBudgetTransactionsRelations = relations(
  cerCapexBudgetTransactions,
  ({ one }) => ({
    budget: one(cerCapexBudgets, {
      fields: [cerCapexBudgetTransactions.budgetId],
      references: [cerCapexBudgets.id],
    }),
    request: one(cerRequests, {
      fields: [cerCapexBudgetTransactions.cerRequestId],
      references: [cerRequests.id],
    }),
  })
)

export const cerRequestsRelations = relations(cerRequests, ({ one, many }) => ({
  applicant: one(employees, {
    fields: [cerRequests.applicantEmployeeId],
    references: [employees.id],
  }),
  site: one(sites, {
    fields: [cerRequests.siteId],
    references: [sites.id],
  }),
  department: one(masterDepartments, {
    fields: [cerRequests.departmentId],
    references: [masterDepartments.id],
  }),
  section: one(masterSections, {
    fields: [cerRequests.sectionId],
    references: [masterSections.id],
  }),
  capexBudget: one(cerCapexBudgets, {
    fields: [cerRequests.capexBudgetId],
    references: [cerCapexBudgets.id],
  }),
  items: many(cerItems),
  attachments: many(cerAttachments),
  basts: many(cerBasts),
  budgetTransactions: many(cerCapexBudgetTransactions),
}))

export const cerItemsRelations = relations(cerItems, ({ one }) => ({
  cerRequest: one(cerRequests, {
    fields: [cerItems.cerRequestId],
    references: [cerRequests.id],
  }),
  asset: one(centralServiceAssets, {
    fields: [cerItems.assetId],
    references: [centralServiceAssets.id],
  }),
}))

export const cerAttachmentsRelations = relations(cerAttachments, ({ one }) => ({
  cerRequest: one(cerRequests, {
    fields: [cerAttachments.cerRequestId],
    references: [cerRequests.id],
  }),
}))

export const cerBastsRelations = relations(cerBasts, ({ one }) => ({
  cerRequest: one(cerRequests, {
    fields: [cerBasts.cerRequestId],
    references: [cerRequests.id],
  }),
  gaEmployee: one(employees, {
    fields: [cerBasts.gaEmployeeId],
    references: [employees.id],
  }),
  userEmployee: one(employees, {
    fields: [cerBasts.userEmployeeId],
    references: [employees.id],
  }),
}))

// Types
export type CerCapexBudget = typeof cerCapexBudgets.$inferSelect
export type NewCerCapexBudget = typeof cerCapexBudgets.$inferInsert
export type CerCapexBudgetTransaction = typeof cerCapexBudgetTransactions.$inferSelect
export type NewCerCapexBudgetTransaction = typeof cerCapexBudgetTransactions.$inferInsert
export type CerRequest = typeof cerRequests.$inferSelect
export type NewCerRequest = typeof cerRequests.$inferInsert
export type CerItem = typeof cerItems.$inferSelect
export type NewCerItem = typeof cerItems.$inferInsert
export type CerAttachment = typeof cerAttachments.$inferSelect
export type NewCerAttachment = typeof cerAttachments.$inferInsert
export type CerBast = typeof cerBasts.$inferSelect
export type NewCerBast = typeof cerBasts.$inferInsert
export type CerNotificationConfig = typeof cerNotificationConfigs.$inferSelect
export type NewCerNotificationConfig = typeof cerNotificationConfigs.$inferInsert

// ==========================================
// CER WORKFLOW DEDICATED CONFIGURATION
// ==========================================

export const cerWorkflowConfigs = pgTable('hero_cer_workflow_configs', {
  id: serial('id').primaryKey(),
  itSpvEmployeeId: integer('it_spv_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  budgetValidatorEmployeeIds: jsonb('budget_validator_employee_ids').$type<number[]>().notNull().default([]),
  financeCheckEmployeeId: integer('finance_check_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  directorEmployeeId: integer('director_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  autoSkipEmptyHierarchy: boolean('auto_skip_empty_hierarchy').notNull().default(true),
  isTestingMode: boolean('is_testing_mode').notNull().default(true),
  testingRecipientEmail: text('testing_recipient_email').notNull().default('gilang.suryo@chitraparatama.co.id'),
  testingApproverEmployeeId: integer('testing_approver_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  updatedByEmployeeId: integer('updated_by_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type CerWorkflowConfig = typeof cerWorkflowConfigs.$inferSelect
export type NewCerWorkflowConfig = typeof cerWorkflowConfigs.$inferInsert
