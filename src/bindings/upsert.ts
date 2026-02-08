/**
 * @fileoverview Upsert Operation Bindings
 *
 * This module implements Payload's upsert operation for the Convex adapter.
 * Upsert creates a document if it doesn't exist, or updates it if it does.
 *
 * @module convex/bindings/upsert
 */

import type { AdapterService } from "../adapter/service";
import { Upsert } from "payload";

type IncrementOp = {
  field: string;
  amount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function splitIncrementOps(data: Record<string, unknown> | null | undefined) {
  const incOps: IncrementOp[] = [];
  const patchData: Record<string, unknown> = {};

  if (!data) {
    return { incOps, patchData };
  }

  for (const [field, value] of Object.entries(data)) {
    if (isRecord(value) && "$inc" in value) {
      const amount = (value as Record<string, unknown>)["$inc"];
      if (typeof amount !== "number") {
        throw new Error(
          `Unsupported $inc payload for field '${field}': expected number`
        );
      }
      incOps.push({ field, amount });
      continue;
    }

    patchData[field] = value;
  }

  return { incOps, patchData };
}

async function applyPatchWithIncrements(
  service: AdapterService,
  id: string,
  data: Record<string, unknown> | null | undefined
) {
  const { incOps, patchData } = splitIncrementOps(data);

  if (Object.keys(patchData).length > 0) {
    await service.db.mutation({}).patch.adapter({
      service,
      id,
      data: patchData,
    });
  }

  for (const inc of incOps) {
    await service.db.mutation({}).increment.adapter({
      service,
      id,
      field: inc.field,
      amount: inc.amount,
    });
  }
}

function normalizeInsertData(data: Record<string, unknown> | null | undefined) {
  const { incOps, patchData } = splitIncrementOps(data);
  if (incOps.length === 0) {
    return patchData;
  }

  const normalized = { ...patchData };
  for (const inc of incOps) {
    normalized[inc.field] = inc.amount;
  }

  return normalized;
}

/**
 * Props for the upsert operation.
 */
export type AdapterUpsertProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming upsert parameters from Payload */
  incomingUpsert: Parameters<Upsert>[0];
};

/**
 * Inserts or updates a document based on matching criteria.
 *
 * This function searches for a document matching the where clause.
 * If found, it updates the document. If not found, it creates a new one.
 *
 * @param {AdapterUpsertProps} props - The upsert operation parameters
 * @returns {Promise<Awaited<ReturnType<Upsert>>>} The upserted document
 *
 * @example
 * ```typescript
 * const doc = await upsert({
 *   service,
 *   incomingUpsert: {
 *     collection: 'posts',
 *     where: { slug: { equals: 'hello-world' } },
 *     data: { title: 'Hello World', content: 'Updated content' },
 *   },
 * });
 * ```
 */
export async function upsert(props: AdapterUpsertProps) {
  const { service, incomingUpsert } = props;
  const { collection, data, returning = true } = incomingUpsert;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingUpsert,
    limit: 1,
    convex: false,
  });

  // Try to find an existing document
  const existingDocs = await service.db
    .query({})
    .collectionWhereLimitQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
      limit: processedQuery.convexQueryProps.limit!,
    });

  if (existingDocs && existingDocs.length > 0) {
    // Document exists - update it
    const docId = existingDocs[0]._id as string;

    await applyPatchWithIncrements(
      service,
      docId,
      data as Record<string, unknown>
    );

    // Only fetch if returning is true (default)
    if (!returning) {
      return { id: docId } as Awaited<ReturnType<Upsert>>;
    }

    // Fetch and return the updated document
    const updatedDoc = await service.db.query({}).getById.adapter({
      service,
      collection,
      id: docId,
    });

    return processedQuery.processResult(updatedDoc) as Awaited<
      ReturnType<Upsert>
    >;
  } else {
    // Document doesn't exist - create it
    const normalizedData = normalizeInsertData(data as Record<string, unknown>);

    const docId = await service.db.mutation({}).insert.adapter({
      service,
      collection,
      data: normalizedData,
    });

    // Only fetch if returning is true (default)
    if (!returning) {
      return { id: docId } as Awaited<ReturnType<Upsert>>;
    }

    // Fetch and return the created document
    const newDoc = await service.db.query({}).getById.adapter({
      service,
      collection,
      id: docId as string,
    });

    return processedQuery.processResult(newDoc) as Awaited<ReturnType<Upsert>>;
  }
}
