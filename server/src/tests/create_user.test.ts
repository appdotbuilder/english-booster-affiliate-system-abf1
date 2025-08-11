import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input for admin user
const adminInput: CreateUserInput = {
  email: 'admin@test.com',
  password_hash: 'hashed_password_123',
  full_name: 'Admin User',
  phone: '+62812345678',
  role: 'admin'
};

// Test input for affiliate user
const affiliateInput: CreateUserInput = {
  email: 'affiliate@test.com',
  password_hash: 'hashed_password_456',
  full_name: 'Affiliate User',
  phone: null,
  role: 'affiliate'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an admin user', async () => {
    const result = await createUser(adminInput);

    // Basic field validation
    expect(result.email).toEqual('admin@test.com');
    expect(result.password_hash).toEqual('hashed_password_123');
    expect(result.full_name).toEqual('Admin User');
    expect(result.phone).toEqual('+62812345678');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an affiliate user', async () => {
    const result = await createUser(affiliateInput);

    // Basic field validation
    expect(result.email).toEqual('affiliate@test.com');
    expect(result.password_hash).toEqual('hashed_password_456');
    expect(result.full_name).toEqual('Affiliate User');
    expect(result.phone).toBeNull();
    expect(result.role).toEqual('affiliate');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(adminInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('admin@test.com');
    expect(users[0].password_hash).toEqual('hashed_password_123');
    expect(users[0].full_name).toEqual('Admin User');
    expect(users[0].phone).toEqual('+62812345678');
    expect(users[0].role).toEqual('admin');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null phone number', async () => {
    const result = await createUser(affiliateInput);

    // Verify null phone is stored correctly
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].phone).toBeNull();
  });

  it('should generate unique IDs for multiple users', async () => {
    const user1 = await createUser({
      ...adminInput,
      email: 'user1@test.com'
    });

    const user2 = await createUser({
      ...affiliateInput,
      email: 'user2@test.com'
    });

    expect(user1.id).not.toEqual(user2.id);
    expect(typeof user1.id).toBe('number');
    expect(typeof user2.id).toBe('number');
  });

  it('should set timestamps automatically', async () => {
    const beforeCreation = new Date();
    const result = await createUser(adminInput);
    const afterCreation = new Date();

    // Check that timestamps are within expected range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should throw error for duplicate email', async () => {
    // Create first user
    await createUser(adminInput);

    // Attempt to create second user with same email should fail
    await expect(createUser(adminInput)).rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should handle different user roles correctly', async () => {
    const admin = await createUser({
      email: 'admin@test.com',
      password_hash: 'hash1',
      full_name: 'Admin User',
      phone: '+62123456789',
      role: 'admin'
    });

    const affiliate = await createUser({
      email: 'affiliate@test.com',
      password_hash: 'hash2',
      full_name: 'Affiliate User',
      phone: '+62987654321',
      role: 'affiliate'
    });

    expect(admin.role).toEqual('admin');
    expect(affiliate.role).toEqual('affiliate');

    // Verify both are stored correctly
    const users = await db.select()
      .from(usersTable)
      .execute();

    expect(users).toHaveLength(2);
    const adminUser = users.find(u => u.role === 'admin');
    const affiliateUser = users.find(u => u.role === 'affiliate');
    
    expect(adminUser).toBeDefined();
    expect(affiliateUser).toBeDefined();
  });
});