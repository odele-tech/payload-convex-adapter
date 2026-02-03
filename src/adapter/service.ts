/**
 * @fileoverview Adapter Service Factory
 *
 * This module provides the core service layer for the Convex adapter. The adapter
 * service encapsulates all dependencies and utilities needed for database operations,
 * including the Convex client, session tracking, and query/mutation adapters.
 *
 * ## Service Structure
 * The service is organized into four main sections:
 * - `db`: Database client and operation adapters
 * - `tools`: Utility functions (ID generation, session tracking, etc.)
 * - `system`: Configuration values (URL, prefix)
 * - `payload`: Reference to the Payload instance
 *
 * @module adapter/service
 */

import { Payload } from "payload";
import { GenericDataModel, anyApi } from "convex/server";

import { QueryAdapter, MutationAdapter, createConvexClient } from "../convex";

import {
  createRandomID,
  createSessionTracker,
  createServiceLogger,
  isDev,
  isClient,
  queryProcessor,
  parseCollection,
  createWherePlan,
  emptyWherePlan,
} from "../tools";

import * as bindings from "../bindings";

/**
 * Configuration props for creating an adapter service.
 *
 * @template T - The Convex data model type
 */
export type AdapterServiceProps<T extends GenericDataModel> = {
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
 * The adapter service type, inferred from the factory function return type.
 * This type represents the complete service object with all its properties and methods.
 *
 * @template T - The Convex data model type
 */
export type AdapterService<T extends GenericDataModel = GenericDataModel> =
  ReturnType<typeof createAdapterService<T>>;

/**
 * Creates an adapter service instance with all required dependencies.
 *
 * The adapter service is the central coordination point for all database operations.
 * It provides access to:
 * - The Convex client for direct database access
 * - Query and mutation adapters for type-safe operations
 * - Utility functions for ID generation and collection parsing
 * - Session tracking for transaction management
 *
 * @template T - The Convex data model type
 * @param {AdapterServiceProps<T>} props - Configuration options
 * @returns {AdapterService<T>} The configured adapter service
 *
 * @example
 * ```typescript
 * const service = createAdapterService({
 *   convexUrl: 'https://your-deployment.convex.cloud',
 *   convexDeployment: 'dev:your-deployment',
 *   prefix: 'my_app',
 *   payload: payloadInstance,
 * });
 *
 * // Use the service for database operations
 * const docs = await service.db.query({}).collectionQuery.adapter({
 *   service,
 *   collection: 'users',
 *   index: null,
 * });
 * ```
 */
export function createAdapterService<T extends GenericDataModel>(
  props: AdapterServiceProps<T>
) {
  const { payload, prefix, convexUrl } = props;

  const convexClient = createConvexClient({ convexUrl });
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
    client: convexClient,
    bindings: bindings,
    query: QueryAdapter,
    mutation: MutationAdapter,
    api: anyApi,
  };

  const tools = {
    sessionTracker,
    createRandomID,
    queryProcessor,
    parseCollection,
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
