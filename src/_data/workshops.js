import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true });

// Reads data/workshops.json (verbatim copy of the old site's file).
// If a workshop points at a description_file (markdown), it is rendered
// at build time — same behaviour the old site had in the browser.
export default function () {
  const file = path.join(process.cwd(), "data", "workshops.json");
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  const workshops = Array.isArray(payload) ? payload : payload.workshops || [];
  const today = new Date().toISOString().split("T")[0];

  for (const w of workshops) {
    if (w.description_file && w.description_file.endsWith(".md")) {
      const p = path.join(process.cwd(), w.description_file);
      if (fs.existsSync(p)) {
        const { content } = matter(fs.readFileSync(p, "utf8"));
        w.description_html = md.render(content);
      }
    } else if (w.description && !w.description_html) {
      w.description_html = md.render(w.description);
    }
    w.upcoming = w.date >= today;
  }

  return {
    all: workshops,
    upcoming: workshops.filter((w) => w.upcoming).sort((a, b) => a.date.localeCompare(b.date)),
    past: workshops.filter((w) => !w.upcoming).sort((a, b) => b.date.localeCompare(a.date)),
  };
}
