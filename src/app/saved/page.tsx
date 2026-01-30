import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BickCard } from '@/components/bick/BickCard';
import type { BickWithAssets } from '@/types/database.types';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Saved Bicks | Bickqr',
  description: 'Your saved audio clips on Bickqr.',
};

async function getSavedBicks(): Promise<BickWithAssets[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_bicks')
    .select(`
      bick:bicks!inner(
        *,
        assets:bick_assets(*)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: { bick: BickWithAssets }) => row.bick);
}

export default async function SavedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in?redirect=/saved');
  }

  const savedBicks = await getSavedBicks();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Saved Bicks</h1>

        {savedBicks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-surface rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No saved bicks yet</h2>
            <p className="text-gray-400 mb-6">Save bicks you like to find them here later</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary-hover transition-colors"
            >
              Explore Bicks
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedBicks.map((bick) => (
              <BickCard key={bick.id} bick={bick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
