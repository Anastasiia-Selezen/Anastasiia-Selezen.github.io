import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const site = "https://anastasiia-selezen.github.io";
const siteOrigin = new URL(site).origin;

function mergeRel(rel) {
  const values = Array.isArray(rel)
    ? rel
    : typeof rel === "string"
      ? rel.split(/\s+/)
      : [];

  return Array.from(new Set([...values.filter(Boolean), "noopener", "noreferrer"])).join(" ");
}

function isExternalHref(href) {
  try {
    const url = new URL(href, site);
    return ["http:", "https:"].includes(url.protocol) && url.origin !== siteOrigin;
  } catch {
    return false;
  }
}

function rehypeExternalLinks() {
  return (tree) => {
    const visit = (node) => {
      if (node?.type === "element" && node.tagName === "a") {
        const href = node.properties?.href;

        if (typeof href === "string" && isExternalHref(href)) {
          node.properties = {
            ...node.properties,
            target: "_blank",
            rel: mergeRel(node.properties.rel),
          };
        }
      }

      if (Array.isArray(node?.children)) {
        node.children.forEach(visit);
      }
    };

    visit(tree);
  };
}

export default defineConfig({
  site,
  markdown: {
    rehypePlugins: [rehypeExternalLinks],
  },
  integrations: [
    sitemap({
      filter: (page) => page !== `${site}/work/`,
    }),
  ],
});
