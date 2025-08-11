import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable } from '../db/schema';
import { getAffiliateByReferralCode } from '../handlers/get_affiliate_by_referral_code';
import { eq } from 'drizzle-orm';

describe('getAffiliateByReferralCode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no affiliate exists with the given referral code', async () => {
    const result = await getAffiliateByReferralCode('NONEXISTENT');
    expect(result).toBeNull();
  });

  it('should return affiliate when found by referral code', async () => {
    // Create a test user first (required for foreign key)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        phone: '1234567890',
        role: 'affiliate'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test affiliate
    const testAffiliate = {
      user_id: userId,
      referral_code: 'TEST123',
      bank_name: 'Test Bank',
      bank_account_number: '1234567890',
      bank_account_name: 'Test Account',
      ewallet_type: 'gopay',
      ewallet_number: '081234567890',
      commission_rate: '0.0500', // 5% as string for database insert
      status: 'approved' as const,
      approved_by: userId
    };

    await db.insert(affiliatesTable)
      .values(testAffiliate)
      .execute();

    const result = await getAffiliateByReferralCode('TEST123');

    expect(result).not.toBeNull();
    expect(result!.referral_code).toBe('TEST123');
    expect(result!.user_id).toBe(userId);
    expect(result!.bank_name).toBe('Test Bank');
    expect(result!.bank_account_number).toBe('1234567890');
    expect(result!.bank_account_name).toBe('Test Account');
    expect(result!.ewallet_type).toBe('gopay');
    expect(result!.ewallet_number).toBe('081234567890');
    expect(result!.commission_rate).toBe(0.05); // Should be converted to number
    expect(typeof result!.commission_rate).toBe('number');
    expect(result!.status).toBe('approved');
    expect(result!.approved_by).toBe(userId);
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return the correct affiliate when multiple affiliates exist', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password1',
        full_name: 'User One',
        phone: '1234567891',
        role: 'affiliate'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password2',
        full_name: 'User Two',
        phone: '1234567892',
        role: 'affiliate'
      })
      .returning()
      .execute();

    const userId1 = user1Result[0].id;
    const userId2 = user2Result[0].id;

    // Create multiple affiliates with different referral codes
    await db.insert(affiliatesTable)
      .values([
        {
          user_id: userId1,
          referral_code: 'FIRST123',
          commission_rate: '0.0300', // 3%
          status: 'approved'
        },
        {
          user_id: userId2,
          referral_code: 'SECOND456',
          commission_rate: '0.0400', // 4%
          status: 'pending'
        }
      ])
      .execute();

    // Test finding the first affiliate
    const result1 = await getAffiliateByReferralCode('FIRST123');
    expect(result1).not.toBeNull();
    expect(result1!.referral_code).toBe('FIRST123');
    expect(result1!.user_id).toBe(userId1);
    expect(result1!.commission_rate).toBe(0.03);
    expect(result1!.status).toBe('approved');

    // Test finding the second affiliate
    const result2 = await getAffiliateByReferralCode('SECOND456');
    expect(result2).not.toBeNull();
    expect(result2!.referral_code).toBe('SECOND456');
    expect(result2!.user_id).toBe(userId2);
    expect(result2!.commission_rate).toBe(0.04);
    expect(result2!.status).toBe('pending');
  });

  it('should handle case-sensitive referral code matching', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'case@example.com',
        password_hash: 'hashed_password',
        full_name: 'Case User',
        phone: '1234567890',
        role: 'affiliate'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create affiliate with uppercase referral code
    await db.insert(affiliatesTable)
      .values({
        user_id: userId,
        referral_code: 'CASE123',
        commission_rate: '0.0500',
        status: 'approved'
      })
      .execute();

    // Should find with exact case match
    const exactMatch = await getAffiliateByReferralCode('CASE123');
    expect(exactMatch).not.toBeNull();
    expect(exactMatch!.referral_code).toBe('CASE123');

    // Should not find with different case
    const lowerCase = await getAffiliateByReferralCode('case123');
    expect(lowerCase).toBeNull();

    const mixedCase = await getAffiliateByReferralCode('Case123');
    expect(mixedCase).toBeNull();
  });

  it('should verify affiliate is saved correctly in database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'verify@example.com',
        password_hash: 'hashed_password',
        full_name: 'Verify User',
        phone: '1234567890',
        role: 'affiliate'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create affiliate
    await db.insert(affiliatesTable)
      .values({
        user_id: userId,
        referral_code: 'VERIFY789',
        commission_rate: '0.0750', // 7.5%
        status: 'approved'
      })
      .execute();

    // Get affiliate using handler
    const handlerResult = await getAffiliateByReferralCode('VERIFY789');

    // Verify by querying database directly
    const dbResult = await db.select()
      .from(affiliatesTable)
      .where(eq(affiliatesTable.referral_code, 'VERIFY789'))
      .execute();

    expect(dbResult).toHaveLength(1);
    expect(handlerResult!.id).toBe(dbResult[0].id);
    expect(handlerResult!.referral_code).toBe(dbResult[0].referral_code);
    expect(handlerResult!.user_id).toBe(dbResult[0].user_id);
    // Verify numeric conversion - handler returns number, db returns string
    expect(handlerResult!.commission_rate).toBe(0.075);
    expect(dbResult[0].commission_rate).toBe('0.0750');
  });
});