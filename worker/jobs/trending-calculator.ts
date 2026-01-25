/**
 * Trending Calculator Job
 * Computes trending scores for all live bicks and updates the trending_scores table
 * 
 * Formula: score = (play_count * 1.0 + share_count * 2.0) * decay_factor
 * where: decay_factor = 1 / (1 + days_since_published * 0.1)
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';

// Create admin client for worker operations
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * Calculate trending score for a single bick
 * 
 * @param playCount - Number of plays
 * @param shareCount - Number of shares
 * @param publishedAt - Publication date (ISO string or null)
 * @returns Calculated trending score
 */
export function calculateTrendingScore(
  playCount: number,
  shareCount: number,
  publishedAt: string | null
): number {
  // Base engagement score: plays + 2x shares
  const engagementScore = playCount * 1.0 + shareCount * 2.0;
  
  // Calculate decay factor based on age
  let decayFactor = 1.0;
  if (publishedAt) {
    const publishedDate = new Date(publishedAt);
    const now = new Date();
    const daysSincePublished = (now.getTime() - publishedDate.getTime()) / (24 * 60 * 60 * 1000);
    decayFactor = 1 / (1 + daysSincePublished * 0.1);
  }
  
  return engagementScore * decayFactor;
}

/**
 * Process trending calculation job
 * Fetches all live bicks, calculates scores, and updates trending_scores table atomically
 */
export async function processTrendingCalculation(): Promise<{
  success: boolean;
  bickCount: number;
  duration: number;
  error?: string;
}> {
  const startTime = Date.now();
  const supabase = createAdminClient();
  
  try {
    // Fetch all live bicks
    const { data: bicks, error: fetchError } = await supabase
      .from('bicks')
      .select('id, play_count, share_count, published_at')
      .eq('status', 'live')
      .returns<{ id: string; play_count: number; share_count: number; published_at: string | null }[]>();
    
    if (fetchError) {
      throw new Error(`Failed to fetch bicks: ${fetchError.message}`);
    }
    
    if (!bicks || bicks.length === 0) {
      console.log('No live bicks found');
      return {
        success: true,
        bickCount: 0,
        duration: Date.now() - startTime
      };
    }
    
    // Calculate scores for all bicks
    const scoredBicks = bicks.map(bick => ({
      bick_id: bick.id,
      score: calculateTrendingScore(bick.play_count, bick.share_count, bick.published_at)
    }));
    
    // Sort by score descending to assign ranks
    scoredBicks.sort((a, b) => b.score - a.score);
    
    // Assign ranks (1 = highest score)
    const rankedBicks = scoredBicks.map((bick, index) => ({
      bick_id: bick.bick_id,
      score: Math.round(bick.score * 10000) / 10000, // Round to 4 decimal places
      rank: index + 1,
      computed_at: new Date().toISOString()
    }));
    
    // Delete existing scores and insert new ones atomically
    // Using upsert for atomic update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase.from('trending_scores') as any)
      .upsert(rankedBicks, { 
        onConflict: 'bick_id',
        ignoreDuplicates: false 
      });
    
    if (upsertError) {
      throw new Error(`Failed to update trending scores: ${upsertError.message}`);
    }
    
    // Clean up scores for bicks that are no longer live
    const liveIds = bicks.map(b => b.id);
    const { data: allScores } = await supabase
      .from('trending_scores')
      .select('bick_id')
      .returns<{ bick_id: string }[]>();
    
    if (allScores) {
      const staleIds = allScores
        .filter(s => !liveIds.includes(s.bick_id))
        .map(s => s.bick_id);
      
      if (staleIds.length > 0) {
        await supabase
          .from('trending_scores')
          .delete()
          .in('bick_id', staleIds);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`Trending calculation complete: ${rankedBicks.length} bicks processed in ${duration}ms`);
    
    return {
      success: true,
      bickCount: rankedBicks.length,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Trending calculation failed:', errorMessage);
    
    return {
      success: false,
      bickCount: 0,
      duration,
      error: errorMessage
    };
  }
}

export default processTrendingCalculation;
