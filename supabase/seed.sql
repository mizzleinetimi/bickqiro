-- Bickqr Seed Data
-- This file contains sample data for development and testing
-- Run with: supabase db seed

-- ============================================================================
-- SAMPLE PROFILES
-- Note: In production, profiles are created via auth signup trigger
-- For testing, we insert directly (requires service role)
-- ============================================================================

-- Create test user IDs (these would normally come from auth.users)
-- Using fixed UUIDs for reproducible testing
INSERT INTO profiles (id, username, display_name, avatar_url) VALUES
    ('11111111-1111-1111-1111-111111111111', 'testuser1', 'Test User One', NULL),
    ('22222222-2222-2222-2222-222222222222', 'testuser2', 'Test User Two', NULL),
    ('33333333-3333-3333-3333-333333333333', 'soundcreator', 'Sound Creator', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE TAGS
-- ============================================================================

INSERT INTO tags (id, name, slug, bick_count) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'funny', 'funny', 3),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'meme', 'meme', 2),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'music', 'music', 1),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'viral', 'viral', 2),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'sound-effect', 'sound-effect', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE BICKS (various statuses)
-- ============================================================================

-- Live bicks (publicly visible)
INSERT INTO bicks (id, owner_id, slug, title, description, status, duration_ms, play_count, share_count, published_at) VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111',
        'funny-cat-sound',
        'Funny Cat Sound',
        'A hilarious cat meowing sound',
        'live',
        3500,
        1250,
        89,
        NOW() - INTERVAL '7 days'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        '22222222-2222-2222-2222-222222222222',
        'epic-fail-horn',
        'Epic Fail Horn',
        'The classic fail sound effect',
        'live',
        2100,
        5420,
        312,
        NOW() - INTERVAL '14 days'
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        '33333333-3333-3333-3333-333333333333',
        'dramatic-music-sting',
        'Dramatic Music Sting',
        'Perfect for dramatic reveals',
        'live',
        4200,
        890,
        45,
        NOW() - INTERVAL '3 days'
    )
ON CONFLICT (id) DO NOTHING;

-- Processing bick (not publicly visible)
INSERT INTO bicks (id, owner_id, slug, title, description, status, duration_ms) VALUES
    (
        '10000000-0000-0000-0000-000000000004',
        '11111111-1111-1111-1111-111111111111',
        'new-upload-processing',
        'New Upload Processing',
        'This bick is still being processed',
        'processing',
        NULL
    )
ON CONFLICT (id) DO NOTHING;

-- Failed bick (not publicly visible)
INSERT INTO bicks (id, owner_id, slug, title, description, status) VALUES
    (
        '10000000-0000-0000-0000-000000000005',
        '22222222-2222-2222-2222-222222222222',
        'failed-upload',
        'Failed Upload',
        'This bick failed processing',
        'failed'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE BICK_TAGS
-- ============================================================================

INSERT INTO bick_tags (bick_id, tag_id) VALUES
    -- Funny Cat Sound: funny, meme, viral
    ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('10000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ('10000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    -- Epic Fail Horn: funny, meme, sound-effect
    ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('10000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ('10000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
    -- Dramatic Music Sting: music, viral, funny
    ('10000000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
    ('10000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    ('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SAMPLE BICK_ASSETS
-- ============================================================================

INSERT INTO bick_assets (id, bick_id, asset_type, storage_key, cdn_url, mime_type, size_bytes) VALUES
    -- Funny Cat Sound assets
    (
        'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'original',
        'bicks/10000000-0000-0000-0000-000000000001/original.mp3',
        'https://cdn.example.com/bicks/10000000-0000-0000-0000-000000000001/original.mp3',
        'audio/mpeg',
        125000
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000001',
        'og_image',
        'bicks/10000000-0000-0000-0000-000000000001/og.png',
        'https://cdn.example.com/bicks/10000000-0000-0000-0000-000000000001/og.png',
        'image/png',
        45000
    ),
    -- Epic Fail Horn assets
    (
        'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000002',
        'original',
        'bicks/10000000-0000-0000-0000-000000000002/original.mp3',
        'https://cdn.example.com/bicks/10000000-0000-0000-0000-000000000002/original.mp3',
        'audio/mpeg',
        98000
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        '10000000-0000-0000-0000-000000000002',
        'teaser_mp4',
        'bicks/10000000-0000-0000-0000-000000000002/teaser.mp4',
        'https://cdn.example.com/bicks/10000000-0000-0000-0000-000000000002/teaser.mp4',
        'video/mp4',
        520000
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE REPORTS
-- ============================================================================

INSERT INTO reports (id, bick_id, reporter_id, reason, details, status) VALUES
    (
        'r0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222',
        'copyright',
        'This sound is copyrighted material',
        'pending'
    )
ON CONFLICT (id) DO NOTHING;
