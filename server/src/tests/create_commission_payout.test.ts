import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable, programsTable, studentRegistrationsTable, commissionPayoutsTable } from '../db/schema';
import { type CreateCommissionPayoutInput } from '../schema';
import { createCommissionPayout } from '../handlers/create_commission_payout';
import { eq } from 'drizzle-orm';

describe('createCommissionPayout', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testAffiliateId: number;
  let testProgramId: number;

  beforeEach(async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'affiliate@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Affiliate',
        phone: '081234567890',
        role: 'affiliate'
      })
      .returning()
      .execute();
    testUserId = user[0].id;

    // Create test affiliate
    const affiliate = await db.insert(affiliatesTable)
      .values({
        user_id: testUserId,
        referral_code: 'TEST123',
        commission_rate: '0.1000', // 10%
        status: 'approved'
      })
      .returning()
      .execute();
    testAffiliateId = affiliate[0].id;

    // Create test program
    const program = await db.insert(programsTable)
      .values({
        name: 'Test Program',
        category: 'online',
        location: 'online',
        price: '1000000.00' // IDR 1,000,000
      })
      .returning()
      .execute();
    testProgramId = program[0].id;
  });

  const createTestInput = (overrides: Partial<CreateCommissionPayoutInput> = {}): CreateCommissionPayoutInput => ({
    affiliate_id: testAffiliateId,
    amount: 100000, // IDR 100,000 (minimum amount)
    method: 'bank_transfer',
    bank_details: JSON.stringify({
      bank_name: 'BCA',
      account_number: '1234567890',
      account_name: 'Test Affiliate'
    }),
    ewallet_details: null,
    notes: 'Test payout request',
    ...overrides
  });

  it('should create a commission payout successfully', async () => {
    // Create confirmed registration to have commission balance
    await db.insert(studentRegistrationsTable)
      .values({
        affiliate_id: testAffiliateId,
        program_id: testProgramId,
        student_name: 'Test Student',
        student_email: 'student@test.com',
        student_phone: '081234567891',
        referral_code: 'TEST123',
        status: 'confirmed',
        registration_fee: '1000000.00',
        commission_amount: '100000.00' // IDR 100,000
      })
      .execute();

    const input = createTestInput();
    const result = await createCommissionPayout(input);

    // Verify payout creation
    expect(result.affiliate_id).toEqual(testAffiliateId);
    expect(result.amount).toEqual(100000);
    expect(result.method).toEqual('bank_transfer');
    expect(result.bank_details).toEqual(input.bank_details);
    expect(result.ewallet_details).toBeNull();
    expect(result.status).toEqual('pending');
    expect(result.notes).toEqual('Test payout request');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.processed_by).toBeNull();
    expect(result.processed_at).toBeNull();
  });

  it('should save payout to database correctly', async () => {
    // Create confirmed registration for commission balance
    await db.insert(studentRegistrationsTable)
      .values({
        affiliate_id: testAffiliateId,
        program_id: testProgramId,
        student_name: 'Test Student',
        student_email: 'student@test.com',
        student_phone: '081234567891',
        referral_code: 'TEST123',
        status: 'confirmed',
        registration_fee: '1000000.00',
        commission_amount: '150000.00' // IDR 150,000
      })
      .execute();

    const input = createTestInput({ amount: 150000 });
    const result = await createCommissionPayout(input);

    // Query database to verify
    const payouts = await db.select()
      .from(commissionPayoutsTable)
      .where(eq(commissionPayoutsTable.id, result.id))
      .execute();

    expect(payouts).toHaveLength(1);
    const savedPayout = payouts[0];
    expect(savedPayout.affiliate_id).toEqual(testAffiliateId);
    expect(parseFloat(savedPayout.amount)).toEqual(150000);
    expect(savedPayout.method).toEqual('bank_transfer');
    expect(savedPayout.status).toEqual('pending');
    expect(savedPayout.created_at).toBeInstanceOf(Date);
  });

  it('should handle e-wallet payment method', async () => {
    // Create commission balance
    await db.insert(studentRegistrationsTable)
      .values({
        affiliate_id: testAffiliateId,
        program_id: testProgramId,
        student_name: 'Test Student',
        student_email: 'student@test.com',
        student_phone: '081234567891',
        referral_code: 'TEST123',
        status: 'confirmed',
        registration_fee: '1000000.00',
        commission_amount: '200000.00'
      })
      .execute();

    const input = createTestInput({
      amount: 200000,
      method: 'ewallet',
      bank_details: null,
      ewallet_details: JSON.stringify({
        type: 'gopay',
        number: '081234567890'
      })
    });

    const result = await createCommissionPayout(input);

    expect(result.method).toEqual('ewallet');
    expect(result.bank_details).toBeNull();
    expect(result.ewallet_details).toEqual(input.ewallet_details);
  });

  it('should throw error for non-existent affiliate', async () => {
    const input = createTestInput({ affiliate_id: 99999 });

    await expect(createCommissionPayout(input))
      .rejects.toThrow(/Affiliate with ID 99999 not found/i);
  });

  it('should throw error for non-approved affiliate', async () => {
    // Update affiliate status to pending
    await db.update(affiliatesTable)
      .set({ status: 'pending' })
      .where(eq(affiliatesTable.id, testAffiliateId))
      .execute();

    const input = createTestInput();

    await expect(createCommissionPayout(input))
      .rejects.toThrow(/Only approved affiliates can request payouts/i);
  });

  it('should throw error for insufficient commission balance', async () => {
    // No confirmed registrations, so balance is 0
    const input = createTestInput({ amount: 100000 });

    await expect(createCommissionPayout(input))
      .rejects.toThrow(/Insufficient commission balance/i);
  });

  it('should calculate available balance correctly with multiple registrations and payouts', async () => {
    // Create multiple confirmed registrations
    await db.insert(studentRegistrationsTable)
      .values([
        {
          affiliate_id: testAffiliateId,
          program_id: testProgramId,
          student_name: 'Student 1',
          student_email: 'student1@test.com',
          student_phone: '081234567891',
          referral_code: 'TEST123',
          status: 'confirmed',
          registration_fee: '1000000.00',
          commission_amount: '100000.00' // IDR 100,000
        },
        {
          affiliate_id: testAffiliateId,
          program_id: testProgramId,
          student_name: 'Student 2',
          student_email: 'student2@test.com',
          student_phone: '081234567892',
          referral_code: 'TEST123',
          status: 'confirmed',
          registration_fee: '1000000.00',
          commission_amount: '150000.00' // IDR 150,000
        }
      ])
      .execute();

    // Create completed payout
    await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: testAffiliateId,
        amount: '100000.00',
        method: 'bank_transfer',
        status: 'completed'
      })
      .execute();

    // Total earnings: 250,000, Total paid: 100,000, Available: 150,000
    const input = createTestInput({ amount: 150000 });
    const result = await createCommissionPayout(input);

    expect(result.amount).toEqual(150000);
    expect(result.status).toEqual('pending');
  });

  it('should reject payout exceeding available balance after existing payouts', async () => {
    // Create confirmed registration
    await db.insert(studentRegistrationsTable)
      .values({
        affiliate_id: testAffiliateId,
        program_id: testProgramId,
        student_name: 'Test Student',
        student_email: 'student@test.com',
        student_phone: '081234567891',
        referral_code: 'TEST123',
        status: 'confirmed',
        registration_fee: '1000000.00',
        commission_amount: '100000.00' // IDR 100,000
      })
      .execute();

    // Create completed payout that uses all balance
    await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: testAffiliateId,
        amount: '100000.00',
        method: 'bank_transfer',
        status: 'completed'
      })
      .execute();

    // Try to request another payout
    const input = createTestInput({ amount: 50000 });

    await expect(createCommissionPayout(input))
      .rejects.toThrow(/Insufficient commission balance. Available: 0, Requested: 50000/i);
  });

  it('should ignore pending registrations when calculating balance', async () => {
    // Create pending registration (should not count towards balance)
    await db.insert(studentRegistrationsTable)
      .values({
        affiliate_id: testAffiliateId,
        program_id: testProgramId,
        student_name: 'Pending Student',
        student_email: 'pending@test.com',
        student_phone: '081234567891',
        referral_code: 'TEST123',
        status: 'pending', // Not confirmed
        registration_fee: '1000000.00',
        commission_amount: '100000.00'
      })
      .execute();

    const input = createTestInput({ amount: 100000 });

    await expect(createCommissionPayout(input))
      .rejects.toThrow(/Insufficient commission balance/i);
  });
});