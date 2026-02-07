# WHERE Filter Field Transformation - Implementation Summary

## Overview

This document summarizes the implementation of field name transformation for WHERE filters in the Payload Convex Adapter.

## Problem Statement

Data in Convex is stored with transformed field names (e.g., `pca__status` for Payload's `_status` field), but WHERE filters were being sent with untransformed Payload field names. This caused queries to fail because the field names didn't match the stored data.

**Example:**
- Data stored in Convex: `{ pca__status: "published", title: "Hello" }`
- WHERE filter sent: `{ field: "_status", operator: "equals", value: "published" }`
- Result: Query returns no results because `_status` field doesn't exist in the data

## Solution

Implemented automatic field name transformation for WHERE filters on the adapter side (before sending to Convex). This ensures that the `wherePlan` sent to Convex contains field names in Convex format that match the stored data.

## Implementation Details

### 1. New Functions Added

#### `transformComparisonFieldsToConvex`
```typescript
function transformComparisonFieldsToConvex(
  comparison: WhereComparison
): WhereComparison
```
Transforms the field name in a single comparison from Payload to Convex format.

#### `transformWhereNodeToConvex`
```typescript
function transformWhereNodeToConvex(node: WhereNode): WhereNode
```
Recursively transforms all field names in a WHERE node tree. Handles all node types:
- `comparison`: Transform the field name
- `and`: Transform all child nodes
- `or`: Transform all child nodes
- `not`: Transform the child node

#### `transformWherePlanToConvex`
```typescript
function transformWherePlanToConvex(
  plan: EnhancedParsedWhereFilter
): EnhancedParsedWhereFilter
```
Transforms both `dbFilter` and `postFilter` in an `EnhancedParsedWhereFilter`.

### 2. Modified Functions

#### `createAdapterQueryProcessor`
- Added transformation step after creating the wherePlan
- Ensures all wherePlans sent to Convex have transformed field names

**Before:**
```typescript
const wherePlan = inputWherePlan || parsePayloadWhere(where);
```

**After:**
```typescript
const rawWherePlan = inputWherePlan || parsePayloadWhere(where);
const wherePlan = transformWherePlanToConvex(rawWherePlan);
```

#### `createWherePlan`
- Added transformation step to ensure consistent API
- Users calling this function directly now get a properly transformed wherePlan

**Before:**
```typescript
export function createWherePlan(props: CreateWherePlanProps): WherePlan {
  const { where } = props;
  return parsePayloadWhere(where ?? undefined);
}
```

**After:**
```typescript
export function createWherePlan(props: CreateWherePlanProps): WherePlan {
  const { where } = props;
  const rawWherePlan = parsePayloadWhere(where ?? undefined);
  return transformWherePlanToConvex(rawWherePlan);
}
```

### 3. Transformation Rules

The transformation uses the existing `normalizeField` function which implements these rules:

| Payload Field | Convex Field | Rule |
|--------------|--------------|------|
| `id` | `_id` | Special mapping |
| `createdAt` | `_creationTime` | Special mapping |
| `_id` | `_id` | Convex system field (unchanged) |
| `_creationTime` | `_creationTime` | Convex system field (unchanged) |
| `_updatedTime` | `_updatedTime` | Convex system field (unchanged) |
| `_status` | `pca__status` | Payload system field (prefixed) |
| `$custom` | `pca_$custom` | Payload operator field (prefixed) |
| `title` | `title` | Regular field (unchanged) |
| `updatedAt` | `updatedAt` | Regular field (unchanged) |

### 4. Nested Path Handling

Each segment of a nested path is transformed independently:

| Payload Path | Convex Path |
|--------------|-------------|
| `author.name` | `author.name` |
| `author._custom` | `author.pca__custom` |
| `version._status` | `version.pca__status` |

## Files Modified

1. **`src/tools/query-processor.ts`**
   - Added `transformComparisonFieldsToConvex` function
   - Added `transformWhereNodeToConvex` function
   - Added `transformWherePlanToConvex` function
   - Modified `createAdapterQueryProcessor` to apply transformation
   - Modified `createWherePlan` to apply transformation
   - Updated documentation comments

## Testing Strategy

### Manual Testing Checklist

1. **Basic Field Transformation**
   - [ ] Query with `_status` field returns correct results
   - [ ] Query with `$custom` field returns correct results

2. **Nested Path Transformation**
   - [ ] Query with `version._status` returns correct results
   - [ ] Query with `author._custom` returns correct results

3. **Special Field Mappings**
   - [ ] Query with `id` field works correctly
   - [ ] Query with `createdAt` field works correctly

4. **Complex Queries**
   - [ ] AND queries with system fields work correctly
   - [ ] OR queries with system fields work correctly
   - [ ] Nested AND/OR combinations work correctly

5. **Hybrid Filtering**
   - [ ] Queries with both dbFilter and postFilter work correctly
   - [ ] Field names are transformed in both filters

### Expected Behavior

**Before Fix:**
```typescript
// Query
await adapter.find({
  collection: 'posts',
  where: { _status: { equals: 'published' } }
});

// wherePlan sent to Convex
{
  strategy: "db",
  dbFilter: {
    type: "comparison",
    comparison: { field: "_status", operator: "equals", value: "published" }
  }
}

// Result: No documents found (field doesn't exist in Convex)
```

**After Fix:**
```typescript
// Query
await adapter.find({
  collection: 'posts',
  where: { _status: { equals: 'published' } }
});

// wherePlan sent to Convex
{
  strategy: "db",
  dbFilter: {
    type: "comparison",
    comparison: { field: "pca__status", operator: "equals", value: "published" }
  }
}

// Result: Returns all published posts
```

## Backward Compatibility

This change is **fully backward compatible**:

1. No API changes required
2. Transformation is applied automatically
3. Transformation is idempotent (safe to apply multiple times)
4. Existing code continues to work without modifications

## Performance Impact

- **Minimal**: Transformation happens once on the adapter side before sending to Convex
- **No additional network calls**: Same number of Convex queries
- **No additional database queries**: Field names are simply transformed in memory

## Benefits

1. **Correctness**: Queries now match the actual stored data field names
2. **Consistency**: Same transformation rules for data storage and query filters
3. **Transparency**: Users don't need to know about field name transformations
4. **Maintainability**: Centralized transformation logic in one place
5. **Type Safety**: TypeScript types ensure correct usage

## Future Enhancements

Potential improvements:

1. Add unit tests for transformation functions
2. Add integration tests with actual Convex queries
3. Add performance benchmarks
4. Consider caching transformed wherePlans if performance becomes an issue
5. Add debug logging to show before/after transformation (in dev mode)

## Related Documentation

- [`WHERE_FIELD_TRANSFORMATION.md`](./WHERE_FIELD_TRANSFORMATION.md) - Detailed transformation documentation
- [`VERSION_MANAGEMENT.md`](./VERSION_MANAGEMENT.md) - Version lifecycle and draft autosave fix
- [`README.md`](./README.md) - General adapter documentation
- [`PayloadConvexAdapter.md`](./PayloadConvexAdapter.md) - Technical architecture documentation

## Verification

To verify the implementation is working:

1. Check terminal output when running queries with `_status` or `$` fields
2. Verify that `field: "pca__status"` appears in logs instead of `field: "_status"`
3. Confirm that queries return expected results

## Implementation Date

February 5, 2026

## Author

Implemented as part of the Payload Convex Adapter maintenance and bug fixes.
