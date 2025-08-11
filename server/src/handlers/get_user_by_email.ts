import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const user = results[0];
    return {
      ...user,
      // No numeric conversions needed - all fields are already in correct types
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Get user by email failed:', error);
    throw error;
  }
};