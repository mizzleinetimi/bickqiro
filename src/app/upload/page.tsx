import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/actions';
import { UploadForm } from '@/components/upload';

export const metadata: Metadata = {
  title: 'Upload a Bick | Bickqr',
  description: 'Upload your short audio clips to Bickqr. Supports MP3, WAV, OGG, and M4A files up to 10 seconds.',
  robots: 'noindex,follow',
};

export default async function UploadPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/sign-in?next=/upload');
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Upload a <span className="text-brand-primary">Bick</span>
          </h1>
          <p className="mt-2 text-gray-400">
            Share your favorite sound clips with the world
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-surface rounded-xl border border-surface-border p-6 md:p-8 shadow-2xl shadow-black/50">
          <UploadForm />
        </div>

        {/* Guidelines */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            By uploading, you confirm that you have the rights to share this audio
            and agree to our{' '}
            <a href="/terms" className="text-brand-primary hover:text-brand-primary-hover hover:underline font-medium">
              Terms of Service
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
