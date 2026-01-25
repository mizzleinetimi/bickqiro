'use client';

import { useRef, useState, useEffect } from 'react';

interface BickPlayerProps {
  audioUrl?: string | null;
  title: string;
  durationMs?: number | null;
  minimal?: boolean;
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

export function BickPlayer({ audioUrl, title, durationMs, minimal = false }: BickPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationMs ? durationMs / 1000 : 0);
  const [error, setError] = useState<string | null>(null);

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
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setError('Playback failed');
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`${minimal ? 'bg-gray-900 text-white p-4' : 'bg-gray-100 p-6 rounded-lg'}`}>
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}
      
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={!audioUrl}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            minimal ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'
          } ${!audioUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>
        
        <div className="flex-1">
          {!minimal && <p className="font-medium">{title}</p>}
          
          <div className={`h-2 ${minimal ? 'bg-gray-700' : 'bg-gray-300'} rounded mt-1 overflow-hidden`}>
            <div 
              className="h-full bg-blue-500 rounded transition-all duration-100" 
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className={`flex justify-between text-xs mt-1 ${minimal ? 'text-gray-400' : 'text-gray-500'}`}>
            <span>{formatSeconds(currentTime)}</span>
            <span>{duration > 0 ? formatSeconds(duration) : formatDuration(durationMs)}</span>
          </div>
        </div>
      </div>
      
      {error && (
        <p className={`text-xs mt-2 ${minimal ? 'text-red-400' : 'text-red-500'}`}>
          {error}
        </p>
      )}
      
      {!audioUrl && !error && (
        <p className={`text-xs mt-2 ${minimal ? 'text-gray-400' : 'text-gray-500'}`}>
          Audio not available
        </p>
      )}
    </div>
  );
}
