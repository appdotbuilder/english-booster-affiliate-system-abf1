import { db } from '../db';
import { affiliatesTable, usersTable } from '../db/schema';
import { type Affiliate, affiliateStatusSchema } from '../schema';
import { eq, SQL, and, desc } from 'drizzle-orm';
import { z } from 'zod';

// Input schema for filtering affiliates
export const getAffiliatesInputSchema = z.object({
  status: affiliateStatusSchema.optional(),
  approved_by: z.number().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

export type GetAffiliatesInput = z.infer<typeof getAffiliatesInputSchema>;

export const getAffiliates = async (input: Partial<GetAffiliatesInput> = {}): Promise<Affiliate[]> => {
  try {
    // Parse and apply defaults
    const filters = getAffiliatesInputSchema.parse(input);
    
    // Start with base query with join to get user details
    let query = db.select({
      id: affiliatesTable.id,
      user_id: affiliatesTable.user_id,
      referral_code: affiliatesTable.referral_code,
      bank_name: affiliatesTable.bank_name,
      bank_account_number: affiliatesTable.bank_account_number,
      bank_account_name: affiliatesTable.bank_account_name,
      ewallet_type: affiliatesTable.ewallet_type,
      ewallet_number: affiliatesTable.ewallet_number,
      commission_rate: affiliatesTable.commission_rate,
      status: affiliatesTable.status,
      approved_by: affiliatesTable.approved_by,
      approved_at: affiliatesTable.approved_at,
      created_at: affiliatesTable.created_at,
      updated_at: affiliatesTable.updated_at
    }).from(affiliatesTable)
      .innerJoin(usersTable, eq(affiliatesTable.user_id, usersTable.id));

    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filters.status) {
      conditions.push(eq(affiliatesTable.status, filters.status));
    }

    if (filters.approved_by) {
      conditions.push(eq(affiliatesTable.approved_by, filters.approved_by));
    }

    // Apply filters if any exist, then ordering and pagination
    let finalQuery;
    if (conditions.length > 0) {
      finalQuery = query
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(affiliatesTable.created_at))
        .limit(filters.limit)
        .offset(filters.offset);
    } else {
      finalQuery = query
        .orderBy(desc(affiliatesTable.created_at))
        .limit(filters.limit)
        .offset(filters.offset);
    }

    const results = await finalQuery.execute();

    // Convert numeric fields and return
    return results.map(result => ({
      ...result,
      commission_rate: parseFloat(result.commission_rate)
    }));
  } catch (error) {
    console.error('Get affiliates failed:', error);
    throw error;
  }
};