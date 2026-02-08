/**
 * @fileoverview Query Drafts Operation Bindings
 *
 * This module implements Payload's queryDrafts operation for the Convex adapter.
 * In Payload CMS, the admin list view calls queryDrafts for collections with
 * versions.drafts enabled. It expects ALL documents to be returned (both draft
 * and published), showing each document in its current state.
 *
 * Unlike the MongoDB/Postgres adapters which aggregate from the versions
 * collection, this adapter queries the main collection directly.
 *
 * @module convex/bindings/queryDrafts
 */

import type { AdapterService } from "../adapter/service";
import { QueryDrafts, type Where } from "payload";

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
    where,
    limit = 10,
    page = 1,
    pagination = true,
  } = incomingQueryDrafts;

  // Pass the incoming where clause through as-is.
  // Payload's admin list view calls queryDrafts for draft-enabled collections
  // and expects ALL documents (both draft and published) to be returned.
  //
  // The official MongoDB/Postgres adapters implement queryDrafts by aggregating
  // the versions collection (grouping by parent to get the latest version).
  // Since this adapter queries the main collection (which always reflects the
  // current document state), we return all matching documents without adding
  // a _status filter. If Payload ever needs to filter by draft status, it will
  // include that in the incoming where clause itself.
  const draftWhere: Where = where ?? { id: { exists: true } };

  // Pass all incoming params to queryProcessor with draft where clause
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingQueryDrafts,
    where: draftWhere,
    convex: false,
  });

  // If pagination is disabled (limit = 0), fetch all draft documents
  if (!pagination || limit === 0) {
    const rawDocs = await service.db.query({}).collectionWhereQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
    });

    const docs = processedQuery.processResult(rawDocs);

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

  const allDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc",
  });

  const rawDocs = allDocs.slice(skip, skip + limit);
  const docs = processedQuery.processResult(rawDocs);

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
