/**
 * Full-text search tests
 * Property 10: Full-Text Search Relevance
 * **Validates: Requirements 8.3**
 */
import { describe, it, expect } from 'vitest';
import { supabaseAdmin, TEST_IDS, createTestProfile, cleanupTestData } from './setup';

describe('Full-Text Search', () => {
  /**
   * Property 10: Full-Text Search Relevance
   * For any search query term that appears in a live bick's title,
   * the full-text search SHALL return that bick in the results.
   */
  it('finds bicks by title using FTS', async () => {
    await createTestProfile(TEST_IDS.profiles.user1, 'owner');
    
    // Create bicks with different titles
    await supabaseAdmin.from('bicks').insert([
      { id: 'testb001-0000-0000-0000-000000000001', owner_id: TEST_IDS.profiles.user1, slug: 'funny-cat', title: 'Funny Cat Sound', status: 'live' },
      { id: 'testb002-0000-0000-0000-000000000002', owner_id: TEST_IDS.profiles.user1, slug: 'epic-fail', title: 'Epic Fail Horn', status: 'live' },
      { id: 'testb003-0000-0000-0000-000000000003', owner_id: TEST_IDS.profiles.user1, slug: 'cat-meow', title: 'Cat Meowing Loudly', status: 'live' },
    ]);
    
    // Search for "cat"
    const { data } = await supabaseAdmin
      .from('bicks')
      .select('*')
      .textSearch('title_search', 'cat')
      .eq('status', 'live');
    
    expect(data?.length).toBe(2);
    expect(data?.map(b => b.slug)).toContain('funny-cat');
    expect(data?.map(b => b.slug)).toContain('cat-meow');
  });

  it('does not find non-live bicks in search', async () => {
    await createTestProfile(TEST_IDS.profiles.user1, 'owner');
    
    await supabaseAdmin.from('bicks').insert([
      { id: 'testb001-0000-0000-0000-000000000001', owner_id: TEST_IDS.profiles.user1, slug: 'live-sound', title: 'Searchable Sound', status: 'live' },
      { id: 'testb002-0000-0000-0000-000000000002', owner_id: TEST_IDS.profiles.user1, slug: 'processing-sound', title: 'Searchable Processing', status: 'processing' },
    ]);
    
    const { data } = await supabaseAdmin
      .from('bicks')
      .select('*')
      .textSearch('title_search', 'searchable')
      .eq('status', 'live');
    
    expect(data?.length).toBe(1);
    expect(data?.[0].slug).toBe('live-sound');
  });

  it('handles multi-word search queries', async () => {
    await createTestProfile(TEST_IDS.profiles.user1, 'owner');
    
    await supabaseAdmin.from('bicks').insert([
      { id: 'testb001-0000-0000-0000-000000000001', owner_id: TEST_IDS.profiles.user1, slug: 'epic-music', title: 'Epic Music Sting', status: 'live' },
      { id: 'testb002-0000-0000-0000-000000000002', owner_id: TEST_IDS.profiles.user1, slug: 'sad-music', title: 'Sad Music Theme', status: 'live' },
    ]);
    
    const { data } = await supabaseAdmin
      .from('bicks')
      .select('*')
      .textSearch('title_search', 'epic music')
      .eq('status', 'live');
    
    // Should find both (OR semantics by default)
    expect(data?.length).toBeGreaterThanOrEqual(1);
  });
});
