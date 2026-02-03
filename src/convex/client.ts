/**
 * @fileoverview Convex Client Factory
 *
 * This module provides a factory function for creating Convex client instances.
 * It creates both HTTP and WebSocket clients for different use cases.
 *
 * ## Client Types
 *
 * ### ConvexHttpClient (directClient)
 * - Uses HTTP requests for each operation
 * - Best for server-side operations and one-off queries
 * - No persistent connection overhead
 * - Suitable for serverless environments
 *
 * ### ConvexClient (liveClient)
 * - Uses WebSocket for real-time subscriptions
 * - Maintains persistent connection to Convex
 * - Best for client-side applications with real-time updates
 * - Automatically reconnects on connection loss
 *
 * @module convex/helpers/client
 */

import { ConvexHttpClient, ConvexClient } from "convex/browser";

/**
 * Configuration props for creating Convex clients.
 */
export type ConvexClientProps = {
  /** The Convex deployment URL */
  convexUrl: string;
};

/**
 * Creates Convex client instances for database operations.
 *
 * This factory creates two types of clients:
 * - `directClient`: HTTP-based client for direct queries/mutations
 * - `liveClient`: WebSocket-based client for real-time subscriptions
 *
 * @param {ConvexClientProps} props - Configuration options
 * @returns {{ directClient: ConvexHttpClient, liveClient: ConvexClient }} Client instances
 *
 * @example
 * ```typescript
 * const { directClient, liveClient } = createConvexClient({
 *   convexUrl: 'https://your-deployment.convex.cloud',
 * });
 *
 * // Use directClient for one-off operations
 * const result = await directClient.query(api.users.list);
 *
 * // Use liveClient for subscriptions
 * liveClient.onUpdate(api.users.list, {}, (users) => {
 *   console.log('Users updated:', users);
 * });
 * ```
 */
export function createConvexClient(props: ConvexClientProps) {
  const { convexUrl } = props;

  const directClient = new ConvexHttpClient(convexUrl);
  const liveClient = new ConvexClient(convexUrl);

  return {
    directClient,
    liveClient,
  };
}
