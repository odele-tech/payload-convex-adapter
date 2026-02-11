import { createConvexClient } from './chunk-MBKD3Q5V.js';
import { createServiceLogger, createSessionTracker, isClient, isDev, emptyWherePlan, createWherePlan, parseCollection, queryProcessor, createRandomID, bindings_exports } from './chunk-3AHVKAFP.js';
import { MutationAdapter, QueryAdapter } from './chunk-E3XPJ3KP.js';
import { createDatabaseAdapter } from 'payload';
import { anyApi } from 'convex/server';
import 'child_process';

// src/adapter/service.ts
function createAdapterService(props) {
  const { payload, prefix, convexUrl } = props;
  const convexClient = createConvexClient({ convexUrl });
  const serviceLogger = createServiceLogger({ prefix });
  const sessionTracker = createSessionTracker();
  let recentVersionId;
  const system = {
    url: convexUrl,
    prefix,
    logger: serviceLogger,
    isDev,
    isClient,
    /**
     * Sets the ID of a recently created version to protect it from cleanup.
     * This is used to coordinate between createVersion and deleteVersions operations.
     */
    setRecentVersionId: (id) => {
      recentVersionId = id;
    },
    /**
     * Gets the ID of the recently created version, if any.
     * Returns undefined if no version was recently created.
     */
    getRecentVersionId: () => recentVersionId,
    /**
     * Clears the recent version ID after cleanup is complete.
     */
    clearRecentVersionId: () => {
      recentVersionId = void 0;
    }
  };
  const db = {
    client: convexClient,
    bindings: bindings_exports,
    query: QueryAdapter,
    mutation: MutationAdapter,
    api: anyApi
  };
  const tools = {
    sessionTracker,
    createRandomID,
    queryProcessor,
    parseCollection,
    createWherePlan,
    emptyWherePlan
  };
  return {
    db,
    tools,
    system,
    payload
  };
}

// src/adapter/index.ts
function convexAdapter(props) {
  return {
    name: "payload-convex-adapter",
    allowIDOnCreate: false,
    defaultIDType: "text",
    init: (args) => {
      const { payload } = args;
      const service = createAdapterService({
        ...props,
        payload
      });
      return createDatabaseAdapter({
        payload,
        name: "payload-convex",
        packageName: "payload-convex-adapter",
        defaultIDType: "text",
        migrationDir: "./migrations",
        // Transaction Bindings
        beginTransaction: async () => {
          return await service.db.bindings.transactions.beginTransaction({
            service
          });
        },
        commitTransaction: async (id) => {
          return await service.db.bindings.transactions.commitTransaction({
            service,
            incomingID: id
          });
        },
        rollbackTransaction: async (id) => {
          return await service.db.bindings.transactions.rollbackTransaction({
            service,
            incomingID: id
          });
        },
        // Counts
        count: async (countProps) => {
          return await service.db.bindings.counts.count({
            service,
            incomingCount: countProps
          });
        },
        countVersions: async (countVersionsProps) => {
          return await service.db.bindings.counts.countVersions({
            service,
            incomingCountVersions: countVersionsProps
          });
        },
        countGlobalVersions: async (countGlobalVersionsProps) => {
          return await service.db.bindings.counts.countGlobalVersions({
            service,
            incomingCountGlobalVersions: countGlobalVersionsProps
          });
        },
        // Create
        create: async (createProps) => {
          return await service.db.bindings.creates.create({
            service,
            incomingCreate: createProps
          });
        },
        createGlobal: (async (createGlobalProps) => {
          return await service.db.bindings.creates.createGlobal({
            service,
            incomingCreateGlobal: createGlobalProps
          });
        }),
        createVersion: (async (createVersionProps) => {
          return await service.db.bindings.creates.createVersion({
            service,
            incomingCreateVersion: createVersionProps
          });
        }),
        createGlobalVersion: (async (createGlobalVersionProps) => {
          return await service.db.bindings.creates.createGlobalVersion({
            service,
            incomingCreateGlobalVersion: createGlobalVersionProps
          });
        }),
        createMigration: async (createMigrationProps) => {
          return await service.db.bindings.creates.createMigration({
            service,
            incomingCreateMigration: createMigrationProps
          });
        },
        // Find
        find: async (findProps) => {
          return await service.db.bindings.finds.find({
            service,
            incomingFind: findProps
          });
        },
        findOne: async (findOneProps) => {
          return await service.db.bindings.finds.findOne({
            service,
            incomingFindOne: findOneProps
          });
        },
        findDistinct: async (findDistinctProps) => {
          return await service.db.bindings.finds.findDistinct({
            service,
            incomingFindDistinct: findDistinctProps
          });
        },
        findGlobal: async (findGlobalProps) => {
          return await service.db.bindings.finds.findGlobal({
            service,
            incomingFindGlobal: findGlobalProps
          });
        },
        findVersions: async (findVersionsProps) => {
          return await service.db.bindings.finds.findVersions({
            service,
            incomingFindVersions: findVersionsProps
          });
        },
        findGlobalVersions: async (findGlobalVersionsProps) => {
          return await service.db.bindings.finds.findGlobalVersions({
            service,
            incomingFindGlobalVersions: findGlobalVersionsProps
          });
        },
        // Delete
        deleteOne: async (deleteOneProps) => {
          return await service.db.bindings.deletes.deleteOne({
            service,
            incomingDeleteOne: deleteOneProps
          });
        },
        deleteMany: async (deleteManyProps) => {
          return await service.db.bindings.deletes.deleteMany({
            service,
            incomingDeleteMany: deleteManyProps
          });
        },
        deleteVersions: async (deleteVersionsProps) => {
          const result = await service.db.bindings.deletes.deleteVersions({
            service,
            incomingDeleteVersions: deleteVersionsProps
          });
          service.system.clearRecentVersionId();
          return result;
        },
        // Update
        updateOne: async (updateOneProps) => {
          return await service.db.bindings.updates.updateOne({
            service,
            incomingUpdateOne: updateOneProps
          });
        },
        updateMany: async (updateManyProps) => {
          return await service.db.bindings.updates.updateMany({
            service,
            incomingUpdateMany: updateManyProps
          });
        },
        updateGlobal: (async (updateGlobalProps) => {
          return await service.db.bindings.updates.updateGlobal({
            service,
            incomingUpdateGlobal: updateGlobalProps
          });
        }),
        updateVersion: (async (updateVersionProps) => {
          return await service.db.bindings.updates.updateVersion({
            service,
            incomingUpdateVersion: updateVersionProps
          });
        }),
        updateGlobalVersion: (async (updateGlobalVersionProps) => {
          return await service.db.bindings.updates.updateGlobalVersion({
            service,
            incomingUpdateGlobalVersion: updateGlobalVersionProps
          });
        }),
        updateJobs: async (updateJobsProps) => {
          return await service.db.bindings.updates.updateJobs({
            service,
            incomingUpdateJobs: updateJobsProps
          });
        },
        // Upsert
        upsert: async (upsertProps) => {
          return await service.db.bindings.upserts.upsert({
            service,
            incomingUpsert: upsertProps
          });
        },
        // Query Drafts
        queryDrafts: async (queryDraftsProps) => {
          return await service.db.bindings.drafts.queryDrafts({
            service,
            incomingQueryDrafts: queryDraftsProps
          });
        },
        // Migration Functions
        migrate: async (migrateProps) => {
          return await service.db.bindings.migrations.migrate({
            service,
            incomingMigrate: migrateProps
          });
        },
        migrateDown: async () => {
          return await service.db.bindings.migrations.migrateDown({
            service
          });
        },
        migrateFresh: async (migrateFreshProps) => {
          return await service.db.bindings.migrations.migrateFresh({
            service
          });
        },
        migrateRefresh: async () => {
          return await service.db.bindings.migrations.migrateRefresh({
            service
          });
        },
        migrateReset: async () => {
          return await service.db.bindings.migrations.migrateReset({
            service
          });
        },
        migrateStatus: async () => {
          return await service.db.bindings.migrations.migrateStatus({
            service
          });
        }
      });
    }
  };
}

export { convexAdapter };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map