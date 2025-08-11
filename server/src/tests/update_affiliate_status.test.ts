import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable } from '../db/schema';
import { type UpdateAffiliateStatusInput } from '../schema';
import { updateAffiliateStatus } from '../handlers/update_affiliate_status';
import { eq } from 'drizzle-orm';

describe('updateAffiliateStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async (role: 'admin' | 'affiliate' = 'affiliate') => {
    const result = await db.insert(usersTable)
      .values({
        email: `test-${Date.now()}@example.com`,
        password_hash: 'hashed_password',
        full_name: 'Test User',
        phone: '+1234567890',
        role: role
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create a test affiliate
  const createTestAffiliate = async (userId: number, status: 'pending' | 'approved' | 'rejected' | 'suspended' = 'pending') => {
    const result = await db.insert(affiliatesTable)
      .values({
        user_id: userId,
        referral_code: `REF${Date.now()}`,
        bank_name: 'Test Bank',
        bank_account_number: '1234567890',
        bank_account_name: 'Test Account',
        ewallet_type: null,
        ewallet_number: null,
        commission_rate: '0.0500', // 5%
        status: status
      })
      .returning()
      .execute();
    
    return {
      ...result[0],
      commission_rate: parseFloat(result[0].commission_rate)
    };
  };

  it('should update affiliate status to approved with approval details', async () => {
    const user = await createTestUser();
    const admin = await createTestUser('admin');
    const affiliate = await createTestAffiliate(user.id, 'pending');

    const input: UpdateAffiliateStatusInput = {
      affiliate_id: affiliate.id,
      status: 'approved',
      approved_by: admin.id
    };

    const result = await updateAffiliateStatus(input);

    expect(result.id).toEqual(affiliate.id);
    expect(result.status).toEqual('approved');
    expect(result.approved_by).toEqual(admin.id);
    expect(result.approved_at).toBeInstanceOf(Date);
    expect(result.commission_rate).toEqual(0.05);
    expect(typeof result.commission_rate).toBe('number');
  });

  it('should update affiliate status to rejected', async () => {
    const user = await createTestUser();
    const admin = await createTestUser('admin');
    const affiliate = await createTestAffiliate(user.id, 'pending');

    const input: UpdateAffiliateStatusInput = {
      affiliate_id: affiliate.id,
      status: 'rejected',
      approved_by: admin.id
    };

    const result = await updateAffiliateStatus(input);

    expect(result.id).toEqual(affiliate.id);
    expect(result.status).toEqual('rejected');
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
  });

  it('should update affiliate status to suspended and clear approval fields', async () => {
    const user = await createTestUser();
    const admin = await createTestUser('admin');
    const affiliate = await createTestAffiliate(user.id, 'approved');
    
    // First approve the affiliate
    await db.update(affiliatesTable)
      .set({
        approved_by: admin.id,
        approved_at: new Date()
      })
      .where(eq(affiliatesTable.id, affiliate.id))
      .execute();

    const input: UpdateAffiliateStatusInput = {
      affiliate_id: affiliate.id,
      status: 'suspended',
      approved_by: admin.id
    };

    const result = await updateAffiliateStatus(input);

    expect(result.id).toEqual(affiliate.id);
    expect(result.status).toEqual('suspended');
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
  });

  it('should save changes to database correctly', async () => {
    const user = await createTestUser();
    const admin = await createTestUser('admin');
    const affiliate = await createTestAffiliate(user.id, 'pending');

    const input: UpdateAffiliateStatusInput = {
      affiliate_id: affiliate.id,
      status: 'approved',
      approved_by: admin.id
    };

    await updateAffiliateStatus(input);

    // Verify changes in database
    const dbAffiliates = await db.select()
      .from(affiliatesTable)
      .where(eq(affiliatesTable.id, affiliate.id))
      .execute();

    expect(dbAffiliates).toHaveLength(1);
    const dbAffiliate = dbAffiliates[0];
    expect(dbAffiliate.status).toEqual('approved');
    expect(dbAffiliate.approved_by).toEqual(admin.id);
    expect(dbAffiliate.approved_at).toBeInstanceOf(Date);
    expect(dbAffiliate.updated_at).toBeInstanceOf(Date);
  });

  it('should update affiliate status without approved_by when not provided', async () => {
    const user = await createTestUser();
    const affiliate = await createTestAffiliate(user.id, 'pending');

    const input: UpdateAffiliateStatusInput = {
      affiliate_id: affiliate.id,
      status: 'approved'
      // approved_by is optional and not provided
    };

    const result = await updateAffiliateStatus(input);

    expect(result.id).toEqual(affiliate.id);
    expect(result.status).toEqual('approved');
    expect(result.approved_by).toBeNull(); // Database stores undefined as null
    expect(result.approved_at).toBeInstanceOf(Date);
  });

  it('should change status from approved back to pending and clear approval fields', async () => {
    const user = await createTestUser();
    const admin = await createTestUser('admin');
    const affiliate = await createTestAffiliate(user.id, 'approved');
    
    // First approve the affiliate
    await db.update(affiliatesTable)
      .set({
        approved_by: admin.id,
        approved_at: new Date()
      })
      .where(eq(affiliatesTable.id, affiliate.id))
      .execute();

    const input: UpdateAffiliateStatusInput = {
      affiliate_id: affiliate.id,
      status: 'pending'
    };

    const result = await updateAffiliateStatus(input);

    expect(result.id).toEqual(affiliate.id);
    expect(result.status).toEqual('pending');
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
  });

  it('should throw error when affiliate not found', async () => {
    const input: UpdateAffiliateStatusInput = {
      affiliate_id: 99999, // Non-existent ID
      status: 'approved',
      approved_by: 1
    };

    expect(updateAffiliateStatus(input)).rejects.toThrow(/affiliate.*not found/i);
  });

  it('should handle all valid status transitions', async () => {
    const user = await createTestUser();
    const admin = await createTestUser('admin');
    const affiliate = await createTestAffiliate(user.id, 'pending');

    const statuses: Array<'pending' | 'approved' | 'rejected' | 'suspended'> = 
      ['approved', 'suspended', 'rejected', 'pending'];

    for (const status of statuses) {
      const input: UpdateAffiliateStatusInput = {
        affiliate_id: affiliate.id,
        status: status,
        approved_by: status === 'approved' ? admin.id : undefined
      };

      const result = await updateAffiliateStatus(input);
      expect(result.status).toEqual(status);
      
      if (status === 'approved') {
        expect(result.approved_by).toEqual(admin.id);
        expect(result.approved_at).toBeInstanceOf(Date);
      } else {
        expect(result.approved_by).toBeNull();
        expect(result.approved_at).toBeNull();
      }
    }
  });
});