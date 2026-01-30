import { Suspense } from 'react';
import { SignInContent } from './SignInContent';

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}

function SignInFallback() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <span className="text-3xl font-bold text-[#FCD34D]">Bickqr</span>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-[#f5f5f5]">
          Sign in to your account
        </h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#1e1e1e] py-8 px-4 border border-[#2a2a2a] sm:rounded-xl sm:px-10 animate-pulse">
          <div className="h-10 bg-gray-700 rounded mb-4" />
          <div className="h-10 bg-gray-700 rounded mb-4" />
          <div className="h-10 bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}
