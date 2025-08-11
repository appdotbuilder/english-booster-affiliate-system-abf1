import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { programsTable } from '../db/schema';
import { type CreateProgramInput } from '../schema';
import { getPrograms, type GetProgramsFilters } from '../handlers/get_programs';

// Test program inputs
const testPrograms: CreateProgramInput[] = [
  {
    name: 'Online TOEFL Prep',
    description: 'Comprehensive TOEFL preparation course',
    category: 'online',
    location: 'online',
    price: 1500000,
    duration_weeks: 8,
    is_active: true
  },
  {
    name: 'Pare Intensive English',
    description: 'Intensive English course at Pare location',
    category: 'offline_pare',
    location: 'pare',
    price: 2000000,
    duration_weeks: 12,
    is_active: true
  },
  {
    name: 'Malang Group Class',
    description: 'Group English classes in Malang',
    category: 'group',
    location: 'malang',
    price: 800000,
    duration_weeks: 6,
    is_active: true
  },
  {
    name: 'Inactive Program',
    description: 'This program is no longer active',
    category: 'branch',
    location: 'sidoarjo',
    price: 1200000,
    duration_weeks: 10,
    is_active: false
  }
];

describe('getPrograms', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all programs when no filters applied', async () => {
    // Create test programs
    for (const program of testPrograms) {
      await db.insert(programsTable)
        .values({
          ...program,
          price: program.price.toString()
        })
        .execute();
    }

    const result = await getPrograms();

    expect(result).toHaveLength(4);
    expect(result[0].name).toEqual('Online TOEFL Prep');
    expect(result[0].price).toEqual(1500000);
    expect(typeof result[0].price).toBe('number');
    expect(result[0].is_active).toBe(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter by active status', async () => {
    // Create test programs
    for (const program of testPrograms) {
      await db.insert(programsTable)
        .values({
          ...program,
          price: program.price.toString()
        })
        .execute();
    }

    const filters: GetProgramsFilters = { is_active: true };
    const result = await getPrograms(filters);

    expect(result).toHaveLength(3);
    result.forEach(program => {
      expect(program.is_active).toBe(true);
    });
  });

  it('should filter by inactive status', async () => {
    // Create test programs
    for (const program of testPrograms) {
      await db.insert(programsTable)
        .values({
          ...program,
          price: program.price.toString()
        })
        .execute();
    }

    const filters: GetProgramsFilters = { is_active: false };
    const result = await getPrograms(filters);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Inactive Program');
    expect(result[0].is_active).toBe(false);
  });

  it('should filter by category', async () => {
    // Create test programs
    for (const program of testPrograms) {
      await db.insert(programsTable)
        .values({
          ...program,
          price: program.price.toString()
        })
        .execute();
    }

    const filters: GetProgramsFilters = { category: 'online' };
    const result = await getPrograms(filters);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Online TOEFL Prep');
    expect(result[0].category).toEqual('online');
  });

  it('should filter by location', async () => {
    // Create test programs
    for (const program of testPrograms) {
      await db.insert(programsTable)
        .values({
          ...program,
          price: program.price.toString()
        })
        .execute();
    }

    const filters: GetProgramsFilters = { location: 'pare' };
    const result = await getPrograms(filters);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Pare Intensive English');
    expect(result[0].location).toEqual('pare');
  });

  it('should apply multiple filters', async () => {
    // Create test programs
    for (const program of testPrograms) {
      await db.insert(programsTable)
        .values({
          ...program,
          price: program.price.toString()
        })
        .execute();
    }

    const filters: GetProgramsFilters = { 
      is_active: true,
      category: 'group'
    };
    const result = await getPrograms(filters);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Malang Group Class');
    expect(result[0].is_active).toBe(true);
    expect(result[0].category).toEqual('group');
  });

  it('should return empty array when no programs match filters', async () => {
    // Create test programs
    for (const program of testPrograms) {
      await db.insert(programsTable)
        .values({
          ...program,
          price: program.price.toString()
        })
        .execute();
    }

    const filters: GetProgramsFilters = { 
      category: 'online',
      location: 'malang' // No online programs in Malang
    };
    const result = await getPrograms(filters);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no programs exist', async () => {
    const result = await getPrograms();

    expect(result).toHaveLength(0);
  });

  it('should handle numeric price conversion correctly', async () => {
    // Create a single test program
    await db.insert(programsTable)
      .values({
        name: 'Price Test Program',
        description: 'Testing price conversion',
        category: 'online',
        location: 'online',
        price: '2500000.50', // Store as string
        duration_weeks: 4,
        is_active: true
      })
      .execute();

    const result = await getPrograms();

    expect(result).toHaveLength(1);
    expect(result[0].price).toEqual(2500000.50);
    expect(typeof result[0].price).toBe('number');
  });

  it('should preserve all program fields', async () => {
    const testProgram = testPrograms[0];
    
    await db.insert(programsTable)
      .values({
        ...testProgram,
        price: testProgram.price.toString()
      })
      .execute();

    const result = await getPrograms();

    expect(result).toHaveLength(1);
    const program = result[0];
    
    expect(program.name).toEqual(testProgram.name);
    expect(program.description).toEqual(testProgram.description);
    expect(program.category).toEqual(testProgram.category);
    expect(program.location).toEqual(testProgram.location);
    expect(program.price).toEqual(testProgram.price);
    expect(program.duration_weeks).toEqual(testProgram.duration_weeks);
    expect(program.is_active).toEqual(testProgram.is_active);
    expect(program.id).toBeDefined();
    expect(program.created_at).toBeInstanceOf(Date);
    expect(program.updated_at).toBeInstanceOf(Date);
  });
});