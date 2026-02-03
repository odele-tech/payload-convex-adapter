/**
 * @fileoverview Convex-Safe Adapter Service Factory
 *
 * This module provides a "safe" version of the adapter service that can be used
 * within Convex functions. Unlike the standard adapter service, this version
 * does not include the Convex HTTP client, making it safe to import and use
 * inside Convex server functions without circular dependency issues.
 *
 * ## Use Cases
 * - Server-side Convex functions../convex/mutation-adapter/querieser utilities
 * - Convex actions that need to parse Payload where clauses
 * - Internal Convex mutations that need collection name parsing
 *
 * ## Differences from AdapterService
 * - No `db.client` property (no ConvexHttpClient or ConvexClient)
 * - No `db.api` property (no anyApi reference)
 * - Safe to use within Convex function handlers
 *
 * @module adapter/convex-safe-service
 */

import { Payload } from "payload";

import { QueryAdapter } from "../convex/queries";
import { MutationAdapter } from "../convex/mutations";
import * as bindings from "../bindings";
import { createServiceLogger } from "../tools/logger";
import { isDev } from "../tools/is-dev";
import { isClient } from "../tools/is-client";
import { createRandomID } from "../tools/random";
import { parseCollection } from "../tools/parse-collection";
import { queryProcessor } from "../tools/query-processor";
import { createWherePlan, emptyWherePlan } from "../tools/query-processor";
import { createSessionTracker } from "../tools/session-tracker";

/**
 * Configuration props for creating a Convex-safe adapter service.
 */
export type ConvexSafeAdapterServiceProps = {
  /** The Convex deployment URL */
  convexUrl: string;
  /** The Convex deployment identifier */
  convexDeployment: string;
  /** The table name prefix for this adapter instance */
  prefix: string;
  /** The Payload instance this service is associated with */
  payload: Payload;
};

/**
 * The Convex-safe adapter service type.
 * This type represents the service object without Convex client dependencies.
 */
export type ConvexSafeAdapterService = ReturnType<
  typeof createConvexSafeAdapterService
>;

/**
 * Creates a Convex-safe adapter service instance.
 *
 * This factory creates a service that can be safely used within Convex functions.
 * It provides access to query/mutation adapters and utility functions without
 * including the Convex client, which would cause issues when imported inside
 * Convex server functions.
 *
 * @param {ConvexSafeAdapterServiceProps} props - Configuration options
 * @returns {ConvexSafeAdapterService} The configured Convex-safe adapter service
 *
 * @example
 * ```typescript
 * // Inside a Convex function
 * const service = createConvexSafeAdapterService({
 *   convexUrl: 'https://your-deployment.convex.cloud',
 *   convexDeployment: 'dev:your-deployment',
 *   prefix: 'my_app',
 *   payload: payloadInstance,
 * });
 *
 * // Parse a collection name
 * const collectionId = service.tools.parseCollection({
 *   prefix: service.system.prefix,
 *   collection: 'users',
 * });
 * ```
 */
export function createConvexSafeAdapterService(
  props: ConvexSafeAdapterServiceProps
) {
  const { payload, prefix, convexUrl } = props;

  const serviceLogger = createServiceLogger({ prefix });
  const sessionTracker = createSessionTracker();

  const system = {
    url: convexUrl,
    prefix: prefix,
    logger: serviceLogger,
    isDev,
    isClient,
  };

  const db = {
    query: QueryAdapter,
    mutation: MutationAdapter,
    bindings: bindings,
  };

  const tools = {
    sessionTracker,
    createRandomID,
    parseCollection,
    queryProcessor,
    createWherePlan,
    emptyWherePlan,
  };

  return {
    db,
    tools,
    system,
    payload,
  };
}
