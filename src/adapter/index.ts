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
  type PaginatedDocs,
  type CreateGlobal,
  type CreateVersion,
  type CreateGlobalVersion,
  type UpdateGlobal,
  type UpdateVersion,
  type UpdateGlobalVersion,
  createDatabaseAdapter,

  // Transaction types
  type BeginTransaction,
  type CommitTransaction,
  type RollbackTransaction,

  // Count types
  type Count,
  type CountArgs,
  type CountVersions,
  type CountGlobalVersions,
  type CountGlobalVersionArgs,

  // Create types
  type Create,
  type CreateArgs,
  type CreateMigration,
  type CreateGlobalArgs,
  type CreateVersionArgs,
  type CreateGlobalVersionArgs,

  // Find types
  type Find,
  type FindArgs,
  type FindOne,
  type FindOneArgs,
  type FindDistinct,
  type FindGlobal,
  type FindGlobalArgs,
  type FindVersions,
  type FindVersionsArgs,
  type FindGlobalVersions,
  type FindGlobalVersionsArgs,

  // Delete types
  type DeleteOne,
  type DeleteOneArgs,
  type DeleteMany,
  type DeleteManyArgs,
  type DeleteVersions,
  type DeleteVersionsArgs,

  // Update types
  type UpdateOne,
  type UpdateOneArgs,
  type UpdateMany,
  type UpdateManyArgs,
  type UpdateJobs,
  type UpdateJobsArgs,
  type UpdateGlobalArgs,
  type UpdateVersionArgs,
  type UpdateGlobalVersionArgs,

  // Upsert types
  type Upsert,
  type UpsertArgs,

  // Draft types
  type QueryDrafts,
  type QueryDraftsArgs,

  // Migration types
  type Migration

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
        beginTransaction: (async (props: Parameters<BeginTransaction>[0]) => {
          return await service.db.bindings.transactions.beginTransaction({
            service: service,
          });
        }) as BeginTransaction,
        commitTransaction: (async (id: Parameters<CommitTransaction>[0]) => {
          return await service.db.bindings.transactions.commitTransaction({
            service: service,
            incomingID: id,
          });
        }) as CommitTransaction,
        rollbackTransaction: (async (id: Parameters<RollbackTransaction>[0]) => {
          return await service.db.bindings.transactions.rollbackTransaction({
            service: service,
            incomingID: id,
          });
        }) as RollbackTransaction,

        // Counts
        count: (async (countProps: CountArgs) => {
          return await service.db.bindings.counts.count({
            service: service,
            incomingCount: countProps,
          });
        }) as Count,

        countVersions: (async (countVersionsProps: CountArgs) => {
          return await service.db.bindings.counts.countVersions({
            service: service,
            incomingCountVersions: countVersionsProps,
          });
        }) as CountVersions,

        countGlobalVersions: (async (countGlobalVersionsProps: CountGlobalVersionArgs) => {
          return await service.db.bindings.counts.countGlobalVersions({
            service: service,
            incomingCountGlobalVersions: countGlobalVersionsProps,
          });
        }) as CountGlobalVersions,

        // Create
        create: (async (createProps: CreateArgs) => {
          return await service.db.bindings.creates.create({
            service: service,
            incomingCreate: createProps,
          });
        }) as Create,

        createGlobal: (async (createGlobalProps: CreateGlobalArgs) => {
          return await service.db.bindings.creates.createGlobal({
            service: service,
            incomingCreateGlobal: createGlobalProps,
          });
        }) as CreateGlobal,

        createVersion: (async (createVersionProps: CreateVersionArgs) => {
          return await service.db.bindings.creates.createVersion({
            service: service,
            incomingCreateVersion: createVersionProps,
          });
        }) as CreateVersion,

        createGlobalVersion: (async (createGlobalVersionProps: CreateGlobalVersionArgs) => {
          return await service.db.bindings.creates.createGlobalVersion({
            service: service,
            incomingCreateGlobalVersion: createGlobalVersionProps,
          });
        }) as CreateGlobalVersion,

        createMigration: (async (createMigrationProps: Parameters<CreateMigration>[0]) => {
          return await service.db.bindings.creates.createMigration({
            service: service,
            incomingCreateMigration: createMigrationProps,
          });
        }) as CreateMigration,

        // Find
        find: (async (findProps: FindArgs) => {
          return (await service.db.bindings.finds.find({
            service: service,
            incomingFind: findProps,
          })) as any;
        }) as Find,

        findOne: (async (findOneProps: FindOneArgs) => {
          return (await service.db.bindings.finds.findOne({
            service: service,
            incomingFindOne: findOneProps,
          })) as any;
        }) as FindOne,

        findDistinct: (async (findDistinctProps: Parameters<FindDistinct>[0]) => {
          return (await service.db.bindings.finds.findDistinct({
            service: service,
            incomingFindDistinct: findDistinctProps,
          })) as any;
        }) as FindDistinct,

        findGlobal: (async (findGlobalProps: FindGlobalArgs) => {
          return (await service.db.bindings.finds.findGlobal({
            service: service,
            incomingFindGlobal: findGlobalProps,
          })) as any;
        }) as FindGlobal,

        findVersions: (async (findVersionsProps: FindVersionsArgs) => {
          return (await service.db.bindings.finds.findVersions({
            service: service,
            incomingFindVersions: findVersionsProps,
          })) as any;
        }) as FindVersions,

        findGlobalVersions: (async (findGlobalVersionsProps: FindGlobalVersionsArgs) => {
          return (await service.db.bindings.finds.findGlobalVersions({
            service: service,
            incomingFindGlobalVersions: findGlobalVersionsProps,
          })) as any;
        }) as FindGlobalVersions,

        // Delete
        deleteOne: (async (deleteOneProps: DeleteOneArgs) => {
          return await service.db.bindings.deletes.deleteOne({
            service: service,
            incomingDeleteOne: deleteOneProps,
          });
        }) as DeleteOne,

        deleteMany: (async (deleteManyProps: DeleteManyArgs) => {
          return await service.db.bindings.deletes.deleteMany({
            service: service,
            incomingDeleteMany: deleteManyProps,
          });
        }) as DeleteMany,

        deleteVersions: (async (deleteVersionsProps: DeleteVersionsArgs) => {
          const result = await service.db.bindings.deletes.deleteVersions({
            service: service,
            incomingDeleteVersions: deleteVersionsProps,
          });

          // Clear the recent version ID after cleanup is complete
          service.system.clearRecentVersionId();

          return result;
        }) as DeleteVersions,

        // Update
        updateOne: (async (updateOneProps: UpdateOneArgs) => {
          return await service.db.bindings.updates.updateOne({
            service: service,
            incomingUpdateOne: updateOneProps,
          });
        }) as UpdateOne,

        updateMany: (async (updateManyProps: UpdateManyArgs) => {
          return await service.db.bindings.updates.updateMany({
            service: service,
            incomingUpdateMany: updateManyProps,
          });
        }) as UpdateMany,

        updateGlobal: (async (updateGlobalProps: UpdateGlobalArgs) => {
          return await service.db.bindings.updates.updateGlobal({
            service: service,
            incomingUpdateGlobal: updateGlobalProps,
          });
        }) as UpdateGlobal,

        updateVersion: (async (updateVersionProps: UpdateVersionArgs) => {
          return await service.db.bindings.updates.updateVersion({
            service: service,
            incomingUpdateVersion: updateVersionProps,
          });
        }) as UpdateVersion,

        updateGlobalVersion: (async (updateGlobalVersionProps: UpdateGlobalVersionArgs) => {
          return await service.db.bindings.updates.updateGlobalVersion({
            service: service,
            incomingUpdateGlobalVersion: updateGlobalVersionProps,
          });
        }) as UpdateGlobalVersion,

        updateJobs: (async (updateJobsProps: UpdateJobsArgs) => {
          return await service.db.bindings.updates.updateJobs({
            service: service,
            incomingUpdateJobs: updateJobsProps,
          });
        }) as UpdateJobs,

        // Upsert
        upsert: (async (upsertProps: UpsertArgs) => {
          return await service.db.bindings.upserts.upsert({
            service: service,
            incomingUpsert: upsertProps,
          });
        }) as Upsert,

        // Query Drafts
        queryDrafts: (async (queryDraftsProps: QueryDraftsArgs) => {
          return (await service.db.bindings.drafts.queryDrafts({
            service: service,
            incomingQueryDrafts: queryDraftsProps,
          })) as PaginatedDocs;
        }) as QueryDrafts,

        // Migration Functions
        migrate: async (migrateProps?: { migrations?: Migration[] }) => {
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

        migrateFresh: async () => {
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
