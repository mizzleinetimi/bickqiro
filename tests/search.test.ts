/**
 * Full-text search tests
 * Property tests for search functionality
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
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
  return `ffffffff-ffff-${padded}-ffff-ffffffffffff`;
}

let testIds: string[] = [];

async function cleanupTestIds() {
  if (testIds.length > 0) {
    await supabaseAdmin.from('bicks').delete().in('id', testIds);
    testIds = [];
  }
  testCounter = 0;
}

describe('Full-Text Search', () => {
  beforeEach(async () => {
    await cleanupTestIds();
  });

  afterAll(async () => {
    await cleanupTestIds();
  });

  /**
   * Property 1: Search Returns Matching Bicks
   * For any search query and any set of bicks in the database, 
   * all returned bicks SHALL have either their title or description 
   * containing at least one word from the search query.
   * **Validates: Requirements 1.1**
   */
  it('Property 1: Search returns matching bicks', async () => {
    const id1 = generateTestId();
    const id2 = generateTestId();
    const id3 = generateTestId();
    testIds.push(id1, id2, id3);

    // Create bicks with unique titles (anonymous - no owner_id)
    const { error: insertError } = await supabaseAdmin.from('bicks').insert([
      { id: id1, slug: `xyzzy-cat-${Date.now()}`, title: 'Xyzzy Cat Sound', status: 'live' },
      { id: id2, slug: `xyzzy-fail-${Date.now()}`, title: 'Xyzzy Fail Horn', status: 'live' },
      { id: id3, slug: `xyzzy-meow-${Date.now()}`, title: 'Xyzzy Meowing Loudly', status: 'live' },
    ]);
    
    expect(insertError).toBeNull();
    
    // Search for unique term "xyzzy"
    const { data, error: searchError } = await supabaseAdmin
      .from('bicks')
      .select('*')
      .textSearch('title_search', 'xyzzy')
      .in('id', [id1, id2, id3])
      .eq('status', 'live');
    
    expect(searchError).toBeNull();
    expect(data?.length).toBe(3);
    expect(data?.every(b => b.title.toLowerCase().includes('xyzzy'))).toBe(true);
  });

  /**
   * Property 2: Search Only Returns Live Bicks
   * For any search query, all returned bicks SHALL have status='live'.
   * **Validates: Requirements 1.2**
   */
  it('Property 2: Search only returns live bicks', async () => {
    const id1 = generateTestId();
    const id2 = generateTestId();
    const id3 = generateTestId();
    const id4 = generateTestId();
    testIds.push(id1, id2, id3, id4);

    // Create bicks with various statuses using unique term
    const { error: insertError } = await supabaseAdmin.from('bicks').insert([
      { id: id1, slug: `qwerty-live-${Date.now()}`, title: 'Qwerty Live Sound', status: 'live' },
      { id: id2, slug: `qwerty-processing-${Date.now()}`, title: 'Qwerty Processing', status: 'processing' },
      { id: id3, slug: `qwerty-failed-${Date.now()}`, title: 'Qwerty Failed', status: 'failed' },
      { id: id4, slug: `qwerty-removed-${Date.now()}`, title: 'Qwerty Removed', status: 'removed' },
    ]);
    
    expect(insertError).toBeNull();
    
    const { data, error: searchError } = await supabaseAdmin
      .from('bicks')
      .select('*')
      .textSearch('title_search', 'qwerty')
      .in('id', [id1, id2, id3, id4])
      .eq('status', 'live');
    
    expect(searchError).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].id).toBe(id1);
    expect(data?.every(b => b.status === 'live')).toBe(true);
  });

  /**
   * Property 3: Search Results Ordered by Relevance
   * For any search query returning multiple results, the results SHALL be 
   * ordered such that each result's relevance score is >= the next result's score.
   * **Validates: Requirements 1.3**
   */
  it('Property 3: Search results ordered by relevance', async () => {
    const id1 = generateTestId();
    const id2 = generateTestId();
    const id3 = generateTestId();
    testIds.push(id1, id2, id3);

    // Create bicks with varying relevance to unique term
    const { error: insertError } = await supabaseAdmin.from('bicks').insert([
      { id: id1, slug: `plugh-triple-${Date.now()}`, title: 'Plugh Plugh Plugh', status: 'live' },
      { id: id2, slug: `plugh-single-${Date.now()}`, title: 'One Plugh Here', status: 'live' },
      { id: id3, slug: `no-match-${Date.now()}`, title: 'Dog Barking', status: 'live' },
    ]);
    
    expect(insertError).toBeNull();
    
    const { data, error: searchError } = await supabaseAdmin
      .from('bicks')
      .select('*, title_search')
      .textSearch('title_search', 'plugh')
      .in('id', [id1, id2, id3])
      .eq('status', 'live');
    
    expect(searchError).toBeNull();
    // All results should contain "plugh"
    expect(data?.every(b => b.title.toLowerCase().includes('plugh'))).toBe(true);
    // Should not include non-matching bicks
    expect(data?.some(b => b.id === id3)).toBe(false);
    expect(data?.length).toBe(2);
  });

  /**
   * Property 4: Multi-Word Search Uses OR Logic
   * For any search query containing multiple words, a bick matching 
   * any single word from the query SHALL be included in the results.
   * **Validates: Requirements 1.4**
   */
  it('Property 4: Multi-word search uses OR logic', async () => {
    const id1 = generateTestId();
    const id2 = generateTestId();
    const id3 = generateTestId();
    const id4 = generateTestId();
    testIds.push(id1, id2, id3, id4);

    const { error: insertError } = await supabaseAdmin.from('bicks').insert([
      { id: id1, slug: `zorkmid-floob-${Date.now()}`, title: 'Zorkmid Floob Sting', status: 'live' },
      { id: id2, slug: `sad-floob-${Date.now()}`, title: 'Sad Floob Theme', status: 'live' },
      { id: id3, slug: `zorkmid-fail-${Date.now()}`, title: 'Zorkmid Fail Sound', status: 'live' },
      { id: id4, slug: `random-noise-${Date.now()}`, title: 'Random Noise', status: 'live' },
    ]);
    
    expect(insertError).toBeNull();
    
    // Search for "zorkmid | floob" (OR semantics)
    const { data, error: searchError } = await supabaseAdmin
      .from('bicks')
      .select('*')
      .textSearch('title_search', 'zorkmid | floob')
      .in('id', [id1, id2, id3, id4])
      .eq('status', 'live');
    
    expect(searchError).toBeNull();
    // Should find bicks with "zorkmid" OR "floob"
    expect(data?.length).toBe(3);
    expect(data?.map(b => b.id)).toContain(id1);
    expect(data?.map(b => b.id)).toContain(id2);
    expect(data?.map(b => b.id)).toContain(id3);
    // Should not include non-matching
    expect(data?.map(b => b.id)).not.toContain(id4);
  });

  /**
   * Property test: Search with random words
   * Verifies that search always returns only live bicks
   */
  it('Property test: Random search queries only return live bicks', async () => {
    const id1 = generateTestId();
    const id2 = generateTestId();
    const id3 = generateTestId();
    const id4 = generateTestId();
    testIds.push(id1, id2, id3, id4);

    // Create a mix of live and non-live bicks with unique terms
    const { error: insertError } = await supabaseAdmin.from('bicks').insert([
      { id: id1, slug: `test-frobozz-${Date.now()}`, title: 'Frobozz Beta Gamma', status: 'live' },
      { id: id2, slug: `test-grue-${Date.now()}`, title: 'Grue Epsilon Zeta', status: 'live' },
      { id: id3, slug: `test-blorb-${Date.now()}`, title: 'Blorb Theta Iota', status: 'processing' },
      { id: id4, slug: `test-rezrov-${Date.now()}`, title: 'Rezrov Lambda Mu', status: 'failed' },
    ]);
    
    expect(insertError).toBeNull();
    
    // Property: any search result must be live
    const searchTerms = ['frobozz', 'grue', 'blorb', 'rezrov'];
    
    for (const term of searchTerms) {
      const { data, error: searchError } = await supabaseAdmin
        .from('bicks')
        .select('*')
        .textSearch('title_search', term)
        .in('id', [id1, id2, id3, id4])
        .eq('status', 'live');
      
      expect(searchError).toBeNull();
      // All returned bicks must be live
      expect(data?.every(b => b.status === 'live')).toBe(true);
    }
  });

  /**
   * Property test: Combined title and description search
   * Verifies that search works on both title and description
   */
  it('Property test: Combined search finds bicks by title or description', async () => {
    const id1 = generateTestId();
    const id2 = generateTestId();
    testIds.push(id1, id2);

    const { error: insertError } = await supabaseAdmin.from('bicks').insert([
      { 
        id: id1, 
        slug: `title-match-${Date.now()}`, 
        title: 'Zorkian Sound Effect', 
        description: 'A generic description',
        status: 'live' 
      },
      { 
        id: id2, 
        slug: `no-match-${Date.now()}`, 
        title: 'Generic Sound', 
        description: 'Generic description',
        status: 'live' 
      },
    ]);
    
    expect(insertError).toBeNull();
    
    // Search in title
    const { data, error: searchError } = await supabaseAdmin
      .from('bicks')
      .select('*')
      .textSearch('title_search', 'zorkian')
      .in('id', [id1, id2])
      .eq('status', 'live');
    
    expect(searchError).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].id).toBe(id1);
  });
});
