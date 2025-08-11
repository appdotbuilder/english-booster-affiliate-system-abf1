import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserByEmail } from '../handlers/get_user_by_email';

// Test user inputs
const testUser1: CreateUserInput = {
  email: 'john@example.com',
  password_hash: 'hashed_password_123',
  full_name: 'John Doe',
  phone: '+1234567890',
  role: 'affiliate'
};

const testUser2: CreateUserInput = {
  email: 'admin@test.com',
  password_hash: 'admin_hash_456',
  full_name: 'Admin User',
  phone: null,
  role: 'admin'
};

describe('getUserByEmail', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when email exists', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Test getting user by email
    const result = await getUserByEmail('john@example.com');

    // Verify user data
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('john@example.com');
    expect(result!.password_hash).toEqual('hashed_password_123');
    expect(result!.full_name).toEqual('John Doe');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.role).toEqual('affiliate');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when email does not exist', async () => {
    // Create a user with different email
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    // Test getting user with non-existent email
    const result = await getUserByEmail('nonexistent@example.com');

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    await db.insert(usersTable)
      .values([testUser1, testUser2])
      .execute();

    // Test getting specific user by email
    const result = await getUserByEmail('admin@test.com');

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('admin@test.com');
    expect(result!.full_name).toEqual('Admin User');
    expect(result!.phone).toBeNull();
    expect(result!.role).toEqual('admin');
  });

  it('should handle email case sensitivity correctly', async () => {
    // Create test user with lowercase email
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    // Test with different case variations - PostgreSQL is case sensitive by default
    const upperCaseResult = await getUserByEmail('JOHN@EXAMPLE.COM');
    const mixedCaseResult = await getUserByEmail('John@Example.Com');

    expect(upperCaseResult).toBeNull();
    expect(mixedCaseResult).toBeNull();

    // But exact match should work
    const exactResult = await getUserByEmail('john@example.com');
    expect(exactResult).not.toBeNull();
    expect(exactResult!.email).toEqual('john@example.com');
  });

  it('should return user with null phone field correctly', async () => {
    // Create user with null phone
    const insertResult = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    const result = await getUserByEmail('admin@test.com');

    expect(result).not.toBeNull();
    expect(result!.phone).toBeNull();
    expect(result!.email).toEqual('admin@test.com');
    expect(result!.full_name).toEqual('Admin User');
  });

  it('should handle empty email parameter', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    // Test with empty email
    const result = await getUserByEmail('');

    expect(result).toBeNull();
  });

  it('should handle whitespace in email parameter', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    // Test with email containing whitespace
    const resultWithSpaces = await getUserByEmail(' john@example.com ');
    const resultWithTabs = await getUserByEmail('\tjohn@example.com\t');

    expect(resultWithSpaces).toBeNull();
    expect(resultWithTabs).toBeNull();

    // Exact match should still work
    const exactResult = await getUserByEmail('john@example.com');
    expect(exactResult).not.toBeNull();
  });

  it('should maintain timestamp types correctly', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    const result = await getUserByEmail('john@example.com');

    expect(result).not.toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    
    // Verify timestamps match what was inserted
    expect(result!.created_at.getTime()).toEqual(insertResult[0].created_at.getTime());
    expect(result!.updated_at.getTime()).toEqual(insertResult[0].updated_at.getTime());
  });
});