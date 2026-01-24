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

export function BickPlayer({ audioUrl, title, durationMs, minimal = false }: BickPlayerProps) {
  return (
    <div className={`${minimal ? 'bg-gray-900 text-white p-4' : 'bg-gray-100 p-6 rounded-lg'}`}>
      <div className="flex items-center gap-4">
        <button
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            minimal ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'
          }`}
          aria-label={`Play ${title}`}
        >
          <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        </button>
        
        <div className="flex-1">
          {!minimal && <p className="font-medium">{title}</p>}
          
          <div className={`h-8 ${minimal ? 'bg-gray-700' : 'bg-gray-300'} rounded mt-1`}>
            <div className="h-full w-0 bg-blue-500 rounded" />
          </div>
          
          <div className="flex justify-between text-xs mt-1 text-gray-500">
            <span>0:00</span>
            <span>{formatDuration(durationMs)}</span>
          </div>
        </div>
      </div>
      
      {!audioUrl && (
        <p className={`text-xs mt-2 ${minimal ? 'text-gray-400' : 'text-gray-500'}`}>
          Audio not available
        </p>
      )}
    </div>
  );
}
