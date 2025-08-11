import { db } from '../db';
import { affiliatesTable } from '../db/schema';
import { type UpdateAffiliateStatusInput, type Affiliate } from '../schema';
import { eq } from 'drizzle-orm';

export const updateAffiliateStatus = async (input: UpdateAffiliateStatusInput): Promise<Affiliate> => {
  try {
    // Prepare update data
    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    // If status is 'approved', set approved_by and approved_at
    if (input.status === 'approved') {
      updateData.approved_by = input.approved_by;
      updateData.approved_at = new Date();
    }

    // If status is changed from 'approved' to something else, clear approval fields
    if (input.status !== 'approved') {
      updateData.approved_by = null;
      updateData.approved_at = null;
    }

    // Update the affiliate record
    const result = await db.update(affiliatesTable)
      .set(updateData)
      .where(eq(affiliatesTable.id, input.affiliate_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Affiliate with id ${input.affiliate_id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const affiliate = result[0];
    return {
      ...affiliate,
      commission_rate: parseFloat(affiliate.commission_rate)
    };
  } catch (error) {
    console.error('Affiliate status update failed:', error);
    throw error;
  }
};