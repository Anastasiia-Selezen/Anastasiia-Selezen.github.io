# Anastasiia Selezen Website

Personal portfolio and writing archive for AI engineering, LLM systems, RAG,
MCP architecture, financial AI, and earlier data science work.

The active site is built with [Astro](https://astro.build/) and deployed to
GitHub Pages with GitHub Actions.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build the static site:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Content Model

Content entries live in `src/content/work/`.

Each entry can represent a current project, external article, talk, or archived
notebook. External links are first-class metadata through `externalUrl`, so
Medium, Kaggle, YouTube, and community posts can be listed without copying their
full body into this site.

Important fields:

```yaml
title: "Article or project title"
date: 2025-02-03 20:00
summary: "Short card summary."
category: "AI Engineering"
tags: ["rag", "mcp", "llm"]
type: "article"
status: "featured"
source: "Medium"
externalUrl: "https://example.com/full-article"
legacyUrl: "/old-url.html"
```

Use `status: "archive"` for older work that should remain accessible without
competing with the current homepage focus.

## Notebook Archive

The two older notebook projects are preserved as static assets in
`public/notebooks/`.

They are intentionally not part of the normal build pipeline, so the site does
not need Jupyter or nbconvert during deployment.

The rendered HTML exports include the visible notebook outputs. The `.ipynb`
files are kept as source artifacts, but raw datasets are not vendored in this
site repository.

## Deployment

GitHub Pages deployment is handled by `.github/workflows/deploy.yml`.

On GitHub, set:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

Then pushes to `main` will build and deploy the Astro site.

## Legacy Redirects

Old article URLs are preserved as static redirect files in `public/`. Keep those
files unless you are intentionally breaking old links from search results,
bookmarks, or previously shared posts.
