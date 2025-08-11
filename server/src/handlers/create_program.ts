import { db } from '../db';
import { programsTable } from '../db/schema';
import { type CreateProgramInput, type Program } from '../schema';

export const createProgram = async (input: CreateProgramInput): Promise<Program> => {
  try {
    // Insert program record
    const result = await db.insert(programsTable)
      .values({
        name: input.name,
        description: input.description,
        category: input.category,
        location: input.location,
        price: input.price.toString(), // Convert number to string for numeric column
        duration_weeks: input.duration_weeks, // Integer column - no conversion needed
        is_active: input.is_active // Boolean column - no conversion needed
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const program = result[0];
    return {
      ...program,
      price: parseFloat(program.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Program creation failed:', error);
    throw error;
  }
};