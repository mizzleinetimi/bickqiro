/**
 * Trending query tests
 * Property tests for trending functionality
 * **Validates: Requirements 4.1**
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database.types';
import { config } from 'dotenv';

// Load .env.local explicitly
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Generate unique test IDs for each test run
let testCounter = 0;
function generateTestId(): string {
  testCounter++;
  const padded = testCounter.toString().padStart(4, '0');
  return `eeeeeeee-eeee-${padded}-eeee-eeeeeeeeeeee`;
}

let testIds: string[] = [];

async function cleanupTestIds() {
  if (testIds.length > 0) {
    await supabaseAdmin.from('trending_scores').delete().in('bick_id', testIds);
    await supabaseAdmin.from('bicks').delete().in('id', testIds);
    testIds = [];
  }
  testCounter = 0;
}

describe('Trending Queries', () => {
  beforeEach(async () => {
    await cleanupTestIds();
  });

  afterAll(async () => {
    await cleanupTestIds();
  });

  /**
   * Property 8: Trending Results Ordered by Score
   * For any trending query returning multiple results, the results SHALL be 
   * ordered such that each result's trending score is >= the next result's score.
   * **Validates: Requirements 4.1**
   */
  it('Property 8: Trending results ordered by rank', async () => {
    const id1 = generateTestId();
    const id2 = generateTestId();
    const id3 = generateTestId();
    testIds.push(id1, id2, id3);

    // Create test bicks
    const { error: insertError } = await supabaseAdmin.from('bicks').insert([
      { id: id1, slug: `trending-high-${Date.now()}`, title: 'High Trending', status: 'live' },
      { id: id2, slug: `trending-mid-${Date.now()}`, title: 'Mid Trending', status: 'live' },
      { id: id3, slug: `trending-low-${Date.now()}`, title: 'Low Trending', status: 'live' },
    ]);
    
    expect(insertError).toBeNull();
    
    // Insert trending scores with different ranks
    const { error: scoreError } = await supabaseAdmin.from('trending_scores').insert([
      { bick_id: id1, score: 100.0, rank: 1 },
      { bick_id: id2, score: 50.0, rank: 2 },
      { bick_id: id3, score: 10.0, rank: 3 },
    ]);
    
    expect(scoreError).toBeNull();
    
    // Query trending scores ordered by rank
    const { data, error } = await supabaseAdmin
      .from('trending_scores')
      .select('*, bick:bicks(*)')
      .in('bick_id', [id1, id2, id3])
      .order('rank', { ascending: true });
    
    expect(error).toBeNull();
    expect(data?.length).toBe(3);
    
    // Verify ordering - rank should be ascending (1, 2, 3...)
    for (let i = 0; i < data!.length - 1; i++) {
      expect(data![i].rank).toBeLessThanOrEqual(data![i + 1].rank);
      expect(data![i].score).toBeGreaterThanOrEqual(data![i + 1].score);
    }
  });

  /**
   * Test: Trending scores table accepts valid data
   */
  it('Trending scores table accepts valid inserts', async () => {
    const id1 = generateTestId();
    testIds.push(id1);

    // Create a test bick first
    const { error: bickError } = await supabaseAdmin.from('bicks').insert({
      id: id1,
      slug: `test-trending-${Date.now()}`,
      title: 'Test Trending Bick',
      status: 'live'
    });
    
    expect(bickError).toBeNull();
    
    // Insert trending score
    const { data, error } = await supabaseAdmin.from('trending_scores').insert({
      bick_id: id1,
      score: 42.5,
      rank: 1
    }).select().single();
    
    expect(error).toBeNull();
    expect(data?.score).toBe(42.5);
    expect(data?.rank).toBe(1);
    expect(data?.computed_at).toBeDefined();
  });

  /**
   * Test: Trending scores cascade delete with bicks
   */
  it('Trending scores cascade delete when bick is deleted', async () => {
    const id1 = generateTestId();
    testIds.push(id1);

    // Create a test bick
    const { error: bickError } = await supabaseAdmin.from('bicks').insert({
      id: id1,
      slug: `cascade-test-${Date.now()}`,
      title: 'Cascade Test Bick',
      status: 'live'
    });
    
    expect(bickError).toBeNull();
    
    // Insert trending score
    const { error: scoreError } = await supabaseAdmin.from('trending_scores').insert({
      bick_id: id1,
      score: 10.0,
      rank: 1
    });
    
    expect(scoreError).toBeNull();
    
    // Verify score exists
    const { data: before } = await supabaseAdmin
      .from('trending_scores')
      .select('*')
      .eq('bick_id', id1);
    
    expect(before?.length).toBe(1);
    
    // Delete the bick
    await supabaseAdmin.from('bicks').delete().eq('id', id1);
    
    // Verify score was cascade deleted
    const { data: after } = await supabaseAdmin
      .from('trending_scores')
      .select('*')
      .eq('bick_id', id1);
    
    expect(after?.length).toBe(0);
    
    // Remove from testIds since it's already deleted
    testIds = testIds.filter(id => id !== id1);
  });

  /**
   * Test: Trending join query works correctly
   */
  it('Trending join with bicks returns correct data', async () => {
    const id1 = generateTestId();
    const id2 = generateTestId();
    testIds.push(id1, id2);

    // Create test bicks
    const { error: bickError } = await supabaseAdmin.from('bicks').insert([
      { id: id1, slug: `join-test-1-${Date.now()}`, title: 'Join Test One', status: 'live' },
      { id: id2, slug: `join-test-2-${Date.now()}`, title: 'Join Test Two', status: 'live' },
    ]);
    
    expect(bickError).toBeNull();
    
    // Insert trending scores
    const { error: scoreError } = await supabaseAdmin.from('trending_scores').insert([
      { bick_id: id1, score: 75.0, rank: 1 },
      { bick_id: id2, score: 25.0, rank: 2 },
    ]);
    
    expect(scoreError).toBeNull();
    
    // Query with join
    const { data, error } = await supabaseAdmin
      .from('trending_scores')
      .select(`
        score,
        rank,
        bick:bicks!inner(id, slug, title, status)
      `)
      .in('bick_id', [id1, id2])
      .order('rank', { ascending: true });
    
    expect(error).toBeNull();
    expect(data?.length).toBe(2);
    expect(data?.[0].score).toBe(75.0);
    expect(data?.[0].rank).toBe(1);
    expect(data?.[1].score).toBe(25.0);
    expect(data?.[1].rank).toBe(2);
  });
});
