import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable, commissionPayoutsTable } from '../db/schema';
import { type UpdatePayoutStatusInput } from '../schema';
import { updatePayoutStatus } from '../handlers/update_payout_status';
import { eq } from 'drizzle-orm';

describe('updatePayoutStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let adminUserId: number;
  let affiliateUserId: number;
  let affiliateId: number;
  let payoutId: number;

  beforeEach(async () => {
    // Create admin user
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Admin User',
        phone: '+1234567890',
        role: 'admin'
      })
      .returning()
      .execute();
    adminUserId = adminUser[0].id;

    // Create affiliate user
    const affiliateUser = await db.insert(usersTable)
      .values({
        email: 'affiliate@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Affiliate User',
        phone: '+1234567891',
        role: 'affiliate'
      })
      .returning()
      .execute();
    affiliateUserId = affiliateUser[0].id;

    // Create affiliate
    const affiliate = await db.insert(affiliatesTable)
      .values({
        user_id: affiliateUserId,
        referral_code: 'TEST123',
        commission_rate: '0.1000',
        status: 'approved'
      })
      .returning()
      .execute();
    affiliateId = affiliate[0].id;

    // Create test payout
    const payout = await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: affiliateId,
        amount: '500000.00', // IDR 500,000
        method: 'bank_transfer',
        bank_details: 'BCA - 1234567890',
        status: 'pending'
      })
      .returning()
      .execute();
    payoutId = payout[0].id;
  });

  it('should update payout status to processing', async () => {
    const input: UpdatePayoutStatusInput = {
      payout_id: payoutId,
      status: 'processing'
    };

    const result = await updatePayoutStatus(input);

    expect(result.id).toEqual(payoutId);
    expect(result.status).toEqual('processing');
    expect(result.amount).toEqual(500000);
    expect(result.processed_by).toBeNull();
    expect(result.processed_at).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update payout status to completed with processed_by and processed_at', async () => {
    const input: UpdatePayoutStatusInput = {
      payout_id: payoutId,
      status: 'completed',
      processed_by: adminUserId,
      notes: 'Transfer completed successfully'
    };

    const result = await updatePayoutStatus(input);

    expect(result.id).toEqual(payoutId);
    expect(result.status).toEqual('completed');
    expect(result.processed_by).toEqual(adminUserId);
    expect(result.processed_at).toBeInstanceOf(Date);
    expect(result.notes).toEqual('Transfer completed successfully');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update payout status to failed with processed_by and processed_at', async () => {
    const input: UpdatePayoutStatusInput = {
      payout_id: payoutId,
      status: 'failed',
      processed_by: adminUserId,
      notes: 'Invalid bank account details'
    };

    const result = await updatePayoutStatus(input);

    expect(result.id).toEqual(payoutId);
    expect(result.status).toEqual('failed');
    expect(result.processed_by).toEqual(adminUserId);
    expect(result.processed_at).toBeInstanceOf(Date);
    expect(result.notes).toEqual('Invalid bank account details');
  });

  it('should save updated payout to database', async () => {
    const input: UpdatePayoutStatusInput = {
      payout_id: payoutId,
      status: 'completed',
      processed_by: adminUserId
    };

    await updatePayoutStatus(input);

    // Verify the update was saved to database
    const payouts = await db.select()
      .from(commissionPayoutsTable)
      .where(eq(commissionPayoutsTable.id, payoutId))
      .execute();

    expect(payouts).toHaveLength(1);
    expect(payouts[0].status).toEqual('completed');
    expect(payouts[0].processed_by).toEqual(adminUserId);
    expect(payouts[0].processed_at).toBeInstanceOf(Date);
    expect(payouts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update notes when provided', async () => {
    const input: UpdatePayoutStatusInput = {
      payout_id: payoutId,
      status: 'processing',
      notes: 'Processing payment through bank'
    };

    const result = await updatePayoutStatus(input);

    expect(result.notes).toEqual('Processing payment through bank');
  });

  it('should handle null notes', async () => {
    const input: UpdatePayoutStatusInput = {
      payout_id: payoutId,
      status: 'processing',
      notes: null
    };

    const result = await updatePayoutStatus(input);

    expect(result.notes).toBeNull();
  });

  it('should throw error for non-existent payout', async () => {
    const input: UpdatePayoutStatusInput = {
      payout_id: 99999,
      status: 'completed',
      processed_by: adminUserId
    };

    expect(updatePayoutStatus(input)).rejects.toThrow(/not found/i);
  });

  it('should handle status transitions correctly', async () => {
    // First update to processing
    let input: UpdatePayoutStatusInput = {
      payout_id: payoutId,
      status: 'processing'
    };

    let result = await updatePayoutStatus(input);
    expect(result.status).toEqual('processing');
    expect(result.processed_by).toBeNull();
    expect(result.processed_at).toBeNull();

    // Then update to completed
    input = {
      payout_id: payoutId,
      status: 'completed',
      processed_by: adminUserId
    };

    result = await updatePayoutStatus(input);
    expect(result.status).toEqual('completed');
    expect(result.processed_by).toEqual(adminUserId);
    expect(result.processed_at).toBeInstanceOf(Date);
  });

  it('should preserve original amount and method after update', async () => {
    const input: UpdatePayoutStatusInput = {
      payout_id: payoutId,
      status: 'completed',
      processed_by: adminUserId
    };

    const result = await updatePayoutStatus(input);

    expect(result.amount).toEqual(500000);
    expect(result.method).toEqual('bank_transfer');
    expect(result.bank_details).toEqual('BCA - 1234567890');
    expect(result.affiliate_id).toEqual(affiliateId);
  });

  it('should update payout for ewallet method', async () => {
    // Create ewallet payout
    const ewalletPayout = await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: affiliateId,
        amount: '750000.00', // IDR 750,000
        method: 'ewallet',
        ewallet_details: 'GoPay - 081234567890',
        status: 'pending'
      })
      .returning()
      .execute();

    const input: UpdatePayoutStatusInput = {
      payout_id: ewalletPayout[0].id,
      status: 'completed',
      processed_by: adminUserId,
      notes: 'E-wallet transfer successful'
    };

    const result = await updatePayoutStatus(input);

    expect(result.method).toEqual('ewallet');
    expect(result.ewallet_details).toEqual('GoPay - 081234567890');
    expect(result.status).toEqual('completed');
    expect(result.notes).toEqual('E-wallet transfer successful');
  });
});