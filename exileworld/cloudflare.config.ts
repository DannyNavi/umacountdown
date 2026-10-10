import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "exile-world",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-10",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "single-page-application" },
    env: {
      ASSETS: bindings.assets(),
      // Create the database with `cf d1 create --name exile-world`, then set `id`
      // to the printed database id before `npm run deploy`.
      DB: bindings.d1({ name: "exile-world" }),
    },
  }),
});
