import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable, commissionPayoutsTable } from '../db/schema';
import { getCommissionPayouts, type GetCommissionPayoutsInput } from '../handlers/get_commission_payouts';
import { eq, desc } from 'drizzle-orm';

describe('getCommissionPayouts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testAffiliateId: number;
  let testUserId2: number;
  let testAffiliateId2: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'affiliate1@test.com',
          password_hash: 'hash123',
          full_name: 'Test Affiliate 1',
          role: 'affiliate'
        },
        {
          email: 'affiliate2@test.com',
          password_hash: 'hash456',
          full_name: 'Test Affiliate 2', 
          role: 'affiliate'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    testUserId2 = users[1].id;

    // Create test affiliates
    const affiliates = await db.insert(affiliatesTable)
      .values([
        {
          user_id: testUserId,
          referral_code: 'TEST001',
          commission_rate: '0.0500',
          status: 'approved'
        },
        {
          user_id: testUserId2,
          referral_code: 'TEST002',
          commission_rate: '0.0300',
          status: 'approved'
        }
      ])
      .returning()
      .execute();

    testAffiliateId = affiliates[0].id;
    testAffiliateId2 = affiliates[1].id;
  });

  it('should return empty array when no payouts exist', async () => {
    const input: GetCommissionPayoutsInput = {
      limit: 50,
      offset: 0
    };
    const result = await getCommissionPayouts(input);

    expect(result).toEqual([]);
  });

  it('should return all payouts without filters', async () => {
    // Create test payouts
    await db.insert(commissionPayoutsTable)
      .values([
        {
          affiliate_id: testAffiliateId,
          amount: '150000.00',
          method: 'bank_transfer',
          status: 'pending'
        },
        {
          affiliate_id: testAffiliateId2,
          amount: '200000.00',
          method: 'ewallet',
          status: 'completed'
        }
      ])
      .execute();

    const input: GetCommissionPayoutsInput = {
      limit: 50,
      offset: 0
    };
    const result = await getCommissionPayouts(input);

    expect(result).toHaveLength(2);
    
    // Check that all results are numbers and contain expected amounts
    const amounts = result.map(r => r.amount).sort((a, b) => b - a);
    expect(amounts).toEqual([200000, 150000]);
    expect(typeof result[0].amount).toBe('number');
    expect(typeof result[1].amount).toBe('number');
    
    // Verify ordering by created_at descending
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
    }
  });

  it('should filter payouts by affiliate_id', async () => {
    // Create test payouts for different affiliates
    await db.insert(commissionPayoutsTable)
      .values([
        {
          affiliate_id: testAffiliateId,
          amount: '150000.00',
          method: 'bank_transfer',
          status: 'pending'
        },
        {
          affiliate_id: testAffiliateId2,
          amount: '200000.00',
          method: 'ewallet',
          status: 'completed'
        },
        {
          affiliate_id: testAffiliateId,
          amount: '300000.00',
          method: 'bank_transfer',
          status: 'processing'
        }
      ])
      .execute();

    const input: GetCommissionPayoutsInput = {
      affiliate_id: testAffiliateId,
      limit: 50,
      offset: 0
    };
    const result = await getCommissionPayouts(input);

    expect(result).toHaveLength(2);
    expect(result.every(payout => payout.affiliate_id === testAffiliateId)).toBe(true);
    
    // Check that all results contain expected amounts, ordered by created_at desc
    const amounts = result.map(r => r.amount);
    expect(amounts).toContain(300000);
    expect(amounts).toContain(150000);
    
    // Verify ordering by created_at descending
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
    }
  });

  it('should filter payouts by status', async () => {
    // Create test payouts with different statuses
    await db.insert(commissionPayoutsTable)
      .values([
        {
          affiliate_id: testAffiliateId,
          amount: '150000.00',
          method: 'bank_transfer',
          status: 'pending'
        },
        {
          affiliate_id: testAffiliateId,
          amount: '200000.00',
          method: 'ewallet',
          status: 'completed'
        },
        {
          affiliate_id: testAffiliateId2,
          amount: '300000.00',
          method: 'bank_transfer',
          status: 'pending'
        }
      ])
      .execute();

    const input: GetCommissionPayoutsInput = {
      status: 'pending',
      limit: 50,
      offset: 0
    };
    const result = await getCommissionPayouts(input);

    expect(result).toHaveLength(2);
    expect(result.every(payout => payout.status === 'pending')).toBe(true);
    
    // Check that all results contain expected amounts, ordered by created_at desc
    const amounts = result.map(r => r.amount);
    expect(amounts).toContain(300000);
    expect(amounts).toContain(150000);
    
    // Verify ordering by created_at descending
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
    }
  });

  it('should filter payouts by date range', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create payouts with different dates
    await db.insert(commissionPayoutsTable)
      .values([
        {
          affiliate_id: testAffiliateId,
          amount: '150000.00',
          method: 'bank_transfer',
          status: 'pending'
        }
      ])
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(commissionPayoutsTable)
      .values([
        {
          affiliate_id: testAffiliateId2,
          amount: '200000.00',
          method: 'ewallet',
          status: 'completed'
        }
      ])
      .execute();

    const input: GetCommissionPayoutsInput = {
      start_date: yesterday,
      end_date: tomorrow,
      limit: 50,
      offset: 0
    };
    const result = await getCommissionPayouts(input);

    expect(result).toHaveLength(2);
    result.forEach(payout => {
      expect(payout.created_at >= yesterday).toBe(true);
      expect(payout.created_at <= tomorrow).toBe(true);
    });
  });

  it('should combine multiple filters', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create test payouts
    await db.insert(commissionPayoutsTable)
      .values([
        {
          affiliate_id: testAffiliateId,
          amount: '150000.00',
          method: 'bank_transfer',
          status: 'pending'
        },
        {
          affiliate_id: testAffiliateId,
          amount: '200000.00',
          method: 'ewallet',
          status: 'completed'
        },
        {
          affiliate_id: testAffiliateId2,
          amount: '300000.00',
          method: 'bank_transfer',
          status: 'pending'
        }
      ])
      .execute();

    const input: GetCommissionPayoutsInput = {
      affiliate_id: testAffiliateId,
      status: 'pending',
      start_date: yesterday,
      end_date: tomorrow,
      limit: 50,
      offset: 0
    };
    const result = await getCommissionPayouts(input);

    expect(result).toHaveLength(1);
    expect(result[0].affiliate_id).toBe(testAffiliateId);
    expect(result[0].status).toBe('pending');
    expect(result[0].amount).toBe(150000);
    expect(result[0].created_at >= yesterday).toBe(true);
    expect(result[0].created_at <= tomorrow).toBe(true);
  });

  it('should apply pagination correctly', async () => {
    // Create multiple test payouts
    const payoutData = Array.from({ length: 10 }, (_, i) => ({
      affiliate_id: testAffiliateId,
      amount: `${(i + 1) * 100000}.00`,
      method: 'bank_transfer' as const,
      status: 'pending' as const
    }));

    await db.insert(commissionPayoutsTable)
      .values(payoutData)
      .execute();

    // Test first page
    const input1: GetCommissionPayoutsInput = {
      limit: 5,
      offset: 0
    };
    const result1 = await getCommissionPayouts(input1);

    expect(result1).toHaveLength(5);

    // Test second page
    const input2: GetCommissionPayoutsInput = {
      limit: 5,
      offset: 5
    };
    const result2 = await getCommissionPayouts(input2);

    expect(result2).toHaveLength(5);

    // Ensure no overlap
    const firstPageIds = result1.map(p => p.id);
    const secondPageIds = result2.map(p => p.id);
    expect(firstPageIds.some(id => secondPageIds.includes(id))).toBe(false);
  });

  it('should order results by created_at descending', async () => {
    // Create payouts with more significant delays to ensure different timestamps
    const payout1 = await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: testAffiliateId,
        amount: '100000.00',
        method: 'bank_transfer',
        status: 'pending'
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 100));

    const payout2 = await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: testAffiliateId,
        amount: '200000.00',
        method: 'ewallet',
        status: 'completed'
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 100));

    const payout3 = await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: testAffiliateId,
        amount: '300000.00',
        method: 'bank_transfer',
        status: 'processing'
      })
      .returning()
      .execute();

    const input: GetCommissionPayoutsInput = {
      limit: 50,
      offset: 0
    };
    const result = await getCommissionPayouts(input);

    expect(result).toHaveLength(3);
    
    // Check that results are ordered by created_at descending (newest first)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
    }
    
    // The most recent payout (by ID) should be first since we created them sequentially
    expect(result[0].id).toBe(payout3[0].id);
  });

  it('should handle all payout fields correctly', async () => {
    const testPayout = await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: testAffiliateId,
        amount: '250000.50',
        method: 'ewallet',
        bank_details: '{"bank": "BCA", "account": "1234567890"}',
        ewallet_details: '{"provider": "OVO", "number": "081234567890"}',
        status: 'completed',
        notes: 'Test payout notes'
      })
      .returning()
      .execute();

    const input: GetCommissionPayoutsInput = {
      affiliate_id: testAffiliateId,
      limit: 50,
      offset: 0
    };
    const result = await getCommissionPayouts(input);

    expect(result).toHaveLength(1);
    const payout = result[0];
    
    expect(payout.id).toBeDefined();
    expect(payout.affiliate_id).toBe(testAffiliateId);
    expect(payout.amount).toBe(250000.5);
    expect(typeof payout.amount).toBe('number');
    expect(payout.method).toBe('ewallet');
    expect(payout.bank_details).toBe('{"bank": "BCA", "account": "1234567890"}');
    expect(payout.ewallet_details).toBe('{"provider": "OVO", "number": "081234567890"}');
    expect(payout.status).toBe('completed');
    expect(payout.processed_by).toBeNull();
    expect(payout.processed_at).toBeNull();
    expect(payout.notes).toBe('Test payout notes');
    expect(payout.created_at).toBeInstanceOf(Date);
    expect(payout.updated_at).toBeInstanceOf(Date);
  });

  it('should verify payout is saved to database', async () => {
    await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: testAffiliateId,
        amount: '175000.75',
        method: 'bank_transfer',
        status: 'pending'
      })
      .execute();

    const input: GetCommissionPayoutsInput = {
      affiliate_id: testAffiliateId,
      limit: 50,
      offset: 0
    };
    const result = await getCommissionPayouts(input);

    // Verify via direct database query
    const dbPayouts = await db.select()
      .from(commissionPayoutsTable)
      .where(eq(commissionPayoutsTable.affiliate_id, testAffiliateId))
      .orderBy(desc(commissionPayoutsTable.created_at))
      .execute();

    expect(dbPayouts).toHaveLength(1);
    expect(parseFloat(dbPayouts[0].amount)).toBe(175000.75);
    expect(dbPayouts[0].method).toBe('bank_transfer');
    expect(dbPayouts[0].status).toBe('pending');
    
    // Verify handler result matches database
    expect(result[0].amount).toBe(175000.75);
    expect(result[0].method).toBe('bank_transfer');
    expect(result[0].status).toBe('pending');
  });

  it('should work with legacy function signature (number parameter)', async () => {
    await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: testAffiliateId,
        amount: '150000.00',
        method: 'bank_transfer',
        status: 'pending'
      })
      .execute();

    const result = await getCommissionPayouts(testAffiliateId);

    expect(result).toHaveLength(1);
    expect(result[0].affiliate_id).toBe(testAffiliateId);
    expect(result[0].amount).toBe(150000);
  });

  it('should return all payouts when no parameter provided', async () => {
    await db.insert(commissionPayoutsTable)
      .values([
        {
          affiliate_id: testAffiliateId,
          amount: '150000.00',
          method: 'bank_transfer',
          status: 'pending'
        }
      ])
      .execute();

    const result = await getCommissionPayouts();

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(150000);
  });
});