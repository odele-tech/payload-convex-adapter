/**
 * @fileoverview Random ID Generation
 *
 * This module provides UUID generation for creating unique identifiers
 * throughout the adapter. Uses UUID v4 for cryptographically secure
 * random ID generation.
 *
 * @module utils/random
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Creates a random UUID v4 identifier.
 *
 * Used for generating unique IDs for transactions, sessions, and
 * other entities that require unique identification.
 *
 * @returns {string} A UUID v4 string
 *
 * @example
 * ```typescript
 * const id = createRandomID();
 * // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function createRandomID() {
  return uuidv4();
}
