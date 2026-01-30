'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp, signInWithGoogle } from '@/lib/auth/actions';

interface SignInFormProps {
  redirectTo?: string;
}

export function SignInForm({ redirectTo = '/' }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    
    const result = await signInWithGoogle(redirectTo);
    
    if (result.error) {
      setIsGoogleLoading(false);
      setError(result.error);
    } else if (result.url) {
      window.location.href = result.url;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (mode === 'signup') {
      const result = await signUp(email, password);
      setIsLoading(false);
      if (result.success) {
        setSignUpSuccess(true);
      } else {
        setError(result.error || 'Failed to create account.');
      }
    } else {
      const result = await signIn(email, password);
      setIsLoading(false);
      if (result.success) {
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(result.error || 'Invalid email or password.');
      }
    }
  };

  if (signUpSuccess) {
    return (
      <div className="text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[#f5f5f5]">Account created!</h3>
        <p className="mt-2 text-sm text-[#a0a0a0]">
          Check your email to confirm your account, then sign in.
        </p>
        <button
          type="button"
          onClick={() => {
            setSignUpSuccess(false);
            setMode('signin');
            setPassword('');
          }}
          className="mt-4 text-sm text-[#FCD34D] hover:text-[#FBBF24]"
        >
          Sign in now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isLoading}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-[#333333] bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-[#f5f5f5] hover:bg-[#252525] focus:outline-none focus:ring-2 focus:ring-[#FCD34D] focus:ring-offset-2 focus:ring-offset-[#1e1e1e] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#333333]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[#1e1e1e] px-2 text-[#666666]">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#a0a0a0]">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 block w-full rounded-lg border border-[#333333] bg-[#1a1a1a] px-4 py-3 text-[#f5f5f5] placeholder-[#666666] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#FCD34D]"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#a0a0a0]">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={6}
            className="mt-1 block w-full rounded-lg border border-[#333333] bg-[#1a1a1a] px-4 py-3 text-[#f5f5f5] placeholder-[#666666] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#FCD34D]"
            placeholder="••••••••"
          />
          {mode === 'signup' && (
            <p className="mt-1 text-xs text-[#666666]">At least 6 characters</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isGoogleLoading || !email || !password}
          className="w-full rounded-lg bg-[#EF4444] px-4 py-3 text-sm font-medium text-white hover:bg-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#EF4444] focus:ring-offset-2 focus:ring-offset-[#1e1e1e] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {isLoading ? (mode === 'signup' ? 'Creating account...' : 'Signing in...') : (mode === 'signup' ? 'Create account' : 'Sign in')}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            className="text-sm text-[#FCD34D] hover:text-[#FBBF24]"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
