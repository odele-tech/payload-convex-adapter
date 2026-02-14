/**
 * @fileoverview Update Operation Bindings
 *
 * This module implements Payload's update operations for the Convex adapter.
 * It provides document updates for:
 * - Single documents
 * - Multiple documents (bulk update)
 * - Global documents
 * - Document versions
 * - Global versions
 * - Job queue entries
 *
 * @module convex/bindings/update
 * @todo Implement all update operations
 */

import type { AdapterService } from "../adapter/service";
import {
  UpdateOne,
  UpdateMany,
  UpdateGlobal,
  UpdateVersion,
  UpdateGlobalVersion,
  UpdateJobs,
} from "payload";

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
    // Skip read-only system fields that cannot be updated
    // createdAt -> _creationTime (Convex read-only system field)
    // id -> _id (Convex read-only system field)
    if (
      field === "createdAt" ||
      field === "id" ||
      field === "_id" ||
      field === "_creationTime"
    ) {
      continue;
    }

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

/**
 * Props for the updateOne operation.
 */
export type AdapterUpdateOneProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming updateOne parameters from Payload */
  incomingUpdateOne: Parameters<UpdateOne>[0];
};

/**
 * Props for the updateMany operation.
 */
export type AdapterUpdateManyProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming updateMany parameters from Payload */
  incomingUpdateMany: Parameters<UpdateMany>[0];
};

/**
 * Props for the updateGlobal operation.
 */
export type AdapterUpdateGlobalProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming updateGlobal parameters from Payload */
  incomingUpdateGlobal: Parameters<UpdateGlobal>[0];
};

/**
 * Props for the updateVersion operation.
 */
export type AdapterUpdateVersionProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming updateVersion parameters from Payload */
  incomingUpdateVersion: Parameters<UpdateVersion>[0];
};

/**
 * Props for the updateGlobalVersion operation.
 */
export type AdapterUpdateGlobalVersionProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming updateGlobalVersion parameters from Payload */
  incomingUpdateGlobalVersion: Parameters<UpdateGlobalVersion>[0];
};

/**
 * Props for the updateJobs operation.
 */
export type AdapterUpdateJobsProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming updateJobs parameters from Payload */
  incomingUpdateJobs: Parameters<UpdateJobs>[0];
};

/**
 * Updates a single document in a collection.
 *
 * UpdateOne can use either an `id` or a `where` clause to identify the document.
 *
 * @param {AdapterUpdateOneProps} props - The updateOne operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateOne>>>} The updated document
 *
 * @example
 * ```typescript
 * const updatedDoc = await updateOne({
 *   service,
 *   incomingUpdateOne: {
 *     collection: 'posts',
 *     where: { id: { equals: '123' } },
 *     data: { title: 'Updated Title' },
 *   },
 * });
 * ```
 */
export async function updateOne(props: AdapterUpdateOneProps) {
  const { service, incomingUpdateOne } = props;
  const {
    collection,
    data,
    id,
    where,
    draft,
    returning = true,
  } = incomingUpdateOne;

  let docId: string;

  // If ID is provided directly, use it
  if (id) {
    docId = id as string;
  } else if (where) {
    // Otherwise, find the document using the where clause
    const processedQuery = service.tools.queryProcessor({
      service,
      ...incomingUpdateOne,
      limit: 1,
      convex: false,
    });

    const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
      limit: processedQuery.convexQueryProps.limit!,
    });

    if (!docs || docs.length === 0) {
      throw new Error(
        `updateOne: Document not found in collection '${collection}' matching where clause`
      );
    }

    docId = docs[0]._id as string;
  } else {
    throw new Error("updateOne requires either id or where parameter");
  }

  // Prepare update data with draft status if applicable
  const updateData =
    draft !== undefined
      ? { ...data, _status: draft ? "draft" : "published" }
      : data;

  // Update the document using patch
  await applyPatchWithIncrements(
    service,
    docId,
    updateData as Record<string, unknown>
  );

  // Only fetch if returning is true (default)
  if (!returning) {
    return { id: docId } as Awaited<ReturnType<UpdateOne>>;
  }

  // Fetch and return the updated document
  const updatedDoc = await service.db.query({}).getById.adapter({
    service,
    collection,
    id: docId,
  });

  if (!updatedDoc) {
    throw new Error(
      `updateOne: Document with id '${docId}' not found after update in collection '${collection}'`
    );
  }

  return updatedDoc as Awaited<ReturnType<UpdateOne>>;
}

/**
 * Updates multiple documents matching a where clause.
 *
 * @param {AdapterUpdateManyProps} props - The updateMany operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateMany>>>} Array of updated documents or null
 *
 * @example
 * ```typescript
 * const updatedDocs = await updateMany({
 *   service,
 *   incomingUpdateMany: {
 *     collection: 'posts',
 *     where: { status: { equals: 'draft' } },
 *     data: { status: 'published' },
 *   },
 * });
 * ```
 */
export async function updateMany(props: AdapterUpdateManyProps) {
  const { service, incomingUpdateMany } = props;
  const {
    collection,
    data,
    draft,
    limit,
    returning = true,
  } = incomingUpdateMany;

  // Pass all incoming params to queryProcessor
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingUpdateMany,
    convex: false,
  });

  // First, fetch all matching documents to get their IDs
  const docs = await service.db.query({}).collectionWhereQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  if (!docs || docs.length === 0) {
    return null as Awaited<ReturnType<UpdateMany>>;
  }

  // Apply limit if provided
  const docsToUpdate = limit ? docs.slice(0, limit) : docs;

  // Prepare update data with draft status if applicable
  const updateData =
    draft !== undefined
      ? { ...data, _status: draft ? "draft" : "published" }
      : data;

  // Update each document
  for (const doc of docsToUpdate) {
    await applyPatchWithIncrements(
      service,
      doc._id as string,
      updateData as Record<string, unknown>
    );
  }

  // Only fetch if returning is true (default)
  if (!returning) {
    return null as Awaited<ReturnType<UpdateMany>>;
  }

  // Fetch and return all updated documents
  const updatedDocs = await service.db.query({}).collectionWhereQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  // Apply limit to returned docs if provided
  const rawDocs = limit ? updatedDocs.slice(0, limit) : updatedDocs;

  return rawDocs as Awaited<ReturnType<UpdateMany>>;
}

/**
 * Updates a global document.
 *
 * Globals are singleton documents stored in collections named `_globals_{slug}`.
 *
 * @param {AdapterUpdateGlobalProps} props - The updateGlobal operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateGlobal>>>} The updated global document
 *
 * @example
 * ```typescript
 * const updatedGlobal = await updateGlobal({
 *   service,
 *   incomingUpdateGlobal: {
 *     slug: 'settings',
 *     data: { siteName: 'Updated Site Name' },
 *   },
 * });
 * ```
 */
export async function updateGlobal(props: AdapterUpdateGlobalProps) {
  const { service, incomingUpdateGlobal } = props;
  const { slug, data, returning = true } = incomingUpdateGlobal;

  // Globals are stored in a collection named after the slug
  const globalCollection = `_globals_${slug}`;

  // Find the global document (should be only one)
  const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
    service,
    collection: globalCollection,
    wherePlan: service.tools.emptyWherePlan(),
    limit: 1,
    index: undefined,
  });

  if (!docs || docs.length === 0) {
    // If no global exists, this should not happen in normal operation
    // The global should be created first with createGlobal
    throw new Error(`Global document not found for slug: ${slug}`);
  }

  const docId = docs[0]._id as string;

  // Update the global document
  await applyPatchWithIncrements(
    service,
    docId,
    data as Record<string, unknown>
  );

  // Only fetch if returning is true (default)
  if (!returning) {
    return { id: docId } as unknown as Awaited<ReturnType<UpdateGlobal>>;
  }

  // Fetch and return the updated global
  const updatedDoc = await service.db.query({}).getById.adapter({
    service,
    collection: globalCollection,
    id: docId,
  });

  return updatedDoc as unknown as Awaited<ReturnType<UpdateGlobal>>;
}

/**
 * Updates a document version.
 *
 * Versions are stored in collections named `{collection}_versions`.
 * Can update by either `id` or `where` clause.
 *
 * @param {AdapterUpdateVersionProps} props - The updateVersion operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateVersion>>>} The updated version document
 *
 * @example
 * ```typescript
 * const updatedVersion = await updateVersion({
 *   service,
 *   incomingUpdateVersion: {
 *     collection: 'posts',
 *     id: 'version123',
 *     versionData: { latest: true },
 *   },
 * });
 * ```
 */
export async function updateVersion(props: AdapterUpdateVersionProps) {
  const { service, incomingUpdateVersion } = props;
  const {
    collection,
    versionData,
    id,
    where,
    returning = true,
  } = incomingUpdateVersion;

  // Versions are stored in a collection with "_versions" suffix
  const versionsCollection = `${collection}_versions`;

  let docId: string;

  // If ID is provided directly, use it
  if (id) {
    docId = id as string;
  } else if (where) {
    // Otherwise, find the version using the where clause
    const processedQuery = service.tools.queryProcessor({
      service,
      ...incomingUpdateVersion,
      collection: versionsCollection,
      limit: 1,
      convex: false,
    });

    const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
      limit: 1,
    });

    if (!docs || docs.length === 0) {
      return null as unknown as Awaited<ReturnType<UpdateVersion>>;
    }

    docId = docs[0]._id as string;
  } else {
    throw new Error("updateVersion requires either id or where parameter");
  }

  // Remap createdAt to pca_createdAt so it survives the patch pipeline.
  // The key transformer maps createdAt → _creationTime (a read-only Convex
  // system field) which gets stripped. Using pca_createdAt matches the storage
  // format used by createVersion and round-trips correctly on read.
  const patchData = { ...(versionData as Record<string, unknown>) };
  if ("createdAt" in patchData) {
    patchData.pca_createdAt = patchData.createdAt;
    delete patchData.createdAt;
  }

  // Update the version document
  await applyPatchWithIncrements(service, docId, patchData);

  // Only fetch if returning is true (default)
  if (!returning) {
    return { id: docId } as Awaited<ReturnType<UpdateVersion>>;
  }

  // Fetch and return the updated version
  const updatedDoc = await service.db.query({}).getById.adapter({
    service,
    collection: versionsCollection,
    id: docId,
  });

  return updatedDoc as Awaited<ReturnType<UpdateVersion>>;
}

/**
 * Updates a global version document.
 *
 * Global versions are stored in collections named `{global}_global_versions`.
 * Can update by either `id` or `where` clause.
 *
 * @param {AdapterUpdateGlobalVersionProps} props - The updateGlobalVersion operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateGlobalVersion>>>} The updated global version document
 *
 * @example
 * ```typescript
 * const updatedGlobalVersion = await updateGlobalVersion({
 *   service,
 *   incomingUpdateGlobalVersion: {
 *     global: 'settings',
 *     id: 'version123',
 *     versionData: { latest: true },
 *   },
 * });
 * ```
 */
export async function updateGlobalVersion(
  props: AdapterUpdateGlobalVersionProps
) {
  const { service, incomingUpdateGlobalVersion } = props;
  const {
    global,
    versionData,
    id,
    where,
    returning = true,
  } = incomingUpdateGlobalVersion;

  // Global versions are stored in a collection with "_global_versions" suffix
  const globalVersionsCollection = `${global}_global_versions`;

  let docId: string;

  // If ID is provided directly, use it
  if (id) {
    docId = id as string;
  } else if (where) {
    // Otherwise, find the version using the where clause
    const processedQuery = service.tools.queryProcessor({
      service,
      ...incomingUpdateGlobalVersion,
      collection: globalVersionsCollection,
      limit: 1,
      convex: false,
    });

    const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
      limit: 1,
    });

    if (!docs || docs.length === 0) {
      return null as unknown as Awaited<ReturnType<UpdateGlobalVersion>>;
    }

    docId = docs[0]._id as string;
  } else {
    throw new Error(
      "updateGlobalVersion requires either id or where parameter"
    );
  }

  // Remap createdAt to pca_createdAt so it survives the patch pipeline.
  // The key transformer maps createdAt → _creationTime (a read-only Convex
  // system field) which gets stripped. Using pca_createdAt matches the storage
  // format used by createGlobalVersion and round-trips correctly on read.
  const patchData = { ...(versionData as Record<string, unknown>) };
  if ("createdAt" in patchData) {
    patchData.pca_createdAt = patchData.createdAt;
    delete patchData.createdAt;
  }

  // Update the global version document
  await applyPatchWithIncrements(service, docId, patchData);

  // Only fetch if returning is true (default)
  if (!returning) {
    return { id: docId } as Awaited<ReturnType<UpdateGlobalVersion>>;
  }

  // Fetch and return the updated global version
  const updatedDoc = await service.db.query({}).getById.adapter({
    service,
    collection: globalVersionsCollection,
    id: docId,
  });

  return updatedDoc as Awaited<ReturnType<UpdateGlobalVersion>>;
}

/**
 * Updates job queue entries.
 *
 * Jobs are stored in a special `_jobs` collection.
 * Can update by either `id` or `where` clause with optional `limit`.
 *
 * @param {AdapterUpdateJobsProps} props - The updateJobs operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateJobs>>>} Array of updated job entries or null
 *
 * @example
 * ```typescript
 * const updatedJobs = await updateJobs({
 *   service,
 *   incomingUpdateJobs: {
 *     where: { status: { equals: 'pending' } },
 *     data: { status: 'processing' },
 *     limit: 10,
 *   },
 * });
 * ```
 */
export async function updateJobs(props: AdapterUpdateJobsProps) {
  const { service, incomingUpdateJobs } = props;
  const { data, id, where, limit, returning = true } = incomingUpdateJobs;

  const jobsCollection = "_jobs";

  // If ID is provided, update a single job
  if (id) {
    await applyPatchWithIncrements(
      service,
      id as string,
      data as Record<string, unknown>
    );

    // Only fetch if returning is true (default)
    if (!returning) {
      return [{ id }] as Awaited<ReturnType<UpdateJobs>>;
    }

    // Fetch and return the updated job
    const updatedJob = await service.db.query({}).getById.adapter({
      service,
      collection: jobsCollection,
      id: id as string,
    });

    return [updatedJob] as Awaited<ReturnType<UpdateJobs>>;
  }

  // Otherwise, update jobs matching the where clause
  if (where) {
    // Pass all incoming params to queryProcessor
    const processedQuery = service.tools.queryProcessor({
      service,
      ...incomingUpdateJobs,
      collection: jobsCollection,
      convex: false,
    });

    // Fetch matching jobs
    const jobs = limit
      ? await service.db.query({}).collectionWhereLimitQuery.adapter({
          service,
          ...processedQuery.convexQueryProps,
          limit: processedQuery.convexQueryProps.limit!,
        })
      : await service.db.query({}).collectionWhereQuery.adapter({
          service,
          ...processedQuery.convexQueryProps,
        });

    if (!jobs || jobs.length === 0) {
      return null as Awaited<ReturnType<UpdateJobs>>;
    }

    // Update each job
    for (const job of jobs) {
      await applyPatchWithIncrements(
        service,
        job._id as string,
        data as Record<string, unknown>
      );
    }

    // Only fetch if returning is true (default)
    if (!returning) {
      return null as Awaited<ReturnType<UpdateJobs>>;
    }

    // Fetch and return all updated jobs
    const updatedJobs = limit
      ? await service.db.query({}).collectionWhereLimitQuery.adapter({
          service,
          ...processedQuery.convexQueryProps,
          limit: processedQuery.convexQueryProps.limit!,
        })
      : await service.db.query({}).collectionWhereQuery.adapter({
          service,
          ...processedQuery.convexQueryProps,
        });

    return updatedJobs as Awaited<ReturnType<UpdateJobs>>;
  }

  throw new Error("updateJobs requires either id or where parameter");
}
