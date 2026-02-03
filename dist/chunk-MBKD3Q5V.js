import { ConvexHttpClient, ConvexClient } from 'convex/browser';

// src/convex/client.ts
function createConvexClient(props) {
  const { convexUrl } = props;
  const directClient = new ConvexHttpClient(convexUrl);
  const liveClient = new ConvexClient(convexUrl);
  return {
    directClient,
    liveClient
  };
}

export { createConvexClient };
//# sourceMappingURL=chunk-MBKD3Q5V.js.map
//# sourceMappingURL=chunk-MBKD3Q5V.js.map