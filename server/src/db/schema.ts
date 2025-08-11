import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const userRoleEnum = pgEnum('user_role', ['admin', 'affiliate']);
export const affiliateStatusEnum = pgEnum('affiliate_status', ['pending', 'approved', 'rejected', 'suspended']);
export const programCategoryEnum = pgEnum('program_category', ['online', 'offline_pare', 'group', 'branch']);
export const programLocationEnum = pgEnum('program_location', ['online', 'pare', 'malang', 'sidoarjo', 'nganjuk']);
export const registrationStatusEnum = pgEnum('registration_status', ['pending', 'confirmed', 'cancelled']);
export const payoutStatusEnum = pgEnum('payout_status', ['pending', 'processing', 'completed', 'failed']);
export const payoutMethodEnum = pgEnum('payout_method', ['bank_transfer', 'ewallet']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  };
});

// Affiliates table
export const affiliatesTable = pgTable('affiliates', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  referral_code: varchar('referral_code', { length: 50 }).notNull().unique(),
  bank_name: varchar('bank_name', { length: 100 }),
  bank_account_number: varchar('bank_account_number', { length: 50 }),
  bank_account_name: varchar('bank_account_name', { length: 255 }),
  ewallet_type: varchar('ewallet_type', { length: 50 }),
  ewallet_number: varchar('ewallet_number', { length: 50 }),
  commission_rate: numeric('commission_rate', { precision: 5, scale: 4 }).notNull(), // e.g., 0.0500 for 5%
  status: affiliateStatusEnum('status').notNull().default('pending'),
  approved_by: integer('approved_by').references(() => usersTable.id),
  approved_at: timestamp('approved_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    referralCodeIdx: uniqueIndex('affiliates_referral_code_idx').on(table.referral_code),
    userIdIdx: uniqueIndex('affiliates_user_id_idx').on(table.user_id),
    statusIdx: index('affiliates_status_idx').on(table.status),
  };
});

// Programs table
export const programsTable = pgTable('programs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: programCategoryEnum('category').notNull(),
  location: programLocationEnum('location').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  duration_weeks: integer('duration_weeks'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    categoryIdx: index('programs_category_idx').on(table.category),
    locationIdx: index('programs_location_idx').on(table.location),
    activeIdx: index('programs_active_idx').on(table.is_active),
  };
});

// Student registrations table
export const studentRegistrationsTable = pgTable('student_registrations', {
  id: serial('id').primaryKey(),
  affiliate_id: integer('affiliate_id').notNull().references(() => affiliatesTable.id),
  program_id: integer('program_id').notNull().references(() => programsTable.id),
  student_name: varchar('student_name', { length: 255 }).notNull(),
  student_email: varchar('student_email', { length: 255 }).notNull(),
  student_phone: varchar('student_phone', { length: 20 }).notNull(),
  student_address: text('student_address'),
  referral_code: varchar('referral_code', { length: 50 }).notNull(),
  status: registrationStatusEnum('status').notNull().default('pending'),
  registration_fee: numeric('registration_fee', { precision: 12, scale: 2 }).notNull(),
  commission_amount: numeric('commission_amount', { precision: 12, scale: 2 }).notNull(),
  confirmed_by: integer('confirmed_by').references(() => usersTable.id),
  confirmed_at: timestamp('confirmed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    affiliateIdx: index('student_registrations_affiliate_idx').on(table.affiliate_id),
    programIdx: index('student_registrations_program_idx').on(table.program_id),
    statusIdx: index('student_registrations_status_idx').on(table.status),
    referralCodeIdx: index('student_registrations_referral_code_idx').on(table.referral_code),
    createdAtIdx: index('student_registrations_created_at_idx').on(table.created_at),
  };
});

// Commission payouts table
export const commissionPayoutsTable = pgTable('commission_payouts', {
  id: serial('id').primaryKey(),
  affiliate_id: integer('affiliate_id').notNull().references(() => affiliatesTable.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  method: payoutMethodEnum('method').notNull(),
  bank_details: text('bank_details'), // JSON string for bank transfer details
  ewallet_details: text('ewallet_details'), // JSON string for e-wallet details
  status: payoutStatusEnum('status').notNull().default('pending'),
  processed_by: integer('processed_by').references(() => usersTable.id),
  processed_at: timestamp('processed_at'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    affiliateIdx: index('commission_payouts_affiliate_idx').on(table.affiliate_id),
    statusIdx: index('commission_payouts_status_idx').on(table.status),
    createdAtIdx: index('commission_payouts_created_at_idx').on(table.created_at),
  };
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  affiliate: one(affiliatesTable, {
    fields: [usersTable.id],
    references: [affiliatesTable.user_id],
  }),
  approvedAffiliates: many(affiliatesTable, {
    relationName: 'approvedBy',
  }),
  confirmedRegistrations: many(studentRegistrationsTable, {
    relationName: 'confirmedBy',
  }),
  processedPayouts: many(commissionPayoutsTable, {
    relationName: 'processedBy',
  }),
}));

export const affiliatesRelations = relations(affiliatesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [affiliatesTable.user_id],
    references: [usersTable.id],
  }),
  approvedBy: one(usersTable, {
    fields: [affiliatesTable.approved_by],
    references: [usersTable.id],
    relationName: 'approvedBy',
  }),
  registrations: many(studentRegistrationsTable),
  payouts: many(commissionPayoutsTable),
}));

export const programsRelations = relations(programsTable, ({ many }) => ({
  registrations: many(studentRegistrationsTable),
}));

export const studentRegistrationsRelations = relations(studentRegistrationsTable, ({ one }) => ({
  affiliate: one(affiliatesTable, {
    fields: [studentRegistrationsTable.affiliate_id],
    references: [affiliatesTable.id],
  }),
  program: one(programsTable, {
    fields: [studentRegistrationsTable.program_id],
    references: [programsTable.id],
  }),
  confirmedBy: one(usersTable, {
    fields: [studentRegistrationsTable.confirmed_by],
    references: [usersTable.id],
    relationName: 'confirmedBy',
  }),
}));

export const commissionPayoutsRelations = relations(commissionPayoutsTable, ({ one }) => ({
  affiliate: one(affiliatesTable, {
    fields: [commissionPayoutsTable.affiliate_id],
    references: [affiliatesTable.id],
  }),
  processedBy: one(usersTable, {
    fields: [commissionPayoutsTable.processed_by],
    references: [usersTable.id],
    relationName: 'processedBy',
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Affiliate = typeof affiliatesTable.$inferSelect;
export type NewAffiliate = typeof affiliatesTable.$inferInsert;

export type Program = typeof programsTable.$inferSelect;
export type NewProgram = typeof programsTable.$inferInsert;

export type StudentRegistration = typeof studentRegistrationsTable.$inferSelect;
export type NewStudentRegistration = typeof studentRegistrationsTable.$inferInsert;

export type CommissionPayout = typeof commissionPayoutsTable.$inferSelect;
export type NewCommissionPayout = typeof commissionPayoutsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  affiliates: affiliatesTable,
  programs: programsTable,
  studentRegistrations: studentRegistrationsTable,
  commissionPayouts: commissionPayoutsTable,
};