import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const work = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/work" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    type: z.enum(["article", "project", "notebook", "talk"]),
    status: z.enum(["featured", "current", "archive"]).default("current"),
    source: z.string().optional(),
    externalUrl: z.url().optional(),
    notebookHtml: z.string().optional(),
    notebookSource: z.string().optional(),
    legacyUrl: z.string().optional(),
  }),
});

export const collections = { work };
