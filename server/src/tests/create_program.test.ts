import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { programsTable } from '../db/schema';
import { type CreateProgramInput } from '../schema';
import { createProgram } from '../handlers/create_program';
import { eq, and, gte, lte } from 'drizzle-orm';

// Test inputs with all required fields
const testInput: CreateProgramInput = {
  name: 'Test English Course',
  description: 'A comprehensive English learning program',
  category: 'online',
  location: 'online',
  price: 2500000.00,
  duration_weeks: 12,
  is_active: true
};

const offlineTestInput: CreateProgramInput = {
  name: 'Offline English Course in Pare',
  description: 'Intensive English course in Pare village',
  category: 'offline_pare',
  location: 'pare',
  price: 3000000.00,
  duration_weeks: 8,
  is_active: false
};

describe('createProgram', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an online program', async () => {
    const result = await createProgram(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test English Course');
    expect(result.description).toEqual('A comprehensive English learning program');
    expect(result.category).toEqual('online');
    expect(result.location).toEqual('online');
    expect(result.price).toEqual(2500000.00);
    expect(typeof result.price).toBe('number');
    expect(result.duration_weeks).toEqual(12);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an offline program in Pare', async () => {
    const result = await createProgram(offlineTestInput);

    // Basic field validation
    expect(result.name).toEqual('Offline English Course in Pare');
    expect(result.description).toEqual('Intensive English course in Pare village');
    expect(result.category).toEqual('offline_pare');
    expect(result.location).toEqual('pare');
    expect(result.price).toEqual(3000000.00);
    expect(typeof result.price).toBe('number');
    expect(result.duration_weeks).toEqual(8);
    expect(result.is_active).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save program to database', async () => {
    const result = await createProgram(testInput);

    // Query using proper drizzle syntax
    const programs = await db.select()
      .from(programsTable)
      .where(eq(programsTable.id, result.id))
      .execute();

    expect(programs).toHaveLength(1);
    const savedProgram = programs[0];
    expect(savedProgram.name).toEqual('Test English Course');
    expect(savedProgram.description).toEqual(testInput.description);
    expect(savedProgram.category).toEqual('online');
    expect(savedProgram.location).toEqual('online');
    expect(parseFloat(savedProgram.price)).toEqual(2500000.00);
    expect(savedProgram.duration_weeks).toEqual(12);
    expect(savedProgram.is_active).toBe(true);
    expect(savedProgram.created_at).toBeInstanceOf(Date);
    expect(savedProgram.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description', async () => {
    const inputWithNullDescription: CreateProgramInput = {
      ...testInput,
      description: null
    };

    const result = await createProgram(inputWithNullDescription);

    expect(result.description).toBeNull();
    expect(result.name).toEqual(testInput.name);
    expect(result.price).toEqual(testInput.price);
  });

  it('should handle null duration_weeks', async () => {
    const inputWithNullDuration: CreateProgramInput = {
      ...testInput,
      duration_weeks: null
    };

    const result = await createProgram(inputWithNullDuration);

    expect(result.duration_weeks).toBeNull();
    expect(result.name).toEqual(testInput.name);
    expect(result.price).toEqual(testInput.price);
  });

  it('should query programs by category and location correctly', async () => {
    // Create test programs with different categories and locations
    await createProgram(testInput); // online/online
    await createProgram(offlineTestInput); // offline_pare/pare

    // Create additional test program
    const groupProgram: CreateProgramInput = {
      name: 'Group English Course',
      description: 'Group learning program',
      category: 'group',
      location: 'malang',
      price: 1500000.00,
      duration_weeks: 6,
      is_active: true
    };
    await createProgram(groupProgram);

    // Test category filtering
    const onlinePrograms = await db.select()
      .from(programsTable)
      .where(eq(programsTable.category, 'online'))
      .execute();

    expect(onlinePrograms).toHaveLength(1);
    expect(onlinePrograms[0].name).toEqual('Test English Course');

    // Test location filtering
    const parePrograms = await db.select()
      .from(programsTable)
      .where(eq(programsTable.location, 'pare'))
      .execute();

    expect(parePrograms).toHaveLength(1);
    expect(parePrograms[0].name).toEqual('Offline English Course in Pare');
  });

  it('should query programs by price range correctly', async () => {
    // Create programs with different prices
    await createProgram(testInput); // 2,500,000
    await createProgram(offlineTestInput); // 3,000,000

    const cheapProgram: CreateProgramInput = {
      name: 'Budget English Course',
      description: 'Affordable English learning',
      category: 'online',
      location: 'online',
      price: 1000000.00,
      duration_weeks: 4,
      is_active: true
    };
    await createProgram(cheapProgram);

    // Query programs between 2M and 3.5M IDR
    const midRangePrograms = await db.select()
      .from(programsTable)
      .where(
        and(
          gte(programsTable.price, '2000000.00'),
          lte(programsTable.price, '3500000.00')
        )
      )
      .execute();

    expect(midRangePrograms).toHaveLength(2);
    
    // Check numeric conversion
    midRangePrograms.forEach(program => {
      const price = parseFloat(program.price);
      expect(price).toBeGreaterThanOrEqual(2000000);
      expect(price).toBeLessThanOrEqual(3500000);
    });
  });

  it('should handle programs with all location types', async () => {
    const locationTests = [
      { location: 'malang' as const, name: 'Malang Program' },
      { location: 'sidoarjo' as const, name: 'Sidoarjo Program' },
      { location: 'nganjuk' as const, name: 'Nganjuk Program' }
    ];

    // Create programs for each location
    for (const test of locationTests) {
      const programInput: CreateProgramInput = {
        ...testInput,
        name: test.name,
        location: test.location
      };
      
      const result = await createProgram(programInput);
      expect(result.location).toEqual(test.location);
      expect(result.name).toEqual(test.name);
    }

    // Verify all programs were created
    const allPrograms = await db.select()
      .from(programsTable)
      .execute();

    expect(allPrograms).toHaveLength(locationTests.length);
  });

  it('should handle all program categories', async () => {
    const categoryTests = [
      { category: 'branch' as const, name: 'Branch Program' },
      { category: 'group' as const, name: 'Group Program' },
      { category: 'offline_pare' as const, name: 'Offline Pare Program' }
    ];

    // Create programs for each category
    for (const test of categoryTests) {
      const programInput: CreateProgramInput = {
        ...testInput,
        name: test.name,
        category: test.category
      };
      
      const result = await createProgram(programInput);
      expect(result.category).toEqual(test.category);
      expect(result.name).toEqual(test.name);
    }

    // Verify all programs were created
    const allPrograms = await db.select()
      .from(programsTable)
      .execute();

    expect(allPrograms).toHaveLength(categoryTests.length);
  });
});