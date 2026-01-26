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
  processing: 'bg-yellow-100 text-yellow-800',
  live: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  removed: 'bg-gray-100 text-gray-800',
};

export default async function MyBicksPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/sign-in?next=/my-bicks');
  }

  const { bicks } = await getUserBicks(user.id);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Bicks</h1>
          <Link
            href="/upload"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Upload New
          </Link>
        </div>

        {bicks.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">No bicks yet</h3>
            <p className="mt-2 text-gray-500">Get started by uploading your first bick.</p>
            <Link
              href="/upload"
              className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Upload a Bick
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow-sm">
            <ul className="divide-y divide-gray-200">
              {bicks.map((bick) => (
                <li key={bick.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={bick.status === 'live' ? `/bick/${bick.slug}-${bick.id}` : '#'}
                        className={`text-sm font-medium ${
                          bick.status === 'live'
                            ? 'text-indigo-600 hover:text-indigo-500'
                            : 'text-gray-900'
                        }`}
                      >
                        {bick.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                        {bick.duration_ms && (
                          <span>{formatDuration(bick.duration_ms)}</span>
                        )}
                        <span>
                          {new Date(bick.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        statusColors[bick.status] || 'bg-gray-100 text-gray-800'
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
