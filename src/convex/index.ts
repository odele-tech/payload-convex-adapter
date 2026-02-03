/**
 * @fileoverview Convex Module Exports
 *./mutation-adapter/mutations
 * This module serves as the central export point for all Convex-related
 * functionality in the adapter. It re-exports:
 *
 * - **bindings**: Payload database operation implementations
 * - **query-adapter/queries**: Query operation factories and adapters
 * - **mutation-adapter/queries**: Mutation operation factories and adapters
 * - **helpers/client**: Convex client factory
 * - **where**: Where filter parsing and building utilities
 *
 * @module convex
 */

export * from "./queries";
export * from "./mutations";
export * from "./client";
