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

function inferCodeLanguage(value) {
  const code = value.trim();

  if (!code) return "log";

  if (/^(pip|uv|crewai|streamlit|cd|mkdir|python|npm|npx|curl|git)\b/m.test(code)) {
    return "shellsession";
  }

  if (/^#\s+.*\.(ya?ml)\b/i.test(code) || /^[\w-]+:\s*(?:\||>|["'\w{[])/m.test(code)) {
    return "yaml";
  }

  if (/^dependencies\s*=\s*\[/.test(code)) {
    return "toml";
  }

  if (/^(?:\{|\[)[\s\S]*(?:"[\w -]+":|"\w+")/.test(code)) {
    return "json";
  }

  if (
    /^(?:from|import)\s+[\w.]+/m.test(code) ||
    /^(?:async\s+def|def|class)\s+\w+/m.test(code) ||
    /\b(?:await|self|return|try|except|for|if)\b/.test(code) ||
    /\b(?:FastMCP|StateGraph|BaseModel|OpenAIEmbeddings|WeaviateVectorStore)\b/.test(code)
  ) {
    return "python";
  }

  if (/^(?:#{1,6}\s|[-*]\s|\d+\.\s|Answer:)/m.test(code)) {
    return "markdown";
  }

  return "log";
}

function remarkInferCodeLanguages() {
  return (tree) => {
    const visit = (node) => {
      if (node?.type === "code" && !node.lang) {
        node.lang = inferCodeLanguage(node.value);
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
    remarkPlugins: [remarkInferCodeLanguages],
    rehypePlugins: [rehypeExternalLinks],
  },
  integrations: [
    sitemap({
      filter: (page) => page !== `${site}/work/`,
    }),
  ],
});
