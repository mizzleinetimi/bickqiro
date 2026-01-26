import Link from 'next/link';
import { getUser, getUserProfile } from '@/lib/auth/actions';
import { UserMenu } from '@/components/auth/UserMenu';
import type { Profile } from '@/types/database.types';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/trending', label: 'Trending' },
  { href: '/search', label: 'Search' },
  { href: '/upload', label: 'Upload' },
];

export async function NavShell() {
  const user = await getUser();
  const profile: Profile | null = user ? await getUserProfile() : null;

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Bickqr
          </Link>
          <div className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-600 hover:text-gray-900"
              >
                {item.label}
              </Link>
            ))}
            
            {user ? (
              <UserMenu
                user={{
                  email: user.email || '',
                  displayName: profile?.display_name || undefined,
                  avatarUrl: profile?.avatar_url || undefined,
                }}
              />
            ) : (
              <Link
                href="/auth/sign-in"
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
