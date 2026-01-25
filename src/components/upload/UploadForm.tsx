/**
 * UploadForm Component
 * 
 * Main upload form that orchestrates the complete upload flow:
 * 1. Source selection (file upload or URL extraction)
 * 2. Waveform visualization and trimming
 * 3. Metadata entry
 * 4. Upload to R2 and job enqueue
 * 
 * **Validates: Requirements 3.1, 3.4, 6.3, 6.4, 6.5**
 */
'use client';

import { useState, useCallback } from 'react';
import { FileDropzone } from './FileDropzone';
import { UrlExtractor } from './UrlExtractor';
import { WaveformEditor } from './WaveformEditor';
import { MetadataForm, type UploadMetadata } from './MetadataForm';
import { trimAudio, MAX_TRIM_DURATION_MS } from '@/lib/audio/trimmer';

type UploadStep = 'source' | 'trim' | 'metadata' | 'uploading' | 'complete' | 'error';

interface UploadState {
  step: UploadStep;
  audioSource: File | Blob | string | null;
  sourceUrl: string | null;
  originalFileName: string | null;
  originalDurationMs: number;
  trimRange: { start: number; end: number };
  error: string | null;
  bickId: string | null;
}

const initialState: UploadState = {
  step: 'source',
  audioSource: null,
  sourceUrl: null,
  originalFileName: null,
  originalDurationMs: 0,
  trimRange: { start: 0, end: MAX_TRIM_DURATION_MS },
  error: null,
  bickId: null,
};

export function UploadForm() {
  const [state, setState] = useState<UploadState>(initialState);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  // Handle file selection from dropzone (can be File or extracted Blob from video)
  const handleFileSelect = useCallback((file: File | Blob, originalFileName?: string) => {
    setState(prev => ({
      ...prev,
      audioSource: file,
      sourceUrl: null,
      originalFileName: originalFileName || (file instanceof File ? file.name : null),
      error: null,
      step: 'trim',
    }));
  }, []);

  // Handle URL extraction success
  const handleUrlExtracted = useCallback((
    audioUrl: string, 
    sourceUrl: string, 
    durationMs: number
  ) => {
    setState(prev => ({
      ...prev,
      audioSource: audioUrl,
      sourceUrl,
      originalDurationMs: durationMs,
      error: null,
      step: 'trim',
    }));
  }, []);

  // Handle waveform ready
  const handleAudioReady = useCallback((durationMs: number) => {
    setState(prev => ({
      ...prev,
      originalDurationMs: durationMs,
      trimRange: durationMs <= MAX_TRIM_DURATION_MS 
        ? { start: 0, end: durationMs }
        : { start: 0, end: MAX_TRIM_DURATION_MS },
    }));
  }, []);

  // Handle trim selection change
  const handleTrimChange = useCallback((startMs: number, endMs: number) => {
    setState(prev => ({
      ...prev,
      trimRange: { start: startMs, end: endMs },
    }));
  }, []);

  // Continue to metadata step
  const handleContinueToMetadata = useCallback(() => {
    setState(prev => ({ ...prev, step: 'metadata' }));
  }, []);

  // Go back to source selection
  const handleBackToSource = useCallback(() => {
    setState(initialState);
  }, []);

  // Go back to trim step
  const handleBackToTrim = useCallback(() => {
    setState(prev => ({ ...prev, step: 'trim', error: null }));
  }, []);

  // Handle metadata submission and upload
  const handleMetadataSubmit = useCallback(async (metadata: UploadMetadata) => {
    const { audioSource, sourceUrl, originalFileName, originalDurationMs, trimRange } = state;
    
    if (!audioSource) return;

    setState(prev => ({ ...prev, step: 'uploading', error: null }));

    try {
      // 1. Prepare audio blob (trim if needed)
      let audioBlob: Blob;
      const needsTrimming = originalDurationMs > MAX_TRIM_DURATION_MS;

      if (audioSource instanceof File || audioSource instanceof Blob) {
        // Handle File or Blob (from video extraction)
        if (needsTrimming) {
          const result = await trimAudio(audioSource, trimRange.start, trimRange.end);
          audioBlob = result.blob;
        } else {
          audioBlob = audioSource;
        }
      } else {
        // Fetch audio from URL string
        const response = await fetch(audioSource);
        if (!response.ok) {
          throw new Error('Failed to fetch audio');
        }
        const blob = await response.blob();
        
        if (needsTrimming) {
          const result = await trimAudio(blob, trimRange.start, trimRange.end);
          audioBlob = result.blob;
        } else {
          audioBlob = blob;
        }
      }

      // 2. Create upload session
      const sessionResponse = await fetch('/api/bicks/upload-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          filename: originalFileName || (audioSource instanceof File ? audioSource.name : 'extracted.mp3'),
          contentType: audioBlob.type || 'audio/wav',
          durationMs: trimRange.end - trimRange.start,
          originalDurationMs,
          sourceUrl,
        }),
      });

      const session = await sessionResponse.json();
      
      if (!session.success) {
        throw new Error(session.error || 'Failed to create upload session');
      }

      // 3. Upload to R2 via presigned URL
      const uploadResponse = await fetch(session.uploadUrl, {
        method: 'PUT',
        body: audioBlob,
        headers: { 
          'Content-Type': audioBlob.type || 'audio/wav',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio to storage');
      }

      // 4. Mark upload complete and enqueue processing job
      const completeResponse = await fetch(`/api/bicks/${session.bickId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storageKey: session.storageKey,
          sizeBytes: audioBlob.size,
        }),
      });

      const complete = await completeResponse.json();
      
      if (!complete.success) {
        throw new Error(complete.error || 'Failed to complete upload');
      }

      // Success!
      setState(prev => ({
        ...prev,
        step: 'complete',
        bickId: session.bickId,
      }));

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setState(prev => ({
        ...prev,
        step: 'error',
        error: message,
      }));
    }
  }, [state]);

  // Reset and start over
  const handleStartOver = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Error banner */}
      {state.error && state.step !== 'error' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Step: Source Selection */}
      {state.step === 'source' && (
        <div className="space-y-8">
          <FileDropzone 
            onFileSelect={handleFileSelect}
            onError={setError}
          />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>
          
          <UrlExtractor 
            onExtracted={handleUrlExtracted}
            onError={setError}
          />
        </div>
      )}

      {/* Step: Trim */}
      {state.step === 'trim' && state.audioSource && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Preview & Trim
            </h2>
            <button
              onClick={handleBackToSource}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Choose different audio
            </button>
          </div>

          <WaveformEditor
            audioSource={state.audioSource}
            maxDuration={MAX_TRIM_DURATION_MS / 1000}
            onTrimChange={handleTrimChange}
            onReady={handleAudioReady}
            onError={setError}
          />

          <button
            onClick={handleContinueToMetadata}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step: Metadata */}
      {state.step === 'metadata' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Add Details
            </h2>
            <button
              onClick={handleBackToTrim}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to trim
            </button>
          </div>

          <MetadataForm onSubmit={handleMetadataSubmit} />
        </div>
      )}

      {/* Step: Uploading */}
      {state.step === 'uploading' && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="4" 
                fill="none" 
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" 
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Uploading your bick...</h2>
          <p className="mt-2 text-gray-500">This may take a moment</p>
        </div>
      )}

      {/* Step: Complete */}
      {state.step === 'complete' && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Upload Complete!</h2>
          <p className="mt-2 text-gray-500">
            Your bick is being processed and will be live shortly.
          </p>
          <div className="mt-6 space-x-4">
            <button
              onClick={handleStartOver}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Upload Another
            </button>
            {state.bickId && (
              <a
                href={`/bick/${state.bickId}`}
                className="inline-block px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View Bick
              </a>
            )}
          </div>
        </div>
      )}

      {/* Step: Error */}
      {state.step === 'error' && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Upload Failed</h2>
          <p className="mt-2 text-gray-500">{state.error}</p>
          <div className="mt-6 space-x-4">
            <button
              onClick={handleBackToTrim}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleStartOver}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
