/**
 * Seed test data for development
 * Run with: npx tsx scripts/seed-test-data.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log('🌱 Seeding test data...\n');

  // Create test profile (using service role to bypass auth)
  const profileId = '11111111-1111-1111-1111-111111111111';
  
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: profileId,
      username: 'testuser',
      display_name: 'Test User',
    });

  if (profileError) {
    console.log('Profile error (may already exist):', profileError.message);
  } else {
    console.log('✅ Created test profile');
  }

  // Create test tags
  const tags = [
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'funny', slug: 'funny', bick_count: 2 },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'meme', slug: 'meme', bick_count: 1 },
    { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'music', slug: 'music', bick_count: 1 },
  ];

  for (const tag of tags) {
    const { error } = await supabase.from('tags').upsert(tag);
    if (error) {
      console.log(`Tag ${tag.name} error:`, error.message);
    } else {
      console.log(`✅ Created tag: ${tag.name}`);
    }
  }

  // Create test bicks
  const bicks = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      owner_id: profileId,
      slug: 'funny-cat-sound',
      title: 'Funny Cat Sound',
      description: 'A hilarious cat meowing sound effect',
      status: 'live',
      duration_ms: 3500,
      play_count: 1250,
      share_count: 89,
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      owner_id: profileId,
      slug: 'epic-fail-horn',
      title: 'Epic Fail Horn',
      description: 'The classic fail sound effect for your videos',
      status: 'live',
      duration_ms: 2100,
      play_count: 5420,
      share_count: 312,
      published_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      owner_id: profileId,
      slug: 'dramatic-music-sting',
      title: 'Dramatic Music Sting',
      description: 'Perfect for dramatic reveals and plot twists',
      status: 'live',
      duration_ms: 4200,
      play_count: 890,
      share_count: 45,
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const bick of bicks) {
    const { error } = await supabase.from('bicks').upsert(bick);
    if (error) {
      console.log(`Bick ${bick.title} error:`, error.message);
    } else {
      console.log(`✅ Created bick: ${bick.title}`);
    }
  }

  // Create bick_assets (audio files) - using sample audio URLs for testing
  const sampleAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  const bickAssets = [
    {
      id: 'aaaaaaaa-0001-0000-0000-000000000001',
      bick_id: '10000000-0000-0000-0000-000000000001',
      asset_type: 'audio',
      cdn_url: sampleAudioUrl,
      mime_type: 'audio/mpeg',
    },
    {
      id: 'aaaaaaaa-0001-0000-0000-000000000002',
      bick_id: '10000000-0000-0000-0000-000000000002',
      asset_type: 'audio',
      cdn_url: sampleAudioUrl,
      mime_type: 'audio/mpeg',
    },
    {
      id: 'aaaaaaaa-0001-0000-0000-000000000003',
      bick_id: '10000000-0000-0000-0000-000000000003',
      asset_type: 'audio',
      cdn_url: sampleAudioUrl,
      mime_type: 'audio/mpeg',
    },
  ];

  for (const asset of bickAssets) {
    const { error } = await supabase.from('bick_assets').upsert(asset);
    if (error) {
      console.log(`Asset error:`, error.message);
    } else {
      console.log(`✅ Created audio asset for bick`);
    }
  }

  // Create bick_tags associations
  const bickTags = [
    { bick_id: '10000000-0000-0000-0000-000000000001', tag_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    { bick_id: '10000000-0000-0000-0000-000000000001', tag_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
    { bick_id: '10000000-0000-0000-0000-000000000002', tag_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    { bick_id: '10000000-0000-0000-0000-000000000003', tag_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
  ];

  for (const bt of bickTags) {
    const { error } = await supabase.from('bick_tags').upsert(bt);
    if (!error) {
      console.log(`✅ Tagged bick`);
    }
  }

  // Create bick_assets (audio files) - using public domain test audio
  const assets = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      bick_id: '10000000-0000-0000-0000-000000000001',
      asset_type: 'audio',
      cdn_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      mime_type: 'audio/mpeg',
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      bick_id: '10000000-0000-0000-0000-000000000002',
      asset_type: 'audio',
      cdn_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      mime_type: 'audio/mpeg',
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      bick_id: '10000000-0000-0000-0000-000000000003',
      asset_type: 'audio',
      cdn_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      mime_type: 'audio/mpeg',
    },
  ];

  for (const asset of assets) {
    const { error } = await supabase.from('bick_assets').upsert(asset);
    if (error) {
      console.log(`Asset error:`, error.message);
    } else {
      console.log(`✅ Created audio asset for bick`);
    }
  }

  console.log('\n✨ Seed complete!');
  console.log('\nTest URLs:');
  console.log('  - http://localhost:3000/');
  console.log('  - http://localhost:3000/trending');
  console.log('  - http://localhost:3000/bick/funny-cat-sound-10000000-0000-0000-0000-000000000001');
  console.log('  - http://localhost:3000/tag/funny');
  console.log('  - http://localhost:3000/robots.txt');
  console.log('  - http://localhost:3000/sitemap.xml');
}

seed().catch(console.error);
