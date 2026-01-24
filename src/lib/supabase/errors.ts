/**
 * Supabase error handling utilities
 */
import type { PostgrestError } from '@supabase/supabase-js';

export type AppErrorType = 
  | 'CONFLICT' 
  | 'BAD_REQUEST' 
  | 'NOT_FOUND' 
  | 'FORBIDDEN' 
  | 'INTERNAL';

export interface AppError {
  type: AppErrorType;
  message: string;
  field?: string;
  code?: string;
}

/**
 * Extract field name from Postgres error detail
 */
function extractField(error: PostgrestError): string | undefined {
  // Try to extract field from error details
  // Format: "Key (field_name)=(value) already exists"
  const match = error.details?.match(/Key \((\w+)\)/);
  return match?.[1];
}

/**
 * Map Postgres error codes to application errors
 * See: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export function handleSupabaseError(error: PostgrestError): AppError {
  switch (error.code) {
    // Unique violation
    case '23505':
      return {
        type: 'CONFLICT',
        message: 'Resource already exists',
        field: extractField(error),
        code: error.code,
      };

    // Foreign key violation
    case '23503':
      return {
        type: 'BAD_REQUEST',
        message: 'Referenced resource not found',
        code: error.code,
      };

    // Check constraint violation
    case '23514':
      return {
        type: 'BAD_REQUEST',
        message: 'Invalid value for field',
        field: extractField(error),
        code: error.code,
      };

    // Not null violation
    case '23502':
      return {
        type: 'BAD_REQUEST',
        message: 'Required field missing',
        field: extractField(error),
        code: error.code,
      };

    // RLS policy violation
    case '42501':
      return {
        type: 'FORBIDDEN',
        message: 'Permission denied',
        code: error.code,
      };

    // No rows returned (for single() queries)
    case 'PGRST116':
      return {
        type: 'NOT_FOUND',
        message: 'Resource not found',
        code: error.code,
      };

    default:
      return {
        type: 'INTERNAL',
        message: error.message || 'Database error',
        code: error.code,
      };
  }
}

/**
 * Check if an error is a Supabase/Postgrest error
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * HTTP status code mapping for app errors
 */
export function getHttpStatus(errorType: AppErrorType): number {
  switch (errorType) {
    case 'CONFLICT':
      return 409;
    case 'BAD_REQUEST':
      return 400;
    case 'NOT_FOUND':
      return 404;
    case 'FORBIDDEN':
      return 403;
    case 'INTERNAL':
    default:
      return 500;
  }
}
