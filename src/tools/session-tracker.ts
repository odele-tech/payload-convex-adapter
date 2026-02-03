/**
 * @fileoverview Session Tracker for Transaction Management
 *
 * This module provides a session tracking system for managing database
 * transactions. Sessions track the lifecycle of transactions from creation
 * through completion (commit or rollback).
 *
 * ## Session States
 * - **idle**: Session created but not started
 * - **in-progress**: Session is active and tracking operations
 * - **resolved**: Session was committed successfully
 * - **rejected**: Session was rolled back
 *
 * ## Usage
 * ```typescript
 * const tracker = createSessionTracker();
 * const session = tracker.createSession('tx-123');
 * tracker.startSession('tx-123');
 * // Track operations...
 * tracker.resolveSession('tx-123'); // or rejectSession
 * tracker.deleteSession('tx-123');
 * ```
 *
 * @module utils/session-tracker
 */

/**
 * Possible states for a transaction session.
 */
export type SessionState = "idle" | "in-progress" | "resolved" | "rejected";

/**
 * Types of query operations that can be tracked.
 */
export type QueryOperationType =
  | "getById"
  | "collectionQuery"
  | "collectionFilterQuery"
  | "collectionFilterOrderQuery"
  | "collectionFilterOrderLimitQuery"
  | "collectionOrderQuery"
  | "collectionLimitQuery"
  | "collectionOrderLimitQuery"
  | "collectionFilterLimitQuery"
  | "collectionFilterPaginateQuery"
  | "collectionOrderPaginateQuery"
  | "collectionFilterOrderPaginateQuery";

/**
 * Types of mutation operations that can be tracked.
 */
export type MutationOperationType =
  | "insert"
  | "getById"
  | "patch"
  | "replace"
  | "delete"
  | "upsert"
  | "updateMany"
  | "deleteMany"
  | "increment"
  | "transactional";

/**
 * Union type of all database operation types.
 */
export type DatabaseOperationType = QueryOperationType | MutationOperationType;

/**
 * Represents a tracked database operation within a session.
 * Stores all information needed for potential rollback.
 */
export type DatabaseOperation = {
  id: string;
  type: DatabaseOperationType;
  timestamp: Date;
  projectPrefix: string;
  collection: string;
  // For mutations that modify data, store the original state for rollback
  originalData?: any;
  // For mutations, store the new data
  newData?: any;
  // For operations with IDs
  documentId?: string;
  // For filter-based operations
  filter?: any;
  // For operations with additional params
  params?: Record<string, any>;
};

/**
 * Represents a transaction session with its state and tracked operations.
 */
export type Session = {
  /** Unique session identifier */
  id: string;
  /** Current state of the session */
  state: SessionState;
  /** When the session was created */
  createdAt: Date;
  /** When the session was started (transitioned to in-progress) */
  startedAt?: Date;
  /** When the session was resolved (committed) */
  resolvedAt?: Date;
  /** When the session was rejected (rolled back) */
  rejectedAt?: Date;
  /** List of tracked database operations */
  operations: DatabaseOperation[];
};

/**
 * Interface for the session tracker.
 * Provides methods for managing transaction sessions and their operations.
 */
export type SessionTracker = {
  /**
   * Create a new transaction session
   * @param id - Unique session identifier
   * @returns The created session
   * @throws Error if session already exists
   */
  createSession: (id: string) => Session;

  /**
   * Get an existing session by ID
   * @param id - Session identifier
   * @returns The session if found, undefined otherwise
   */
  getSession: (id: string) => Session | undefined;

  /**
   * Check if a session exists
   * @param id - Session identifier
   * @returns true if session exists, false otherwise
   */
  hasSession: (id: string) => boolean;

  /**
   * Start a session (transition from idle to in-progress)
   * @param id - Session identifier
   * @returns The started session
   * @throws Error if session doesn't exist or is not in idle state
   */
  startSession: (id: string) => Session;

  /**
   * Resolve (commit) a transaction session
   * @param id - Session identifier
   * @returns The resolved session
   * @throws Error if session doesn't exist or is not in in-progress state
   */
  resolveSession: (id: string) => Session;

  /**
   * Reject (rollback) a transaction session
   * @param id - Session identifier
   * @returns The rejected session
   * @throws Error if session doesn't exist or is not in in-progress state
   */
  rejectSession: (id: string) => Session;

  /**
   * Delete a session from the tracker
   * @param id - Session identifier
   * @returns true if session was deleted, false if it didn't exist
   */
  deleteSession: (id: string) => boolean;

  /**
   * Get all idle sessions
   * @returns Array of idle sessions
   */
  getIdleSessions: () => Session[];

  /**
   * Get all active (in-progress) sessions
   * @returns Array of in-progress sessions
   */
  getInProgressSessions: () => Session[];

  /**
   * Get all sessions
   * @returns Array of all sessions
   */
  getAllSessions: () => Session[];

  /**
   * Clear all sessions
   */
  clearAll: () => void;

  /**
   * Get the number of idle sessions
   * @returns Count of idle sessions
   */
  getIdleCount: () => number;

  /**
   * Get the number of active (in-progress) sessions
   * @returns Count of in-progress sessions
   */
  getInProgressCount: () => number;

  /**
   * Track a database operation for a session
   * @param sessionId - Session identifier
   * @param operation - Database operation to track
   * @returns The tracked operation
   * @throws Error if session doesn't exist or is not in in-progress state
   */
  trackOperation: (
    sessionId: string,
    operation: Omit<DatabaseOperation, "id" | "timestamp">,
  ) => DatabaseOperation;

  /**
   * Get all operations for a session
   * @param sessionId - Session identifier
   * @returns Array of operations for the session
   * @throws Error if session doesn't exist
   */
  getSessionOperations: (sessionId: string) => DatabaseOperation[];

  /**
   * Get operations for a session by type
   * @param sessionId - Session identifier
   * @param type - Operation type to filter by
   * @returns Array of operations matching the type
   * @throws Error if session doesn't exist
   */
  getSessionOperationsByType: (
    sessionId: string,
    type: DatabaseOperationType,
  ) => DatabaseOperation[];

  /**
   * Get operations for a session by collection
   * @param sessionId - Session identifier
   * @param collection - Collection name to filter by
   * @returns Array of operations for the collection
   * @throws Error if session doesn't exist
   */
  getSessionOperationsByCollection: (
    sessionId: string,
    collection: string,
  ) => DatabaseOperation[];

  /**
   * Clear all operations for a session
   * @param sessionId - Session identifier
   * @returns true if operations were cleared, false if session doesn't exist
   */
  clearSessionOperations: (sessionId: string) => boolean;
};

/**
 * Creates a new session tracker instance.
 *
 * The session tracker manages transaction sessions, tracking their lifecycle
 * and associated database operations. It provides methods for creating,
 * starting, resolving, and rejecting sessions, as well as tracking operations.
 *
 * @returns {SessionTracker} A new session tracker instance
 *
 * @example
 * ```typescript
 * const tracker = createSessionTracker();
 *
 * // Create and start a session
 * const session = tracker.createSession('tx-123');
 * tracker.startSession('tx-123');
 *
 * // Track an operation
 * tracker.trackOperation('tx-123', {
 *   type: 'insert',
 *   projectPrefix: 'my_app',
 *   collection: 'users',
 *   newData: { name: 'John' },
 * });
 *
 * // Commit or rollback
 * tracker.resolveSession('tx-123');
 * tracker.deleteSession('tx-123');
 * ```
 */
export function createSessionTracker(): SessionTracker {
  const sessions = new Map<string, Session>();

  const createSession = (id: string): Session => {
    if (sessions.has(id)) {
      throw new Error(`Session ${id} already exists`);
    }

    const session: Session = {
      id,
      state: "idle",
      createdAt: new Date(),
      operations: [],
    };

    sessions.set(id, session);
    return session;
  };

  const getSession = (id: string): Session | undefined => {
    return sessions.get(id);
  };

  const hasSession = (id: string): boolean => {
    return sessions.has(id);
  };

  const startSession = (id: string): Session => {
    const session = sessions.get(id);

    if (!session) {
      throw new Error(`Session ${id} not found`);
    }

    if (session.state !== "idle") {
      throw new Error(
        `Cannot start session ${id}: session is already ${session.state}`,
      );
    }

    session.state = "in-progress";
    session.startedAt = new Date();

    return session;
  };

  const resolveSession = (id: string): Session => {
    const session = sessions.get(id);

    if (!session) {
      throw new Error(`Session ${id} not found`);
    }

    if (session.state !== "in-progress") {
      throw new Error(
        `Cannot resolve session ${id}: session is ${session.state}, expected in-progress`,
      );
    }

    session.state = "resolved";
    session.resolvedAt = new Date();

    return session;
  };

  const rejectSession = (id: string): Session => {
    const session = sessions.get(id);

    if (!session) {
      throw new Error(`Session ${id} not found`);
    }

    if (session.state !== "in-progress") {
      throw new Error(
        `Cannot reject session ${id}: session is ${session.state}, expected in-progress`,
      );
    }

    session.state = "rejected";
    session.rejectedAt = new Date();

    return session;
  };

  const deleteSession = (id: string): boolean => {
    return sessions.delete(id);
  };

  const getIdleSessions = (): Session[] => {
    return Array.from(sessions.values()).filter(
      (session) => session.state === "idle",
    );
  };

  const getInProgressSessions = (): Session[] => {
    return Array.from(sessions.values()).filter(
      (session) => session.state === "in-progress",
    );
  };

  const getAllSessions = (): Session[] => {
    return Array.from(sessions.values());
  };

  const clearAll = (): void => {
    sessions.clear();
  };

  const getIdleCount = (): number => {
    return getIdleSessions().length;
  };

  const getInProgressCount = (): number => {
    return getInProgressSessions().length;
  };

  const trackOperation = (
    sessionId: string,
    operation: Omit<DatabaseOperation, "id" | "timestamp">,
  ): DatabaseOperation => {
    const session = sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.state !== "in-progress") {
      throw new Error(
        `Cannot track operation for session ${sessionId}: session is ${session.state}, expected in-progress`,
      );
    }

    const trackedOperation: DatabaseOperation = {
      ...operation,
      id: `${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    session.operations.push(trackedOperation);
    return trackedOperation;
  };

  const getSessionOperations = (sessionId: string): DatabaseOperation[] => {
    const session = sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return [...session.operations];
  };

  const getSessionOperationsByType = (
    sessionId: string,
    type: DatabaseOperationType,
  ): DatabaseOperation[] => {
    const operations = getSessionOperations(sessionId);
    return operations.filter((op) => op.type === type);
  };

  const getSessionOperationsByCollection = (
    sessionId: string,
    collection: string,
  ): DatabaseOperation[] => {
    const operations = getSessionOperations(sessionId);
    return operations.filter((op) => op.collection === collection);
  };

  const clearSessionOperations = (sessionId: string): boolean => {
    const session = sessions.get(sessionId);

    if (!session) {
      return false;
    }

    session.operations = [];
    return true;
  };

  return {
    createSession,
    getSession,
    hasSession,
    startSession,
    resolveSession,
    rejectSession,
    deleteSession,
    getIdleSessions,
    getInProgressSessions,
    getAllSessions,
    clearAll,
    getIdleCount,
    getInProgressCount,
    trackOperation,
    getSessionOperations,
    getSessionOperationsByType,
    getSessionOperationsByCollection,
    clearSessionOperations,
  };
}
