/**
 * @fileoverview Rollback Transaction Binding
 *
 * This module implements the rollbackTransaction operation for the Convex adapter.
 * It cancels a transaction session, discarding all tracked operations.
 *
 * ## Rollback Behavior
 * - Rejects the session if it's in "in-progress" state
 * - Cleans up orphaned sessions (not in "in-progress" state)
 * - Removes the session from the tracker after rollback
 *
 * @module convex/bindings/transactions/rollbackTransaction
 */

import type { RollbackTransaction } from "payload";
import type { AdapterService } from "../../adapter/service";

/**
 * Props for the rollbackTransaction operation.
 */
export type ConvexAdapterRollbackTransactionProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The transaction ID to rollback (may be a Promise) */
  incomingID: Parameters<RollbackTransaction>[0];
};

/**
 * Return type for the rollbackTransaction operation.
 */
export type ConvexAdapterRollbackTransaction = ReturnType<
  Awaited<RollbackTransaction>
>;

/**
 * Rolls back a database transaction.
 *
 * Cancels the transaction session, discarding all tracked operations.
 * The session is removed from the tracker after rollback.
 *
 * If the session doesn't exist or is not in "in-progress" state, the function
 * performs cleanup and returns without error.
 *
 * @param {ConvexAdapterRollbackTransactionProps} props - The operation parameters
 * @returns {Promise<void>} Resolves when the transaction is rolled back
 *
 * @example
 * ```typescript
 * const transactionId = await beginTransaction({ service });
 * try {
 *   // Perform operations...
 *   await commitTransaction({ service, incomingID: transactionId });
 * } catch (error) {
 *   await rollbackTransaction({ service, incomingID: transactionId });
 * }
 * ```
 */
export async function rollbackTransaction(
  props: ConvexAdapterRollbackTransactionProps
) {
  const { service, incomingID } = props;

  const transactionID =
    incomingID instanceof Promise ? await incomingID : incomingID;
  const transactionIdStr = transactionID.toString();

  // Look up session
  if (!service.tools.sessionTracker.hasSession(transactionIdStr)) {
    return;
  }

  const session = service.tools.sessionTracker.getSession(transactionIdStr);

  // If the session is not 'in-progress', treat as orphaned (& clean up)
  if (session?.state !== "in-progress") {
    service.tools.sessionTracker.deleteSession(transactionIdStr);
    return;
  }

  try {
    service.tools.sessionTracker.rejectSession(transactionIdStr);
  } catch (_) {
    // best effort session cleanup: we're rolled back regardless
  }

  // Remove session to prevent race condition (adapter style)
  service.tools.sessionTracker.deleteSession(transactionIdStr);
}
