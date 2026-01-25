/**
 * FileDropzone Component
 * 
 * Drag and drop file selection with validation for audio and video files.
 * Video files are automatically processed to extract their audio track.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 */
'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  isValidMimeType, 
  isValidFileSize, 
  isVideoMimeType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/upload/validation';
import { extractAudioFromVideo } from '@/lib/audio/video-extractor';

interface FileDropzoneProps {
  /** Callback when a valid file is selected (audio file or extracted audio blob) */
  onFileSelect: (file: File | Blob, originalFileName?: string) => void;
  /** Optional error callback */
  onError?: (error: string) => void;
  /** Whether the dropzone is disabled */
  disabled?: boolean;
}

export function FileDropzone({ onFileSelect, onError, disabled = false }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!isValidMimeType(file.type)) {
      return 'Unsupported file type. Please upload MP3, WAV, OGG, M4A, or a video file (MP4, WebM, MOV).';
    }
    
    if (!isValidFileSize(file.size)) {
      const maxMB = MAX_FILE_SIZE / (1024 * 1024);
      return `File too large. Maximum size is ${maxMB}MB.`;
    }
    
    return null;
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setError(null);

    // Check if it's a video file - extract audio
    if (isVideoMimeType(file.type)) {
      setIsProcessing(true);
      try {
        const result = await extractAudioFromVideo(file);
        // Pass the extracted audio blob with original filename for reference
        onFileSelect(result.blob, file.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to extract audio from video';
        setError(message);
        onError?.(message);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // It's an audio file, pass directly
      onFileSelect(file);
    }
  }, [validateFile, onFileSelect, onError]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing) {
      inputRef.current?.click();
    }
  }, [disabled, isProcessing]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isProcessing) {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, [disabled, isProcessing]);

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb}MB`;
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Upload Audio or Video File
      </label>
      
      <div
        role="button"
        tabIndex={disabled || isProcessing ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50' 
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }
          ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(',')}
          onChange={handleInputChange}
          disabled={disabled || isProcessing}
          className="sr-only"
          aria-label="Upload audio or video file"
        />

        <div className="space-y-3">
          {/* Icon */}
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
            isDragging ? 'bg-indigo-100' : isProcessing ? 'bg-yellow-100' : 'bg-gray-100'
          }`}>
            {isProcessing ? (
              <svg className="animate-spin w-6 h-6 text-yellow-600" viewBox="0 0 24 24">
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
            ) : (
              <svg 
                className={`w-6 h-6 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                />
              </svg>
            )}
          </div>

          {/* Text */}
          <div>
            <p className="text-sm text-gray-600">
              {isProcessing ? (
                <span className="text-yellow-600 font-medium">Extracting audio from video...</span>
              ) : isDragging ? (
                <span className="text-indigo-600 font-medium">Drop your file here</span>
              ) : (
                <>
                  <span className="text-indigo-600 font-medium">Click to upload</span>
                  {' '}or drag and drop
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Audio (MP3, WAV, OGG, M4A) or Video (MP4, WebM, MOV) up to {formatFileSize(MAX_FILE_SIZE)}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
