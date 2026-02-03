import * as payload from 'payload';
import { Payload } from 'payload';
import { al as QueryAdapter, aj as MutationAdapter, bs as bindings, bt as SessionTracker, bu as createRandomID, bv as parseCollection, bw as queryProcessor, bx as createWherePlan, by as emptyWherePlan, bz as ServiceLogger } from '../mutations-B1Ah6tX6.js';
import 'convex/values';
import 'convex/server';
import 'convex/browser';

/**
 * Configuration props for creating a Convex-safe adapter service.
 */
type ConvexSafeAdapterServiceProps = {
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
type ConvexSafeAdapterService = ReturnType<typeof createConvexSafeAdapterService>;
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
declare function createConvexSafeAdapterService(props: ConvexSafeAdapterServiceProps): {
    db: {
        query: typeof QueryAdapter;
        mutation: typeof MutationAdapter;
        bindings: typeof bindings;
    };
    tools: {
        sessionTracker: SessionTracker;
        createRandomID: typeof createRandomID;
        parseCollection: typeof parseCollection;
        queryProcessor: typeof queryProcessor;
        createWherePlan: typeof createWherePlan;
        emptyWherePlan: typeof emptyWherePlan;
    };
    system: {
        url: string;
        prefix: string;
        logger: ServiceLogger;
        isDev: boolean;
        isClient: boolean;
    };
    payload: payload.BasePayload;
};

export { type ConvexSafeAdapterService, type ConvexSafeAdapterServiceProps, createConvexSafeAdapterService };
