/**
 * Schema validation tests for Bickqr database
 */
import { describe, it, expect } from 'vitest';
import { supabaseAdmin, TEST_IDS, createTestProfile, createTestBick, createTestTag, createTestAsset } from './setup';

describe('Schema Validation', () => {
  describe('profiles table', () => {
    it('creates profile with required fields', async () => {
      const profile = await createTestProfile(TEST_IDS.profiles.user1, 'testuser1');
      expect(profile.id).toBe(TEST_IDS.profiles.user1);
      expect(profile.username).toBe('testuser1');
      expect(profile.created_at).toBeDefined();
      expect(profile.updated_at).toBeDefined();
    });

    it('rejects duplicate usernames', async () => {
      await createTestProfile(TEST_IDS.profiles.user1, 'uniqueuser');
      const { error } = await supabaseAdmin.from('profiles').insert({ id: TEST_IDS.profiles.user2, username: 'uniqueuser' });
      expect(error?.code).toBe('23505');
    });
  });

  describe('bicks table', () => {
    it('creates bick with default status processing', async () => {
      await createTestProfile(TEST_IDS.profiles.user1, 'owner1');
      const bick = await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, 'test-slug', 'Test Title');
      expect(bick.status).toBe('processing');
      expect(bick.play_count).toBe(0);
      expect(bick.share_count).toBe(0);
    });

    it('rejects invalid status values', async () => {
      await createTestProfile(TEST_IDS.profiles.user1, 'owner1');
      const { error } = await supabaseAdmin.from('bicks').insert({
        id: TEST_IDS.bicks.live1,
        owner_id: TEST_IDS.profiles.user1,
        slug: 'test',
        title: 'Test',
        status: 'invalid' as any,
      });
      expect(error?.code).toBe('23514');
    });
  });

  describe('bick_assets table', () => {
    it('creates asset with valid type', async () => {
      await createTestProfile(TEST_IDS.profiles.user1, 'owner1');
      await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, 'test', 'Test', 'live');
      const asset = await createTestAsset(TEST_IDS.assets.asset1, TEST_IDS.bicks.live1, 'original');
      expect(asset.asset_type).toBe('original');
    });

    it('rejects invalid asset types', async () => {
      await createTestProfile(TEST_IDS.profiles.user1, 'owner1');
      await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, 'test', 'Test', 'live');
      const { error } = await supabaseAdmin.from('bick_assets').insert({
        id: TEST_IDS.assets.asset1,
        bick_id: TEST_IDS.bicks.live1,
        asset_type: 'invalid' as any,
      });
      expect(error?.code).toBe('23514');
    });
  });

  describe('tags table', () => {
    it('creates tag with required fields', async () => {
      const tag = await createTestTag(TEST_IDS.tags.tag1, 'funny', 'funny');
      expect(tag.name).toBe('funny');
      expect(tag.slug).toBe('funny');
      expect(tag.bick_count).toBe(0);
    });

    it('rejects duplicate tag names', async () => {
      await createTestTag(TEST_IDS.tags.tag1, 'unique-tag', 'unique-tag');
      const { error } = await supabaseAdmin.from('tags').insert({ id: 'testt222-2222-2222-2222-222222222222', name: 'unique-tag', slug: 'unique-tag-2' });
      expect(error?.code).toBe('23505');
    });
  });

  describe('reports table', () => {
    it('creates report with required fields', async () => {
      await createTestProfile(TEST_IDS.profiles.user1, 'owner1');
      await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, 'test', 'Test', 'live');
      const { data, error } = await supabaseAdmin.from('reports').insert({
        id: TEST_IDS.reports.report1,
        bick_id: TEST_IDS.bicks.live1,
        reason: 'copyright',
      }).select().single();
      expect(error).toBeNull();
      expect(data?.status).toBe('pending');
    });

    it('rejects invalid report status', async () => {
      await createTestProfile(TEST_IDS.profiles.user1, 'owner1');
      await createTestBick(TEST_IDS.bicks.live1, TEST_IDS.profiles.user1, 'test', 'Test', 'live');
      const { error } = await supabaseAdmin.from('reports').insert({
        id: TEST_IDS.reports.report1,
        bick_id: TEST_IDS.bicks.live1,
        reason: 'test',
        status: 'invalid' as any,
      });
      expect(error?.code).toBe('23514');
    });
  });
});
