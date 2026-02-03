/**
 * @fileoverview Collection Name Parsing
 *
 * This module provides utilities for parsing and prefixing collection names.
 * Collection prefixing enables multiple Payload instances to share a single
 * Convex deployment without naming conflicts.
 *
 * @module utils/parse-collection
 */

/**
 * Props for the parseCollection function.
 */
export type ParseCollectionProps = {
  /** The prefix to prepend to the collection name */
  prefix: string;
  /** The base collection name */
  collection: string;
};

/**
 * Parses a collection name by prepending the configured prefix.
 *
 * This function creates a namespaced collection name by combining
 * the prefix and collection name with an underscore separator.
 * Hyphens are converted to underscores to comply with Convex identifier rules.
 *
 * **Idempotent**: If the collection is already prefixed, it returns the collection as-is.
 *
 * @param {ParseCollectionProps} props - The parsing parameters
 * @returns {string} The prefixed collection name with Convex-safe characters
 *
 * @example
 * ```typescript
 * const collectionId = parseCollection({
 *   prefix: 'my_app',
 *   collection: 'users',
 * });
 * // Returns: "my_app_users"
 *
 * const collectionId2 = parseCollection({
 *   prefix: 'my_app',
 *   collection: 'payload-preferences',
 * });
 * // Returns: "my_app_payload_preferences"
 *
 * // Idempotent - already prefixed collections are returned as-is
 * const collectionId3 = parseCollection({
 *   prefix: 'my_app',
 *   collection: 'my_app_users',
 * });
 * // Returns: "my_app_users" (not "my_app_my_app_users")
 * ```
 */
export function parseCollection(props: ParseCollectionProps) {
  const { prefix, collection } = props;

  // Check if collection is already prefixed
  if (collection.startsWith(`${prefix}_`)) {
    return collection;
  }

  // Replace hyphens with underscores to comply with Convex identifier rules
  // Convex identifiers can only contain alphanumeric characters and underscores
  const sanitizedCollection = collection.replace(/-/g, "_");
  return `${prefix}_${sanitizedCollection}`;
}
