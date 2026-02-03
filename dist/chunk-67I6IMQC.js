import { __export } from './chunk-OTSZFWCO.js';
import { v4 } from 'uuid';

// src/tools/is-client.ts
var isClient = typeof window !== "undefined";

// src/tools/is-dev.ts
var isDev = process.env.NODE_ENV === "development";

// src/tools/parse-collection.ts
function parseCollection(props) {
  const { prefix, collection } = props;
  if (collection.startsWith(`${prefix}_`)) {
    return collection;
  }
  const sanitizedCollection = collection.replace(/-/g, "_");
  return `${prefix}_${sanitizedCollection}`;
}

// src/tools/query-processor.ts
function classifyComparison(comparison) {
  if (comparison.field.includes(".")) {
    return false;
  }
  const unsupportedOps = ["contains", "like", "near"];
  if (unsupportedOps.includes(comparison.operator)) {
    return false;
  }
  return true;
}
function classifyWhereNode(node) {
  switch (node.type) {
    case "comparison":
      return classifyComparison(node.comparison);
    case "and":
    case "or":
      return node.nodes.every(classifyWhereNode);
    case "not":
      return classifyWhereNode(node.node);
  }
}
function splitWhereNode(node) {
  if (classifyWhereNode(node)) {
    return { dbFilter: node, postFilter: null };
  }
  if (node.type === "comparison") {
    return { dbFilter: null, postFilter: node };
  }
  if (node.type === "not") {
    return { dbFilter: null, postFilter: node };
  }
  if (node.type === "and") {
    const dbNodes = [];
    const postNodes = [];
    for (const child of node.nodes) {
      if (classifyWhereNode(child)) {
        dbNodes.push(child);
      } else {
        postNodes.push(child);
      }
    }
    return {
      dbFilter: dbNodes.length > 0 ? dbNodes.length === 1 ? dbNodes[0] : { type: "and", nodes: dbNodes } : null,
      postFilter: postNodes.length > 0 ? postNodes.length === 1 ? postNodes[0] : { type: "and", nodes: postNodes } : null
    };
  }
  if (node.type === "or") {
    const allDbCompatible = node.nodes.every(classifyWhereNode);
    if (allDbCompatible) {
      return { dbFilter: node, postFilter: null };
    }
    return { dbFilter: null, postFilter: node };
  }
  return { dbFilter: null, postFilter: node };
}
function parsePayloadWhere(where) {
  if (!where || Object.keys(where).length === 0) {
    return { strategy: "db", dbFilter: null, postFilter: null };
  }
  const parsedNode = parseWhereObject(where);
  if (!parsedNode) {
    return { strategy: "db", dbFilter: null, postFilter: null };
  }
  const { dbFilter, postFilter } = splitWhereNode(parsedNode);
  let strategy;
  if (dbFilter && !postFilter) {
    strategy = "db";
  } else if (!dbFilter && postFilter) {
    strategy = "post";
  } else {
    strategy = "hybrid";
  }
  return { strategy, dbFilter, postFilter };
}
function createWherePlan(props) {
  const { where } = props;
  return parsePayloadWhere(where ?? void 0);
}
function emptyWherePlan() {
  return { strategy: "db", dbFilter: null, postFilter: null };
}
function parseWhereObject(where) {
  const nodes = [];
  if (Array.isArray(where.and)) {
    nodes.push({
      type: "and",
      nodes: where.and.map(parseWhereObject)
    });
  }
  if (Array.isArray(where.or)) {
    nodes.push({
      type: "or",
      nodes: where.or.map(parseWhereObject)
    });
  }
  if ("not" in where && where.not && typeof where.not === "object") {
    nodes.push({
      type: "not",
      node: parseWhereObject(where.not)
    });
  }
  for (const [field, value] of Object.entries(where)) {
    if (field === "and" || field === "or" || field === "not") continue;
    if (!value || typeof value !== "object") continue;
    const fieldConditions = parseWhereField(field, value);
    nodes.push(...fieldConditions);
  }
  if (nodes.length === 0) {
    return {
      type: "comparison",
      comparison: {
        field: "_id",
        operator: "exists",
        value: true
      }
    };
  }
  if (nodes.length === 1) return nodes[0];
  return { type: "and", nodes };
}
function convertDateValue(value) {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }
  return value;
}
function parseWhereField(field, fieldValue) {
  const nodes = [];
  for (const [operator, value] of Object.entries(fieldValue)) {
    nodes.push({
      type: "comparison",
      comparison: {
        field,
        operator,
        value: convertDateValue(value)
      }
    });
  }
  return nodes;
}
function buildConvexFilter(q, node) {
  if (!node) return true;
  return buildNode(q, node);
}
function buildNode(q, node) {
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
function normalizeFieldSegment(segment) {
  if (segment === "id") return "_id";
  if (segment === "_id") return "_id";
  if (segment === "createdAt") return "_creationTime";
  if (segment === "_creationTime") return "_creationTime";
  if (segment === "updatedAt") return "_updatedTime";
  if (segment === "_updatedTime") return "_updatedTime";
  return `payvex_${segment}`;
}
function normalizeField(field) {
  if (field.includes(".")) {
    return field.split(".").map(normalizeFieldSegment).join(".");
  }
  return normalizeFieldSegment(field);
}
function buildComparison(q, cmp) {
  const field = q.field(normalizeField(cmp.field));
  switch (cmp.operator) {
    case "equals":
      return q.eq(field, cmp.value);
    case "not_equals":
      return q.neq(field, cmp.value);
    case "greater_than":
      return q.gt(field, cmp.value);
    case "greater_than_equal":
      return q.gte(field, cmp.value);
    case "less_than":
      return q.lt(field, cmp.value);
    case "less_than_equal":
      return q.lte(field, cmp.value);
    case "in": {
      if (!Array.isArray(cmp.value) || cmp.value.length === 0) {
        return false;
      }
      return q.or(...cmp.value.map((v) => q.eq(field, v)));
    }
    case "not_in": {
      if (!Array.isArray(cmp.value) || cmp.value.length === 0) {
        return true;
      }
      return q.and(...cmp.value.map((v) => q.neq(field, v)));
    }
    case "exists":
      if (cmp.value === true) {
        return q.and(q.neq(field, void 0), q.neq(field, null));
      }
      return q.or(q.eq(field, void 0), q.eq(field, null));
    case "contains":
    case "like":
    case "near":
      throw new Error(
        `Operator "${cmp.operator}" requires post-filtering or custom index. Field: ${cmp.field}, Value: ${JSON.stringify(cmp.value)}`
      );
    default:
      throw new Error(
        `Unsupported operator: ${cmp.operator} on field ${cmp.field}`
      );
  }
}
function getNestedValue(obj, path) {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === void 0) return void 0;
    const key = normalizeFieldSegment(part);
    current = current[key];
  }
  return current;
}
function evaluateComparison(doc, cmp) {
  const value = getNestedValue(doc, cmp.field);
  const compareValue = cmp.value;
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
      return compareValue ? value !== void 0 : value === void 0;
    case "contains":
      return typeof value === "string" && typeof compareValue === "string" && value.includes(compareValue);
    case "like":
      if (typeof value !== "string" || typeof compareValue !== "string")
        return false;
      const pattern = compareValue.replace(/%/g, ".*").replace(/_/g, ".");
      return new RegExp(`^${pattern}$`, "i").test(value);
    default:
      return true;
  }
}
function evaluateNode(doc, node) {
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
function applyPostFilter(documents, postFilter, debug = false) {
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
        docKeys: Object.keys(doc).slice(0, 5)
      });
    }
    return passes;
  });
  if (debug) {
    console.log("[applyPostFilter] Output docs:", result.length);
  }
  return result;
}
function applyWherePlan(baseQuery, wherePlan) {
  if (!wherePlan || !wherePlan.dbFilter) {
    return baseQuery;
  }
  return baseQuery.filter((q) => {
    const expr = buildConvexFilter(q, wherePlan.dbFilter);
    if (expr === true) return true;
    if (expr === false) return false;
    return expr;
  });
}
var defaultKeyToConvex = (key) => {
  if (key === "_id" || key === "_creationTime") {
    return key;
  }
  return `payvex_${key}`;
};
var defaultKeyToPayload = (key) => {
  if (key === "_id") return "id";
  if (key === "_creationTime") return "createdAt";
  if (key === "_updatedTime") return "updatedAt";
  if (key.startsWith("payvex_")) {
    return key.replace("payvex_", "");
  }
  return key;
};
function transformValueToConvex(value, key = "") {
  if (value === null || value === void 0) {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (Array.isArray(value)) {
    return value.filter((item) => item !== void 0).map((item, index) => transformValueToConvex(item, `${key}[${index}]`));
  }
  if (typeof value === "object") {
    return transformObjectToConvex(value);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }
  return value;
}
function transformObjectToConvex(obj) {
  const result = {};
  for (const [originalKey, value] of Object.entries(obj)) {
    const transformedKey = defaultKeyToConvex(originalKey);
    const transformedValue = transformValueToConvex(value, transformedKey);
    result[transformedKey] = transformedValue;
  }
  return result;
}
function transformValueToPayload(value, key = "") {
  if (value === null || value === void 0) {
    return value;
  }
  if (typeof value === "number" && key !== "_creationTime" && // Don't convert Convex system field
  key !== "_id" && // Don't convert IDs
  (key.toLowerCase().includes("at") || key.toLowerCase().includes("date") || key.toLowerCase().includes("time"))) {
    const year2000 = 9466848e5;
    const year2100 = 41024448e5;
    if (value >= year2000 && value <= year2100) {
      return new Date(value).toISOString();
    }
  }
  if (Array.isArray(value)) {
    return value.map(
      (item, index) => transformValueToPayload(item, `${key}[${index}]`)
    );
  }
  if (typeof value === "object" && !(value instanceof Date)) {
    return transformObjectToPayload(value);
  }
  return value;
}
function transformObjectToPayload(obj) {
  const result = {};
  for (const [originalKey, value] of Object.entries(obj)) {
    const transformedKey = defaultKeyToPayload(originalKey);
    const transformedValue = transformValueToPayload(value, transformedKey);
    result[transformedKey] = transformedValue;
  }
  return result;
}
function compileToConvex(data) {
  if (data === null || data === void 0) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((doc) => transformObjectToConvex(doc));
  }
  if (typeof data === "object") {
    return transformObjectToConvex(data);
  }
  return data;
}
function compileToPayload(data) {
  if (data === null || data === void 0) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((doc) => transformObjectToPayload(doc));
  }
  if (typeof data === "object") {
    return transformObjectToPayload(data);
  }
  return data;
}
function compilePaginatedToPayload(result) {
  return {
    ...result,
    page: result.page.map((doc) => transformObjectToPayload(doc))
  };
}
function normalizeConvexQuery(props) {
  const { ctx, service, collection, index } = props;
  const collectionId = service.tools.parseCollection({
    prefix: service.system.prefix,
    collection
  });
  if (index) {
    if (typeof index.indexRange === "function") {
      return ctx.db.query(collectionId).withIndex(index.indexName, index.indexRange);
    } else {
      return ctx.db.query(collectionId).withIndex(index.indexName, (q) => q);
    }
  }
  return ctx.db.query(collectionId);
}
function createAdapterQueryProcessor(props) {
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
    index
  } = props;
  const collectionId = parseCollection({
    prefix: service.system.prefix,
    collection
  });
  const wherePlan = inputWherePlan || parsePayloadWhere(where);
  const compiledData = data ? compileToConvex(data) : void 0;
  const order = inputOrder || (typeof sort === "string" && sort.startsWith("-") ? "desc" : "asc");
  let paginationOpts;
  if (pagination && limit && page) {
    paginationOpts = {
      numItems: limit,
      cursor: null
      // TODO: Support cursor-based pagination
    };
  }
  const convexQueryProps = {
    collection: collectionId,
    wherePlan,
    data: compiledData,
    limit,
    order,
    paginationOpts,
    index
  };
  return {
    convexQueryProps,
    // Process results from Convex back to Payload format
    processResult(result) {
      const compiled = compileToPayload(result);
      return compiled ?? result;
    },
    processConvexQueryResult(result) {
      const compiled = compileToPayload(result);
      return compiled ?? result;
    },
    // Helper for paginated results
    processPaginatedResult(result) {
      return compilePaginatedToPayload(result);
    },
    // Direct compilation methods
    compileToConvex(data2) {
      const compiled = compileToConvex(data2);
      return compiled ?? data2;
    },
    compileToPayload(data2) {
      const compiled = compileToPayload(data2);
      return compiled ?? data2;
    }
  };
}
function createQueryChain(state) {
  const chain = {
    filter() {
      if (state.wherePlan?.dbFilter) {
        state.baseQuery = applyWherePlan(state.baseQuery, state.wherePlan);
      }
      return chain;
    },
    postFilter() {
      state.shouldPostFilter = true;
      return chain;
    },
    order(direction) {
      state.orderDirection = direction;
      return chain;
    },
    take(n) {
      state.takeLimit = n;
      return chain;
    },
    paginate(opts) {
      return createPaginatedChain(state, opts);
    },
    async collect() {
      let query = state.baseQuery;
      if (state.orderDirection) {
        query = query.order(state.orderDirection);
      }
      let results;
      if (state.takeLimit !== void 0) {
        results = await query.take(state.takeLimit);
      } else {
        results = await query.collect();
      }
      if (state.shouldPostFilter && state.wherePlan?.postFilter) {
        results = applyPostFilter(results, state.wherePlan.postFilter);
      }
      return results;
    },
    async toPayload() {
      const results = await chain.collect();
      return compileToPayload(results);
    },
    async first() {
      const results = await chain.take(1).collect();
      return results.length > 0 ? results[0] : null;
    }
  };
  return chain;
}
function createPaginatedChain(state, paginationOpts) {
  let shouldPostFilter = state.shouldPostFilter;
  const chain = {
    postFilter() {
      shouldPostFilter = true;
      return chain;
    },
    async collect() {
      let query = state.baseQuery;
      if (state.orderDirection) {
        query = query.order(state.orderDirection);
      }
      const result = await query.paginate(paginationOpts);
      if (shouldPostFilter && state.wherePlan?.postFilter) {
        return {
          ...result,
          page: applyPostFilter(result.page, state.wherePlan.postFilter)
        };
      }
      return result;
    },
    async toPayload() {
      const result = await chain.collect();
      return compilePaginatedToPayload(result);
    }
  };
  return chain;
}
function createConvexQueryProcessor(props) {
  const { ctx, service, collection, wherePlan, index } = props;
  return {
    query() {
      const baseQuery = normalizeConvexQuery({
        ctx,
        service,
        collection,
        index
      });
      const state = {
        wherePlan,
        baseQuery,
        shouldPostFilter: false
      };
      const chain = createQueryChain(state);
      if (wherePlan?.dbFilter) {
        return chain.filter();
      }
      return chain;
    },
    applyPostFilter(results, plan) {
      const effectivePlan = plan || wherePlan;
      if (effectivePlan?.postFilter) {
        return applyPostFilter(results, effectivePlan.postFilter);
      }
      return results;
    },
    toPayload(data) {
      return compileToPayload(data);
    },
    // Legacy method for backward compatibility
    processWherePlan(context) {
      const {
        ctx: contextCtx,
        service: contextService,
        wherePlan: contextWherePlan,
        collection: contextCollection,
        index: contextIndex
      } = context;
      const baseQuery = normalizeConvexQuery({
        ctx: contextCtx,
        service: contextService,
        collection: contextCollection,
        index: contextIndex
      });
      const filtered = applyWherePlan(baseQuery, contextWherePlan);
      return filtered;
    }
  };
}
function queryProcessor(props) {
  if (props.convex === false) {
    return createAdapterQueryProcessor(props);
  }
  return createConvexQueryProcessor(props);
}
function createRandomID() {
  return v4();
}

// src/tools/session-tracker.ts
function createSessionTracker() {
  const sessions = /* @__PURE__ */ new Map();
  const createSession = (id) => {
    if (sessions.has(id)) {
      throw new Error(`Session ${id} already exists`);
    }
    const session = {
      id,
      state: "idle",
      createdAt: /* @__PURE__ */ new Date(),
      operations: []
    };
    sessions.set(id, session);
    return session;
  };
  const getSession = (id) => {
    return sessions.get(id);
  };
  const hasSession = (id) => {
    return sessions.has(id);
  };
  const startSession = (id) => {
    const session = sessions.get(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    if (session.state !== "idle") {
      throw new Error(
        `Cannot start session ${id}: session is already ${session.state}`
      );
    }
    session.state = "in-progress";
    session.startedAt = /* @__PURE__ */ new Date();
    return session;
  };
  const resolveSession = (id) => {
    const session = sessions.get(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    if (session.state !== "in-progress") {
      throw new Error(
        `Cannot resolve session ${id}: session is ${session.state}, expected in-progress`
      );
    }
    session.state = "resolved";
    session.resolvedAt = /* @__PURE__ */ new Date();
    return session;
  };
  const rejectSession = (id) => {
    const session = sessions.get(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    if (session.state !== "in-progress") {
      throw new Error(
        `Cannot reject session ${id}: session is ${session.state}, expected in-progress`
      );
    }
    session.state = "rejected";
    session.rejectedAt = /* @__PURE__ */ new Date();
    return session;
  };
  const deleteSession = (id) => {
    return sessions.delete(id);
  };
  const getIdleSessions = () => {
    return Array.from(sessions.values()).filter(
      (session) => session.state === "idle"
    );
  };
  const getInProgressSessions = () => {
    return Array.from(sessions.values()).filter(
      (session) => session.state === "in-progress"
    );
  };
  const getAllSessions = () => {
    return Array.from(sessions.values());
  };
  const clearAll = () => {
    sessions.clear();
  };
  const getIdleCount = () => {
    return getIdleSessions().length;
  };
  const getInProgressCount = () => {
    return getInProgressSessions().length;
  };
  const trackOperation = (sessionId, operation) => {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    if (session.state !== "in-progress") {
      throw new Error(
        `Cannot track operation for session ${sessionId}: session is ${session.state}, expected in-progress`
      );
    }
    const trackedOperation = {
      ...operation,
      id: `${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: /* @__PURE__ */ new Date()
    };
    session.operations.push(trackedOperation);
    return trackedOperation;
  };
  const getSessionOperations = (sessionId) => {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return [...session.operations];
  };
  const getSessionOperationsByType = (sessionId, type) => {
    const operations = getSessionOperations(sessionId);
    return operations.filter((op) => op.type === type);
  };
  const getSessionOperationsByCollection = (sessionId, collection) => {
    const operations = getSessionOperations(sessionId);
    return operations.filter((op) => op.collection === collection);
  };
  const clearSessionOperations = (sessionId) => {
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
    clearSessionOperations
  };
}

// src/tools/logger.ts
function createServiceLogger(props) {
  const { prefix } = props;
  const serviceLogger = (message) => {
    const log = logger({
      message: `PayloadConvexAdapter: ${prefix} -- ${message}`
    });
    return log;
  };
  return serviceLogger;
}
function logger(props) {
  return {
    log: () => console.log(props.message),
    error: () => console.error(props.message),
    warn: () => console.warn(props.message),
    info: () => console.info(props.message),
    debug: () => console.debug(props.message),
    trace: () => console.trace(props.message),
    dir: () => console.dir(props.message),
    table: () => console.table(props.message),
    group: () => console.group(props.message),
    groupEnd: () => console.groupEnd()
  };
}

// src/bindings/index.ts
var bindings_exports = {};
__export(bindings_exports, {
  counts: () => counts,
  creates: () => creates,
  deletes: () => deletes,
  drafts: () => drafts,
  finds: () => finds,
  migrations: () => migrations,
  transactions: () => transactions,
  updates: () => updates,
  upserts: () => upserts
});

// src/bindings/transactions/beginTransaction.ts
async function beginTransaction(props) {
  const { service } = props;
  const id = service.tools.createRandomID();
  const session = service.tools.sessionTracker.createSession(id);
  return session.id;
}

// src/bindings/transactions/commitTransaction.ts
async function commitTransaction(props) {
  const { service, incomingID } = props;
  const transactionID = incomingID instanceof Promise ? await incomingID : incomingID;
  const transactionIdStr = transactionID.toString();
  if (!service.tools.sessionTracker.hasSession(transactionIdStr)) {
    return;
  }
  const session = service.tools.sessionTracker.getSession(transactionIdStr);
  if (session?.state !== "in-progress") {
    service.tools.sessionTracker.deleteSession(transactionIdStr);
    return;
  }
  try {
    service.tools.sessionTracker.resolveSession(transactionIdStr);
  } catch (_) {
  }
  service.tools.sessionTracker.deleteSession(transactionIdStr);
}

// src/bindings/transactions/rollbackTransaction.ts
async function rollbackTransaction(props) {
  const { service, incomingID } = props;
  const transactionID = incomingID instanceof Promise ? await incomingID : incomingID;
  const transactionIdStr = transactionID.toString();
  if (!service.tools.sessionTracker.hasSession(transactionIdStr)) {
    return;
  }
  const session = service.tools.sessionTracker.getSession(transactionIdStr);
  if (session?.state !== "in-progress") {
    service.tools.sessionTracker.deleteSession(transactionIdStr);
    return;
  }
  try {
    service.tools.sessionTracker.rejectSession(transactionIdStr);
  } catch (_) {
  }
  service.tools.sessionTracker.deleteSession(transactionIdStr);
}

// src/bindings/count.ts
async function count(props) {
  const { service, incomingCount } = props;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCount,
    convex: false
  });
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
  return {
    totalDocs
  };
}
async function countVersions(props) {
  const { service, incomingCountVersions } = props;
  const { collection } = incomingCountVersions;
  const versionsCollection = `${collection}_versions`;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCountVersions,
    collection: versionsCollection,
    convex: false
  });
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
  return {
    totalDocs
  };
}
async function countGlobalVersions(props) {
  const { service, incomingCountGlobalVersions } = props;
  const { global } = incomingCountGlobalVersions;
  const globalVersionsCollection = `${global}_global_versions`;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCountGlobalVersions,
    collection: globalVersionsCollection,
    convex: false
  });
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
  return {
    totalDocs
  };
}

// src/bindings/create.ts
async function create(props) {
  const { service, incomingCreate } = props;
  const { collection, data, draft, returning = true } = incomingCreate;
  const documentData = draft ? { ...data, _status: "draft" } : data;
  const docId = await service.db.mutation({}).insert.adapter({
    service,
    collection,
    data: documentData
  });
  if (!returning) {
    return { id: docId };
  }
  const doc = await service.db.query({}).getById.adapter({
    service,
    collection,
    id: docId
  });
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCreate,
    convex: false
  });
  return processedQuery.processResult(doc);
}
async function createGlobal(props) {
  const { service, incomingCreateGlobal } = props;
  const { slug, data, returning = true } = incomingCreateGlobal;
  const globalCollection = `_globals_${slug}`;
  const docId = await service.db.mutation({}).insert.adapter({
    service,
    collection: globalCollection,
    data
  });
  if (!returning) {
    return { id: docId };
  }
  const doc = await service.db.query({}).getById.adapter({
    service,
    collection: globalCollection,
    id: docId
  });
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCreateGlobal,
    collection: globalCollection,
    convex: false
  });
  return processedQuery.processResult(doc);
}
async function createVersion(props) {
  const { service, incomingCreateVersion } = props;
  const {
    collectionSlug,
    parent,
    versionData,
    autosave,
    createdAt,
    updatedAt,
    publishedLocale,
    returning = true,
    snapshot
  } = incomingCreateVersion;
  const versionsCollection = `${collectionSlug}_versions`;
  const versionDoc = {
    parent,
    version: versionData,
    autosave,
    createdAt,
    updatedAt,
    publishedLocale,
    latest: true
    // Mark as latest version
  };
  if (snapshot !== void 0) {
    versionDoc.snapshot = snapshot;
  }
  const docId = await service.db.mutation({}).insert.adapter({
    service,
    collection: versionsCollection,
    data: versionDoc
  });
  if (!returning) {
    return { id: docId };
  }
  const doc = await service.db.query({}).getById.adapter({
    service,
    collection: versionsCollection,
    id: docId
  });
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCreateVersion,
    collection: versionsCollection,
    locale: publishedLocale,
    convex: false
  });
  return processedQuery.processResult(doc);
}
async function createGlobalVersion(props) {
  const { service, incomingCreateGlobalVersion } = props;
  const {
    globalSlug,
    versionData,
    autosave,
    createdAt,
    updatedAt,
    publishedLocale,
    returning = true,
    snapshot
  } = incomingCreateGlobalVersion;
  const globalVersionsCollection = `${globalSlug}_global_versions`;
  const versionDoc = {
    version: versionData,
    autosave,
    createdAt,
    updatedAt,
    publishedLocale,
    latest: true
    // Mark as latest version
  };
  if (snapshot !== void 0) {
    versionDoc.snapshot = snapshot;
  }
  const docId = await service.db.mutation({}).insert.adapter({
    service,
    collection: globalVersionsCollection,
    data: versionDoc
  });
  if (!returning) {
    return { id: docId };
  }
  const doc = await service.db.query({}).getById.adapter({
    service,
    collection: globalVersionsCollection,
    id: docId
  });
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingCreateGlobalVersion,
    collection: globalVersionsCollection,
    locale: publishedLocale,
    convex: false
  });
  return processedQuery.processResult(doc);
}
async function createMigration(props) {
  const { service, incomingCreateMigration } = props;
  service.system.logger(
    JSON.stringify(
      {
        binding: "createMigration",
        params: incomingCreateMigration
      },
      null,
      2
    )
  ).dir();
  console.log("Migration creation requested:", incomingCreateMigration);
}

// src/bindings/find.ts
async function find(props) {
  const { service, incomingFind } = props;
  const {
    collection,
    limit = 10,
    page = 1,
    pagination = true,
    skip
  } = incomingFind;
  const effectivePage = skip !== void 0 ? Math.floor(skip / limit) + 1 : page;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFind,
    page: effectivePage,
    convex: false
  });
  if (!pagination || limit === 0) {
    const rawDocs2 = await service.db.query({}).collectionWhereQuery.adapter({
      service,
      ...processedQuery.convexQueryProps
    });
    const docs2 = processedQuery.processResult(rawDocs2);
    return {
      docs: docs2,
      totalDocs: docs2.length,
      limit: docs2.length,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      pagingCounter: 1
    };
  }
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
  const totalPages = Math.ceil(totalDocs / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const pagingCounter = (page - 1) * limit + 1;
  const allDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc"
  });
  const skipAmount = skip !== void 0 ? skip : (effectivePage - 1) * limit;
  const rawDocs = allDocs.slice(skipAmount, skipAmount + limit);
  const docs = processedQuery.processResult(rawDocs);
  return {
    docs,
    totalDocs,
    limit,
    page: effectivePage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pagingCounter,
    nextPage: hasNextPage ? effectivePage + 1 : null,
    prevPage: hasPrevPage ? effectivePage - 1 : null
  };
}
async function findOne(props) {
  const { service, incomingFindOne } = props;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFindOne,
    limit: 1,
    convex: false
  });
  const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    limit: processedQuery.convexQueryProps.limit
  });
  if (!docs || docs.length === 0) {
    return null;
  }
  return processedQuery.processResult(docs[0]);
}
async function findDistinct(props) {
  const { service, incomingFindDistinct } = props;
  const { field, limit = 10, page = 1 } = incomingFindDistinct;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFindDistinct,
    convex: false
  });
  const allDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc"
  });
  const processedDocs = processedQuery.processResult(allDocs);
  const valueSet = /* @__PURE__ */ new Set();
  for (const doc of processedDocs) {
    const value = doc[field];
    if (value !== void 0 && value !== null) {
      valueSet.add(value);
    }
  }
  const allValues = Array.from(valueSet);
  const totalDocs = allValues.length;
  const totalPages = Math.ceil(totalDocs / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const pagingCounter = (page - 1) * limit + 1;
  const skip = (page - 1) * limit;
  const values = allValues.slice(skip, skip + limit);
  return {
    values: values.map((v) => ({ [field]: v })),
    totalDocs,
    limit,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pagingCounter,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
}
async function findGlobal(props) {
  const { service, incomingFindGlobal } = props;
  const { slug } = incomingFindGlobal;
  const globalCollection = `_globals_${slug}`;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFindGlobal,
    collection: globalCollection,
    limit: 1,
    convex: false
  });
  const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    limit: processedQuery.convexQueryProps.limit
  });
  if (!docs || docs.length === 0) {
    return {};
  }
  return processedQuery.processResult(docs[0]);
}
async function findVersions(props) {
  const { service, incomingFindVersions } = props;
  const {
    collection,
    limit = 10,
    page = 1,
    pagination = true,
    skip
  } = incomingFindVersions;
  const effectivePage = skip !== void 0 ? Math.floor(skip / limit) + 1 : page;
  const versionsCollection = `${collection}_versions`;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFindVersions,
    collection: versionsCollection,
    page: effectivePage,
    convex: false
  });
  if (!pagination || limit === 0) {
    const rawDocs2 = await service.db.query({}).collectionWhereQuery.adapter({
      service,
      ...processedQuery.convexQueryProps
    });
    const docs2 = processedQuery.processResult(rawDocs2);
    return {
      docs: docs2,
      totalDocs: docs2.length,
      limit: docs2.length,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      pagingCounter: 1
    };
  }
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
  const totalPages = Math.ceil(totalDocs / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const pagingCounter = (page - 1) * limit + 1;
  const skipAmount = skip !== void 0 ? skip : (effectivePage - 1) * limit;
  const allDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc"
  });
  const rawDocs = allDocs.slice(skipAmount, skipAmount + limit);
  const docs = processedQuery.processResult(rawDocs);
  return {
    docs,
    totalDocs,
    limit,
    page: effectivePage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pagingCounter,
    nextPage: hasNextPage ? effectivePage + 1 : null,
    prevPage: hasPrevPage ? effectivePage - 1 : null
  };
}
async function findGlobalVersions(props) {
  const { service, incomingFindGlobalVersions } = props;
  const {
    global,
    limit = 10,
    page = 1,
    pagination = true,
    skip
  } = incomingFindGlobalVersions;
  const effectivePage = skip !== void 0 ? Math.floor(skip / limit) + 1 : page;
  const globalVersionsCollection = `${global}_global_versions`;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingFindGlobalVersions,
    collection: globalVersionsCollection,
    page: effectivePage,
    convex: false
  });
  if (!pagination || limit === 0) {
    const rawDocs2 = await service.db.query({}).collectionWhereQuery.adapter({
      service,
      ...processedQuery.convexQueryProps
    });
    const docs2 = processedQuery.processResult(rawDocs2);
    return {
      docs: docs2,
      totalDocs: docs2.length,
      limit: docs2.length,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      pagingCounter: 1
    };
  }
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
  const totalPages = Math.ceil(totalDocs / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const pagingCounter = (page - 1) * limit + 1;
  const skipAmount = skip !== void 0 ? skip : (effectivePage - 1) * limit;
  const allDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc"
  });
  const rawDocs = allDocs.slice(skipAmount, skipAmount + limit);
  const docs = processedQuery.processResult(rawDocs);
  return {
    docs,
    totalDocs,
    limit,
    page: effectivePage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pagingCounter,
    nextPage: hasNextPage ? effectivePage + 1 : null,
    prevPage: hasPrevPage ? effectivePage - 1 : null
  };
}

// src/bindings/delete.ts
async function deleteOne(props) {
  const { service, incomingDeleteOne } = props;
  const { returning = true } = incomingDeleteOne;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingDeleteOne,
    convex: false
  });
  const docs = await service.db.query({}).collectionWhereQuery.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
  if (!docs || docs.length === 0) {
    return null;
  }
  const doc = docs[0];
  await service.db.mutation({}).deleteOp.adapter({
    service,
    id: doc._id
  });
  if (!returning) {
    return { id: doc._id };
  }
  return processedQuery.processResult(doc);
}
async function deleteMany(props) {
  const { service, incomingDeleteMany } = props;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingDeleteMany,
    convex: false
  });
  await service.db.mutation({}).deleteManyWhere.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
}
async function deleteVersions(props) {
  const { service, incomingDeleteVersions } = props;
  const { collection, globalSlug, where, locale } = incomingDeleteVersions;
  const versionsCollection = collection ? `${collection}_versions` : `${globalSlug}_versions`;
  const processedQuery = service.tools.queryProcessor({
    service,
    collection: versionsCollection,
    where,
    locale,
    convex: false
  });
  await service.db.mutation({}).deleteManyWhere.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
}

// src/bindings/update.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function splitIncrementOps(data) {
  const incOps = [];
  const patchData = {};
  if (!data) {
    return { incOps, patchData };
  }
  for (const [field, value] of Object.entries(data)) {
    if (isRecord(value) && "$inc" in value) {
      const amount = value["$inc"];
      if (typeof amount !== "number") {
        throw new Error(
          `Unsupported $inc payload for field '${field}': expected number`
        );
      }
      incOps.push({ field, amount });
      continue;
    }
    patchData[field] = value;
  }
  return { incOps, patchData };
}
async function applyPatchWithIncrements(service, id, data) {
  const { incOps, patchData } = splitIncrementOps(data);
  if (Object.keys(patchData).length > 0) {
    await service.db.mutation({}).patch.adapter({
      service,
      id,
      data: patchData
    });
  }
  for (const inc of incOps) {
    await service.db.mutation({}).increment.adapter({
      service,
      id,
      field: inc.field,
      amount: inc.amount
    });
  }
}
async function updateOne(props) {
  const { service, incomingUpdateOne } = props;
  const {
    collection,
    data,
    id,
    where,
    draft,
    returning = true
  } = incomingUpdateOne;
  let docId;
  if (id) {
    docId = id;
  } else if (where) {
    const processedQuery2 = service.tools.queryProcessor({
      service,
      ...incomingUpdateOne,
      limit: 1,
      convex: false
    });
    const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
      service,
      ...processedQuery2.convexQueryProps,
      limit: processedQuery2.convexQueryProps.limit
    });
    if (!docs || docs.length === 0) {
      throw new Error(
        `updateOne: Document not found in collection '${collection}' matching where clause`
      );
    }
    docId = docs[0]._id;
  } else {
    throw new Error("updateOne requires either id or where parameter");
  }
  const updateData = draft !== void 0 ? { ...data, _status: draft ? "draft" : "published" } : data;
  await applyPatchWithIncrements(
    service,
    docId,
    updateData
  );
  if (!returning) {
    return { id: docId };
  }
  const updatedDoc = await service.db.query({}).getById.adapter({
    service,
    collection,
    id: docId
  });
  if (!updatedDoc) {
    throw new Error(
      `updateOne: Document with id '${docId}' not found after update in collection '${collection}'`
    );
  }
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingUpdateOne,
    convex: false
  });
  return processedQuery.processResult(updatedDoc);
}
async function updateMany(props) {
  const { service, incomingUpdateMany } = props;
  const {
    collection,
    data,
    draft,
    limit,
    returning = true
  } = incomingUpdateMany;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingUpdateMany,
    convex: false
  });
  const docs = await service.db.query({}).collectionWhereQuery.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
  if (!docs || docs.length === 0) {
    return null;
  }
  const docsToUpdate = limit ? docs.slice(0, limit) : docs;
  const updateData = draft !== void 0 ? { ...data, _status: draft ? "draft" : "published" } : data;
  for (const doc of docsToUpdate) {
    await applyPatchWithIncrements(
      service,
      doc._id,
      updateData
    );
  }
  if (!returning) {
    return null;
  }
  const updatedDocs = await service.db.query({}).collectionWhereQuery.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
  const rawDocs = limit ? updatedDocs.slice(0, limit) : updatedDocs;
  return processedQuery.processResult(rawDocs);
}
async function updateGlobal(props) {
  const { service, incomingUpdateGlobal } = props;
  const { slug, data, returning = true } = incomingUpdateGlobal;
  const globalCollection = `_globals_${slug}`;
  const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
    service,
    collection: globalCollection,
    wherePlan: service.tools.emptyWherePlan(),
    limit: 1,
    index: void 0
  });
  if (!docs || docs.length === 0) {
    throw new Error(`Global document not found for slug: ${slug}`);
  }
  const docId = docs[0]._id;
  await applyPatchWithIncrements(
    service,
    docId,
    data
  );
  if (!returning) {
    return { id: docId };
  }
  const updatedDoc = await service.db.query({}).getById.adapter({
    service,
    collection: globalCollection,
    id: docId
  });
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingUpdateGlobal,
    collection: globalCollection,
    convex: false
  });
  return processedQuery.processResult(updatedDoc);
}
async function updateVersion(props) {
  const { service, incomingUpdateVersion } = props;
  const {
    collection,
    versionData,
    id,
    where,
    returning = true
  } = incomingUpdateVersion;
  const versionsCollection = `${collection}_versions`;
  let docId;
  if (id) {
    docId = id;
  } else if (where) {
    const processedQuery2 = service.tools.queryProcessor({
      service,
      ...incomingUpdateVersion,
      collection: versionsCollection,
      limit: 1,
      convex: false
    });
    const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
      service,
      ...processedQuery2.convexQueryProps,
      limit: 1
    });
    if (!docs || docs.length === 0) {
      return null;
    }
    docId = docs[0]._id;
  } else {
    throw new Error("updateVersion requires either id or where parameter");
  }
  await applyPatchWithIncrements(
    service,
    docId,
    versionData
  );
  if (!returning) {
    return { id: docId };
  }
  const updatedDoc = await service.db.query({}).getById.adapter({
    service,
    collection: versionsCollection,
    id: docId
  });
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingUpdateVersion,
    collection: versionsCollection,
    convex: false
  });
  return processedQuery.processResult(updatedDoc);
}
async function updateGlobalVersion(props) {
  const { service, incomingUpdateGlobalVersion } = props;
  const {
    global,
    versionData,
    id,
    where,
    returning = true
  } = incomingUpdateGlobalVersion;
  const globalVersionsCollection = `${global}_global_versions`;
  let docId;
  if (id) {
    docId = id;
  } else if (where) {
    const processedQuery2 = service.tools.queryProcessor({
      service,
      ...incomingUpdateGlobalVersion,
      collection: globalVersionsCollection,
      limit: 1,
      convex: false
    });
    const docs = await service.db.query({}).collectionWhereLimitQuery.adapter({
      service,
      ...processedQuery2.convexQueryProps,
      limit: 1
    });
    if (!docs || docs.length === 0) {
      return null;
    }
    docId = docs[0]._id;
  } else {
    throw new Error(
      "updateGlobalVersion requires either id or where parameter"
    );
  }
  await applyPatchWithIncrements(
    service,
    docId,
    versionData
  );
  if (!returning) {
    return { id: docId };
  }
  const updatedDoc = await service.db.query({}).getById.adapter({
    service,
    collection: globalVersionsCollection,
    id: docId
  });
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingUpdateGlobalVersion,
    collection: globalVersionsCollection,
    convex: false
  });
  return processedQuery.processResult(updatedDoc);
}
async function updateJobs(props) {
  const { service, incomingUpdateJobs } = props;
  const { data, id, where, limit, returning = true } = incomingUpdateJobs;
  const jobsCollection = "_jobs";
  if (id) {
    await applyPatchWithIncrements(
      service,
      id,
      data
    );
    if (!returning) {
      return [{ id }];
    }
    const updatedJob = await service.db.query({}).getById.adapter({
      service,
      collection: jobsCollection,
      id
    });
    const processedQuery = service.tools.queryProcessor({
      service,
      ...incomingUpdateJobs,
      collection: jobsCollection,
      convex: false
    });
    return [processedQuery.processResult(updatedJob)];
  }
  if (where) {
    const processedQuery = service.tools.queryProcessor({
      service,
      ...incomingUpdateJobs,
      collection: jobsCollection,
      convex: false
    });
    const jobs = limit ? await service.db.query({}).collectionWhereLimitQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
      limit: processedQuery.convexQueryProps.limit
    }) : await service.db.query({}).collectionWhereQuery.adapter({
      service,
      ...processedQuery.convexQueryProps
    });
    if (!jobs || jobs.length === 0) {
      return null;
    }
    for (const job of jobs) {
      await applyPatchWithIncrements(
        service,
        job._id,
        data
      );
    }
    if (!returning) {
      return null;
    }
    const updatedJobs = limit ? await service.db.query({}).collectionWhereLimitQuery.adapter({
      service,
      ...processedQuery.convexQueryProps,
      limit: processedQuery.convexQueryProps.limit
    }) : await service.db.query({}).collectionWhereQuery.adapter({
      service,
      ...processedQuery.convexQueryProps
    });
    return processedQuery.processResult(updatedJobs);
  }
  throw new Error("updateJobs requires either id or where parameter");
}

// src/bindings/upsert.ts
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function splitIncrementOps2(data) {
  const incOps = [];
  const patchData = {};
  if (!data) {
    return { incOps, patchData };
  }
  for (const [field, value] of Object.entries(data)) {
    if (isRecord2(value) && "$inc" in value) {
      const amount = value["$inc"];
      if (typeof amount !== "number") {
        throw new Error(
          `Unsupported $inc payload for field '${field}': expected number`
        );
      }
      incOps.push({ field, amount });
      continue;
    }
    patchData[field] = value;
  }
  return { incOps, patchData };
}
async function applyPatchWithIncrements2(service, id, data) {
  const { incOps, patchData } = splitIncrementOps2(data);
  if (Object.keys(patchData).length > 0) {
    await service.db.mutation({}).patch.adapter({
      service,
      id,
      data: patchData
    });
  }
  for (const inc of incOps) {
    await service.db.mutation({}).increment.adapter({
      service,
      id,
      field: inc.field,
      amount: inc.amount
    });
  }
}
function normalizeInsertData(data) {
  const { incOps, patchData } = splitIncrementOps2(data);
  if (incOps.length === 0) {
    return patchData;
  }
  const normalized = { ...patchData };
  for (const inc of incOps) {
    normalized[inc.field] = inc.amount;
  }
  return normalized;
}
async function upsert(props) {
  const { service, incomingUpsert } = props;
  const { collection, data, returning = true } = incomingUpsert;
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingUpsert,
    limit: 1,
    convex: false
  });
  const existingDocs = await service.db.query({}).collectionWhereLimitQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    limit: processedQuery.convexQueryProps.limit
  });
  if (existingDocs && existingDocs.length > 0) {
    const docId = existingDocs[0]._id;
    await applyPatchWithIncrements2(
      service,
      docId,
      data
    );
    if (!returning) {
      return { id: docId };
    }
    const updatedDoc = await service.db.query({}).getById.adapter({
      service,
      collection,
      id: docId
    });
    return processedQuery.processResult(updatedDoc);
  } else {
    const normalizedData = normalizeInsertData(data);
    const docId = await service.db.mutation({}).insert.adapter({
      service,
      collection,
      data: normalizedData
    });
    if (!returning) {
      return { id: docId };
    }
    const newDoc = await service.db.query({}).getById.adapter({
      service,
      collection,
      id: docId
    });
    return processedQuery.processResult(newDoc);
  }
}

// src/bindings/drafts.ts
async function queryDrafts(props) {
  const { service, incomingQueryDrafts } = props;
  const {
    where,
    limit = 10,
    page = 1,
    pagination = true
  } = incomingQueryDrafts;
  const draftWhere = where ? {
    and: [where, { _status: { equals: "draft" } }]
  } : { _status: { equals: "draft" } };
  const processedQuery = service.tools.queryProcessor({
    service,
    ...incomingQueryDrafts,
    where: draftWhere,
    convex: false
  });
  if (!pagination || limit === 0) {
    const rawDocs2 = await service.db.query({}).collectionWhereQuery.adapter({
      service,
      ...processedQuery.convexQueryProps
    });
    const docs2 = processedQuery.processResult(rawDocs2);
    return {
      docs: docs2,
      totalDocs: docs2.length,
      limit: docs2.length,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      pagingCounter: 1
    };
  }
  const totalDocs = await service.db.query({}).collectionCountQuery.adapter({
    service,
    ...processedQuery.convexQueryProps
  });
  const totalPages = Math.ceil(totalDocs / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const pagingCounter = (page - 1) * limit + 1;
  const skip = (page - 1) * limit;
  const allDocs = await service.db.query({}).collectionWhereOrderQuery.adapter({
    service,
    ...processedQuery.convexQueryProps,
    order: processedQuery.convexQueryProps.order ?? "desc"
  });
  const rawDocs = allDocs.slice(skip, skip + limit);
  const docs = processedQuery.processResult(rawDocs);
  return {
    docs,
    totalDocs,
    limit,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pagingCounter,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
}

// src/bindings/migrate.ts
async function migrate(props) {
}
async function migrateDown(props) {
}
async function migrateFresh(props) {
}
async function migrateRefresh(props) {
}
async function migrateReset(props) {
}
async function migrateStatus(props) {
}

// src/bindings/index.ts
var transactions = {
  beginTransaction,
  commitTransaction,
  rollbackTransaction
};
var counts = {
  count,
  countVersions,
  countGlobalVersions
};
var creates = {
  create,
  createGlobal,
  createVersion,
  createGlobalVersion,
  createMigration
};
var finds = {
  find,
  findOne,
  findDistinct,
  findGlobal,
  findVersions,
  findGlobalVersions
};
var deletes = {
  deleteOne,
  deleteMany,
  deleteVersions
};
var updates = {
  updateOne,
  updateMany,
  updateGlobal,
  updateVersion,
  updateGlobalVersion,
  updateJobs
};
var upserts = {
  upsert
};
var drafts = {
  queryDrafts
};
var migrations = {
  migrate,
  migrateDown,
  migrateFresh,
  migrateRefresh,
  migrateReset,
  migrateStatus
};

export { bindings_exports, createRandomID, createServiceLogger, createSessionTracker, createWherePlan, emptyWherePlan, isClient, isDev, parseCollection, queryProcessor };
//# sourceMappingURL=chunk-67I6IMQC.js.map
//# sourceMappingURL=chunk-67I6IMQC.js.map