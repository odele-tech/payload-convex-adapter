/**
 * @fileoverview Client Environment Detection
 *
 * This module provides a simple flag for detecting whether the
 * code is running in a browser (client) or server environment.
 *
 * @module utils/is-client
 */

/**
 * Boolean flag indicating if the code is running in a browser.
 * True when the `window` object is defined (browser environment).
 *
 * @example
 * ```typescript
 * if (isClient) {
 *   // Browser-only code
 *   window.localStorage.setItem('key', 'value');
 * }
 * ```
 */
declare const window: unknown;
export const isClient = typeof window !== "undefined";
