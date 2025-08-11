import { db } from '../db';
import { commissionPayoutsTable } from '../db/schema';
import { type CommissionPayout, type PayoutStatus } from '../schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { z } from 'zod';

// Input schema for filtering commission payouts
export const getCommissionPayoutsInputSchema = z.object({
  affiliate_id: z.number().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.number().positive().default(50),
  offset: z.number().min(0).default(0)
});

export type GetCommissionPayoutsInput = z.infer<typeof getCommissionPayoutsInputSchema>;

// Internal implementation function
const getCommissionPayoutsInternal = async (input: GetCommissionPayoutsInput): Promise<CommissionPayout[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (input.affiliate_id !== undefined) {
      conditions.push(eq(commissionPayoutsTable.affiliate_id, input.affiliate_id));
    }

    if (input.status) {
      conditions.push(eq(commissionPayoutsTable.status, input.status));
    }

    if (input.start_date) {
      conditions.push(gte(commissionPayoutsTable.created_at, input.start_date));
    }

    if (input.end_date) {
      conditions.push(lte(commissionPayoutsTable.created_at, input.end_date));
    }

    // Build the complete query in one go to avoid type issues
    const baseQuery = db.select().from(commissionPayoutsTable);
    
    const queryWithConditions = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await queryWithConditions
      .orderBy(desc(commissionPayoutsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(payout => ({
      ...payout,
      amount: parseFloat(payout.amount)
    }));
  } catch (error) {
    console.error('Failed to get commission payouts:', error);
    throw error;
  }
};

// Overloaded function signatures for backward compatibility
export async function getCommissionPayouts(affiliateId?: number): Promise<CommissionPayout[]>;
export async function getCommissionPayouts(input: GetCommissionPayoutsInput): Promise<CommissionPayout[]>;
export async function getCommissionPayouts(inputOrAffiliateId?: GetCommissionPayoutsInput | number): Promise<CommissionPayout[]> {
  // Handle backward compatibility - if a number is passed, treat it as affiliate_id
  if (typeof inputOrAffiliateId === 'number' || inputOrAffiliateId === undefined) {
    return getCommissionPayoutsInternal({
      affiliate_id: inputOrAffiliateId,
      limit: 50,
      offset: 0
    });
  }
  
  // New signature - input object
  return getCommissionPayoutsInternal(inputOrAffiliateId);
}

