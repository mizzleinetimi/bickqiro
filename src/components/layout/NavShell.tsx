import Link from 'next/link';
import { getUser, getUserProfile } from '@/lib/auth/actions';
import { UserMenu } from '@/components/auth/UserMenu';
import type { Profile } from '@/types/database.types';

export async function NavShell() {
  const user = await getUser();
  const profile: Profile | null = user ? await getUserProfile() : null;

  return (
    <nav className="border-b border-[#262626] bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 text-xl font-bold">
            <span>🔥🔥🔥</span>
            <span className="text-white">Bick</span>
            <span className="text-[#FCD34D]">qr</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/upload"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Upload
            </Link>
            <Link
              href="/trending"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Explore
            </Link>
            
            {user ? (
              <UserMenu
                user={{
                  email: user.email || '',
                  displayName: profile?.display_name || undefined,
                  avatarUrl: profile?.avatar_url || undefined,
                }}
              />
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/sign-in"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/sign-in"
                  className="rounded-full bg-[#EF4444] px-4 py-2 text-sm font-medium text-white hover:bg-[#DC2626] transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
