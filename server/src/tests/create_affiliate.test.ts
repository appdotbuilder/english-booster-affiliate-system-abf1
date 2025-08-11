import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable } from '../db/schema';
import { type CreateAffiliateInput } from '../schema';
import { createAffiliate } from '../handlers/create_affiliate';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  phone: '+1234567890',
  role: 'affiliate' as const
};

// Test affiliate input
const testAffiliateInput: CreateAffiliateInput = {
  user_id: 1, // Will be updated after user creation
  bank_name: 'Bank Test',
  bank_account_number: '1234567890',
  bank_account_name: 'Test User',
  ewallet_type: 'GoPay',
  ewallet_number: '081234567890',
  commission_rate: 0.05
};

describe('createAffiliate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an affiliate profile successfully', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = userResult[0];
    testAffiliateInput.user_id = createdUser.id;

    // Create affiliate
    const result = await createAffiliate(testAffiliateInput);

    // Verify returned affiliate data
    expect(result.user_id).toEqual(createdUser.id);
    expect(result.bank_name).toEqual('Bank Test');
    expect(result.bank_account_number).toEqual('1234567890');
    expect(result.bank_account_name).toEqual('Test User');
    expect(result.ewallet_type).toEqual('GoPay');
    expect(result.ewallet_number).toEqual('081234567890');
    expect(result.commission_rate).toEqual(0.05);
    expect(typeof result.commission_rate).toBe('number');
    expect(result.status).toEqual('pending');
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.referral_code).toBeDefined();
    expect(result.referral_code).toMatch(/^EB[A-Z0-9]{8}$/);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save affiliate to database correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = userResult[0];
    testAffiliateInput.user_id = createdUser.id;

    // Create affiliate
    const result = await createAffiliate(testAffiliateInput);

    // Query database to verify affiliate was saved
    const affiliates = await db.select()
      .from(affiliatesTable)
      .where(eq(affiliatesTable.id, result.id))
      .execute();

    expect(affiliates).toHaveLength(1);
    const savedAffiliate = affiliates[0];
    expect(savedAffiliate.user_id).toEqual(createdUser.id);
    expect(savedAffiliate.bank_name).toEqual('Bank Test');
    expect(parseFloat(savedAffiliate.commission_rate)).toEqual(0.05);
    expect(savedAffiliate.status).toEqual('pending');
    expect(savedAffiliate.referral_code).toMatch(/^EB[A-Z0-9]{8}$/);
  });

  it('should generate unique referral codes', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user1@example.com'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user2@example.com'
      })
      .returning()
      .execute();

    // Create two affiliates
    const affiliate1 = await createAffiliate({
      ...testAffiliateInput,
      user_id: user1Result[0].id
    });

    const affiliate2 = await createAffiliate({
      ...testAffiliateInput,
      user_id: user2Result[0].id
    });

    // Verify referral codes are different
    expect(affiliate1.referral_code).not.toEqual(affiliate2.referral_code);
    expect(affiliate1.referral_code).toMatch(/^EB[A-Z0-9]{8}$/);
    expect(affiliate2.referral_code).toMatch(/^EB[A-Z0-9]{8}$/);
  });

  it('should handle optional bank details correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = userResult[0];

    // Create affiliate with minimal data (only ewallet)
    const minimalInput: CreateAffiliateInput = {
      user_id: createdUser.id,
      bank_name: null,
      bank_account_number: null,
      bank_account_name: null,
      ewallet_type: 'OVO',
      ewallet_number: '081234567890',
      commission_rate: 0.03
    };

    const result = await createAffiliate(minimalInput);

    expect(result.bank_name).toBeNull();
    expect(result.bank_account_number).toBeNull();
    expect(result.bank_account_name).toBeNull();
    expect(result.ewallet_type).toEqual('OVO');
    expect(result.ewallet_number).toEqual('081234567890');
  });

  it('should handle optional ewallet details correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = userResult[0];

    // Create affiliate with only bank details
    const bankOnlyInput: CreateAffiliateInput = {
      user_id: createdUser.id,
      bank_name: 'BCA',
      bank_account_number: '9876543210',
      bank_account_name: 'Test User Account',
      ewallet_type: null,
      ewallet_number: null,
      commission_rate: 0.07
    };

    const result = await createAffiliate(bankOnlyInput);

    expect(result.bank_name).toEqual('BCA');
    expect(result.bank_account_number).toEqual('9876543210');
    expect(result.bank_account_name).toEqual('Test User Account');
    expect(result.ewallet_type).toBeNull();
    expect(result.ewallet_number).toBeNull();
  });

  it('should throw error when user does not exist', async () => {
    const invalidInput: CreateAffiliateInput = {
      ...testAffiliateInput,
      user_id: 999 // Non-existent user ID
    };

    expect(createAffiliate(invalidInput)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when user already has affiliate profile', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = userResult[0];
    testAffiliateInput.user_id = createdUser.id;

    // Create first affiliate
    await createAffiliate(testAffiliateInput);

    // Attempt to create second affiliate for same user
    expect(createAffiliate(testAffiliateInput)).rejects.toThrow(/already has an affiliate profile/i);
  });

  it('should handle different commission rates correctly', async () => {
    // Create multiple users
    const user1Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user1@example.com'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user2@example.com'
      })
      .returning()
      .execute();

    // Create affiliates with different commission rates
    const affiliate1 = await createAffiliate({
      ...testAffiliateInput,
      user_id: user1Result[0].id,
      commission_rate: 0.025 // 2.5%
    });

    const affiliate2 = await createAffiliate({
      ...testAffiliateInput,
      user_id: user2Result[0].id,
      commission_rate: 0.10 // 10%
    });

    expect(affiliate1.commission_rate).toEqual(0.025);
    expect(affiliate2.commission_rate).toEqual(0.10);
    expect(typeof affiliate1.commission_rate).toBe('number');
    expect(typeof affiliate2.commission_rate).toBe('number');
  });
});