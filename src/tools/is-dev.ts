/**
 * @fileoverview Development Environment Detection
 *
 * This module provides a simple flag for detecting whether the
 * application is running in development mode.
 *
 * @module utils/is-dev
 */

/**
 * Boolean flag indicating if the application is in development mode.
 * True when NODE_ENV is set to "development".
 *
 * @example
 * ```typescript
 * if (isDev) {
 *   console.log('Running in development mode');
 * }
 * ```
 */
export const isDev = process.env.NODE_ENV === "development";
