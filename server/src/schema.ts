import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'affiliate']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Affiliate status enum
export const affiliateStatusSchema = z.enum(['pending', 'approved', 'rejected', 'suspended']);
export type AffiliateStatus = z.infer<typeof affiliateStatusSchema>;

// Affiliate schema
export const affiliateSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  referral_code: z.string(),
  bank_name: z.string().nullable(),
  bank_account_number: z.string().nullable(),
  bank_account_name: z.string().nullable(),
  ewallet_type: z.string().nullable(),
  ewallet_number: z.string().nullable(),
  commission_rate: z.number(),
  status: affiliateStatusSchema,
  approved_by: z.number().nullable(),
  approved_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Affiliate = z.infer<typeof affiliateSchema>;

// Program category enum
export const programCategorySchema = z.enum(['online', 'offline_pare', 'group', 'branch']);
export type ProgramCategory = z.infer<typeof programCategorySchema>;

// Program location enum
export const programLocationSchema = z.enum(['online', 'pare', 'malang', 'sidoarjo', 'nganjuk']);
export type ProgramLocation = z.infer<typeof programLocationSchema>;

// Program schema
export const programSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  category: programCategorySchema,
  location: programLocationSchema,
  price: z.number(),
  duration_weeks: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Program = z.infer<typeof programSchema>;

// Student registration status enum
export const registrationStatusSchema = z.enum(['pending', 'confirmed', 'cancelled']);
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;

// Student registration schema
export const studentRegistrationSchema = z.object({
  id: z.number(),
  affiliate_id: z.number(),
  program_id: z.number(),
  student_name: z.string(),
  student_email: z.string().email(),
  student_phone: z.string(),
  student_address: z.string().nullable(),
  referral_code: z.string(),
  status: registrationStatusSchema,
  registration_fee: z.number(),
  commission_amount: z.number(),
  confirmed_by: z.number().nullable(),
  confirmed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StudentRegistration = z.infer<typeof studentRegistrationSchema>;

// Commission payout status enum
export const payoutStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
export type PayoutStatus = z.infer<typeof payoutStatusSchema>;

// Commission payout method enum
export const payoutMethodSchema = z.enum(['bank_transfer', 'ewallet']);
export type PayoutMethod = z.infer<typeof payoutMethodSchema>;

// Commission payout schema
export const commissionPayoutSchema = z.object({
  id: z.number(),
  affiliate_id: z.number(),
  amount: z.number(),
  method: payoutMethodSchema,
  bank_details: z.string().nullable(),
  ewallet_details: z.string().nullable(),
  status: payoutStatusSchema,
  processed_by: z.number().nullable(),
  processed_at: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CommissionPayout = z.infer<typeof commissionPayoutSchema>;

// Input schemas for creating entities

// Create user input schema
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Create affiliate input schema
export const createAffiliateInputSchema = z.object({
  user_id: z.number(),
  bank_name: z.string().nullable(),
  bank_account_number: z.string().nullable(),
  bank_account_name: z.string().nullable(),
  ewallet_type: z.string().nullable(),
  ewallet_number: z.string().nullable(),
  commission_rate: z.number().positive()
});

export type CreateAffiliateInput = z.infer<typeof createAffiliateInputSchema>;

// Create program input schema
export const createProgramInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  category: programCategorySchema,
  location: programLocationSchema,
  price: z.number().positive(),
  duration_weeks: z.number().nullable(),
  is_active: z.boolean().default(true)
});

export type CreateProgramInput = z.infer<typeof createProgramInputSchema>;

// Create student registration input schema
export const createStudentRegistrationInputSchema = z.object({
  affiliate_id: z.number(),
  program_id: z.number(),
  student_name: z.string(),
  student_email: z.string().email(),
  student_phone: z.string(),
  student_address: z.string().nullable(),
  referral_code: z.string()
});

export type CreateStudentRegistrationInput = z.infer<typeof createStudentRegistrationInputSchema>;

// Create commission payout input schema
export const createCommissionPayoutInputSchema = z.object({
  affiliate_id: z.number(),
  amount: z.number().min(100000), // Minimum IDR 100,000
  method: payoutMethodSchema,
  bank_details: z.string().nullable(),
  ewallet_details: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateCommissionPayoutInput = z.infer<typeof createCommissionPayoutInputSchema>;

// Update schemas

// Update affiliate status input schema
export const updateAffiliateStatusInputSchema = z.object({
  affiliate_id: z.number(),
  status: affiliateStatusSchema,
  approved_by: z.number().optional()
});

export type UpdateAffiliateStatusInput = z.infer<typeof updateAffiliateStatusInputSchema>;

// Update registration status input schema
export const updateRegistrationStatusInputSchema = z.object({
  registration_id: z.number(),
  status: registrationStatusSchema,
  confirmed_by: z.number().optional()
});

export type UpdateRegistrationStatusInput = z.infer<typeof updateRegistrationStatusInputSchema>;

// Update payout status input schema
export const updatePayoutStatusInputSchema = z.object({
  payout_id: z.number(),
  status: payoutStatusSchema,
  processed_by: z.number().optional(),
  notes: z.string().nullable().optional()
});

export type UpdatePayoutStatusInput = z.infer<typeof updatePayoutStatusInputSchema>;

// Query schemas

// Get affiliate statistics input schema
export const getAffiliateStatsInputSchema = z.object({
  affiliate_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type GetAffiliateStatsInput = z.infer<typeof getAffiliateStatsInputSchema>;

// Affiliate statistics response schema
export const affiliateStatsSchema = z.object({
  total_registrations: z.number(),
  confirmed_registrations: z.number(),
  pending_registrations: z.number(),
  total_commission_earned: z.number(),
  total_commission_paid: z.number(),
  pending_commission: z.number(),
  available_for_payout: z.number()
});

export type AffiliateStats = z.infer<typeof affiliateStatsSchema>;