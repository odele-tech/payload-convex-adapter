/**
 * @fileoverview Payload Convex Adapter
 *
 * This package provides a database adapter for Payload CMS that uses Convex as the
 * underlying database. It enables seamless integration between Payload's data layer
 * and Convex's real-time, serverless database platform.
 *
 * ## Features
 * - Full Payload database adapter implementation
 * - Real-time data synchronization via Convex
 * - Transaction support with session tracking
 * - Type-safe query and mutation operations
 * - Serializable where filter system
 *
 * ## Usage
 * ```typescript
 * import { convexAdapter } from 'payload-convex-adapter';
 * import type { PayloadConvexConfig } from 'payload-convex-adapter';
 *
 * // In your Payload config
 * export default buildConfig({
 *   db: convexAdapter({
 *     convexUrl: 'https://your-deployment.convex.cloud',
 *     convexDeployment: 'dev:your-deployment',
 *     prefix: 'my_app',
 *   }),
 * });
 * ```
 *
 * @module payload-convex-adapter
 * @packageDocumentation
 */

import {
  convexAdapter,
  PayloadConvexAdapterProps,
  PayloadConvexConfig,
} from "./adapter";

export {
  convexAdapter,
  type PayloadConvexConfig,
  type PayloadConvexAdapterProps,
};
