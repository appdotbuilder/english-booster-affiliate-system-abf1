import { db } from '../db';
import { commissionPayoutsTable, affiliatesTable, studentRegistrationsTable } from '../db/schema';
import { type CreateCommissionPayoutInput, type CommissionPayout } from '../schema';
import { eq, and, sum } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export const createCommissionPayout = async (input: CreateCommissionPayoutInput): Promise<CommissionPayout> => {
  try {
    // Verify affiliate exists
    const affiliate = await db.select()
      .from(affiliatesTable)
      .where(eq(affiliatesTable.id, input.affiliate_id))
      .execute();

    if (affiliate.length === 0) {
      throw new Error(`Affiliate with ID ${input.affiliate_id} not found`);
    }

    if (affiliate[0].status !== 'approved') {
      throw new Error('Only approved affiliates can request payouts');
    }

    // Calculate available commission balance
    // Get total confirmed commission earnings
    const confirmedEarnings = await db.select({
      total: sum(studentRegistrationsTable.commission_amount)
    })
      .from(studentRegistrationsTable)
      .where(and(
        eq(studentRegistrationsTable.affiliate_id, input.affiliate_id),
        eq(studentRegistrationsTable.status, 'confirmed')
      ))
      .execute();

    // Get total completed payouts
    const completedPayouts = await db.select({
      total: sum(commissionPayoutsTable.amount)
    })
      .from(commissionPayoutsTable)
      .where(and(
        eq(commissionPayoutsTable.affiliate_id, input.affiliate_id),
        eq(commissionPayoutsTable.status, 'completed')
      ))
      .execute();

    const totalEarnings = confirmedEarnings[0]?.total ? parseFloat(confirmedEarnings[0].total) : 0;
    const totalPaidOut = completedPayouts[0]?.total ? parseFloat(completedPayouts[0].total) : 0;
    const availableBalance = totalEarnings - totalPaidOut;

    // Check if requested amount exceeds available balance
    if (input.amount > availableBalance) {
      throw new Error(`Insufficient commission balance. Available: ${availableBalance}, Requested: ${input.amount}`);
    }

    // Insert payout record
    const result = await db.insert(commissionPayoutsTable)
      .values({
        affiliate_id: input.affiliate_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        method: input.method,
        bank_details: input.bank_details,
        ewallet_details: input.ewallet_details,
        status: 'pending',
        notes: input.notes
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const payout = result[0];
    return {
      ...payout,
      amount: parseFloat(payout.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Commission payout creation failed:', error);
    throw error;
  }
};