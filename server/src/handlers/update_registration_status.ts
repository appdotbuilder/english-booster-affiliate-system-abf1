import { db } from '../db';
import { studentRegistrationsTable } from '../db/schema';
import { type UpdateRegistrationStatusInput, type StudentRegistration } from '../schema';
import { eq } from 'drizzle-orm';

export const updateRegistrationStatus = async (input: UpdateRegistrationStatusInput): Promise<StudentRegistration> => {
  try {
    // Prepare the update data
    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Set confirmed_by and confirmed_at when status changes to 'confirmed'
    if (input.status === 'confirmed') {
      updateData.confirmed_by = input.confirmed_by || null;
      updateData.confirmed_at = new Date();
    } else {
      // Clear confirmation fields for other statuses
      updateData.confirmed_by = null;
      updateData.confirmed_at = null;
    }

    // Update the registration
    const result = await db.update(studentRegistrationsTable)
      .set(updateData)
      .where(eq(studentRegistrationsTable.id, input.registration_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Student registration with ID ${input.registration_id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const registration = result[0];
    return {
      ...registration,
      registration_fee: parseFloat(registration.registration_fee),
      commission_amount: parseFloat(registration.commission_amount)
    };
  } catch (error) {
    console.error('Registration status update failed:', error);
    throw error;
  }
};