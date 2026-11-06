import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sites, employees } from './hero'

export const roadHazardSessions = pgTable('hero_road_hazard_sessions', {
  id: serial('id').primaryKey(),
  sessionCode: text('session_code').notNull().unique(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  siteName: text('site_name').notNull().default(''),
  customerName: text('customer_name').notNull().default(''),
  inspectorId: integer('inspector_id').references(() => employees.id, { onDelete: 'set null' }),
  inspectorName: text('inspector_name').notNull().default(''),
  roadSection: text('road_section').notNull().default(''),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  totalDistanceMeters: integer('total_distance_meters').notNull().default(0),
  totalHazards: integer('total_hazards').notNull().default(0),
  potholesCount: integer('potholes_count').notNull().default(0),
  corrugationCount: integer('corrugation_count').notNull().default(0),
  rutsCount: integer('ruts_count').notNull().default(0),
  severityLevel: text('severity_level').notNull().default('LOW'), // LOW, MEDIUM, HIGH, CRITICAL
  status: text('status').notNull().default('COMPLETED'), // RECORDING, COMPLETED, DRAFT
  summaryNotes: text('summary_notes').notNull().default(''),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const roadHazardEvents = pgTable('hero_road_hazard_events', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => roadHazardSessions.id, { onDelete: 'cascade' }),
  hazardType: text('hazard_type').notNull(), // Potholes, Corragation, Ruts, Other
  confidence: decimal('confidence', { precision: 5, scale: 3 }).notNull().default('0.000'),
  latitude: decimal('latitude', { precision: 11, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  speedKmh: decimal('speed_kmh', { precision: 6, scale: 2 }).default('0.00'),
  photoUrl: text('photo_url').notNull().default(''),
  annotatedPhotoUrl: text('annotated_photo_url'),
  detectionBoxes: jsonb('detection_boxes'),
  qualityInfo: jsonb('quality_info'),
  notes: text('notes').notNull().default(''),
  isManualSnap: boolean('is_manual_snap').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
