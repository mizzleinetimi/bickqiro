'use client';

import { useRef, useState, useEffect } from 'react';
import { useTrackingDebounce } from '@/hooks/useTrackingDebounce';

interface BickPlayerProps {
  audioUrl?: string | null;
  title: string;
  durationMs?: number | null;
  minimal?: boolean;
  bickId?: string;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatSeconds(secs: number): string {
  const mins = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${mins}:${s.toString().padStart(2, '0')}`;
}

export function BickPlayer({ audioUrl, title, durationMs, minimal = false, bickId }: BickPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationMs ? durationMs / 1000 : 0);
  const [error, setError] = useState<string | null>(null);
  
  const { track: trackPlay } = useTrackingDebounce({
    bickId: bickId || '',
    eventType: 'play',
    debounceMs: 30000,
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setError('Failed to load audio');

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Track play on every play click
        if (bickId) {
          trackPlay();
        }
        
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setError('Playback failed');
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`${minimal ? 'bg-[#141414] text-white p-4' : 'bg-[#141414] p-6 rounded-xl border border-[#262626]'}`}>
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}
      
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={!audioUrl}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            'bg-[#EF4444] text-white hover:bg-[#DC2626]'
          } ${!audioUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>
        
        <div className="flex-1">
          {!minimal && <p className="font-medium text-white mb-2">{title}</p>}
          
          <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#EF4444] rounded-full transition-all duration-100" 
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs mt-2 text-gray-500">
            <span>{formatSeconds(currentTime)}</span>
            <span>{duration > 0 ? formatSeconds(duration) : formatDuration(durationMs)}</span>
          </div>
        </div>
      </div>
      
      {error && (
        <p className="text-xs mt-2 text-red-400">
          {error}
        </p>
      )}
      
      {!audioUrl && !error && (
        <p className="text-xs mt-2 text-gray-500">
          Audio not available
        </p>
      )}
    </div>
  );
}
