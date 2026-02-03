import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "convex/index": "src/convex/index.ts",
    "adapter/safe-service": "src/adapter/safe-service.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["payload", "convex", "@payloadcms/db-postgres"],
});
