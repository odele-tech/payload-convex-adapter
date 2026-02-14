/**
 * @fileoverview Find Operation Bindings
 *
 * This module implements Payload's find operations for the Convex adapter.
 * It provides document retrieval with support for:
 * - Pagination (page-based with configurable limits)
 * - Filtering (via ParsedWhereFilter)
 * - Sorting (ascending/descending)
 * - Distinct value queries
 * - Version and global document retrieval
 *
 * ## Collection Naming Conventions
 * - Regular collections: `{collection}`
 * - Version collections: `{collection}_versions`
 * - Global collections: `_globals_{slug}`
 * - Global version collections: `{global}_global_versions`
 *
 * @module convex/bindings/find
 */

import type { AdapterService } from "../adapter/service";
import type {
  Find,
  FindOne,
  FindDistinct,
  FindGlobal,
  FindVersions,
  FindGlobalVersions,
} from "payload";
import { applySortField } from "../tools/query-processor";

/**
 * Props for the find operation.w
 */
export type AdapterFindProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming find parameters from Payload */
  incomingFind: Parameters<Find>[0];
};

/**
 * Props for the findOne operation.
 */
export type AdapterFindOneProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming findOne parameters from Payload */
  incomingFindOne: Parameters<FindOne>[0];
};

/**
 * Props for the findDistinct operation.
 */
export type AdapterFindDistinctProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming findDistinct parameters from Payload */
  incomingFindDistinct: Parameters<FindDistinct>[0];
};

/**
 * Props for the findGlobal operation.
 */
export type AdapterFindGlobalProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming findGlobal parameters from Payload */
  incomingFindGlobal: Parameters<FindGlobal>[0];
};

/**
 * Props for the findVersions operation.
 */
export type AdapterFindVersionsProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming findVersions parameters from Payload */
  incomingFindVersions: Parameters<FindVersions>[0];
};

/**
 * Props for the findGlobalVersions operation.
 */
export type AdapterFindGlobalVersionsProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming findGlobalVersions parameters from Payload */
  incomingFindGlobalVersions: Parameters<FindGlobalVersions>[0];
};

/**
 * Finds documents in a collection with pagination, filtering, and sorting.
 *
 * This function implements Payload's Find operation, supporting:
 * - Page-based pagination with configurable page size
 * - Where clause filtering via ParsedWhereFilter
 * - Sort order (ascending/descending based on sort string prefix)
 * - Option to disable pagination and fetch all documents
 *
 * @param {AdapterFindProps} props - The find operation parameters
 * @returns {Promise<Awaited<ReturnType<Find>>>} Paginated result with docs and metadata
 *
 * @example
 * ```typescript
 * const result = await find({
 *   service,
 *   incomingFind: {
 *     collection: 'posts',
 *     where: { status: { equals: 'published' } },
 *     limit: 10,
 *     page: 1,
 *     sort: '-createdAt',
 *   },
 * });
 * ```
 */
export async function find(props: AdapterFindProps) {
  const { service, incomingFind } = props;
  const {
    collection,
    limit = 10,
    page = 1,
    pagination = true,
    skip,
  } = incomingFind;

  // Use skip if provided (deprecated but still supported)
  const effectivePage =
    skip !== undefined ? Math.floor(skip / limit) + 1 : page;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFind,
    page: effectivePage,
    convex: false,
  });

  // If pagination is disabled (limit = 0), fetch all documents
  if (!pagination || limit === 0) {
    const docs = await service.db.query({}).collectionWhereQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
    });

    return {
      docs,
      totalDocs: docs.length,
      limit: docs.length,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      pagingCounter: 1,
    } as Awaited<ReturnType<Find>>;
  }

  // Get total count for pagination calculations
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  const totalPages = Math.ceil(totalDocs / limit);
  const hasNextPage = effectivePage < totalPages;
  const hasPrevPage = effectivePage > 1;
  const pagingCounter = (effectivePage - 1) * limit + 1;

  // Fetch all matching documents with order, then apply post-sort and slice for pagination
  // TODO: Optimize with cursor-based pagination when available
  const allDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc",
  });

  // Apply in-memory sort if the requested sort field differs from Convex's default (_creationTime)
  const sortedDocs = applySortField(
    allDocs,
    processedQuery.convexQueryProps.sortField,
    processedQuery.convexQueryProps.order ?? "desc"
  );

  const skipAmount = skip !== undefined ? skip : (effectivePage - 1) * limit;
  const docs = sortedDocs.slice(skipAmount, skipAmount + limit);

  return {
    docs,
    totalDocs,
    limit,
    page: effectivePage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pagingCounter,
    nextPage: hasNextPage ? effectivePage + 1 : null,
    prevPage: hasPrevPage ? effectivePage - 1 : null,
  } as Awaited<ReturnType<Find>>;
}

/**
 * Finds a single document matching the where clause.
 *
 * @param {AdapterFindOneProps} props - The findOne operation parameters
 * @returns {Promise<Awaited<ReturnType<FindOne>>>} The found document or null
 */
export async function findOne(props: AdapterFindOneProps) {
  const { service, incomingFindOne } = props;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFindOne,
    limit: 1,
    convex: false,
  });

  // Fetch with limit 1
  const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    limit: processedQuery.convexQueryProps.limit!,
  });

  if (!docs || docs.length === 0) {
    return null as Awaited<ReturnType<FindOne>>;
  }

  return docs[0] as Awaited<ReturnType<FindOne>>;
}

/**
 * Finds distinct values for a specific field across documents.
 *
 * This function retrieves unique values for the specified field from
 * documents matching the where clause, with pagination support.
 *
 * @param {AdapterFindDistinctProps} props - The findDistinct operation parameters
 * @returns {Promise<Awaited<ReturnType<FindDistinct>>>} Paginated distinct values
 */
export async function findDistinct(props: AdapterFindDistinctProps) {
  const { service, incomingFindDistinct } = props;
  const { field, limit = 10, page = 1 } = incomingFindDistinct;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFindDistinct,
    convex: false,
  });

  // Fetch all matching documents
  const allDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc",
  });

  // Extract distinct values for the specified field
  const valueSet = new Set<any>();
  for (const doc of allDocs) {
    const value = (doc as Record<string, any>)[field];
    if (value !== undefined && value !== null) {
      valueSet.add(value);
    }
  }

  const allValues = Array.from(valueSet);
  const totalDocs = allValues.length;
  const totalPages = Math.ceil(totalDocs / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const pagingCounter = (page - 1) * limit + 1;

  // Paginate the distinct values
  const skip = (page - 1) * limit;
  const values = allValues.slice(skip, skip + limit);

  return {
    values: values.map((v) => ({ [field]: v })),
    totalDocs,
    limit,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pagingCounter,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  } as Awaited<ReturnType<FindDistinct>>;
}

/**
 * Finds a global document by its slug.
 *
 * Globals are singleton documents stored in collections named `_globals_{slug}`.
 *
 * @param {AdapterFindGlobalProps} props - The findGlobal operation parameters
 * @returns {Promise<Awaited<ReturnType<FindGlobal>>>} The global document or empty object
 */
export async function findGlobal(props: AdapterFindGlobalProps) {
  const { service, incomingFindGlobal } = props;
  const { slug } = incomingFindGlobal;

  // Globals are stored in a collection named after the slug
  const globalCollection = `_globals_${slug}`;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFindGlobal,
    collection: globalCollection,
    limit: 1,
    convex: false,
  });

  // Fetch with limit 1 since globals are single documents
  const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    limit: processedQuery.convexQueryProps.limit!,
  });

  if (!docs || docs.length === 0) {
    return {} as Awaited<ReturnType<FindGlobal>>;
  }

  return docs[0] as Awaited<ReturnType<FindGlobal>>;
}

/**
 * Finds version documents for a collection.
 *
 * Versions are stored in collections named `{collection}_versions`.
 *
 * @param {AdapterFindVersionsProps} props - The findVersions operation parameters
 * @returns {Promise<Awaited<ReturnType<FindVersions>>>} Paginated version documents
 */
export async function findVersions(props: AdapterFindVersionsProps) {
  const { service, incomingFindVersions } = props;
  const {
    collection,
    limit = 10,
    page = 1,
    pagination = true,
    skip,
  } = incomingFindVersions;

  // Use skip if provided (deprecated but still supported)
  const effectivePage =
    skip !== undefined ? Math.floor(skip / limit) + 1 : page;

  // Versions are stored in a collection with "_versions" suffix
  const versionsCollection = `${collection}_versions`;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFindVersions,
    collection: versionsCollection,
    page: effectivePage,
    convex: false,
  });

  // If pagination is disabled (limit = 0), fetch all documents
  if (!pagination || limit === 0) {
    const docs = await service.db.query({}).collectionWhereOrderQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
      order: processedQuery.convexQueryProps.order ?? "desc",
    });

    return {
      docs,
      totalDocs: docs.length,
      limit: docs.length,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      pagingCounter: 1,
    } as Awaited<ReturnType<FindVersions>>;
  }

  // Get total count for pagination calculations
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  const totalPages = Math.ceil(totalDocs / limit);
  const hasNextPage = effectivePage < totalPages;
  const hasPrevPage = effectivePage > 1;
  const pagingCounter = (effectivePage - 1) * limit + 1;

  // Fetch all matching documents with order, then apply post-sort and slice for pagination
  const skipAmount = skip !== undefined ? skip : (effectivePage - 1) * limit;

  const allDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc",
  });

  // Apply in-memory sort if the requested sort field differs from Convex's default (_creationTime)
  const sortedDocs = applySortField(
    allDocs,
    processedQuery.convexQueryProps.sortField,
    processedQuery.convexQueryProps.order ?? "desc"
  );

  const docs = sortedDocs.slice(skipAmount, skipAmount + limit);

  return {
    docs,
    totalDocs,
    limit,
    page: effectivePage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pagingCounter,
    nextPage: hasNextPage ? effectivePage + 1 : null,
    prevPage: hasPrevPage ? effectivePage - 1 : null,
  } as Awaited<ReturnType<FindVersions>>;
}

/**
 * Finds version documents for a global.
 *
 * Global versions are stored in collections named `{global}_global_versions`.
 *
 * @param {AdapterFindGlobalVersionsProps} props - The findGlobalVersions operation parameters
 * @returns {Promise<Awaited<ReturnType<FindGlobalVersions>>>} Paginated global version documents
 */
export async function findGlobalVersions(
  props: AdapterFindGlobalVersionsProps
) {
  const { service, incomingFindGlobalVersions } = props;
  const {
    global,
    limit = 10,
    page = 1,
    pagination = true,
    skip,
  } = incomingFindGlobalVersions;

  // Use skip if provided (deprecated but still supported)
  const effectivePage =
    skip !== undefined ? Math.floor(skip / limit) + 1 : page;

  // Global versions are stored in a collection with "_global_versions" suffix
  const globalVersionsCollection = `${global}_global_versions`;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFindGlobalVersions,
    collection: globalVersionsCollection,
    page: effectivePage,
    convex: false,
  });

  // If pagination is disabled (limit = 0), fetch all documents
  if (!pagination || limit === 0) {
    const docs = await service.db.query({}).collectionWhereOrderQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
      order: processedQuery.convexQueryProps.order ?? "desc",
    });

    return {
      docs,
      totalDocs: docs.length,
      limit: docs.length,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      pagingCounter: 1,
    } as Awaited<ReturnType<FindGlobalVersions>>;
  }

  // Get total count for pagination calculations
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  const totalPages = Math.ceil(totalDocs / limit);
  const hasNextPage = effectivePage < totalPages;
  const hasPrevPage = effectivePage > 1;
  const pagingCounter = (effectivePage - 1) * limit + 1;

  // Fetch all matching documents with order, then apply post-sort and slice for pagination
  const skipAmount = skip !== undefined ? skip : (effectivePage - 1) * limit;

  const allDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc",
  });

  // Apply in-memory sort if the requested sort field differs from Convex's default (_creationTime)
  const sortedDocs = applySortField(
    allDocs,
    processedQuery.convexQueryProps.sortField,
    processedQuery.convexQueryProps.order ?? "desc"
  );

  const docs = sortedDocs.slice(skipAmount, skipAmount + limit);

  return {
    docs,
    totalDocs,
    limit,
    page: effectivePage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pagingCounter,
    nextPage: hasNextPage ? effectivePage + 1 : null,
    prevPage: hasPrevPage ? effectivePage - 1 : null,
  } as Awaited<ReturnType<FindGlobalVersions>>;
}
