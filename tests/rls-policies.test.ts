/**
 * RLS Policy tests for Bickqr database
 * Tests Property 4: Live Status Visibility
 * **Validates: Requirements 3.5, 4.3, 6.3**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { supabaseAnon, supabaseAdmin, TEST_IDS, createTestProfile, createTestBick, createTestAsset, createTestTag, cleanupTestData } from './setup';

describe('RLS Policies - Live Status Visibility', () => {
  /**
   * Property 4: Live Status Visibility
   * For any bick, bick_asset, or bick_tag record, a public query SHALL return
   * the record if and only if the associated bick has status = 'live'.
   */
  it('Property 4: only live bicks are visible to public', async () => {
    const statuses = ['processing', 'live', 'failed', 'removed'] as const;
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...statuses),
        async (status) => {
          await cleanupTestData();
          
          // Setup: create profile and bick with given status
          await createTestProfile(TEST_IDS.profiles.user1, `user-${status}`);
          await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, `slug-${status}`, `Title ${status}`, status);
          
          // Query as anonymous user
          const { data } = await supabaseAnon.from('bicks').select('*').eq('id', TEST_IDS.bicks.live1);
          
          // Assert: visible iff status === 'live'
          if (status === 'live') {
            expect(data?.length).toBe(1);
          } else {
            expect(data?.length).toBe(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 4: bick_assets only visible for live bicks', async () => {
    const statuses = ['processing', 'live', 'failed', 'removed'] as const;
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...statuses),
        async (status) => {
          await cleanupTestData();
          
          await createTestProfile(TEST_IDS.profiles.user1, `user-${status}`);
          await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, `slug-${status}`, `Title`, status);
          await createTestAsset(TEST_IDS.assets.asset1, TEST_IDS.bicks.live1, 'original');
          
          const { data } = await supabaseAnon.from('bick_assets').select('*').eq('id', TEST_IDS.assets.asset1);
          
          if (status === 'live') {
            expect(data?.length).toBe(1);
          } else {
            expect(data?.length).toBe(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 4: bick_tags only visible for live bicks', async () => {
    const statuses = ['processing', 'live', 'failed', 'removed'] as const;
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...statuses),
        async (status) => {
          await cleanupTestData();
          
          await createTestProfile(TEST_IDS.profiles.user1, `user-${status}`);
          await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, `slug-${status}`, `Title`, status);
          await createTestTag(TEST_IDS.tags.tag1, `tag-${status}`, `tag-${status}`);
          await supabaseAdmin.from('bick_tags').insert({ bick_id: TEST_IDS.bicks.live1, tag_id: TEST_IDS.tags.tag1 });
          
          const { data } = await supabaseAnon.from('bick_tags').select('*').eq('bick_id', TEST_IDS.bicks.live1);
          
          if (status === 'live') {
            expect(data?.length).toBe(1);
          } else {
            expect(data?.length).toBe(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 1: Profile Public Read Access
   * For any profile in the database, a public user query SHALL return that profile's data.
   * **Validates: Requirements 2.2**
   */
  it('Property 1: profiles are publicly readable', async () => {
    await createTestProfile(TEST_IDS.profiles.user1, 'publicuser');
    const { data } = await supabaseAnon.from('profiles').select('*').eq('id', TEST_IDS.profiles.user1);
    expect(data?.length).toBe(1);
    expect(data?.[0].username).toBe('publicuser');
  });

  /**
   * Property 7: Tags Public Read Access
   * For any tag in the database, a public user query SHALL return that tag's data.
   * **Validates: Requirements 5.3**
   */
  it('Property 7: tags are publicly readable', async () => {
    await createTestTag(TEST_IDS.tags.tag1, 'publictag', 'publictag');
    const { data } = await supabaseAnon.from('tags').select('*').eq('id', TEST_IDS.tags.tag1);
    expect(data?.length).toBe(1);
    expect(data?.[0].name).toBe('publictag');
  });

  /**
   * Property 8: Reports Insert Allowed
   * For any user, inserting a report with valid bick_id and reason SHALL succeed.
   * **Validates: Requirements 7.3**
   */
  it('Property 8: anyone can insert reports', async () => {
    await createTestProfile(TEST_IDS.profiles.user1, 'owner');
    await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, 'test', 'Test', 'live');
    
    const { error } = await supabaseAnon.from('reports').insert({
      bick_id: TEST_IDS.bicks.live1,
      reason: 'spam',
    });
    expect(error).toBeNull();
  });

  /**
   * Property 9: Reports Read Blocked
   * For any report, a public query SHALL return zero results.
   * **Validates: Requirements 7.4**
   */
  it('Property 9: reports are not publicly readable', async () => {
    await createTestProfile(TEST_IDS.profiles.user1, 'owner');
    await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, 'test', 'Test', 'live');
    await supabaseAdmin.from('reports').insert({ id: TEST_IDS.reports.report1, bick_id: TEST_IDS.bicks.live1, reason: 'test' });
    
    const { data } = await supabaseAnon.from('reports').select('*');
    expect(data?.length).toBe(0);
  });
});
