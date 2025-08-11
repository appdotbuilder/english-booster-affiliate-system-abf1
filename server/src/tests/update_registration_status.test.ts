import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable, programsTable, studentRegistrationsTable } from '../db/schema';
import { type UpdateRegistrationStatusInput } from '../schema';
import { updateRegistrationStatus } from '../handlers/update_registration_status';
import { eq } from 'drizzle-orm';

describe('updateRegistrationStatus', () => {
  let adminUserId: number;
  let affiliateUserId: number;
  let affiliateId: number;
  let programId: number;
  let registrationId: number;

  beforeEach(async () => {
    await createDB();

    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Admin User',
        phone: '081234567890',
        role: 'admin'
      })
      .returning()
      .execute();
    adminUserId = adminResult[0].id;

    // Create affiliate user
    const affiliateUserResult = await db.insert(usersTable)
      .values({
        email: 'affiliate@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Affiliate User',
        phone: '081234567891',
        role: 'affiliate'
      })
      .returning()
      .execute();
    affiliateUserId = affiliateUserResult[0].id;

    // Create affiliate
    const affiliateResult = await db.insert(affiliatesTable)
      .values({
        user_id: affiliateUserId,
        referral_code: 'TESTREF123',
        commission_rate: '0.0500', // 5%
        status: 'approved'
      })
      .returning()
      .execute();
    affiliateId = affiliateResult[0].id;

    // Create program
    const programResult = await db.insert(programsTable)
      .values({
        name: 'Test Program',
        description: 'A test program',
        category: 'online',
        location: 'online',
        price: '1000000.00', // IDR 1,000,000
        duration_weeks: 12,
        is_active: true
      })
      .returning()
      .execute();
    programId = programResult[0].id;

    // Create student registration
    const registrationResult = await db.insert(studentRegistrationsTable)
      .values({
        affiliate_id: affiliateId,
        program_id: programId,
        student_name: 'Test Student',
        student_email: 'student@test.com',
        student_phone: '081234567892',
        student_address: 'Test Address',
        referral_code: 'TESTREF123',
        status: 'pending',
        registration_fee: '1000000.00',
        commission_amount: '50000.00' // 5% of 1,000,000
      })
      .returning()
      .execute();
    registrationId = registrationResult[0].id;
  });

  afterEach(resetDB);

  it('should update registration status to confirmed', async () => {
    const input: UpdateRegistrationStatusInput = {
      registration_id: registrationId,
      status: 'confirmed',
      confirmed_by: adminUserId
    };

    const result = await updateRegistrationStatus(input);

    expect(result.id).toEqual(registrationId);
    expect(result.status).toEqual('confirmed');
    expect(result.confirmed_by).toEqual(adminUserId);
    expect(result.confirmed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify numeric fields are properly converted
    expect(typeof result.registration_fee).toBe('number');
    expect(typeof result.commission_amount).toBe('number');
    expect(result.registration_fee).toEqual(1000000);
    expect(result.commission_amount).toEqual(50000);
  });

  it('should update registration status to confirmed without confirmed_by', async () => {
    const input: UpdateRegistrationStatusInput = {
      registration_id: registrationId,
      status: 'confirmed'
    };

    const result = await updateRegistrationStatus(input);

    expect(result.status).toEqual('confirmed');
    expect(result.confirmed_by).toBeNull();
    expect(result.confirmed_at).toBeInstanceOf(Date);
  });

  it('should update registration status to cancelled', async () => {
    const input: UpdateRegistrationStatusInput = {
      registration_id: registrationId,
      status: 'cancelled'
    };

    const result = await updateRegistrationStatus(input);

    expect(result.status).toEqual('cancelled');
    expect(result.confirmed_by).toBeNull();
    expect(result.confirmed_at).toBeNull();
  });

  it('should clear confirmation fields when status changes from confirmed to pending', async () => {
    // First confirm the registration
    await updateRegistrationStatus({
      registration_id: registrationId,
      status: 'confirmed',
      confirmed_by: adminUserId
    });

    // Then change back to pending
    const input: UpdateRegistrationStatusInput = {
      registration_id: registrationId,
      status: 'pending'
    };

    const result = await updateRegistrationStatus(input);

    expect(result.status).toEqual('pending');
    expect(result.confirmed_by).toBeNull();
    expect(result.confirmed_at).toBeNull();
  });

  it('should save updated registration to database', async () => {
    const input: UpdateRegistrationStatusInput = {
      registration_id: registrationId,
      status: 'confirmed',
      confirmed_by: adminUserId
    };

    await updateRegistrationStatus(input);

    // Verify in database
    const registrations = await db.select()
      .from(studentRegistrationsTable)
      .where(eq(studentRegistrationsTable.id, registrationId))
      .execute();

    expect(registrations).toHaveLength(1);
    const registration = registrations[0];
    expect(registration.status).toEqual('confirmed');
    expect(registration.confirmed_by).toEqual(adminUserId);
    expect(registration.confirmed_at).toBeInstanceOf(Date);
    expect(registration.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent registration', async () => {
    const input: UpdateRegistrationStatusInput = {
      registration_id: 99999,
      status: 'confirmed',
      confirmed_by: adminUserId
    };

    expect(updateRegistrationStatus(input)).rejects.toThrow(/not found/i);
  });

  it('should preserve all other registration fields', async () => {
    const input: UpdateRegistrationStatusInput = {
      registration_id: registrationId,
      status: 'confirmed',
      confirmed_by: adminUserId
    };

    const result = await updateRegistrationStatus(input);

    // Check that all original fields are preserved
    expect(result.affiliate_id).toEqual(affiliateId);
    expect(result.program_id).toEqual(programId);
    expect(result.student_name).toEqual('Test Student');
    expect(result.student_email).toEqual('student@test.com');
    expect(result.student_phone).toEqual('081234567892');
    expect(result.student_address).toEqual('Test Address');
    expect(result.referral_code).toEqual('TESTREF123');
    expect(result.registration_fee).toEqual(1000000);
    expect(result.commission_amount).toEqual(50000);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle status change with different confirmed_by values', async () => {
    // Create another admin user
    const anotherAdminResult = await db.insert(usersTable)
      .values({
        email: 'admin2@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Another Admin',
        phone: '081234567893',
        role: 'admin'
      })
      .returning()
      .execute();
    const anotherAdminId = anotherAdminResult[0].id;

    const input: UpdateRegistrationStatusInput = {
      registration_id: registrationId,
      status: 'confirmed',
      confirmed_by: anotherAdminId
    };

    const result = await updateRegistrationStatus(input);

    expect(result.confirmed_by).toEqual(anotherAdminId);
    expect(result.status).toEqual('confirmed');
  });
});