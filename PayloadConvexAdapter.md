# Payload Convex Adapter - Technical Documentation

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Type Definitions](#type-definitions)
- [Data Flow](#data-flow)
- [Implementation Details](#implementation-details)
- [Transaction System](#transaction-system)
- [Query Processing](#query-processing)
- [Collection Naming](#collection-naming)

---

## Architecture Overview

The Payload Convex Adapter provides a bridge between Payload CMS's database operations and Convex's real-time database platform. The architecture follows a layered service-based design:

```
┌─────────────────────────────────────────────────────────────┐
│                    Payload CMS Core                         │
│              (Collections, Globals, Admin)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Adapter Layer                     │
│                  (convexAdapter function)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Transaction Bindings  │  CRUD Bindings               │  │
│  │ - beginTransaction    │  - create/createGlobal       │  │
│  │ - commitTransaction   │  - find/findOne              │  │
│  │ - rollbackTransaction │  - update/updateMany         │  │
│  │                       │  - delete/deleteMany         │  │
│  │                       │  - count/countVersions       │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Adapter Service Layer                     │
│                (createAdapterService)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Convex Client Management                           │  │
│  │ • Session Tracking                                   │  │
│  │ • Collection Parsing                                 │  │
│  │ • Query Processing                                   │  │
│  │ • Error Handling                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Convex Query/Mutation Layer                    │
│         (QueryAdapter & MutationAdapter)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Queries:                  Mutations:                 │  │
│  │ • getById                 • insert                   │  │
│  │ • collectionQuery         • patch                    │  │
│  │ • collectionWhereQuery    • replace                  │  │
│  │ • collectionOrderQuery    • deleteOp                 │  │
│  │ • collectionCountQuery    • upsert                   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Convex Database                            │
│                (Real-time Serverless DB)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Adapter Factory (`convexAdapter`)

The main entry point that creates a Payload database adapter.

```typescript
/**
 * Factory function that creates a Convex-based database adapter for Payload
 * 
 * @param props - Configuration for the Convex adapter
 * @returns A Payload database adapter object
 */
function convexAdapter(props: PayloadConvexAdapterProps): convexAdapter

type PayloadConvexAdapterProps = {
  convexUrl: string          // e.g., "https://valuable-salamander-162.convex.cloud"
  convexDeployment: string   // e.g., "dev:valuable-salamander-162"
  prefix: string             // e.g., "my_app"
}

type convexAdapter = DatabaseAdapterObj<BaseDatabaseAdapter>
```

**Key Responsibilities:**
- Initializes the adapter service with Convex client
- Binds all Payload database operations to Convex functions
- Manages transaction lifecycle
- Handles collection and global operations

### 2. Adapter Service (`createAdapterService`)

The service layer that manages the Convex client and provides utilities.

```typescript
type AdapterService = {
  convexUrl: string
  convexDeployment: string
  prefix: string
  payload: Payload
  
  db: {
    bindings: {
      transactions: TransactionBindings
      counts: CountBindings
      creates: CreateBindings
      finds: FindBindings
      deletes: DeleteBindings
      updates: UpdateBindings
      upserts: UpsertBindings
      drafts: DraftBindings
      migrations: MigrationBindings
    }
  }
  
  utils: {
    convexClient: ConvexHttpClient
    sessionTracker: SessionTracker
    queryProcessor: QueryProcessor
    collectionParser: CollectionParser
    logger: Logger
  }
}
```

**Key Responsibilities:**
- Manages Convex HTTP client instance
- Tracks transaction sessions
- Processes where clauses and queries
- Parses collection configurations
- Provides logging and error handling

### 3. Safe Adapter Service (`createConvexSafeAdapterService`)

A specialized version of the adapter service for use in Convex functions.

```typescript
function createConvexSafeAdapterService(
  config: PayloadConvexConfig & { payload: any }
): SafeAdapterService

type SafeAdapterService = {
  convexUrl: string
  convexDeployment: string
  prefix: string
  // No Convex client or session tracker
  // (these are managed by Convex runtime)
}
```

**Key Responsibilities:**
- Provides service interface for Convex functions
- Avoids circular dependencies
- Lightweight for serverless execution

### 4. Query & Mutation Adapters

Provide the actual Convex query and mutation implementations.

```typescript
// Query Adapter
const queryAdapter = QueryAdapter({})

type QueryAdapterMethods = {
  getById: ConvexFunction<{ id: string, collection: string }, Document>
  collectionQuery: ConvexFunction<{ collection: string }, Document[]>
  collectionWhereQuery: ConvexFunction<{ collection: string, where: Where }, Document[]>
  collectionOrderQuery: ConvexFunction<{ collection: string, sort: Sort }, Document[]>
  collectionCountQuery: ConvexFunction<{ collection: string }, number>
  collectionWhereLimitQuery: ConvexFunction<QueryParams, Document[]>
  collectionWherePaginateQuery: ConvexFunction<QueryParams, PaginatedResult>
  // ... more query methods
}

// Mutation Adapter
const mutationAdapter = MutationAdapter({})

type MutationAdapterMethods = {
  insert: ConvexFunction<{ collection: string, document: any }, Document>
    // Automatically filters _id and _creationTime before insert
  patch: ConvexFunction<{ collection: string, id: string, updates: any }, Document>
    // Filters _id and _creationTime (read-only fields)
  replace: ConvexFunction<{ collection: string, id: string, document: any }, Document>
  deleteOp: ConvexFunction<{ collection: string, id: string }, void>
  upsert: ConvexFunction<{ collection: string, document: any }, Document>
    // Automatically filters _id and _creationTime before insert/patch
  updateManyWhere: ConvexFunction<UpdateManyParams, { count: number }>
  deleteManyWhere: ConvexFunction<DeleteManyParams, number>
    // Returns count of deleted documents (not array of undefined values)
    // Fixed to return docs.length instead of Promise.all results
  increment: ConvexFunction<IncrementParams, Document>
  transactional: ConvexFunction<TransactionParams, any>
}
```

---

## Type Definitions

### Configuration Types

```typescript
/**
 * Configuration for the Convex adapter
 */
type PayloadConvexConfig = {
  convexUrl: string          // Convex deployment URL
  convexDeployment: string   // Deployment identifier
  prefix: string             // Table prefix for multi-tenancy
}

type PayloadConvexAdapterProps = PayloadConvexConfig
```

### Binding Types

```typescript
/**
 * Transaction operation bindings
 */
type TransactionBindings = {
  beginTransaction: (args: { service: AdapterService }) => Promise<string>
  commitTransaction: (args: { service: AdapterService, incomingID: string }) => Promise<void>
  rollbackTransaction: (args: { service: AdapterService, incomingID: string }) => Promise<void>
}

/**
 * CRUD operation bindings
 */
type CreateBindings = {
  create: (args: { service: AdapterService, incomingCreate: CreateArgs }) => Promise<Document>
  createGlobal: (args: { service: AdapterService, incomingCreateGlobal: CreateGlobalArgs }) => Promise<Document>
  createVersion: (args: { service: AdapterService, incomingCreateVersion: CreateVersionArgs }) => Promise<VersionDoc>
  createGlobalVersion: (args: { service: AdapterService, incomingCreateGlobalVersion: CreateGlobalVersionArgs }) => Promise<VersionDoc>
  createMigration: (args: { service: AdapterService, incomingCreateMigration: MigrationArgs }) => Promise<void>
}

type FindBindings = {
  find: (args: { service: AdapterService, incomingFind: FindArgs }) => Promise<PaginatedDocs>
  findOne: (args: { service: AdapterService, incomingFindOne: FindOneArgs }) => Promise<Document | null>
  findDistinct: (args: { service: AdapterService, incomingFindDistinct: FindDistinctArgs }) => Promise<any[]>
  findGlobal: (args: { service: AdapterService, incomingFindGlobal: FindGlobalArgs }) => Promise<Document | null>
  findVersions: (args: { service: AdapterService, incomingFindVersions: FindVersionsArgs }) => Promise<PaginatedDocs<VersionDoc>>
  findGlobalVersions: (args: { service: AdapterService, incomingFindGlobalVersions: FindGlobalVersionsArgs }) => Promise<PaginatedDocs<VersionDoc>>
}

type UpdateBindings = {
  updateOne: (args: { service: AdapterService, incomingUpdateOne: UpdateOneArgs }) => Promise<Document>
  updateMany: (args: { service: AdapterService, incomingUpdateMany: UpdateManyArgs }) => Promise<{ count: number }>
  updateGlobal: (args: { service: AdapterService, incomingUpdateGlobal: UpdateGlobalArgs }) => Promise<Document>
  updateVersion: (args: { service: AdapterService, incomingUpdateVersion: UpdateVersionArgs }) => Promise<VersionDoc>
  updateGlobalVersion: (args: { service: AdapterService, incomingUpdateGlobalVersion: UpdateGlobalVersionArgs }) => Promise<VersionDoc>
  updateJobs: (args: { service: AdapterService, incomingUpdateJobs: UpdateJobsArgs }) => Promise<void>
}

type DeleteBindings = {
  deleteOne: (args: { service: AdapterService, incomingDeleteOne: DeleteOneArgs }) => Promise<Document>
  deleteMany: (args: { service: AdapterService, incomingDeleteMany: DeleteManyArgs }) => Promise<{ count: number }>
  deleteVersions: (args: { service: AdapterService, incomingDeleteVersions: DeleteVersionsArgs }) => Promise<void>
}

type CountBindings = {
  count: (args: { service: AdapterService, incomingCount: CountArgs }) => Promise<{ totalDocs: number }>
  countVersions: (args: { service: AdapterService, incomingCountVersions: CountVersionsArgs }) => Promise<{ totalDocs: number }>
  countGlobalVersions: (args: { service: AdapterService, incomingCountGlobalVersions: CountGlobalVersionsArgs }) => Promise<{ totalDocs: number }>
}

type UpsertBindings = {
  upsert: (args: { service: AdapterService, incomingUpsert: UpsertArgs }) => Promise<Document>
}

type DraftBindings = {
  queryDrafts: (args: { service: AdapterService, incomingQueryDrafts: QueryDraftsArgs }) => Promise<PaginatedDocs>
}

type MigrationBindings = {
  migrate: (args: { service: AdapterService, incomingMigrate: MigrateArgs }) => Promise<void>
  migrateDown: (args: { service: AdapterService }) => Promise<void>
  migrateFresh: (args: { service: AdapterService, incomingMigrateFresh: MigrateFreshArgs }) => Promise<void>
  migrateRefresh: (args: { service: AdapterService }) => Promise<void>
  migrateReset: (args: { service: AdapterService }) => Promise<void>
  migrateStatus: (args: { service: AdapterService }) => Promise<MigrationStatus>
}
```

### Query Types

```typescript
/**
 * Where clause types for filtering
 */
type Where = {
  [field: string]: WhereCondition | Where
  and?: Where[]
  or?: Where[]
}

type WhereCondition = 
  | { equals: any }
  | { not_equals: any }
  | { in: any[] }
  | { not_in: any[] }
  | { exists: boolean }
  | { greater_than: number | Date }
  | { greater_than_equal: number | Date }
  | { less_than: number | Date }
  | { less_than_equal: number | Date }
  | { like: string }
  | { contains: string }
  | { near: GeoPoint }

/**
 * Sort configuration
 */
type Sort = {
  [field: string]: 'asc' | 'desc'
}

/**
 * Pagination types
 */
type PaginationArgs = {
  page?: number
  limit?: number
}

type PaginatedDocs<T = Document> = {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}
```

### Document Types

```typescript
/**
 * Base document type
 */
type Document = {
  id: string
  _id?: string
  createdAt: string | Date
  updatedAt: string | Date
  [key: string]: any
}

/**
 * Version document type
 */
type VersionDoc = {
  id: string
  parent: string
  version: Record<string, any>
  createdAt: string | Date
  updatedAt: string | Date
}

/**
 * Global document type
 */
type GlobalDoc = {
  id: string
  globalType: string
  [key: string]: any
}
```

---

## Data Flow

### Read Operation Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Payload calls adapter.find({ collection, where, sort })  │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Adapter bindings process the request:                    │
│    • Parse collection config                                │
│    • Transform where clause to serializable format          │
│    • Apply table prefix                                     │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Service layer prepares Convex function call:             │
│    • Select appropriate query function                       │
│    • Serialize parameters                                    │
│    • Add session context if in transaction                   │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Convex executes query:                                   │
│    • Load table data                                         │
│    • Apply filters and sorting                               │
│    • Paginate results                                        │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Results flow back:                                       │
│    • Convex returns documents                                │
│    • Adapter transforms to Payload format                    │
│    • Payload processes for API response                      │
└──────────────────────────────────────────────────────────────┘
```

### Write Operation Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Payload calls adapter.create({ collection, data })       │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Adapter validates and prepares:                          │
│    • Generate ID if needed                                   │
│    • Add timestamps (createdAt, updatedAt)                   │
│    • Transform Payload fields to Convex format               │
│    • Apply table prefix                                     │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. System field filtering:                                 │
│    • Filter out _id (Convex auto-generates)                  │
│    • Filter out _creationTime (Convex auto-generates)         │
│    • Prepare insertable data                                 │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Transaction handling:                                    │
│    • Check if in active transaction session                  │
│    • Add session ID to mutation parameters                   │
│    • Queue operation if needed                               │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Convex mutation executes:                                │
│    • Validate document against schema                        │
│    • Insert into Convex table (with auto-generated _id)     │
│    • Convex sets _creationTime automatically                 │
│    • Update indexes                                          │
│    • Return created document                                 │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. Post-processing:                                         │
│    • Transform document to Payload format                    │
│    • Map _id → id, _creationTime → createdAt                  │
│    • Trigger Payload hooks                                   │
│    • Return to caller                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### System Field Handling

Convex automatically manages certain system fields that cannot be provided during insert operations. The adapter handles this transparently:

**Convex System Fields:**
- `_id` - Document identifier (auto-generated by Convex)
- `_creationTime` - Document creation timestamp (auto-generated by Convex)

**Field Transformation:**
The adapter transforms Payload field names to Convex format:
- `id` → `_id` (for queries/reads)
- `createdAt` → `_creationTime` (for queries/reads)

**Filtering During Inserts:**
During insert and upsert operations, the adapter automatically filters out `_id` and `_creationTime` fields before sending data to Convex:

```typescript
// Payload data (may include id/createdAt)
const payloadData = {
  id: "user_123",           // Will be filtered on insert
  createdAt: new Date(),    // Will be filtered on insert
  name: "John",
  email: "john@example.com"
}

// After adapter processing (insertableData)
const insertableData = {
  name: "John",
  email: "john@example.com"
  // _id and _creationTime are excluded
}

// Convex automatically adds:
// - _id: "q975ab0z7g10fwyd4j223whhcd80jnee"
// - _creationTime: 1770330742809.0
```

**Implementation:**
```typescript
// In adapterInsert and adapterUpsert
const insertableData: Record<string, any> = {};
for (const [key, value] of Object.entries(compiledData)) {
  // Skip Convex system fields - they are auto-generated
  if (key === "_id" || key === "_creationTime") {
    continue;
  }
  insertableData[key] = value;
}
```

This ensures that:
1. Payload can include `id` or `createdAt` in data without errors
2. Convex receives clean data without system fields
3. Convex auto-generates `_id` and `_creationTime` correctly
4. Results are transformed back to Payload format (`_id` → `id`, `_creationTime` → `createdAt`)

### Collection Naming Strategy

The adapter uses a prefix-based naming system to avoid conflicts in shared Convex deployments:

```typescript
// Configuration
const config = {
  prefix: 'my_app'
}

// Collection mapping
'users' → 'my_app_users'
'posts' → 'my_app_posts'
'media' → 'my_app_media'

// Versions tables
'users' → 'my_app_users_versions'
'posts' → 'my_app_posts_versions'

// Globals
'settings' → 'my_app_global_settings'
```

**Implementation:**

```typescript
function getCollectionTableName(collection: string, prefix: string): string {
  return `${prefix}_${collection}`
}

function getVersionsTableName(collection: string, prefix: string): string {
  return `${prefix}_${collection}_versions`
}

function getGlobalTableName(global: string, prefix: string): string {
  return `${prefix}_global_${global}`
}
```

### Where Clause Processing

Payload's where clauses are transformed into Convex-compatible queries:

```typescript
// Payload where clause
const where = {
  title: { contains: 'hello' },
  status: { equals: 'published' },
  publishDate: { greater_than: new Date('2024-01-01') },
  and: [
    { author: { equals: 'user_123' } },
    { category: { in: ['tech', 'news'] } }
  ]
}

// Transformed for Convex
const convexWhere = {
  type: 'and',
  conditions: [
    { field: 'title', operator: 'contains', value: 'hello' },
    { field: 'status', operator: 'equals', value: 'published' },
    { field: 'publishDate', operator: 'greater_than', value: 1704067200000 }, // timestamp
    {
      type: 'and',
      conditions: [
        { field: 'author', operator: 'equals', value: 'user_123' },
        { field: 'category', operator: 'in', value: ['tech', 'news'] }
      ]
    }
  ]
}
```

### Transaction Implementation

The adapter implements transactions using a session-based tracking system:

```typescript
// Transaction lifecycle
type TransactionSession = {
  id: string                    // Unique transaction ID
  operations: Operation[]       // Queued operations
  startTime: number            // Start timestamp
  status: 'active' | 'committed' | 'rolled_back'
}

// Begin transaction
const sessionId = await adapter.beginTransaction()
// Returns: "txn_abc123def456"

// Operations within transaction
await adapter.create({ 
  collection: 'users',
  data: { name: 'John' },
  req: { transactionID: sessionId }
})

// Commit or rollback
await adapter.commitTransaction(sessionId)  // or
await adapter.rollbackTransaction(sessionId)
```

**Session Tracker:**

```typescript
class SessionTracker {
  private sessions: Map<string, TransactionSession>
  
  beginSession(): string {
    const id = generateId()
    this.sessions.set(id, {
      id,
      operations: [],
      startTime: Date.now(),
      status: 'active'
    })
    return id
  }
  
  addOperation(sessionId: string, operation: Operation): void {
    const session = this.sessions.get(sessionId)
    if (session?.status === 'active') {
      session.operations.push(operation)
    }
  }
  
  commit(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Execute all queued operations
      session.status = 'committed'
      this.sessions.delete(sessionId)
    }
  }
  
  rollback(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Discard all operations
      session.status = 'rolled_back'
      this.sessions.delete(sessionId)
    ∏
  }
}
```

---

## Query Processing

### Query Processor Architecture

The query processor handles complex Payload queries and transforms them into efficient Convex operations:

```typescript
class QueryProcessor {
  /**
   * Process a Payload where clause
   */
  processWhere(where: Where): SerializableWhere {
    if (!where) return null
    
    const result: SerializableWhere = {
      type: 'and',
      conditions: []
    }
    
    for (const [key, value] of Object.entries(where)) {
      if (key === 'and') {
        result.conditions.push({
          type: 'and',
          conditions: value.map(w => this.processWhere(w))
        })
      } else if (key === 'or') {
        result.conditions.push({
          type: 'or',
          conditions: value.map(w => this.processWhere(w))
        })
      } else {
        result.conditions.push(this.processCondition(key, value))
      }
    }
    
    return result
  }
  
  /**
   * Process a single condition
   */
  private processCondition(field: string, condition: WhereCondition): Condition {
    if (typeof condition === 'object') {
      const operator = Object.keys(condition)[0]
      const value = condition[operator]
      
      return {
        field,
        operator: this.mapOperator(operator),
        value: this.serializeValue(value)
      }
    }
    
    return {
      field,
      operator: 'equals',
      value: this.serializeValue(condition)
    }
  }
  
  /**
   * Map Payload operators to Convex operators
   */
  private mapOperator(operator: string): string {
    const operatorMap = {
      'equals': 'equals',
      'not_equals': 'not_equals',
      'in': 'in',
      'not_in': 'not_in',
      'exists': 'exists',
      'greater_than': 'gt',
      'greater_than_equal': 'gte',
      'less_than': 'lt',
      'less_than_equal': 'lte',
      'like': 'like',
      'contains': 'contains'
    }
    
    return operatorMap[operator] || operator
  }
  
  /**
   * Serialize values for Convex
   */
  private serializeValue(value: any): any {
    if (value instanceof Date) {
      return value.getTime()
    }
    if (Array.isArray(value)) {
      return value.map(v => this.serializeValue(v))
    }
    return value
  }
}
```

### Sort Processing

```typescript
type PayloadSort = {
  [field: string]: 'asc' | 'desc' | 1 | -1
}

function processSort(sort: PayloadSort): ConvexSort {
  const entries = Object.entries(sort)
  return entries.map(([field, direction]) => ({
    field,
    direction: direction === 'asc' || direction === 1 ? 'asc' : 'desc'
  }))
}
```

### Pagination Processing

```typescript
function processPagination(args: {
  page?: number
  limit?: number
  paginate?: boolean
}): PaginationConfig {
  const page = args.page || 1
  const limit = args.limit || 10
  
  return {
    skip: (page - 1) * limit,
    limit: limit,
    page: page
  }
}
```

---

## Migration System

The adapter provides migration support for schema changes:

```typescript
type Migration = {
  name: string
  batch: number
  timestamp: number
  up: () => Promise<void>
  down: () => Promise<void>
}

// Migration tracking table: {prefix}_migrations
type MigrationRecord = {
  _id: string
  name: string
  batch: number
  ran_at: number
}

// Migration operations
interface MigrationBindings {
  // Run pending migrations
  migrate(args: MigrateArgs): Promise<void>
  
  // Rollback last batch
  migrateDown(): Promise<void>
  
  // Drop all tables and re-run migrations
  migrateFresh(args: MigrateFreshArgs): Promise<void>
  
  // Rollback all and re-run
  migrateRefresh(): Promise<void>
  
  // Rollback all migrations
  migrateReset(): Promise<void>
  
  // Get migration status
  migrateStatus(): Promise<MigrationStatus>
}
```

---

## Error Handling

The adapter provides comprehensive error handling:

```typescript
class AdapterError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AdapterError'
  }
}

// Error types
type ErrorCode =
  | 'COLLECTION_NOT_FOUND'
  | 'DOCUMENT_NOT_FOUND'
  | 'INVALID_QUERY'
  | 'TRANSACTION_ERROR'
  | 'CONVEX_ERROR'
  | 'VALIDATION_ERROR'

// Error handling in bindings
async function safeBinding<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof ConvexError) {
      throw new AdapterError(
        error.message,
        'CONVEX_ERROR',
        error
      )
    }
    throw error
  }
}
```

---

## Performance Considerations

### Query Optimization

1. **Index Usage**: Leverage Convex indexes for frequently queried fields
2. **Pagination**: Always use pagination for large result sets
3. **Field Selection**: Minimize data transfer by selecting only needed fields
4. **Where Clause Optimization**: Push filtering to Convex layer

### Caching Strategy

```typescript
// The adapter supports Payload's built-in caching
// Convex provides real-time subscriptions which can be used for cache invalidation

type CacheConfig = {
  enabled: boolean
  ttl: number  // Time to live in seconds
  invalidateOn: ('create' | 'update' | 'delete')[]
}
```

### Batch Operations

```typescript
// Batch creates
const results = await Promise.all(
  documents.map(doc => 
    adapter.create({ collection: 'posts', data: doc })
  )
)

// Bulk updates
await adapter.updateMany({
  collection: 'posts',
  where: { status: { equals: 'draft' } },
  data: { status: 'published' }
})
```

---

## Debugging

### Enable Debug Logging

```typescript
// In your payload.config.ts
const adapter = convexAdapter({
  convexUrl: process.env.CONVEX_URL!,
  convexDeployment: process.env.CONVEX_DEPLOYMENT!,
  prefix: 'my_app',
  // Debug mode (to be implemented)
  debug: true
})
```

### Common Issues

1. **Transaction Timeout**: Transactions should complete within 10 seconds
2. **Query Complexity**: Very complex where clauses may need optimization
3. **Rate Limiting**: Convex has rate limits for concurrent operations
4. **Data Size**: Large documents (>1MB) may hit Convex limits
5. **System Field Errors**: If you see errors about `_id` or `_creationTime` during inserts:
   - Ensure you're using the latest version of the adapter
   - The adapter automatically filters these fields - you shouldn't need to manually remove them
   - If errors persist, check that Convex functions are properly deployed

---

## Contributing

When contributing to this adapter:

1. Maintain type safety throughout
2. Add comprehensive JSDoc comments
3. Update this documentation for architectural changes
4. Add tests for new features
5. Follow the established error handling patterns

---

## Conclusion

The Payload Convex Adapter provides a robust, type-safe bridge between Payload CMS and Convex. The adapter provides full database functionality with support for transactions, complex queries, and real-time operations.

For setup instructions and usage examples, see the [README.md](./README.md).
