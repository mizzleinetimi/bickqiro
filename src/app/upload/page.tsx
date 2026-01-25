import type { Metadata } from 'next';
import { UploadForm } from '@/components/upload';

export const metadata: Metadata = {
  title: 'Upload a Bick | Bickqr',
  description: 'Upload your short audio clips to Bickqr. Supports MP3, WAV, OGG, and M4A files up to 10 seconds.',
  robots: 'noindex,follow', // Upload page should not be indexed
};

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Upload a Bick</h1>
          <p className="mt-2 text-gray-600">
            Share your favorite sound clips with the world
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <UploadForm />
        </div>

        {/* Guidelines */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            By uploading, you confirm that you have the rights to share this audio
            and agree to our{' '}
            <a href="/terms" className="text-indigo-600 hover:underline">
              Terms of Service
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
