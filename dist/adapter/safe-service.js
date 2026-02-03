import { createServiceLogger, createSessionTracker, isClient, isDev, emptyWherePlan, createWherePlan, queryProcessor, parseCollection, createRandomID, bindings_exports } from '../chunk-67I6IMQC.js';
import { MutationAdapter, QueryAdapter } from '../chunk-OTSZFWCO.js';

// src/adapter/safe-service.ts
function createConvexSafeAdapterService(props) {
  const { payload, prefix, convexUrl } = props;
  const serviceLogger = createServiceLogger({ prefix });
  const sessionTracker = createSessionTracker();
  const system = {
    url: convexUrl,
    prefix,
    logger: serviceLogger,
    isDev,
    isClient
  };
  const db = {
    query: QueryAdapter,
    mutation: MutationAdapter,
    bindings: bindings_exports
  };
  const tools = {
    sessionTracker,
    createRandomID,
    parseCollection,
    queryProcessor,
    createWherePlan,
    emptyWherePlan
  };
  return {
    db,
    tools,
    system,
    payload
  };
}

export { createConvexSafeAdapterService };
//# sourceMappingURL=safe-service.js.map
//# sourceMappingURL=safe-service.js.map