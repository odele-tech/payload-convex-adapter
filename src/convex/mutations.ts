/**
 * @fileoverview Mutation Adapter for Convex Database Operations
 *
 * This module provides a comprehensive set of mutation operations for interacting with
 * Convex databases through the Payload adapter. It implements a two-layer architecture:
 *
 * 1. **Convex Functions** (`convex*`): Define the Convex mutation handlers that run on the server
 * 2. **Adapter Functions** (`adapter*`): Client-side wrappers that invoke the Convex mutations
 *
 * Each mutation operation handles data modification including insert, update, delete,
 * and upsert operations. Where-based mutations use the ParsedWhereFilter system for
 * type-safe, serializable query conditions.
 *
 * @module mutation-adapter
 */

import {
  mutationGeneric,
  GenericMutationCtx,
  GenericDataModel,
  RegisteredMutation,
} from "convex/server";
import { v } from "convex/values";

import type { AdapterService } from "../adapter/service";
import type { EnhancedParsedWhereFilter } from "../tools/query-processor";

/**
 * Extracts the result type from a Convex mutation operation.
 * Handles nested Promise types and returns the unwrapped result.
 */
export type ExtractConvexMutationResult<T> =
  T extends Promise<RegisteredMutation<any, any, Promise<infer R>>>
    ? R
    : T extends RegisteredMutation<any, any, Promise<infer R>>
      ? R
      : T extends Promise<RegisteredMutation<any, any, infer R>>
        ? R
        : T extends RegisteredMutation<any, any, infer R>
          ? R
          : T;

// ============================================================================
// Insert
// ============================================================================

/**
 * Props for creating a Convex insert mutation function.
 */
export type ConvexInsertProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side insert operation.
 */
export type AdapterInsertProps = {
  service: AdapterService;
  collection: string;
  data: Record<string, unknown>;
};

/**
 * Result type for insert operations (returns the new document ID).
 */
export type ConvexInsertResult = ExtractConvexMutationResult<
  ReturnType<typeof convexInsert>
>;

/**
 * @function convexInsert
 * Creates a Convex mutation function to insert a new document into a collection.
 * Automatically applies the collection prefix from the service configuration.
 *
 * @param {ConvexInsertProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that inserts a document
 */
export function convexInsert(props: ConvexInsertProps) {
  const { service } = props;
  return mutationGeneric({
    args: {
      collection: v.string(),
      data: v.any(),
    },
    handler: async (ctx, args) => {
      // args.collection is already prefixed by adapter
      const result = await ctx.db.insert(args.collection as any, args.data);

      service.system
        .logger(
          JSON.stringify(
            {
              operation: "insert",
              args: args,
              result: result,
            },
            null,
            2
          )
        )
        .log();

      return result;
    },
  });
}

/**
 * @function adapterInsert
 * Adapter-side function to insert a new document into a collection.
 *
 * @template T - The type of the document data
 * @param {AdapterInsertProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {T} props.data - The document data to insert
 * @returns {Promise<ConvexInsertResult>} The ID of the newly inserted document
 */
export async function adapterInsert(props: AdapterInsertProps) {
  const { service, collection, data } = props;

  // Transform data to Convex format using QueryProcessor
  const processor = service.tools.queryProcessor({
    service,
    collection,
    data,
    convex: false,
  });
  const compiledData = processor.convexQueryProps.data!;

  const client = service.db.client.directClient;
  const api = service.db.api;

  const result = (await client.mutation(api.adapter.insert, {
    collection: processor.convexQueryProps.collection,
    data: processor.convexQueryProps.data,
  })) as ConvexInsertResult;

  if (service.system.isDev) {
    service.system
      .logger(
        JSON.stringify(
          {
            adapter: "adapterInsert",
            collection: collection,
            data: data,
            compiledData: compiledData,
            queryResult: result,
          },
          null,
          2
        )
      )
      .log();
  }

  return result as string;
}

/**
 * Insert operation bundle containing both adapter and convex implementations.
 */
export const insert = {
  adapter: adapterInsert,
  convex: convexInsert,
};

// ============================================================================
// Get By ID (Mutation)
// ============================================================================

/**
 * Props for creating a Convex getByIdMutation function.
 */
export type ConvexGetByIdMutationProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side getByIdMutation operation.
 */
export type AdapterGetByIdMutationProps = {
  service: AdapterService;
  collection: string;
  id: string;
};

/**
 * Result type for getByIdMutation operations.
 */
export type ConvexGetByIdMutationResult = ExtractConvexMutationResult<
  ReturnType<typeof convexGetByIdMutation>
>;

/**
 * @function convexGetByIdMutation
 * Creates a Convex mutation function to fetch a document by ID within a mutation context.
 * Useful when you need to read data as part of a transactional operation.
 * Returns the document in Payload format (with id instead of _id, etc.).
 *
 * @param {ConvexGetByIdMutationProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that fetches a document by ID
 */
export function convexGetByIdMutation(props: ConvexGetByIdMutationProps) {
  const { service } = props;
  return mutationGeneric({
    args: {
      collection: v.string(),
      id: v.string(),
    },
    handler: async (ctx, args) => {
      const doc = await ctx.db.get(args.collection, args.id as any);

      service.system
        .logger(
          JSON.stringify(
            {
              operation: "getByIdMutation",
              args: args,
              result: doc,
            },
            null,
            2
          )
        )
        .log();

      if (!doc) return null;

      // Transform to Payload format
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        convex: true,
      });

      return processor.toPayload(doc);
    },
  });
}

/**
 * @function adapterGetByIdMutation
 * Adapter-side function to fetch a document by ID within a mutation context.
 *
 * @param {AdapterGetByIdMutationProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {string} props.id - The document ID to fetch
 * @returns {Promise<ConvexGetByIdMutationResult>} The fetched document or null
 */
export async function adapterGetByIdMutation(
  props: AdapterGetByIdMutationProps
) {
  const { service, collection, id } = props;

  const client = service.db.client.directClient;
  const api = service.db.api;

  const collectionId = service.tools.parseCollection({
    prefix: service.system.prefix,
    collection: collection,
  });

  const result = (await client.mutation(api.adapter.getByIdMutation, {
    collection: collectionId,
    id,
  })) as ConvexGetByIdMutationResult;

  if (service.system.isDev) {
    service.system
      .logger(
        JSON.stringify(
          {
            adapter: "adapterGetByIdMutation",
            collection: collection,
            id: id,
          },
          null,
          2
        )
      )
      .log();
  }

  return result;
}

/**
 * GetByIdMutation operation bundle containing both adapter and convex implementations.
 */
export const getByIdMutation = {
  adapter: adapterGetByIdMutation,
  convex: convexGetByIdMutation,
};

// ============================================================================
// Patch
// ============================================================================

/**
 * Props for creating a Convex patch mutation function.
 */
export type ConvexPatchProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side patch operation.
 */
export type AdapterPatchProps<T> = {
  service: AdapterService;
  id: string;
  data: Partial<T>;
};

/**
 * Result type for patch operations.
 */
export type ConvexPatchResult = ExtractConvexMutationResult<
  ReturnType<typeof convexPatch>
>;

/**
 * @function convexPatch
 * Creates a Convex mutation function to partially update a document.
 * Only the specified fields are updated, leaving other fields unchanged.
 *
 * @param {ConvexPatchProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that patches a document
 */
export function convexPatch(props: ConvexPatchProps) {
  const { service } = props;
  return mutationGeneric({
    args: {
      id: v.optional(v.string()),
      data: v.any(),
    },
    handler: async (ctx, args) => {
      if (!args.id)
        return service.system
          .logger("No ID provided for patch operation - cancelling operation")
          .warn();

      await ctx.db.patch(args.id as any, args.data);

      service.system
        .logger(
          JSON.stringify(
            {
              operation: "patch",
              args: args,
              success: true,
            },
            null,
            2
          )
        )
        .log();

      return null;
    },
  });
}

/**
 * @function adapterPatch
 * Adapter-side function to partially update a document.
 *
 * @template T - The type of the document data
 * @param {AdapterPatchProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.id - The document ID to update
 * @param {Partial<T>} props.data - The partial data to merge into the document
 * @returns {Promise<ConvexPatchResult>} The result of the patch operation
 */
export async function adapterPatch<T>(props: AdapterPatchProps<T>) {
  const { service, id, data } = props;

  // Transform data to Convex format using QueryProcessor
  // Note: We need a collection name, but patch doesn't have one. Use a placeholder.
  // The data transformation doesn't depend on collection name.
  const processor = service.tools.queryProcessor({
    service,
    collection: "_temp", // Placeholder - not used for data transformation
    data,
    convex: false,
  });
  const compiledData = processor.convexQueryProps.data!;

  // Filter out read-only Convex system fields that cannot be patched
  const patchableData: Record<string, any> = {};
  for (const [key, value] of Object.entries(compiledData)) {
    // Skip Convex system fields (_id, _creationTime) - they are read-only
    if (key === "_id" || key === "_creationTime") {
      continue;
    }
    patchableData[key] = value;
  }

  if (service.system.isDev) {
    service.system
      .logger(
        JSON.stringify(
          {
            adapter: "adapterPatch",
            id: id,
            data: data,
            compiledData: compiledData,
            patchableData: patchableData,
          },
          null,
          2
        )
      )
      .log();
  }

  const client = service.db.client.directClient;
  const api = service.db.api;

  const result = (await client.mutation(api.adapter.patch, {
    id,
    data: patchableData,
  })) as ConvexPatchResult;

  return result;
}

/**
 * Patch operation bundle containing both adapter and convex implementations.
 */
export const patch = {
  adapter: adapterPatch,
  convex: convexPatch,
};

// ============================================================================
// Replace
// ============================================================================

/**
 * Props for creating a Convex replace mutation function.
 */
export type ConvexReplaceProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side replace operation.
 */
export type AdapterReplaceProps<T> = {
  service: AdapterService;
  id: string;
  data: T;
};

/**
 * Result type for replace operations.
 */
export type ConvexReplaceResult = ExtractConvexMutationResult<
  ReturnType<typeof convexReplace>
>;

/**
 * @function convexReplace
 * Creates a Convex mutation function to completely replace a document.
 * The entire document is replaced with the new data, removing any fields not specified.
 *
 * @param {ConvexReplaceProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that replaces a document
 */
export function convexReplace(props: ConvexReplaceProps) {
  const { service } = props;
  return mutationGeneric({
    args: {
      id: v.string(),
      data: v.any(),
    },
    handler: async (ctx, args) => {
      // Transform data to Convex format before replacing
      await ctx.db.replace(args.id as any, args.data);

      service.system
        .logger(
          JSON.stringify(
            {
              operation: "replace",
              args: args,
              success: true,
            },
            null,
            2
          )
        )
        .log();

      return null;
    },
  });
}

/**
 * @function adapterReplace
 * Adapter-side function to completely replace a document.
 *
 * @template T - The type of the document data
 * @param {AdapterReplaceProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.id - The document ID to replace
 * @param {T} props.data - The new document data
 * @returns {Promise<ConvexReplaceResult>} The result of the replace operation
 */
export async function adapterReplace<T>(props: AdapterReplaceProps<T>) {
  const { service, id, data } = props;

  // Transform data to Convex format using QueryProcessor
  // Note: We need a collection name, but replace doesn't have one. Use a placeholder.
  // The data transformation doesn't depend on collection name.
  const processor = service.tools.queryProcessor({
    service,
    collection: "_temp", // Placeholder - not used for data transformation
    data: data as Record<string, unknown>,
    convex: false,
  });
  const compiledData = processor.convexQueryProps.data!;

  if (service.system.isDev) {
    service.system
      .logger(
        JSON.stringify(
          {
            adapter: "adapterReplace",
            id: id,
            data: data,
            compiledData: compiledData,
          },
          null,
          2
        )
      )
      .log();
  }

  const client = service.db.client.directClient;
  const api = service.db.api;

  const result = (await client.mutation(api.adapter.replace, {
    id,
    data: compiledData,
  })) as ConvexReplaceResult;

  return result;
}

/**
 * Replace operation bundle containing both adapter and convex implementations.
 */
export const replace = {
  adapter: adapterReplace,
  convex: convexReplace,
};

// ============================================================================
// Delete
// ============================================================================

/**
 * Props for creating a Convex delete mutation function.
 */
export type ConvexDeleteProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side delete operation.
 */
export type AdapterDeleteProps = {
  service: AdapterService;
  id: string;
};

/**
 * Result type for delete operations.
 */
export type ConvexDeleteResult = ExtractConvexMutationResult<
  ReturnType<typeof convexDeleteOp>
>;

/**
 * @function convexDelete
 * Creates a Convex mutation function to delete a document by ID.
 *
 * @param {ConvexDeleteProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that deletes a document
 */
export function convexDeleteOp(props: ConvexDeleteProps) {
  const { service } = props;
  return mutationGeneric({
    args: {
      id: v.string(),
    },
    handler: async (ctx, args) => {
      await ctx.db.delete(args.id as any);

      service.system
        .logger(
          JSON.stringify(
            {
              operation: "delete",
              args: args,
              success: true,
            },
            null,
            2
          )
        )
        .log();

      return null;
    },
  });
}

/**
 * @function adapterDelete
 * Adapter-side function to delete a document by ID.
 *
 * @param {AdapterDeleteProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.id - The document ID to delete
 * @returns {Promise<ConvexDeleteResult>} The result of the delete operation
 */
export async function adapterDeleteOp(props: AdapterDeleteProps) {
  const { service, id } = props;

  if (service.system.isDev) {
    service.system
      .logger(
        JSON.stringify(
          {
            adapter: "adapterDelete",
            id: id,
          },
          null,
          2
        )
      )
      .log();
  }

  const client = service.db.client.directClient;
  const api = service.db.api;

  const result = (await client.mutation(api.adapter.deleteOp, {
    id,
  })) as ConvexDeleteResult;

  return result;
}

/**
 * Delete operation bundle containing both adapter and convex implementations.
 * Named `deleteOp` to avoid conflict with JavaScript's reserved `delete` keyword.
 */
export const deleteOp = {
  adapter: adapterDeleteOp,
  convex: convexDeleteOp,
};

// ============================================================================
// Upsert
// ============================================================================

/**
 * Props for creating a Convex upsert mutation function.
 */
export type ConvexUpsertProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side upsert operation.
 */
export type AdapterUpsertProps<T> = {
  service: AdapterService;
  collection: string;
  id?: string;
  data: T;
};

/**
 * Result type for upsert operations.
 */
export type ConvexUpsertResult = ExtractConvexMutationResult<
  ReturnType<typeof convexUpsert>
>;

/**
 * @function convexUpsert
 * Creates a Convex mutation function to insert or update a document.
 * If an ID is provided and the document exists, it will be patched.
 * Otherwise, a new document will be inserted.
 *
 * @param {ConvexUpsertProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that upserts a document
 */
export function convexUpsert(props: ConvexUpsertProps) {
  const { service } = props;
  return mutationGeneric({
    args: {
      collection: v.string(),
      id: v.optional(v.string()),
      data: v.any(),
    },
    handler: async (ctx, args) => {
      let docId: string;
      let wasUpdate = false;

      if (args.id) {
        const existing = await ctx.db.get(args.id as any);
        if (existing) {
          await ctx.db.patch(args.id as any, args.data);
          docId = args.id;
          wasUpdate = true;
        } else {
          // args.collection is already prefixed by adapter
          docId = await ctx.db.insert(args.collection as any, args.data);
        }
      } else {
        // args.collection is already prefixed by adapter
        docId = await ctx.db.insert(args.collection as any, args.data);
      }

      service.system
        .logger(
          JSON.stringify(
            {
              operation: "upsert",
              args: args,
              docId: docId,
              wasUpdate: wasUpdate,
            },
            null,
            2
          )
        )
        .log();

      return docId;
    },
  });
}

/**
 * @function adapterUpsert
 * Adapter-side function to insert or update a document.
 *
 * @template T - The type of the document data
 * @param {AdapterUpsertProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {string} [props.id] - Optional document ID for update
 * @param {T} props.data - The document data
 * @returns {Promise<ConvexUpsertResult>} The ID of the upserted document or void if patched
 */
export async function adapterUpsert<T>(props: AdapterUpsertProps<T>) {
  const { service, collection, id, data } = props;

  // Transform data to Convex format using QueryProcessor
  const processor = service.tools.queryProcessor({
    service,
    collection,
    data: data as Record<string, unknown>,
    convex: false,
  });

  const compiledData = processor.convexQueryProps.data!;

  if (service.system.isDev) {
    service.system
      .logger(
        JSON.stringify(
          {
            adapter: "adapterUpsert",
            collection: collection,
            id: id,
            data: data,
            compiledData: compiledData,
          },
          null,
          2
        )
      )
      .log();
  }

  const client = service.db.client.directClient;
  const api = service.db.api;

  const result = (await client.mutation(api.adapter.upsert, {
    collection: processor.convexQueryProps.collection,
    id,
    data: processor.convexQueryProps.data,
  })) as ConvexUpsertResult;

  return result;
}

/**
 * Upsert operation bundle containing both adapter and convex implementations.
 */
export const upsert = {
  adapter: adapterUpsert,
  convex: convexUpsert,
};

// ============================================================================
// Update Many Where
// ============================================================================

/**
 * Props for creating a Convex updateManyWhere mutation function.
 */
export type ConvexUpdateManyWhereProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side updateManyWhere operation.
 */
export type AdapterUpdateManyWhereProps<T> = {
  service: AdapterService;
  collection: string;
  wherePlan: EnhancedParsedWhereFilter;
  data: Partial<T>;
};

/**
 * Result type for updateManyWhere operations.
 */
export type ConvexUpdateManyWhereResult = ExtractConvexMutationResult<
  ReturnType<typeof convexUpdateManyWhere>
>;

/**
 * @function convexUpdateManyWhere
 * Creates a Convex mutation function to update multiple documents matching a filter.
 * Uses the ParsedWhereFilter system for type-safe filtering.
 *
 * @param {ConvexUpdateManyWhereProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that updates matching documents
 */
export function convexUpdateManyWhere(props: ConvexUpdateManyWhereProps) {
  const { service } = props;
  return mutationGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      data: v.any(),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan as EnhancedParsedWhereFilter,
        convex: true,
      });

      const docs = await processor.query().postFilter().collect();

      // Patch each document individually
      await Promise.all(
        docs.map((doc) => ctx.db.patch(doc._id as any, args.data))
      );

      service.system
        .logger(
          JSON.stringify(
            {
              operation: "updateManyWhere",
              args: args,
              docsUpdated: docs.length,
            },
            null,
            2
          )
        )
        .log();

      return docs.length;
    },
  });
}

/**
 * @function adapterUpdateManyWhere
 * Adapter-side function to update multiple documents matching a filter.
 *
 * @template T - The type of the document data
 * @param {AdapterUpdateManyWhereProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {Partial<T>} props.data - The partial data to merge into matching documents
 * @returns {Promise<ConvexUpdateManyWhereResult>} Array of update results
 */
export async function adapterUpdateManyWhere<T>(
  props: AdapterUpdateManyWhereProps<T>
) {
  const { service, collection, wherePlan, data } = props;

  // Transform data to Convex format using QueryProcessor
  const processor = service.tools.queryProcessor({
    service,
    collection,
    data,
    convex: false,
  });

  const compiledData = processor.convexQueryProps.data!;

  if (service.system.isDev) {
    service.system
      .logger(
        JSON.stringify(
          {
            adapter: "adapterUpdateManyWhere",
            collection: collection,
            wherePlan: wherePlan,
            data: data,
            compiledData: compiledData,
          },
          null,
          2
        )
      )
      .log();
  }

  const client = service.db.client.directClient;
  const api = service.db.api;

  const result = (await client.mutation(api.adapter.updateManyWhere, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
    data: processor.convexQueryProps.data,
  })) as ConvexUpdateManyWhereResult;

  return result;
}

/**
 * UpdateManyWhere operation bundle containing both adapter and convex implementations.
 */
export const updateManyWhere = {
  adapter: adapterUpdateManyWhere,
  convex: convexUpdateManyWhere,
};

// ============================================================================
// Delete Many Where
// ============================================================================

/**
 * Props for creating a Convex deleteManyWhere mutation function.
 */
export type ConvexDeleteManyWhereProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side deleteManyWhere operation.
 */
export type AdapterDeleteManyWhereProps = {
  service: AdapterService;
  collection: string;
  wherePlan: EnhancedParsedWhereFilter;
};

/**
 * Result type for deleteManyWhere operations.
 */
export type ConvexDeleteManyWhereResult = ExtractConvexMutationResult<
  ReturnType<typeof convexDeleteManyWhere>
>;

/**
 * @function convexDeleteManyWhere
 * Creates a Convex mutation function to delete multiple documents matching a filter.
 * Uses the ParsedWhereFilter system for type-safe filtering.
 *
 * @param {ConvexDeleteManyWhereProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that deletes matching documents
 */
export function convexDeleteManyWhere(props: ConvexDeleteManyWhereProps) {
  const { service } = props;
  return mutationGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan as EnhancedParsedWhereFilter,
        convex: true,
      });

      const docs = await processor.query().postFilter().collect();

      // Delete all documents - don't capture void results
      await Promise.all(docs.map((doc) => ctx.db.delete(doc._id as any)));

      service.system
        .logger(
          JSON.stringify(
            {
              operation: "deleteManyWhere",
              args: args,
              docsDeleted: docs.length,
            },
            null,
            2
          )
        )
        .log();

      return docs.length;
    },
  });
}

/**
 * @function adapterDeleteManyWhere
 * Adapter-side function to delete multiple documents matching a filter.
 *
 * @param {AdapterDeleteManyWhereProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @returns {Promise<ConvexDeleteManyWhereResult>} Array of delete results
 */
export async function adapterDeleteManyWhere(
  props: AdapterDeleteManyWhereProps
) {
  const { service, collection, wherePlan } = props;

  if (service.system.isDev) {
    service.system
      .logger(
        JSON.stringify(
          {
            adapter: "adapterDeleteManyWhere",
            collection: collection,
            wherePlan: wherePlan,
          },
          null,
          2
        )
      )
      .log();
  }

  const client = service.db.client.directClient;
  const api = service.db.api;

  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    convex: false,
  });

  const result = (await client.mutation(api.adapter.deleteManyWhere, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
  })) as ConvexDeleteManyWhereResult;

  return result;
}

/**
 * DeleteManyWhere operation bundle containing both adapter and convex implementations.
 */
export const deleteManyWhere = {
  adapter: adapterDeleteManyWhere,
  convex: convexDeleteManyWhere,
};

// ============================================================================
// Increment
// ============================================================================

/**
 * Props for creating a Convex increment mutation function.
 */
export type ConvexIncrementProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side increment operation.
 */
export type AdapterIncrementProps = {
  service: AdapterService;
  id: string;
  field: string;
  amount: number;
};

/**
 * Result type for increment operations.
 */
export type ConvexIncrementResult = ExtractConvexMutationResult<
  ReturnType<typeof convexIncrement>
>;

/**
 * Normalizes a Payload field name to Convex format.
 *
 * Rules:
 * 1. Special Payload fields (id, createdAt) → Convex system fields
 * 2. Convex system fields → preserved
 * 3. Payload system fields (_ or $) → prefixed with pca_
 * 4. Regular user fields (including updatedAt) → unchanged
 * 5. Handles nested paths correctly
 *
 * Examples:
 * - "id" → "_id"
 * - "createdAt" → "_creationTime"
 * - "updatedAt" → "updatedAt" (NOT mutated)
 * - "_status" → "pca__status"
 * - "$inc" → "pca_$inc"
 * - "title" → "title"
 * - "author._custom" → "author.pca__custom"
 *
 * @internal
 */
function normalizeFieldToConvex(field: string): string {
  // Helper function for single segment
  const normalizeSegment = (segment: string): string => {
    // Special Payload → Convex mappings (id and createdAt only)
    if (segment === "id") return "_id";
    if (segment === "createdAt") return "_creationTime";

    // Convex system fields - preserve
    if (
      segment === "_id" ||
      segment === "_creationTime" ||
      segment === "_updatedTime"
    ) {
      return segment;
    }

    // Already prefixed - preserve
    if (segment.startsWith("pca_")) {
      return segment;
    }

    // Payload system fields (_ or $) need prefixing
    if (segment.startsWith("_") || segment.startsWith("$")) {
      return `pca_${segment}`;
    }

    // Regular user fields unchanged (including updatedAt)
    return segment;
  };

  // Handle nested paths
  if (field.includes(".")) {
    return field.split(".").map(normalizeSegment).join(".");
  }

  return normalizeSegment(field);
}

/**
 * @function convexIncrement
 * Creates a Convex mutation function to atomically increment a numeric field.
 * This is useful for counters, scores, and other numeric values that need atomic updates.
 * Handles field name normalization (adds pca_ prefix for Payload system fields starting with _ or $).
 *
 * @param {ConvexIncrementProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that increments a field
 */
export function convexIncrement(props: ConvexIncrementProps) {
  const { service } = props;
  return mutationGeneric({
    args: {
      id: v.string(),
      field: v.string(),
      amount: v.number(),
    },
    handler: async (ctx, args) => {
      const doc = await ctx.db.get(args.id as any);
      if (!doc) {
        service.system
          .logger(
            JSON.stringify(
              {
                operation: "increment",
                args: args,
                result: null,
                error: "Document not found",
              },
              null,
              2
            )
          )
          .log();
        return null;
      }

      // Normalize field name to Convex format (add pca_ prefix for _ or $ fields)
      const convexField = normalizeFieldToConvex(args.field);
      const currentValue = (doc as any)[convexField] ?? 0;
      const newValue = currentValue + args.amount;

      await ctx.db.patch(args.id as any, {
        [convexField]: newValue,
      });

      service.system
        .logger(
          JSON.stringify(
            {
              operation: "increment",
              args: args,
              convexField: convexField,
              previousValue: currentValue,
              newValue: newValue,
            },
            null,
            2
          )
        )
        .log();

      return { newValue };
    },
  });
}

/**
 * @function adapterIncrement
 * Adapter-side function to atomically increment a numeric field.
 *
 * @param {AdapterIncrementProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.id - The document ID
 * @param {string} props.field - The field name to increment
 * @param {number} props.amount - The amount to add (can be negative for decrement)
 * @returns {Promise<ConvexIncrementResult>} The result of the increment operation or null if document not found
 */
export async function adapterIncrement(props: AdapterIncrementProps) {
  const { service, id, field, amount } = props;

  if (service.system.isDev) {
    service.system
      .logger(
        JSON.stringify(
          {
            adapter: "adapterIncrement",
            id: id,
            field: field,
            amount: amount,
          },
          null,
          2
        )
      )
      .log();
  }

  const client = service.db.client.directClient;
  const api = service.db.api;

  const result = (await client.mutation(api.adapter.increment, {
    id,
    field,
    amount,
  })) as ConvexIncrementResult;

  return result;
}

/**
 * Increment operation bundle containing both adapter and convex implementations.
 */
export const increment = {
  adapter: adapterIncrement,
  convex: convexIncrement,
};

// ============================================================================
// Transactional
// ============================================================================

/**
 * Props for creating a Convex transactional mutation function.
 */
export type ConvexTransactionalProps = {
  service: AdapterService;
};

/**
 * Props for the adapter-side transactional operation.
 */
export type AdapterTransactionalProps<T> = {
  service: AdapterService;
  run: (ctx: GenericMutationCtx<GenericDataModel>) => Promise<T>;
};

/**
 * Result type for transactional operations.
 */
export type ConvexTransactionalResult = ExtractConvexMutationResult<
  ReturnType<typeof convexTransactional>
>;

/**
 * @function convexTransactional
 * Creates a Convex mutation function to run custom transactional logic.
 * Allows executing arbitrary mutation logic within a Convex transaction context.
 *
 * @param {ConvexTransactionalProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that runs transactional logic
 */
export function convexTransactional(props: ConvexTransactionalProps) {
  const { service } = props;
  return mutationGeneric({
    args: {
      run: v.any(),
    },
    handler: async (ctx, args) => {
      const result = await args.run(ctx);

      // Sanitize undefined to null for Convex compatibility
      const safeResult = result === undefined ? null : result;

      service.system
        .logger(
          JSON.stringify(
            {
              operation: "transactional",
              result: safeResult,
            },
            null,
            2
          )
        )
        .log();

      return safeResult;
    },
  });
}

/**
 * @function adapterTransactional
 * Adapter-side function to run custom transactional logic.
 *
 * @template T - The return type of the transactional function
 * @param {AdapterTransactionalProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {Function} props.run - The function to execute within the transaction
 * @returns {Promise<ConvexTransactionalResult>} The result of the transactional function
 */
export async function adapterTransactional<T>(
  props: AdapterTransactionalProps<T>
) {
  const { service, run } = props;

  if (service.system.isDev) {
    service.system
      .logger(
        JSON.stringify(
          {
            adapter: "adapterTransactional",
            message: "Executing transactional operation",
          },
          null,
          2
        )
      )
      .log();
  }

  const client = service.db.client.directClient;
  const api = service.db.api;

  const result = (await client.mutation(api.adapter.transactional, {
    run,
  })) as ConvexTransactionalResult;

  return result;
}

/**
 * Transactional operation bundle containing both adapter and convex implementations.
 */
export const transactional = {
  adapter: adapterTransactional,
  convex: convexTransactional,
};

// ============================================================================
// Mutation Adapter
// ============================================================================

/**
 * Props for creating the Mutation Adapter factory.
 */
export type MutationAdapterProps = {};

/**
 * @function MutationAdapter
 * Factory function that creates a Mutation Adapter instance with all available mutation operations.
 * This is the main entry point for accessing mutation functionality in the adapter.
 *
 * @param {MutationAdapterProps} props - Configuration options (currently empty)
 * @returns {Object} An object containing all mutation operation bundles:
 *   - insert: Insert a new document
 *   - getByIdMutation: Fetch document by ID in mutation context
 *   - patch: Partially update a document
 *   - replace: Completely replace a document
 *   - deleteOp: Delete a document by ID
 *   - upsert: Insert or update a document
 *   - updateManyWhere: Update multiple documents matching a filter
 *   - deleteManyWhere: Delete multiple documents matching a filter
 *   - increment: Atomically increment a numeric field
 *   - transactional: Run custom transactional logic
 */
export function MutationAdapter(props: MutationAdapterProps) {
  return {
    insert,
    getByIdMutation,
    patch,
    replace,
    deleteOp,
    upsert,
    // Where-based mutations (use ParsedWhereFilter)
    updateManyWhere,
    deleteManyWhere,
    // Other mutations
    increment,
    transactional,
  };
}
