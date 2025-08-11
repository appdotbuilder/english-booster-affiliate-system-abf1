import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable } from '../db/schema';
// No need to import the input type since we'll use inline partial types
import { getAffiliates } from '../handlers/get_affiliates';

// Test data setup
const createTestUser = async (email: string, role: 'admin' | 'affiliate' = 'affiliate') => {
  const result = await db.insert(usersTable)
    .values({
      email,
      password_hash: 'hashed_password',
      full_name: 'Test User',
      phone: '1234567890',
      role
    })
    .returning()
    .execute();
  return result[0];
};

const createTestAffiliate = async (userId: number, status: 'pending' | 'approved' | 'rejected' | 'suspended' = 'pending', approvedBy?: number) => {
  const result = await db.insert(affiliatesTable)
    .values({
      user_id: userId,
      referral_code: `REF${userId}${Date.now()}`,
      bank_name: 'Test Bank',
      bank_account_number: '1234567890',
      bank_account_name: 'Test Account',
      ewallet_type: 'GoPay',
      ewallet_number: '081234567890',
      commission_rate: '0.0500', // 5%
      status,
      approved_by: approvedBy
    })
    .returning()
    .execute();
  
  return {
    ...result[0],
    commission_rate: parseFloat(result[0].commission_rate)
  };
};

describe('getAffiliates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all affiliates without filters', async () => {
    // Create test data
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');
    const admin = await createTestUser('admin@test.com', 'admin');
    
    const affiliate1 = await createTestAffiliate(user1.id, 'approved', admin.id);
    const affiliate2 = await createTestAffiliate(user2.id, 'pending');

    const result = await getAffiliates();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(affiliate2.id); // Most recent first (desc order)
    expect(result[1].id).toBe(affiliate1.id);
    
    // Verify all fields are present and properly typed
    result.forEach(affiliate => {
      expect(affiliate.id).toBeDefined();
      expect(affiliate.user_id).toBeDefined();
      expect(affiliate.referral_code).toBeDefined();
      expect(typeof affiliate.commission_rate).toBe('number');
      expect(affiliate.commission_rate).toBe(0.05);
      expect(affiliate.status).toBeDefined();
      expect(affiliate.created_at).toBeInstanceOf(Date);
      expect(affiliate.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should filter affiliates by status', async () => {
    // Create test data with different statuses
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');
    const user3 = await createTestUser('user3@test.com');
    const admin = await createTestUser('admin@test.com', 'admin');
    
    await createTestAffiliate(user1.id, 'approved', admin.id);
    await createTestAffiliate(user2.id, 'pending');
    await createTestAffiliate(user3.id, 'rejected', admin.id);

    const filters = {
      status: 'approved' as const
    };

    const result = await getAffiliates(filters);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('approved');
    expect(result[0].approved_by).toBe(admin.id);
    expect(result[0].user_id).toBe(user1.id);
  });

  it('should filter affiliates by approved_by admin', async () => {
    // Create test data
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');
    const admin1 = await createTestUser('admin1@test.com', 'admin');
    const admin2 = await createTestUser('admin2@test.com', 'admin');
    
    await createTestAffiliate(user1.id, 'approved', admin1.id);
    await createTestAffiliate(user2.id, 'approved', admin2.id);

    const filters = {
      approved_by: admin1.id
    };

    const result = await getAffiliates(filters);

    expect(result).toHaveLength(1);
    expect(result[0].approved_by).toBe(admin1.id);
    expect(result[0].user_id).toBe(user1.id);
  });

  it('should combine multiple filters', async () => {
    // Create test data
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');
    const user3 = await createTestUser('user3@test.com');
    const admin = await createTestUser('admin@test.com', 'admin');
    
    await createTestAffiliate(user1.id, 'approved', admin.id);
    await createTestAffiliate(user2.id, 'approved', admin.id);
    await createTestAffiliate(user3.id, 'rejected', admin.id);

    const filters = {
      status: 'approved' as const,
      approved_by: admin.id
    };

    const result = await getAffiliates(filters);

    expect(result).toHaveLength(2);
    result.forEach(affiliate => {
      expect(affiliate.status).toBe('approved');
      expect(affiliate.approved_by).toBe(admin.id);
    });
  });

  it('should respect pagination limits', async () => {
    // Create multiple affiliates
    const users = await Promise.all([
      createTestUser('user1@test.com'),
      createTestUser('user2@test.com'),
      createTestUser('user3@test.com'),
      createTestUser('user4@test.com'),
      createTestUser('user5@test.com')
    ]);

    await Promise.all(
      users.map(user => createTestAffiliate(user.id))
    );

    const filters = {
      limit: 3
    };

    const result = await getAffiliates(filters);

    expect(result).toHaveLength(3);
  });

  it('should handle pagination offset', async () => {
    // Create test data
    const users = await Promise.all([
      createTestUser('user1@test.com'),
      createTestUser('user2@test.com'),
      createTestUser('user3@test.com')
    ]);

    const affiliates = await Promise.all(
      users.map(user => createTestAffiliate(user.id))
    );

    // Get first page
    const firstPage = await getAffiliates({ limit: 2, offset: 0 });
    expect(firstPage).toHaveLength(2);

    // Get second page
    const secondPage = await getAffiliates({ limit: 2, offset: 2 });
    expect(secondPage).toHaveLength(1);

    // Verify no overlap
    const firstPageIds = firstPage.map(a => a.id);
    const secondPageIds = secondPage.map(a => a.id);
    expect(firstPageIds).not.toEqual(expect.arrayContaining(secondPageIds));
  });

  it('should return empty array when no affiliates match filters', async () => {
    // Create test data with different status
    const user = await createTestUser('user@test.com');
    await createTestAffiliate(user.id, 'pending');

    const filters = {
      status: 'approved' as const
    };

    const result = await getAffiliates(filters);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return affiliates ordered by created_at desc', async () => {
    // Create affiliates with delays to ensure different timestamps
    const user1 = await createTestUser('user1@test.com');
    const affiliate1 = await createTestAffiliate(user1.id);
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const user2 = await createTestUser('user2@test.com');
    const affiliate2 = await createTestAffiliate(user2.id);

    const result = await getAffiliates();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(affiliate2.id); // Most recent first
    expect(result[1].id).toBe(affiliate1.id);
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle default values correctly', async () => {
    // Create more than 50 affiliates to test default limit
    const users = await Promise.all(
      Array.from({ length: 60 }, (_, i) => createTestUser(`user${i}@test.com`))
    );

    await Promise.all(
      users.map(user => createTestAffiliate(user.id))
    );

    // Test with no input (should use defaults)
    const result = await getAffiliates();

    expect(result).toHaveLength(50); // Default limit
  });
});