/**
 * Test setup for Bickqr database tests
 */
import { createClient } from '@supabase/supabase-js';
import { beforeEach, afterAll } from 'vitest';
import type { Database } from '../src/types/database.types';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables for tests.');
}

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabaseAnon = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Test bick IDs - we'll delete these specifically
const TEST_BICK_IDS = [
  // Search tests use bbbbbbbb-0001 through bbbbbbbb-0004
  'bbbbbbbb-0001-0000-0000-000000000001',
  'bbbbbbbb-0002-0000-0000-000000000002',
  'bbbbbbbb-0003-0000-0000-000000000003',
  'bbbbbbbb-0004-0000-0000-000000000004',
  // Trending tests use bbbbbbbb-1001 through bbbbbbbb-1004
  'bbbbbbbb-1001-0000-0000-000000000001',
  'bbbbbbbb-1002-0000-0000-000000000002',
  'bbbbbbbb-1003-0000-0000-000000000003',
  'bbbbbbbb-1004-0000-0000-000000000004',
  // Legacy IDs
  'bbbbbbbb-1111-1111-1111-111111111111',
  'bbbbbbbb-3333-3333-3333-333333333333',
];

// Valid UUID format test IDs
export const TEST_IDS = {
  profiles: { 
    user1: 'aaaaaaaa-1111-1111-1111-111111111111', 
    user2: 'aaaaaaaa-2222-2222-2222-222222222222' 
  },
  bicks: { 
    live1: 'bbbbbbbb-1111-1111-1111-111111111111', 
    processing: 'bbbbbbbb-3333-3333-3333-333333333333' 
  },
  tags: { tag1: 'cccccccc-1111-1111-1111-111111111111' },
  assets: { asset1: 'dddddddd-1111-1111-1111-111111111111' },
  reports: { report1: 'eeeeeeee-1111-1111-1111-111111111111' },
};

export async function cleanupTestData() {
  // Delete in batch using .in() for efficiency
  await supabaseAdmin.from('bick_assets').delete().in('bick_id', TEST_BICK_IDS);
  await supabaseAdmin.from('bick_tags').delete().in('bick_id', TEST_BICK_IDS);
  await supabaseAdmin.from('trending_scores').delete().in('bick_id', TEST_BICK_IDS);
  await supabaseAdmin.from('bicks').delete().in('id', TEST_BICK_IDS);
  
  // Clean up other test data
  await supabaseAdmin.from('reports').delete().eq('id', TEST_IDS.reports.report1);
  await supabaseAdmin.from('tags').delete().eq('id', TEST_IDS.tags.tag1);
  await supabaseAdmin.from('profiles').delete().in('id', [TEST_IDS.profiles.user1, TEST_IDS.profiles.user2]);
}

export async function createTestProfile(id: string, username: string) {
  const { data, error } = await supabaseAdmin.from('profiles').insert({ id, username }).select().single();
  if (error) throw error;
  return data;
}

export async function createTestBick(id: string, ownerId: string | null, slug: string, title: string, status: 'processing' | 'live' | 'failed' | 'removed' = 'processing') {
  const { data, error } = await supabaseAdmin.from('bicks').insert({ id, owner_id: ownerId, slug, title, status }).select().single();
  if (error) throw error;
  return data;
}

export async function createTestTag(id: string, name: string, slug: string) {
  const { data, error } = await supabaseAdmin.from('tags').insert({ id, name, slug }).select().single();
  if (error) throw error;
  return data;
}

export async function createTestAsset(id: string, bickId: string, assetType: 'original' | 'audio' | 'waveform_json' | 'og_image' | 'teaser_mp4' | 'thumbnail') {
  const { data, error } = await supabaseAdmin.from('bick_assets').insert({ id, bick_id: bickId, asset_type: assetType }).select().single();
  if (error) throw error;
  return data;
}

export async function updateBickStatus(bickId: string, status: 'processing' | 'live' | 'failed' | 'removed') {
  const { data, error } = await supabaseAdmin.from('bicks').update({ status }).eq('id', bickId).select().single();
  if (error) throw error;
  return data;
}

beforeEach(async () => { await cleanupTestData(); });
afterAll(async () => { await cleanupTestData(); });
