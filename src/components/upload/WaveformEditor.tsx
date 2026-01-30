/**
 * WaveformEditor Component
 * 
 * Displays audio waveform visualization using wavesurfer.js with region selection
 * for trimming audio to a maximum of 10 seconds.
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 3.2, 3.3**
 */
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions';

interface WaveformEditorProps {
  /** Audio source - File object, Blob, or URL string */
  audioSource: File | Blob | string;
  /** Maximum allowed duration in seconds (default: 10) */
  maxDuration?: number;
  /** Callback when trim selection changes */
  onTrimChange: (startMs: number, endMs: number) => void;
  /** Callback when audio is loaded and ready */
  onReady: (durationMs: number) => void;
  /** Optional error callback */
  onError?: (error: string) => void;
}

export function WaveformEditor({
  audioSource,
  maxDuration = 10,
  onTrimChange,
  onReady,
  onError,
}: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const regionRef = useRef<Region | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selection, setSelection] = useState({ start: 0, end: maxDuration });

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);
    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4B5563',
      progressColor: '#EF4444',
      cursorColor: '#EF4444',
      cursorWidth: 2,
      height: 128,
      normalize: true,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      plugins: [regions],
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      const dur = ws.getDuration();
      setDuration(dur);
      setIsLoading(false);
      onReady(dur * 1000);

      // Create selection region if audio exceeds max duration
      if (dur > maxDuration) {
        const region = regions.addRegion({
          start: 0,
          end: maxDuration,
          color: 'rgba(239, 68, 68, 0.2)',
          drag: true,
          resize: true,
        });
        regionRef.current = region;
        setSelection({ start: 0, end: maxDuration });
        onTrimChange(0, maxDuration * 1000);
      } else {
        setSelection({ start: 0, end: dur });
        onTrimChange(0, dur * 1000);
      }
    });

    ws.on('timeupdate', (time) => {
      setCurrentTime(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    ws.on('error', (err) => {
      setIsLoading(false);
      onError?.(err.message || 'Failed to load audio');
    });

    // Handle region updates
    regions.on('region-updated', (region) => {
      let start = region.start;
      let end = region.end;
      
      // Enforce max duration
      if (end - start > maxDuration) {
        end = start + maxDuration;
        region.setOptions({ end });
      }
      
      setSelection({ start, end });
      onTrimChange(start * 1000, end * 1000);
    });

    // Load audio source
    if (audioSource instanceof Blob) {
      // Blob includes File (File extends Blob)
      ws.loadBlob(audioSource);
    } else {
      ws.load(audioSource);
    }

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      regionsRef.current = null;
      regionRef.current = null;
    };
  }, [audioSource, maxDuration, onTrimChange, onReady, onError]);

  const togglePlay = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    if (isPlaying) {
      ws.pause();
    } else {
      // If we have a selection region, play only that portion
      if (duration > maxDuration && regionRef.current) {
        ws.setTime(selection.start);
        ws.play();
        
        // Stop at selection end
        const checkEnd = setInterval(() => {
          if (ws.getCurrentTime() >= selection.end) {
            ws.pause();
            clearInterval(checkEnd);
          }
        }, 50);
      } else {
        ws.playPause();
      }
    }
  }, [isPlaying, duration, maxDuration, selection]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const selectionDuration = selection.end - selection.start;
  const needsTrimming = duration > maxDuration;

  return (
    <div className="space-y-4">
      {/* Waveform container */}
      <div className="relative">
        <div 
          ref={containerRef} 
          className="w-full rounded-lg bg-[#1a1a1a] p-4 min-h-[160px] waveform-editor"
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] rounded-lg">
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="animate-spin h-5 w-5 text-[#EF4444]" viewBox="0 0 24 24">
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
              <span>Loading audio...</span>
            </div>
          </div>
        )}
      </div>

      {/* Custom styles for region handles */}
      <style jsx global>{`
        .waveform-editor [part="region-handle"] {
          width: 6px !important;
          background: #EF4444 !important;
          border-radius: 3px !important;
          opacity: 1 !important;
        }
        .waveform-editor [part="region-handle"]:hover {
          background: #DC2626 !important;
          transform: scaleY(1.05);
        }
        .waveform-editor [part="region"] {
          border-left: 3px solid #EF4444 !important;
          border-right: 3px solid #EF4444 !important;
        }
      `}</style>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="flex items-center justify-center w-12 h-12 bg-[#EF4444] text-white rounded-full hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          
          <div className="text-sm text-gray-400 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="text-sm text-gray-400">
          {needsTrimming ? (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#EF4444] rounded-full" />
              Selected: {selectionDuration.toFixed(1)}s / {maxDuration}s max
            </span>
          ) : (
            <span>Duration: {duration.toFixed(1)}s</span>
          )}
        </div>
      </div>

      {/* Trimming instructions */}
      {needsTrimming && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg">
          <p className="text-sm text-gray-300">
            <strong className="text-white">Audio exceeds {maxDuration} seconds.</strong> Drag the highlighted region to select which portion to upload. 
            You can also resize the selection by dragging its edges.
          </p>
        </div>
      )}

      {/* Selection info */}
      {needsTrimming && (
        <div className="flex items-center justify-between text-sm text-gray-500 px-1">
          <span>Start: {formatTime(selection.start)}</span>
          <span>End: {formatTime(selection.end)}</span>
        </div>
      )}
    </div>
  );
}
