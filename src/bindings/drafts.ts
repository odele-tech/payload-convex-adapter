/**
 * @fileoverview Query Drafts Operation Bindings
 *
 * This module implements Payload's queryDrafts operation for the Convex adapter.
 * Draft documents are unpublished versions of documents that can be queried
 * separately from published content.
 *
 * Drafts are identified by a `_status` field set to 'draft'.
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
 * Queries draft documents from a collection.
 *
 * Draft documents have a `_status` field set to 'draft'.
 * This function returns paginated results of draft documents with
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

  // Combine the where clause with draft status filter
  const draftWhere: Where = where
    ? {
        and: [where, { _status: { equals: "draft" } }],
      }
    : { _status: { equals: "draft" } };

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
