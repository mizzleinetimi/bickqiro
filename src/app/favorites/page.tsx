/**
 * Favorites Page - Shows device-based favorites (no auth required)
 */
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { BickCard } from '@/components/bick/BickCard';
import Link from 'next/link';

export const metadata = {
  title: 'My Favorites | Bickqr',
  description: 'Your favorited audio clips',
  robots: 'noindex,follow',
};

export default async function FavoritesPage() {
  const cookieStore = await cookies();
  const deviceId = cookieStore.get('bickqr_device_id')?.value;
  
  let favorites: Array<{ bicks: unknown }> = [];
  
  if (deviceId) {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('device_favorites')
      .select(`
        bick_id,
        created_at,
        bicks (
          id,
          slug,
          title,
          description,
          duration_ms,
          play_count,
          status,
          assets (
            id,
            bick_id,
            asset_type,
            cdn_url,
            mime_type,
            size_bytes
          ),
          tags (
            id,
            name,
            slug
          )
        )
      `)
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });
    
    favorites = data || [];
  }

  const bicks = favorites
    .map(f => f.bicks)
    .filter((b): b is NonNullable<typeof b> => b !== null && typeof b === 'object' && 'status' in b && b.status === 'live');

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Favorites</h1>
            <p className="text-gray-400 text-sm mt-1">
              {bicks.length} {bicks.length === 1 ? 'bick' : 'bicks'} saved
            </p>
          </div>
          
          <Link 
            href="/"
            className="text-brand-primary hover:text-brand-accent transition-colors text-sm"
          >
            ← Back to Home
          </Link>
        </div>

        {bicks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">❤️</div>
            <h2 className="text-xl font-semibold text-white mb-2">No favorites yet</h2>
            <p className="text-gray-400 mb-6">
              Browse bicks and tap the bookmark icon to save them here
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-yellow-from to-brand-yellow-to text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Browse Bicks
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bicks.map((bick) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <BickCard key={(bick as any).id} bick={bick as any} />
            ))}
          </div>
        )}

        {/* iOS App Promo */}
        <div className="mt-12 p-6 bg-surface rounded-xl border border-surface-border text-center">
          <div className="text-3xl mb-3">📱</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Get the Bickqr Keyboard
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Access your favorites from any app with our iOS keyboard
          </p>
          <div className="text-xs text-gray-500">
            Coming soon to the App Store
          </div>
        </div>
      </div>
    </main>
  );
}
