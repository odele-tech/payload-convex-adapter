/**
 * @fileoverview QueryProcessor for Payload-Convex Data Transformation
 *
 * This module provides a centralized QueryProcessor that handles bidirectional
 * data transformation and query processing between Payload CMS and Convex.
 * It integrates compileToConvex, compileToPayload, parsePayloadWhere, and
 * data compilation into a unified, chainable API.
 *
 * ## Architecture
 *
 * The QueryProcessor operates in two modes:
 * - **Adapter-side (convex: false)**: Runs on the client/adapter side before
 *   sending to Convex. Prepares data and where clauses for Convex operations.
 * - **Convex-side (convex: true)**: Runs inside Convex query/mutation handlers.
 *   Provides chainable query building with filters and transformations.
 *
 * ## Chainable API (Convex-side)
 * ```typescript
 * const processor = service.tools.queryProcessor({
 *   ctx, service, collection, wherePlan, index, convex: true
 * });
 * const results = await processor.query().postFilter().toPayload();
 * ```
 *
 * @module tools/query-processor
 */

import type {
  Where,
  WhereField,
  Operator,
  SelectType,
  JoinQuery,
} from "payload";
import type {
  GenericQueryCtx,
  GenericMutationCtx,
  GenericDataModel,
  PaginationOptions,
  FilterBuilder,
  ExpressionOrValue,
  GenericTableInfo,
} from "convex/server";

import type { AdapterService } from "../adapter/service";
import type { AdapaterQueryIndex } from "../convex/queries";
import { parseCollection } from "./parse-collection";

// ============================================================================
// Where Filter System (migrated from where.ts)
// ============================================================================

/**
 * Represents a single field comparison in a where filter.
 */
export type WhereComparison = {
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
export type WhereNode =
  | { type: "and"; nodes: WhereNode[] }
  | { type: "or"; nodes: WhereNode[] }
  | { type: "not"; node: WhereNode }
  | { type: "comparison"; comparison: WhereComparison };

/**
 * The parsed where filter type.
 * Null indicates no filter (match all documents).
 */
export type ParsedWhereFilter = WhereNode | null;

/**
 * Filter execution strategy.
 * - "db": All filters can run in Convex DB (fast, indexed)
 * - "post": All filters need post-processing (slow, in-memory)
 * - "hybrid": Mix of DB and post-processing
 */
export type FilterStrategy = "db" | "post" | "hybrid";

/**
 * Enhanced parsed where filter with hybrid filtering support.
 * Splits filters into DB-compatible and post-processing phases.
 */
export type EnhancedParsedWhereFilter = {
  /** The execution strategy for this filter */
  strategy: FilterStrategy;
  /** Filters that can run in Convex DB (null if none) */
  dbFilter: ParsedWhereFilter;
  /** Filters that need post-processing (null if none) */
  postFilter: ParsedWhereFilter;
};

/**
 * Classifies a comparison to determine if it can use DB filtering.
 * @internal
 */
function classifyComparison(comparison: WhereComparison): boolean {
  // Nested field paths require post-filtering
  if (comparison.field.includes(".")) {
    return false;
  }

  // Unsupported operators require post-filtering
  const unsupportedOps = ["contains", "like", "near"];
  if (unsupportedOps.includes(comparison.operator)) {
    return false;
  }

  return true;
}

/**
 * Classifies a where node to determine if it can use DB filtering.
 * @internal
 */
function classifyWhereNode(node: WhereNode): boolean {
  switch (node.type) {
    case "comparison":
      return classifyComparison(node.comparison);

    case "and":
    case "or":
      // All children must be DB-compatible
      return node.nodes.every(classifyWhereNode);

    case "not":
      return classifyWhereNode(node.node);
  }
}

/**
 * Splits a where node into DB and post-processing filters.
 * @internal
 */
function splitWhereNode(node: WhereNode): {
  dbFilter: WhereNode | null;
  postFilter: WhereNode | null;
} {
  // If entire node can use DB, use it
  if (classifyWhereNode(node)) {
    return { dbFilter: node, postFilter: null };
  }

  // If it's a comparison that can't use DB, post-process only
  if (node.type === "comparison") {
    return { dbFilter: null, postFilter: node };
  }

  // For NOT, if complex, post-process entire thing
  if (node.type === "not") {
    return { dbFilter: null, postFilter: node };
  }

  // For AND nodes, we CAN split - DB filters narrow results, post-filter refines
  // This is safe because AND requires ALL conditions to match
  if (node.type === "and") {
    const dbNodes: WhereNode[] = [];
    const postNodes: WhereNode[] = [];

    for (const child of node.nodes) {
      if (classifyWhereNode(child)) {
        dbNodes.push(child);
      } else {
        postNodes.push(child);
      }
    }

    return {
      dbFilter:
        dbNodes.length > 0
          ? dbNodes.length === 1
            ? dbNodes[0]
            : { type: "and", nodes: dbNodes }
          : null,
      postFilter:
        postNodes.length > 0
          ? postNodes.length === 1
            ? postNodes[0]
            : { type: "and", nodes: postNodes }
          : null,
    };
  }

  // For OR nodes, we CANNOT split - would change semantics
  // OR requires ANY condition to match, so all must be evaluated together
  // If any child needs post-filtering, entire OR goes to post-filter
  if (node.type === "or") {
    // Check if all children can use DB
    const allDbCompatible = node.nodes.every(classifyWhereNode);
    if (allDbCompatible) {
      return { dbFilter: node, postFilter: null };
    }
    // Otherwise, entire OR must be post-processed
    return { dbFilter: null, postFilter: node };
  }

  return { dbFilter: null, postFilter: node };
}

/**
 * Parses a Payload Where object into an enhanced filter with hybrid filtering support.
 *
 * This function runs on the client/adapter side and converts Payload's
 * Where syntax into a pure data structure that can be safely serialized
 * and passed to Convex functions. It automatically splits filters into
 * DB-compatible and post-processing phases for optimal performance.
 *
 * @param {Where} [where] - The Payload where clause to parse
 * @returns {EnhancedParsedWhereFilter} The enhanced filter with strategy
 *
 * @example
 * ```typescript
 * const filter = parsePayloadWhere({
 *   status: { equals: 'published' },
 *   'author.name': { equals: 'john' }, // Nested path - needs post-filtering
 * });
 * // Returns: { strategy: "hybrid", dbFilter: {...}, postFilter: {...} }
 * ```
 */
export function parsePayloadWhere(where?: Where): EnhancedParsedWhereFilter {
  if (!where || Object.keys(where).length === 0) {
    return { strategy: "db", dbFilter: null, postFilter: null };
  }

  const parsedNode = parseWhereObject(where);
  if (!parsedNode) {
    return { strategy: "db", dbFilter: null, postFilter: null };
  }

  const { dbFilter, postFilter } = splitWhereNode(parsedNode);

  // Determine strategy
  let strategy: FilterStrategy;
  if (dbFilter && !postFilter) {
    strategy = "db";
  } else if (!dbFilter && postFilter) {
    strategy = "post";
  } else {
    strategy = "hybrid";
  }

  return { strategy, dbFilter, postFilter };
}

/**
 * WherePlan type alias for clarity in bindings.
 * Represents the parsed and optimized where filter ready for Convex operations.
 */
export type WherePlan = EnhancedParsedWhereFilter;

/**
 * Props for createWherePlan function.
 */
export type CreateWherePlanProps = {
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
export function createWherePlan(props: CreateWherePlanProps): WherePlan {
  const { where } = props;
  return parsePayloadWhere(where ?? undefined);
}

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
export function emptyWherePlan(): WherePlan {
  return { strategy: "db", dbFilter: null, postFilter: null };
}

/**
 * Recursively parses a Where object into a WhereNode.
 * @internal
 */
function parseWhereObject(where: Where): WhereNode {
  const nodes: WhereNode[] = [];

  // Handle AND
  if (Array.isArray(where.and)) {
    nodes.push({
      type: "and",
      nodes: where.and.map(parseWhereObject),
    });
  }

  // Handle OR
  if (Array.isArray(where.or)) {
    nodes.push({
      type: "or",
      nodes: where.or.map(parseWhereObject),
    });
  }

  // Handle NOT
  if ("not" in where && where.not && typeof where.not === "object") {
    nodes.push({
      type: "not",
      node: parseWhereObject(where.not as Where),
    });
  }

  // Handle field conditions
  for (const [field, value] of Object.entries(where)) {
    if (field === "and" || field === "or" || field === "not") continue;
    if (!value || typeof value !== "object") continue;

    const fieldConditions = parseWhereField(field, value as WhereField);
    nodes.push(...fieldConditions);
  }

  // If no valid conditions found, treat as "match all"
  if (nodes.length === 0) {
    return {
      type: "comparison",
      comparison: {
        field: "_id",
        operator: "exists" as Operator,
        value: true,
      },
    };
  }
  if (nodes.length === 1) return nodes[0];

  return { type: "and", nodes };
}

/**
 * Converts ISO date strings to Unix timestamps for Convex compatibility.
 * @internal
 */
function convertDateValue(value: unknown): unknown {
  // Handle Date objects
  if (value instanceof Date) {
    return value.getTime();
  }

  // Handle ISO date strings
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  ) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  return value;
}

/**
 * Parses a single field's conditions into WhereNodes.
 * @internal
 */
function parseWhereField(field: string, fieldValue: WhereField): WhereNode[] {
  const nodes: WhereNode[] = [];

  for (const [operator, value] of Object.entries(fieldValue)) {
    nodes.push({
      type: "comparison",
      comparison: {
        field,
        operator: operator as Operator,
        value: convertDateValue(value),
      },
    });
  }

  return nodes;
}

/**
 * Builds a Convex filter expression from a ParsedWhereFilter.
 * @internal
 */
export function buildConvexFilter(
  q: FilterBuilder<GenericTableInfo>,
  node: ParsedWhereFilter
): ExpressionOrValue<boolean> {
  if (!node) return true;
  return buildNode(q, node);
}

/**
 * Recursively builds a filter expression from a WhereNode.
 * @internal
 */
function buildNode(
  q: FilterBuilder<GenericTableInfo>,
  node: WhereNode
): ExpressionOrValue<boolean> {
  switch (node.type) {
    case "and":
      if (node.nodes.length === 0) return true;
      if (node.nodes.length === 1) return buildNode(q, node.nodes[0]);
      return q.and(...node.nodes.map((n) => buildNode(q, n)));

    case "or":
      if (node.nodes.length === 0) return false;
      if (node.nodes.length === 1) return buildNode(q, node.nodes[0]);
      return q.or(...node.nodes.map((n) => buildNode(q, n)));

    case "not":
      return q.not(buildNode(q, node.node));

    case "comparison":
      return buildComparison(q, node.comparison);
  }
}

/**
 * Normalizes a single field segment to Convex format.
 *
 * Rules:
 * 1. Special Payload fields (id, createdAt) → Convex system fields
 * 2. Convex system fields → preserved
 * 3. Payload system fields (_ or $) → prefixed with pca_
 * 4. Regular user fields (including updatedAt) → unchanged
 *
 * Examples:
 * - "id" → "_id"
 * - "createdAt" → "_creationTime"
 * - "updatedAt" → "updatedAt" (user field, NOT mutated)
 * - "_status" → "pca__status"
 * - "$inc" → "pca_$inc"
 * - "title" → "title"
 *
 * @internal
 */
function normalizeFieldSegment(segment: string): string {
  // Special Payload → Convex mappings (id and createdAt only)
  if (segment === "id") return "_id";
  if (segment === "createdAt") return "_creationTime";

  // Convex system fields - preserve as-is
  if (
    segment === "_id" ||
    segment === "_creationTime" ||
    segment === "_updatedTime"
  ) {
    return segment;
  }

  // Payload system fields starting with _ or $ need prefixing
  if (segment.startsWith("_") || segment.startsWith("$")) {
    return `pca_${segment}`;
  }

  // Regular user fields unchanged (including updatedAt)
  return segment;
}

/**
 * Normalizes Payload field names to Convex field names.
 * Applies normalization to EACH segment of nested paths.
 *
 * Examples:
 * - "id" → "_id"
 * - "createdAt" → "_creationTime"
 * - "updatedAt" → "updatedAt" (NOT mutated)
 * - "title" → "title"
 * - "_status" → "pca__status"
 * - "$inc" → "pca_$inc"
 * - "author.name" → "author.name"
 * - "author._custom" → "author.pca__custom"
 * - "meta.$special" → "meta.pca_$special"
 *
 * @internal
 */
function normalizeField(field: string): string {
  // Handle nested field paths - normalize each segment
  if (field.includes(".")) {
    return field.split(".").map(normalizeFieldSegment).join(".");
  }

  return normalizeFieldSegment(field);
}

/**
 * Builds a filter expression for a single comparison.
 * @internal
 */
function buildComparison(
  q: FilterBuilder<GenericTableInfo>,
  cmp: WhereComparison
): ExpressionOrValue<boolean> {
  const field = q.field(normalizeField(cmp.field));

  switch (cmp.operator) {
    case "equals":
      return q.eq(field, cmp.value as any);

    case "not_equals":
      return q.neq(field, cmp.value as any);

    case "greater_than":
      return q.gt(field, cmp.value as any);

    case "greater_than_equal":
      return q.gte(field, cmp.value as any);

    case "less_than":
      return q.lt(field, cmp.value as any);

    case "less_than_equal":
      return q.lte(field, cmp.value as any);

    case "in": {
      if (!Array.isArray(cmp.value) || cmp.value.length === 0) {
        return false;
      }
      return q.or(...cmp.value.map((v) => q.eq(field, v as any)));
    }

    case "not_in": {
      if (!Array.isArray(cmp.value) || cmp.value.length === 0) {
        return true;
      }
      return q.and(...cmp.value.map((v) => q.neq(field, v as any)));
    }

    case "exists":
      if (cmp.value === true) {
        return q.and(q.neq(field, undefined as any), q.neq(field, null as any));
      }
      return q.or(q.eq(field, undefined as any), q.eq(field, null as any));

    case "contains":
    case "like":
    case "near":
      throw new Error(
        `Operator "${cmp.operator}" requires post-filtering or custom index. ` +
          `Field: ${cmp.field}, Value: ${JSON.stringify(cmp.value)}`
      );

    default:
      throw new Error(
        `Unsupported operator: ${cmp.operator} on field ${cmp.field}`
      );
  }
}

/**
 * Gets a nested value from a Convex document using dot notation.
 * @internal
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    const key = normalizeFieldSegment(part);
    current = current[key];
  }
  return current;
}

/**
 * Evaluates a comparison against a document.
 * @internal
 */
function evaluateComparison(doc: any, cmp: WhereComparison): boolean {
  const value = getNestedValue(doc, cmp.field);
  const compareValue = cmp.value as any;

  switch (cmp.operator) {
    case "equals":
      return value === compareValue;
    case "not_equals":
      return value !== compareValue;
    case "greater_than":
      return value > compareValue;
    case "greater_than_equal":
      return value >= compareValue;
    case "less_than":
      return value < compareValue;
    case "less_than_equal":
      return value <= compareValue;
    case "in":
      return Array.isArray(compareValue) && compareValue.includes(value);
    case "not_in":
      return Array.isArray(compareValue) && !compareValue.includes(value);
    case "exists":
      return compareValue ? value !== undefined : value === undefined;
    case "contains":
      return (
        typeof value === "string" &&
        typeof compareValue === "string" &&
        value.includes(compareValue)
      );
    case "like":
      if (typeof value !== "string" || typeof compareValue !== "string")
        return false;
      const pattern = compareValue.replace(/%/g, ".*").replace(/_/g, ".");
      return new RegExp(`^${pattern}$`, "i").test(value);
    default:
      return true;
  }
}

/**
 * Evaluates a where node against a document.
 * @internal
 */
function evaluateNode(doc: any, node: WhereNode): boolean {
  switch (node.type) {
    case "and":
      return node.nodes.every((n) => evaluateNode(doc, n));

    case "or":
      return node.nodes.some((n) => evaluateNode(doc, n));

    case "not":
      return !evaluateNode(doc, node.node);

    case "comparison":
      return evaluateComparison(doc, node.comparison);
  }
}

/**
 * Applies post-processing filter to documents in memory.
 */
export function applyPostFilter(
  documents: any[],
  postFilter: ParsedWhereFilter,
  debug: boolean = false
): any[] {
  if (!postFilter) return documents;

  if (debug) {
    console.log("[applyPostFilter] Input docs:", documents.length);
    console.log(
      "[applyPostFilter] Filter:",
      JSON.stringify(postFilter, null, 2)
    );
  }

  const result = documents.filter((doc) => {
    const passes = evaluateNode(doc, postFilter);
    if (debug) {
      console.log("[applyPostFilter] Doc evaluation:", {
        docId: doc._id,
        passes,
        docKeys: Object.keys(doc).slice(0, 5),
      });
    }
    return passes;
  });

  if (debug) {
    console.log("[applyPostFilter] Output docs:", result.length);
  }

  return result;
}

/**
 * Applies an enhanced where plan to a Convex query.
 */
export function applyWherePlan<T extends any>(
  baseQuery: T,
  wherePlan: EnhancedParsedWhereFilter | null | undefined
): T {
  if (!wherePlan || !wherePlan.dbFilter) {
    return baseQuery;
  }

  // Apply DB filter
  return (baseQuery as any).filter((q: any) => {
    const expr = buildConvexFilter(q, wherePlan.dbFilter);
    if (expr === true) return true;
    if (expr === false) return false;
    return expr;
  }) as T;
}

// ============================================================================
// Data Compilation (migrated from data-compiler.ts)
// ============================================================================

/**
 * Generic type representing any data object.
 */
export type PayloadData = Record<string, any>;

/**
 * Generic type representing any data object in Convex format.
 */
export type ConvexData = Record<string, any>;

/**
 * Key transformer function type.
 */
export type KeyTransformer = (key: string) => string;

/**
 * Value transformer function type.
 */
export type ValueTransformer = (value: any, key: string) => any;

/**
 * Default key transformer for Payload to Convex.
 *
 * Transformation rules:
 * 1. Payload special fields (id, createdAt) → Convex system fields
 * 2. Payload system fields starting with _ or $ → prefixed with pca_
 * 3. Regular user fields (including updatedAt) → unchanged
 *
 * Examples:
 * - "id" → "_id" (Payload → Convex system field)
 * - "createdAt" → "_creationTime"
 * - "updatedAt" → "updatedAt" (user field, NOT mutated)
 * - "_status" → "pca__status" (Payload system field)
 * - "_custom" → "pca__custom" (Payload system field)
 * - "$inc" → "pca_$inc" (Payload operator field)
 * - "title" → "title" (user field, unchanged)
 * - "author" → "author" (user field, unchanged)
 */
const defaultKeyToConvex: KeyTransformer = (key: string): string => {
  // Special Payload fields that map to Convex system fields
  if (key === "id") return "_id";
  if (key === "createdAt") return "_creationTime";

  // Convex system fields (already in Convex format) - preserve as-is
  if (key === "_id" || key === "_creationTime" || key === "_updatedTime") {
    return key;
  }

  // Payload system fields starting with _ or $ need prefixing
  if (key.startsWith("_") || key.startsWith("$")) {
    return `pca_${key}`;
  }

  // Regular user fields pass through unchanged (including updatedAt)
  return key;
};

/**
 * Default key transformer for Convex to Payload.
 *
 * Transformation rules:
 * 1. Convex system time field → Payload conventions (createdAt only)
 * 2. Prefixed Payload system fields (pca__status) → unprefixed (_status)
 * 3. _id preserved (will add .id separately in transformObjectToPayload)
 * 4. Regular user fields (including updatedAt) → unchanged
 *
 * Examples:
 * - "_creationTime" → "createdAt"
 * - "_updatedTime" → "_updatedTime" (preserved, NOT mutated)
 * - "_id" → "_id" (preserved, .id added later)
 * - "updatedAt" → "updatedAt" (user field, unchanged)
 * - "pca__status" → "_status"
 * - "pca__custom" → "_custom"
 * - "pca_$inc" → "$inc"
 * - "title" → "title" (user field, unchanged)
 */
const defaultKeyToPayload: KeyTransformer = (key: string): string => {
  // Transform Convex system time field to Payload conventions (createdAt only)
  if (key === "_creationTime") return "createdAt";

  // Preserve _id (we'll add .id separately in transformObjectToPayload)
  if (key === "_id") return "_id";

  // Preserve _updatedTime as system field (not transformed to updatedAt)
  if (key === "_updatedTime") return "_updatedTime";

  // Remove pca_ prefix from Payload system fields
  if (key.startsWith("pca_")) {
    return key.replace("pca_", "");
  }

  // All other fields pass through unchanged
  return key;
};

/**
 * Default value transformer (pass-through).
 */
const defaultValueTransformer: ValueTransformer = (value: any) => value;

/**
 * Recursively transforms a value from Payload to Convex format.
 *
 * Processes:
 * - Date objects → Unix timestamps
 * - ISO date strings → Unix timestamps
 * - Arrays/objects recursively for dates
 *
 * Does NOT transform field names (only done at top level).
 */
function transformValueToConvex(value: any, key: string = ""): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Date objects - convert to Unix timestamp
  if (value instanceof Date) {
    return value.getTime();
  }

  // Handle arrays - recursively transform elements for dates
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item, index) => transformValueToConvex(item, `${key}[${index}]`));
  }

  // Handle nested objects - recursively process for dates
  // Keys remain unchanged in nested objects (no pca_ prefix applied)
  if (typeof value === "object") {
    const result: any = {};
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      // Keep original key name - no transformation for nested keys
      result[nestedKey] = transformValueToConvex(
        nestedValue,
        `${key}.${nestedKey}`
      );
    }
    return result;
  }

  // Handle ISO date strings - convert to Unix timestamp
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  ) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  // All other primitives pass through unchanged
  return value;
}

/**
 * Transforms an object from Payload to Convex format.
 *
 * - Transforms top-level keys using defaultKeyToConvex
 * - Processes values for date conversion
 * - Nested object keys remain unchanged (no pca_ prefix)
 *
 * Example:
 * Input:  { _status: "draft", title: "Hello", meta: { _custom: "val" } }
 * Output: { pca__status: "draft", title: "Hello", meta: { _custom: "val" } }
 */
function transformObjectToConvex(obj: PayloadData): ConvexData {
  const result: ConvexData = {};

  for (const [originalKey, value] of Object.entries(obj)) {
    // Transform top-level key only (applies pca_ prefix to _ and $ fields)
    const transformedKey = defaultKeyToConvex(originalKey);

    // Transform value (dates only, nested keys unchanged)
    const transformedValue = transformValueToConvex(value, transformedKey);

    result[transformedKey] = transformedValue;
  }

  return result;
}

/**
 * Recursively transforms a value from Convex to Payload format.
 *
 * Processes:
 * - Timestamps → ISO date strings (for date-like fields)
 * - Arrays/objects recursively for dates
 *
 * Does NOT transform field names (only done at top level).
 */
function transformValueToPayload(value: any, key: string = ""): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle timestamps - convert to ISO strings for date-like fields
  if (
    typeof value === "number" &&
    key !== "_creationTime" &&
    key !== "_updatedTime" &&
    key !== "_id" &&
    key !== "id" &&
    // Detect date-like field names
    (key.toLowerCase().includes("at") ||
      key.toLowerCase().includes("date") ||
      key.toLowerCase().includes("time"))
  ) {
    // Check if it's a reasonable timestamp (between year 2000 and 2100)
    const year2000 = 946684800000;
    const year2100 = 4102444800000;
    if (value >= year2000 && value <= year2100) {
      return new Date(value).toISOString();
    }
  }

  // Handle arrays - recursively process for dates
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      transformValueToPayload(item, `${key}[${index}]`)
    );
  }

  // Handle nested objects - recursively process for dates
  // Keys remain unchanged in nested objects
  if (typeof value === "object" && !(value instanceof Date)) {
    const result: any = {};
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      // Keep original key name - no transformation for nested keys
      result[nestedKey] = transformValueToPayload(
        nestedValue,
        `${key}.${nestedKey}`
      );
    }
    return result;
  }

  // All other primitives pass through unchanged
  return value;
}

/**
 * Transforms an object from Convex to Payload format.
 *
 * - Transforms top-level keys using defaultKeyToPayload
 * - Removes pca_ prefix from Payload system fields
 * - Adds .id field from _id for Payload compatibility
 * - Processes values for date conversion
 * - Nested object keys remain unchanged
 *
 * Example:
 * Input:  { _id: "123", pca__status: "draft", title: "Hello" }
 * Output: { _id: "123", id: "123", _status: "draft", title: "Hello" }
 */
function transformObjectToPayload(obj: ConvexData): PayloadData {
  const result: PayloadData = {};

  for (const [originalKey, value] of Object.entries(obj)) {
    // Transform top-level key (removes pca_ prefix, transforms time fields)
    const transformedKey = defaultKeyToPayload(originalKey);

    // Transform value (dates only, nested keys unchanged)
    const transformedValue = transformValueToPayload(value, transformedKey);

    result[transformedKey] = transformedValue;
  }

  // Special handling: Add .id field from _id for Payload compatibility
  if (result._id !== undefined && result._id !== null) {
    result.id = result._id;
  }

  return result;
}

/**
 * Transforms data from Payload format to Convex format.
 */
function compileToConvex<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((doc) => transformObjectToConvex(doc)) as T;
  }
  if (typeof data === "object") {
    return transformObjectToConvex(data as PayloadData) as T;
  }
  return data;
}

/**
 * Transforms data from Convex format to Payload format.
 */
function compileToPayload<T>(data: T | null | undefined): T | null | undefined {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((doc) => transformObjectToPayload(doc)) as T;
  }
  if (typeof data === "object") {
    return transformObjectToPayload(data as ConvexData) as T;
  }
  return data;
}

/**
 * Transforms a paginated result from Convex format to Payload format.
 */
function compilePaginatedToPayload<T>(result: {
  page: T[];
  continueCursor: string;
  isDone: boolean;
}): { page: T[]; continueCursor: string; isDone: boolean } {
  return {
    ...result,
    page: result.page.map((doc) => transformObjectToPayload(doc as any)) as T[],
  };
}

// ============================================================================
// Convex Query Normalization
// ============================================================================

/**
 * Props for normalizing a Convex query with collection and index configuration.
 */
export type NormalizeConvexQueryProps = {
  ctx: GenericQueryCtx<GenericDataModel>;
  service: AdapterService;
  collection: string;
  index?: AdapaterQueryIndex;
};

/**
 * @function normalizeConvexQuery
 * Normalizes a Convex query by applying collection prefix and optional index configuration.
 * This is the foundation for all collection-based queries.
 *
 * @param {NormalizeConvexQueryProps} props - The query configuration
 * @param {GenericQueryCtx<GenericDataModel>} props.ctx - The Convex query context
 * @param {AdapterService} props.service - The adapter service instance
 * @param {string} props.collection - The collection name to query
 * @param {AdapaterQueryIndex} props.index - Optional index configuration
 * @returns {Query} A Convex query builder configured with collection and index
 */
export function normalizeConvexQuery(props: NormalizeConvexQueryProps) {
  const { ctx, service, collection, index } = props;

  const collectionId = service.tools.parseCollection({
    prefix: service.system.prefix,
    collection: collection,
  });

  if (index) {
    if (typeof index.indexRange === "function") {
      return ctx.db
        .query(collectionId)
        .withIndex(index.indexName, index.indexRange);
    } else {
      return ctx.db
        .query(collectionId)
        .withIndex(index.indexName, (q: any) => q);
    }
  }
  return ctx.db.query(collectionId);
}

// ============================================================================
// Chainable API Type Definitions
// ============================================================================

/**
 * Chainable query builder for Convex operations.
 * Enables fluent API: processor.query().filter().postFilter().toPayload()
 */
export type ConvexQueryChain = {
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
export type ConvexPaginatedChain = {
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
 * Internal state for the query chain.
 */
type QueryChainState = {
  ctx: GenericQueryCtx<GenericDataModel> | GenericMutationCtx<GenericDataModel>;
  service: AdapterService;
  collection: string;
  wherePlan?: EnhancedParsedWhereFilter;
  index?: AdapaterQueryIndex;

  // Chain state
  baseQuery: any;
  shouldPostFilter: boolean;
  orderDirection?: "asc" | "desc";
  takeLimit?: number;
};

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Processed output for Convex operations.
 * Contains all the data needed to execute a Convex query/mutation.
 */
export type ProcessedConvexQueryProps = {
  /** Prefixed collection ID */
  collection: string;
  /** Parsed where filter with hybrid filtering support */
  wherePlan: EnhancedParsedWhereFilter;
  /** Compiled data safe for Convex (with pca_ prefix for Payload system fields, dates as timestamps) */
  data?: Record<string, unknown>;
  /** Limit for query results */
  limit?: number;
  /** Sort order */
  order?: "asc" | "desc";
  /** Pagination options */
  paginationOpts?: { numItems: number; cursor: string | null };
  /** Optional index configuration */
  index?: AdapaterQueryIndex;
};

/**
 * Adapter-side QueryProcessor result.
 * Provides convexQueryProps to pass to Convex and methods to process results.
 */
export type AdapterQueryProcessor = {
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
  }): { page: T[]; continueCursor: string; isDone: boolean };
  /** Compile data to Convex format (for direct use) */
  compileToConvex<T>(data: T): T;
  /** Compile data to Payload format (for direct use) */
  compileToPayload<T>(data: T): T;
};

/**
 * Convex-side QueryProcessor result.
 * Provides chainable query building API.
 */
export type ConvexQueryProcessor = {
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
    ctx:
      | GenericQueryCtx<GenericDataModel>
      | GenericMutationCtx<GenericDataModel>;
    service: AdapterService;
    wherePlan: EnhancedParsedWhereFilter;
    collection: string;
    index?: AdapaterQueryIndex;
  }): ReturnType<
    typeof applyWherePlan<ReturnType<typeof normalizeConvexQuery>>
  >;
};

/**
 * Input props for adapter-side QueryProcessor.
 */
export type AdapterQueryProcessorProps = {
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
export type ConvexQueryProcessorProps = {
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

// ============================================================================
// Adapter-Side QueryProcessor
// ============================================================================

/**
 * Creates an adapter-side QueryProcessor.
 * Runs on the client/adapter side before sending to Convex.
 *
 * @param {AdapterQueryProcessorProps} props - The processor configuration
 * @returns {AdapterQueryProcessor} The processor instance
 *
 * @example
 * ```typescript
 * const processedQuery = queryProcessor({
 *   service,
 *   collection: 'posts',
 *   where: { status: { equals: 'published' } },
 *   data: { title: 'Hello' },
 *   limit: 10,
 *   sort: '-createdAt',
 *   convex: false,
 * });
 *
 * const result = await client.query(api.adapter.collectionWhereQuery,
 *   processedQuery.convexQueryProps
 * );
 *
 * return processedQuery.processResult(result);
 * ```
 */
function createAdapterQueryProcessor(
  props: AdapterQueryProcessorProps
): AdapterQueryProcessor {
  const {
    service,
    collection,
    where,
    wherePlan: inputWherePlan,
    data,
    limit,
    sort,
    order: inputOrder,
    pagination,
    page,
    index,
  } = props;

  // 1. Process collection name with prefix
  const collectionId = parseCollection({
    prefix: service.system.prefix,
    collection,
  });

  // 2. Process where clause into WherePlan (use pre-parsed if provided)
  const wherePlan = inputWherePlan || parsePayloadWhere(where);

  // 3. Transform data to Convex-safe format (apply pca_ prefix for Payload system fields, convert dates)
  const compiledData = data ? compileToConvex(data) : undefined;

  // 4. Process sort into order (use direct order if provided)
  const order: "asc" | "desc" =
    inputOrder ||
    (typeof sort === "string" && sort.startsWith("-") ? "desc" : "asc");

  // 5. Build pagination options if needed
  let paginationOpts: { numItems: number; cursor: string | null } | undefined;
  if (pagination && limit && page) {
    paginationOpts = {
      numItems: limit,
      cursor: null, // TODO: Support cursor-based pagination
    };
  }

  // 6. Build convex query props
  const convexQueryProps: ProcessedConvexQueryProps = {
    collection: collectionId,
    wherePlan,
    data: compiledData,
    limit,
    order,
    paginationOpts,
    index,
  };

  return {
    convexQueryProps,

    // Process results from Convex back to Payload format
    processResult<T>(result: T): T {
      const compiled = compileToPayload(result);
      return (compiled ?? result) as T;
    },

    processConvexQueryResult<T>(result: T): T {
      const compiled = compileToPayload(result);
      return (compiled ?? result) as T;
    },

    // Helper for paginated results
    processPaginatedResult<T>(result: {
      page: T[];
      continueCursor: string;
      isDone: boolean;
    }) {
      return compilePaginatedToPayload(result);
    },

    // Direct compilation methods
    compileToConvex<T>(data: T): T {
      const compiled = compileToConvex(data);
      return (compiled ?? data) as T;
    },

    compileToPayload<T>(data: T): T {
      const compiled = compileToPayload(data);
      return (compiled ?? data) as T;
    },
  };
}

// ============================================================================
// Chainable Query Implementation
// ============================================================================

/**
 * Creates a ConvexQueryChain with chainable methods.
 */
function createQueryChain(state: QueryChainState): ConvexQueryChain {
  const chain: ConvexQueryChain = {
    filter(): ConvexQueryChain {
      // Apply DB filter from wherePlan if available
      if (state.wherePlan?.dbFilter) {
        state.baseQuery = applyWherePlan(state.baseQuery, state.wherePlan);
      }
      return chain;
    },

    postFilter(): ConvexQueryChain {
      state.shouldPostFilter = true;
      return chain;
    },

    order(direction: "asc" | "desc"): ConvexQueryChain {
      state.orderDirection = direction;
      return chain;
    },

    take(n: number): ConvexQueryChain {
      state.takeLimit = n;
      return chain;
    },

    paginate(opts: PaginationOptions): ConvexPaginatedChain {
      return createPaginatedChain(state, opts);
    },

    async collect<T>(): Promise<T[]> {
      let query = state.baseQuery;

      // Apply ordering if specified
      if (state.orderDirection) {
        query = query.order(state.orderDirection);
      }

      // Execute query
      let results: T[];
      if (state.takeLimit !== undefined) {
        results = await query.take(state.takeLimit);
      } else {
        results = await query.collect();
      }

      // Apply post-filter if marked
      if (state.shouldPostFilter && state.wherePlan?.postFilter) {
        results = applyPostFilter(results, state.wherePlan.postFilter) as T[];
      }

      return results;
    },

    async toPayload<T>(): Promise<T[]> {
      const results = await chain.collect<T>();
      return compileToPayload(results) as T[];
    },

    async first<T>(): Promise<T | null> {
      const results = await chain.take(1).collect<T>();
      return results.length > 0 ? results[0] : null;
    },
  };

  return chain;
}

/**
 * Creates a ConvexPaginatedChain for paginated queries.
 */
function createPaginatedChain(
  state: QueryChainState,
  paginationOpts: PaginationOptions
): ConvexPaginatedChain {
  let shouldPostFilter = state.shouldPostFilter;

  const chain: ConvexPaginatedChain = {
    postFilter(): ConvexPaginatedChain {
      shouldPostFilter = true;
      return chain;
    },

    async collect<T>(): Promise<{
      page: T[];
      continueCursor: string;
      isDone: boolean;
    }> {
      let query = state.baseQuery;

      // Apply ordering if specified
      if (state.orderDirection) {
        query = query.order(state.orderDirection);
      }

      // Execute paginated query
      const result = await query.paginate(paginationOpts);

      // Apply post-filter if marked
      if (shouldPostFilter && state.wherePlan?.postFilter) {
        return {
          ...result,
          page: applyPostFilter(result.page, state.wherePlan.postFilter) as T[],
        };
      }

      return result;
    },

    async toPayload<T>(): Promise<{
      page: T[];
      continueCursor: string;
      isDone: boolean;
    }> {
      const result = await chain.collect<T>();
      return compilePaginatedToPayload(result);
    },
  };

  return chain;
}

// ============================================================================
// Convex-Side QueryProcessor
// ============================================================================

/**
 * Creates a Convex-side QueryProcessor with chainable API.
 * Runs inside Convex query/mutation handlers.
 *
 * @param {ConvexQueryProcessorProps} props - The processor configuration
 * @returns {ConvexQueryProcessor} The processor instance
 *
 * @example
 * ```typescript
 * const processor = queryProcessor({
 *   ctx, service, collection, wherePlan, index, convex: true
 * });
 * const results = await processor.query().postFilter().toPayload();
 * ```
 */
function createConvexQueryProcessor(
  props: ConvexQueryProcessorProps
): ConvexQueryProcessor {
  const { ctx, service, collection, wherePlan, index } = props;

  return {
    query(): ConvexQueryChain {
      // Build the base Convex query with collection and optional index
      const baseQuery = normalizeConvexQuery({
        ctx: ctx as GenericQueryCtx<GenericDataModel>,
        service,
        collection,
        index,
      });

      // Create initial chain state
      const state: QueryChainState = {
        ctx,
        service,
        collection,
        wherePlan,
        index,
        baseQuery,
        shouldPostFilter: false,
      };

      // Return chain with filter already applied if wherePlan has dbFilter
      const chain = createQueryChain(state);

      // Auto-apply DB filter if present
      if (wherePlan?.dbFilter) {
        return chain.filter();
      }

      return chain;
    },

    applyPostFilter<T>(results: T[], plan?: EnhancedParsedWhereFilter): T[] {
      const effectivePlan = plan || wherePlan;
      if (effectivePlan?.postFilter) {
        return applyPostFilter(results, effectivePlan.postFilter) as T[];
      }
      return results;
    },

    toPayload<T>(data: T): T {
      return compileToPayload(data) as T;
    },

    // Legacy method for backward compatibility
    processWherePlan<T extends any>(context: {
      ctx:
        | GenericQueryCtx<GenericDataModel>
        | GenericMutationCtx<GenericDataModel>;
      service: AdapterService;
      wherePlan: EnhancedParsedWhereFilter;
      collection: string;
      index?: AdapaterQueryIndex;
    }): T {
      const {
        ctx: contextCtx,
        service: contextService,
        wherePlan: contextWherePlan,
        collection: contextCollection,
        index: contextIndex,
      } = context;

      // Build base query with collection prefix
      const baseQuery = normalizeConvexQuery({
        ctx: contextCtx as GenericQueryCtx<GenericDataModel>,
        service: contextService,
        collection: contextCollection,
        index: contextIndex,
      });

      // Apply DB filter from wherePlan
      const filtered = applyWherePlan(baseQuery, contextWherePlan);

      return filtered as T;
    },
  };
}

// ============================================================================
// Unified QueryProcessor API
// ============================================================================

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
export function queryProcessor(
  props: AdapterQueryProcessorProps
): AdapterQueryProcessor;
export function queryProcessor(
  props: ConvexQueryProcessorProps
): ConvexQueryProcessor;
export function queryProcessor(
  props: AdapterQueryProcessorProps | ConvexQueryProcessorProps
): AdapterQueryProcessor | ConvexQueryProcessor {
  if (props.convex === false) {
    return createAdapterQueryProcessor(props as AdapterQueryProcessorProps);
  }
  return createConvexQueryProcessor(props as ConvexQueryProcessorProps);
}
