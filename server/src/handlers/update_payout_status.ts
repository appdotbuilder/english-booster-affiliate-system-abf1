import { db } from '../db';
import { commissionPayoutsTable } from '../db/schema';
import { type UpdatePayoutStatusInput, type CommissionPayout } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePayoutStatus = async (input: UpdatePayoutStatusInput): Promise<CommissionPayout> => {
  try {
    // First, check if the payout exists
    const existingPayout = await db.select()
      .from(commissionPayoutsTable)
      .where(eq(commissionPayoutsTable.id, input.payout_id))
      .limit(1)
      .execute();

    if (existingPayout.length === 0) {
      throw new Error(`Commission payout with ID ${input.payout_id} not found`);
    }

    // Prepare update data
    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Set processed_by and processed_at when status changes to 'completed' or 'failed'
    if (input.status === 'completed' || input.status === 'failed') {
      updateData.processed_by = input.processed_by;
      updateData.processed_at = new Date();
    }

    // Add notes if provided
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    // Update the payout record
    const result = await db.update(commissionPayoutsTable)
      .set(updateData)
      .where(eq(commissionPayoutsTable.id, input.payout_id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const payout = result[0];
    return {
      ...payout,
      amount: parseFloat(payout.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payout status update failed:', error);
    throw error;
  }
};