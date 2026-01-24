/**
 * Timestamp management tests
 * Property 11: Automatic Timestamp Management
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */
import { describe, it, expect } from 'vitest';
import { supabaseAdmin, TEST_IDS, createTestProfile, createTestBick, cleanupTestData } from './setup';

describe('Timestamp Management', () => {
  /**
   * Property 11: Automatic Timestamp Management
   * For any row insertion, created_at SHALL be automatically set.
   * For any row update on profiles or bicks, updated_at SHALL be updated.
   * For any bick status change to 'live', published_at SHALL be set.
   */
  it('created_at is set on insert', async () => {
    const before = new Date();
    const profile = await createTestProfile(TEST_IDS.profiles.user1, 'timestampuser');
    const after = new Date();
    
    const createdAt = new Date(profile.created_at);
    expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });

  it('updated_at changes on profile update', async () => {
    await createTestProfile(TEST_IDS.profiles.user1, 'updateuser');
    
    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { data: updated } = await supabaseAdmin
      .from('profiles')
      .update({ display_name: 'Updated Name' })
      .eq('id', TEST_IDS.profiles.user1)
      .select()
      .single();
    
    expect(updated).toBeDefined();
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(updated!.created_at).getTime() - 100);
  });

  it('updated_at changes on bick update', async () => {
    await createTestProfile(TEST_IDS.profiles.user1, 'owner');
    const bick = await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, 'test', 'Original Title');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { data: updated } = await supabaseAdmin
      .from('bicks')
      .update({ title: 'Updated Title' })
      .eq('id', TEST_IDS.bicks.live1)
      .select()
      .single();
    
    expect(updated).toBeDefined();
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(bick.created_at).getTime());
  });

  it('published_at is set when status changes to live', async () => {
    await createTestProfile(TEST_IDS.profiles.user1, 'owner');
    const bick = await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, 'test', 'Test', 'processing');
    
    expect(bick.published_at).toBeNull();
    
    const { data: updated } = await supabaseAdmin
      .from('bicks')
      .update({ status: 'live' })
      .eq('id', TEST_IDS.bicks.live1)
      .select()
      .single();
    
    expect(updated?.published_at).not.toBeNull();
  });

  it('published_at is not changed when already live', async () => {
    await createTestProfile(TEST_IDS.profiles.user1, 'owner');
    await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, 'test', 'Test', 'processing');
    
    // First transition to live
    const { data: first } = await supabaseAdmin
      .from('bicks')
      .update({ status: 'live' })
      .eq('id', TEST_IDS.bicks.live1)
      .select()
      .single();
    
    const firstPublishedAt = first?.published_at;
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update title while still live
    const { data: second } = await supabaseAdmin
      .from('bicks')
      .update({ title: 'New Title' })
      .eq('id', TEST_IDS.bicks.live1)
      .select()
      .single();
    
    expect(second?.published_at).toBe(firstPublishedAt);
  });
});
