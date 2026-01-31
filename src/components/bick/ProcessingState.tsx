'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProcessingStateProps {
  title: string;
}

export function ProcessingState({ title }: ProcessingStateProps) {
  const router = useRouter();

  useEffect(() => {
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-surface rounded-2xl border border-surface-border p-8 shadow-2xl shadow-black/50 text-center">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-brand-primary animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">{title}</h1>
        <p className="text-gray-400 mb-6">Your bick is being processed...</p>
        <p className="text-sm text-gray-500">This usually takes less than a minute.</p>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-600">
          <span className="inline-block w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
          <span>Auto-refreshing...</span>
        </div>
      </div>
    </div>
  );
}
