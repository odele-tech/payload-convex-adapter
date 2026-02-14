/**
 * @fileoverview Query Adapter for Convex Database Operations
 *
 * This module provides a comprehensive set of query operations for interacting with
 * Convex databases through the Payload adapter. It implements a two-layer architecture:
 *
 * 1. **Convex Functions** (`convex*`): Define the Convex query handlers that run on the server
 * 2. **Adapter Functions** (`adapter*`): Client-side wrappers that invoke the Convex functions
 *
 * Each query operation supports optional indexing and where filtering using the
 * ParsedWhereFilter system for type-safe, serializable query conditions.
 *
 * @module query-adapter
 */

import {
  queryGeneric,
  PaginationOptions,
  IndexRangeBuilder,
  IndexRange,
  GenericDocument,
  GenericIndexFields,
  RegisteredQuery,
} from "convex/server";
import { v } from "convex/values";

import type { AdapterService } from "../adapter/service";
import type { EnhancedParsedWhereFilter } from "../tools/query-processor";
import { normalizeConvexQuery } from "../tools/query-processor";

/**
 * Extracts the result type from a Convex get operation.
 * Handles nested Promise types and returns the unwrapped result or null.
 */
export type ExtractConvexGetResult<T> =
  T extends Promise<RegisteredQuery<any, any, Promise<infer R>>>
    ? R | null
    : T extends RegisteredQuery<any, any, Promise<infer R>>
      ? R | null
      : T extends Promise<RegisteredQuery<any, any, infer R>>
        ? R | null
        : T extends RegisteredQuery<any, any, infer R>
          ? R | null
          : T | null;

/**
 * Extracts the result type from a Convex query operation.
 * Handles nested Promise types and array unwrapping for collection queries.
 */
export type ExtractConvexQueryResult<T> =
  T extends Promise<RegisteredQuery<any, any, Promise<infer R>>>
    ? R extends Array<infer U>
      ? U[]
      : R
    : T extends RegisteredQuery<any, any, Promise<infer R>>
      ? R extends Array<infer U>
        ? U[]
        : R
      : T extends Promise<RegisteredQuery<any, any, infer R>>
        ? R extends Promise<infer U>
          ? U extends Array<infer V>
            ? V[]
            : U
          : R extends Array<infer U>
            ? U[]
            : R
        : T extends RegisteredQuery<any, any, infer R>
          ? R extends Promise<infer U>
            ? U extends Array<infer V>
              ? V[]
              : U
            : R extends Array<infer U>
              ? U[]
              : R
          : GenericDocument[] | null;

/**
 * Configuration for query index usage.
 * Allows specifying an index name and optional range builder for optimized queries.
 */
export type AdapaterQueryIndex =
  | {
      indexName: string;
      indexRange?: (
        q: IndexRangeBuilder<GenericDocument, GenericIndexFields, number>
      ) => IndexRange;
    }
  | undefined;

// ============================================================================
// Get By ID
// ============================================================================

/**
 * Props for creating a Convex getById query function.
 */
export type ConvexGetByIdProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side getById operation.
 */
export type AdapterGetByIdProps = {
  service: AdapterService;
  collection: string;
  id: string;
};

/**
 * Result type for getById operations.
 */
export type ConvexGetByIdResult = ExtractConvexGetResult<
  ReturnType<typeof convexGetById>
>;

/**
 * @function convexGetById
 * Creates a Convex query function to fetch a single document by its ID.
 * Uses Convex's native `ctx.db.get()` for O(1) direct ID lookup.
 *
 * @param {ConvexGetByIdProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches a document by ID
 */
export function convexGetById(props: ConvexGetByIdProps) {
  const { service } = props;

  return queryGeneric({
    args: {
      collection: v.string(),
      id: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      if (!args.id) {
        service.system.logger("No ID provided for getById operation").warn();
        return null;
      }

      // Direct ID lookup using Convex's native get method (O(1) performance)
      const doc = await ctx.db.get(args.id as any);

      // Transform to Payload format
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        convex: true,
      });
      const result = doc ? processor.toPayload(doc) : null;

      service.system
        .logger({
          fn: "getById",
          props: { collection: args.collection, id: args.id },
          result: result,
        })
        .log();

      return result;
    },
  });
}

/**
 * @function adapterGetById
 * Adapter-side function to fetch a single document by its ID.
 * Handles collection prefixing and invokes the Convex query.
 *
 * @param {AdapterGetByIdProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {string} props.id - The document ID to fetch
 * @returns {Promise<ConvexGetByIdResult>} The fetched document or null
 */
export async function adapterGetById(props: AdapterGetByIdProps) {
  const { service, collection, id } = props;

  const client = service.db.client.directClient;
  const api = service.db.api;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    convex: false,
  });

  const query = (await client.query(api.adapter.getById, {
    collection: processor.convexQueryProps.collection,
    id,
  })) as ConvexGetByIdResult;

  return query;
}

/**
 * GetById operation bundle containing both adapter and convex implementations.
 */
export const getById = {
  adapter: adapterGetById,
  convex: convexGetById,
};

// ============================================================================
// Collection Query
// ============================================================================

/**
 * Props for creating a Convex collection query function.
 */
export type ConvexCollectionQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection query operation.
 */
export type AdapterCollectionQueryProps = {
  service: AdapterService;
  collection: string;
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection query operations.
 */
export type ConvexCollectionQueryResult = ExtractConvexQueryResult<
  ReturnType<typeof convexCollectionQuery>
>;

/**
 * @function convexCollectionQuery
 * Creates a Convex query function to fetch all documents from a collection.
 * Supports optional index configuration for optimized queries.
 *
 * @param {ConvexCollectionQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches all documents
 */
export function convexCollectionQuery(props: ConvexCollectionQueryProps) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor.query().toPayload();

      service.system
        .logger({
          fn: "collectionQuery",
          props: { collection: args.collection, index: args.index },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionQuery
 * Adapter-side function to fetch all documents from a collection.
 *
 * @param {AdapterCollectionQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionQueryResult>} Array of documents
 */
export async function adapterCollectionQuery(
  props: AdapterCollectionQueryProps
) {
  const { service, collection, index } = props;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    index,
    convex: false,
  });

  const client = service.db.client.directClient;
  const api = service.db.api;

  const query = (await client.query(api.adapter.collectionQuery, {
    collection: processor.convexQueryProps.collection,
    index: processor.convexQueryProps.index,
  })) as ConvexCollectionQueryResult;

  return query;
}

/**
 * Collection query operation bundle containing both adapter and convex implementations.
 */
export const collectionQuery = {
  adapter: adapterCollectionQuery,
  convex: convexCollectionQuery,
};

/**
 * Props for creating a Convex collection count query function.
 */
export type ConvexCollectionCountQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection count query operation.
 */
export type AdapterCollectionCountQueryProps = {
  service: AdapterService;
  collection: string;
  wherePlan: EnhancedParsedWhereFilter;
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection count query operations.
 */
export type ConvexCollectionCountQueryResult = ExtractConvexQueryResult<
  ReturnType<typeof convexCollectionCountQuery>
>;

/**
 * @function convexCollectionCountQuery
 * Creates a Convex query function to count documents in a collection.
 * Supports optional where filtering and index configuration.
 *
 * @param {ConvexCollectionCountQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that returns document count
 */
export function convexCollectionCountQuery(
  props: ConvexCollectionCountQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const data = await processor.query().postFilter().collect();
      const result = data.length;

      service.system
        .logger({
          fn: "collectionCountQuery",
          props: { collection: args.collection, wherePlan: args.wherePlan },
          result: result,
        })
        .log();

      return result;
    },
  });
}

/**
 * @function adapterCollectionCountQuery
 * Adapter-side function to count documents in a collection with optional filtering.
 *
 * @param {AdapterCollectionCountQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<number>} The count of matching documents
 */
export async function adapterCollectionCountQuery(
  props: AdapterCollectionCountQueryProps
) {
  const { service, collection, wherePlan, index } = props;

  const client = service.db.client.directClient;
  const api = service.db.api;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    index,
    convex: false,
  });

  const query = (await client.query(api.adapter.collectionCountQuery, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
    index: processor.convexQueryProps.index ?? undefined,
  })) as ConvexCollectionCountQueryResult;

  return query;
}

/**
 * Collection count query operation bundle containing both adapter and convex implementations.
 */
export const collectionCountQuery = {
  adapter: adapterCollectionCountQuery,
  convex: convexCollectionCountQuery,
};

// ============================================================================
// Collection Where Query
// ============================================================================
// Uses the new two-phase design: ParsedWhereFilter → buildConvexFilter

/**
 * Props for creating a Convex collection where query function.
 */
export type ConvexCollectionWhereQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection where query operation.
 */
export type AdapterCollectionWhereQueryProps = {
  service: AdapterService;
  collection: string;
  wherePlan: EnhancedParsedWhereFilter;
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection where query operations.
 */
export type ConvexCollectionWhereQueryResult = ExtractConvexQueryResult<
  ReturnType<typeof convexCollectionWhereQuery>
>;

/**
 * @function convexCollectionWhereQuery
 * Creates a Convex query function to fetch documents matching a where filter.
 * Uses the two-phase ParsedWhereFilter system for type-safe filtering.
 *
 * @param {ConvexCollectionWhereQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches filtered documents
 */
export function convexCollectionWhereQuery(
  props: ConvexCollectionWhereQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor.query().postFilter().toPayload();

      service.system
        .logger({
          fn: "collectionWhereQuery",
          props: { collection: args.collection, wherePlan: args.wherePlan },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionWhereQuery
 * Adapter-side function to fetch documents matching a where filter.
 *
 * @param {AdapterCollectionWhereQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWhereQueryResult>} Array of matching documents
 */
export async function adapterCollectionWhereQuery(
  props: AdapterCollectionWhereQueryProps
) {
  const { service, collection, wherePlan, index } = props;

  const client = service.db.client.directClient;
  const api = service.db.api;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    index,
    convex: false,
  });

  const query = (await client.query(api.adapter.collectionWhereQuery, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
    index: processor.convexQueryProps.index ?? undefined,
  })) as ConvexCollectionWhereQueryResult;

  return query;
}

/**
 * Collection where query operation bundle containing both adapter and convex implementations.
 */
export const collectionWhereQuery = {
  adapter: adapterCollectionWhereQuery,
  convex: convexCollectionWhereQuery,
};

// ============================================================================
// Collection Order Query
// ============================================================================

/**
 * Props for creating a Convex collection order query function.
 */
export type ConvexCollectionOrderQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection order query operation.
 */
export type AdapterCollectionOrderQueryProps = {
  service: AdapterService;
  collection: string;
  order: "asc" | "desc";
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection order query operations.
 */
export type ConvexCollectionOrderQueryResult = ExtractConvexQueryResult<
  ReturnType<typeof convexCollectionOrderQuery>
>;

/**
 * @function convexCollectionOrderQuery
 * Creates a Convex query function to fetch documents with ordering.
 *
 * @param {ConvexCollectionOrderQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches ordered documents
 */
export function convexCollectionOrderQuery(
  props: ConvexCollectionOrderQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      order: v.union(v.literal("asc"), v.literal("desc")),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor.query().order(args.order).toPayload();

      service.system
        .logger({
          fn: "collectionOrderQuery",
          props: { collection: args.collection, order: args.order },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionOrderQuery
 * Adapter-side function to fetch documents with ordering.
 *
 * @param {AdapterCollectionOrderQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionOrderQueryResult>} Array of ordered documents
 */
export async function adapterCollectionOrderQuery(
  props: AdapterCollectionOrderQueryProps
) {
  const { service, collection, order, index } = props;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    order,
    index,
    convex: false,
  });

  const client = service.db.client.directClient;
  const api = service.db.api;

  const query = (await client.query(api.adapter.collectionOrderQuery, {
    collection: processor.convexQueryProps.collection,
    order: processor.convexQueryProps.order,
    index: processor.convexQueryProps.index ?? undefined,
  })) as ConvexCollectionOrderQueryResult;

  return query;
}

/**
 * Collection order query operation bundle containing both adapter and convex implementations.
 */
export const collectionOrderQuery = {
  adapter: adapterCollectionOrderQuery,
  convex: convexCollectionOrderQuery,
};

// ============================================================================
// Collection Order Limit Query
// ============================================================================

/**
 * Props for creating a Convex collection order limit query function.
 */
export type ConvexCollectionOrderLimitQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection order limit query operation.
 */
export type AdapterCollectionOrderLimitQueryProps = {
  service: AdapterService;
  collection: string;
  order: "asc" | "desc";
  limit: number;
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection order limit query operations.
 */
export type ConvexCollectionOrderLimitQueryResult = ExtractConvexQueryResult<
  ReturnType<typeof convexCollectionOrderLimitQuery>
>;

/**
 * @function convexCollectionOrderLimitQuery
 * Creates a Convex query function to fetch ordered documents with a limit.
 *
 * @param {ConvexCollectionOrderLimitQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches limited ordered documents
 */
export function convexCollectionOrderLimitQuery(
  props: ConvexCollectionOrderLimitQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      order: v.union(v.literal("asc"), v.literal("desc")),
      limit: v.number(),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor
        .query()
        .order(args.order)
        .take(args.limit)
        .toPayload();

      service.system
        .logger({
          fn: "collectionOrderLimitQuery",
          props: { collection: args.collection, order: args.order, limit: args.limit },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionOrderLimitQuery
 * Adapter-side function to fetch ordered documents with a limit.
 *
 * @param {AdapterCollectionOrderLimitQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {number} props.limit - Maximum number of documents to return
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionOrderLimitQueryResult>} Array of limited ordered documents
 */
export async function adapterCollectionOrderLimitQuery(
  props: AdapterCollectionOrderLimitQueryProps
) {
  const { service, collection, order, limit, index } = props;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    limit,
    sort: order === "desc" ? "-createdAt" : "createdAt",
    index,
    convex: false,
  });

  const client = service.db.client.directClient;
  const api = service.db.api;

  const query = (await client.query(api.adapter.collectionOrderLimitQuery, {
    collection: processor.convexQueryProps.collection,
    order: processor.convexQueryProps.order,
    limit: processor.convexQueryProps.limit,
    index: processor.convexQueryProps.index ?? undefined,
  })) as ConvexCollectionOrderLimitQueryResult;

  return query;
}

/**
 * Collection order limit query operation bundle containing both adapter and convex implementations.
 */
export const collectionOrderLimitQuery = {
  adapter: adapterCollectionOrderLimitQuery,
  convex: convexCollectionOrderLimitQuery,
};

// ============================================================================
// Collection Order Paginate Query
// ============================================================================

/**
 * Props for creating a Convex collection order paginate query function.
 */
export type ConvexCollectionOrderPaginateQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection order paginate query operation.
 */
export type AdapterCollectionOrderPaginateQueryProps = {
  service: AdapterService;
  collection: string;
  paginationOpts: PaginationOptions;
  order: "asc" | "desc";
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection order paginate query operations.
 */
export type ConvexCollectionOrderPaginateQueryResult = ExtractConvexQueryResult<
  ReturnType<typeof convexCollectionOrderPaginateQuery>
>;

/**
 * @function convexCollectionOrderPaginateQuery
 * Creates a Convex query function to fetch ordered documents with pagination.
 *
 * @param {ConvexCollectionOrderPaginateQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches paginated ordered documents
 */
export function convexCollectionOrderPaginateQuery(
  props: ConvexCollectionOrderPaginateQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      order: v.union(v.literal("asc"), v.literal("desc")),
      paginationOpts: v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      }),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor
        .query()
        .order(args.order)
        .paginate(args.paginationOpts)
        .toPayload();

      service.system
        .logger({
          fn: "collectionOrderPaginateQuery",
          props: { collection: args.collection, order: args.order, paginationOpts: args.paginationOpts },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionOrderPaginateQuery
 * Adapter-side function to fetch ordered documents with pagination.
 *
 * @param {AdapterCollectionOrderPaginateQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {PaginationOptions} props.paginationOpts - Pagination configuration
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionOrderPaginateQueryResult>} Paginated result with documents
 */
export async function adapterCollectionOrderPaginateQuery(
  props: AdapterCollectionOrderPaginateQueryProps
) {
  const { service, collection, order, paginationOpts, index } = props;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    sort: order === "desc" ? "-createdAt" : "createdAt",
    pagination: true,
    index,
    convex: false,
  });

  const client = service.db.client.directClient;
  const api = service.db.api;

  const query = (await client.query(api.adapter.collectionOrderPaginateQuery, {
    collection: processor.convexQueryProps.collection,
    order: processor.convexQueryProps.order,
    paginationOpts: paginationOpts,
    index: processor.convexQueryProps.index ?? undefined,
  })) as ConvexCollectionOrderPaginateQueryResult;

  return query;
}

/**
 * Collection order paginate query operation bundle containing both adapter and convex implementations.
 */
export const collectionOrderPaginateQuery = {
  adapter: adapterCollectionOrderPaginateQuery,
  convex: convexCollectionOrderPaginateQuery,
};

// ============================================================================
// Collection Limit Query
// ============================================================================

/**
 * Props for creating a Convex collection limit query function.
 */
export type ConvexCollectionLimitQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection limit query operation.
 */
export type AdapterCollectionLimitQueryProps = {
  service: AdapterService;
  collection: string;
  limit: number;
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection limit query operations.
 */
export type ConvexCollectionLimitQueryResult = ExtractConvexQueryResult<
  ReturnType<typeof convexCollectionLimitQuery>
>;

/**
 * @function convexCollectionLimitQuery
 * Creates a Convex query function to fetch documents with a limit.
 *
 * @param {ConvexCollectionLimitQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches limited documents
 */
export function convexCollectionLimitQuery(
  props: ConvexCollectionLimitQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      limit: v.number(),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor.query().take(args.limit).toPayload();

      service.system
        .logger({
          fn: "collectionLimitQuery",
          props: { collection: args.collection, limit: args.limit },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionLimitQuery
 * Adapter-side function to fetch documents with a limit.
 *
 * @param {AdapterCollectionLimitQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {number} props.limit - Maximum number of documents to return
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionLimitQueryResult>} Array of limited documents
 */
export async function adapterCollectionLimitQuery(
  props: AdapterCollectionLimitQueryProps
) {
  const { service, collection, limit, index } = props;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    limit,
    index,
    convex: false,
  });

  const client = service.db.client.directClient;
  const api = service.db.api;

  const query = (await client.query(api.adapter.collectionLimitQuery, {
    collection: processor.convexQueryProps.collection,
    limit: processor.convexQueryProps.limit,
    index: processor.convexQueryProps.index ?? undefined,
  })) as ConvexCollectionLimitQueryResult;

  return query;
}

/**
 * Collection limit query operation bundle containing both adapter and convex implementations.
 */
export const collectionLimitQuery = {
  adapter: adapterCollectionLimitQuery,
  convex: convexCollectionLimitQuery,
};

// ============================================================================
// Collection Where Order Query
// ============================================================================

/**
 * Props for creating a Convex collection where order query function.
 */
export type ConvexCollectionWhereOrderQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection where order query operation.
 */
export type AdapterCollectionWhereOrderQueryProps = {
  service: AdapterService;
  collection: string;
  wherePlan: EnhancedParsedWhereFilter;
  order: "asc" | "desc";
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection where order query operations.
 */
export type ConvexCollectionWhereOrderQueryResult = ExtractConvexQueryResult<
  ReturnType<typeof convexCollectionWhereOrderQuery>
>;

/**
 * @function convexCollectionWhereOrderQuery
 * Creates a Convex query function to fetch filtered documents with ordering.
 *
 * @param {ConvexCollectionWhereOrderQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches filtered ordered documents
 */
export function convexCollectionWhereOrderQuery(
  props: ConvexCollectionWhereOrderQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      order: v.union(v.literal("asc"), v.literal("desc")),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        wherePlan: args.wherePlan,
        collection: args.collection,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor.query().order(args.order).postFilter().toPayload();

      service.system
        .logger({
          fn: "collectionWhereOrderQuery",
          props: { collection: args.collection, wherePlan: args.wherePlan, order: args.order },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionWhereOrderQuery
 * Adapter-side function to fetch filtered documents with ordering.
 *
 * @param {AdapterCollectionWhereOrderQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWhereOrderQueryResult>} Array of filtered ordered documents
 */
export async function adapterCollectionWhereOrderQuery(
  props: AdapterCollectionWhereOrderQueryProps
) {
  const { service, collection, wherePlan, order, index } = props;

  const processor = service.tools.queryProcessor({
    service,
    collection: collection,
    wherePlan: wherePlan,
    order: order,
    index: index,
    convex: false,
  });

  const client = service.db.client.directClient;
  const api = service.db.api;

  const query = (await client.query(
    api.adapter.collectionWhereOrderQuery,
    processor.convexQueryProps
  )) as ConvexCollectionWhereOrderQueryResult;

  return query;
}

/**
 * Collection where order query operation bundle containing both adapter and convex implementations.
 */
export const collectionWhereOrderQuery = {
  adapter: adapterCollectionWhereOrderQuery,
  convex: convexCollectionWhereOrderQuery,
};

// ============================================================================
// Collection Where Limit Query
// ============================================================================

/**
 * Props for creating a Convex collection where limit query function.
 */
export type ConvexCollectionWhereLimitQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection where limit query operation.
 */
export type AdapterCollectionWhereLimitQueryProps = {
  service: AdapterService;
  collection: string;
  wherePlan: EnhancedParsedWhereFilter;
  limit: number;
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection where limit query operations.
 */
export type ConvexCollectionWhereLimitQueryResult = ExtractConvexQueryResult<
  ReturnType<typeof convexCollectionWhereLimitQuery>
>;

/**
 * @function convexCollectionWhereLimitQuery
 * Creates a Convex query function to fetch filtered documents with a limit.
 *
 * @param {ConvexCollectionWhereLimitQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches limited filtered documents
 */
export function convexCollectionWhereLimitQuery(
  props: ConvexCollectionWhereLimitQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      limit: v.number(),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor
        .query()
        .take(args.limit)
        .postFilter()
        .toPayload();

      service.system
        .logger({
          fn: "collectionWhereLimitQuery",
          props: { collection: args.collection, wherePlan: args.wherePlan, limit: args.limit },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionWhereLimitQuery
 * Adapter-side function to fetch filtered documents with a limit.
 *
 * @param {AdapterCollectionWhereLimitQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {number} props.limit - Maximum number of documents to return
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWhereLimitQueryResult>} Array of limited filtered documents
 */
export async function adapterCollectionWhereLimitQuery(
  props: AdapterCollectionWhereLimitQueryProps
) {
  const { service, collection, wherePlan, limit, index } = props;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    limit,
    index,
    convex: false,
  });

  const client = service.db.client.directClient;
  const api = service.db.api;

  const query = (await client.query(api.adapter.collectionWhereLimitQuery, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
    limit: processor.convexQueryProps.limit,
    index: processor.convexQueryProps.index ?? undefined,
  })) as ConvexCollectionWhereLimitQueryResult;

  return query;
}

/**
 * Collection where limit query operation bundle containing both adapter and convex implementations.
 */
export const collectionWhereLimitQuery = {
  adapter: adapterCollectionWhereLimitQuery,
  convex: convexCollectionWhereLimitQuery,
};

// ============================================================================
// Collection Where Paginate Query
// ============================================================================

/**
 * Props for creating a Convex collection where paginate query function.
 */
export type ConvexCollectionWherePaginateQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection where paginate query operation.
 */
export type AdapterCollectionWherePaginateQueryProps = {
  service: AdapterService;
  collection: string;
  wherePlan: EnhancedParsedWhereFilter;
  paginationOpts: PaginationOptions;
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection where paginate query operations.
 */
export type ConvexCollectionWherePaginateQueryResult = ExtractConvexQueryResult<
  ReturnType<typeof convexCollectionWherePaginateQuery>
>;

/**
 * @function convexCollectionWherePaginateQuery
 * Creates a Convex query function to fetch filtered documents with pagination.
 *
 * @param {ConvexCollectionWherePaginateQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches paginated filtered documents
 */
export function convexCollectionWherePaginateQuery(
  props: ConvexCollectionWherePaginateQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      paginationOpts: v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      }),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor
        .query()
        .paginate(args.paginationOpts)
        .postFilter()
        .toPayload();

      service.system
        .logger({
          fn: "collectionWherePaginateQuery",
          props: { collection: args.collection, wherePlan: args.wherePlan, paginationOpts: args.paginationOpts },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionWherePaginateQuery
 * Adapter-side function to fetch filtered documents with pagination.
 *
 * @param {AdapterCollectionWherePaginateQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {PaginationOptions} props.paginationOpts - Pagination configuration
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWherePaginateQueryResult>} Paginated result with filtered documents
 */
export async function adapterCollectionWherePaginateQuery(
  props: AdapterCollectionWherePaginateQueryProps
) {
  const { service, collection, wherePlan, paginationOpts, index } = props;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    pagination: true,
    index,
    convex: false,
  });

  const client = service.db.client.directClient;
  const api = service.db.api;

  const query = (await client.query(api.adapter.collectionWherePaginateQuery, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
    paginationOpts: paginationOpts,
    index: processor.convexQueryProps.index ?? undefined,
  })) as ConvexCollectionWherePaginateQueryResult;

  return query;
}

/**
 * Collection where paginate query operation bundle containing both adapter and convex implementations.
 */
export const collectionWherePaginateQuery = {
  adapter: adapterCollectionWherePaginateQuery,
  convex: convexCollectionWherePaginateQuery,
};

// ============================================================================
// Collection Where Order Limit Query
// ============================================================================

/**
 * Props for creating a Convex collection where order limit query function.
 */
export type ConvexCollectionWhereOrderLimitQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection where order limit query operation.
 */
export type AdapterCollectionWhereOrderLimitQueryProps = {
  service: AdapterService;
  collection: string;
  wherePlan: EnhancedParsedWhereFilter;
  order: "asc" | "desc";
  limit: number;
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection where order limit query operations.
 */
export type ConvexCollectionWhereOrderLimitQueryResult =
  ExtractConvexQueryResult<
    ReturnType<typeof convexCollectionWhereOrderLimitQuery>
  >;

/**
 * @function convexCollectionWhereOrderLimitQuery
 * Creates a Convex query function to fetch filtered documents with ordering and limit.
 *
 * @param {ConvexCollectionWhereOrderLimitQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches limited filtered ordered documents
 */
export function convexCollectionWhereOrderLimitQuery(
  props: ConvexCollectionWhereOrderLimitQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      order: v.union(v.literal("asc"), v.literal("desc")),
      limit: v.number(),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor
        .query()
        .order(args.order)
        .take(args.limit)
        .postFilter()
        .toPayload();

      service.system
        .logger({
          fn: "collectionWhereOrderLimitQuery",
          props: { collection: args.collection, wherePlan: args.wherePlan, order: args.order, limit: args.limit },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionWhereOrderLimitQuery
 * Adapter-side function to fetch filtered documents with ordering and limit.
 *
 * @param {AdapterCollectionWhereOrderLimitQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {number} props.limit - Maximum number of documents to return
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWhereOrderLimitQueryResult>} Array of limited filtered ordered documents
 */
export async function adapterCollectionWhereOrderLimitQuery(
  props: AdapterCollectionWhereOrderLimitQueryProps
) {
  const { service, collection, wherePlan, order, limit, index } = props;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    limit,
    sort: order === "desc" ? "-createdAt" : "createdAt",
    index,
    convex: false,
  });

  const client = service.db.client.directClient;
  const api = service.db.api;

  const query = (await client.query(
    api.adapter.collectionWhereOrderLimitQuery,
    {
      collection: processor.convexQueryProps.collection,
      wherePlan: processor.convexQueryProps.wherePlan,
      order: processor.convexQueryProps.order,
      limit: processor.convexQueryProps.limit,
      index: processor.convexQueryProps.index ?? undefined,
    }
  )) as ConvexCollectionWhereOrderLimitQueryResult;

  return query;
}

/**
 * Collection where order limit query operation bundle containing both adapter and convex implementations.
 */
export const collectionWhereOrderLimitQuery = {
  adapter: adapterCollectionWhereOrderLimitQuery,
  convex: convexCollectionWhereOrderLimitQuery,
};

// ============================================================================
// Collection Where Order Paginate Query
// ============================================================================

/**
 * Props for creating a Convex collection where order paginate query function.
 */
export type ConvexCollectionWhereOrderPaginateQueryProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side collection where order paginate query operation.
 */
export type AdapterCollectionWhereOrderPaginateQueryProps = {
  service: AdapterService;
  collection: string;
  wherePlan: EnhancedParsedWhereFilter;
  order: "asc" | "desc";
  paginationOpts: PaginationOptions;
  index?: AdapaterQueryIndex;
};

/**
 * Result type for collection where order paginate query operations.
 */
export type ConvexCollectionWhereOrderPaginateQueryResult =
  ExtractConvexQueryResult<
    ReturnType<typeof convexCollectionWhereOrderPaginateQuery>
  >;

/**
 * @function convexCollectionWhereOrderPaginateQuery
 * Creates a Convex query function to fetch filtered documents with ordering and pagination.
 * This is the most feature-complete query combining filtering, ordering, and pagination.
 *
 * @param {ConvexCollectionWhereOrderPaginateQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches paginated filtered ordered documents
 */
export function convexCollectionWhereOrderPaginateQuery(
  props: ConvexCollectionWhereOrderPaginateQueryProps
) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      order: v.union(v.literal("asc"), v.literal("desc")),
      paginationOpts: v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      }),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any()),
          }),
          v.null()
        )
      ),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index as AdapaterQueryIndex,
        convex: true,
      });

      const query = await processor
        .query()
        .order(args.order)
        .paginate(args.paginationOpts)
        .postFilter()
        .toPayload();

      service.system
        .logger({
          fn: "collectionWhereOrderPaginateQuery",
          props: { collection: args.collection, wherePlan: args.wherePlan, order: args.order, paginationOpts: args.paginationOpts },
          result: query,
        })
        .log();

      return query;
    },
  });
}

/**
 * @function adapterCollectionWhereOrderPaginateQuery
 * Adapter-side function to fetch filtered documents with ordering and pagination.
 *
 * @param {AdapterCollectionWhereOrderPaginateQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {PaginationOptions} props.paginationOpts - Pagination configuration
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWhereOrderPaginateQueryResult>} Paginated result with filtered ordered documents
 */
export async function adapterCollectionWhereOrderPaginateQuery(
  props: AdapterCollectionWhereOrderPaginateQueryProps
) {
  const { service, collection, wherePlan, order, paginationOpts, index } =
    props;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    sort: order === "desc" ? "-createdAt" : "createdAt",
    pagination: true,
    index,
    convex: false,
  });

  const client = service.db.client.directClient;
  const api = service.db.api;

  const query = (await client.query(
    api.adapter.collectionWhereOrderPaginateQuery,
    {
      collection: processor.convexQueryProps.collection,
      wherePlan: processor.convexQueryProps.wherePlan,
      order: processor.convexQueryProps.order,
      paginationOpts: paginationOpts,
      index: processor.convexQueryProps.index ?? undefined,
    }
  )) as ConvexCollectionWhereOrderPaginateQueryResult;

  return query;
}

/**
 * Collection where order paginate query operation bundle containing both adapter and convex implementations.
 */
export const collectionWhereOrderPaginateQuery = {
  adapter: adapterCollectionWhereOrderPaginateQuery,
  convex: convexCollectionWhereOrderPaginateQuery,
};

// ============================================================================
// Query Adapter
// ============================================================================

/**
 * Props for creating the Query Adapter factory.
 */
export type QueryAdapterProps = {};

/**
 * @function QueryAdapter
 * Factory function that creates a Query Adapter instance with all available query operations.
 * This is the main entry point for accessing query functionality in the adapter.
 *
 * @param {QueryAdapterProps} props - Configuration options (currently empty)
 * @returns {Object} An object containing all query operation bundles:
 *   - getById: Fetch single document by ID
 *   - collectionQuery: Fetch all documents from collection
 *   - collectionCountQuery: Count documents with optional filtering
 *   - collectionWhereQuery: Fetch documents matching filter
 *   - collectionWhereOrderQuery: Fetch filtered documents with ordering
 *   - collectionWhereLimitQuery: Fetch filtered documents with limit
 *   - collectionWherePaginateQuery: Fetch filtered documents with pagination
 *   - collectionWhereOrderLimitQuery: Fetch filtered documents with ordering and limit
 *   - collectionWhereOrderPaginateQuery: Fetch filtered documents with ordering and pagination
 *   - collectionOrderQuery: Fetch documents with ordering
 *   - collectionOrderLimitQuery: Fetch documents with ordering and limit
 *   - collectionOrderPaginateQuery: Fetch documents with ordering and pagination
 *   - collectionLimitQuery: Fetch documents with limit
 */
export function QueryAdapter(props: QueryAdapterProps) {
  return {
    getById,
    collectionQuery,
    collectionCountQuery,
    // Where-based queries (use ParsedWhereFilter)
    collectionWhereQuery,
    collectionWhereOrderQuery,
    collectionWhereLimitQuery,
    collectionWherePaginateQuery,
    collectionWhereOrderLimitQuery,
    collectionWhereOrderPaginateQuery,
    // Non-filter queries
    collectionOrderQuery,
    collectionOrderLimitQuery,
    collectionOrderPaginateQuery,
    collectionLimitQuery,
  };
}
