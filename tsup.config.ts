import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "convex/index": "src/convex/index.ts",
    "adapter/safe-service": "src/adapter/safe-service.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: false,
  treeshake: false,
  external: ["payload", "convex", "@payloadcms/db-postgres"],
});
