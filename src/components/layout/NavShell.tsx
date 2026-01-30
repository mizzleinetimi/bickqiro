import Link from 'next/link';
import { Upload, TrendingUp, Bookmark } from 'lucide-react';
import { getUser, getUserProfile } from '@/lib/auth/actions';
import { UserMenu } from '@/components/auth/UserMenu';
import { Logo } from './Logo';
import type { Profile } from '@/types/database.types';

export async function NavShell() {
  const user = await getUser();
  const profile: Profile | null = user ? await getUserProfile() : null;

  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group">
            <div className="transition-transform duration-200 group-hover:scale-105">
              <Logo size="md" />
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/upload"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Link>
            <Link
              href="/trending"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Explore
            </Link>
            {user && (
              <Link
                href="/saved"
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Saved
              </Link>
            )}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <UserMenu
                user={{
                  email: user.email || '',
                  displayName: profile?.display_name || undefined,
                  avatarUrl: profile?.avatar_url || undefined,
                }}
              />
            ) : (
              <>
                {/* Anonymous User Info */}
                <div className="hidden sm:flex items-center gap-3">
                  <div className="text-xs text-gray-400">
                    <span className="text-brand-accent font-medium">3</span> free bicks left
                  </div>
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/sign-in"
                    className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/sign-in"
                    className="bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-800">
          <Link
            href="/upload"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload
          </Link>
          <Link
            href="/trending"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm"
          >
            <TrendingUp className="w-4 h-4" />
            Explore
          </Link>
          {user && (
            <Link
              href="/saved"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm"
            >
              <Bookmark className="w-4 h-4" />
              Saved
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
