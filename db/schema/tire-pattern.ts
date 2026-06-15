import { boolean, integer, jsonb, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'

// ─── Preset ukuran ban (master data) ───────────────────────────────────────
export const tireSizePresets = pgTable('tire_size_presets', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull(), // e.g. "1000-20"
  label: varchar('label', { length: 100 }).notNull(), // e.g. "1000-20 (10.00-20)"
  sectionWidth: integer('section_width').notNull(), // mm, e.g. 254 (10 inch)
  aspectRatio: integer('aspect_ratio').notNull().default(100), // %, e.g. 100 for bias
  rimDiameter: integer('rim_diameter').notNull(), // inch, e.g. 20
  rimDiameterMm: integer('rim_diameter_mm').notNull(), // mm, e.g. 508
  circumferenceMm: integer('circumference_mm').notNull(), // calculated
  treadWidthMm: integer('tread_width_mm').notNull(), // estimated tread contact
  category: varchar('category', { length: 50 }).default('truck'), // truck, otr, passenger
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Pattern library / database ────────────────────────────────────────────
export const tirePatterns = pgTable('tire_patterns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(), // User-defined name
  tireSize: varchar('tire_size', { length: 50 }).notNull(), // e.g. "1000-20"

  // Pattern configuration
  patternType: varchar('pattern_type', { length: 100 }).notNull(), // zig-zag, lug, rib, block, mixed, custom
  grooveAngle: integer('groove_angle').default(45), // degrees
  grooveWidthMm: integer('groove_width_mm').default(8), // mm
  grooveDepthMm: integer('groove_depth_mm').default(12), // mm
  patternDensity: integer('pattern_density').default(50), // 0-100 %
  repeatUnitMm: integer('repeat_unit_mm'), // one full repeat in mm

  // Generated data
  patternSvg: text('pattern_svg'), // SVG path data for the seamless tile
  patternConfig: jsonb('pattern_config'), // full config JSON for regeneration

  // Reference image (from upload)
  referenceImageUrl: varchar('reference_image_url', { length: 1000 }),

  // Thumbnail
  thumbnailUrl: varchar('thumbnail_url', { length: 1000 }),

  // Analysis result from vision model (no "AI" word in data keys)
  analysisResult: jsonb('analysis_result'), // raw structured result from model
  analysisModel: varchar('analysis_model', { length: 100 }), // e.g. "anthropic/claude-3.5-sonnet"
  analysisSource: varchar('analysis_source', { length: 50 }), // "upload" | "manual" | "preset"

  // Tire dimensions (from preset or manual input)
  tireSectionWidthMm: integer('tire_section_width_mm'),
  tireAspectRatio: integer('tire_aspect_ratio'),
  tireRimDiameterMm: integer('tire_rim_diameter_mm'),
  tireCircumferenceMm: integer('tire_circumference_mm'),
  tireTreadWidthMm: integer('tire_tread_width_mm'),

  // Meta
  status: varchar('status', { length: 30 }).default('draft').notNull(), // draft | active | archived
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Pattern analysis history (setiap analisa disimpan) ────────────────────
export const tirePatternAnalyses = pgTable('tire_pattern_analyses', {
  id: serial('id').primaryKey(),
  patternId: integer('pattern_id'), // FK ke tirePatterns (opsional)
  imageUrl: varchar('image_url', { length: 1000 }),
  imageBase64Hash: varchar('image_base64_hash', { length: 100 }), // untuk dedup
  modelUsed: varchar('model_used', { length: 100 }).notNull(),
  prompt: text('prompt'),
  rawResponse: text('raw_response'),
  parsedResult: jsonb('parsed_result'), // structured extraction
  confidence: integer('confidence'), // 0-100
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Types ──────────────────────────────────────────────────────────────────
export type TireSizePreset = typeof tireSizePresets.$inferSelect
export type NewTireSizePreset = typeof tireSizePresets.$inferInsert
export type TirePattern = typeof tirePatterns.$inferSelect
export type NewTirePattern = typeof tirePatterns.$inferInsert
export type TirePatternAnalysis = typeof tirePatternAnalyses.$inferSelect
export type NewTirePatternAnalysis = typeof tirePatternAnalyses.$inferInsert
