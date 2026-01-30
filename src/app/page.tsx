import type { Metadata } from 'next';
import { getTopTrendingBicks, getLatestBicks } from '@/lib/supabase/queries';
import { HomeContent } from '@/components/home/HomeContent';

export const metadata: Metadata = {
  title: 'Explore Bicks | Bickqr',
  description: 'Discover trending audio clips and find your next favorite sound. Search, play, and share short audio clips.',
};

export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  // Fetch initial data server-side for SEO
  const [latestBicks, trendingBicks] = await Promise.all([
    getLatestBicks(12),
    getTopTrendingBicks(12),
  ]);

  return (
    <HomeContent 
      initialLatestBicks={latestBicks} 
      initialTrendingBicks={trendingBicks} 
    />
  );
}
