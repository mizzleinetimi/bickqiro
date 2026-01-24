import { getTrendingBicks } from '@/lib/supabase/queries';
import { BickCard } from '@/components/bick/BickCard';

export default async function HomePage() {
  const bicks = await getTrendingBicks(6);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Welcome to Bickqr</h1>
      <p className="text-gray-600 mb-8">
        Discover and share short audio clips.
      </p>
      
      <h2 className="text-xl font-semibold mb-4">Trending Sounds</h2>
      
      {bicks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bicks.map((bick) => (
            <BickCard key={bick.id} bick={bick} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No sounds yet. Be the first to upload!</p>
      )}
    </div>
  );
}
