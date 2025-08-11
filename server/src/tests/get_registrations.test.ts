import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, affiliatesTable, programsTable, studentRegistrationsTable } from '../db/schema';
import { getRegistrations } from '../handlers/get_registrations';

describe('getRegistrations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create admin user
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        full_name: 'Admin User',
        phone: '081234567890',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create affiliate user
    const affiliateUser = await db.insert(usersTable)
      .values({
        email: 'affiliate@test.com',
        password_hash: 'hashed_password',
        full_name: 'Affiliate User',
        phone: '081234567891',
        role: 'affiliate'
      })
      .returning()
      .execute();

    // Create second affiliate user
    const affiliateUser2 = await db.insert(usersTable)
      .values({
        email: 'affiliate2@test.com',
        password_hash: 'hashed_password',
        full_name: 'Affiliate User 2',
        phone: '081234567892',
        role: 'affiliate'
      })
      .returning()
      .execute();

    // Create affiliate
    const affiliate = await db.insert(affiliatesTable)
      .values({
        user_id: affiliateUser[0].id,
        referral_code: 'REF001',
        bank_name: 'BCA',
        bank_account_number: '1234567890',
        bank_account_name: 'Affiliate User',
        commission_rate: '0.0500',
        status: 'approved',
        approved_by: adminUser[0].id,
        approved_at: new Date()
      })
      .returning()
      .execute();

    // Create second affiliate
    const affiliate2 = await db.insert(affiliatesTable)
      .values({
        user_id: affiliateUser2[0].id,
        referral_code: 'REF002',
        bank_name: 'BNI',
        bank_account_number: '0987654321',
        bank_account_name: 'Affiliate User 2',
        commission_rate: '0.0300',
        status: 'approved',
        approved_by: adminUser[0].id,
        approved_at: new Date()
      })
      .returning()
      .execute();

    // Create program
    const program = await db.insert(programsTable)
      .values({
        name: 'English Course',
        description: 'Basic English Course',
        category: 'online',
        location: 'online',
        price: '2000000.00',
        duration_weeks: 12,
        is_active: true
      })
      .returning()
      .execute();

    return {
      adminUser: adminUser[0],
      affiliateUser: affiliateUser[0],
      affiliateUser2: affiliateUser2[0],
      affiliate: affiliate[0],
      affiliate2: affiliate2[0],
      program: program[0]
    };
  };

  it('should return all registrations when no affiliate filter is provided', async () => {
    const testData = await createTestData();

    // Create registrations for both affiliates
    await db.insert(studentRegistrationsTable)
      .values([
        {
          affiliate_id: testData.affiliate.id,
          program_id: testData.program.id,
          student_name: 'John Doe',
          student_email: 'john@test.com',
          student_phone: '081111111111',
          student_address: 'Jakarta',
          referral_code: 'REF001',
          status: 'confirmed',
          registration_fee: '2000000.00',
          commission_amount: '100000.00',
          confirmed_by: testData.adminUser.id,
          confirmed_at: new Date()
        },
        {
          affiliate_id: testData.affiliate2.id,
          program_id: testData.program.id,
          student_name: 'Jane Smith',
          student_email: 'jane@test.com',
          student_phone: '082222222222',
          student_address: 'Surabaya',
          referral_code: 'REF002',
          status: 'pending',
          registration_fee: '2000000.00',
          commission_amount: '60000.00'
        }
      ])
      .execute();

    const result = await getRegistrations();

    expect(result).toHaveLength(2);
    
    // Verify numeric conversions
    result.forEach(registration => {
      expect(typeof registration.registration_fee).toBe('number');
      expect(typeof registration.commission_amount).toBe('number');
      expect(registration.registration_fee).toBe(2000000);
    });

    // Verify ordering (newest first)
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should return only registrations for specific affiliate when filtered', async () => {
    const testData = await createTestData();

    // Create registrations for both affiliates
    await db.insert(studentRegistrationsTable)
      .values([
        {
          affiliate_id: testData.affiliate.id,
          program_id: testData.program.id,
          student_name: 'John Doe',
          student_email: 'john@test.com',
          student_phone: '081111111111',
          student_address: 'Jakarta',
          referral_code: 'REF001',
          status: 'confirmed',
          registration_fee: '2000000.00',
          commission_amount: '100000.00',
          confirmed_by: testData.adminUser.id,
          confirmed_at: new Date()
        },
        {
          affiliate_id: testData.affiliate2.id,
          program_id: testData.program.id,
          student_name: 'Jane Smith',
          student_email: 'jane@test.com',
          student_phone: '082222222222',
          student_address: 'Surabaya',
          referral_code: 'REF002',
          status: 'pending',
          registration_fee: '2000000.00',
          commission_amount: '60000.00'
        }
      ])
      .execute();

    const result = await getRegistrations(testData.affiliate.id);

    expect(result).toHaveLength(1);
    expect(result[0].affiliate_id).toBe(testData.affiliate.id);
    expect(result[0].student_name).toBe('John Doe');
    expect(result[0].referral_code).toBe('REF001');
    expect(result[0].status).toBe('confirmed');
    expect(result[0].registration_fee).toBe(2000000);
    expect(result[0].commission_amount).toBe(100000);
  });

  it('should return empty array when affiliate has no registrations', async () => {
    const testData = await createTestData();

    const result = await getRegistrations(testData.affiliate.id);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when non-existent affiliate id is provided', async () => {
    await createTestData();

    const result = await getRegistrations(99999);

    expect(result).toHaveLength(0);
  });

  it('should include all required registration fields', async () => {
    const testData = await createTestData();

    await db.insert(studentRegistrationsTable)
      .values({
        affiliate_id: testData.affiliate.id,
        program_id: testData.program.id,
        student_name: 'Test Student',
        student_email: 'test@student.com',
        student_phone: '083333333333',
        student_address: 'Test Address',
        referral_code: 'REF001',
        status: 'pending',
        registration_fee: '1500000.00',
        commission_amount: '75000.00'
      })
      .execute();

    const result = await getRegistrations(testData.affiliate.id);

    expect(result).toHaveLength(1);
    
    const registration = result[0];
    expect(registration.id).toBeDefined();
    expect(registration.affiliate_id).toBe(testData.affiliate.id);
    expect(registration.program_id).toBe(testData.program.id);
    expect(registration.student_name).toBe('Test Student');
    expect(registration.student_email).toBe('test@student.com');
    expect(registration.student_phone).toBe('083333333333');
    expect(registration.student_address).toBe('Test Address');
    expect(registration.referral_code).toBe('REF001');
    expect(registration.status).toBe('pending');
    expect(registration.registration_fee).toBe(1500000);
    expect(registration.commission_amount).toBe(75000);
    expect(registration.confirmed_by).toBeNull();
    expect(registration.confirmed_at).toBeNull();
    expect(registration.created_at).toBeInstanceOf(Date);
    expect(registration.updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple registrations for same affiliate ordered by creation date', async () => {
    const testData = await createTestData();

    // Create registrations with slight delay to ensure different timestamps
    const firstRegistration = await db.insert(studentRegistrationsTable)
      .values({
        affiliate_id: testData.affiliate.id,
        program_id: testData.program.id,
        student_name: 'First Student',
        student_email: 'first@test.com',
        student_phone: '081111111111',
        referral_code: 'REF001',
        status: 'confirmed',
        registration_fee: '2000000.00',
        commission_amount: '100000.00'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondRegistration = await db.insert(studentRegistrationsTable)
      .values({
        affiliate_id: testData.affiliate.id,
        program_id: testData.program.id,
        student_name: 'Second Student',
        student_email: 'second@test.com',
        student_phone: '082222222222',
        referral_code: 'REF001',
        status: 'pending',
        registration_fee: '1800000.00',
        commission_amount: '90000.00'
      })
      .returning()
      .execute();

    const result = await getRegistrations(testData.affiliate.id);

    expect(result).toHaveLength(2);
    
    // Should be ordered by creation date (newest first)
    expect(result[0].student_name).toBe('Second Student');
    expect(result[1].student_name).toBe('First Student');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });
});