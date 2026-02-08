/**
 * @fileoverview Begin Transaction Binding
 *
 * This module implements the beginTransaction operation for the Convex adapter.
 * It creates a new transaction session that can be used to group multiple
 * database operations together.
 *
 * ## Transaction Flow
 * 1. `beginTransaction` - Creates a new session (this module)
 * 2. Perform database operations
 * 3. `commitTransaction` - Commits all operations
 * 4. OR `rollbackTransaction` - Discards all operations
 *
 * @module convex/bindings/transactions/beginTransaction
 */

import { BeginTransaction } from "payload";
import type { AdapterService } from "../../adapter/service";

/**
 * Props for the beginTransaction operation.
 */
export type ConvexAdapterBeginTransactionProps = {
  /** The adapter service instance */
  service: AdapterService;
};

/**
 * Return type for the beginTransaction operation.
 * Matches Payload's BeginTransaction return type.
 */
export type ConvexAdapterBeginTransaction = ReturnType<
  Awaited<BeginTransaction>
>;

/**
 * Begins a new database transaction.
 *
 * Creates a new transaction session with a unique ID. The session is tracked
 * by the session tracker and can be used to group database operations together.
 * The transaction must be either committed or rolled back to complete.
 *
 * @param {ConvexAdapterBeginTransactionProps} props - The operation parameters
 * @returns {Promise<string>} The unique transaction session ID
 *
 * @example
 * ```typescript
 * const transactionId = await beginTransaction({ service });
 * // Perform operations...
 * await commitTransaction({ service, incomingID: transactionId });
 * ```
 */
export async function beginTransaction(
  props: ConvexAdapterBeginTransactionProps
) {
  const { service } = props;

  const id = service.tools.createRandomID();
  const session = service.tools.sessionTracker.createSession(id);
  return session.id;
}
