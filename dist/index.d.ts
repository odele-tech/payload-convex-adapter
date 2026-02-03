import { DatabaseAdapterObj, BaseDatabaseAdapter, Payload } from 'payload';

/**
 * @fileoverview Convex Database Adapter Factory
 *
 * This module provides the main database adapter factory for integrating Convex
 * with Payload CMS. It implements Payload's `DatabaseAdapterObj` interface,
 * providing all required database operations.
 *
 * ## Architecture
 * The adapter uses a service-based architecture where:
 * - The adapter factory creates the database adapter configuration
 * - The adapter service manages the Convex client and utilities
 * - Bindings provide the actual database operation implementations
 *
 * ## Collection Naming
 * Collections are prefixed with the configured prefix to support multi-tenant
 * deployments and avoid naming conflicts. For example, with prefix "my_app",
 * a collection "users" becomes "my_app_users" in Convex.
 *
 * @module adapter
 */

/**
 * Configuration options for the Convex adapter.
 * These settings determine how the adapter connects to and interacts with Convex.
 */
type PayloadConvexConfig = {
    /**
     * The Convex deployment URL.
     * This is the HTTPS URL of your Convex deployment.
     * @example "https://valuable-salamander-162.convex.cloud"
     */
    convexUrl: string;
    /**
     * The Convex deployment identifier.
     * Format: "environment:deployment-name"
     * @example "dev:valuable-salamander-162"
     */
    convexDeployment: string;
    /**
     * The prefix to use for all Convex table names.
     * This enables multiple Payload instances to share a Convex deployment.
     * @example "my_app"
     */
    prefix: string;
};
/**
 * Props type for the convexAdapter factory function.
 * Alias for PayloadConvexConfig for clarity in function signatures.
 */
type PayloadConvexAdapterProps = PayloadConvexConfig;
/**
 * Type definition for the Convex database adapter.
 * Implements Payload's DatabaseAdapterObj interface with BaseDatabaseAdapter.
 */
type convexAdapter = DatabaseAdapterObj<BaseDatabaseAdapter>;
/**
 * Creates a Payload database adapter that uses Convex as the backend.
 *
 * This factory function returns a database adapter configuration object that
 * Payload uses to initialize the database connection. The adapter implements
 * all required Payload database operations including CRUD, transactions,
 * versioning, and migrations.
 *
 * @param {PayloadConvexAdapterProps} props - Configuration options for the adapter
 * @returns {convexAdapter} A Payload database adapter object
 *
 * @example
 * ```typescript
 * import { convexAdapter } from 'payload-convex-adapter';
 *
 * const adapter = convexAdapter({
 *   convexUrl: process.env.CONVEX_URL,
 *   convexDeployment: process.env.CONVEX_DEPLOYMENT,
 *   prefix: 'my_app',
 * });
 * ```
 */
declare function convexAdapter(props: PayloadConvexAdapterProps): {
    name: string;
    allowIDOnCreate: false;
    defaultIDType: "text";
    init: (args: {
        payload: Payload;
    }) => BaseDatabaseAdapter;
};

export { type PayloadConvexAdapterProps, type PayloadConvexConfig, convexAdapter };
