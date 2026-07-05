# DELTA-Hub website (redesign)

Redesigned, modernised version of the DELTA-Hub Horizon Europe project website,
built with [Eleventy](https://www.11ty.dev/). The **content is identical** to the
previous site — `content/` and `data/` are verbatim copies of the old folders and
remain the single source of truth. Only the templates and styling changed.

## What changed vs. the old site

- Pages are generated at build time from `content/*.md` and `data/*.json`
  (the old site assembled them in the browser with JavaScript).
- No more Bootstrap, Font Awesome, marked, or DOMPurify — one small custom
  stylesheet and inline SVG icons. Pages are much lighter and work without JS.
- News posts are picked up **automatically** from `content/news/*.md`
  (dated files `YYYY-MM-DD-*.md`). No more manual list in `news.js`.
- Same URLs as before (`about.html`, `news.html#post-slug`, …) so existing
  links and bookmarks keep working. Decap CMS at `/admin` is unchanged.

## Local development

```bash
npm install
npm run dev      # serves at http://localhost:8080 with live reload
npm run build    # writes the final site to _site/
```

## Content editing (same as before)

| What | Where |
|---|---|
| News posts | `content/news/YYYY-MM-DD-slug.md` (or Decap CMS at `/admin`) |
| Homepage hero text | `content/index/hero.md` |
| About page | `content/about/overview.md` |
| Page intros | `content/{research,workshops,contact,consortium}/intro.md` |
| Team members | `data/team.json` |
| Workshops | `data/workshops.json` (+ optional `description_file` markdown) |
| Dashboard stations | `data/measurements.json` |

Notes:

- Two old posts (`2025-08-22-masuratori-baliza.md`, `2025-08-23-infoclima-delta-hub.md`)
  are hidden, exactly as on the old site. To publish them, remove their names from
  the `HIDDEN` list in `src/_data/news.js`.
- "Upcoming vs past" for workshops is decided at **build time**. The site rebuilds
  on every push; push any change (e.g. a news post) to refresh it.

## Deployment (GitHub Pages)

The included workflow (`.github/workflows/deploy.yml`) builds the site and
deploys `_site/` on every push to `main`.

One-time setup after pushing this project to the repository:
GitHub repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**
(the old site used "Deploy from a branch"). `CNAME` is preserved, so
`delta-hub.unibuc.ro` keeps working.
