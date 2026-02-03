/**
 * @fileoverview Payload Database Bindings
 *
 * This module exports all Payload database operation bindings organized by category.
 * Each binding implements a specific Payload database operation using the Convex
 * adapter's query and mutation system.
 *
 * ## Binding Categories
 *
 * - **transactions**: Transaction lifecycle management (begin, commit, rollback)
 * - **counts**: Document counting operations
 * - **creates**: Document creation operations
 * - **finds**: Document retrieval operations
 * - **deletes**: Document deletion operations
 * - **updates**: Document update operations
 * - **upserts**: Insert-or-update operations
 * - **drafts**: Draft document queries
 * - **migrations**: Database migration operations
 *
 * ## Usage
 * These bindings are used internally by the adapter and should not be called
 * directly. Instead, use the Payload API or the adapter service.
 *
 * @module convex/bindings
 */

import { beginTransaction } from "./transactions/beginTransaction";
import { commitTransaction } from "./transactions/commitTransaction";
import { rollbackTransaction } from "./transactions/rollbackTransaction";

import { count, countVersions, countGlobalVersions } from "./count";
import {
  create,
  createGlobal,
  createVersion,
  createGlobalVersion,
  createMigration,
} from "./create";
import {
  find,
  findOne,
  findDistinct,
  findGlobal,
  findVersions,
  findGlobalVersions,
} from "./find";
import { deleteOne, deleteMany, deleteVersions } from "./delete";
import {
  updateOne,
  updateMany,
  updateGlobal,
  updateVersion,
  updateGlobalVersion,
  updateJobs,
} from "./update";
import { upsert } from "./upsert";
import { queryDrafts } from "./drafts";
import {
  migrate,
  migrateDown,
  migrateFresh,
  migrateRefresh,
  migrateReset,
  migrateStatus,
} from "./migrate";

/**
 * Transaction management bindings.
 * Handles transaction lifecycle: begin, commit, and rollback.
 */
export const transactions = {
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
};

/**
 * Document counting bindings.
 * Provides count operations for collections, versions, and global versions.
 */
export const counts = {
  count,
  countVersions,
  countGlobalVersions,
};

/**
 * Document creation bindings.
 * Handles creating documents, globals, versions, and migrations.
 */
export const creates = {
  create,
  createGlobal,
  createVersion,
  createGlobalVersion,
  createMigration,
};

/**
 * Document retrieval bindings.
 * Provides find operations with pagination, filtering, and version support.
 */
export const finds = {
  find,
  findOne,
  findDistinct,
  findGlobal,
  findVersions,
  findGlobalVersions,
};

/**
 * Document deletion bindings.
 * Handles single, bulk, and version deletions.
 */
export const deletes = {
  deleteOne,
  deleteMany,
  deleteVersions,
};

/**
 * Document update bindings.
 * Provides update operations for documents, globals, versions, and jobs.
 */
export const updates = {
  updateOne,
  updateMany,
  updateGlobal,
  updateVersion,
  updateGlobalVersion,
  updateJobs,
};

/**
 * Upsert bindings.
 * Handles insert-or-update operations.
 */
export const upserts = {
  upsert,
};

/**
 * Draft query bindings.
 * Provides querying for draft documents.
 */
export const drafts = {
  queryDrafts,
};

/**
 * Migration bindings.
 * Handles database schema migrations.
 */
export const migrations = {
  migrate,
  migrateDown,
  migrateFresh,
  migrateRefresh,
  migrateReset,
  migrateStatus,
};
