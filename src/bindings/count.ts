/**
 * @fileoverview Count Operation Bindings
 *
 * This module implements Payload's count operations for the Convex adapter.
 * It provides document counting with optional where clause filtering for:
 * - Regular collections
 * - Version collections
 * - Global version collections
 *
 * @module convex/bindings/count
 */

import type { AdapterService } from "../adapter/service";
import { Count, CountVersions, CountGlobalVersions } from "payload";

/**
 * Props for the count operation.
 */
export type AdapaterCountProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming count parameters from Payload */
  incomingCount: Parameters<Count>[0];
};

/**
 * Props for the countVersions operation.
 */
export type AdapaterCountVersionsProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming countVersions parameters from Payload */
  incomingCountVersions: Parameters<CountVersions>[0];
};

/**
 * Props for the countGlobalVersions operation.
 */
export type AdapaterCountGlobalVersionsProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming countGlobalVersions parameters from Payload */
  incomingCountGlobalVersions: Parameters<CountGlobalVersions>[0];
};

/**
 * Counts documents in a collection matching the where clause.
 *
 * @param {AdapaterCountProps} props - The count operation parameters
 * @returns {Promise<{ totalDocs: number }>} The count result
 */
export async function count(props: AdapaterCountProps) {
  const { service, incomingCount } = props;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...(incomingCount as any),
    convex: false,
  });

  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  return {
    totalDocs,
  } satisfies Awaited<ReturnType<Count>>;
}

/**
 * Counts version documents for a collection.
 *
 * Versions are stored in collections named `{collection}_versions`.
 *
 * @param {AdapaterCountVersionsProps} props - The countVersions operation parameters
 * @returns {Promise<{ totalDocs: number }>} The count result
 */
export async function countVersions(props: AdapaterCountVersionsProps) {
  const { service, incomingCountVersions } = props;
  const { collection } = incomingCountVersions as any;

  // Versions are stored in a collection with "_versions" suffix
  const versionsCollection = `${collection}_versions`;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...(incomingCountVersions as any),
    collection: versionsCollection,
    convex: false,
  });

  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  return {
    totalDocs,
  } satisfies Awaited<ReturnType<CountVersions>>;
}

/**
 * Counts version documents for a global.
 *
 * Global versions are stored in collections named `{global}_global_versions`.
 *
 * @param {AdapaterCountGlobalVersionsProps} props - The countGlobalVersions operation parameters
 * @returns {Promise<{ totalDocs: number }>} The count result
 */
export async function countGlobalVersions(
  props: AdapaterCountGlobalVersionsProps
) {
  const { service, incomingCountGlobalVersions } = props;
  const { global } = incomingCountGlobalVersions as any;

  // Global versions are stored in a collection with "_global_versions" suffix
  const globalVersionsCollection = `${global}_global_versions`;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...(incomingCountGlobalVersions as any),
    collection: globalVersionsCollection,
    convex: false,
  });

  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  return {
    totalDocs,
  } satisfies Awaited<ReturnType<CountGlobalVersions>>;
}
