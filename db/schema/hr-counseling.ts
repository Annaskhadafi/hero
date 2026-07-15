import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { employees } from "./hero";

export const hrCounselingSessions = pgTable("hero_hr_counseling_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  hrId: integer("hr_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  ticketNumber: text("ticket_number"),
  status: text("status").notNull().default("open"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const hrCounselingMessages = pgTable("hero_hr_counseling_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => hrCounselingSessions.id, { onDelete: "cascade" }),
  senderId: integer("sender_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  message: text("message").notNull().default(""),
  attachmentUrl: text("attachment_url"),
  attachmentFileName: text("attachment_file_name"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
