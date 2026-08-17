import { pgTable, serial, text, timestamp, varchar, integer, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

/**
 * 1. Hero Genius Chat Sessions
 */
export const heroGeniusSessions = pgTable("hero_genius_sessions", {
  id: varchar("id", { length: 120 }).primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull().default("Percakapan Baru"),
  summary: text("summary"),
  messageCount: integer("message_count").notNull().default(0),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

/**
 * 2. Hero Genius Chat Messages
 */
export const heroGeniusMessages = pgTable("hero_genius_messages", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 120 }).references(() => heroGeniusSessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  sources: jsonb("sources").$type<any[]>().default([]),
  latencyMs: integer("latency_ms"),
  feedbackRating: varchar("feedback_rating", { length: 20 }), // 'up' | 'down'
  feedbackText: text("feedback_text"),
  feedbackCorrection: text("feedback_correction"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * 3. Hero Genius Feedback & Corrections (Self-Growth Dataset)
 */
export const heroGeniusFeedback = pgTable("hero_genius_feedback", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 120 }),
  messageId: varchar("message_id", { length: 120 }),
  query: text("query").notNull(),
  answer: text("answer").notNull(),
  rating: varchar("rating", { length: 20 }).notNull(), // 'up' | 'down' | 'positive' | 'negative'
  feedbackText: text("feedback_text"),
  correction: text("correction"),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  status: varchar("status", { length: 30 }).notNull().default("pending"), // 'pending' | 'applied' | 'dismissed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * 4. Hero Genius Learned Facts & Rules (Instant Smart Memory)
 */
export const heroGeniusLearnedFacts = pgTable("hero_genius_learned_facts", {
  id: serial("id").primaryKey(),
  fact: text("fact").notNull(),
  category: varchar("category", { length: 100 }).notNull().default("General"), // 'SOP' | 'Ban & Teknis' | 'HSE' | 'Operasional' | 'General'
  source: varchar("source", { length: 255 }).default("Self-Growth Input"),
  tags: jsonb("tags").$type<string[]>().default([]),
  confidenceScore: real("confidence_score").default(1.0),
  isActive: boolean("is_active").notNull().default(true),
  learnedBy: text("learned_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const heroGeniusSessionsRelations = relations(heroGeniusSessions, ({ one, many }) => ({
  user: one(user, {
    fields: [heroGeniusSessions.userId],
    references: [user.id],
  }),
  messages: many(heroGeniusMessages),
}));

export const heroGeniusMessagesRelations = relations(heroGeniusMessages, ({ one }) => ({
  session: one(heroGeniusSessions, {
    fields: [heroGeniusMessages.sessionId],
    references: [heroGeniusSessions.id],
  }),
}));

export const heroGeniusFeedbackRelations = relations(heroGeniusFeedback, ({ one }) => ({
  user: one(user, {
    fields: [heroGeniusFeedback.userId],
    references: [user.id],
  }),
}));

export const heroGeniusLearnedFactsRelations = relations(heroGeniusLearnedFacts, ({ one }) => ({
  user: one(user, {
    fields: [heroGeniusLearnedFacts.learnedBy],
    references: [user.id],
  }),
}));
