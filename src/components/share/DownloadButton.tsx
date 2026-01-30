'use client';

import { useState, useRef, useEffect } from 'react';

export interface DownloadButtonProps {
  audioUrl?: string | null;
  videoUrl?: string | null;
  title: string;
  className?: string;
}

export function DownloadButton({ audioUrl, videoUrl, title, className = '' }: DownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState<'mp3' | 'mp4' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sanitizeFilename = (name: string) => {
    return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  };

  const handleDownload = async (type: 'mp3' | 'mp4') => {
    const url = type === 'mp3' ? audioUrl : videoUrl;
    if (!url) return;

    setDownloading(type);
    setIsOpen(false);

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${sanitizeFilename(title)}.${type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    } finally {
      setDownloading(null);
    }
  };

  if (!audioUrl && !videoUrl) return null;

  return (
    <div className={`relative`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={downloading !== null}
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 ${className || 'bg-[#262626] text-white hover:bg-[#333333] focus:ring-[#EF4444]'}`}
        aria-label="Download options"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>{downloading ? 'Downloading...' : 'Download'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-40 bg-[#1a1a1a] rounded-lg shadow-lg border border-[#262626] py-1 z-10">
          {audioUrl && (
            <button
              type="button"
              onClick={() => handleDownload('mp3')}
              className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-300 hover:bg-[#262626] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span>MP3 Audio</span>
            </button>
          )}
          {videoUrl && (
            <button
              type="button"
              onClick={() => handleDownload('mp4')}
              className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-300 hover:bg-[#262626] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>MP4 Video</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
