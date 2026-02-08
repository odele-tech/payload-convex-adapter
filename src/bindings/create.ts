/**
 * @fileoverview Create Operation Bindings
 *
 * This module implements Payload's create operations for the Convex adapter.
 * It provides document creation for:
 * - Regular documents
 * - Global documents
 * - Document versions
 * - Global versions
 * - Migration records
 *
 * @module convex/bindings/create
 * @todo Implement all create operations
 */

import type { AdapterService } from "../adapter/service";
import type { Where } from "payload";
import {
  Create,
  CreateGlobal,
  CreateVersion,
  CreateGlobalVersion,
  CreateMigration,
} from "payload";

/**
 * Props for the create operation.
 */
export type AdapterCreateProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming create parameters from Payload */
  incomingCreate: Parameters<Create>[0];
};

/**
 * Props for the createGlobal operation.
 */
export type AdapterCreateGlobalProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming createGlobal parameters from Payload */
  incomingCreateGlobal: Parameters<CreateGlobal>[0];
};

/**
 * Props for the createVersion operation.
 */
export type AdapterCreateVersionProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming createVersion parameters from Payload */
  incomingCreateVersion: Parameters<CreateVersion>[0];
};

/**
 * Props for the createGlobalVersion operation.
 */
export type AdapterCreateGlobalVersionProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming createGlobalVersion parameters from Payload */
  incomingCreateGlobalVersion: Parameters<CreateGlobalVersion>[0];
};

/**
 * Props for the createMigration operation.
 */
export type AdapterCreateMigrationProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The incoming createMigration parameters from Payload */
  incomingCreateMigration: Parameters<CreateMigration>[0];
};

// ============================================================================
// Version Management Helpers
// ============================================================================

/**
 * Unsets the 'latest' flag on older versions for a given parent document.
 *
 * This function mirrors the MongoDB adapter's behavior of maintaining only one
 * version with `latest: true` at a time. When a new version is created, all
 * older versions must have their `latest` flag unset.
 *
 * The function uses:
 * - `parent: { equals: parentId }` to match versions of the same document
 * - `latest: { equals: true }` to only update versions currently marked as latest
 * - `updatedAt: { less_than: newTimestamp }` to only update older versions (strictly <)
 *
 * @param props - Configuration for unsetting latest flag
 * @param props.service - The adapter service instance
 * @param props.versionsCollection - The versions collection name (e.g., "posts_versions")
 * @param props.parent - The parent document ID
 * @param props.newUpdatedAt - The timestamp of the new version being created
 * @internal
 */
async function unsetLatestOnOlderVersions(props: {
  service: AdapterService;
  versionsCollection: string;
  parent: string | number;
  newUpdatedAt: string;
}) {
  const { service, versionsCollection, parent, newUpdatedAt } = props;

  // Build where clause to match older versions with latest: true
  const where: Where = {
    and: [
      { parent: { equals: parent } },
      { latest: { equals: true } },
      { updatedAt: { less_than: newUpdatedAt } },
    ],
  };

  // Process the query
  const processedQuery = service.tools.queryProcessor({
    service,
    collection: versionsCollection,
    where,
    convex: false,
  });

  // Fetch documents to update
  const docs = await service.db.query({}).collectionWhereQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  // Update each document to unset the latest flag
  if (docs && docs.length > 0) {
    await Promise.all(
      docs.map((doc) =>
        service.db.mutation({}).patch.adapter({
          service,
          id: doc._id as string,
          data: { latest: undefined }, // Unset the field
        })
      )
    );
  }
}

/**
 * Unsets the 'latest' flag on older global versions.
 *
 * Similar to `unsetLatestOnOlderVersions` but for global documents which don't
 * have a parent ID. Only uses `latest` and `updatedAt` comparisons.
 *
 * @param props - Configuration for unsetting latest flag
 * @param props.service - The adapter service instance
 * @param props.versionsCollection - The global versions collection name
 * @param props.newUpdatedAt - The timestamp of the new version being created
 * @internal
 */
async function unsetLatestOnOlderGlobalVersions(props: {
  service: AdapterService;
  versionsCollection: string;
  newUpdatedAt: string;
}) {
  const { service, versionsCollection, newUpdatedAt } = props;

  // Build where clause for global versions (no parent field)
  const where: Where = {
    and: [
      { latest: { equals: true } },
      { updatedAt: { less_than: newUpdatedAt } },
    ],
  };

  // Process the query
  const processedQuery = service.tools.queryProcessor({
    service,
    collection: versionsCollection,
    where,
    convex: false,
  });

  // Fetch documents to update
  const docs = await service.db.query({}).collectionWhereQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
  });

  // Update each document to unset the latest flag
  if (docs && docs.length > 0) {
    await Promise.all(
      docs.map((doc) =>
        service.db.mutation({}).patch.adapter({
          service,
          id: doc._id as string,
          data: { latest: undefined }, // Unset the field
        })
      )
    );
  }
}

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Creates a new document in a collection.
 *
 * @param {AdapterCreateProps} props - The create operation parameters
 * @returns {Promise<Awaited<ReturnType<Create>>>} The created document
 *
 * @example
 * ```typescript
 * const newDoc = await create({
 *   service,
 *   incomingCreate: {
 *     collection: 'posts',
 *     data: { title: 'Hello World', status: 'draft' },
 *   },
 * });
 * ```
 */
export async function create(props: AdapterCreateProps) {
  const { service, incomingCreate } = props;
  const { collection, data, draft, returning = true } = incomingCreate;

  // Prepare document data with draft status if applicable
  const documentData = draft ? { ...data, _status: "draft" } : data;

  // Insert the document
  const docId = await service.db.mutation({}).insert.adapter({
    service,
    collection,
    data: documentData,
  });

  // Only fetch if returning is true (default)
  if (!returning) {
    return { id: docId } as Awaited<ReturnType<Create>>;
  }

  // Fetch the created document
  const doc = await service.db.query({}).getById.adapter({
    service,
    collection,
    id: docId as string,
  });

  // Process result through queryProcessor for format conversion and post-filters
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCreate,
    convex: false,
  });

  return processedQuery.processResult(doc) as Awaited<ReturnType<Create>>;
}

/**
 * Creates a new global document.
 *
 * Globals are singleton documents stored in collections named `_globals_{slug}`.
 *
 * @param {AdapterCreateGlobalProps} props - The createGlobal operation parameters
 * @returns {Promise<Awaited<ReturnType<CreateGlobal>>>} The created global document
 *
 * @example
 * ```typescript
 * const global = await createGlobal({
 *   service,
 *   incomingCreateGlobal: {
 *     slug: 'settings',
 *     data: { siteName: 'My Site', theme: 'dark' },
 *   },
 * });
 * ```
 */
export async function createGlobal(props: AdapterCreateGlobalProps) {
  const { service, incomingCreateGlobal } = props;
  const { slug, data, returning = true } = incomingCreateGlobal;

  // Globals are stored in a collection named after the slug
  const globalCollection = `_globals_${slug}`;

  // Insert the global document
  const docId = await service.db.mutation({}).insert.adapter({
    service,
    collection: globalCollection,
    data,
  });

  // Only fetch if returning is true (default)
  if (!returning) {
    return { id: docId } as Awaited<ReturnType<CreateGlobal>>;
  }

  // Fetch the created global
  const doc = await service.db.query({}).getById.adapter({
    service,
    collection: globalCollection,
    id: docId as string,
  });

  // Process result through queryProcessor for format conversion and post-filters
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCreateGlobal,
    collection: globalCollection,
    convex: false,
  });

  return processedQuery.processResult(doc) as Awaited<ReturnType<CreateGlobal>>;
}

/**
 * Creates a new version of a document.
 *
 * Versions are stored in collections named `{collection}_versions`.
 *
 * ## Version Management
 *
 * This function implements proper version lifecycle management that mirrors
 * the MongoDB adapter's behavior:
 *
 * 1. **Unset Latest on Older Versions**: Before creating the new version, all older
 *    versions with `latest: true` are updated to unset the flag. This ensures only
 *    one version is marked as latest at any time.
 *
 * 2. **Create New Version**: Inserts the new version with `latest: true`.
 *
 * 3. **Track Version ID**: Stores the new version ID in the service context so that
 *    subsequent deleteVersions operations can exclude it from cleanup.
 *
 * These steps prevent the newly created version from being immediately deleted
 * during automatic cleanup operations.
 *
 * @param {AdapterCreateVersionProps} props - The createVersion operation parameters
 * @returns {Promise<Awaited<ReturnType<CreateVersion>>>} The created version document
 *
 * @example
 * ```typescript
 * const version = await createVersion({
 *   service,
 *   incomingCreateVersion: {
 *     collectionSlug: 'posts',
 *     parent: '123',
 *     versionData: { title: 'Updated Title' },
 *     autosave: false,
 *     createdAt: new Date().toISOString(),
 *     updatedAt: new Date().toISOString(),
 *   },
 * });
 * ```
 */
export async function createVersion(props: AdapterCreateVersionProps) {
  const { service, incomingCreateVersion } = props;
  const {
    collectionSlug,
    parent,
    versionData,
    autosave,
    createdAt,
    updatedAt,
    publishedLocale,
    returning = true,
    snapshot,
  } = incomingCreateVersion;

  // Versions are stored in a collection with "_versions" suffix
  const versionsCollection = `${collectionSlug}_versions`;

  // STEP 1: Unset 'latest' flag on all older versions for this parent
  // This ensures only one version has latest: true at any time
  await unsetLatestOnOlderVersions({
    service,
    versionsCollection,
    parent,
    newUpdatedAt: updatedAt,
  });

  // STEP 2: Prepare and insert the new version document
  const versionDoc: Record<string, unknown> = {
    parent,
    version: versionData,
    autosave,
    createdAt,
    updatedAt,
    publishedLocale,
    latest: true, // Mark as latest version
  };

  // Include snapshot if provided
  if (snapshot !== undefined) {
    versionDoc.snapshot = snapshot;
  }

  // Insert the version document
  const docId = await service.db.mutation({}).insert.adapter({
    service,
    collection: versionsCollection,
    data: versionDoc,
  });

  // STEP 3: Track this version ID to protect it from immediate deletion
  // The deleteVersions operation will use this to exclude the version from cleanup
  service.system.setRecentVersionId(docId as string);

  // Only fetch if returning is true (default)
  if (!returning) {
    return { id: docId } as Awaited<ReturnType<CreateVersion>>;
  }

  // Fetch the created version
  const doc = await service.db.query({}).getById.adapter({
    service,
    collection: versionsCollection,
    id: docId as string,
  });

  // Process result through queryProcessor for format conversion and post-filters
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCreateVersion,
    collection: versionsCollection,
    locale: publishedLocale,
    convex: false,
  });

  return processedQuery.processResult(doc) as Awaited<
    ReturnType<CreateVersion>
  >;
}

/**
 * Creates a new version of a global document.
 *
 * Global versions are stored in collections named `{global}_global_versions`.
 *
 * ## Version Management
 *
 * Similar to `createVersion`, this function implements proper version lifecycle
 * management for global documents:
 *
 * 1. **Unset Latest on Older Versions**: Before creating the new version, all older
 *    global versions with `latest: true` are updated to unset the flag.
 *
 * 2. **Create New Version**: Inserts the new version with `latest: true`.
 *
 * 3. **Track Version ID**: Stores the new version ID in the service context for
 *    protection during cleanup operations.
 *
 * Note: Global versions don't have a `parent` field since there's only one instance
 * of each global document.
 *
 * @param {AdapterCreateGlobalVersionProps} props - The createGlobalVersion operation parameters
 * @returns {Promise<Awaited<ReturnType<CreateGlobalVersion>>>} The created global version document
 *
 * @example
 * ```typescript
 * const globalVersion = await createGlobalVersion({
 *   service,
 *   incomingCreateGlobalVersion: {
 *     globalSlug: 'settings',
 *     versionData: { siteName: 'Updated Site Name' },
 *     autosave: false,
 *     createdAt: new Date().toISOString(),
 *     updatedAt: new Date().toISOString(),
 *   },
 * });
 * ```
 */
export async function createGlobalVersion(
  props: AdapterCreateGlobalVersionProps
) {
  const { service, incomingCreateGlobalVersion } = props;
  const {
    globalSlug,
    versionData,
    autosave,
    createdAt,
    updatedAt,
    publishedLocale,
    returning = true,
    snapshot,
  } = incomingCreateGlobalVersion;

  // Global versions are stored in a collection with "_global_versions" suffix
  const globalVersionsCollection = `${globalSlug}_global_versions`;

  // STEP 1: Unset 'latest' flag on all older global versions
  // This ensures only one version has latest: true at any time
  await unsetLatestOnOlderGlobalVersions({
    service,
    versionsCollection: globalVersionsCollection,
    newUpdatedAt: updatedAt,
  });

  // STEP 2: Prepare and insert the new global version document
  const versionDoc: Record<string, unknown> = {
    version: versionData,
    autosave,
    createdAt,
    updatedAt,
    publishedLocale,
    latest: true, // Mark as latest version
  };

  // Include snapshot if provided
  if (snapshot !== undefined) {
    versionDoc.snapshot = snapshot;
  }

  // Insert the global version document
  const docId = await service.db.mutation({}).insert.adapter({
    service,
    collection: globalVersionsCollection,
    data: versionDoc,
  });

  // STEP 3: Track this version ID to protect it from immediate deletion
  service.system.setRecentVersionId(docId as string);

  // Only fetch if returning is true (default)
  if (!returning) {
    return { id: docId } as Awaited<ReturnType<CreateGlobalVersion>>;
  }

  // Fetch the created global version
  const doc = await service.db.query({}).getById.adapter({
    service,
    collection: globalVersionsCollection,
    id: docId as string,
  });

  // Process result through queryProcessor for format conversion and post-filters
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCreateGlobalVersion,
    collection: globalVersionsCollection,
    locale: publishedLocale,
    convex: false,
  });

  return processedQuery.processResult(doc) as Awaited<
    ReturnType<CreateGlobalVersion>
  >;
}

/**
 * Creates a new migration record.
 *
 * Migration records track which migrations have been run on the database.
 * This is a placeholder implementation that logs the migration creation.
 *
 * @param {AdapterCreateMigrationProps} props - The createMigration operation parameters
 * @returns {Promise<void>}
 *
 * @note This is a placeholder implementation. Full migration support requires
 * additional infrastructure for tracking and executing migrations.
 */
export async function createMigration(props: AdapterCreateMigrationProps) {
  const { service, incomingCreateMigration } = props;

  // Placeholder: Migration creation would typically write to a migrations table
}
