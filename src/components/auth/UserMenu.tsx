'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from '@/lib/auth/actions';

interface UserMenuProps {
  user: {
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayText = user.displayName || user.email.split('@')[0];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#1e1e1e] transition-colors"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCD34D] text-xs font-medium text-[#121212]">
            {displayText.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline">{displayText}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#1e1e1e] py-1 border border-[#2a2a2a] shadow-lg">
          <div className="border-b border-[#2a2a2a] px-4 py-3">
            <p className="text-sm font-medium text-[#f5f5f5]">{displayText}</p>
            <p className="truncate text-xs text-[#666666]">{user.email}</p>
          </div>
          
          <Link
            href="/my-bicks"
            className="block px-4 py-2 text-sm text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#252525] transition-colors"
            onClick={() => setIsOpen(false)}
          >
            My Bicks
          </Link>
          
          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full px-4 py-2 text-left text-sm text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#252525] transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
