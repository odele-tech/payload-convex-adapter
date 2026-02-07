# WHERE Filter Field Name Transformation

## Overview

This document describes the field name transformation system for WHERE filters in the Payload Convex Adapter.

## Problem

Data is stored in Convex with transformed field names (e.g., `pca__status` for Payload's `_status` field), but WHERE filters were being sent with untransformed Payload field names. This caused queries to fail because the field names didn't match the stored data.

## Solution

Field names in WHERE filters are now transformed from Payload format to Convex format on the **adapter side** (before sending to Convex). This ensures that the `wherePlan` sent to Convex contains the correct field names that match the stored data.

## Transformation Rules

The transformation follows the same rules as data storage:

| Payload Field | Convex Field | Rule |
|--------------|--------------|------|
| `id` | `_id` | Special Payload → Convex mapping |
| `createdAt` | `_creationTime` | Special Payload → Convex mapping |
| `_id` | `_id` | Convex system field (preserved) |
| `_creationTime` | `_creationTime` | Convex system field (preserved) |
| `_updatedTime` | `_updatedTime` | Convex system field (preserved) |
| `_status` | `pca__status` | Payload system field (prefixed) |
| `_custom` | `pca__custom` | Payload system field (prefixed) |
| `$inc` | `pca_$inc` | Payload operator field (prefixed) |
| `title` | `title` | Regular user field (unchanged) |
| `updatedAt` | `updatedAt` | Regular user field (unchanged) |

### Nested Path Transformation

Each segment of a nested path is transformed independently:

| Payload Path | Convex Path | Explanation |
|--------------|-------------|-------------|
| `author.name` | `author.name` | Both segments are regular fields |
| `author._custom` | `author.pca__custom` | `_custom` is a Payload system field |
| `meta.$special` | `meta.pca_$special` | `$special` is a Payload operator field |
| `version._status` | `version.pca__status` | `_status` in nested path |

## Implementation

### Functions

1. **`transformComparisonFieldsToConvex`**: Transforms field names in a single comparison
2. **`transformWhereNodeToConvex`**: Recursively transforms all nodes in a WHERE tree
3. **`transformWherePlanToConvex`**: Transforms both dbFilter and postFilter in an EnhancedParsedWhereFilter

### Where Applied

The transformation is applied in `createAdapterQueryProcessor` after creating the wherePlan:

```typescript
// 2. Process where clause into WherePlan (use pre-parsed if provided)
const rawWherePlan = inputWherePlan || parsePayloadWhere(where);

// 3. Transform field names in wherePlan from Payload to Convex format
// This ensures field names like _status become pca__status to match stored data
const wherePlan = transformWherePlanToConvex(rawWherePlan);
```

## Examples

### Example 1: Simple Field Filter

**Input (Payload):**
```typescript
{ _status: { equals: "published" } }
```

**wherePlan before transformation:**
```json
{
  "strategy": "db",
  "dbFilter": {
    "type": "comparison",
    "comparison": {
      "field": "_status",
      "operator": "equals",
      "value": "published"
    }
  },
  "postFilter": null
}
```

**wherePlan after transformation:**
```json
{
  "strategy": "db",
  "dbFilter": {
    "type": "comparison",
    "comparison": {
      "field": "pca__status",
      "operator": "equals",
      "value": "published"
    }
  },
  "postFilter": null
}
```

### Example 2: Nested Path Filter

**Input (Payload):**
```typescript
{ "version._status": { equals: "draft" } }
```

**wherePlan after transformation:**
```json
{
  "strategy": "post",
  "dbFilter": null,
  "postFilter": {
    "type": "comparison",
    "comparison": {
      "field": "version.pca__status",
      "operator": "equals",
      "value": "draft"
    }
  }
}
```

### Example 3: Complex AND/OR Filter

**Input (Payload):**
```typescript
{
  and: [
    { _status: { equals: "published" } },
    { or: [
      { title: { contains: "Hello" } },
      { $custom: { exists: true } }
    ]}
  ]
}
```

**wherePlan after transformation:**
```json
{
  "strategy": "hybrid",
  "dbFilter": {
    "type": "comparison",
    "comparison": {
      "field": "pca__status",
      "operator": "equals",
      "value": "published"
    }
  },
  "postFilter": {
    "type": "or",
    "nodes": [
      {
        "type": "comparison",
        "comparison": {
          "field": "title",
          "operator": "contains",
          "value": "Hello"
        }
      },
      {
        "type": "comparison",
        "comparison": {
          "field": "pca_$custom",
          "operator": "exists",
          "value": true
        }
      }
    ]
  }
}
```

## Testing Checklist

### Basic Field Transformation
- [x] `_status` → `pca__status`
- [x] `$custom` → `pca_$custom`

### Nested Path Transformation
- [x] `version._status` → `version.pca__status`
- [x] `user._custom` → `user.pca__custom`

### Preserve Convex System Fields
- [x] `_id` → `_id`
- [x] `_creationTime` → `_creationTime`

### Special Payload Mappings
- [x] `id` → `_id`
- [x] `createdAt` → `_creationTime`

### Regular Fields Unchanged
- [x] `title` → `title`
- [x] `updatedAt` → `updatedAt`

### Complex WHERE Queries
- [x] AND/OR combinations with `_status`
- [x] Nested comparisons
- [x] Hybrid filtering (dbFilter + postFilter)

## Benefits

1. **Correctness**: Queries now match the actual stored data field names
2. **Consistency**: Same transformation rules for data storage and query filters
3. **Transparency**: Transformation happens automatically; users don't need to know about it
4. **Idempotent**: Transforming an already-transformed field is safe (no-op)

## Related Files

- `src/tools/query-processor.ts`: Contains transformation functions and application
- `src/convex/queries.ts`: Uses transformed wherePlan in Convex queries
- `src/convex/mutations.ts`: Uses transformed wherePlan in Convex mutations

## Migration Notes

This change is **backward compatible**. Existing code will continue to work without modifications because:

1. The transformation is applied automatically in the adapter layer
2. The transformation is idempotent (safe to apply multiple times)
3. No API changes are required
