export { A as AdapaterQueryIndex, a as AdapterCollectionCountQueryProps, b as AdapterCollectionLimitQueryProps, c as AdapterCollectionOrderLimitQueryProps, d as AdapterCollectionOrderPaginateQueryProps, e as AdapterCollectionOrderQueryProps, f as AdapterCollectionQueryProps, g as AdapterCollectionWhereLimitQueryProps, h as AdapterCollectionWhereOrderLimitQueryProps, i as AdapterCollectionWhereOrderPaginateQueryProps, j as AdapterCollectionWhereOrderQueryProps, k as AdapterCollectionWherePaginateQueryProps, l as AdapterCollectionWhereQueryProps, m as AdapterDeleteManyWhereProps, n as AdapterDeleteProps, o as AdapterGetByIdMutationProps, p as AdapterGetByIdProps, q as AdapterIncrementProps, r as AdapterInsertProps, s as AdapterPatchProps, t as AdapterReplaceProps, u as AdapterTransactionalProps, v as AdapterUpdateManyWhereProps, w as AdapterUpsertProps, C as ConvexCollectionCountQueryProps, x as ConvexCollectionCountQueryResult, y as ConvexCollectionLimitQueryProps, z as ConvexCollectionLimitQueryResult, B as ConvexCollectionOrderLimitQueryProps, D as ConvexCollectionOrderLimitQueryResult, E as ConvexCollectionOrderPaginateQueryProps, F as ConvexCollectionOrderPaginateQueryResult, G as ConvexCollectionOrderQueryProps, H as ConvexCollectionOrderQueryResult, I as ConvexCollectionQueryProps, J as ConvexCollectionQueryResult, K as ConvexCollectionWhereLimitQueryProps, L as ConvexCollectionWhereLimitQueryResult, M as ConvexCollectionWhereOrderLimitQueryProps, N as ConvexCollectionWhereOrderLimitQueryResult, O as ConvexCollectionWhereOrderPaginateQueryProps, P as ConvexCollectionWhereOrderPaginateQueryResult, Q as ConvexCollectionWhereOrderQueryProps, R as ConvexCollectionWhereOrderQueryResult, S as ConvexCollectionWherePaginateQueryProps, T as ConvexCollectionWherePaginateQueryResult, U as ConvexCollectionWhereQueryProps, V as ConvexCollectionWhereQueryResult, W as ConvexDeleteManyWhereProps, X as ConvexDeleteManyWhereResult, Y as ConvexDeleteProps, Z as ConvexDeleteResult, _ as ConvexGetByIdMutationProps, $ as ConvexGetByIdMutationResult, a0 as ConvexGetByIdProps, a1 as ConvexGetByIdResult, a2 as ConvexIncrementProps, a3 as ConvexIncrementResult, a4 as ConvexInsertProps, a5 as ConvexInsertResult, a6 as ConvexPatchProps, a7 as ConvexPatchResult, a8 as ConvexReplaceProps, a9 as ConvexReplaceResult, aa as ConvexTransactionalProps, ab as ConvexTransactionalResult, ac as ConvexUpdateManyWhereProps, ad as ConvexUpdateManyWhereResult, ae as ConvexUpsertProps, af as ConvexUpsertResult, ag as ExtractConvexGetResult, ah as ExtractConvexMutationResult, ai as ExtractConvexQueryResult, aj as MutationAdapter, ak as MutationAdapterProps, al as QueryAdapter, am as QueryAdapterProps, an as adapterCollectionCountQuery, ao as adapterCollectionLimitQuery, ap as adapterCollectionOrderLimitQuery, aq as adapterCollectionOrderPaginateQuery, ar as adapterCollectionOrderQuery, as as adapterCollectionQuery, at as adapterCollectionWhereLimitQuery, au as adapterCollectionWhereOrderLimitQuery, av as adapterCollectionWhereOrderPaginateQuery, aw as adapterCollectionWhereOrderQuery, ax as adapterCollectionWherePaginateQuery, ay as adapterCollectionWhereQuery, az as adapterDeleteManyWhere, aA as adapterDeleteOp, aB as adapterGetById, aC as adapterGetByIdMutation, aD as adapterIncrement, aE as adapterInsert, aF as adapterPatch, aG as adapterReplace, aH as adapterTransactional, aI as adapterUpdateManyWhere, aJ as adapterUpsert, aK as collectionCountQuery, aL as collectionLimitQuery, aM as collectionOrderLimitQuery, aN as collectionOrderPaginateQuery, aO as collectionOrderQuery, aP as collectionQuery, aQ as collectionWhereLimitQuery, aR as collectionWhereOrderLimitQuery, aS as collectionWhereOrderPaginateQuery, aT as collectionWhereOrderQuery, aU as collectionWherePaginateQuery, aV as collectionWhereQuery, aW as convexCollectionCountQuery, aX as convexCollectionLimitQuery, aY as convexCollectionOrderLimitQuery, aZ as convexCollectionOrderPaginateQuery, a_ as convexCollectionOrderQuery, a$ as convexCollectionQuery, b0 as convexCollectionWhereLimitQuery, b1 as convexCollectionWhereOrderLimitQuery, b2 as convexCollectionWhereOrderPaginateQuery, b3 as convexCollectionWhereOrderQuery, b4 as convexCollectionWherePaginateQuery, b5 as convexCollectionWhereQuery, b6 as convexDeleteManyWhere, b7 as convexDeleteOp, b8 as convexGetById, b9 as convexGetByIdMutation, ba as convexIncrement, bb as convexInsert, bc as convexPatch, bd as convexReplace, be as convexTransactional, bf as convexUpdateManyWhere, bg as convexUpsert, bh as deleteManyWhere, bi as deleteOp, bj as getById, bk as getByIdMutation, bl as increment, bm as insert, bn as patch, bo as replace, bp as transactional, bq as updateManyWhere, br as upsert } from '../mutations-3jf1fd2y.js';
import { ConvexHttpClient, ConvexClient } from 'convex/browser';
import 'convex/values';
import 'convex/server';
import 'payload';

/**
 * @fileoverview Convex Client Factory
 *
 * This module provides a factory function for creating Convex client instances.
 * It creates both HTTP and WebSocket clients for different use cases.
 *
 * ## Client Types
 *
 * ### ConvexHttpClient (directClient)
 * - Uses HTTP requests for each operation
 * - Best for server-side operations and one-off queries
 * - No persistent connection overhead
 * - Suitable for serverless environments
 *
 * ### ConvexClient (liveClient)
 * - Uses WebSocket for real-time subscriptions
 * - Maintains persistent connection to Convex
 * - Best for client-side applications with real-time updates
 * - Automatically reconnects on connection loss
 *
 * @module convex/helpers/client
 */

/**
 * Configuration props for creating Convex clients.
 */
type ConvexClientProps = {
    /** The Convex deployment URL */
    convexUrl: string;
};
/**
 * Creates Convex client instances for database operations.
 *
 * This factory creates two types of clients:
 * - `directClient`: HTTP-based client for direct queries/mutations
 * - `liveClient`: WebSocket-based client for real-time subscriptions
 *
 * @param {ConvexClientProps} props - Configuration options
 * @returns {{ directClient: ConvexHttpClient, liveClient: ConvexClient }} Client instances
 *
 * @example
 * ```typescript
 * const { directClient, liveClient } = createConvexClient({
 *   convexUrl: 'https://your-deployment.convex.cloud',
 * });
 *
 * // Use directClient for one-off operations
 * const result = await directClient.query(api.users.list);
 *
 * // Use liveClient for subscriptions
 * liveClient.onUpdate(api.users.list, {}, (users) => {
 *   console.log('Users updated:', users);
 * });
 * ```
 */
declare function createConvexClient(props: ConvexClientProps): {
    directClient: ConvexHttpClient;
    liveClient: ConvexClient;
};

export { type ConvexClientProps, createConvexClient };
