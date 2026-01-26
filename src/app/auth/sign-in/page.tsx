'use client';

import { useSearchParams } from 'next/navigation';
import { SignInForm } from '@/components/auth/SignInForm';
import Link from 'next/link';

const errorMessages: Record<string, string> = {
  auth_failed: 'Authentication failed. Please try again.',
  invalid_credentials: 'Invalid email or password.',
};

export default function SignInPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const errorCode = searchParams.get('error');

  const errorMessage = errorCode ? errorMessages[errorCode] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <span className="text-2xl font-bold text-indigo-600">Bickqr</span>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {errorMessage && (
            <div className="mb-4 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          <SignInForm redirectTo={next} />
        </div>
      </div>
    </div>
  );
}
