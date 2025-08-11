import { db } from '../db';
import { programsTable } from '../db/schema';
import { type Program, type ProgramCategory, type ProgramLocation } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export interface GetProgramsFilters {
  is_active?: boolean;
  category?: ProgramCategory;
  location?: ProgramLocation;
}

export const getPrograms = async (filters: GetProgramsFilters = {}): Promise<Program[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (filters.is_active !== undefined) {
      conditions.push(eq(programsTable.is_active, filters.is_active));
    }

    if (filters.category) {
      conditions.push(eq(programsTable.category, filters.category));
    }

    if (filters.location) {
      conditions.push(eq(programsTable.location, filters.location));
    }

    // Build and execute query
    const results = conditions.length === 0
      ? await db.select().from(programsTable).execute()
      : await db.select()
          .from(programsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute();

    // Convert numeric fields back to numbers
    return results.map(program => ({
      ...program,
      price: parseFloat(program.price)
    }));
  } catch (error) {
    console.error('Failed to fetch programs:', error);
    throw error;
  }
};