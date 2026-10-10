import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 47291,
  },
  preview: {
    host: "0.0.0.0",
    port: 47291,
  },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
