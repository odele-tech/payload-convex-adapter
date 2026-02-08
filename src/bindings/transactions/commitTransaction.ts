/**
 * @fileoverview Commit Transaction Binding
 *
 * This module implements the commitTransaction operation for the Convex adapter.
 * It finalizes a transaction session, marking all operations as committed.
 *
 * ## Commit Behavior
 * - Resolves the session if it's in "in-progress" state
 * - Cleans up orphaned sessions (not in "in-progress" state)
 * - Removes the session from the tracker after commit
 *
 * @module convex/bindings/transactions/commitTransaction
 */

import type { CommitTransaction } from "payload";
import type { AdapterService } from "../../adapter/service";

/**
 * Props for the commitTransaction operation.
 */
export type ConvexAdapterCommitTransactionProps = {
  /** The adapter service instance */
  service: AdapterService;
  /** The transaction ID to commit (may be a Promise) */
  incomingID: Parameters<CommitTransaction>[0];
};

/**
 * Return type for the commitTransaction operation.
 */
export type ConvexAdapterCommitTransaction = ReturnType<
  Awaited<CommitTransaction>
>;

/**
 * Commits a database transaction.
 *
 * Finalizes the transaction session, marking all tracked operations as
 * committed. The session is removed from the tracker after successful commit.
 *
 * If the session doesn't exist or is not in "in-progress" state, the function
 * performs cleanup and returns without error.
 *
 * @param {ConvexAdapterCommitTransactionProps} props - The operation parameters
 * @returns {Promise<void>} Resolves when the transaction is committed
 *
 * @example
 * ```typescript
 * const transactionId = await beginTransaction({ service });
 * // Perform operations...
 * await commitTransaction({ service, incomingID: transactionId });
 * ```
 */
export async function commitTransaction(
  props: ConvexAdapterCommitTransactionProps
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

  // In a real DB, you'd commit the transaction here.
  // In our convex adapter, resolving the session is "committing".
  try {
    service.tools.sessionTracker.resolveSession(transactionIdStr);
  } catch (_) {
    // best effort session cleanup: we're committed regardless
  }

  // Remove session to prevent race condition (adapter style)
  service.tools.sessionTracker.deleteSession(transactionIdStr);
}
