/**
 * @fileoverview Query Drafts Operation Bindings
 *
 * This module implements Payload's queryDrafts operation for the Convex adapter.
 * In Payload CMS, when `draft: true` is passed to `payload.find()` on collections
 * with versions.drafts enabled, Payload calls queryDrafts instead of find.
 *
 * This implementation queries the `{collection}_versions` table and intelligently
 * handles two use cases:
 * 1. **Latest versions only** (preview mode, admin list): Filters for `latest: true`
 * 2. **All versions** (Versions tab): Returns all versions when querying by parent
 *
 * The version documents are unwrapped (extracting the `version` field) before
 * returning to match Payload's expected format.
 *
 * @module convex/bindings/queryDrafts
 */

import type { AdapterService } from "../adapter/service";
import { QueryDrafts, type Where } from "payload";
import { applySortField } from "../tools/query-processor";

/**
 * Props for the queryDrafts operation.
 */
export type AdapterQueryDraftsProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming queryDrafts parameters from Payload */
  incomingQueryDrafts: Parameters<QueryDrafts>[0];
};

/**
 * Queries documents from a draft-enabled collection.
 *
 * Returns all documents (both draft and published) in their current state.
 * This function returns paginated results with
 * support for filtering, sorting, and pagination.
 *
 * @param {AdapterQueryDraftsProps} props - The queryDrafts operation parameters
 * @returns {Promise<Awaited<ReturnType<QueryDrafts>>>} Paginated draft documents result
 *
 * @example
 * ```typescript
 * const drafts = await queryDrafts({
 *   service,
 *   incomingQueryDrafts: {
 *     collection: 'posts',
 *     where: { author: { equals: 'user123' } },
 *     limit: 10,
 *     page: 1,
 *   },
 * });
 * ```
 */
export async function queryDrafts(props: AdapterQueryDraftsProps) {
  const { service, incomingQueryDrafts } = props;
  const {
    collection,
    where,
    limit = 10,
    page = 1,
    pagination = true,
  } = incomingQueryDrafts;

  // Query the versions collection (not the main collection)
  const versionsCollection = `${collection}_versions`;

  // Determine if this is a "list all versions" query or a "get latest version" query
  // When the Versions tab queries for all versions of a document, it includes:
  // - A 'parent' filter (to get versions of a specific document)
  // - No 'latest' filter (wants all versions, not just latest)
  // 
  // For other queries (preview mode, admin list view), we want only the latest version
  const whereStr = where ? JSON.stringify(where) : '';
  const hasParentFilter = whereStr.includes('"parent"');
  const hasLatestFilter = whereStr.includes('"latest"');
  
  // Extract parent value if present
  let parentValue: string | undefined;
  if (hasParentFilter && where && 'and' in where && Array.isArray(where.and)) {
    for (const condition of where.and) {
      if (condition && typeof condition === 'object' && 'parent' in condition) {
        const parentCondition = condition.parent as any;
        if (parentCondition && 'equals' in parentCondition) {
          parentValue = parentCondition.equals;
          break;
        }
      }
    }
  } else if (hasParentFilter && where && 'parent' in where) {
    const parentCondition = (where as any).parent;
    if (parentCondition && 'equals' in parentCondition) {
      parentValue = parentCondition.equals;
    }
  }
  
  // If querying by parent without a latest filter, return all versions for that parent ONLY
  // Otherwise, filter for latest versions only
  const combinedWhere: Where = (hasParentFilter && !hasLatestFilter && parentValue)
    ? { parent: { equals: parentValue } }  // Return ALL versions for this parent (Versions tab)
    : {
        and: [
          { latest: { equals: true } },  // Only latest versions (preview mode, list view)
          ...(where ? [where] : []),
        ],
      };

  // Pass all incoming params to queryProcessor with versions collection
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingQueryDrafts,
    collection: versionsCollection,
    where: combinedWhere,
    convex: false,
  });

  /**
   * Transforms version documents to regular format.
   * Unwraps the `version` field and assigns `parent` as `id`.
   * Matches MongoDB adapter behavior (queryDrafts.ts lines 183-187).
   */
  function transformVersionDocs<T>(versionDocs: any[]): T[] {
    return versionDocs.map((versionDoc) => {
      const id = versionDoc.parent;
      const doc = versionDoc.version ?? {};
      doc.id = id;
      return doc as T;
    });
  }

  // If pagination is disabled (limit = 0), fetch all draft documents
  if (!pagination || limit === 0) {
    const versionDocs = await service.db.query({}).collectionWhereQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
    });

    const docs = transformVersionDocs(versionDocs);

    return {
      docs,
      totalDocs: docs.length,
      limit: docs.length,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      pagingCounter: 1,
    } as Awaited<ReturnType<QueryDrafts>>;
  }

  // Get total count for pagination calculations
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  const totalPages = Math.ceil(totalDocs / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const pagingCounter = (page - 1) * limit + 1;

  // Fetch documents with ordering and pagination
  const skip = (page - 1) * limit;

  const allVersionDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc",
  });

  // Apply in-memory sort if the requested sort field differs from Convex's default (_creationTime)
  const sortedVersionDocs = applySortField(
    allVersionDocs,
    processedQuery.convexQueryProps.sortField,
    processedQuery.convexQueryProps.order ?? "desc"
  );

  const paginatedVersionDocs = sortedVersionDocs.slice(skip, skip + limit);
  const docs = transformVersionDocs(paginatedVersionDocs);

  return {
    docs,
    totalDocs,
    limit,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pagingCounter,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  } as Awaited<ReturnType<QueryDrafts>>;
}
