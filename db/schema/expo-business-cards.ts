import { boolean, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const expoBusinessCards = pgTable('expo_business_cards', {
  id: serial('id').primaryKey(),
  expoName: text('expo_name').notNull().default(''),
  contactName: text('contact_name').notNull().default(''),
  companyName: text('company_name').notNull().default(''),
  jobTitle: text('job_title').notNull().default(''),
  phoneNumber: text('phone_number').notNull().default(''),
  email: text('email').notNull().default(''),
  address: text('address').notNull().default(''),
  website: text('website').notNull().default(''),
  cardImageUrl: text('card_image_url').notNull().default(''),
  notes: text('notes').notNull().default(''),
  category: text('category').notNull().default('lead'), // 'lead' | 'client' | 'vendor' | 'partner' | 'other'
  rating: text('rating').notNull().default('warm'), // 'hot' | 'warm' | 'cold'
  createdById: text('created_by_id'),
  createdByName: text('created_by_name').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type ExpoBusinessCard = typeof expoBusinessCards.$inferSelect;
export type NewExpoBusinessCard = typeof expoBusinessCards.$inferInsert;
