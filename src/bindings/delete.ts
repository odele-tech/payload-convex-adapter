/**
 * @fileoverview Delete Operation Bindings
 *
 * This module implements Payload's delete operations for the Convex adapter.
 * It provides document deletion for:
 * - Single documents (by ID)
 * - Multiple documents (bulk delete via where clause)
 * - Version documents
 *
 * ## Collection Naming Conventions
 * - Regular collections: `{collection}`
 * - Version collections: `{collection}_versions`
 *
 * @module convex/bindings/delete
 */

import type { AdapterService } from "../adapter/service";
import { DeleteOne, DeleteMany, DeleteVersions } from "payload";

/**
 * Props for the deleteOne operation.
 */
export type AdapterDeleteOneProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming deleteOne parameters from Payload */
  incomingDeleteOne: Parameters<DeleteOne>[0];
};

/**
 * Props for the deleteMany operation.
 */
export type AdapterDeleteManyProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming deleteMany parameters from Payload */
  incomingDeleteMany: Parameters<DeleteMany>[0];
};

/**
 * Props for the deleteVersions operation.
 */
export type AdapterDeleteVersionsProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming deleteVersions parameters from Payload */
  incomingDeleteVersions: Parameters<DeleteVersions>[0];
};

/**
 * Deletes a single document from a collection matching a where clause.
 *
 * This function first fetches the document to return it, then deletes it.
 * This matches Payload's expected behavior of returning the deleted document.
 *
 * @param {AdapterDeleteOneProps} props - The deleteOne operation parameters
 * @returns {Promise<Awaited<ReturnType<DeleteOne>>>} The deleted document
 *
 * @example
 * ```typescript
 * const deletedDoc = await deleteOne({
 *   service,
 *   incomingDeleteOne: {
 *     collection: 'posts',
 *     where: { id: { equals: '123' } },
 *   },
 * });
 * ```
 */
export async function deleteOne(props: AdapterDeleteOneProps) {
  const { service, incomingDeleteOne } = props;
  const { returning = true } = incomingDeleteOne;

  service.system.logger("deleteOne").dir();

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingDeleteOne,
    convex: false,
  });

  // First, fetch the document to return it
  const docs = await service.db.query({}).collectionWhereQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  if (!docs || docs.length === 0) {
    return null as Awaited<ReturnType<DeleteOne>>;
  }

  const doc = docs[0];

  if (!doc.id) {
    return service.system.logger("ERROR: Document ID is required").error();
  } else {
    return service.system.logger({
      document: doc,
      error: "Document ID is required",
    }).error();
  } 

  // Delete the document
  await service.db.mutation({}).deleteOp.adapter({
    service,
    id: doc.id as string,
  });

  // Only process result if returning is true (default)
  if (!returning) {
    return { id: doc.id } as Awaited<ReturnType<DeleteOne>>;
  }

  return processedQuery.processResult(doc) as Awaited<ReturnType<DeleteOne>>;
}

/**
 * Deletes multiple documents matching a where clause.
 *
 * This function uses the deleteManyWhere mutation to delete all documents
 * matching the provided filter criteria. Returns void per Payload's specification.
 *
 * @param {AdapterDeleteManyProps} props - The deleteMany operation parameters
 * @returns {Promise<Awaited<ReturnType<DeleteMany>>>} void
 *
 * @example
 * ```typescript
 * await deleteMany({
 *   service,
 *   incomingDeleteMany: {
 *     collection: 'posts',
 *     where: { status: { equals: 'draft' } },
 *   },
 * });
 * ```
 */
export async function deleteMany(props: AdapterDeleteManyProps) {
  const { service, incomingDeleteMany } = props;

  service.system.logger("deleteMany").dir();

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingDeleteMany,
    convex: false,
  });

  // Delete all matching documents
  await service.db.mutation({}).deleteManyWhere.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });
}

/**
 * Deletes version documents for a collection or global.
 *
 * Versions are stored in collections named `{collection}_versions` or `{global}_versions`.
 * This function deletes version documents matching the provided where clause.
 * Returns void per Payload's specification.
 *
 * @param {AdapterDeleteVersionsProps} props - The deleteVersions operation parameters
 * @returns {Promise<Awaited<ReturnType<DeleteVersions>>>} void
 *
 * @example
 * ```typescript
 * await deleteVersions({
 *   service,
 *   incomingDeleteVersions: {
 *     collection: 'posts',
 *     where: { parent: { equals: '123' } },
 *   },
 * });
 * ```
 */
export async function deleteVersions(props: AdapterDeleteVersionsProps) {
  const { service, incomingDeleteVersions } = props;
  const { collection, globalSlug, where, locale } = incomingDeleteVersions;

  service.system.logger("deleteVersions").dir();

  // Determine the versions collection name
  const versionsCollection = collection
    ? `${collection}_versions`
    : `${globalSlug}_versions`;

  // Pass compatible params to queryProcessor (sort is excluded as it has incompatible type)
  const processedQuery = service.tools.queryProcessor({
    service,
    collection: versionsCollection,
    where,
    locale,
    convex: false,
  });

  // Delete all matching version documents
  await service.db.mutation({}).deleteManyWhere.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });
}
