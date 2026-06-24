import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  doublePrecision,
} from 'drizzle-orm/pg-core';
import { employees } from './hero';

export const heroInspections = pgTable('hero_inspections', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteName: varchar('site_name', { length: 255 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  inspectionDate: timestamp('inspection_date').notNull(),
  inspectorId: integer('inspector_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  shift: varchar('shift', { length: 50 }).notNull(),
  unitName: varchar('unit_name', { length: 255 }).notNull(),
  notes: text('notes'),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, completed, report_generated, exported
  
  // AI Generated Sections
  summary: text('summary'),
  findings: text('findings'),
  recommendations: text('recommendations'),
  
  // Scores
  loadingScore: doublePrecision('loading_score'),
  haulRoadScore: doublePrecision('haul_road_score'),
  dumpingScore: doublePrecision('dumping_score'),
  totalScore: doublePrecision('total_score'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const heroInspectionChecklists = pgTable('hero_inspection_checklists', {
  id: uuid('id').defaultRandom().primaryKey(),
  inspectionId: uuid('inspection_id')
    .notNull()
    .references(() => heroInspections.id, { onDelete: 'cascade' }),
  section: varchar('section', { length: 100 }).notNull(), // loading_area, haul_road, dumping_area
  question: text('question').notNull(),
  answer: boolean('answer').notNull(), // true = yes (good), false = no (bad)
  score: integer('score').notNull(), // 1 to 10
  remarks: text('remarks'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const heroInspectionPhotos = pgTable('hero_inspection_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  inspectionId: uuid('inspection_id')
    .notNull()
    .references(() => heroInspections.id, { onDelete: 'cascade' }),
  section: varchar('section', { length: 100 }).notNull(), // loading_area, haul_road, dumping_area
  imageUrl: varchar('image_url', { length: 1000 }).notNull(),
  caption: text('caption'),
  aiCaption: text('ai_caption'),
  sortOrder: integer('sort_order').notNull().default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type HeroInspection = typeof heroInspections.$inferSelect;
export type NewHeroInspection = typeof heroInspections.$inferInsert;
export type HeroInspectionChecklist = typeof heroInspectionChecklists.$inferSelect;
export type NewHeroInspectionChecklist = typeof heroInspectionChecklists.$inferInsert;
export type HeroInspectionPhoto = typeof heroInspectionPhotos.$inferSelect;
export type NewHeroInspectionPhoto = typeof heroInspectionPhotos.$inferInsert;
