# Payload Convex Adapter

A database adapter for [Payload CMS](https://payloadcms.com/) that uses [Convex](https://www.convex.dev/) as the underlying database. This adapter enables seamless integration between Payload's data layer and Convex's real-time, serverless database platform.

## Features

- **Full Payload Database Adapter** - Complete implementation of Payload's database adapter interface
- **Real-time Sync** - Built on Convex's real-time database infrastructure
- **Transaction Support** - Session-based transaction tracking for data consistency
- **Type-safe Operations** - TypeScript-first design with full type inference
- **Multi-tenant Support** - Table prefix system for multiple Payload instances
- **Advanced Queries** - Serializable where filter system for complex queries
- **System Field Handling** - Automatic filtering of Convex system fields (`_id`, `_creationTime`) during insert operations

## Adapter Setup

### 1. Install Dependencies

First, ensure you have the required packages:

```bash
pnpm add payload convex payload-convex-adapter
```

### 2. Initialize Convex

If you haven't already set up Convex in your project:

```bash
npx convex dev
```

This will create a `convex/` directory in your project root.

### 3. Create Convex Configuration

Create a configuration file at the root of your project (e.g., `payload-convex-config.ts`):

```typescript
import type { PayloadConvexConfig } from 'payload-convex-adapter'

export const payloadConvexConfig: PayloadConvexConfig = {
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexDeployment: process.env.CONVEX_DEPLOYMENT!,
  prefix: 'your_app', // Prefix for all Payload tables in Convex
}
```

### 4. Set Up Environment Variables

Add the following to your `.env` file:

```bash
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment-name

# Payload Configuration
PAYLOAD_SECRET=your-secret-key-here
```

You can find these values:
- `NEXT_PUBLIC_CONVEX_URL`: In your Convex dashboard under "Deployment URL"
- `CONVEX_DEPLOYMENT`: Format is `environment:deployment-name` (e.g., `dev:happy-animal-123`)

### 5. Configure Payload to Use Convex Adapter

Update your `payload.config.ts`:

```typescript
import { buildConfig } from 'payload'
import { convexAdapter } from 'payload-convex-adapter'
import { payloadConvexConfig } from './payload-convex-config'

export default buildConfig({
  // Your collections, globals, etc.
  collections: [
    // Your collections here
  ],
  
  // Use Convex as the database adapter
  db: convexAdapter(payloadConvexConfig),
  
  // Other Payload configuration...
  secret: process.env.PAYLOAD_SECRET || '',
})
```

### 6. Set Up Convex Adapter Functions

Create a file at `convex/adapter.ts` to expose the necessary Convex functions:

```typescript
import { MutationAdapter, QueryAdapter } from 'payload-convex-adapter/convex'
import { createConvexSafeAdapterService } from 'payload-convex-adapter/safe-service'
import { payloadConvexConfig } from '../payload-convex-config'

// Create the adapter service
const service = createConvexSafeAdapterService({
  ...payloadConvexConfig,
  payload: {} as any, // Payload instance not needed in Convex functions
})

// Initialize query and mutation adapters
const queryAdapter = QueryAdapter({})
const mutationAdapter = MutationAdapter({})

// Export Query Functions
export const {
  getById,
  collectionQuery,
  collectionCountQuery,
  collectionWhereQuery,
  collectionWhereOrderQuery,
  collectionWhereLimitQuery,
  collectionWherePaginateQuery,
  collectionWhereOrderLimitQuery,
  collectionWhereOrderPaginateQuery,
  collectionOrderQuery,
  collectionOrderLimitQuery,
  collectionOrderPaginateQuery,
  collectionLimitQuery,
} = {
  getById: queryAdapter.getById.convex({ service: service as any }),
  collectionQuery: queryAdapter.collectionQuery.convex({ service: service as any }),
  collectionCountQuery: queryAdapter.collectionCountQuery.convex({ service: service as any }),
  collectionWhereQuery: queryAdapter.collectionWhereQuery.convex({ service: service as any }),
  collectionWhereOrderQuery: queryAdapter.collectionWhereOrderQuery.convex({ service: service as any }),
  collectionWhereLimitQuery: queryAdapter.collectionWhereLimitQuery.convex({ service: service as any }),
  collectionWherePaginateQuery: queryAdapter.collectionWherePaginateQuery.convex({ service: service as any }),
  collectionWhereOrderLimitQuery: queryAdapter.collectionWhereOrderLimitQuery.convex({ service: service as any }),
  collectionWhereOrderPaginateQuery: queryAdapter.collectionWhereOrderPaginateQuery.convex({ service: service as any }),
  collectionOrderQuery: queryAdapter.collectionOrderQuery.convex({ service: service as any }),
  collectionOrderLimitQuery: queryAdapter.collectionOrderLimitQuery.convex({ service: service as any }),
  collectionOrderPaginateQuery: queryAdapter.collectionOrderPaginateQuery.convex({ service: service as any }),
  collectionLimitQuery: queryAdapter.collectionLimitQuery.convex({ service: service as any }),
}

// Export Mutation Functions
export const {
  insert,
  getByIdMutation,
  patch,
  replace,
  deleteOp,
  upsert,
  updateManyWhere,
  deleteManyWhere,
  increment,
  transactional,
} = {
  insert: mutationAdapter.insert.convex({ service: service as any }),
  getByIdMutation: mutationAdapter.getByIdMutation.convex({ service: service as any }),
  patch: mutationAdapter.patch.convex({ service: service as any }),
  replace: mutationAdapter.replace.convex({ service: service as any }),
  deleteOp: mutationAdapter.deleteOp.convex({ service: service as any }),
  upsert: mutationAdapter.upsert.convex({ service: service as any }),
  updateManyWhere: mutationAdapter.updateManyWhere.convex({ service: service as any }),
  deleteManyWhere: mutationAdapter.deleteManyWhere.convex({ service: service as any }),
  increment: mutationAdapter.increment.convex({ service: service as any }),
  transactional: mutationAdapter.transactional.convex({ service: service as any }),
}
```

### 7. Configure Convex Schema (Optional)

While the adapter handles schema creation automatically, you can define your schema in `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Convex will automatically create tables for your Payload collections
  // You can add custom tables here if needed
})
```

### 8. Start Development

Start your Convex development server:

```bash
pnpm dlx convex dev
```

Then start your Next.js/Payload application:

```bash
pnpm dev
```

## Configuration Options

### PayloadConvexConfig

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `convexUrl` | `string` | Yes | The HTTPS URL of your Convex deployment |
| `convexDeployment` | `string` | Yes | The deployment identifier (format: `environment:deployment-name`) |
| `prefix` | `string` | Yes | Prefix for all Payload tables in Convex (enables multi-tenant support) |

## How It Works

The adapter works by:

1. **Translating Payload Operations** - Converting Payload's database operations into Convex queries and mutations
2. **Managing Transactions** - Using session tracking to ensure data consistency across operations
3. **Table Prefixing** - Automatically prefixing collection names to avoid conflicts
4. **Type Safety** - Maintaining full TypeScript type safety throughout the stack
5. **System Field Filtering** - Automatically filtering out Convex system fields (`_id`, `_creationTime`) during insert/upsert operations, as these are auto-generated by Convex

### System Field Handling

Convex automatically manages certain system fields that cannot be provided during insert operations:
- `_id` - Document identifier (auto-generated)
- `_creationTime` - Document creation timestamp (auto-generated)

The adapter automatically filters these fields from data before insert/upsert operations, ensuring compatibility with Convex's requirements. This is handled transparently - you can include `id` or `createdAt` in your Payload data, and the adapter will properly transform and filter them.

For detailed architecture and implementation details, see [PayloadConvexAdapter.md](./PayloadConvexAdapter.md).

## Project Structure

```
your-project/
├── convex/
│   ├── adapter.ts              # Convex function definitions
│   ├── schema.ts               # Convex schema (optional)
│   └── _generated/             # Auto-generated Convex types
├── src/
│   ├── payload.config.ts       # Payload configuration
│   └── collections/            # Your Payload collections
├── payload-convex-config.ts    # Convex adapter configuration
└── .env                        # Environment variables
```

## Examples

### Basic Collection

```typescript
import { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
    },
  ],
}
```

The adapter will automatically create a Convex table named `{prefix}_posts` (e.g., `your_app_posts`).

### Using Convex Client-Side

You can also use Convex's client-side features alongside Payload:

```typescript
'use client'

import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

export function PostsList() {
  const posts = useQuery(api.adapter.collectionQuery, {
    collection: 'your_app_posts',
  })
  
  return (
    <div>
      {posts?.map(post => (
        <div key={post._id}>{post.title}</div>
      ))}
    </div>
  )
}
```

## Version Management

The adapter implements robust version management that mirrors Payload's MongoDB adapter:

### Key Features

1. **Latest Flag Maintenance**: Only one version per document has `latest: true` at any time
2. **Deletion Safeguards**: Newly created versions are protected from immediate cleanup
3. **Timestamp Handling**: Uses strict `less_than` comparisons to prevent edge cases

### How It Works

When a new version is created (e.g., autosave):

1. **Unset Old Latest**: Older versions with `latest: true` have the flag removed
2. **Create New Version**: New version is inserted with `latest: true`
3. **Track Version ID**: The version ID is tracked to protect it from cleanup
4. **Apply Safeguards**: Cleanup operations automatically exclude the new version

### Version Lifecycle

```typescript
// 1. User autosaves a document
await payload.update({
  collection: 'posts',
  id: docId,
  data: { title: 'Updated' },
  autosave: true,
})

// 2. Behind the scenes:
// - Older versions get latest: undefined
// - New version created with latest: true
// - Version ID tracked in service context

// 3. Automatic cleanup runs:
// - Converts updatedAt <= X to updatedAt < X
// - Excludes the newly created version
// - Deletes only truly older versions

// 4. Result: Draft autosave persists! ✅
```

### Documentation

For detailed information about version management implementation, see:
- **[VERSION_MANAGEMENT.md](./VERSION_MANAGEMENT.md)**: Complete implementation details
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)**: Field transformation summary
- **[WHERE_FIELD_TRANSFORMATION.md](./WHERE_FIELD_TRANSFORMATION.md)**: Query filter handling

## Troubleshooting

### "Cannot find module 'payload-convex-adapter/convex'"

Make sure you've installed the package correctly and that your `package.json` includes the package exports:

```bash
pnpm add payload-convex-adapter
```

### Tables Not Being Created

Ensure that:
1. Your Convex dev server is running (`npx convex dev`)
2. The `convex/adapter.ts` file is properly set up
3. Your environment variables are correctly configured

### Transaction Errors

The adapter uses session-based transactions. If you encounter transaction errors, ensure that:
- Operations within a transaction are properly awaited
- Transaction IDs are being passed correctly through the operation chain

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.

## License

MIT

## Links

- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Convex Documentation](https://docs.convex.dev/)
- [GitHub Repository](https://github.com/odeletech/payload-convex-adapter)
