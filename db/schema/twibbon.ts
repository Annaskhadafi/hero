import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const twibbonTemplates = pgTable("twibbon_templates", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  captionText: text("caption_text"),
  category: text("category").notNull().default("Campaign"),
  squareUrl: text("square_url"),
  portraitUrl: text("portrait_url"),
  storyUrl: text("story_url"),
  status: text("status").notNull().default("active"),
  usageCount: integer("usage_count").notNull().default(0),
  createdByUserId: text("created_by_user_id"),
  createdByEmployeeId: integer("created_by_employee_id"),
  createdByName: text("created_by_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TwibbonTemplateRow = typeof twibbonTemplates.$inferSelect;
export type NewTwibbonTemplateRow = typeof twibbonTemplates.$inferInsert;
