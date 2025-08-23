# Delta-Hub Website

Human-editable static website powered by HTML/CSS/JS with JSON data files.

## Edit content

Most page content lives in the JSON files under `data/`:

- `data/news.json` – list of news items
- `data/workshops.json` – upcoming and past workshops/events
- `data/research.json` – research outputs (publications, reports, datasets)
- `data/consortium.json` – consortium partners

This repo includes JSON Schemas for validation and editor IntelliSense:

- `data/schemas/*.schema.json` – field definitions and requirements
- `.vscode/settings.json` – associates schemas with the data files

When you open a JSON file in VS Code, you’ll get auto-complete, validation, and inline errors to prevent mistakes (e.g., wrong date formats or missing fields).

Tips:

- Dates must be in `YYYY-MM-DD` format.
- Keep titles and descriptions concise and plain text (no HTML).
- Optional fields (e.g., links) can be omitted or left as empty strings.

## Preview locally

Open a simple HTTP server at the repository root so JSON fetches work:

```powershell
# From the repo root
python -m http.server 5500
# then open http://localhost:5500/
```

Alternatively (requires Node):

```powershell
npx http-server -p 5500
```

## Use Markdown for longer text

You can keep long text in separate `.md` files and reference them from JSON:

- Place files under `content/` (e.g., `content/news/2025-08-welcome.md`).
- In JSON, use one of these fields instead of the plain text:
	- News: `content_file`
	- Research: `description_file`
	- Workshops: `description_file`
	- Consortium: `description_file`

Example (`data/news.json`):

[
	{
		"title": "Project Kickoff",
		"date": "2025-09-01",
		"author": "Team",
		"content_file": "content/news/2025-09-kickoff.md"
	}
]

At runtime, the site fetches the `.md` file, renders it to HTML, and displays it. If you provide both the text and the `*_file`, the file takes precedence.

Notes:
- Markdown is rendered by `marked` (CDN) with a small built-in fallback, and sanitized by DOMPurify.

<!-- Admin page section removed -->

## Project structure

- `index.html`, `news.html`, `workshops.html`, etc. – static pages for GitHub Pages
- `templates/` – Jinja-style templates used if you render the site with a server or a static site generator (not used by GitHub Pages directly)
- `static/` – CSS, JavaScript, and images
- `data/` – JSON content files

## Suggested improvements (next steps)

- Consolidate templates: adopt a static site generator (e.g., Eleventy with Nunjucks) to render `templates/` into the root pages, eliminating header/footer duplication.
- SEO: add per-page `<meta name="description">`, Open Graph tags, `sitemap.xml`, and `robots.txt`.
- Accessibility: ensure all icons/images have meaningful labels/alt text; current skip-link/focus styles are in place.
- Performance: add `rel="preload"` for the main CSS, add Subresource Integrity (SRI) to CDN links, and defer non-critical JS.
- Content workflow: add a GitHub Action to validate `data/*.json` against the schemas on every PR.
