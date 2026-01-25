/**
 * Trending Calculator Property Tests
 * **Validates: Requirements 3.1, 3.2, 3.3, 7.2**
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { calculateTrendingScore, processTrendingCalculation } from '../../worker/jobs/trending-calculator';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';
import { config } from 'dotenv';

// Load .env.local explicitly
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Generate unique test IDs for each test run to avoid conflicts
// Uses a counter to ensure uniqueness within a test run
let testCounter = 0;
function generateTestId(): string {
  testCounter++;
  const padded = testCounter.toString().padStart(4, '0');
  return `dddddddd-dddd-${padded}-dddd-dddddddddddd`;
}

// Track all test IDs for cleanup
let testIds: string[] = [];

async function cleanupTestIds() {
  if (testIds.length > 0) {
    await supabaseAdmin.from('trending_scores').delete().in('bick_id', testIds);
    await supabaseAdmin.from('bicks').delete().in('id', testIds);
    testIds = [];
  }
  testCounter = 0;
}

describe('Trending Calculator', () => {
  beforeEach(async () => {
    await cleanupTestIds();
  });

  afterAll(async () => {
    await cleanupTestIds();
  });

  /**
   * Property 6: Trending Score Formula Correctness
   * For any live bick with play_count P, share_count S, and days_since_published D,
   * the computed trending score SHALL equal (P * 1.0 + S * 2.0) * (1 / (1 + D * 0.1))
   * within floating-point tolerance.
   * **Validates: Requirements 3.1, 3.2**
   */
  describe('Property 6: Trending Score Formula Correctness', () => {
    it('calculates score correctly for various inputs', () => {
      fc.assert(
        fc.property(
          fc.nat(10000),  // playCount 0-10000
          fc.nat(5000),   // shareCount 0-5000
          fc.nat(365),    // daysSincePublished 0-365
          (playCount, shareCount, daysSincePublished) => {
            // Create a date in the past
            const publishedAt = new Date();
            publishedAt.setDate(publishedAt.getDate() - daysSincePublished);
            
            const score = calculateTrendingScore(
              playCount,
              shareCount,
              publishedAt.toISOString()
            );
            
            // Calculate expected score
            const engagementScore = playCount * 1.0 + shareCount * 2.0;
            const decayFactor = 1 / (1 + daysSincePublished * 0.1);
            const expectedScore = engagementScore * decayFactor;
            
            // Allow small floating-point tolerance
            expect(Math.abs(score - expectedScore)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns engagement score when no published date', () => {
      fc.assert(
        fc.property(
          fc.nat(10000),
          fc.nat(5000),
          (playCount, shareCount) => {
            const score = calculateTrendingScore(playCount, shareCount, null);
            const expectedScore = playCount * 1.0 + shareCount * 2.0;
            expect(score).toBe(expectedScore);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('shares are weighted 2x plays', () => {
      // 1 share should equal 2 plays in score contribution
      const scoreWithPlays = calculateTrendingScore(2, 0, null);
      const scoreWithShares = calculateTrendingScore(0, 1, null);
      expect(scoreWithPlays).toBe(scoreWithShares);
    });

    it('older bicks have lower scores', () => {
      const recentScore = calculateTrendingScore(100, 50, new Date().toISOString());
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);
      const oldScore = calculateTrendingScore(100, 50, oldDate.toISOString());
      
      expect(recentScore).toBeGreaterThan(oldScore);
    });
  });

  /**
   * Property 7: Trending Only Includes Live Bicks
   * For any execution of the trending calculator, all entries in trending_scores
   * SHALL correspond to bicks with status='live'.
   * **Validates: Requirements 3.3**
   */
  describe('Property 7: Trending Only Includes Live Bicks', () => {
    it('only processes live bicks', async () => {
      // Generate unique IDs for this test
      const id1 = generateTestId();
      const id2 = generateTestId();
      const id3 = generateTestId();
      const id4 = generateTestId();
      const id5 = generateTestId();
      testIds.push(id1, id2, id3, id4, id5);

      // Create bicks with various statuses
      const { error: insertError } = await supabaseAdmin.from('bicks').insert([
        { id: id1, slug: `trend-live-1-${Date.now()}`, title: 'Live Bick 1', status: 'live', play_count: 100, share_count: 10 },
        { id: id2, slug: `trend-live-2-${Date.now()}`, title: 'Live Bick 2', status: 'live', play_count: 50, share_count: 5 },
        { id: id3, slug: `trend-processing-${Date.now()}`, title: 'Processing Bick', status: 'processing', play_count: 200, share_count: 20 },
        { id: id4, slug: `trend-failed-${Date.now()}`, title: 'Failed Bick', status: 'failed', play_count: 300, share_count: 30 },
        { id: id5, slug: `trend-removed-${Date.now()}`, title: 'Removed Bick', status: 'removed', play_count: 400, share_count: 40 },
      ]);
      expect(insertError).toBeNull();

      // Run trending calculation
      const result = await processTrendingCalculation();
      expect(result.success).toBe(true);

      // Verify only live bicks have trending scores
      const { data: scores } = await supabaseAdmin
        .from('trending_scores')
        .select('bick_id')
        .in('bick_id', [id1, id2, id3, id4, id5]);

      const scoredIds = scores?.map(s => s.bick_id) || [];
      
      // Live bicks should have scores
      expect(scoredIds).toContain(id1);
      expect(scoredIds).toContain(id2);
      
      // Non-live bicks should NOT have scores
      expect(scoredIds).not.toContain(id3);
      expect(scoredIds).not.toContain(id4);
      expect(scoredIds).not.toContain(id5);
    });

    it('removes scores when bick status changes from live', async () => {
      const id1 = generateTestId();
      testIds.push(id1);

      // Create a live bick
      const { error: insertError } = await supabaseAdmin.from('bicks').insert({
        id: id1,
        slug: `trend-status-change-${Date.now()}`,
        title: 'Status Change Bick',
        status: 'live',
        play_count: 100,
        share_count: 10
      });
      expect(insertError).toBeNull();

      // Run trending calculation
      await processTrendingCalculation();

      // Verify score exists
      const { data: before } = await supabaseAdmin
        .from('trending_scores')
        .select('*')
        .eq('bick_id', id1);
      expect(before?.length).toBe(1);

      // Change status to removed
      await supabaseAdmin
        .from('bicks')
        .update({ status: 'removed' })
        .eq('id', id1);

      // Run trending calculation again
      await processTrendingCalculation();

      // Verify score is removed
      const { data: after } = await supabaseAdmin
        .from('trending_scores')
        .select('*')
        .eq('bick_id', id1);
      expect(after?.length).toBe(0);
    });
  });

  /**
   * Property 12: Trending Update Atomicity
   * For any trending calculator execution, either all live bicks have updated scores
   * with the same computed_at timestamp, or no scores are updated.
   * **Validates: Requirements 7.2**
   */
  describe('Property 12: Trending Update Atomicity', () => {
    it('all scores have same computed_at timestamp', async () => {
      const id1 = generateTestId();
      const id2 = generateTestId();
      const id3 = generateTestId();
      testIds.push(id1, id2, id3);

      // Create multiple live bicks
      const { error: insertError } = await supabaseAdmin.from('bicks').insert([
        { id: id1, slug: `atomic-1-${Date.now()}`, title: 'Atomic Bick 1', status: 'live', play_count: 100 },
        { id: id2, slug: `atomic-2-${Date.now()}`, title: 'Atomic Bick 2', status: 'live', play_count: 200 },
        { id: id3, slug: `atomic-3-${Date.now()}`, title: 'Atomic Bick 3', status: 'live', play_count: 300 },
      ]);
      expect(insertError).toBeNull();

      // Run trending calculation
      const result = await processTrendingCalculation();
      expect(result.success).toBe(true);

      // Fetch all scores for test bicks
      const { data: scores, error: fetchError } = await supabaseAdmin
        .from('trending_scores')
        .select('computed_at')
        .in('bick_id', [id1, id2, id3]);

      expect(fetchError).toBeNull();
      expect(scores?.length).toBe(3);

      // All computed_at timestamps should be the same
      const timestamps = scores?.map(s => s.computed_at);
      const uniqueTimestamps = [...new Set(timestamps)];
      expect(uniqueTimestamps.length).toBe(1);
    });

    it('ranks are assigned correctly based on score', async () => {
      const id1 = generateTestId();
      const id2 = generateTestId();
      const id3 = generateTestId();
      testIds.push(id1, id2, id3);

      // Create bicks with known scores (higher play_count = higher score)
      const { error: insertError } = await supabaseAdmin.from('bicks').insert([
        { id: id1, slug: `rank-low-${Date.now()}`, title: 'Low Score', status: 'live', play_count: 10, share_count: 0 },
        { id: id2, slug: `rank-high-${Date.now()}`, title: 'High Score', status: 'live', play_count: 1000, share_count: 100 },
        { id: id3, slug: `rank-mid-${Date.now()}`, title: 'Mid Score', status: 'live', play_count: 100, share_count: 10 },
      ]);
      expect(insertError).toBeNull();

      // Run trending calculation
      await processTrendingCalculation();

      // Fetch scores with ranks for our test bicks only
      const { data: scores, error: fetchError } = await supabaseAdmin
        .from('trending_scores')
        .select('bick_id, score, rank')
        .in('bick_id', [id1, id2, id3])
        .order('rank', { ascending: true });

      expect(fetchError).toBeNull();
      expect(scores?.length).toBe(3);

      // High score bick should have lowest rank number (rank 1 or close to it)
      const highScore = scores?.find(s => s.bick_id === id2);
      const midScore = scores?.find(s => s.bick_id === id3);
      const lowScore = scores?.find(s => s.bick_id === id1);
      
      // Verify relative ranking: high < mid < low (lower rank = better)
      expect(highScore!.rank).toBeLessThan(midScore!.rank);
      expect(midScore!.rank).toBeLessThan(lowScore!.rank);

      // Verify scores are in descending order
      expect(highScore!.score).toBeGreaterThan(midScore!.score);
      expect(midScore!.score).toBeGreaterThan(lowScore!.score);
    });

    it('returns correct bick count', async () => {
      const id1 = generateTestId();
      const id2 = generateTestId();
      const id3 = generateTestId();
      const id4 = generateTestId();
      const id5 = generateTestId();
      testIds.push(id1, id2, id3, id4, id5);

      // Create 5 bicks (4 live, 1 processing)
      const { error: insertError } = await supabaseAdmin.from('bicks').insert([
        { id: id1, slug: `count-1-${Date.now()}`, title: 'Count 1', status: 'live' },
        { id: id2, slug: `count-2-${Date.now()}`, title: 'Count 2', status: 'live' },
        { id: id3, slug: `count-3-${Date.now()}`, title: 'Count 3', status: 'live' },
        { id: id4, slug: `count-4-${Date.now()}`, title: 'Count 4', status: 'processing' },
        { id: id5, slug: `count-5-${Date.now()}`, title: 'Count 5', status: 'live' },
      ]);
      expect(insertError).toBeNull();

      const result = await processTrendingCalculation();
      
      expect(result.success).toBe(true);
      // Should count only live bicks (4 out of 5 from our test, plus any existing)
      expect(result.bickCount).toBeGreaterThanOrEqual(4);
    });
  });
});
