/**
 * @fileoverview Convex Database Adapter Factory
 *
 * This module provides the main database adapter factory for integrating Convex
 * with Payload CMS. It implements Payload's `DatabaseAdapterObj` interface,
 * providing all required database operations.
 *
 * ## Architecture
 * The adapter uses a service-based architecture where:
 * - The adapter factory creates the database adapter configuration
 * - The adapter service manages the Convex client and utilities
 * - Bindings provide the actual database operation implementations
 *
 * ## Collection Naming
 * Collections are prefixed with the configured prefix to support multi-tenant
 * deployments and avoid naming conflicts. For example, with prefix "my_app",
 * a collection "users" becomes "my_app_users" in Convex.
 *
 * @module adapter
 */

import {
  type BaseDatabaseAdapter,
  type Payload,
  type DatabaseAdapterObj,
  type TypeWithID,
  type JsonObject,
  type TypeWithVersion,
  type PaginatedDocs,
  type CreateGlobal,
  type CreateVersion,
  type CreateGlobalVersion,
  type UpdateGlobal,
  type UpdateVersion,
  type UpdateGlobalVersion,
  createDatabaseAdapter,
} from "payload";

import { createAdapterService } from "./service";

/**
 * Configuration options for the Convex adapter.
 * These settings determine how the adapter connects to and interacts with Convex.
 */
export type PayloadConvexConfig = {
  /**
   * The Convex deployment URL.
   * This is the HTTPS URL of your Convex deployment.
   * @example "https://valuable-salamander-162.convex.cloud"
   */
  convexUrl: string;
  /**
   * The Convex deployment identifier.
   * Format: "environment:deployment-name"
   * @example "dev:valuable-salamander-162"
   */
  convexDeployment: string;
  /**
   * The prefix to use for all Convex table names.
   * This enables multiple Payload instances to share a Convex deployment.
   * @example "my_app"
   */
  prefix: string;
};

/**
 * Props type for the convexAdapter factory function.
 * Alias for PayloadConvexConfig for clarity in function signatures.
 */
export type PayloadConvexAdapterProps = PayloadConvexConfig;

/**
 * Type definition for the Convex database adapter.
 * Implements Payload's DatabaseAdapterObj interface with BaseDatabaseAdapter.
 */
export type convexAdapter = DatabaseAdapterObj<BaseDatabaseAdapter>;

/**
 * Creates a Payload database adapter that uses Convex as the backend.
 *
 * This factory function returns a database adapter configuration object that
 * Payload uses to initialize the database connection. The adapter implements
 * all required Payload database operations including CRUD, transactions,
 * versioning, and migrations.
 *
 * @param {PayloadConvexAdapterProps} props - Configuration options for the adapter
 * @returns {convexAdapter} A Payload database adapter object
 *
 * @example
 * ```typescript
 * import { convexAdapter } from 'payload-convex-adapter';
 *
 * const adapter = convexAdapter({
 *   convexUrl: process.env.CONVEX_URL,
 *   convexDeployment: process.env.CONVEX_DEPLOYMENT,
 *   prefix: 'my_app',
 * });
 * ```
 */
export function convexAdapter(props: PayloadConvexAdapterProps) {
  return {
    name: "payload-convex-adapter",
    allowIDOnCreate: false,
    defaultIDType: "text",
    init: (args: { payload: Payload }) => {
      const { payload } = args;

      const service = createAdapterService({
        ...props,
        payload,
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
            service: service,
          });
        },
        commitTransaction: async (id) => {
          return await service.db.bindings.transactions.commitTransaction({
            service: service,
            incomingID: id,
          });
        },
        rollbackTransaction: async (id) => {
          return await service.db.bindings.transactions.rollbackTransaction({
            service: service,
            incomingID: id,
          });
        },

        // Counts
        count: async (countProps) => {
          return await service.db.bindings.counts.count({
            service: service,
            incomingCount: countProps,
          });
        },

        countVersions: async (countVersionsProps) => {
          return await service.db.bindings.counts.countVersions({
            service: service,
            incomingCountVersions: countVersionsProps,
          });
        },

        countGlobalVersions: async (countGlobalVersionsProps) => {
          return await service.db.bindings.counts.countGlobalVersions({
            service: service,
            incomingCountGlobalVersions: countGlobalVersionsProps,
          });
        },

        // Create
        create: async (createProps) => {
          return await service.db.bindings.creates.create({
            service: service,
            incomingCreate: createProps,
          });
        },

        createGlobal: (async (createGlobalProps) => {
          return await service.db.bindings.creates.createGlobal({
            service: service,
            incomingCreateGlobal: createGlobalProps,
          });
        }) as CreateGlobal,

        createVersion: (async (createVersionProps) => {
          return await service.db.bindings.creates.createVersion({
            service: service,
            incomingCreateVersion: createVersionProps,
          });
        }) as CreateVersion,

        createGlobalVersion: (async (createGlobalVersionProps) => {
          return await service.db.bindings.creates.createGlobalVersion({
            service: service,
            incomingCreateGlobalVersion: createGlobalVersionProps,
          });
        }) as CreateGlobalVersion,

        createMigration: async (createMigrationProps) => {
          return await service.db.bindings.creates.createMigration({
            service: service,
            incomingCreateMigration: createMigrationProps,
          });
        },

        // Find
        find: async (findProps) => {
          return (await service.db.bindings.finds.find({
            service: service,
            incomingFind: findProps,
          })) as any;
        },

        findOne: async (findOneProps) => {
          return (await service.db.bindings.finds.findOne({
            service: service,
            incomingFindOne: findOneProps,
          })) as any;
        },

        findDistinct: async (findDistinctProps) => {
          return (await service.db.bindings.finds.findDistinct({
            service: service,
            incomingFindDistinct: findDistinctProps,
          })) as any;
        },

        findGlobal: async (findGlobalProps) => {
          return (await service.db.bindings.finds.findGlobal({
            service: service,
            incomingFindGlobal: findGlobalProps,
          })) as any;
        },

        findVersions: async (findVersionsProps) => {
          return (await service.db.bindings.finds.findVersions({
            service: service,
            incomingFindVersions: findVersionsProps,
          })) as any;
        },

        findGlobalVersions: async (findGlobalVersionsProps) => {
          return (await service.db.bindings.finds.findGlobalVersions({
            service: service,
            incomingFindGlobalVersions: findGlobalVersionsProps,
          })) as any;
        },

        // Delete
        deleteOne: async (deleteOneProps) => {
          return await service.db.bindings.deletes.deleteOne({
            service: service,
            incomingDeleteOne: deleteOneProps,
          });
        },

        deleteMany: async (deleteManyProps) => {
          return await service.db.bindings.deletes.deleteMany({
            service: service,
            incomingDeleteMany: deleteManyProps,
          });
        },

        deleteVersions: async (deleteVersionsProps) => {
          return await service.db.bindings.deletes.deleteVersions({
            service: service,
            incomingDeleteVersions: deleteVersionsProps,
          });
        },

        // Update
        updateOne: async (updateOneProps) => {
          return await service.db.bindings.updates.updateOne({
            service: service,
            incomingUpdateOne: updateOneProps,
          });
        },

        updateMany: async (updateManyProps) => {
          return await service.db.bindings.updates.updateMany({
            service: service,
            incomingUpdateMany: updateManyProps,
          });
        },

        updateGlobal: (async (updateGlobalProps) => {
          return await service.db.bindings.updates.updateGlobal({
            service: service,
            incomingUpdateGlobal: updateGlobalProps,
          });
        }) as UpdateGlobal,

        updateVersion: (async (updateVersionProps) => {
          return await service.db.bindings.updates.updateVersion({
            service: service,
            incomingUpdateVersion: updateVersionProps,
          });
        }) as UpdateVersion,

        updateGlobalVersion: (async (updateGlobalVersionProps) => {
          return await service.db.bindings.updates.updateGlobalVersion({
            service: service,
            incomingUpdateGlobalVersion: updateGlobalVersionProps,
          });
        }) as UpdateGlobalVersion,

        updateJobs: async (updateJobsProps) => {
          return await service.db.bindings.updates.updateJobs({
            service: service,
            incomingUpdateJobs: updateJobsProps,
          });
        },

        // Upsert
        upsert: async (upsertProps) => {
          return await service.db.bindings.upserts.upsert({
            service: service,
            incomingUpsert: upsertProps,
          });
        },

        // Query Drafts
        queryDrafts: async (queryDraftsProps) => {
          return (await service.db.bindings.drafts.queryDrafts({
            service: service,
            incomingQueryDrafts: queryDraftsProps,
          })) as PaginatedDocs;
        },

        // Migration Functions
        migrate: async (migrateProps) => {
          return await service.db.bindings.migrations.migrate({
            service: service,
            incomingMigrate: migrateProps,
          });
        },

        migrateDown: async () => {
          return await service.db.bindings.migrations.migrateDown({
            service: service,
          });
        },

        migrateFresh: async (migrateFreshProps) => {
          return await service.db.bindings.migrations.migrateFresh({
            service: service,
          });
        },

        migrateRefresh: async () => {
          return await service.db.bindings.migrations.migrateRefresh({
            service: service,
          });
        },

        migrateReset: async () => {
          return await service.db.bindings.migrations.migrateReset({
            service: service,
          });
        },

        migrateStatus: async () => {
          return await service.db.bindings.migrations.migrateStatus({
            service: service,
          });
        },
      });
    },
  } satisfies convexAdapter;
}
