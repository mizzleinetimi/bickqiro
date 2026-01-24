/**
 * Duration formatting utilities
 */

/**
 * Convert milliseconds to ISO 8601 duration format
 * Example: 65000ms -> "PT1M5S"
 */
export function formatIsoDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return 'PT0S';
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  let result = 'PT';
  if (hours > 0) result += `${hours}H`;
  if (minutes > 0) result += `${minutes}M`;
  if (seconds > 0 || result === 'PT') result += `${seconds}S`;
  
  return result;
}

/**
 * Convert milliseconds to human-readable format
 * Example: 65000ms -> "1:05"
 */
export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '0:00';
  
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse ISO 8601 duration to milliseconds
 * Example: "PT1M5S" -> 65000
 */
export function parseIsoDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}
