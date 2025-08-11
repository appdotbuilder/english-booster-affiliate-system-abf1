import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable, programsTable, studentRegistrationsTable } from '../db/schema';
import { type CreateStudentRegistrationInput } from '../schema';
import { createStudentRegistration } from '../handlers/create_student_registration';
import { eq } from 'drizzle-orm';

describe('createStudentRegistration', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testAffiliate: any;
  let testProgram: any;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'affiliate@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Affiliate',
        phone: '+1234567890',
        role: 'affiliate'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create approved affiliate
    const affiliateResult = await db.insert(affiliatesTable)
      .values({
        user_id: testUser.id,
        referral_code: 'TESTREF123',
        bank_name: 'Test Bank',
        bank_account_number: '1234567890',
        bank_account_name: 'Test Affiliate',
        commission_rate: '0.0500', // 5%
        status: 'approved'
      })
      .returning()
      .execute();
    testAffiliate = affiliateResult[0];

    // Create active program
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
    testProgram = programResult[0];
  });

  const testInput: CreateStudentRegistrationInput = {
    affiliate_id: 0, // Will be set in tests
    program_id: 0, // Will be set in tests
    student_name: 'John Doe',
    student_email: 'john.doe@example.com',
    student_phone: '+1234567891',
    student_address: '123 Test Street, Test City',
    referral_code: 'TESTREF123'
  };

  it('should create a student registration successfully', async () => {
    const input = {
      ...testInput,
      affiliate_id: testAffiliate.id,
      program_id: testProgram.id
    };

    const result = await createStudentRegistration(input);

    // Verify basic fields
    expect(result.id).toBeDefined();
    expect(result.affiliate_id).toEqual(testAffiliate.id);
    expect(result.program_id).toEqual(testProgram.id);
    expect(result.student_name).toEqual('John Doe');
    expect(result.student_email).toEqual('john.doe@example.com');
    expect(result.student_phone).toEqual('+1234567891');
    expect(result.student_address).toEqual('123 Test Street, Test City');
    expect(result.referral_code).toEqual('TESTREF123');
    expect(result.status).toEqual('pending');
    
    // Verify calculated fields
    expect(result.registration_fee).toEqual(1000000);
    expect(typeof result.registration_fee).toEqual('number');
    expect(result.commission_amount).toEqual(50000); // 5% of 1,000,000
    expect(typeof result.commission_amount).toEqual('number');
    
    // Verify null fields
    expect(result.confirmed_by).toBeNull();
    expect(result.confirmed_at).toBeNull();
    
    // Verify timestamps
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save registration to database correctly', async () => {
    const input = {
      ...testInput,
      affiliate_id: testAffiliate.id,
      program_id: testProgram.id
    };

    const result = await createStudentRegistration(input);

    // Query database to verify record was saved
    const savedRegistrations = await db.select()
      .from(studentRegistrationsTable)
      .where(eq(studentRegistrationsTable.id, result.id))
      .execute();

    expect(savedRegistrations).toHaveLength(1);
    const saved = savedRegistrations[0];
    expect(saved.student_name).toEqual('John Doe');
    expect(saved.student_email).toEqual('john.doe@example.com');
    expect(parseFloat(saved.registration_fee)).toEqual(1000000);
    expect(parseFloat(saved.commission_amount)).toEqual(50000);
    expect(saved.status).toEqual('pending');
  });

  it('should calculate commission correctly with different rates', async () => {
    // Create another user for the high commission affiliate
    const anotherUser = await db.insert(usersTable)
      .values({
        email: 'affiliate2@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Affiliate 2',
        phone: '+1234567892',
        role: 'affiliate'
      })
      .returning()
      .execute();

    // Create affiliate with 10% commission rate
    const highCommissionAffiliate = await db.insert(affiliatesTable)
      .values({
        user_id: anotherUser[0].id,
        referral_code: 'HIGHCOM10',
        commission_rate: '0.1000', // 10%
        status: 'approved'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      affiliate_id: highCommissionAffiliate[0].id,
      program_id: testProgram.id,
      referral_code: 'HIGHCOM10'
    };

    const result = await createStudentRegistration(input);

    expect(result.commission_amount).toEqual(100000); // 10% of 1,000,000
  });

  it('should throw error for invalid affiliate ID', async () => {
    const input = {
      ...testInput,
      affiliate_id: 99999, // Non-existent ID
      program_id: testProgram.id
    };

    await expect(createStudentRegistration(input))
      .rejects
      .toThrow(/invalid affiliate id or referral code/i);
  });

  it('should throw error for mismatched referral code', async () => {
    const input = {
      ...testInput,
      affiliate_id: testAffiliate.id,
      program_id: testProgram.id,
      referral_code: 'WRONGCODE'
    };

    await expect(createStudentRegistration(input))
      .rejects
      .toThrow(/invalid affiliate id or referral code/i);
  });

  it('should throw error for non-approved affiliate', async () => {
    // Create another user for the pending affiliate
    const pendingUser = await db.insert(usersTable)
      .values({
        email: 'pending@test.com',
        password_hash: 'hashed_password',
        full_name: 'Pending Affiliate',
        phone: '+1234567893',
        role: 'affiliate'
      })
      .returning()
      .execute();

    // Create pending affiliate
    const pendingAffiliate = await db.insert(affiliatesTable)
      .values({
        user_id: pendingUser[0].id,
        referral_code: 'PENDING123',
        commission_rate: '0.0500',
        status: 'pending'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      affiliate_id: pendingAffiliate[0].id,
      program_id: testProgram.id,
      referral_code: 'PENDING123'
    };

    await expect(createStudentRegistration(input))
      .rejects
      .toThrow(/affiliate is not approved/i);
  });

  it('should throw error for non-existent program', async () => {
    const input = {
      ...testInput,
      affiliate_id: testAffiliate.id,
      program_id: 99999 // Non-existent program
    };

    await expect(createStudentRegistration(input))
      .rejects
      .toThrow(/program not found/i);
  });

  it('should throw error for inactive program', async () => {
    // Create inactive program
    const inactiveProgram = await db.insert(programsTable)
      .values({
        name: 'Inactive Program',
        category: 'online',
        location: 'online',
        price: '500000.00',
        is_active: false
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      affiliate_id: testAffiliate.id,
      program_id: inactiveProgram[0].id
    };

    await expect(createStudentRegistration(input))
      .rejects
      .toThrow(/program is not active/i);
  });

  it('should handle null student address', async () => {
    const input = {
      ...testInput,
      affiliate_id: testAffiliate.id,
      program_id: testProgram.id,
      student_address: null
    };

    const result = await createStudentRegistration(input);

    expect(result.student_address).toBeNull();
  });

  it('should work with different program categories and locations', async () => {
    // Create offline program
    const offlineProgram = await db.insert(programsTable)
      .values({
        name: 'Offline Program',
        category: 'offline_pare',
        location: 'pare',
        price: '2000000.00',
        duration_weeks: 8,
        is_active: true
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      affiliate_id: testAffiliate.id,
      program_id: offlineProgram[0].id
    };

    const result = await createStudentRegistration(input);

    expect(result.registration_fee).toEqual(2000000);
    expect(result.commission_amount).toEqual(100000); // 5% of 2,000,000
  });
});