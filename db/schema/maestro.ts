import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { customers } from './customers'
import { employees, sites } from './hero'

export const maestroCustomerUsers = pgTable(
  'maestro_customer_users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash'),
    image: text('image'),
    emailVerified: boolean('email_verified').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('maestro_customer_users_email_uq').on(table.email),
  }),
)

export const maestroCustomerSessions = pgTable(
  'maestro_customer_sessions',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => maestroCustomerUsers.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
  },
  (table) => ({
    tokenUnique: uniqueIndex('maestro_customer_sessions_token_uq').on(table.token),
  }),
)

export const maestroCustomerAccounts = pgTable('maestro_customer_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => maestroCustomerUsers.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull(),
  accountId: text('account_id').notNull(),
  passwordHash: text('password_hash'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const maestroCustomerVerifications = pgTable('maestro_customer_verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const maestroCustomerMemberships = pgTable(
  'maestro_customer_memberships',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => maestroCustomerUsers.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userCustomerUnique: uniqueIndex('maestro_customer_memberships_user_customer_uq').on(
      table.userId,
      table.customerId,
    ),
  }),
)

export const maestroCustomerSites = pgTable(
  'maestro_customer_sites',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    customerSiteUnique: uniqueIndex('maestro_customer_sites_customer_site_uq').on(
      table.customerId,
      table.siteId,
    ),
  }),
)

export const maestroCustomerUserSites = pgTable(
  'maestro_customer_user_sites',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => maestroCustomerUsers.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userCustomerSiteUnique: uniqueIndex('maestro_customer_user_sites_user_customer_site_uq').on(
      table.userId,
      table.customerId,
      table.siteId,
    ),
  }),
)

export const maestroCustomerLocations = pgTable(
  'maestro_customer_locations',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    locationId: integer('location_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    customerLocationUnique: uniqueIndex('maestro_customer_locations_customer_location_uq').on(
      table.customerId,
      table.locationId,
    ),
  }),
)

export const maestroCustomerUserLocations = pgTable(
  'maestro_customer_user_locations',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => maestroCustomerUsers.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    locationId: integer('location_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userCustomerLocationUnique: uniqueIndex('maestro_customer_user_locations_user_customer_location_uq').on(
      table.userId,
      table.customerId,
      table.locationId,
    ),
  }),
)

export const maestroRoles = pgTable('maestro_roles', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  isSystem: boolean('is_system').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const maestroPermissions = pgTable('maestro_permissions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  module: text('module').notNull(),
  action: text('action').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const maestroRolePermissions = pgTable(
  'maestro_role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => maestroRoles.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => maestroPermissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    rolePermissionUnique: uniqueIndex('maestro_role_permissions_role_permission_uq').on(
      table.roleId,
      table.permissionId,
    ),
  }),
)

export const maestroUserRoles = pgTable(
  'maestro_user_roles',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => maestroCustomerUsers.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => maestroRoles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userRoleUnique: uniqueIndex('maestro_user_roles_user_role_uq').on(table.userId, table.roleId),
  }),
)

export const maestroPageRegistry = pgTable('maestro_page_registry', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  path: text('path').notNull(),
  label: text('label').notNull(),
  module: text('module').notNull(),
  permissionCode: text('permission_code').notNull(),
  menuGroup: text('menu_group').notNull().default('MAESTRO'),
  sortOrder: integer('sort_order').notNull().default(0),
  requiresSiteScope: boolean('requires_site_scope').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const maestroVisibilityPolicies = pgTable('maestro_visibility_policies', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id')
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: 'cascade' }),
  canViewEmployeeNames: boolean('can_view_employee_names').notNull().default(false),
  canViewAttendanceDetail: boolean('can_view_attendance_detail').notNull().default(false),
  canViewActivityPhotos: boolean('can_view_activity_photos').notNull().default(false),
  canViewSafetyDetails: boolean('can_view_safety_details').notNull().default(true),
  canViewFinancialAmounts: boolean('can_view_financial_amounts').notNull().default(false),
  canDownloadDocuments: boolean('can_download_documents').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const maestroAuditLogs = pgTable('maestro_audit_logs', {
  id: serial('id').primaryKey(),
  actorType: text('actor_type').notNull().default('internal'),
  actorUserId: text('actor_user_id').references(() => maestroCustomerUsers.id, { onDelete: 'set null' }),
  actorEmployeeId: integer('actor_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
