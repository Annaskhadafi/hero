import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { employees, sites } from "./hero";

export const heroHseOsmMasterFocusItems = pgTable("hero_hse_osm_master_focus_items", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").default(""),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const heroHseOsmMasterClassifications = pgTable("hero_hse_osm_master_classifications", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").default(""),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const heroHseOsmSessions = pgTable("hero_hse_osm_sessions", {
  id: serial("id").primaryKey(),
  sessionNumber: text("session_number").notNull().unique(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "set null" }),
  inspectionDate: text("inspection_date").notNull(), // YYYY-MM-DD
  inspectionTime: text("inspection_time").notNull(), // HH:mm
  locationArea: text("location_area").notNull(),
  locationDetail: text("location_detail").default(""),
  latitude: text("latitude").default(""),
  longitude: text("longitude").default(""),
  gpsAccuracy: text("gps_accuracy").default(""),
  focusItemId: integer("focus_item_id").references(() => heroHseOsmMasterFocusItems.id, { onDelete: "set null" }),
  focusItemName: text("focus_item_name").notNull(),
  leadEmployeeId: integer("lead_employee_id").references(() => employees.id, { onDelete: "set null" }),
  leadEmployeeName: text("lead_employee_name").notNull(),
  leadBadgeNumber: text("lead_badge_number").notNull(),
  leadDepartment: text("lead_department").notNull(),
  leadCompany: text("lead_company").notNull().default("PT Chitra Paratama"),
  leadRole: text("lead_role").default(""),
  notes: text("notes").default(""),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, COMPLETED, ARCHIVED
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const heroHseOsmTeamMembers = pgTable("hero_hse_osm_team_members", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => heroHseOsmSessions.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "set null" }),
  badgeNumber: text("badge_number").notNull(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  company: text("company").notNull().default("PT Chitra Paratama"),
  isTeamLeader: boolean("is_team_leader").default(false).notNull(),
  isExternal: boolean("is_external").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const heroHseOsmFindings = pgTable("hero_hse_osm_findings", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => heroHseOsmSessions.id, { onDelete: "cascade" }),
  findingNumber: text("finding_number").notNull().unique(),
  findingDate: text("finding_date").notNull(), // YYYY-MM-DD
  findingTime: text("finding_time").notNull(), // HH:mm
  classificationId: integer("classification_id").references(() => heroHseOsmMasterClassifications.id, { onDelete: "set null" }),
  classificationName: text("classification_name").notNull(),
  description: text("description").notNull(),
  photoUrls: jsonb("photo_urls").$type<string[]>().default([]).notNull(),
  riskLevel: text("risk_level").notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH, CRITICAL
  status: text("status").notNull().default("OPEN"), // OPEN, PROCESSED, CLOSED, REJECTED
  actionRequired: text("action_required").default(""),
  actionTaken: text("action_taken").default(""),
  actionPhotoUrls: jsonb("action_photo_urls").$type<string[]>().default([]).notNull(),
  actionSubmittedAt: timestamp("action_submitted_at"),
  actionSubmittedBy: text("action_submitted_by"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"),
  rejectionReason: text("rejection_reason").default(""),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Relations
export const heroHseOsmSessionsRelations = relations(heroHseOsmSessions, ({ one, many }) => ({
  site: one(sites, {
    fields: [heroHseOsmSessions.siteId],
    references: [sites.id],
  }),
  focusItem: one(heroHseOsmMasterFocusItems, {
    fields: [heroHseOsmSessions.focusItemId],
    references: [heroHseOsmMasterFocusItems.id],
  }),
  leadEmployee: one(employees, {
    fields: [heroHseOsmSessions.leadEmployeeId],
    references: [employees.id],
  }),
  teamMembers: many(heroHseOsmTeamMembers),
  findings: many(heroHseOsmFindings),
}));

export const heroHseOsmTeamMembersRelations = relations(heroHseOsmTeamMembers, ({ one }) => ({
  session: one(heroHseOsmSessions, {
    fields: [heroHseOsmTeamMembers.sessionId],
    references: [heroHseOsmSessions.id],
  }),
  employee: one(employees, {
    fields: [heroHseOsmTeamMembers.employeeId],
    references: [employees.id],
  }),
}));

export const heroHseOsmFindingsRelations = relations(heroHseOsmFindings, ({ one }) => ({
  session: one(heroHseOsmSessions, {
    fields: [heroHseOsmFindings.sessionId],
    references: [heroHseOsmSessions.id],
  }),
  classification: one(heroHseOsmMasterClassifications, {
    fields: [heroHseOsmFindings.classificationId],
    references: [heroHseOsmMasterClassifications.id],
  }),
}));

export type HseOsmMasterFocusItem = typeof heroHseOsmMasterFocusItems.$inferSelect;
export type NewHseOsmMasterFocusItem = typeof heroHseOsmMasterFocusItems.$inferInsert;
export type HseOsmMasterClassification = typeof heroHseOsmMasterClassifications.$inferSelect;
export type NewHseOsmMasterClassification = typeof heroHseOsmMasterClassifications.$inferInsert;
export type HseOsmSession = typeof heroHseOsmSessions.$inferSelect;
export type NewHseOsmSession = typeof heroHseOsmSessions.$inferInsert;
export type HseOsmTeamMember = typeof heroHseOsmTeamMembers.$inferSelect;
export type NewHseOsmTeamMember = typeof heroHseOsmTeamMembers.$inferInsert;
export type HseOsmFinding = typeof heroHseOsmFindings.$inferSelect;
export type NewHseOsmFinding = typeof heroHseOsmFindings.$inferInsert;
