import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Upload',
  description: 'Upload your audio clips to Bickqr.',
}

export default function UploadPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Upload</h1>
      <p className="text-gray-600">Upload your bicks here.</p>
    </div>
  )
}
