import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/actions';
import { getUserBicks } from '@/lib/supabase/queries';
import { formatDuration } from '@/lib/utils/duration';

export const metadata: Metadata = {
  title: 'My Bicks | Bickqr',
  description: 'Manage your uploaded bicks',
  robots: 'noindex,follow',
};

const statusColors: Record<string, string> = {
  processing: 'bg-[#FCD34D]/20 text-[#FCD34D]',
  live: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  removed: 'bg-[#666666]/20 text-[#666666]',
};

export default async function MyBicksPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/sign-in?next=/my-bicks');
  }

  const { bicks } = await getUserBicks(user.id);

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#f5f5f5]">My Bicks</h1>
          <Link
            href="/upload"
            className="rounded-full bg-[#FCD34D] px-5 py-2 text-sm font-medium text-[#121212] hover:bg-[#FBBF24] transition-colors"
          >
            Upload New
          </Link>
        </div>

        {bicks.length === 0 ? (
          <div className="rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-4">
              <svg
                className="h-8 w-8 text-[#a0a0a0]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[#f5f5f5]">No bicks yet</h3>
            <p className="mt-2 text-[#a0a0a0]">Get started by uploading your first bick.</p>
            <Link
              href="/upload"
              className="mt-6 inline-block rounded-full bg-[#FCD34D] px-6 py-3 text-sm font-medium text-[#121212] hover:bg-[#FBBF24] transition-colors"
            >
              Upload a Bick
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-[#1e1e1e] border border-[#2a2a2a]">
            <ul className="divide-y divide-[#2a2a2a]">
              {bicks.map((bick) => (
                <li key={bick.id} className="p-4 hover:bg-[#252525] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={bick.status === 'live' ? `/bick/${bick.slug}-${bick.id}` : '#'}
                        className={`text-sm font-medium ${
                          bick.status === 'live'
                            ? 'text-[#FCD34D] hover:text-[#FBBF24]'
                            : 'text-[#f5f5f5]'
                        } transition-colors`}
                      >
                        {bick.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-4 text-xs text-[#666666]">
                        {bick.duration_ms && (
                          <span>{formatDuration(bick.duration_ms)}</span>
                        )}
                        <span>
                          {new Date(bick.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        statusColors[bick.status] || 'bg-[#2a2a2a] text-[#666666]'
                      }`}
                    >
                      {bick.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
