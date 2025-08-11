import { db } from '../db';
import { studentRegistrationsTable, commissionPayoutsTable } from '../db/schema';
import { type GetAffiliateStatsInput, type AffiliateStats } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export const getAffiliateStats = async (input: GetAffiliateStatsInput): Promise<AffiliateStats> => {
  try {
    // Build conditions for date filtering
    const registrationConditions: SQL<unknown>[] = [
      eq(studentRegistrationsTable.affiliate_id, input.affiliate_id)
    ];

    const payoutConditions: SQL<unknown>[] = [
      eq(commissionPayoutsTable.affiliate_id, input.affiliate_id)
    ];

    // Apply date filters if provided
    if (input.start_date) {
      registrationConditions.push(gte(studentRegistrationsTable.created_at, input.start_date));
      payoutConditions.push(gte(commissionPayoutsTable.created_at, input.start_date));
    }

    if (input.end_date) {
      registrationConditions.push(lte(studentRegistrationsTable.created_at, input.end_date));
      payoutConditions.push(lte(commissionPayoutsTable.created_at, input.end_date));
    }

    // Query registrations with proper condition handling
    const registrations = await db.select()
      .from(studentRegistrationsTable)
      .where(
        registrationConditions.length === 1 
          ? registrationConditions[0] 
          : and(...registrationConditions)
      )
      .execute();

    // Query payouts with proper condition handling
    const payouts = await db.select()
      .from(commissionPayoutsTable)
      .where(
        payoutConditions.length === 1 
          ? payoutConditions[0] 
          : and(...payoutConditions)
      )
      .execute();

    // Calculate registration statistics
    const totalRegistrations = registrations.length;
    const confirmedRegistrations = registrations.filter(reg => reg.status === 'confirmed').length;
    const pendingRegistrations = registrations.filter(reg => reg.status === 'pending').length;

    // Calculate commission amounts with proper numeric conversion
    const totalCommissionEarned = registrations
      .filter(reg => reg.status === 'confirmed')
      .reduce((sum, reg) => sum + parseFloat(reg.commission_amount), 0);

    const totalCommissionPaid = payouts
      .filter(payout => payout.status === 'completed')
      .reduce((sum, payout) => sum + parseFloat(payout.amount), 0);

    const pendingCommission = payouts
      .filter(payout => payout.status === 'pending' || payout.status === 'processing')
      .reduce((sum, payout) => sum + parseFloat(payout.amount), 0);

    // Calculate available for payout (minimum IDR 100,000)
    const availableAmount = totalCommissionEarned - totalCommissionPaid - pendingCommission;
    const availableForPayout = availableAmount >= 100000 ? availableAmount : 0;

    return {
      total_registrations: totalRegistrations,
      confirmed_registrations: confirmedRegistrations,
      pending_registrations: pendingRegistrations,
      total_commission_earned: totalCommissionEarned,
      total_commission_paid: totalCommissionPaid,
      pending_commission: pendingCommission,
      available_for_payout: availableForPayout
    };
  } catch (error) {
    console.error('Failed to get affiliate statistics:', error);
    throw error;
  }
};