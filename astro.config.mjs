import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const site = "https://anastasiia-selezen.github.io";

export default defineConfig({
  site,
  integrations: [
    sitemap({
      filter: (page) => page !== `${site}/work/`,
    }),
  ],
});
