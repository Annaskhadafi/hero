import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core'
import { dailyActivitySessionItems, dailyActivitySessions, employees } from './hero'

export const dailyActivitySupervisorNotes = pgTable(
  'hero_daily_activity_supervisor_notes',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id').notNull().references(() => dailyActivitySessions.id, { onDelete: 'cascade' }),
    itemId: integer('item_id').notNull().references(() => dailyActivitySessionItems.id, { onDelete: 'cascade' }),
    authorEmployeeId: integer('author_employee_id').notNull().references(() => employees.id, { onDelete: 'restrict' }),
    note: varchar('note', { length: 1000 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    noteNonblank: check('hero_da_supervisor_notes_note_nonblank', sql`length(btrim(${table.note})) > 0`),
    itemCreatedIdx: index('hero_da_supervisor_notes_item_created_idx').on(table.itemId, table.createdAt),
    sessionIdx: index('hero_da_supervisor_notes_session_idx').on(table.sessionId),
  })
)
