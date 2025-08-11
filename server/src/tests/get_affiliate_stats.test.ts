import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable, programsTable, studentRegistrationsTable, commissionPayoutsTable } from '../db/schema';
import { type GetAffiliateStatsInput } from '../schema';
import { getAffiliateStats } from '../handlers/get_affiliate_stats';

// Helper function to create test data
async function createTestData() {
  // Create admin user
  const [adminUser] = await db.insert(usersTable).values({
    email: 'admin@test.com',
    password_hash: 'hashedpassword',
    full_name: 'Admin User',
    phone: '081234567890',
    role: 'admin'
  }).returning().execute();

  // Create affiliate user
  const [affiliateUser] = await db.insert(usersTable).values({
    email: 'affiliate@test.com',
    password_hash: 'hashedpassword',
    full_name: 'Affiliate User',
    phone: '081234567891',
    role: 'affiliate'
  }).returning().execute();

  // Create affiliate
  const [affiliate] = await db.insert(affiliatesTable).values({
    user_id: affiliateUser.id,
    referral_code: 'TEST001',
    bank_name: 'Bank Test',
    bank_account_number: '1234567890',
    bank_account_name: 'Test Account',
    commission_rate: '0.1000', // 10%
    status: 'approved',
    approved_by: adminUser.id,
    approved_at: new Date()
  }).returning().execute();

  // Create program
  const [program] = await db.insert(programsTable).values({
    name: 'Test Program',
    description: 'A test program',
    category: 'online',
    location: 'online',
    price: '1000000.00', // IDR 1,000,000
    duration_weeks: 12,
    is_active: true
  }).returning().execute();

  return { adminUser, affiliateUser, affiliate, program };
}

// Test input
const baseTestInput: GetAffiliateStatsInput = {
  affiliate_id: 1
};

describe('getAffiliateStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for new affiliate', async () => {
    const { affiliate } = await createTestData();
    
    const input = { affiliate_id: affiliate.id };
    const result = await getAffiliateStats(input);

    expect(result.total_registrations).toEqual(0);
    expect(result.confirmed_registrations).toEqual(0);
    expect(result.pending_registrations).toEqual(0);
    expect(result.total_commission_earned).toEqual(0);
    expect(result.total_commission_paid).toEqual(0);
    expect(result.pending_commission).toEqual(0);
    expect(result.available_for_payout).toEqual(0);
  });

  it('should calculate registration statistics correctly', async () => {
    const { affiliate, program } = await createTestData();

    // Create test registrations
    await db.insert(studentRegistrationsTable).values([
      {
        affiliate_id: affiliate.id,
        program_id: program.id,
        student_name: 'Student One',
        student_email: 'student1@test.com',
        student_phone: '081234567892',
        student_address: 'Test Address 1',
        referral_code: 'TEST001',
        status: 'confirmed',
        registration_fee: '1000000.00',
        commission_amount: '100000.00' // 10% of 1,000,000
      },
      {
        affiliate_id: affiliate.id,
        program_id: program.id,
        student_name: 'Student Two',
        student_email: 'student2@test.com',
        student_phone: '081234567893',
        student_address: 'Test Address 2',
        referral_code: 'TEST001',
        status: 'pending',
        registration_fee: '1000000.00',
        commission_amount: '100000.00'
      },
      {
        affiliate_id: affiliate.id,
        program_id: program.id,
        student_name: 'Student Three',
        student_email: 'student3@test.com',
        student_phone: '081234567894',
        student_address: 'Test Address 3',
        referral_code: 'TEST001',
        status: 'confirmed',
        registration_fee: '1000000.00',
        commission_amount: '100000.00'
      }
    ]).execute();

    const input = { affiliate_id: affiliate.id };
    const result = await getAffiliateStats(input);

    expect(result.total_registrations).toEqual(3);
    expect(result.confirmed_registrations).toEqual(2);
    expect(result.pending_registrations).toEqual(1);
    expect(result.total_commission_earned).toEqual(200000); // Only confirmed registrations
    expect(result.total_commission_paid).toEqual(0);
    expect(result.pending_commission).toEqual(0);
    expect(result.available_for_payout).toEqual(200000); // Above minimum threshold
  });

  it('should calculate payout statistics correctly', async () => {
    const { affiliate, program } = await createTestData();

    // Create confirmed registration
    await db.insert(studentRegistrationsTable).values({
      affiliate_id: affiliate.id,
      program_id: program.id,
      student_name: 'Student One',
      student_email: 'student1@test.com',
      student_phone: '081234567892',
      student_address: 'Test Address 1',
      referral_code: 'TEST001',
      status: 'confirmed',
      registration_fee: '2000000.00',
      commission_amount: '200000.00' // 10% of 2,000,000
    }).execute();

    // Create payouts
    await db.insert(commissionPayoutsTable).values([
      {
        affiliate_id: affiliate.id,
        amount: '150000.00', // Completed payout
        method: 'bank_transfer',
        bank_details: 'Bank transfer details',
        status: 'completed',
        processed_at: new Date()
      },
      {
        affiliate_id: affiliate.id,
        amount: '25000.00', // Pending payout
        method: 'bank_transfer',
        bank_details: 'Bank transfer details',
        status: 'pending'
      }
    ]).execute();

    const input = { affiliate_id: affiliate.id };
    const result = await getAffiliateStats(input);

    expect(result.total_commission_earned).toEqual(200000);
    expect(result.total_commission_paid).toEqual(150000);
    expect(result.pending_commission).toEqual(25000);
    expect(result.available_for_payout).toEqual(0); // 200000 - 150000 - 25000 = 25000 (below minimum threshold)
  });

  it('should respect minimum payout threshold of IDR 100,000', async () => {
    const { affiliate, program } = await createTestData();

    // Create small confirmed registration
    await db.insert(studentRegistrationsTable).values({
      affiliate_id: affiliate.id,
      program_id: program.id,
      student_name: 'Student One',
      student_email: 'student1@test.com',
      student_phone: '081234567892',
      student_address: 'Test Address 1',
      referral_code: 'TEST001',
      status: 'confirmed',
      registration_fee: '500000.00',
      commission_amount: '50000.00' // Below minimum threshold
    }).execute();

    const input = { affiliate_id: affiliate.id };
    const result = await getAffiliateStats(input);

    expect(result.total_commission_earned).toEqual(50000);
    expect(result.available_for_payout).toEqual(0); // Below minimum threshold
  });

  it('should filter by date range correctly', async () => {
    const { affiliate, program } = await createTestData();

    // Create registrations on different dates
    const oldDate = new Date('2024-01-01');
    const recentDate = new Date('2024-06-01');

    // Insert registration with old date
    await db.insert(studentRegistrationsTable).values({
      affiliate_id: affiliate.id,
      program_id: program.id,
      student_name: 'Old Student',
      student_email: 'old@test.com',
      student_phone: '081234567892',
      student_address: 'Old Address',
      referral_code: 'TEST001',
      status: 'confirmed',
      registration_fee: '1000000.00',
      commission_amount: '100000.00',
      created_at: oldDate
    }).execute();

    // Insert registration with recent date
    await db.insert(studentRegistrationsTable).values({
      affiliate_id: affiliate.id,
      program_id: program.id,
      student_name: 'Recent Student',
      student_email: 'recent@test.com',
      student_phone: '081234567893',
      student_address: 'Recent Address',
      referral_code: 'TEST001',
      status: 'confirmed',
      registration_fee: '1000000.00',
      commission_amount: '100000.00',
      created_at: recentDate
    }).execute();

    // Create old payout
    await db.insert(commissionPayoutsTable).values({
      affiliate_id: affiliate.id,
      amount: '100000.00',
      method: 'bank_transfer',
      status: 'completed',
      created_at: oldDate,
      processed_at: oldDate
    }).execute();

    // Test filtering from recent date
    const inputWithDateFilter = {
      affiliate_id: affiliate.id,
      start_date: new Date('2024-05-01'),
      end_date: new Date('2024-07-01')
    };

    const result = await getAffiliateStats(inputWithDateFilter);

    expect(result.total_registrations).toEqual(1); // Only recent registration
    expect(result.confirmed_registrations).toEqual(1);
    expect(result.total_commission_earned).toEqual(100000);
    expect(result.total_commission_paid).toEqual(0); // Old payout filtered out
    expect(result.available_for_payout).toEqual(100000);
  });

  it('should handle different payout statuses correctly', async () => {
    const { affiliate, program } = await createTestData();

    // Create confirmed registration
    await db.insert(studentRegistrationsTable).values({
      affiliate_id: affiliate.id,
      program_id: program.id,
      student_name: 'Student One',
      student_email: 'student1@test.com',
      student_phone: '081234567892',
      student_address: 'Test Address 1',
      referral_code: 'TEST001',
      status: 'confirmed',
      registration_fee: '3000000.00',
      commission_amount: '300000.00'
    }).execute();

    // Create payouts with different statuses
    await db.insert(commissionPayoutsTable).values([
      {
        affiliate_id: affiliate.id,
        amount: '100000.00',
        method: 'bank_transfer',
        status: 'completed'
      },
      {
        affiliate_id: affiliate.id,
        amount: '50000.00',
        method: 'bank_transfer',
        status: 'processing'
      },
      {
        affiliate_id: affiliate.id,
        amount: '25000.00',
        method: 'bank_transfer',
        status: 'pending'
      },
      {
        affiliate_id: affiliate.id,
        amount: '30000.00',
        method: 'bank_transfer',
        status: 'failed'
      }
    ]).execute();

    const input = { affiliate_id: affiliate.id };
    const result = await getAffiliateStats(input);

    expect(result.total_commission_earned).toEqual(300000);
    expect(result.total_commission_paid).toEqual(100000); // Only completed
    expect(result.pending_commission).toEqual(75000); // pending + processing
    expect(result.available_for_payout).toEqual(125000); // 300000 - 100000 - 75000 = 125000
  });

  it('should handle non-existent affiliate gracefully', async () => {
    await createTestData();

    const input = { affiliate_id: 999 }; // Non-existent affiliate
    const result = await getAffiliateStats(input);

    expect(result.total_registrations).toEqual(0);
    expect(result.confirmed_registrations).toEqual(0);
    expect(result.pending_registrations).toEqual(0);
    expect(result.total_commission_earned).toEqual(0);
    expect(result.total_commission_paid).toEqual(0);
    expect(result.pending_commission).toEqual(0);
    expect(result.available_for_payout).toEqual(0);
  });

  it('should handle numeric conversions correctly', async () => {
    const { affiliate, program } = await createTestData();

    // Create registration with precise decimal amounts
    await db.insert(studentRegistrationsTable).values({
      affiliate_id: affiliate.id,
      program_id: program.id,
      student_name: 'Student One',
      student_email: 'student1@test.com',
      student_phone: '081234567892',
      student_address: 'Test Address 1',
      referral_code: 'TEST001',
      status: 'confirmed',
      registration_fee: '1500000.50',
      commission_amount: '150000.05' // Precise decimal
    }).execute();

    const input = { affiliate_id: affiliate.id };
    const result = await getAffiliateStats(input);

    expect(typeof result.total_commission_earned).toBe('number');
    expect(result.total_commission_earned).toEqual(150000.05);
    expect(result.available_for_payout).toEqual(150000.05);
  });
});