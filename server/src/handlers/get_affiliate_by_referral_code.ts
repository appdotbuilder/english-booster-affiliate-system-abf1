import { db } from '../db';
import { affiliatesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Affiliate } from '../schema';

export const getAffiliateByReferralCode = async (referralCode: string): Promise<Affiliate | null> => {
  try {
    const result = await db.select()
      .from(affiliatesTable)
      .where(eq(affiliatesTable.referral_code, referralCode))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const affiliate = result[0];
    return {
      ...affiliate,
      commission_rate: parseFloat(affiliate.commission_rate) // Convert numeric field to number
    };
  } catch (error) {
    console.error('Failed to get affiliate by referral code:', error);
    throw error;
  }
};