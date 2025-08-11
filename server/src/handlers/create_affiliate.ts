import { db } from '../db';
import { affiliatesTable, usersTable } from '../db/schema';
import { type CreateAffiliateInput, type Affiliate } from '../schema';
import { eq } from 'drizzle-orm';

export const createAffiliate = async (input: CreateAffiliateInput): Promise<Affiliate> => {
  try {
    // Verify that the user exists and validate they don't already have an affiliate profile
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error('User not found');
    }

    // Check if user already has an affiliate profile
    const existingAffiliate = await db.select()
      .from(affiliatesTable)
      .where(eq(affiliatesTable.user_id, input.user_id))
      .execute();

    if (existingAffiliate.length > 0) {
      throw new Error('User already has an affiliate profile');
    }

    // Generate unique referral code
    let referralCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      referralCode = `EB${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      const existingCode = await db.select()
        .from(affiliatesTable)
        .where(eq(affiliatesTable.referral_code, referralCode))
        .execute();

      isUnique = existingCode.length === 0;
      attempts++;

      if (attempts >= maxAttempts && !isUnique) {
        throw new Error('Unable to generate unique referral code');
      }
    } while (!isUnique);

    // Insert affiliate record
    const result = await db.insert(affiliatesTable)
      .values({
        user_id: input.user_id,
        referral_code: referralCode,
        bank_name: input.bank_name,
        bank_account_number: input.bank_account_number,
        bank_account_name: input.bank_account_name,
        ewallet_type: input.ewallet_type,
        ewallet_number: input.ewallet_number,
        commission_rate: input.commission_rate.toString(), // Convert number to string for numeric column
        status: 'pending' // Default status for admin approval
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const affiliate = result[0];
    return {
      ...affiliate,
      commission_rate: parseFloat(affiliate.commission_rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Affiliate creation failed:', error);
    throw error;
  }
};