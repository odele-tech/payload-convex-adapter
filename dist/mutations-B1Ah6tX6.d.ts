import * as convex_values from 'convex/values';
import * as convex_server from 'convex/server';
import { GenericQueryCtx, GenericDataModel, GenericMutationCtx, PaginationOptions, IndexRangeBuilder, GenericDocument, GenericIndexFields, IndexRange, RegisteredQuery, RegisteredMutation } from 'convex/server';
import * as payload from 'payload';
import { Operator, Where, JoinQuery, SelectType, CommitTransaction, RollbackTransaction, Count, CountVersions, CountGlobalVersions, Create, CreateGlobal, CreateVersion, CreateGlobalVersion, CreateMigration, Find, FindOne, FindDistinct, FindGlobal, FindVersions, FindGlobalVersions, DeleteOne, DeleteMany, DeleteVersions, UpdateOne, UpdateMany, UpdateGlobal, UpdateVersion, UpdateGlobalVersion, UpdateJobs, Upsert, QueryDrafts, Migration, Payload } from 'payload';
import * as convex_browser from 'convex/browser';

/**
 * @fileoverview Collection Name Parsing
 *
 * This module provides utilities for parsing and prefixing collection names.
 * Collection prefixing enables multiple Payload instances to share a single
 * Convex deployment without naming conflicts.
 *
 * @module utils/parse-collection
 */
/**
 * Props for the parseCollection function.
 */
type ParseCollectionProps = {
    /** The prefix to prepend to the collection name */
    prefix: string;
    /** The base collection name */
    collection: string;
};
/**
 * Parses a collection name by prepending the configured prefix.
 *
 * This function creates a namespaced collection name by combining
 * the prefix and collection name with an underscore separator.
 * Hyphens are converted to underscores to comply with Convex identifier rules.
 *
 * **Idempotent**: If the collection is already prefixed, it returns the collection as-is.
 *
 * @param {ParseCollectionProps} props - The parsing parameters
 * @returns {string} The prefixed collection name with Convex-safe characters
 *
 * @example
 * ```typescript
 * const collectionId = parseCollection({
 *   prefix: 'my_app',
 *   collection: 'users',
 * });
 * // Returns: "my_app_users"
 *
 * const collectionId2 = parseCollection({
 *   prefix: 'my_app',
 *   collection: 'payload-preferences',
 * });
 * // Returns: "my_app_payload_preferences"
 *
 * // Idempotent - already prefixed collections are returned as-is
 * const collectionId3 = parseCollection({
 *   prefix: 'my_app',
 *   collection: 'my_app_users',
 * });
 * // Returns: "my_app_users" (not "my_app_my_app_users")
 * ```
 */
declare function parseCollection(props: ParseCollectionProps): string;

/**
 * Represents a single field comparison in a where filter.
 */
type WhereComparison = {
    /** The field name to compare */
    field: string;
    /** The comparison operator */
    operator: Operator;
    /** The value to compare against */
    value: unknown;
};
/**
 * Represents a node in the where filter tree.
 * Can be a logical operator (and/or/not) or a field comparison.
 */
type WhereNode = {
    type: "and";
    nodes: WhereNode[];
} | {
    type: "or";
    nodes: WhereNode[];
} | {
    type: "not";
    node: WhereNode;
} | {
    type: "comparison";
    comparison: WhereComparison;
};
/**
 * The parsed where filter type.
 * Null indicates no filter (match all documents).
 */
type ParsedWhereFilter = WhereNode | null;
/**
 * Filter execution strategy.
 * - "db": All filters can run in Convex DB (fast, indexed)
 * - "post": All filters need post-processing (slow, in-memory)
 * - "hybrid": Mix of DB and post-processing
 */
type FilterStrategy = "db" | "post" | "hybrid";
/**
 * Enhanced parsed where filter with hybrid filtering support.
 * Splits filters into DB-compatible and post-processing phases.
 */
type EnhancedParsedWhereFilter = {
    /** The execution strategy for this filter */
    strategy: FilterStrategy;
    /** Filters that can run in Convex DB (null if none) */
    dbFilter: ParsedWhereFilter;
    /** Filters that need post-processing (null if none) */
    postFilter: ParsedWhereFilter;
};
/**
 * WherePlan type alias for clarity in bindings.
 * Represents the parsed and optimized where filter ready for Convex operations.
 */
type WherePlan = EnhancedParsedWhereFilter;
/**
 * Props for createWherePlan function.
 */
type CreateWherePlanProps = {
    /** The Payload where clause (optional - undefined/null returns empty plan) */
    where?: Where | null;
};
/**
 * Creates a WherePlan from a Payload Where clause.
 *
 * This is the primary entry point for converting Payload's Where syntax
 * into a WherePlan that can be passed to adapter functions.
 *
 * The WherePlan automatically handles:
 * - Splitting filters into DB-compatible and post-processing phases
 * - Date conversion (ISO strings to timestamps)
 * - Nested field path detection for hybrid filtering
 *
 * @param {CreateWherePlanProps} props - The function parameters
 * @returns {WherePlan} The parsed where plan ready for Convex operations
 *
 * @example
 * ```typescript
 * // In a binding function
 * const wherePlan = createWherePlan({ where: incomingParams.where });
 *
 * const docs = await service.db.query({}).collectionWhereQuery.adapter({
 *   service,
 *   collection: 'posts',
 *   wherePlan,
 *   index: undefined,
 * });
 * ```
 *
 * @example Empty where clause
 * ```typescript
 * const wherePlan = createWherePlan({ where: undefined });
 * // Returns: { strategy: "db", dbFilter: null, postFilter: null }
 * ```
 */
declare function createWherePlan(props: CreateWherePlanProps): WherePlan;
/**
 * Creates an empty WherePlan (matches all documents).
 * Use this when you need a valid WherePlan but have no filter conditions.
 *
 * @returns {WherePlan} An empty where plan that matches all documents
 *
 * @example
 * ```typescript
 * const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
 *   service,
 *   collection: globalCollection,
 *   wherePlan: emptyWherePlan(),
 *   limit: 1,
 * });
 * ```
 */
declare function emptyWherePlan(): WherePlan;
/**
 * Applies an enhanced where plan to a Convex query.
 */
declare function applyWherePlan<T extends any>(baseQuery: T, wherePlan: EnhancedParsedWhereFilter | null | undefined): T;
/**
 * Chainable query builder for Convex operations.
 * Enables fluent API: processor.query().filter().postFilter().toPayload()
 */
type ConvexQueryChain = {
    /**
     * Apply DB-level filter from wherePlan.
     * Called automatically by query() if wherePlan has dbFilter.
     */
    filter(): ConvexQueryChain;
    /**
     * Mark for post-filter processing after collect.
     */
    postFilter(): ConvexQueryChain;
    /**
     * Apply ordering to the query.
     */
    order(direction: "asc" | "desc"): ConvexQueryChain;
    /**
     * Limit results to n documents.
     */
    take(n: number): ConvexQueryChain;
    /**
     * Switch to paginated mode.
     */
    paginate(opts: PaginationOptions): ConvexPaginatedChain;
    /**
     * Execute query and return raw Convex documents.
     */
    collect<T = any>(): Promise<T[]>;
    /**
     * Execute query and return Payload-formatted documents.
     */
    toPayload<T = any>(): Promise<T[]>;
    /**
     * Execute query and return the first matching document.
     */
    first<T = any>(): Promise<T | null>;
};
/**
 * Chainable paginated query builder.
 */
type ConvexPaginatedChain = {
    /**
     * Mark for post-filter processing.
     */
    postFilter(): ConvexPaginatedChain;
    /**
     * Execute and return raw Convex paginated result.
     */
    collect<T = any>(): Promise<{
        page: T[];
        continueCursor: string;
        isDone: boolean;
    }>;
    /**
     * Execute and return Payload-formatted paginated result.
     */
    toPayload<T = any>(): Promise<{
        page: T[];
        continueCursor: string;
        isDone: boolean;
    }>;
};
/**
 * Processed output for Convex operations.
 * Contains all the data needed to execute a Convex query/mutation.
 */
type ProcessedConvexQueryProps = {
    /** Prefixed collection ID */
    collection: string;
    /** Parsed where filter with hybrid filtering support */
    wherePlan: EnhancedParsedWhereFilter;
    /** Compiled data safe for Convex (with payvex_ prefix, dates as timestamps) */
    data?: Record<string, unknown>;
    /** Limit for query results */
    limit?: number;
    /** Sort order */
    order?: "asc" | "desc";
    /** Pagination options */
    paginationOpts?: {
        numItems: number;
        cursor: string | null;
    };
    /** Optional index configuration */
    index?: AdapaterQueryIndex;
};
/**
 * Adapter-side QueryProcessor result.
 * Provides convexQueryProps to pass to Convex and methods to process results.
 */
type AdapterQueryProcessor = {
    /** Processed query props ready to pass to Convex */
    convexQueryProps: ProcessedConvexQueryProps;
    /** Process results from Convex back to Payload format */
    processResult<T>(result: T): T;
    /** Process Convex query results (alias for processResult) */
    processConvexQueryResult<T>(result: T): T;
    /** Process paginated results from Convex */
    processPaginatedResult<T>(result: {
        page: T[];
        continueCursor: string;
        isDone: boolean;
    }): {
        page: T[];
        continueCursor: string;
        isDone: boolean;
    };
    /** Compile data to Convex format (for direct use) */
    compileToConvex<T>(data: T): T;
    /** Compile data to Payload format (for direct use) */
    compileToPayload<T>(data: T): T;
};
/**
 * Convex-side QueryProcessor result.
 * Provides chainable query building API.
 */
type ConvexQueryProcessor = {
    /**
     * Start building a query chain.
     * Automatically applies collection and index configuration.
     */
    query(): ConvexQueryChain;
    /**
     * Direct access to apply post-filter on existing results.
     * Useful when you need manual control.
     */
    applyPostFilter<T>(results: T[], wherePlan?: EnhancedParsedWhereFilter): T[];
    /**
     * Transform Convex document(s) to Payload format.
     */
    toPayload<T>(data: T): T;
    /** @deprecated Use query() chain instead */
    processWherePlan(context: {
        ctx: GenericQueryCtx<GenericDataModel> | GenericMutationCtx<GenericDataModel>;
        service: AdapterService;
        wherePlan: EnhancedParsedWhereFilter;
        collection: string;
        index?: AdapaterQueryIndex;
    }): ReturnType<typeof applyWherePlan<ReturnType<typeof normalizeConvexQuery>>>;
};
/**
 * Input props for adapter-side QueryProcessor.
 */
type AdapterQueryProcessorProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** Collection name (will be prefixed) */
    collection: string;
    /** Payload where clause (will be parsed) */
    where?: Where;
    /** Pre-parsed where filter (alternative to where) */
    wherePlan?: EnhancedParsedWhereFilter;
    /** Payload data (will be compiled to Convex format) */
    data?: Record<string, unknown>;
    /** Query limit */
    limit?: number;
    /** Sort string (e.g., "-createdAt" for desc, "createdAt" for asc) */
    sort?: string | string[];
    /** Sort order (alternative to sort string) */
    order?: "asc" | "desc";
    /** Pagination enabled flag */
    pagination?: boolean;
    /** Page number (for pagination) */
    page?: number;
    /** Optional index configuration */
    index?: AdapaterQueryIndex;
    /** Join query configuration for related documents */
    joins?: JoinQuery;
    /** Locale for localized content filtering */
    locale?: string;
    /** Field selection/projection */
    select?: SelectType;
    /** Enable draft document filtering */
    draftsEnabled?: boolean;
    /** Enable version document filtering */
    versions?: boolean;
    /** Field projection (alternative to select) */
    projection?: Record<string, unknown>;
    /** Convex mode flag - must be false for adapter-side */
    convex: false;
};
/**
 * Input props for Convex-side QueryProcessor.
 * Now includes all context needed for query building.
 */
type ConvexQueryProcessorProps = {
    /** Convex query/mutation context */
    ctx: GenericQueryCtx<GenericDataModel> | GenericMutationCtx<GenericDataModel>;
    /** The adapter service instance */
    service: AdapterService;
    /** Collection name (already prefixed by adapter) */
    collection: string;
    /** Parsed where filter from adapter */
    wherePlan?: EnhancedParsedWhereFilter;
    /** Optional index configuration */
    index?: AdapaterQueryIndex;
    /** Convex mode flag - must be true */
    convex: true;
};
/**
 * Creates a QueryProcessor for bidirectional Payload-Convex transformation.
 *
 * The QueryProcessor integrates compileToConvex, compileToPayload, and
 * parsePayloadWhere into a unified API. It operates in two modes:
 *
 * - **Adapter-side (convex: false)**: Prepares data and queries for Convex
 * - **Convex-side (convex: true)**: Processes queries and filters inside Convex
 *
 * @param {AdapterQueryProcessorProps | ConvexQueryProcessorProps} props - The processor configuration
 * @returns {AdapterQueryProcessor | ConvexQueryProcessor} The processor instance
 *
 * @example Adapter-side usage:
 * ```typescript
 * const processedQuery = service.tools.queryProcessor({
 *   service,
 *   collection: 'posts',
 *   where: payloadWhere,
 *   data: documentData,
 *   limit: 10,
 *   convex: false,
 * });
 *
 * const result = await client.query(api.adapter.collectionWhereQuery,
 *   processedQuery.convexQueryProps
 * );
 *
 * return processedQuery.processResult(result);
 * ```
 *
 * @example Convex-side usage:
 * ```typescript
 * const processor = service.tools.queryProcessor({ convex: true });
 *
 * const filtered = processor.processWherePlan({
 *   ctx,
 *   service,
 *   wherePlan: args.wherePlan,
 *   collection: args.collection,
 *   index: args.index,
 * });
 *
 * let results = await filtered.collect();
 * results = processor.applyPostFilter(results, args.wherePlan);
 * ```
 */
declare function queryProcessor(props: AdapterQueryProcessorProps): AdapterQueryProcessor;
declare function queryProcessor(props: ConvexQueryProcessorProps): ConvexQueryProcessor;

/**
 * @fileoverview Random ID Generation
 *
 * This module provides UUID generation for creating unique identifiers
 * throughout the adapter. Uses UUID v4 for cryptographically secure
 * random ID generation.
 *
 * @module utils/random
 */
/**
 * Creates a random UUID v4 identifier.
 *
 * Used for generating unique IDs for transactions, sessions, and
 * other entities that require unique identification.
 *
 * @returns {string} A UUID v4 string
 *
 * @example
 * ```typescript
 * const id = createRandomID();
 * // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
declare function createRandomID(): string;

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
type SessionState = "idle" | "in-progress" | "resolved" | "rejected";
/**
 * Types of query operations that can be tracked.
 */
type QueryOperationType = "getById" | "collectionQuery" | "collectionFilterQuery" | "collectionFilterOrderQuery" | "collectionFilterOrderLimitQuery" | "collectionOrderQuery" | "collectionLimitQuery" | "collectionOrderLimitQuery" | "collectionFilterLimitQuery" | "collectionFilterPaginateQuery" | "collectionOrderPaginateQuery" | "collectionFilterOrderPaginateQuery";
/**
 * Types of mutation operations that can be tracked.
 */
type MutationOperationType = "insert" | "getById" | "patch" | "replace" | "delete" | "upsert" | "updateMany" | "deleteMany" | "increment" | "transactional";
/**
 * Union type of all database operation types.
 */
type DatabaseOperationType = QueryOperationType | MutationOperationType;
/**
 * Represents a tracked database operation within a session.
 * Stores all information needed for potential rollback.
 */
type DatabaseOperation = {
    id: string;
    type: DatabaseOperationType;
    timestamp: Date;
    projectPrefix: string;
    collection: string;
    originalData?: any;
    newData?: any;
    documentId?: string;
    filter?: any;
    params?: Record<string, any>;
};
/**
 * Represents a transaction session with its state and tracked operations.
 */
type Session = {
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
type SessionTracker = {
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
    trackOperation: (sessionId: string, operation: Omit<DatabaseOperation, "id" | "timestamp">) => DatabaseOperation;
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
    getSessionOperationsByType: (sessionId: string, type: DatabaseOperationType) => DatabaseOperation[];
    /**
     * Get operations for a session by collection
     * @param sessionId - Session identifier
     * @param collection - Collection name to filter by
     * @returns Array of operations for the collection
     * @throws Error if session doesn't exist
     */
    getSessionOperationsByCollection: (sessionId: string, collection: string) => DatabaseOperation[];
    /**
     * Clear all operations for a session
     * @param sessionId - Session identifier
     * @returns true if operations were cleared, false if session doesn't exist
     */
    clearSessionOperations: (sessionId: string) => boolean;
};

/**
 * Return type for the service logger function.
 * Creates a logger with the adapter name and prefix prepended to messages.
 */
type ServiceLogger = (message: string) => Logger;
/**
 * Logger interface providing various console output methods.
 *
 * Each method outputs the message using the corresponding console function.
 */
type Logger = {
    /**
     * Logs the message using console.log
     * @returns {void}
     */
    log: () => void;
    /**
     * Logs the message as an error using console.error
     * @returns {void}
     */
    error: () => void;
    /**
     * Logs the message as a warning using console.warn
     * @returns {void}
     */
    warn: () => void;
    /**
     * Logs the message as info using console.info
     * @returns {void}
     */
    info: () => void;
    /**
     * Logs the message as debug using console.debug
     * @returns {void}
     */
    debug: () => void;
    /**
     * Logs the message with stack trace using console.trace
     * @returns {void}
     */
    trace: () => void;
    /**
     * Logs the message using console.dir for object inspection
     * @returns {void}
     */
    dir: () => void;
    /**
     * Logs the message as a table using console.table
     * @returns {void}
     */
    table: () => void;
    /**
     * Starts a new console group with the message as label
     * @returns {void}
     */
    group: () => void;
    /**
     * Ends the current console group
     * @returns {void}
     */
    groupEnd: () => void;
};

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

/**
 * Props for the beginTransaction operation.
 */
type ConvexAdapterBeginTransactionProps = {
    /** The adapter service instance */
    service: AdapterService;
};
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
declare function beginTransaction(props: ConvexAdapterBeginTransactionProps): Promise<string>;

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

/**
 * Props for the commitTransaction operation.
 */
type ConvexAdapterCommitTransactionProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The transaction ID to commit (may be a Promise) */
    incomingID: Parameters<CommitTransaction>[0];
};
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
declare function commitTransaction(props: ConvexAdapterCommitTransactionProps): Promise<void>;

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

/**
 * Props for the rollbackTransaction operation.
 */
type ConvexAdapterRollbackTransactionProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The transaction ID to rollback (may be a Promise) */
    incomingID: Parameters<RollbackTransaction>[0];
};
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
declare function rollbackTransaction(props: ConvexAdapterRollbackTransactionProps): Promise<void>;

/**
 * @fileoverview Count Operation Bindings
 *
 * This module implements Payload's count operations for the Convex adapter.
 * It provides document counting with optional where clause filtering for:
 * - Regular collections
 * - Version collections
 * - Global version collections
 *
 * @module convex/bindings/count
 */

/**
 * Props for the count operation.
 */
type AdapaterCountProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming count parameters from Payload */
    incomingCount: Parameters<Count>[0];
};
/**
 * Props for the countVersions operation.
 */
type AdapaterCountVersionsProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming countVersions parameters from Payload */
    incomingCountVersions: Parameters<CountVersions>[0];
};
/**
 * Props for the countGlobalVersions operation.
 */
type AdapaterCountGlobalVersionsProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming countGlobalVersions parameters from Payload */
    incomingCountGlobalVersions: Parameters<CountGlobalVersions>[0];
};
/**
 * Counts documents in a collection matching the where clause.
 *
 * @param {AdapaterCountProps} props - The count operation parameters
 * @returns {Promise<{ totalDocs: number }>} The count result
 */
declare function count(props: AdapaterCountProps): Promise<{
    totalDocs: number;
}>;
/**
 * Counts version documents for a collection.
 *
 * Versions are stored in collections named `{collection}_versions`.
 *
 * @param {AdapaterCountVersionsProps} props - The countVersions operation parameters
 * @returns {Promise<{ totalDocs: number }>} The count result
 */
declare function countVersions(props: AdapaterCountVersionsProps): Promise<{
    totalDocs: number;
}>;
/**
 * Counts version documents for a global.
 *
 * Global versions are stored in collections named `{global}_global_versions`.
 *
 * @param {AdapaterCountGlobalVersionsProps} props - The countGlobalVersions operation parameters
 * @returns {Promise<{ totalDocs: number }>} The count result
 */
declare function countGlobalVersions(props: AdapaterCountGlobalVersionsProps): Promise<{
    totalDocs: number;
}>;

/**
 * Props for the create operation.
 */
type AdapterCreateProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming create parameters from Payload */
    incomingCreate: Parameters<Create>[0];
};
/**
 * Props for the createGlobal operation.
 */
type AdapterCreateGlobalProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming createGlobal parameters from Payload */
    incomingCreateGlobal: Parameters<CreateGlobal>[0];
};
/**
 * Props for the createVersion operation.
 */
type AdapterCreateVersionProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming createVersion parameters from Payload */
    incomingCreateVersion: Parameters<CreateVersion>[0];
};
/**
 * Props for the createGlobalVersion operation.
 */
type AdapterCreateGlobalVersionProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming createGlobalVersion parameters from Payload */
    incomingCreateGlobalVersion: Parameters<CreateGlobalVersion>[0];
};
/**
 * Props for the createMigration operation.
 */
type AdapterCreateMigrationProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming createMigration parameters from Payload */
    incomingCreateMigration: Parameters<CreateMigration>[0];
};
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
declare function create(props: AdapterCreateProps): Promise<any>;
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
declare function createGlobal(props: AdapterCreateGlobalProps): Promise<Record<string, unknown>>;
/**
 * Creates a new version of a document.
 *
 * Versions are stored in collections named `{collection}_versions`.
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
declare function createVersion(props: AdapterCreateVersionProps): Promise<payload.TypeWithVersion<payload.JsonObject>>;
/**
 * Creates a new version of a global document.
 *
 * Global versions are stored in collections named `{global}_global_versions`.
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
declare function createGlobalVersion(props: AdapterCreateGlobalVersionProps): Promise<Omit<payload.TypeWithVersion<payload.JsonObject>, "parent">>;
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
declare function createMigration(props: AdapterCreateMigrationProps): Promise<void>;

/**
 * Props for the find operation.
 */
type AdapterFindProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming find parameters from Payload */
    incomingFind: Parameters<Find>[0];
};
/**
 * Props for the findOne operation.
 */
type AdapterFindOneProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming findOne parameters from Payload */
    incomingFindOne: Parameters<FindOne>[0];
};
/**
 * Props for the findDistinct operation.
 */
type AdapterFindDistinctProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming findDistinct parameters from Payload */
    incomingFindDistinct: Parameters<FindDistinct>[0];
};
/**
 * Props for the findGlobal operation.
 */
type AdapterFindGlobalProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming findGlobal parameters from Payload */
    incomingFindGlobal: Parameters<FindGlobal>[0];
};
/**
 * Props for the findVersions operation.
 */
type AdapterFindVersionsProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming findVersions parameters from Payload */
    incomingFindVersions: Parameters<FindVersions>[0];
};
/**
 * Props for the findGlobalVersions operation.
 */
type AdapterFindGlobalVersionsProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming findGlobalVersions parameters from Payload */
    incomingFindGlobalVersions: Parameters<FindGlobalVersions>[0];
};
/**
 * Finds documents in a collection with pagination, filtering, and sorting.
 *
 * This function implements Payload's Find operation, supporting:
 * - Page-based pagination with configurable page size
 * - Where clause filtering via ParsedWhereFilter
 * - Sort order (ascending/descending based on sort string prefix)
 * - Option to disable pagination and fetch all documents
 *
 * @param {AdapterFindProps} props - The find operation parameters
 * @returns {Promise<Awaited<ReturnType<Find>>>} Paginated result with docs and metadata
 *
 * @example
 * ```typescript
 * const result = await find({
 *   service,
 *   incomingFind: {
 *     collection: 'posts',
 *     where: { status: { equals: 'published' } },
 *     limit: 10,
 *     page: 1,
 *     sort: '-createdAt',
 *   },
 * });
 * ```
 */
declare function find(props: AdapterFindProps): Promise<payload.PaginatedDocs<unknown>>;
/**
 * Finds a single document matching the where clause.
 *
 * @param {AdapterFindOneProps} props - The findOne operation parameters
 * @returns {Promise<Awaited<ReturnType<FindOne>>>} The found document or null
 */
declare function findOne(props: AdapterFindOneProps): Promise<payload.TypeWithID | null>;
/**
 * Finds distinct values for a specific field across documents.
 *
 * This function retrieves unique values for the specified field from
 * documents matching the where clause, with pagination support.
 *
 * @param {AdapterFindDistinctProps} props - The findDistinct operation parameters
 * @returns {Promise<Awaited<ReturnType<FindDistinct>>>} Paginated distinct values
 */
declare function findDistinct(props: AdapterFindDistinctProps): Promise<payload.PaginatedDistinctDocs<Record<string, any>>>;
/**
 * Finds a global document by its slug.
 *
 * Globals are singleton documents stored in collections named `_globals_{slug}`.
 *
 * @param {AdapterFindGlobalProps} props - The findGlobal operation parameters
 * @returns {Promise<Awaited<ReturnType<FindGlobal>>>} The global document or empty object
 */
declare function findGlobal(props: AdapterFindGlobalProps): Promise<Record<string, unknown>>;
/**
 * Finds version documents for a collection.
 *
 * Versions are stored in collections named `{collection}_versions`.
 *
 * @param {AdapterFindVersionsProps} props - The findVersions operation parameters
 * @returns {Promise<Awaited<ReturnType<FindVersions>>>} Paginated version documents
 */
declare function findVersions(props: AdapterFindVersionsProps): Promise<payload.PaginatedDocs<payload.TypeWithVersion<unknown>>>;
/**
 * Finds version documents for a global.
 *
 * Global versions are stored in collections named `{global}_global_versions`.
 *
 * @param {AdapterFindGlobalVersionsProps} props - The findGlobalVersions operation parameters
 * @returns {Promise<Awaited<ReturnType<FindGlobalVersions>>>} Paginated global version documents
 */
declare function findGlobalVersions(props: AdapterFindGlobalVersionsProps): Promise<payload.PaginatedDocs<payload.TypeWithVersion<unknown>>>;

/**
 * @fileoverview Delete Operation Bindings
 *
 * This module implements Payload's delete operations for the Convex adapter.
 * It provides document deletion for:
 * - Single documents (by ID)
 * - Multiple documents (bulk delete via where clause)
 * - Version documents
 *
 * ## Collection Naming Conventions
 * - Regular collections: `{collection}`
 * - Version collections: `{collection}_versions`
 *
 * @module convex/bindings/delete
 */

/**
 * Props for the deleteOne operation.
 */
type AdapterDeleteOneProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming deleteOne parameters from Payload */
    incomingDeleteOne: Parameters<DeleteOne>[0];
};
/**
 * Props for the deleteMany operation.
 */
type AdapterDeleteManyProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming deleteMany parameters from Payload */
    incomingDeleteMany: Parameters<DeleteMany>[0];
};
/**
 * Props for the deleteVersions operation.
 */
type AdapterDeleteVersionsProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming deleteVersions parameters from Payload */
    incomingDeleteVersions: Parameters<DeleteVersions>[0];
};
/**
 * Deletes a single document from a collection matching a where clause.
 *
 * This function first fetches the document to return it, then deletes it.
 * This matches Payload's expected behavior of returning the deleted document.
 *
 * @param {AdapterDeleteOneProps} props - The deleteOne operation parameters
 * @returns {Promise<Awaited<ReturnType<DeleteOne>>>} The deleted document
 *
 * @example
 * ```typescript
 * const deletedDoc = await deleteOne({
 *   service,
 *   incomingDeleteOne: {
 *     collection: 'posts',
 *     where: { id: { equals: '123' } },
 *   },
 * });
 * ```
 */
declare function deleteOne(props: AdapterDeleteOneProps): Promise<any>;
/**
 * Deletes multiple documents matching a where clause.
 *
 * This function uses the deleteManyWhere mutation to delete all documents
 * matching the provided filter criteria. Returns void per Payload's specification.
 *
 * @param {AdapterDeleteManyProps} props - The deleteMany operation parameters
 * @returns {Promise<Awaited<ReturnType<DeleteMany>>>} void
 *
 * @example
 * ```typescript
 * await deleteMany({
 *   service,
 *   incomingDeleteMany: {
 *     collection: 'posts',
 *     where: { status: { equals: 'draft' } },
 *   },
 * });
 * ```
 */
declare function deleteMany(props: AdapterDeleteManyProps): Promise<void>;
/**
 * Deletes version documents for a collection or global.
 *
 * Versions are stored in collections named `{collection}_versions` or `{global}_versions`.
 * This function deletes version documents matching the provided where clause.
 * Returns void per Payload's specification.
 *
 * @param {AdapterDeleteVersionsProps} props - The deleteVersions operation parameters
 * @returns {Promise<Awaited<ReturnType<DeleteVersions>>>} void
 *
 * @example
 * ```typescript
 * await deleteVersions({
 *   service,
 *   incomingDeleteVersions: {
 *     collection: 'posts',
 *     where: { parent: { equals: '123' } },
 *   },
 * });
 * ```
 */
declare function deleteVersions(props: AdapterDeleteVersionsProps): Promise<void>;

/**
 * Props for the updateOne operation.
 */
type AdapterUpdateOneProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming updateOne parameters from Payload */
    incomingUpdateOne: Parameters<UpdateOne>[0];
};
/**
 * Props for the updateMany operation.
 */
type AdapterUpdateManyProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming updateMany parameters from Payload */
    incomingUpdateMany: Parameters<UpdateMany>[0];
};
/**
 * Props for the updateGlobal operation.
 */
type AdapterUpdateGlobalProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming updateGlobal parameters from Payload */
    incomingUpdateGlobal: Parameters<UpdateGlobal>[0];
};
/**
 * Props for the updateVersion operation.
 */
type AdapterUpdateVersionProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming updateVersion parameters from Payload */
    incomingUpdateVersion: Parameters<UpdateVersion>[0];
};
/**
 * Props for the updateGlobalVersion operation.
 */
type AdapterUpdateGlobalVersionProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming updateGlobalVersion parameters from Payload */
    incomingUpdateGlobalVersion: Parameters<UpdateGlobalVersion>[0];
};
/**
 * Props for the updateJobs operation.
 */
type AdapterUpdateJobsProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming updateJobs parameters from Payload */
    incomingUpdateJobs: Parameters<UpdateJobs>[0];
};
/**
 * Updates a single document in a collection.
 *
 * UpdateOne can use either an `id` or a `where` clause to identify the document.
 *
 * @param {AdapterUpdateOneProps} props - The updateOne operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateOne>>>} The updated document
 *
 * @example
 * ```typescript
 * const updatedDoc = await updateOne({
 *   service,
 *   incomingUpdateOne: {
 *     collection: 'posts',
 *     where: { id: { equals: '123' } },
 *     data: { title: 'Updated Title' },
 *   },
 * });
 * ```
 */
declare function updateOne(props: AdapterUpdateOneProps): Promise<any>;
/**
 * Updates multiple documents matching a where clause.
 *
 * @param {AdapterUpdateManyProps} props - The updateMany operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateMany>>>} Array of updated documents or null
 *
 * @example
 * ```typescript
 * const updatedDocs = await updateMany({
 *   service,
 *   incomingUpdateMany: {
 *     collection: 'posts',
 *     where: { status: { equals: 'draft' } },
 *     data: { status: 'published' },
 *   },
 * });
 * ```
 */
declare function updateMany(props: AdapterUpdateManyProps): Promise<any[] | null>;
/**
 * Updates a global document.
 *
 * Globals are singleton documents stored in collections named `_globals_{slug}`.
 *
 * @param {AdapterUpdateGlobalProps} props - The updateGlobal operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateGlobal>>>} The updated global document
 *
 * @example
 * ```typescript
 * const updatedGlobal = await updateGlobal({
 *   service,
 *   incomingUpdateGlobal: {
 *     slug: 'settings',
 *     data: { siteName: 'Updated Site Name' },
 *   },
 * });
 * ```
 */
declare function updateGlobal(props: AdapterUpdateGlobalProps): Promise<Record<string, unknown>>;
/**
 * Updates a document version.
 *
 * Versions are stored in collections named `{collection}_versions`.
 * Can update by either `id` or `where` clause.
 *
 * @param {AdapterUpdateVersionProps} props - The updateVersion operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateVersion>>>} The updated version document
 *
 * @example
 * ```typescript
 * const updatedVersion = await updateVersion({
 *   service,
 *   incomingUpdateVersion: {
 *     collection: 'posts',
 *     id: 'version123',
 *     versionData: { latest: true },
 *   },
 * });
 * ```
 */
declare function updateVersion(props: AdapterUpdateVersionProps): Promise<payload.TypeWithVersion<payload.JsonObject>>;
/**
 * Updates a global version document.
 *
 * Global versions are stored in collections named `{global}_global_versions`.
 * Can update by either `id` or `where` clause.
 *
 * @param {AdapterUpdateGlobalVersionProps} props - The updateGlobalVersion operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateGlobalVersion>>>} The updated global version document
 *
 * @example
 * ```typescript
 * const updatedGlobalVersion = await updateGlobalVersion({
 *   service,
 *   incomingUpdateGlobalVersion: {
 *     global: 'settings',
 *     id: 'version123',
 *     versionData: { latest: true },
 *   },
 * });
 * ```
 */
declare function updateGlobalVersion(props: AdapterUpdateGlobalVersionProps): Promise<payload.TypeWithVersion<payload.JsonObject>>;
/**
 * Updates job queue entries.
 *
 * Jobs are stored in a special `_jobs` collection.
 * Can update by either `id` or `where` clause with optional `limit`.
 *
 * @param {AdapterUpdateJobsProps} props - The updateJobs operation parameters
 * @returns {Promise<Awaited<ReturnType<UpdateJobs>>>} Array of updated job entries or null
 *
 * @example
 * ```typescript
 * const updatedJobs = await updateJobs({
 *   service,
 *   incomingUpdateJobs: {
 *     where: { status: { equals: 'pending' } },
 *     data: { status: 'processing' },
 *     limit: 10,
 *   },
 * });
 * ```
 */
declare function updateJobs(props: AdapterUpdateJobsProps): Promise<payload.Job[] | null>;

/**
 * @fileoverview Upsert Operation Bindings
 *
 * This module implements Payload's upsert operation for the Convex adapter.
 * Upsert creates a document if it doesn't exist, or updates it if it does.
 *
 * @module convex/bindings/upsert
 */

/**
 * Props for the upsert operation.
 */
type AdapterUpsertProps$1 = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming upsert parameters from Payload */
    incomingUpsert: Parameters<Upsert>[0];
};
/**
 * Inserts or updates a document based on matching criteria.
 *
 * This function searches for a document matching the where clause.
 * If found, it updates the document. If not found, it creates a new one.
 *
 * @param {AdapterUpsertProps} props - The upsert operation parameters
 * @returns {Promise<Awaited<ReturnType<Upsert>>>} The upserted document
 *
 * @example
 * ```typescript
 * const doc = await upsert({
 *   service,
 *   incomingUpsert: {
 *     collection: 'posts',
 *     where: { slug: { equals: 'hello-world' } },
 *     data: { title: 'Hello World', content: 'Updated content' },
 *   },
 * });
 * ```
 */
declare function upsert$1(props: AdapterUpsertProps$1): Promise<any>;

/**
 * Props for the queryDrafts operation.
 */
type AdapterQueryDraftsProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming queryDrafts parameters from Payload */
    incomingQueryDrafts: Parameters<QueryDrafts>[0];
};
/**
 * Queries draft documents from a collection.
 *
 * Draft documents have a `_status` field set to 'draft'.
 * This function returns paginated results of draft documents with
 * support for filtering, sorting, and pagination.
 *
 * @param {AdapterQueryDraftsProps} props - The queryDrafts operation parameters
 * @returns {Promise<Awaited<ReturnType<QueryDrafts>>>} Paginated draft documents result
 *
 * @example
 * ```typescript
 * const drafts = await queryDrafts({
 *   service,
 *   incomingQueryDrafts: {
 *     collection: 'posts',
 *     where: { author: { equals: 'user123' } },
 *     limit: 10,
 *     page: 1,
 *   },
 * });
 * ```
 */
declare function queryDrafts(props: AdapterQueryDraftsProps): Promise<payload.PaginatedDocs<unknown>>;

/**
 * @fileoverview Migration Operation Bindings
 *
 * This module implements Payload's migration operations for the Convex adapter.
 * Migrations handle database schema changes and data transformations.
 *
 * ## Migration Operations
 * - **migrate**: Run pending migrations
 * - **migrateDown**: Rollback the last migration
 * - **migrateFresh**: Drop all data and re-run all migrations
 * - **migrateRefresh**: Rollback all migrations and re-run them
 * - **migrateReset**: Rollback all migrations
 * - **migrateStatus**: Show the status of all migrations
 *
 * @module convex/bindings/migrate
 * @todo Implement all migration operations
 */

/**
 * Props for the migrate operation.
 */
type AdapterMigrateProps = {
    /** The adapter service instance */
    service: AdapterService;
    /** The incoming migrate parameters from Payload */
    incomingMigrate: {
        migrations?: Migration[];
    } | undefined;
};
/**
 * Runs pending database migrations.
 *
 * @param {AdapterMigrateProps} props - The migrate operation parameters
 * @returns {Promise<void>} Currently not implemented
 * @todo Implement migration execution
 */
declare function migrate(props: AdapterMigrateProps): Promise<void>;
/**
 * Rolls back the last migration.
 *
 * @param {Object} props - The migrateDown operation parameters
 * @returns {Promise<void>} Currently not implemented
 * @todo Implement migration rollback
 */
declare function migrateDown(props: {}): Promise<void>;
/**
 * Drops all data and re-runs all migrations from scratch.
 *
 * @param {Object} props - The migrateFresh operation parameters
 * @returns {Promise<void>} Currently not implemented
 * @todo Implement fresh migration
 */
declare function migrateFresh(props: {}): Promise<void>;
/**
 * Rolls back all migrations and re-runs them.
 *
 * @param {Object} props - The migrateRefresh operation parameters
 * @returns {Promise<void>} Currently not implemented
 * @todo Implement migration refresh
 */
declare function migrateRefresh(props: {}): Promise<void>;
/**
 * Rolls back all migrations.
 *
 * @param {Object} props - The migrateReset operation parameters
 * @returns {Promise<void>} Currently not implemented
 * @todo Implement migration reset
 */
declare function migrateReset(props: {}): Promise<void>;
/**
 * Shows the status of all migrations.
 *
 * @param {Object} props - The migrateStatus operation parameters
 * @returns {Promise<void>} Currently not implemented
 * @todo Implement migration status reporting
 */
declare function migrateStatus(props: {}): Promise<void>;

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

/**
 * Transaction management bindings.
 * Handles transaction lifecycle: begin, commit, and rollback.
 */
declare const transactions: {
    beginTransaction: typeof beginTransaction;
    commitTransaction: typeof commitTransaction;
    rollbackTransaction: typeof rollbackTransaction;
};
/**
 * Document counting bindings.
 * Provides count operations for collections, versions, and global versions.
 */
declare const counts: {
    count: typeof count;
    countVersions: typeof countVersions;
    countGlobalVersions: typeof countGlobalVersions;
};
/**
 * Document creation bindings.
 * Handles creating documents, globals, versions, and migrations.
 */
declare const creates: {
    create: typeof create;
    createGlobal: typeof createGlobal;
    createVersion: typeof createVersion;
    createGlobalVersion: typeof createGlobalVersion;
    createMigration: typeof createMigration;
};
/**
 * Document retrieval bindings.
 * Provides find operations with pagination, filtering, and version support.
 */
declare const finds: {
    find: typeof find;
    findOne: typeof findOne;
    findDistinct: typeof findDistinct;
    findGlobal: typeof findGlobal;
    findVersions: typeof findVersions;
    findGlobalVersions: typeof findGlobalVersions;
};
/**
 * Document deletion bindings.
 * Handles single, bulk, and version deletions.
 */
declare const deletes: {
    deleteOne: typeof deleteOne;
    deleteMany: typeof deleteMany;
    deleteVersions: typeof deleteVersions;
};
/**
 * Document update bindings.
 * Provides update operations for documents, globals, versions, and jobs.
 */
declare const updates: {
    updateOne: typeof updateOne;
    updateMany: typeof updateMany;
    updateGlobal: typeof updateGlobal;
    updateVersion: typeof updateVersion;
    updateGlobalVersion: typeof updateGlobalVersion;
    updateJobs: typeof updateJobs;
};
/**
 * Upsert bindings.
 * Handles insert-or-update operations.
 */
declare const upserts: {
    upsert: typeof upsert$1;
};
/**
 * Draft query bindings.
 * Provides querying for draft documents.
 */
declare const drafts: {
    queryDrafts: typeof queryDrafts;
};
/**
 * Migration bindings.
 * Handles database schema migrations.
 */
declare const migrations: {
    migrate: typeof migrate;
    migrateDown: typeof migrateDown;
    migrateFresh: typeof migrateFresh;
    migrateRefresh: typeof migrateRefresh;
    migrateReset: typeof migrateReset;
    migrateStatus: typeof migrateStatus;
};

declare const bindings_counts: typeof counts;
declare const bindings_creates: typeof creates;
declare const bindings_deletes: typeof deletes;
declare const bindings_drafts: typeof drafts;
declare const bindings_finds: typeof finds;
declare const bindings_migrations: typeof migrations;
declare const bindings_transactions: typeof transactions;
declare const bindings_updates: typeof updates;
declare const bindings_upserts: typeof upserts;
declare namespace bindings {
  export { bindings_counts as counts, bindings_creates as creates, bindings_deletes as deletes, bindings_drafts as drafts, bindings_finds as finds, bindings_migrations as migrations, bindings_transactions as transactions, bindings_updates as updates, bindings_upserts as upserts };
}

/**
 * Configuration props for creating an adapter service.
 *
 * @template T - The Convex data model type
 */
type AdapterServiceProps<T extends GenericDataModel> = {
    /** The Convex deployment URL */
    convexUrl: string;
    /** The Convex deployment identifier */
    convexDeployment: string;
    /** The table name prefix for this adapter instance */
    prefix: string;
    /** The Payload instance this service is associated with */
    payload: Payload;
};
/**
 * The adapter service type, inferred from the factory function return type.
 * This type represents the complete service object with all its properties and methods.
 *
 * @template T - The Convex data model type
 */
type AdapterService<T extends GenericDataModel = GenericDataModel> = ReturnType<typeof createAdapterService<T>>;
/**
 * Creates an adapter service instance with all required dependencies.
 *
 * The adapter service is the central coordination point for all database operations.
 * It provides access to:
 * - The Convex client for direct database access
 * - Query and mutation adapters for type-safe operations
 * - Utility functions for ID generation and collection parsing
 * - Session tracking for transaction management
 *
 * @template T - The Convex data model type
 * @param {AdapterServiceProps<T>} props - Configuration options
 * @returns {AdapterService<T>} The configured adapter service
 *
 * @example
 * ```typescript
 * const service = createAdapterService({
 *   convexUrl: 'https://your-deployment.convex.cloud',
 *   convexDeployment: 'dev:your-deployment',
 *   prefix: 'my_app',
 *   payload: payloadInstance,
 * });
 *
 * // Use the service for database operations
 * const docs = await service.db.query({}).collectionQuery.adapter({
 *   service,
 *   collection: 'users',
 *   index: null,
 * });
 * ```
 */
declare function createAdapterService<T extends GenericDataModel>(props: AdapterServiceProps<T>): {
    db: {
        client: {
            directClient: convex_browser.ConvexHttpClient;
            liveClient: convex_browser.ConvexClient;
        };
        bindings: typeof bindings;
        query: typeof QueryAdapter;
        mutation: typeof MutationAdapter;
        api: convex_server.AnyApi;
    };
    tools: {
        sessionTracker: SessionTracker;
        createRandomID: typeof createRandomID;
        queryProcessor: typeof queryProcessor;
        parseCollection: typeof parseCollection;
        createWherePlan: typeof createWherePlan;
        emptyWherePlan: typeof emptyWherePlan;
    };
    system: {
        url: string;
        prefix: string;
        logger: ServiceLogger;
        isDev: boolean;
        isClient: boolean;
    };
    payload: payload.BasePayload;
};

/**
 * @fileoverview Query Adapter for Convex Database Operations
 *
 * This module provides a comprehensive set of query operations for interacting with
 * Convex databases through the Payload adapter. It implements a two-layer architecture:
 *
 * 1. **Convex Functions** (`convex*`): Define the Convex query handlers that run on the server
 * 2. **Adapter Functions** (`adapter*`): Client-side wrappers that invoke the Convex functions
 *
 * Each query operation supports optional indexing and where filtering using the
 * ParsedWhereFilter system for type-safe, serializable query conditions.
 *
 * @module query-adapter
 */

/**
 * Extracts the result type from a Convex get operation.
 * Handles nested Promise types and returns the unwrapped result or null.
 */
type ExtractConvexGetResult<T> = T extends Promise<RegisteredQuery<any, any, Promise<infer R>>> ? R | null : T extends RegisteredQuery<any, any, Promise<infer R>> ? R | null : T extends Promise<RegisteredQuery<any, any, infer R>> ? R | null : T extends RegisteredQuery<any, any, infer R> ? R | null : T | null;
/**
 * Extracts the result type from a Convex query operation.
 * Handles nested Promise types and array unwrapping for collection queries.
 */
type ExtractConvexQueryResult<T> = T extends Promise<RegisteredQuery<any, any, Promise<infer R>>> ? R extends Array<infer U> ? U[] : R : T extends RegisteredQuery<any, any, Promise<infer R>> ? R extends Array<infer U> ? U[] : R : T extends Promise<RegisteredQuery<any, any, infer R>> ? R extends Promise<infer U> ? U extends Array<infer V> ? V[] : U : R extends Array<infer U> ? U[] : R : T extends RegisteredQuery<any, any, infer R> ? R extends Promise<infer U> ? U extends Array<infer V> ? V[] : U : R extends Array<infer U> ? U[] : R : GenericDocument[] | null;
/**
 * Configuration for query index usage.
 * Allows specifying an index name and optional range builder for optimized queries.
 */
type AdapaterQueryIndex = {
    indexName: string;
    indexRange?: (q: IndexRangeBuilder<GenericDocument, GenericIndexFields, number>) => IndexRange;
} | undefined;
/**
 * Props for creating a Convex getById query function.
 */
type ConvexGetByIdProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side getById operation.
 */
type AdapterGetByIdProps = {
    service: AdapterService;
    collection: string;
    id: string;
};
/**
 * Result type for getById operations.
 */
type ConvexGetByIdResult = ExtractConvexGetResult<ReturnType<typeof convexGetById>>;
/**
 * @function convexGetById
 * Creates a Convex query function to fetch a single document by its ID.
 * Uses Convex's native `ctx.db.get()` for O(1) direct ID lookup.
 *
 * @param {ConvexGetByIdProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches a document by ID
 */
declare function convexGetById(props: ConvexGetByIdProps): RegisteredQuery<"public", {
    id?: string | undefined;
    collection: string;
}, Promise<any>>;
/**
 * @function adapterGetById
 * Adapter-side function to fetch a single document by its ID.
 * Handles collection prefixing and invokes the Convex query.
 *
 * @param {AdapterGetByIdProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {string} props.id - The document ID to fetch
 * @returns {Promise<ConvexGetByIdResult>} The fetched document or null
 */
declare function adapterGetById(props: AdapterGetByIdProps): Promise<any>;
/**
 * GetById operation bundle containing both adapter and convex implementations.
 */
declare const getById: {
    adapter: typeof adapterGetById;
    convex: typeof convexGetById;
};
/**
 * Props for creating a Convex collection query function.
 */
type ConvexCollectionQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection query operation.
 */
type AdapterCollectionQueryProps = {
    service: AdapterService;
    collection: string;
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection query operations.
 */
type ConvexCollectionQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionQuery>>;
/**
 * @function convexCollectionQuery
 * Creates a Convex query function to fetch all documents from a collection.
 * Supports optional index configuration for optimized queries.
 *
 * @param {ConvexCollectionQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches all documents
 */
declare function convexCollectionQuery(props: ConvexCollectionQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    collection: string;
}, Promise<any[]>>;
/**
 * @function adapterCollectionQuery
 * Adapter-side function to fetch all documents from a collection.
 *
 * @param {AdapterCollectionQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionQueryResult>} Array of documents
 */
declare function adapterCollectionQuery(props: AdapterCollectionQueryProps): Promise<any[]>;
/**
 * Collection query operation bundle containing both adapter and convex implementations.
 */
declare const collectionQuery: {
    adapter: typeof adapterCollectionQuery;
    convex: typeof convexCollectionQuery;
};
/**
 * Props for creating a Convex collection count query function.
 */
type ConvexCollectionCountQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection count query operation.
 */
type AdapterCollectionCountQueryProps = {
    service: AdapterService;
    collection: string;
    wherePlan: EnhancedParsedWhereFilter;
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection count query operations.
 */
type ConvexCollectionCountQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionCountQuery>>;
/**
 * @function convexCollectionCountQuery
 * Creates a Convex query function to count documents in a collection.
 * Supports optional where filtering and index configuration.
 *
 * @param {ConvexCollectionCountQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that returns document count
 */
declare function convexCollectionCountQuery(props: ConvexCollectionCountQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    wherePlan?: any;
    collection: string;
}, Promise<number>>;
/**
 * @function adapterCollectionCountQuery
 * Adapter-side function to count documents in a collection with optional filtering.
 *
 * @param {AdapterCollectionCountQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<number>} The count of matching documents
 */
declare function adapterCollectionCountQuery(props: AdapterCollectionCountQueryProps): Promise<number>;
/**
 * Collection count query operation bundle containing both adapter and convex implementations.
 */
declare const collectionCountQuery: {
    adapter: typeof adapterCollectionCountQuery;
    convex: typeof convexCollectionCountQuery;
};
/**
 * Props for creating a Convex collection where query function.
 */
type ConvexCollectionWhereQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection where query operation.
 */
type AdapterCollectionWhereQueryProps = {
    service: AdapterService;
    collection: string;
    wherePlan: EnhancedParsedWhereFilter;
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection where query operations.
 */
type ConvexCollectionWhereQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionWhereQuery>>;
/**
 * @function convexCollectionWhereQuery
 * Creates a Convex query function to fetch documents matching a where filter.
 * Uses the two-phase ParsedWhereFilter system for type-safe filtering.
 *
 * @param {ConvexCollectionWhereQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches filtered documents
 */
declare function convexCollectionWhereQuery(props: ConvexCollectionWhereQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    wherePlan?: any;
    collection: string;
}, Promise<any[]>>;
/**
 * @function adapterCollectionWhereQuery
 * Adapter-side function to fetch documents matching a where filter.
 *
 * @param {AdapterCollectionWhereQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWhereQueryResult>} Array of matching documents
 */
declare function adapterCollectionWhereQuery(props: AdapterCollectionWhereQueryProps): Promise<any[]>;
/**
 * Collection where query operation bundle containing both adapter and convex implementations.
 */
declare const collectionWhereQuery: {
    adapter: typeof adapterCollectionWhereQuery;
    convex: typeof convexCollectionWhereQuery;
};
/**
 * Props for creating a Convex collection order query function.
 */
type ConvexCollectionOrderQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection order query operation.
 */
type AdapterCollectionOrderQueryProps = {
    service: AdapterService;
    collection: string;
    order: "asc" | "desc";
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection order query operations.
 */
type ConvexCollectionOrderQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionOrderQuery>>;
/**
 * @function convexCollectionOrderQuery
 * Creates a Convex query function to fetch documents with ordering.
 *
 * @param {ConvexCollectionOrderQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches ordered documents
 */
declare function convexCollectionOrderQuery(props: ConvexCollectionOrderQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    collection: string;
    order: "asc" | "desc";
}, Promise<any[]>>;
/**
 * @function adapterCollectionOrderQuery
 * Adapter-side function to fetch documents with ordering.
 *
 * @param {AdapterCollectionOrderQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionOrderQueryResult>} Array of ordered documents
 */
declare function adapterCollectionOrderQuery(props: AdapterCollectionOrderQueryProps): Promise<any[]>;
/**
 * Collection order query operation bundle containing both adapter and convex implementations.
 */
declare const collectionOrderQuery: {
    adapter: typeof adapterCollectionOrderQuery;
    convex: typeof convexCollectionOrderQuery;
};
/**
 * Props for creating a Convex collection order limit query function.
 */
type ConvexCollectionOrderLimitQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection order limit query operation.
 */
type AdapterCollectionOrderLimitQueryProps = {
    service: AdapterService;
    collection: string;
    order: "asc" | "desc";
    limit: number;
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection order limit query operations.
 */
type ConvexCollectionOrderLimitQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionOrderLimitQuery>>;
/**
 * @function convexCollectionOrderLimitQuery
 * Creates a Convex query function to fetch ordered documents with a limit.
 *
 * @param {ConvexCollectionOrderLimitQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches limited ordered documents
 */
declare function convexCollectionOrderLimitQuery(props: ConvexCollectionOrderLimitQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    collection: string;
    limit: number;
    order: "asc" | "desc";
}, Promise<any[]>>;
/**
 * @function adapterCollectionOrderLimitQuery
 * Adapter-side function to fetch ordered documents with a limit.
 *
 * @param {AdapterCollectionOrderLimitQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {number} props.limit - Maximum number of documents to return
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionOrderLimitQueryResult>} Array of limited ordered documents
 */
declare function adapterCollectionOrderLimitQuery(props: AdapterCollectionOrderLimitQueryProps): Promise<any[]>;
/**
 * Collection order limit query operation bundle containing both adapter and convex implementations.
 */
declare const collectionOrderLimitQuery: {
    adapter: typeof adapterCollectionOrderLimitQuery;
    convex: typeof convexCollectionOrderLimitQuery;
};
/**
 * Props for creating a Convex collection order paginate query function.
 */
type ConvexCollectionOrderPaginateQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection order paginate query operation.
 */
type AdapterCollectionOrderPaginateQueryProps = {
    service: AdapterService;
    collection: string;
    paginationOpts: PaginationOptions;
    order: "asc" | "desc";
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection order paginate query operations.
 */
type ConvexCollectionOrderPaginateQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionOrderPaginateQuery>>;
/**
 * @function convexCollectionOrderPaginateQuery
 * Creates a Convex query function to fetch ordered documents with pagination.
 *
 * @param {ConvexCollectionOrderPaginateQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches paginated ordered documents
 */
declare function convexCollectionOrderPaginateQuery(props: ConvexCollectionOrderPaginateQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    collection: string;
    order: "asc" | "desc";
    paginationOpts: {
        numItems: number;
        cursor: string | null;
    };
}, Promise<{
    page: any[];
    continueCursor: string;
    isDone: boolean;
}>>;
/**
 * @function adapterCollectionOrderPaginateQuery
 * Adapter-side function to fetch ordered documents with pagination.
 *
 * @param {AdapterCollectionOrderPaginateQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {PaginationOptions} props.paginationOpts - Pagination configuration
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionOrderPaginateQueryResult>} Paginated result with documents
 */
declare function adapterCollectionOrderPaginateQuery(props: AdapterCollectionOrderPaginateQueryProps): Promise<{
    page: any[];
    continueCursor: string;
    isDone: boolean;
}>;
/**
 * Collection order paginate query operation bundle containing both adapter and convex implementations.
 */
declare const collectionOrderPaginateQuery: {
    adapter: typeof adapterCollectionOrderPaginateQuery;
    convex: typeof convexCollectionOrderPaginateQuery;
};
/**
 * Props for creating a Convex collection limit query function.
 */
type ConvexCollectionLimitQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection limit query operation.
 */
type AdapterCollectionLimitQueryProps = {
    service: AdapterService;
    collection: string;
    limit: number;
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection limit query operations.
 */
type ConvexCollectionLimitQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionLimitQuery>>;
/**
 * @function convexCollectionLimitQuery
 * Creates a Convex query function to fetch documents with a limit.
 *
 * @param {ConvexCollectionLimitQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches limited documents
 */
declare function convexCollectionLimitQuery(props: ConvexCollectionLimitQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    collection: string;
    limit: number;
}, Promise<any[]>>;
/**
 * @function adapterCollectionLimitQuery
 * Adapter-side function to fetch documents with a limit.
 *
 * @param {AdapterCollectionLimitQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {number} props.limit - Maximum number of documents to return
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionLimitQueryResult>} Array of limited documents
 */
declare function adapterCollectionLimitQuery(props: AdapterCollectionLimitQueryProps): Promise<any[]>;
/**
 * Collection limit query operation bundle containing both adapter and convex implementations.
 */
declare const collectionLimitQuery: {
    adapter: typeof adapterCollectionLimitQuery;
    convex: typeof convexCollectionLimitQuery;
};
/**
 * Props for creating a Convex collection where order query function.
 */
type ConvexCollectionWhereOrderQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection where order query operation.
 */
type AdapterCollectionWhereOrderQueryProps = {
    service: AdapterService;
    collection: string;
    wherePlan: EnhancedParsedWhereFilter;
    order: "asc" | "desc";
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection where order query operations.
 */
type ConvexCollectionWhereOrderQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionWhereOrderQuery>>;
/**
 * @function convexCollectionWhereOrderQuery
 * Creates a Convex query function to fetch filtered documents with ordering.
 *
 * @param {ConvexCollectionWhereOrderQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches filtered ordered documents
 */
declare function convexCollectionWhereOrderQuery(props: ConvexCollectionWhereOrderQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    wherePlan?: any;
    collection: string;
    order: "asc" | "desc";
}, Promise<any[]>>;
/**
 * @function adapterCollectionWhereOrderQuery
 * Adapter-side function to fetch filtered documents with ordering.
 *
 * @param {AdapterCollectionWhereOrderQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWhereOrderQueryResult>} Array of filtered ordered documents
 */
declare function adapterCollectionWhereOrderQuery(props: AdapterCollectionWhereOrderQueryProps): Promise<any[]>;
/**
 * Collection where order query operation bundle containing both adapter and convex implementations.
 */
declare const collectionWhereOrderQuery: {
    adapter: typeof adapterCollectionWhereOrderQuery;
    convex: typeof convexCollectionWhereOrderQuery;
};
/**
 * Props for creating a Convex collection where limit query function.
 */
type ConvexCollectionWhereLimitQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection where limit query operation.
 */
type AdapterCollectionWhereLimitQueryProps = {
    service: AdapterService;
    collection: string;
    wherePlan: EnhancedParsedWhereFilter;
    limit: number;
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection where limit query operations.
 */
type ConvexCollectionWhereLimitQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionWhereLimitQuery>>;
/**
 * @function convexCollectionWhereLimitQuery
 * Creates a Convex query function to fetch filtered documents with a limit.
 *
 * @param {ConvexCollectionWhereLimitQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches limited filtered documents
 */
declare function convexCollectionWhereLimitQuery(props: ConvexCollectionWhereLimitQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    wherePlan?: any;
    collection: string;
    limit: number;
}, Promise<any[]>>;
/**
 * @function adapterCollectionWhereLimitQuery
 * Adapter-side function to fetch filtered documents with a limit.
 *
 * @param {AdapterCollectionWhereLimitQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {number} props.limit - Maximum number of documents to return
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWhereLimitQueryResult>} Array of limited filtered documents
 */
declare function adapterCollectionWhereLimitQuery(props: AdapterCollectionWhereLimitQueryProps): Promise<any[]>;
/**
 * Collection where limit query operation bundle containing both adapter and convex implementations.
 */
declare const collectionWhereLimitQuery: {
    adapter: typeof adapterCollectionWhereLimitQuery;
    convex: typeof convexCollectionWhereLimitQuery;
};
/**
 * Props for creating a Convex collection where paginate query function.
 */
type ConvexCollectionWherePaginateQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection where paginate query operation.
 */
type AdapterCollectionWherePaginateQueryProps = {
    service: AdapterService;
    collection: string;
    wherePlan: EnhancedParsedWhereFilter;
    paginationOpts: PaginationOptions;
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection where paginate query operations.
 */
type ConvexCollectionWherePaginateQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionWherePaginateQuery>>;
/**
 * @function convexCollectionWherePaginateQuery
 * Creates a Convex query function to fetch filtered documents with pagination.
 *
 * @param {ConvexCollectionWherePaginateQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches paginated filtered documents
 */
declare function convexCollectionWherePaginateQuery(props: ConvexCollectionWherePaginateQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    wherePlan?: any;
    collection: string;
    paginationOpts: {
        numItems: number;
        cursor: string | null;
    };
}, Promise<{
    page: any[];
    continueCursor: string;
    isDone: boolean;
}>>;
/**
 * @function adapterCollectionWherePaginateQuery
 * Adapter-side function to fetch filtered documents with pagination.
 *
 * @param {AdapterCollectionWherePaginateQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {PaginationOptions} props.paginationOpts - Pagination configuration
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWherePaginateQueryResult>} Paginated result with filtered documents
 */
declare function adapterCollectionWherePaginateQuery(props: AdapterCollectionWherePaginateQueryProps): Promise<{
    page: any[];
    continueCursor: string;
    isDone: boolean;
}>;
/**
 * Collection where paginate query operation bundle containing both adapter and convex implementations.
 */
declare const collectionWherePaginateQuery: {
    adapter: typeof adapterCollectionWherePaginateQuery;
    convex: typeof convexCollectionWherePaginateQuery;
};
/**
 * Props for creating a Convex collection where order limit query function.
 */
type ConvexCollectionWhereOrderLimitQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection where order limit query operation.
 */
type AdapterCollectionWhereOrderLimitQueryProps = {
    service: AdapterService;
    collection: string;
    wherePlan: EnhancedParsedWhereFilter;
    order: "asc" | "desc";
    limit: number;
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection where order limit query operations.
 */
type ConvexCollectionWhereOrderLimitQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionWhereOrderLimitQuery>>;
/**
 * @function convexCollectionWhereOrderLimitQuery
 * Creates a Convex query function to fetch filtered documents with ordering and limit.
 *
 * @param {ConvexCollectionWhereOrderLimitQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches limited filtered ordered documents
 */
declare function convexCollectionWhereOrderLimitQuery(props: ConvexCollectionWhereOrderLimitQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    wherePlan?: any;
    collection: string;
    limit: number;
    order: "asc" | "desc";
}, Promise<any[]>>;
/**
 * @function adapterCollectionWhereOrderLimitQuery
 * Adapter-side function to fetch filtered documents with ordering and limit.
 *
 * @param {AdapterCollectionWhereOrderLimitQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {number} props.limit - Maximum number of documents to return
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWhereOrderLimitQueryResult>} Array of limited filtered ordered documents
 */
declare function adapterCollectionWhereOrderLimitQuery(props: AdapterCollectionWhereOrderLimitQueryProps): Promise<any[]>;
/**
 * Collection where order limit query operation bundle containing both adapter and convex implementations.
 */
declare const collectionWhereOrderLimitQuery: {
    adapter: typeof adapterCollectionWhereOrderLimitQuery;
    convex: typeof convexCollectionWhereOrderLimitQuery;
};
/**
 * Props for creating a Convex collection where order paginate query function.
 */
type ConvexCollectionWhereOrderPaginateQueryProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side collection where order paginate query operation.
 */
type AdapterCollectionWhereOrderPaginateQueryProps = {
    service: AdapterService;
    collection: string;
    wherePlan: EnhancedParsedWhereFilter;
    order: "asc" | "desc";
    paginationOpts: PaginationOptions;
    index?: AdapaterQueryIndex;
};
/**
 * Result type for collection where order paginate query operations.
 */
type ConvexCollectionWhereOrderPaginateQueryResult = ExtractConvexQueryResult<ReturnType<typeof convexCollectionWhereOrderPaginateQuery>>;
/**
 * @function convexCollectionWhereOrderPaginateQuery
 * Creates a Convex query function to fetch filtered documents with ordering and pagination.
 * This is the most feature-complete query combining filtering, ordering, and pagination.
 *
 * @param {ConvexCollectionWhereOrderPaginateQueryProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredQuery} A Convex query function that fetches paginated filtered ordered documents
 */
declare function convexCollectionWhereOrderPaginateQuery(props: ConvexCollectionWhereOrderPaginateQueryProps): RegisteredQuery<"public", {
    index?: {
        indexRange?: any;
        indexName: string;
    } | null | undefined;
    wherePlan?: any;
    collection: string;
    order: "asc" | "desc";
    paginationOpts: {
        numItems: number;
        cursor: string | null;
    };
}, Promise<{
    page: any[];
    continueCursor: string;
    isDone: boolean;
}>>;
/**
 * @function adapterCollectionWhereOrderPaginateQuery
 * Adapter-side function to fetch filtered documents with ordering and pagination.
 *
 * @param {AdapterCollectionWhereOrderPaginateQueryProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {"asc" | "desc"} props.order - Sort order direction
 * @param {PaginationOptions} props.paginationOpts - Pagination configuration
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Promise<ConvexCollectionWhereOrderPaginateQueryResult>} Paginated result with filtered ordered documents
 */
declare function adapterCollectionWhereOrderPaginateQuery(props: AdapterCollectionWhereOrderPaginateQueryProps): Promise<{
    page: any[];
    continueCursor: string;
    isDone: boolean;
}>;
/**
 * Collection where order paginate query operation bundle containing both adapter and convex implementations.
 */
declare const collectionWhereOrderPaginateQuery: {
    adapter: typeof adapterCollectionWhereOrderPaginateQuery;
    convex: typeof convexCollectionWhereOrderPaginateQuery;
};
/**
 * Props for creating the Query Adapter factory.
 */
type QueryAdapterProps = {};
/**
 * @function QueryAdapter
 * Factory function that creates a Query Adapter instance with all available query operations.
 * This is the main entry point for accessing query functionality in the adapter.
 *
 * @param {QueryAdapterProps} props - Configuration options (currently empty)
 * @returns {Object} An object containing all query operation bundles:
 *   - getById: Fetch single document by ID
 *   - collectionQuery: Fetch all documents from collection
 *   - collectionCountQuery: Count documents with optional filtering
 *   - collectionWhereQuery: Fetch documents matching filter
 *   - collectionWhereOrderQuery: Fetch filtered documents with ordering
 *   - collectionWhereLimitQuery: Fetch filtered documents with limit
 *   - collectionWherePaginateQuery: Fetch filtered documents with pagination
 *   - collectionWhereOrderLimitQuery: Fetch filtered documents with ordering and limit
 *   - collectionWhereOrderPaginateQuery: Fetch filtered documents with ordering and pagination
 *   - collectionOrderQuery: Fetch documents with ordering
 *   - collectionOrderLimitQuery: Fetch documents with ordering and limit
 *   - collectionOrderPaginateQuery: Fetch documents with ordering and pagination
 *   - collectionLimitQuery: Fetch documents with limit
 */
declare function QueryAdapter(props: QueryAdapterProps): {
    getById: {
        adapter: typeof adapterGetById;
        convex: typeof convexGetById;
    };
    collectionQuery: {
        adapter: typeof adapterCollectionQuery;
        convex: typeof convexCollectionQuery;
    };
    collectionCountQuery: {
        adapter: typeof adapterCollectionCountQuery;
        convex: typeof convexCollectionCountQuery;
    };
    collectionWhereQuery: {
        adapter: typeof adapterCollectionWhereQuery;
        convex: typeof convexCollectionWhereQuery;
    };
    collectionWhereOrderQuery: {
        adapter: typeof adapterCollectionWhereOrderQuery;
        convex: typeof convexCollectionWhereOrderQuery;
    };
    collectionWhereLimitQuery: {
        adapter: typeof adapterCollectionWhereLimitQuery;
        convex: typeof convexCollectionWhereLimitQuery;
    };
    collectionWherePaginateQuery: {
        adapter: typeof adapterCollectionWherePaginateQuery;
        convex: typeof convexCollectionWherePaginateQuery;
    };
    collectionWhereOrderLimitQuery: {
        adapter: typeof adapterCollectionWhereOrderLimitQuery;
        convex: typeof convexCollectionWhereOrderLimitQuery;
    };
    collectionWhereOrderPaginateQuery: {
        adapter: typeof adapterCollectionWhereOrderPaginateQuery;
        convex: typeof convexCollectionWhereOrderPaginateQuery;
    };
    collectionOrderQuery: {
        adapter: typeof adapterCollectionOrderQuery;
        convex: typeof convexCollectionOrderQuery;
    };
    collectionOrderLimitQuery: {
        adapter: typeof adapterCollectionOrderLimitQuery;
        convex: typeof convexCollectionOrderLimitQuery;
    };
    collectionOrderPaginateQuery: {
        adapter: typeof adapterCollectionOrderPaginateQuery;
        convex: typeof convexCollectionOrderPaginateQuery;
    };
    collectionLimitQuery: {
        adapter: typeof adapterCollectionLimitQuery;
        convex: typeof convexCollectionLimitQuery;
    };
};

/**
 * Extracts the result type from a Convex mutation operation.
 * Handles nested Promise types and returns the unwrapped result.
 */
type ExtractConvexMutationResult<T> = T extends Promise<RegisteredMutation<any, any, Promise<infer R>>> ? R : T extends RegisteredMutation<any, any, Promise<infer R>> ? R : T extends Promise<RegisteredMutation<any, any, infer R>> ? R : T extends RegisteredMutation<any, any, infer R> ? R : T;
/**
 * Props for creating a Convex insert mutation function.
 */
type ConvexInsertProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side insert operation.
 */
type AdapterInsertProps = {
    service: AdapterService;
    collection: string;
    data: Record<string, unknown>;
};
/**
 * Result type for insert operations (returns the new document ID).
 */
type ConvexInsertResult = ExtractConvexMutationResult<ReturnType<typeof convexInsert>>;
/**
 * @function convexInsert
 * Creates a Convex mutation function to insert a new document into a collection.
 * Automatically applies the collection prefix from the service configuration.
 *
 * @param {ConvexInsertProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that inserts a document
 */
declare function convexInsert(props: ConvexInsertProps): RegisteredMutation<"public", {
    collection: string;
    data: any;
}, Promise<convex_values.GenericId<any>>>;
/**
 * @function adapterInsert
 * Adapter-side function to insert a new document into a collection.
 *
 * @template T - The type of the document data
 * @param {AdapterInsertProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {T} props.data - The document data to insert
 * @returns {Promise<ConvexInsertResult>} The ID of the newly inserted document
 */
declare function adapterInsert(props: AdapterInsertProps): Promise<string>;
/**
 * Insert operation bundle containing both adapter and convex implementations.
 */
declare const insert: {
    adapter: typeof adapterInsert;
    convex: typeof convexInsert;
};
/**
 * Props for creating a Convex getByIdMutation function.
 */
type ConvexGetByIdMutationProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side getByIdMutation operation.
 */
type AdapterGetByIdMutationProps = {
    service: AdapterService;
    collection: string;
    id: string;
};
/**
 * Result type for getByIdMutation operations.
 */
type ConvexGetByIdMutationResult = ExtractConvexMutationResult<ReturnType<typeof convexGetByIdMutation>>;
/**
 * @function convexGetByIdMutation
 * Creates a Convex mutation function to fetch a document by ID within a mutation context.
 * Useful when you need to read data as part of a transactional operation.
 * Returns the document in Payload format (with id instead of _id, etc.).
 *
 * @param {ConvexGetByIdMutationProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that fetches a document by ID
 */
declare function convexGetByIdMutation(props: ConvexGetByIdMutationProps): RegisteredMutation<"public", {
    collection: string;
    id: string;
}, Promise<any>>;
/**
 * @function adapterGetByIdMutation
 * Adapter-side function to fetch a document by ID within a mutation context.
 *
 * @param {AdapterGetByIdMutationProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {string} props.id - The document ID to fetch
 * @returns {Promise<ConvexGetByIdMutationResult>} The fetched document or null
 */
declare function adapterGetByIdMutation(props: AdapterGetByIdMutationProps): Promise<any>;
/**
 * GetByIdMutation operation bundle containing both adapter and convex implementations.
 */
declare const getByIdMutation: {
    adapter: typeof adapterGetByIdMutation;
    convex: typeof convexGetByIdMutation;
};
/**
 * Props for creating a Convex patch mutation function.
 */
type ConvexPatchProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side patch operation.
 */
type AdapterPatchProps<T> = {
    service: AdapterService;
    id: string;
    data: Partial<T>;
};
/**
 * Result type for patch operations.
 */
type ConvexPatchResult = ExtractConvexMutationResult<ReturnType<typeof convexPatch>>;
/**
 * @function convexPatch
 * Creates a Convex mutation function to partially update a document.
 * Only the specified fields are updated, leaving other fields unchanged.
 *
 * @param {ConvexPatchProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that patches a document
 */
declare function convexPatch(props: ConvexPatchProps): RegisteredMutation<"public", {
    id?: string | undefined;
    data: any;
}, Promise<void>>;
/**
 * @function adapterPatch
 * Adapter-side function to partially update a document.
 *
 * @template T - The type of the document data
 * @param {AdapterPatchProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.id - The document ID to update
 * @param {Partial<T>} props.data - The partial data to merge into the document
 * @returns {Promise<ConvexPatchResult>} The result of the patch operation
 */
declare function adapterPatch<T>(props: AdapterPatchProps<T>): Promise<void>;
/**
 * Patch operation bundle containing both adapter and convex implementations.
 */
declare const patch: {
    adapter: typeof adapterPatch;
    convex: typeof convexPatch;
};
/**
 * Props for creating a Convex replace mutation function.
 */
type ConvexReplaceProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side replace operation.
 */
type AdapterReplaceProps<T> = {
    service: AdapterService;
    id: string;
    data: T;
};
/**
 * Result type for replace operations.
 */
type ConvexReplaceResult = ExtractConvexMutationResult<ReturnType<typeof convexReplace>>;
/**
 * @function convexReplace
 * Creates a Convex mutation function to completely replace a document.
 * The entire document is replaced with the new data, removing any fields not specified.
 *
 * @param {ConvexReplaceProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that replaces a document
 */
declare function convexReplace(props: ConvexReplaceProps): RegisteredMutation<"public", {
    id: string;
    data: any;
}, Promise<void>>;
/**
 * @function adapterReplace
 * Adapter-side function to completely replace a document.
 *
 * @template T - The type of the document data
 * @param {AdapterReplaceProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.id - The document ID to replace
 * @param {T} props.data - The new document data
 * @returns {Promise<ConvexReplaceResult>} The result of the replace operation
 */
declare function adapterReplace<T>(props: AdapterReplaceProps<T>): Promise<void>;
/**
 * Replace operation bundle containing both adapter and convex implementations.
 */
declare const replace: {
    adapter: typeof adapterReplace;
    convex: typeof convexReplace;
};
/**
 * Props for creating a Convex delete mutation function.
 */
type ConvexDeleteProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side delete operation.
 */
type AdapterDeleteProps = {
    service: AdapterService;
    id: string;
};
/**
 * Result type for delete operations.
 */
type ConvexDeleteResult = ExtractConvexMutationResult<ReturnType<typeof convexDelete>>;
/**
 * @function convexDelete
 * Creates a Convex mutation function to delete a document by ID.
 *
 * @param {ConvexDeleteProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that deletes a document
 */
declare function convexDelete(props: ConvexDeleteProps): RegisteredMutation<"public", {
    id: string;
}, Promise<void>>;
/**
 * @function adapterDelete
 * Adapter-side function to delete a document by ID.
 *
 * @param {AdapterDeleteProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.id - The document ID to delete
 * @returns {Promise<ConvexDeleteResult>} The result of the delete operation
 */
declare function adapterDelete(props: AdapterDeleteProps): Promise<void>;
/**
 * Delete operation bundle containing both adapter and convex implementations.
 * Named `deleteOp` to avoid conflict with JavaScript's reserved `delete` keyword.
 */
declare const deleteOp: {
    adapter: typeof adapterDelete;
    convex: typeof convexDelete;
};
/**
 * Props for creating a Convex upsert mutation function.
 */
type ConvexUpsertProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side upsert operation.
 */
type AdapterUpsertProps<T> = {
    service: AdapterService;
    collection: string;
    id?: string;
    data: T;
};
/**
 * Result type for upsert operations.
 */
type ConvexUpsertResult = ExtractConvexMutationResult<ReturnType<typeof convexUpsert>>;
/**
 * @function convexUpsert
 * Creates a Convex mutation function to insert or update a document.
 * If an ID is provided and the document exists, it will be patched.
 * Otherwise, a new document will be inserted.
 *
 * @param {ConvexUpsertProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that upserts a document
 */
declare function convexUpsert(props: ConvexUpsertProps): RegisteredMutation<"public", {
    id?: string | undefined;
    collection: string;
    data: any;
}, Promise<void | convex_values.GenericId<any>>>;
/**
 * @function adapterUpsert
 * Adapter-side function to insert or update a document.
 *
 * @template T - The type of the document data
 * @param {AdapterUpsertProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {string} [props.id] - Optional document ID for update
 * @param {T} props.data - The document data
 * @returns {Promise<ConvexUpsertResult>} The ID of the upserted document or void if patched
 */
declare function adapterUpsert<T>(props: AdapterUpsertProps<T>): Promise<void | convex_values.GenericId<any>>;
/**
 * Upsert operation bundle containing both adapter and convex implementations.
 */
declare const upsert: {
    adapter: typeof adapterUpsert;
    convex: typeof convexUpsert;
};
/**
 * Props for creating a Convex updateManyWhere mutation function.
 */
type ConvexUpdateManyWhereProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side updateManyWhere operation.
 */
type AdapterUpdateManyWhereProps<T> = {
    service: AdapterService;
    collection: string;
    wherePlan: EnhancedParsedWhereFilter;
    data: Partial<T>;
};
/**
 * Result type for updateManyWhere operations.
 */
type ConvexUpdateManyWhereResult = ExtractConvexMutationResult<ReturnType<typeof convexUpdateManyWhere>>;
/**
 * @function convexUpdateManyWhere
 * Creates a Convex mutation function to update multiple documents matching a filter.
 * Uses the ParsedWhereFilter system for type-safe filtering.
 *
 * @param {ConvexUpdateManyWhereProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that updates matching documents
 */
declare function convexUpdateManyWhere(props: ConvexUpdateManyWhereProps): RegisteredMutation<"public", {
    wherePlan?: any;
    collection: string;
    data: any;
}, Promise<number>>;
/**
 * @function adapterUpdateManyWhere
 * Adapter-side function to update multiple documents matching a filter.
 *
 * @template T - The type of the document data
 * @param {AdapterUpdateManyWhereProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @param {Partial<T>} props.data - The partial data to merge into matching documents
 * @returns {Promise<ConvexUpdateManyWhereResult>} Array of update results
 */
declare function adapterUpdateManyWhere<T>(props: AdapterUpdateManyWhereProps<T>): Promise<number>;
/**
 * UpdateManyWhere operation bundle containing both adapter and convex implementations.
 */
declare const updateManyWhere: {
    adapter: typeof adapterUpdateManyWhere;
    convex: typeof convexUpdateManyWhere;
};
/**
 * Props for creating a Convex deleteManyWhere mutation function.
 */
type ConvexDeleteManyWhereProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side deleteManyWhere operation.
 */
type AdapterDeleteManyWhereProps = {
    service: AdapterService;
    collection: string;
    wherePlan: EnhancedParsedWhereFilter;
};
/**
 * Result type for deleteManyWhere operations.
 */
type ConvexDeleteManyWhereResult = ExtractConvexMutationResult<ReturnType<typeof convexDeleteManyWhere>>;
/**
 * @function convexDeleteManyWhere
 * Creates a Convex mutation function to delete multiple documents matching a filter.
 * Uses the ParsedWhereFilter system for type-safe filtering.
 *
 * @param {ConvexDeleteManyWhereProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that deletes matching documents
 */
declare function convexDeleteManyWhere(props: ConvexDeleteManyWhereProps): RegisteredMutation<"public", {
    wherePlan?: any;
    collection: string;
}, Promise<void[]>>;
/**
 * @function adapterDeleteManyWhere
 * Adapter-side function to delete multiple documents matching a filter.
 *
 * @param {AdapterDeleteManyWhereProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name
 * @param {ParsedWhereFilter} props.wherePlan - The parsed where filter
 * @returns {Promise<ConvexDeleteManyWhereResult>} Array of delete results
 */
declare function adapterDeleteManyWhere(props: AdapterDeleteManyWhereProps): Promise<void[]>;
/**
 * DeleteManyWhere operation bundle containing both adapter and convex implementations.
 */
declare const deleteManyWhere: {
    adapter: typeof adapterDeleteManyWhere;
    convex: typeof convexDeleteManyWhere;
};
/**
 * Props for creating a Convex increment mutation function.
 */
type ConvexIncrementProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side increment operation.
 */
type AdapterIncrementProps = {
    service: AdapterService;
    id: string;
    field: string;
    amount: number;
};
/**
 * Result type for increment operations.
 */
type ConvexIncrementResult = ExtractConvexMutationResult<ReturnType<typeof convexIncrement>>;
/**
 * @function convexIncrement
 * Creates a Convex mutation function to atomically increment a numeric field.
 * This is useful for counters, scores, and other numeric values that need atomic updates.
 * Handles field name normalization (adds payvex_ prefix for user fields).
 *
 * @param {ConvexIncrementProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that increments a field
 */
declare function convexIncrement(props: ConvexIncrementProps): RegisteredMutation<"public", {
    field: string;
    id: string;
    amount: number;
}, Promise<void | null>>;
/**
 * @function adapterIncrement
 * Adapter-side function to atomically increment a numeric field.
 *
 * @param {AdapterIncrementProps} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.id - The document ID
 * @param {string} props.field - The field name to increment
 * @param {number} props.amount - The amount to add (can be negative for decrement)
 * @returns {Promise<ConvexIncrementResult>} The result of the increment operation or null if document not found
 */
declare function adapterIncrement(props: AdapterIncrementProps): Promise<void | null>;
/**
 * Increment operation bundle containing both adapter and convex implementations.
 */
declare const increment: {
    adapter: typeof adapterIncrement;
    convex: typeof convexIncrement;
};
/**
 * Props for creating a Convex transactional mutation function.
 */
type ConvexTransactionalProps = {
    service: AdapterService;
};
/**
 * Props for the adapter-side transactional operation.
 */
type AdapterTransactionalProps<T> = {
    service: AdapterService;
    run: (ctx: GenericMutationCtx<GenericDataModel>) => Promise<T>;
};
/**
 * Result type for transactional operations.
 */
type ConvexTransactionalResult = ExtractConvexMutationResult<ReturnType<typeof convexTransactional>>;
/**
 * @function convexTransactional
 * Creates a Convex mutation function to run custom transactional logic.
 * Allows executing arbitrary mutation logic within a Convex transaction context.
 *
 * @param {ConvexTransactionalProps} props - The function configuration
 * @param {AdapterService} props.service - The adapter service instance
 * @returns {RegisteredMutation} A Convex mutation function that runs transactional logic
 */
declare function convexTransactional(props: ConvexTransactionalProps): RegisteredMutation<"public", {
    run: any;
}, Promise<any>>;
/**
 * @function adapterTransactional
 * Adapter-side function to run custom transactional logic.
 *
 * @template T - The return type of the transactional function
 * @param {AdapterTransactionalProps<T>} props - The operation parameters
 * @param {AdapterService} props.service - The adapter service instance
 * @param {Function} props.run - The function to execute within the transaction
 * @returns {Promise<ConvexTransactionalResult>} The result of the transactional function
 */
declare function adapterTransactional<T>(props: AdapterTransactionalProps<T>): Promise<any>;
/**
 * Transactional operation bundle containing both adapter and convex implementations.
 */
declare const transactional: {
    adapter: typeof adapterTransactional;
    convex: typeof convexTransactional;
};
/**
 * Props for creating the Mutation Adapter factory.
 */
type MutationAdapterProps = {};
/**
 * @function MutationAdapter
 * Factory function that creates a Mutation Adapter instance with all available mutation operations.
 * This is the main entry point for accessing mutation functionality in the adapter.
 *
 * @param {MutationAdapterProps} props - Configuration options (currently empty)
 * @returns {Object} An object containing all mutation operation bundles:
 *   - insert: Insert a new document
 *   - getByIdMutation: Fetch document by ID in mutation context
 *   - patch: Partially update a document
 *   - replace: Completely replace a document
 *   - deleteOp: Delete a document by ID
 *   - upsert: Insert or update a document
 *   - updateManyWhere: Update multiple documents matching a filter
 *   - deleteManyWhere: Delete multiple documents matching a filter
 *   - increment: Atomically increment a numeric field
 *   - transactional: Run custom transactional logic
 */
declare function MutationAdapter(props: MutationAdapterProps): {
    insert: {
        adapter: typeof adapterInsert;
        convex: typeof convexInsert;
    };
    getByIdMutation: {
        adapter: typeof adapterGetByIdMutation;
        convex: typeof convexGetByIdMutation;
    };
    patch: {
        adapter: typeof adapterPatch;
        convex: typeof convexPatch;
    };
    replace: {
        adapter: typeof adapterReplace;
        convex: typeof convexReplace;
    };
    deleteOp: {
        adapter: typeof adapterDelete;
        convex: typeof convexDelete;
    };
    upsert: {
        adapter: typeof adapterUpsert;
        convex: typeof convexUpsert;
    };
    updateManyWhere: {
        adapter: typeof adapterUpdateManyWhere;
        convex: typeof convexUpdateManyWhere;
    };
    deleteManyWhere: {
        adapter: typeof adapterDeleteManyWhere;
        convex: typeof convexDeleteManyWhere;
    };
    increment: {
        adapter: typeof adapterIncrement;
        convex: typeof convexIncrement;
    };
    transactional: {
        adapter: typeof adapterTransactional;
        convex: typeof convexTransactional;
    };
};

export { type ConvexGetByIdMutationResult as $, type AdapaterQueryIndex as A, type ConvexCollectionOrderLimitQueryProps as B, type ConvexCollectionCountQueryProps as C, type ConvexCollectionOrderLimitQueryResult as D, type ConvexCollectionOrderPaginateQueryProps as E, type ConvexCollectionOrderPaginateQueryResult as F, type ConvexCollectionOrderQueryProps as G, type ConvexCollectionOrderQueryResult as H, type ConvexCollectionQueryProps as I, type ConvexCollectionQueryResult as J, type ConvexCollectionWhereLimitQueryProps as K, type ConvexCollectionWhereLimitQueryResult as L, type ConvexCollectionWhereOrderLimitQueryProps as M, type ConvexCollectionWhereOrderLimitQueryResult as N, type ConvexCollectionWhereOrderPaginateQueryProps as O, type ConvexCollectionWhereOrderPaginateQueryResult as P, type ConvexCollectionWhereOrderQueryProps as Q, type ConvexCollectionWhereOrderQueryResult as R, type ConvexCollectionWherePaginateQueryProps as S, type ConvexCollectionWherePaginateQueryResult as T, type ConvexCollectionWhereQueryProps as U, type ConvexCollectionWhereQueryResult as V, type ConvexDeleteManyWhereProps as W, type ConvexDeleteManyWhereResult as X, type ConvexDeleteProps as Y, type ConvexDeleteResult as Z, type ConvexGetByIdMutationProps as _, type AdapterCollectionCountQueryProps as a, convexCollectionQuery as a$, type ConvexGetByIdProps as a0, type ConvexGetByIdResult as a1, type ConvexIncrementProps as a2, type ConvexIncrementResult as a3, type ConvexInsertProps as a4, type ConvexInsertResult as a5, type ConvexPatchProps as a6, type ConvexPatchResult as a7, type ConvexReplaceProps as a8, type ConvexReplaceResult as a9, adapterDeleteManyWhere as aA, adapterGetById as aB, adapterGetByIdMutation as aC, adapterIncrement as aD, adapterInsert as aE, adapterPatch as aF, adapterReplace as aG, adapterTransactional as aH, adapterUpdateManyWhere as aI, adapterUpsert as aJ, collectionCountQuery as aK, collectionLimitQuery as aL, collectionOrderLimitQuery as aM, collectionOrderPaginateQuery as aN, collectionOrderQuery as aO, collectionQuery as aP, collectionWhereLimitQuery as aQ, collectionWhereOrderLimitQuery as aR, collectionWhereOrderPaginateQuery as aS, collectionWhereOrderQuery as aT, collectionWherePaginateQuery as aU, collectionWhereQuery as aV, convexCollectionCountQuery as aW, convexCollectionLimitQuery as aX, convexCollectionOrderLimitQuery as aY, convexCollectionOrderPaginateQuery as aZ, convexCollectionOrderQuery as a_, type ConvexTransactionalProps as aa, type ConvexTransactionalResult as ab, type ConvexUpdateManyWhereProps as ac, type ConvexUpdateManyWhereResult as ad, type ConvexUpsertProps as ae, type ConvexUpsertResult as af, type ExtractConvexGetResult as ag, type ExtractConvexMutationResult as ah, type ExtractConvexQueryResult as ai, MutationAdapter as aj, type MutationAdapterProps as ak, QueryAdapter as al, type QueryAdapterProps as am, adapterCollectionCountQuery as an, adapterCollectionLimitQuery as ao, adapterCollectionOrderLimitQuery as ap, adapterCollectionOrderPaginateQuery as aq, adapterCollectionOrderQuery as ar, adapterCollectionQuery as as, adapterCollectionWhereLimitQuery as at, adapterCollectionWhereOrderLimitQuery as au, adapterCollectionWhereOrderPaginateQuery as av, adapterCollectionWhereOrderQuery as aw, adapterCollectionWherePaginateQuery as ax, adapterCollectionWhereQuery as ay, adapterDelete as az, type AdapterCollectionLimitQueryProps as b, convexCollectionWhereLimitQuery as b0, convexCollectionWhereOrderLimitQuery as b1, convexCollectionWhereOrderPaginateQuery as b2, convexCollectionWhereOrderQuery as b3, convexCollectionWherePaginateQuery as b4, convexCollectionWhereQuery as b5, convexDelete as b6, convexDeleteManyWhere as b7, convexGetById as b8, convexGetByIdMutation as b9, convexIncrement as ba, convexInsert as bb, convexPatch as bc, convexReplace as bd, convexTransactional as be, convexUpdateManyWhere as bf, convexUpsert as bg, deleteManyWhere as bh, deleteOp as bi, getById as bj, getByIdMutation as bk, increment as bl, insert as bm, patch as bn, replace as bo, transactional as bp, updateManyWhere as bq, upsert as br, bindings as bs, type SessionTracker as bt, createRandomID as bu, parseCollection as bv, queryProcessor as bw, createWherePlan as bx, emptyWherePlan as by, type ServiceLogger as bz, type AdapterCollectionOrderLimitQueryProps as c, type AdapterCollectionOrderPaginateQueryProps as d, type AdapterCollectionOrderQueryProps as e, type AdapterCollectionQueryProps as f, type AdapterCollectionWhereLimitQueryProps as g, type AdapterCollectionWhereOrderLimitQueryProps as h, type AdapterCollectionWhereOrderPaginateQueryProps as i, type AdapterCollectionWhereOrderQueryProps as j, type AdapterCollectionWherePaginateQueryProps as k, type AdapterCollectionWhereQueryProps as l, type AdapterDeleteManyWhereProps as m, type AdapterDeleteProps as n, type AdapterGetByIdMutationProps as o, type AdapterGetByIdProps as p, type AdapterIncrementProps as q, type AdapterInsertProps as r, type AdapterPatchProps as s, type AdapterReplaceProps as t, type AdapterTransactionalProps as u, type AdapterUpdateManyWhereProps as v, type AdapterUpsertProps as w, type ConvexCollectionCountQueryResult as x, type ConvexCollectionLimitQueryProps as y, type ConvexCollectionLimitQueryResult as z };
