/**
 * @fileoverview Error Handling Utilities
 *
 * This module provides error types and utilities for consistent
 * error handling throughout the adapter.
 *
 * @module utils/errors
 */

/**
 * Structured error type for adapter errors.
 * Provides consistent error information across the adapter.
 */
export type Error = {
  /** Human-readable error message */
  message: string;
  /** Optional reason for the error */
  reason: string | null;
  /** Optional error code for programmatic handling */
  code: string | null;
  /** Optional additional error data */
  data: Record<string, any> | null;
};

/**
 * Builds a formatted JSON string from an error object.
 *
 * Creates a pretty-printed JSON representation of the error,
 * omitting null values for cleaner output.
 *
 * @param {Error} error - The error object to format
 * @returns {string} Pretty-printed JSON string
 *
 * @example
 * ```typescript
 * const errorString = buildErrorString({
 *   message: 'Document not found',
 *   reason: 'Invalid ID',
 *   code: 'NOT_FOUND',
 *   data: { id: '123' },
 * });
 * ```
 */
export function buildErrorString(error: Error) {
  return JSON.stringify(
    {
      code: error.code ?? undefined,
      message: error.message,
      reason: error.reason ?? undefined,
      data: error.data ?? undefined,
    },
    null,
    2,
  );
}
