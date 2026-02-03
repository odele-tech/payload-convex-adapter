import { queryGeneric, mutationGeneric } from 'convex/server';
import { v } from 'convex/values';

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
function convexGetById(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      id: v.optional(v.string())
    },
    handler: async (ctx, args) => {
      if (!args.id)
        return service.system.logger("No ID provided for getById operation").warn();
      const doc = await ctx.db.get(args.id);
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        convex: true
      });
      const result = doc ? processor.toPayload(doc) : null;
      service.system.logger(
        JSON.stringify(
          {
            operation: "getById",
            args,
            result
          },
          null,
          2
        )
      ).log();
      return result;
    }
  });
}
async function adapterGetById(props) {
  const { service, collection, id } = props;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterGetById",
          collection,
          id
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    convex: false
  });
  const query = await client.query(api.adapter.getById, {
    collection: processor.convexQueryProps.collection,
    id
  });
  return query;
}
var getById = {
  adapter: adapterGetById,
  convex: convexGetById
};
function convexCollectionQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        index: args.index,
        convex: true
      });
      const query = await processor.query().toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionQuery(props) {
  const { service, collection, index } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    index,
    convex: false
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionQuery",
          collection,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const query = await client.query(api.adapter.collectionQuery, {
    collection: processor.convexQueryProps.collection,
    index: processor.convexQueryProps.index
  });
  return query;
}
var collectionQuery = {
  adapter: adapterCollectionQuery,
  convex: convexCollectionQuery
};
function convexCollectionCountQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index,
        convex: true
      });
      const data = await processor.query().postFilter().collect();
      const result = data.length;
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionCountQuery",
            args,
            result
          },
          null,
          2
        )
      ).log();
      return result;
    }
  });
}
async function adapterCollectionCountQuery(props) {
  const { service, collection, wherePlan, index } = props;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionCountQuery",
          collection,
          wherePlan,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    index,
    convex: false
  });
  const query = await client.query(api.adapter.collectionCountQuery, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
    index: processor.convexQueryProps.index ?? void 0
  });
  return query;
}
var collectionCountQuery = {
  adapter: adapterCollectionCountQuery,
  convex: convexCollectionCountQuery
};
function convexCollectionWhereQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index,
        convex: true
      });
      const query = await processor.query().postFilter().toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionWhereQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionWhereQuery(props) {
  const { service, collection, wherePlan, index } = props;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionWhereQuery",
          collection,
          wherePlan,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    index,
    convex: false
  });
  const query = await client.query(api.adapter.collectionWhereQuery, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
    index: processor.convexQueryProps.index ?? void 0
  });
  return query;
}
var collectionWhereQuery = {
  adapter: adapterCollectionWhereQuery,
  convex: convexCollectionWhereQuery
};
function convexCollectionOrderQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      order: v.union(v.literal("asc"), v.literal("desc")),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        index: args.index,
        convex: true
      });
      const query = await processor.query().order(args.order).toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionOrderQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionOrderQuery(props) {
  const { service, collection, order, index } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    order,
    index,
    convex: false
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionOrderQuery",
          collection,
          order,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const query = await client.query(api.adapter.collectionOrderQuery, {
    collection: processor.convexQueryProps.collection,
    order: processor.convexQueryProps.order,
    index: processor.convexQueryProps.index ?? void 0
  });
  return query;
}
var collectionOrderQuery = {
  adapter: adapterCollectionOrderQuery,
  convex: convexCollectionOrderQuery
};
function convexCollectionOrderLimitQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      order: v.union(v.literal("asc"), v.literal("desc")),
      limit: v.number(),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        index: args.index,
        convex: true
      });
      const query = await processor.query().order(args.order).take(args.limit).toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionOrderLimitQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionOrderLimitQuery(props) {
  const { service, collection, order, limit, index } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    limit,
    sort: order === "desc" ? "-createdAt" : "createdAt",
    index,
    convex: false
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionOrderLimitQuery",
          collection,
          order,
          limit,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const query = await client.query(api.adapter.collectionOrderLimitQuery, {
    collection: processor.convexQueryProps.collection,
    order: processor.convexQueryProps.order,
    limit: processor.convexQueryProps.limit,
    index: processor.convexQueryProps.index ?? void 0
  });
  return query;
}
var collectionOrderLimitQuery = {
  adapter: adapterCollectionOrderLimitQuery,
  convex: convexCollectionOrderLimitQuery
};
function convexCollectionOrderPaginateQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      order: v.union(v.literal("asc"), v.literal("desc")),
      paginationOpts: v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null())
      }),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        index: args.index,
        convex: true
      });
      const query = await processor.query().order(args.order).paginate(args.paginationOpts).toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionOrderPaginateQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionOrderPaginateQuery(props) {
  const { service, collection, order, paginationOpts, index } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    sort: order === "desc" ? "-createdAt" : "createdAt",
    pagination: true,
    index,
    convex: false
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionOrderPaginateQuery",
          collection,
          order,
          paginationOpts,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const query = await client.query(api.adapter.collectionOrderPaginateQuery, {
    collection: processor.convexQueryProps.collection,
    order: processor.convexQueryProps.order,
    paginationOpts,
    index: processor.convexQueryProps.index ?? void 0
  });
  return query;
}
var collectionOrderPaginateQuery = {
  adapter: adapterCollectionOrderPaginateQuery,
  convex: convexCollectionOrderPaginateQuery
};
function convexCollectionLimitQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      limit: v.number(),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        index: args.index,
        convex: true
      });
      const query = await processor.query().take(args.limit).toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionLimitQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionLimitQuery(props) {
  const { service, collection, limit, index } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    limit,
    index,
    convex: false
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionLimitQuery",
          collection,
          limit,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const query = await client.query(api.adapter.collectionLimitQuery, {
    collection: processor.convexQueryProps.collection,
    limit: processor.convexQueryProps.limit,
    index: processor.convexQueryProps.index ?? void 0
  });
  return query;
}
var collectionLimitQuery = {
  adapter: adapterCollectionLimitQuery,
  convex: convexCollectionLimitQuery
};
function convexCollectionWhereOrderQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      order: v.union(v.literal("asc"), v.literal("desc")),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        wherePlan: args.wherePlan,
        collection: args.collection,
        index: args.index,
        convex: true
      });
      const query = await processor.query().postFilter().toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionWhereOrderQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionWhereOrderQuery(props) {
  const { service, collection, wherePlan, order, index } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    order,
    index,
    convex: false
  });
  const client = service.db.client.directClient;
  const api = service.db.api;
  const query = await client.query(
    api.adapter.collectionWhereOrderQuery,
    processor.convexQueryProps
  );
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionWhereOrderQuery",
          collection,
          wherePlan,
          order,
          index
        },
        null,
        2
      )
    ).log();
  }
  return query;
}
var collectionWhereOrderQuery = {
  adapter: adapterCollectionWhereOrderQuery,
  convex: convexCollectionWhereOrderQuery
};
function convexCollectionWhereLimitQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      limit: v.number(),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index,
        convex: true
      });
      const query = await processor.query().take(args.limit).postFilter().toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionWhereLimitQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionWhereLimitQuery(props) {
  const { service, collection, wherePlan, limit, index } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    limit,
    index,
    convex: false
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionWhereLimitQuery",
          collection,
          wherePlan,
          limit,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const query = await client.query(api.adapter.collectionWhereLimitQuery, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
    limit: processor.convexQueryProps.limit,
    index: processor.convexQueryProps.index ?? void 0
  });
  return query;
}
var collectionWhereLimitQuery = {
  adapter: adapterCollectionWhereLimitQuery,
  convex: convexCollectionWhereLimitQuery
};
function convexCollectionWherePaginateQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      paginationOpts: v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null())
      }),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index,
        convex: true
      });
      const query = await processor.query().paginate(args.paginationOpts).postFilter().toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionWherePaginateQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionWherePaginateQuery(props) {
  const { service, collection, wherePlan, paginationOpts, index } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    pagination: true,
    index,
    convex: false
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionWherePaginateQuery",
          collection,
          wherePlan,
          paginationOpts,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const query = await client.query(api.adapter.collectionWherePaginateQuery, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
    paginationOpts,
    index: processor.convexQueryProps.index ?? void 0
  });
  return query;
}
var collectionWherePaginateQuery = {
  adapter: adapterCollectionWherePaginateQuery,
  convex: convexCollectionWherePaginateQuery
};
function convexCollectionWhereOrderLimitQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      order: v.union(v.literal("asc"), v.literal("desc")),
      limit: v.number(),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index,
        convex: true
      });
      const query = await processor.query().order(args.order).take(args.limit).postFilter().toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionWhereOrderLimitQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionWhereOrderLimitQuery(props) {
  const { service, collection, wherePlan, order, limit, index } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    limit,
    sort: order === "desc" ? "-createdAt" : "createdAt",
    index,
    convex: false
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionWhereOrderLimitQuery",
          collection,
          wherePlan,
          order,
          limit,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const query = await client.query(
    api.adapter.collectionWhereOrderLimitQuery,
    {
      collection: processor.convexQueryProps.collection,
      wherePlan: processor.convexQueryProps.wherePlan,
      order: processor.convexQueryProps.order,
      limit: processor.convexQueryProps.limit,
      index: processor.convexQueryProps.index ?? void 0
    }
  );
  return query;
}
var collectionWhereOrderLimitQuery = {
  adapter: adapterCollectionWhereOrderLimitQuery,
  convex: convexCollectionWhereOrderLimitQuery
};
function convexCollectionWhereOrderPaginateQuery(props) {
  const { service } = props;
  return queryGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      order: v.union(v.literal("asc"), v.literal("desc")),
      paginationOpts: v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null())
      }),
      index: v.optional(
        v.union(
          v.object({
            indexName: v.string(),
            indexRange: v.optional(v.any())
          }),
          v.null()
        )
      )
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        index: args.index,
        convex: true
      });
      const query = await processor.query().order(args.order).paginate(args.paginationOpts).postFilter().toPayload();
      service.system.logger(
        JSON.stringify(
          {
            operation: "collectionWhereOrderPaginateQuery",
            args,
            query
          },
          null,
          2
        )
      ).log();
      return query;
    }
  });
}
async function adapterCollectionWhereOrderPaginateQuery(props) {
  const { service, collection, wherePlan, order, paginationOpts, index } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    sort: order === "desc" ? "-createdAt" : "createdAt",
    pagination: true,
    index,
    convex: false
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterCollectionWhereOrderPaginateQuery",
          collection,
          wherePlan,
          order,
          paginationOpts,
          index
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const query = await client.query(
    api.adapter.collectionWhereOrderPaginateQuery,
    {
      collection: processor.convexQueryProps.collection,
      wherePlan: processor.convexQueryProps.wherePlan,
      order: processor.convexQueryProps.order,
      paginationOpts,
      index: processor.convexQueryProps.index ?? void 0
    }
  );
  return query;
}
var collectionWhereOrderPaginateQuery = {
  adapter: adapterCollectionWhereOrderPaginateQuery,
  convex: convexCollectionWhereOrderPaginateQuery
};
function QueryAdapter(props) {
  return {
    getById,
    collectionQuery,
    collectionCountQuery,
    // Where-based queries (use ParsedWhereFilter)
    collectionWhereQuery,
    collectionWhereOrderQuery,
    collectionWhereLimitQuery,
    collectionWherePaginateQuery,
    collectionWhereOrderLimitQuery,
    collectionWhereOrderPaginateQuery,
    // Non-filter queries
    collectionOrderQuery,
    collectionOrderLimitQuery,
    collectionOrderPaginateQuery,
    collectionLimitQuery
  };
}
function convexInsert(props) {
  const { service } = props;
  return mutationGeneric({
    args: {
      collection: v.string(),
      data: v.any()
    },
    handler: async (ctx, args) => {
      const result = await ctx.db.insert(args.collection, args.data);
      service.system.logger(
        JSON.stringify(
          {
            operation: "insert",
            args,
            result
          },
          null,
          2
        )
      ).log();
      return result;
    }
  });
}
async function adapterInsert(props) {
  const { service, collection, data } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    data,
    convex: false
  });
  const compiledData = processor.convexQueryProps.data;
  const client = service.db.client.directClient;
  const api = service.db.api;
  const result = await client.mutation(api.adapter.insert, {
    collection: processor.convexQueryProps.collection,
    data: processor.convexQueryProps.data
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterInsert",
          collection,
          data,
          compiledData,
          queryResult: result
        },
        null,
        2
      )
    ).log();
  }
  return result;
}
var insert = {
  adapter: adapterInsert,
  convex: convexInsert
};
function convexGetByIdMutation(props) {
  const { service } = props;
  return mutationGeneric({
    args: {
      collection: v.string(),
      id: v.string()
    },
    handler: async (ctx, args) => {
      const doc = await ctx.db.get(args.collection, args.id);
      service.system.logger(
        JSON.stringify(
          {
            operation: "getByIdMutation",
            args,
            result: doc
          },
          null,
          2
        )
      ).log();
      if (!doc) return null;
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        convex: true
      });
      return processor.toPayload(doc);
    }
  });
}
async function adapterGetByIdMutation(props) {
  const { service, collection, id } = props;
  const client = service.db.client.directClient;
  const api = service.db.api;
  const collectionId = service.tools.parseCollection({
    prefix: service.system.prefix,
    collection
  });
  const result = await client.mutation(api.adapter.getByIdMutation, {
    collection: collectionId,
    id
  });
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterGetByIdMutation",
          collection,
          id
        },
        null,
        2
      )
    ).log();
  }
  return result;
}
var getByIdMutation = {
  adapter: adapterGetByIdMutation,
  convex: convexGetByIdMutation
};
function convexPatch(props) {
  const { service } = props;
  return mutationGeneric({
    args: {
      id: v.optional(v.string()),
      data: v.any()
    },
    handler: async (ctx, args) => {
      if (!args.id)
        return service.system.logger("No ID provided for patch operation - cancelling operation").warn();
      const result = await ctx.db.patch(args.id, args.data);
      service.system.logger(
        JSON.stringify(
          {
            operation: "patch",
            args,
            result
          },
          null,
          2
        )
      ).log();
      return result;
    }
  });
}
async function adapterPatch(props) {
  const { service, id, data } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection: "_temp",
    // Placeholder - not used for data transformation
    data,
    convex: false
  });
  const compiledData = processor.convexQueryProps.data;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterPatch",
          id,
          data,
          compiledData
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const result = await client.mutation(api.adapter.patch, {
    id,
    data: compiledData
  });
  return result;
}
var patch = {
  adapter: adapterPatch,
  convex: convexPatch
};
function convexReplace(props) {
  const { service } = props;
  return mutationGeneric({
    args: {
      id: v.string(),
      data: v.any()
    },
    handler: async (ctx, args) => {
      const result = await ctx.db.replace(args.id, args.data);
      service.system.logger(
        JSON.stringify(
          {
            operation: "replace",
            args,
            result
          },
          null,
          2
        )
      ).log();
      return result;
    }
  });
}
async function adapterReplace(props) {
  const { service, id, data } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection: "_temp",
    // Placeholder - not used for data transformation
    data,
    convex: false
  });
  const compiledData = processor.convexQueryProps.data;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterReplace",
          id,
          data,
          compiledData
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const result = await client.mutation(api.adapter.replace, {
    id,
    data: compiledData
  });
  return result;
}
var replace = {
  adapter: adapterReplace,
  convex: convexReplace
};
function convexDelete(props) {
  const { service } = props;
  return mutationGeneric({
    args: {
      id: v.string()
    },
    handler: async (ctx, args) => {
      const result = await ctx.db.delete(args.id);
      service.system.logger(
        JSON.stringify(
          {
            operation: "delete",
            args,
            result
          },
          null,
          2
        )
      ).log();
      return result;
    }
  });
}
async function adapterDelete(props) {
  const { service, id } = props;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterDelete",
          id
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const result = await client.mutation(api.adapter.delete, {
    id
  });
  return result;
}
var deleteOp = {
  adapter: adapterDelete,
  convex: convexDelete
};
function convexUpsert(props) {
  const { service } = props;
  return mutationGeneric({
    args: {
      collection: v.string(),
      id: v.optional(v.string()),
      data: v.any()
    },
    handler: async (ctx, args) => {
      let result;
      if (args.id) {
        const existing = await ctx.db.get(args.id);
        if (existing) {
          result = await ctx.db.patch(args.id, args.data);
        } else {
          result = await ctx.db.insert(args.collection, args.data);
        }
      } else {
        result = await ctx.db.insert(args.collection, args.data);
      }
      service.system.logger(
        JSON.stringify(
          {
            operation: "upsert",
            args,
            result
          },
          null,
          2
        )
      ).log();
      return result;
    }
  });
}
async function adapterUpsert(props) {
  const { service, collection, id, data } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    data,
    convex: false
  });
  const compiledData = processor.convexQueryProps.data;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterUpsert",
          collection,
          id,
          data,
          compiledData
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const result = await client.mutation(api.adapter.upsert, {
    collection: processor.convexQueryProps.collection,
    id,
    data: processor.convexQueryProps.data
  });
  return result;
}
var upsert = {
  adapter: adapterUpsert,
  convex: convexUpsert
};
function convexUpdateManyWhere(props) {
  const { service } = props;
  return mutationGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any()),
      data: v.any()
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        convex: true
      });
      const docs = await processor.query().postFilter().collect();
      await Promise.all(
        docs.map((doc) => ctx.db.patch(doc._id, args.data))
      );
      service.system.logger(
        JSON.stringify(
          {
            operation: "updateManyWhere",
            args,
            docsUpdated: docs.length
          },
          null,
          2
        )
      ).log();
      return docs.length;
    }
  });
}
async function adapterUpdateManyWhere(props) {
  const { service, collection, wherePlan, data } = props;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    data,
    convex: false
  });
  const compiledData = processor.convexQueryProps.data;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterUpdateManyWhere",
          collection,
          wherePlan,
          data,
          compiledData
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const result = await client.mutation(api.adapter.updateManyWhere, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan,
    data: processor.convexQueryProps.data
  });
  return result;
}
var updateManyWhere = {
  adapter: adapterUpdateManyWhere,
  convex: convexUpdateManyWhere
};
function convexDeleteManyWhere(props) {
  const { service } = props;
  return mutationGeneric({
    args: {
      collection: v.string(),
      wherePlan: v.optional(v.any())
    },
    handler: async (ctx, args) => {
      const processor = service.tools.queryProcessor({
        ctx,
        service,
        collection: args.collection,
        wherePlan: args.wherePlan,
        convex: true
      });
      const docs = await processor.query().postFilter().collect();
      const result = await Promise.all(
        docs.map((doc) => ctx.db.delete(doc._id))
      );
      service.system.logger(
        JSON.stringify(
          {
            operation: "deleteManyWhere",
            args,
            docsDeleted: docs.length,
            result
          },
          null,
          2
        )
      ).log();
      return result;
    }
  });
}
async function adapterDeleteManyWhere(props) {
  const { service, collection, wherePlan } = props;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterDeleteManyWhere",
          collection,
          wherePlan
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const processor = service.tools.queryProcessor({
    service,
    collection,
    wherePlan,
    convex: false
  });
  const result = await client.mutation(api.adapter.deleteManyWhere, {
    collection: processor.convexQueryProps.collection,
    wherePlan: processor.convexQueryProps.wherePlan
  });
  return result;
}
var deleteManyWhere = {
  adapter: adapterDeleteManyWhere,
  convex: convexDeleteManyWhere
};
function normalizeFieldToConvex(field) {
  if (field === "id") return "_id";
  if (field === "_id") return "_id";
  if (field === "createdAt") return "_creationTime";
  if (field === "_creationTime") return "_creationTime";
  if (field === "updatedAt") return "_updatedTime";
  if (field === "_updatedTime") return "_updatedTime";
  if (field.startsWith("payvex_")) return field;
  return `payvex_${field}`;
}
function convexIncrement(props) {
  const { service } = props;
  return mutationGeneric({
    args: {
      id: v.string(),
      field: v.string(),
      amount: v.number()
    },
    handler: async (ctx, args) => {
      const doc = await ctx.db.get(args.id);
      if (!doc) {
        service.system.logger(
          JSON.stringify(
            {
              operation: "increment",
              args,
              result: null,
              error: "Document not found"
            },
            null,
            2
          )
        ).log();
        return null;
      }
      const convexField = normalizeFieldToConvex(args.field);
      const currentValue = doc[convexField] ?? 0;
      const result = await ctx.db.patch(args.id, {
        [convexField]: currentValue + args.amount
      });
      service.system.logger(
        JSON.stringify(
          {
            operation: "increment",
            args,
            convexField,
            previousValue: currentValue,
            newValue: currentValue + args.amount,
            result
          },
          null,
          2
        )
      ).log();
      return result;
    }
  });
}
async function adapterIncrement(props) {
  const { service, id, field, amount } = props;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterIncrement",
          id,
          field,
          amount
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const result = await client.mutation(api.adapter.increment, {
    id,
    field,
    amount
  });
  return result;
}
var increment = {
  adapter: adapterIncrement,
  convex: convexIncrement
};
function convexTransactional(props) {
  const { service } = props;
  return mutationGeneric({
    args: {
      run: v.any()
    },
    handler: async (ctx, args) => {
      const result = await args.run(ctx);
      service.system.logger(
        JSON.stringify(
          {
            operation: "transactional",
            result
          },
          null,
          2
        )
      ).log();
      return result;
    }
  });
}
async function adapterTransactional(props) {
  const { service, run } = props;
  if (service.system.isDev) {
    service.system.logger(
      JSON.stringify(
        {
          adapter: "adapterTransactional",
          message: "Executing transactional operation"
        },
        null,
        2
      )
    ).log();
  }
  const client = service.db.client.directClient;
  const api = service.db.api;
  const result = await client.mutation(api.adapter.transactional, {
    run
  });
  return result;
}
var transactional = {
  adapter: adapterTransactional,
  convex: convexTransactional
};
function MutationAdapter(props) {
  return {
    insert,
    getByIdMutation,
    patch,
    replace,
    deleteOp,
    upsert,
    // Where-based mutations (use ParsedWhereFilter)
    updateManyWhere,
    deleteManyWhere,
    // Other mutations
    increment,
    transactional
  };
}

export { MutationAdapter, QueryAdapter, __export, adapterCollectionCountQuery, adapterCollectionLimitQuery, adapterCollectionOrderLimitQuery, adapterCollectionOrderPaginateQuery, adapterCollectionOrderQuery, adapterCollectionQuery, adapterCollectionWhereLimitQuery, adapterCollectionWhereOrderLimitQuery, adapterCollectionWhereOrderPaginateQuery, adapterCollectionWhereOrderQuery, adapterCollectionWherePaginateQuery, adapterCollectionWhereQuery, adapterDelete, adapterDeleteManyWhere, adapterGetById, adapterGetByIdMutation, adapterIncrement, adapterInsert, adapterPatch, adapterReplace, adapterTransactional, adapterUpdateManyWhere, adapterUpsert, collectionCountQuery, collectionLimitQuery, collectionOrderLimitQuery, collectionOrderPaginateQuery, collectionOrderQuery, collectionQuery, collectionWhereLimitQuery, collectionWhereOrderLimitQuery, collectionWhereOrderPaginateQuery, collectionWhereOrderQuery, collectionWherePaginateQuery, collectionWhereQuery, convexCollectionCountQuery, convexCollectionLimitQuery, convexCollectionOrderLimitQuery, convexCollectionOrderPaginateQuery, convexCollectionOrderQuery, convexCollectionQuery, convexCollectionWhereLimitQuery, convexCollectionWhereOrderLimitQuery, convexCollectionWhereOrderPaginateQuery, convexCollectionWhereOrderQuery, convexCollectionWherePaginateQuery, convexCollectionWhereQuery, convexDelete, convexDeleteManyWhere, convexGetById, convexGetByIdMutation, convexIncrement, convexInsert, convexPatch, convexReplace, convexTransactional, convexUpdateManyWhere, convexUpsert, deleteManyWhere, deleteOp, getById, getByIdMutation, increment, insert, patch, replace, transactional, updateManyWhere, upsert };
//# sourceMappingURL=chunk-OTSZFWCO.js.map
//# sourceMappingURL=chunk-OTSZFWCO.js.map