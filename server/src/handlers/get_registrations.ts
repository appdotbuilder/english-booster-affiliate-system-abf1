import { db } from '../db';
import { studentRegistrationsTable, affiliatesTable, programsTable, usersTable } from '../db/schema';
import { type StudentRegistration } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getRegistrations = async (affiliateId?: number): Promise<StudentRegistration[]> => {
  try {
    // Build base query
    const baseQuery = db.select({
      id: studentRegistrationsTable.id,
      affiliate_id: studentRegistrationsTable.affiliate_id,
      program_id: studentRegistrationsTable.program_id,
      student_name: studentRegistrationsTable.student_name,
      student_email: studentRegistrationsTable.student_email,
      student_phone: studentRegistrationsTable.student_phone,
      student_address: studentRegistrationsTable.student_address,
      referral_code: studentRegistrationsTable.referral_code,
      status: studentRegistrationsTable.status,
      registration_fee: studentRegistrationsTable.registration_fee,
      commission_amount: studentRegistrationsTable.commission_amount,
      confirmed_by: studentRegistrationsTable.confirmed_by,
      confirmed_at: studentRegistrationsTable.confirmed_at,
      created_at: studentRegistrationsTable.created_at,
      updated_at: studentRegistrationsTable.updated_at,
    })
    .from(studentRegistrationsTable)
    .innerJoin(affiliatesTable, eq(studentRegistrationsTable.affiliate_id, affiliatesTable.id))
    .innerJoin(programsTable, eq(studentRegistrationsTable.program_id, programsTable.id));

    // Apply conditional filtering and execute in one chain
    const results = affiliateId !== undefined
      ? await baseQuery
          .where(eq(studentRegistrationsTable.affiliate_id, affiliateId))
          .orderBy(desc(studentRegistrationsTable.created_at))
          .execute()
      : await baseQuery
          .orderBy(desc(studentRegistrationsTable.created_at))
          .execute();

    // Convert numeric fields back to numbers
    return results.map(registration => ({
      ...registration,
      registration_fee: parseFloat(registration.registration_fee),
      commission_amount: parseFloat(registration.commission_amount)
    }));
  } catch (error) {
    console.error('Getting registrations failed:', error);
    throw error;
  }
};