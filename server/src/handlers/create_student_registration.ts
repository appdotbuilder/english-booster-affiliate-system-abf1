import { db } from '../db';
import { studentRegistrationsTable, affiliatesTable, programsTable } from '../db/schema';
import { type CreateStudentRegistrationInput, type StudentRegistration } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createStudentRegistration = async (input: CreateStudentRegistrationInput): Promise<StudentRegistration> => {
  try {
    // Validate that the affiliate exists and has the matching referral code
    const affiliate = await db.select()
      .from(affiliatesTable)
      .where(
        and(
          eq(affiliatesTable.id, input.affiliate_id),
          eq(affiliatesTable.referral_code, input.referral_code)
        )
      )
      .execute();

    if (affiliate.length === 0) {
      throw new Error('Invalid affiliate ID or referral code');
    }

    // Check that the affiliate is approved
    if (affiliate[0].status !== 'approved') {
      throw new Error('Affiliate is not approved for registrations');
    }

    // Validate that the program exists and is active
    const program = await db.select()
      .from(programsTable)
      .where(eq(programsTable.id, input.program_id))
      .execute();

    if (program.length === 0) {
      throw new Error('Program not found');
    }

    if (!program[0].is_active) {
      throw new Error('Program is not active');
    }

    // Calculate commission amount based on program price and affiliate commission rate
    const programPrice = parseFloat(program[0].price);
    const commissionRate = parseFloat(affiliate[0].commission_rate);
    const commissionAmount = programPrice * commissionRate;

    // Insert the student registration
    const result = await db.insert(studentRegistrationsTable)
      .values({
        affiliate_id: input.affiliate_id,
        program_id: input.program_id,
        student_name: input.student_name,
        student_email: input.student_email,
        student_phone: input.student_phone,
        student_address: input.student_address,
        referral_code: input.referral_code,
        status: 'pending',
        registration_fee: programPrice.toString(),
        commission_amount: commissionAmount.toString(),
        confirmed_by: null,
        confirmed_at: null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const registration = result[0];
    return {
      ...registration,
      registration_fee: parseFloat(registration.registration_fee),
      commission_amount: parseFloat(registration.commission_amount)
    };
  } catch (error) {
    console.error('Student registration creation failed:', error);
    throw error;
  }
};